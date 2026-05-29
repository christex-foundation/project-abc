import {
	MilestoneStatus,
	PaymentMethod,
	PaymentStatus,
	PaymentType,
	ProjectStatus,
	type Prisma
} from '@prisma/client';
import { prisma } from '../db';
import { AppError } from '../http';
import { requireRole, type AuthedUser } from '../auth-helpers';
import { sanitizeRichText } from '../sanitize';
import { monime } from '../monime/client';
import * as projectRepo from '../repositories/project.repo';
import * as milestoneRepo from '../repositories/milestone.repo';
import * as paymentRepo from '../repositories/payment.repo';
import * as companyRepo from '../repositories/company.repo';
import * as freelancerRepo from '../repositories/freelancer.repo';
import * as userRepo from '../repositories/user.repo';
import * as notification from './notification.service';
import { postUpdateInput, addCommentInput, requestChangesInput } from '$lib/validators/milestone';

function appUrl(): string {
	return process.env.PUBLIC_APP_URL?.trim() || 'http://localhost:5173';
}

type Party = 'OWNER' | 'CONTRACTOR' | 'ADMIN';

/**
 * Loads a milestone, its project, and resolves the caller's relationship to the
 * project (owning company / awarded contractor / admin). Throws FORBIDDEN for
 * anyone else.
 */
async function loadParties(caller: AuthedUser, milestoneId: string) {
	const milestone = await milestoneRepo.findById(milestoneId);
	if (!milestone) throw new AppError('NOT_FOUND', 'Milestone not found.');
	const project = await projectRepo.findProjectById(milestone.projectId);
	if (!project) throw new AppError('NOT_FOUND', 'Milestone not found.');

	let party: Party | null = null;
	if (caller.role === 'ADMIN') {
		party = 'ADMIN';
	} else if (caller.role === 'COMPANY') {
		const profile = await companyRepo.findByUserId(caller.id);
		if (profile && profile.id === project.companyProfileId) party = 'OWNER';
	} else if (caller.role === 'FREELANCER') {
		const profile = await freelancerRepo.findByUserId(caller.id);
		if (profile && profile.id === project.contractorProfileId) party = 'CONTRACTOR';
	}
	if (!party) throw new AppError('FORBIDDEN', 'You do not have access to this milestone.');

	return { milestone, project, party };
}

async function notifyOwner(
	project: { companyProfileId: string | null },
	event: Parameters<typeof notification.dispatch>[1],
	payload: Parameters<typeof notification.dispatch>[2]
) {
	if (!project.companyProfileId) return;
	const owner = await userRepo.findByCompanyProfileId(project.companyProfileId);
	if (owner) await notification.dispatch(owner.id, event, payload);
}

async function notifyContractor(
	project: { contractorProfileId: string | null },
	event: Parameters<typeof notification.dispatch>[1],
	payload: Parameters<typeof notification.dispatch>[2]
) {
	if (!project.contractorProfileId) return;
	const contractor = await userRepo.findByFreelancerProfileId(project.contractorProfileId);
	if (contractor) await notification.dispatch(contractor.id, event, payload);
}

/**
 * Contractor posts an update on the active milestone. Posting an update IS the
 * approval request → flips the milestone to IN_REVIEW.
 */
export async function postUpdate(caller: AuthedUser, milestoneId: string, raw: unknown) {
	requireRole(caller, 'FREELANCER');
	const parsed = postUpdateInput.parse(raw);
	const { milestone, project, party } = await loadParties(caller, milestoneId);
	if (party !== 'CONTRACTOR') {
		throw new AppError('FORBIDDEN', 'Only the awarded contractor can post updates.');
	}
	if (project.status !== ProjectStatus.ACTIVE) {
		throw new AppError('CONFLICT', 'This project is not active.');
	}
	if (
		milestone.status !== MilestoneStatus.IN_PROGRESS &&
		milestone.status !== MilestoneStatus.CHANGES_REQUESTED
	) {
		throw new AppError('CONFLICT', 'This milestone is not awaiting work.');
	}

	const note = sanitizeRichText(parsed.note);
	await prisma.$transaction(async (tx) => {
		await milestoneRepo.addUpdate(
			{
				milestoneId,
				authorUserId: caller.id,
				authorNameSnapshot: caller.name ?? null,
				note,
				deliverables: parsed.deliverables as unknown as Prisma.InputJsonValue
			},
			tx
		);
		await milestoneRepo.setStatus(milestoneId, MilestoneStatus.IN_REVIEW, tx);
	});

	await notifyOwner(project, 'MILESTONE_SUBMITTED', {
		title: 'Milestone submitted for review',
		message: `"${milestone.title}" on "${project.title}" is ready for your review.`,
		link: `${appUrl()}/projects/${project.slug}/workspace`
	});

	return milestoneRepo.findById(milestoneId);
}

