import { PaymentMethod, PaymentStatus, ProjectStatus } from '@prisma/client';
import { prisma } from '../db';
import { AppError } from '../http';
import { requireRole, type AuthedUser } from '../auth-helpers';
import { monime } from '../monime/client';
import * as projectRepo from '../repositories/project.repo';
import * as paymentRepo from '../repositories/payment.repo';
import * as milestoneRepo from '../repositories/milestone.repo';
import * as companyRepo from '../repositories/company.repo';
import * as userRepo from '../repositories/user.repo';
import * as notification from './notification.service';
import { ensureCompanyAccount } from './financial-account.service';

function appUrl(): string {
	return process.env.PUBLIC_APP_URL?.trim() || 'http://localhost:5173';
}

async function loadOwnedProject(caller: AuthedUser, projectId: string) {
	const project = await projectRepo.findProjectById(projectId);
	if (!project) throw new AppError('NOT_FOUND', 'Project not found.');
	if (caller.role !== 'ADMIN') {
		const profile = await companyRepo.findByUserId(caller.id);
		if (!profile || profile.id !== project.companyProfileId) {
			throw new AppError('FORBIDDEN', 'You do not own this project.');
		}
	}
	return project;
}

async function ensureProjectEscrowAccount(
	projectId: string,
	currentId: string | null,
	title: string
) {
	if (currentId) return currentId;
	const account = await monime.financialAccounts.create({
		name: `FOW Project Escrow – ${title}`.slice(0, 80),
		currency: 'SLE'
	});
	await projectRepo.setEscrowAccount(projectId, account.id);
	return account.id;
}

/**
 * The amount to escrow for an awarded project = its total budget, which is the
 * sum of the company-defined milestone amounts (stored on `budgetCap`).
 */
function escrowAmount(project: { budgetCap: number }): number {
	return project.budgetCap;
}

async function notifyParties(
	project: { companyProfileId: string | null; contractorProfileId: string | null },
	event: Parameters<typeof notification.dispatch>[1],
	payload: Parameters<typeof notification.dispatch>[2]
) {
	const ids: string[] = [];
	if (project.companyProfileId) {
		const owner = await userRepo.findByCompanyProfileId(project.companyProfileId);
		if (owner) ids.push(owner.id);
	}
	if (project.contractorProfileId) {
		const contractor = await userRepo.findByFreelancerProfileId(project.contractorProfileId);
		if (contractor) ids.push(contractor.id);
	}
	await Promise.allSettled(ids.map((id) => notification.dispatch(id, event, payload)));
}

/**
 * Fund an AWARDED project via instant internal transfer from the company's
 * Monime account to the project escrow account. Synchronous → project flips to
 * ACTIVE immediately (milestone 1 is already IN_PROGRESS from award).
 */
export async function fundFromFinancialAccount(
	caller: AuthedUser,
	projectId: string
): Promise<void> {
	requireRole(caller, 'COMPANY', 'ADMIN');
	const project = await loadOwnedProject(caller, projectId);
	if (project.status !== ProjectStatus.AWARDED) {
		throw new AppError('CONFLICT', 'Only awarded projects awaiting funding can be funded.');
	}
	const amount = escrowAmount(project);

	const companyAccountId = await ensureCompanyAccount(caller);
	const escrowId = await ensureProjectEscrowAccount(
		project.id,
		project.escrowFinancialAccountId,
		project.title
	);

	const balance = await monime.financialAccounts.getBalance(companyAccountId);
	if (balance.available < amount) {
		throw new AppError(
			'CONFLICT',
			`Insufficient balance. Available: ${balance.available}, required: ${amount}. Top up or use checkout funding.`
		);
	}

	const transfer = await monime.internalTransfers.create({
		from: companyAccountId,
		to: escrowId,
		amount,
		currency: project.currency,
		reference: `project:${project.id}`,
		description: `Project escrow funding – ${project.title}`
	});

	await prisma.$transaction(async (tx) => {
		await paymentRepo.createProjectDeposit(
			{
				projectId: project.id,
				amount,
				currency: project.currency,
				method: PaymentMethod.INTERNAL_TRANSFER,
				monimeTransferId: transfer.id,
				fromEntity: companyAccountId,
				toEntity: escrowId,
				status: PaymentStatus.COMPLETED
			},
			tx
		);
		await projectRepo.markFunded(project.id, amount, tx);
		// Activate the first milestone now that money is escrowed.
		await milestoneRepo.activateFirst(project.id, tx);
	});

	await notifyParties(project, 'PROJECT_FUNDED', {
		title: 'Project funded',
		message: `Escrow for "${project.title}" is locked. Work can begin.`,
		link: `${appUrl()}/projects/${project.slug}/workspace`
	});
}

export async function createFundingCheckoutSession(
	caller: AuthedUser,
	projectId: string
): Promise<{ url: string }> {
	requireRole(caller, 'COMPANY', 'ADMIN');
	const project = await loadOwnedProject(caller, projectId);
	if (project.status !== ProjectStatus.AWARDED) {
		throw new AppError('CONFLICT', 'Only awarded projects awaiting funding can be funded.');
	}
	const amount = escrowAmount(project);

	const escrowId = await ensureProjectEscrowAccount(
		project.id,
		project.escrowFinancialAccountId,
		project.title
	);

	const session = await monime.checkoutSessions.create({
		name: `Project escrow funding – ${project.title}`.slice(0, 80),
		description: `Escrow funding for "${project.title}"`,
		financialAccountId: escrowId,
		amount,
		currency: project.currency,
		reference: `project:${project.id}`,
		metadata: { projectId: project.id },
		successUrl: `${appUrl()}/dashboard/company/projects?funded=${project.id}`,
		cancelUrl: `${appUrl()}/dashboard/company/projects/${project.id}/fund?cancelled=1`
	});

	await projectRepo.setCheckoutSession(project.id, {
		checkoutSessionId: session.id,
		checkoutSessionUrl: session.url
	});

	return { url: session.url };
}

/**
 * Webhook handler for `project:<id>` checkout completion. Delegated from
 * escrow.service.handleFundingCompleted. Idempotent on monimePaymentId.
 */
export async function handleFundingCompleted(input: {
	projectId: string;
	monimePaymentId: string;
}): Promise<void> {
	const { projectId, monimePaymentId } = input;
	const existing = await paymentRepo.findByMonimePaymentId(monimePaymentId);
	if (existing && existing.status === PaymentStatus.COMPLETED) return;

	const project = await projectRepo.findProjectById(projectId);
	if (!project) {
		console.warn('[project-escrow] checkout for unknown project', projectId);
		return;
	}
	if (!project.escrowFinancialAccountId) {
		console.warn('[project-escrow] project has no escrow account', projectId);
		return;
	}
	if (project.status !== ProjectStatus.AWARDED) {
		// Already funded/active or cancelled — nothing to do.
		return;
	}
	const amount = escrowAmount(project);

	const balance = await monime.financialAccounts.getBalance(project.escrowFinancialAccountId);
	if (balance.available < amount) {
		await paymentRepo.createProjectDeposit({
			projectId: project.id,
			amount: balance.available,
			currency: project.currency,
			checkoutSessionId: project.checkoutSessionId ?? '',
			monimePaymentId,
			status: PaymentStatus.FAILED
		});
		console.error('[project-escrow] funding amount mismatch', {
			projectId,
			available: balance.available,
			expected: amount
		});
		return;
	}

	await prisma.$transaction(async (tx) => {
		await paymentRepo.createProjectDeposit(
			{
				projectId: project.id,
				amount,
				currency: project.currency,
				checkoutSessionId: project.checkoutSessionId ?? '',
				monimePaymentId,
				status: PaymentStatus.COMPLETED
			},
			tx
		);
		await projectRepo.markFunded(project.id, amount, tx);
		// Activate the first milestone now that money is escrowed.
		await milestoneRepo.activateFirst(project.id, tx);
	});

	await notifyParties(project, 'PROJECT_FUNDED', {
		title: 'Project funded',
		message: `Escrow for "${project.title}" is locked. Work can begin.`,
		link: `${appUrl()}/projects/${project.slug}/workspace`
	});
}

export async function cancelProjectWithRefund(caller: AuthedUser, projectId: string) {
	requireRole(caller, 'COMPANY', 'ADMIN');
	const project = await loadOwnedProject(caller, projectId);
	const cancellable: ProjectStatus[] = [
		ProjectStatus.DRAFT,
		ProjectStatus.OPEN,
		ProjectStatus.AWARDED,
		ProjectStatus.ACTIVE
	];
	if (!cancellable.includes(project.status)) {
		throw new AppError('CONFLICT', `Cannot cancel a project in status ${project.status}.`);
	}

	// Refund the REMAINING escrow (funded minus already-paid milestone tranches).
	const paidOut = await milestoneRepo.sumApprovedAmounts(project.id);
	const refundable = project.escrowFundedAmount - paidOut;

	if (project.escrowFundedAmount === 0 || refundable <= 0) {
		await prisma.$transaction(async (tx) => {
			await projectRepo.markCancelled(project.id, tx);
		});
	} else {
		const company = await companyRepo.findByUserId(caller.id);
		if (!project.escrowFinancialAccountId) {
			throw new AppError('INTERNAL', 'Funded project is missing its escrow account.');
		}
		if (!company?.monimeFinancialAccountId) {
			throw new AppError(
				'CONFLICT',
				'Set up your payment account before cancelling a funded project.'
			);
		}

		const transfer = await monime.internalTransfers.create({
			from: project.escrowFinancialAccountId,
			to: company.monimeFinancialAccountId,
			amount: refundable,
			currency: project.currency,
			reference: `project-refund:${project.id}`,
			description: `Project cancellation refund – ${project.title}`
		});

		await prisma.$transaction(async (tx) => {
			await paymentRepo.createProjectRefund(
				{
					projectId: project.id,
					amount: refundable,
					currency: project.currency,
					monimeTransferId: transfer.id,
					fromEntity: project.escrowFinancialAccountId!,
					toEntity: company.monimeFinancialAccountId!,
					status: PaymentStatus.COMPLETED
				},
				tx
			);
			await projectRepo.markCancelled(project.id, tx);
		});
	}

	await notifyParties(project, 'PROJECT_CANCELLED', {
		title: 'Project cancelled',
		message: `"${project.title}" was cancelled.`,
		link: `${appUrl()}/projects/${project.slug}`
	});

	const fresh = await projectRepo.findProjectById(project.id);
	return fresh!;
}