/** Either party can comment on a milestone thread (while it's not yet approved). */
export async function addComment(caller: AuthedUser, milestoneId: string, raw: unknown) {
	const parsed = addCommentInput.parse(raw);
	const { milestone, project, party } = await loadParties(caller, milestoneId);
	if (project.status !== ProjectStatus.ACTIVE) {
		throw new AppError('CONFLICT', 'This project is not active.');
	}
	if (milestone.status === MilestoneStatus.APPROVED) {
		throw new AppError('CONFLICT', 'This milestone is already complete.');
	}

	const body = sanitizeRichText(parsed.body);
	await milestoneRepo.addComment({
		milestoneId,
		authorUserId: caller.id,
		authorRole: caller.role,
		authorNameSnapshot: caller.name ?? null,
		body
	});

	const link = `${appUrl()}/projects/${project.slug}/workspace`;
	// Notify the OTHER party.
	if (party === 'CONTRACTOR') {
		await notifyOwner(project, 'MILESTONE_COMMENT_ADDED', {
			title: 'New comment',
			message: `${caller.name ?? 'The contractor'} commented on "${milestone.title}".`,
			link
		});
	} else {
		await notifyContractor(project, 'MILESTONE_COMMENT_ADDED', {
			title: 'New comment',
			message: `${caller.name ?? 'The company'} commented on "${milestone.title}".`,
			link
		});
	}

	return milestoneRepo.findById(milestoneId);
}

/** Company requests changes on a submitted milestone → reopens it for the contractor. */
export async function requestChanges(caller: AuthedUser, milestoneId: string, raw: unknown) {
	requireRole(caller, 'COMPANY', 'ADMIN');
	const parsed = requestChangesInput.parse(raw);
	const { milestone, project, party } = await loadParties(caller, milestoneId);
	if (party !== 'OWNER' && party !== 'ADMIN') {
		throw new AppError('FORBIDDEN', 'Only the owning company can request changes.');
	}
	if (milestone.status !== MilestoneStatus.IN_REVIEW) {
		throw new AppError('CONFLICT', 'Only a milestone under review can be sent back.');
	}

	const comment = parsed.comment?.trim() ? sanitizeRichText(parsed.comment) : null;
	await prisma.$transaction(async (tx) => {
		if (comment) {
			await milestoneRepo.addComment(
				{
					milestoneId,
					authorUserId: caller.id,
					authorRole: caller.role,
					authorNameSnapshot: caller.name ?? null,
					body: comment
				},
				tx
			);
		}
		await milestoneRepo.incrementRevision(milestoneId, tx);
		await milestoneRepo.setStatus(milestoneId, MilestoneStatus.CHANGES_REQUESTED, tx);
	});

	await notifyContractor(project, 'MILESTONE_CHANGES_REQUESTED', {
		title: 'Changes requested',
		message: `The company requested changes on "${milestone.title}".`,
		link: `${appUrl()}/projects/${project.slug}/workspace`
	});

	return milestoneRepo.findById(milestoneId);
}

/**
 * Company approves a submitted milestone. Releases the milestone's tranche from
 * escrow to the contractor (synchronous Monime internal transfer, OUTSIDE the
 * db transaction), then — INSIDE the transaction — records the MILESTONE_PAYOUT
 * Payment, marks the milestone APPROVED, and activates the next milestone (or
 * completes the project).
 */
export async function approve(caller: AuthedUser, milestoneId: string) {
	requireRole(caller, 'COMPANY', 'ADMIN');
	const { milestone, project, party } = await loadParties(caller, milestoneId);
	if (party !== 'OWNER' && party !== 'ADMIN') {
		throw new AppError('FORBIDDEN', 'Only the owning company can approve milestones.');
	}
	if (project.status !== ProjectStatus.ACTIVE) {
		throw new AppError('CONFLICT', 'This project is not active.');
	}
	if (milestone.status !== MilestoneStatus.IN_REVIEW) {
		throw new AppError('CONFLICT', 'Only a milestone under review can be approved.');
	}
	await payMilestoneAndAdvance(project, {
		id: milestone.id,
		position: milestone.position,
		amount: milestone.amount,
		title: milestone.title
	});
	return milestoneRepo.findById(milestoneId);
}

/**
 * Mediation outcome (ADMIN): release the current active milestone to the
 * contractor regardless of its review state. Used to resolve a dispute in the
 * contractor's favour. Pays the lowest-position non-approved milestone.
 */
export async function adminReleaseMilestone(caller: AuthedUser, projectId: string) {
	requireRole(caller, 'ADMIN');
	const project = await projectRepo.findProjectById(projectId);
	if (!project) throw new AppError('NOT_FOUND', 'Project not found.');
	if (project.status !== ProjectStatus.ACTIVE) {
		throw new AppError('CONFLICT', 'Only an active project has a milestone to release.');
	}
	const active = await milestoneRepo.findActiveForProject(projectId);
	if (!active) throw new AppError('CONFLICT', 'No releasable milestone remains.');
	await payMilestoneAndAdvance(project, active);
	return milestoneRepo.findById(active.id);
}

/**
 * Shared payout path: Monime internal transfer (escrow → contractor) OUTSIDE the
 * db transaction, then record the MILESTONE_PAYOUT, mark APPROVED, and activate
 * the next milestone (or complete the project). Used by both company approval
 * and admin mediation.
 */
async function payMilestoneAndAdvance(
	project: {
		id: string;
		slug: string;
		title: string;
		currency: string;
		escrowFinancialAccountId: string | null;
		escrowFundedAmount: number;
		contractorProfileId: string | null;
		companyProfileId: string | null;
	},
	milestone: { id: string; position: number; amount: number; title: string }
) {
	if (!project.escrowFinancialAccountId) {
		throw new AppError('INTERNAL', 'Project is missing its escrow account.');
	}
	if (!project.contractorProfileId) {
		throw new AppError('CONFLICT', 'Project has no contractor.');
	}
	const contractor = await freelancerRepo.findByIdWithSkills(project.contractorProfileId);
	if (!contractor?.monimeFinancialAccountId) {
		throw new AppError(
			'CONFLICT',
			'The contractor has not set up their payment account yet, so this milestone cannot be paid.'
		);
	}

	// Guard: cumulative approved payouts + this one must not exceed funded escrow.
	const alreadyApproved = await milestoneRepo.sumApprovedAmounts(project.id);
	if (alreadyApproved + milestone.amount > project.escrowFundedAmount) {
		throw new AppError('CONFLICT', 'This payout would exceed the funded escrow balance.');
	}

	const transfer = await monime.internalTransfers.create({
		from: project.escrowFinancialAccountId,
		to: contractor.monimeFinancialAccountId,
		amount: milestone.amount,
		currency: project.currency,
		reference: `milestone:${milestone.id}`,
		description: `Milestone payout – ${project.title}: ${milestone.title}`
	});

	let projectCompleted = false;
	await prisma.$transaction(async (tx) => {
		await paymentRepo.createMilestonePayout(
			{
				projectId: project.id,
				milestoneId: milestone.id,
				type: PaymentType.MILESTONE_PAYOUT,
				method: PaymentMethod.INTERNAL_TRANSFER,
				amount: milestone.amount,
				currency: project.currency,
				monimeTransferId: transfer.id,
				fromEntity: project.escrowFinancialAccountId!,
				toEntity: contractor.monimeFinancialAccountId!,
				status: PaymentStatus.COMPLETED
			},
			tx
		);
		await milestoneRepo.markApproved(milestone.id, tx);
		const next = await milestoneRepo.activateNext(project.id, milestone.position, tx);
		if (!next) {
			await projectRepo.markCompleted(project.id, tx);
			projectCompleted = true;
		}
	});

	const link = `${appUrl()}/projects/${project.slug}/workspace`;
	await notifyContractor(project, 'MILESTONE_APPROVED', {
		title: 'Milestone approved',
		message: `"${milestone.title}" was approved.`,
		link
	});
	await notifyContractor(project, 'MILESTONE_PAYOUT_COMPLETED', {
		title: 'Milestone payout settled',
		message: `Your payout for "${milestone.title}" has been sent to your account.`,
		link
	});
	if (projectCompleted) {
		await notifyContractor(project, 'PROJECT_COMPLETED', {
			title: 'Project complete',
			message: `All milestones on "${project.title}" are approved. 🎉`,
			link
		});
		await notifyOwner(project, 'PROJECT_COMPLETED', {
			title: 'Project complete',
			message: `"${project.title}" is fully delivered.`,
			link
		});
	}
}
