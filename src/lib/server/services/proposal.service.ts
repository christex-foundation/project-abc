import { ProjectStatus, ProposalStatus } from '@prisma/client';
import { prisma } from '../db';
import { AppError } from '../http';
import { requireRole, type AuthedUser } from '../auth-helpers';
import { sanitizeRichText } from '../sanitize';
import * as projectRepo from '../repositories/project.repo';
import * as proposalRepo from '../repositories/proposal.repo';
import * as companyRepo from '../repositories/company.repo';
import * as freelancerRepo from '../repositories/freelancer.repo';
import * as userRepo from '../repositories/user.repo';
import * as creditService from './credit.service';
import * as notification from './notification.service';
import { enforceAccessGates } from './project.service';
import { createProposalInput, type CreateProposalInput } from '$lib/validators/proposal';

function appUrl(): string {
	return process.env.PUBLIC_APP_URL?.trim() || 'http://localhost:5173';
}

async function ownsProject(caller: AuthedUser, companyProfileId: string | null): Promise<boolean> {
	if (caller.role === 'ADMIN') return true;
	if (!companyProfileId) return false;
	const profile = await companyRepo.findByUserId(caller.id);
	return !!profile && profile.id === companyProfileId;
}

export async function submit(
	caller: AuthedUser,
	projectId: string,
	raw: unknown,
	opts: { unlocked?: boolean } = {}
) {
	requireRole(caller, 'FREELANCER');
	const parsed: CreateProposalInput = createProposalInput.parse(raw);

	const freelancer = await freelancerRepo.findByUserId(caller.id);
	if (!freelancer) {
		throw new AppError('CONFLICT', 'Complete your freelancer profile before applying.');
	}

	const project = await projectRepo.findProjectById(projectId);
	if (!project) throw new AppError('NOT_FOUND', 'Project not found.');
	// Provincial + PIN gates (mirrors bounty submission). Hard-blocks ineligible
	// freelancers before any credit spend or write.
	enforceAccessGates(project, freelancer, opts.unlocked ?? false);
	if (project.status !== ProjectStatus.OPEN) {
		throw new AppError('CONFLICT', 'This project is not accepting proposals.');
	}

	const existing = await proposalRepo.findOwnForProject(projectId, freelancer.id);
	if (existing) {
		throw new AppError('CONFLICT', 'You have already applied to this project.');
	}

	const creditConfig = await creditService.getConfig();
	const shouldCharge = creditConfig.enabled && !project.creditsExempt;

	const coverLetter = sanitizeRichText(parsed.coverLetter);

	const proposal = await prisma.$transaction(async (tx) => {
		const created = await proposalRepo.create(
			{
				projectId,
				freelancerProfileId: freelancer.id,
				freelancerNameSnapshot: freelancer.displayName,
				coverLetter,
				proposedTimeline: parsed.proposedTimeline ?? null
			},
			tx
		);
		if (shouldCharge) {
			await creditService.spendForProposal(freelancer.id, created.id, tx);
		}
		return created;
	});

	const owner = await userRepo.findByCompanyProfileId(project.companyProfileId ?? '');
	if (owner) {
		const manageUrl = `${appUrl()}/dashboard/company/projects/${project.id}/proposals`;
		await notification.dispatch(owner.id, 'PROPOSAL_RECEIVED', {
			title: 'New proposal',
			message: `${freelancer.displayName} applied to "${project.title}".`,
			link: manageUrl
		});
	}

	return proposalRepo.findByIdForFreelancer(proposal.id);
}

/**
 * Pre-flight check used by the apply page load so an ineligible freelancer is
 * told why before filling in the form. `submit` re-checks server-side.
 */
export async function assertCanApply(
	caller: AuthedUser,
	projectId: string,
	opts: { unlocked?: boolean } = {}
) {
	requireRole(caller, 'FREELANCER');
	const freelancer = await freelancerRepo.findByUserId(caller.id);
	if (!freelancer) {
		throw new AppError('CONFLICT', 'Complete your freelancer profile before applying.');
	}
	const project = await projectRepo.findProjectById(projectId);
	if (!project) throw new AppError('NOT_FOUND', 'Project not found.');
	enforceAccessGates(project, freelancer, opts.unlocked ?? false);
}

/** Whether the calling freelancer has already applied to a project. */
export async function hasApplied(caller: AuthedUser, projectId: string): Promise<boolean> {
	if (caller.role !== 'FREELANCER') return false;
	const freelancer = await freelancerRepo.findByUserId(caller.id);
	if (!freelancer) return false;
	const existing = await proposalRepo.findOwnForProject(projectId, freelancer.id);
	return !!existing;
}

export async function withdraw(caller: AuthedUser, proposalId: string) {
	requireRole(caller, 'FREELANCER');
	const proposal = await proposalRepo.findById(proposalId);
	if (!proposal) throw new AppError('NOT_FOUND', 'Proposal not found.');
	const freelancer = await freelancerRepo.findByUserId(caller.id);
	if (!freelancer || freelancer.id !== proposal.freelancerProfileId) {
		throw new AppError('FORBIDDEN', 'You do not own this proposal.');
	}
	if (proposal.status !== ProposalStatus.SUBMITTED) {
		throw new AppError('CONFLICT', 'Only submitted proposals can be withdrawn.');
	}
	return proposalRepo.updateStatus(proposalId, ProposalStatus.WITHDRAWN);
}

export async function listForProject(caller: AuthedUser, projectId: string) {
	requireRole(caller, 'COMPANY', 'ADMIN');
	const project = await projectRepo.findProjectById(projectId);
	if (!project) throw new AppError('NOT_FOUND', 'Project not found.');
	if (!(await ownsProject(caller, project.companyProfileId))) {
		throw new AppError('FORBIDDEN', 'You do not own this project.');
	}
	return proposalRepo.listForProject(projectId);
}

export async function countForProject(caller: AuthedUser, projectId: string): Promise<number> {
	requireRole(caller, 'COMPANY', 'ADMIN');
	const project = await projectRepo.findProjectById(projectId);
	if (!project) throw new AppError('NOT_FOUND', 'Project not found.');
	if (!(await ownsProject(caller, project.companyProfileId))) {
		throw new AppError('FORBIDDEN', 'You do not own this project.');
	}
	return proposalRepo.countForProject(projectId);
}

export async function listForFreelancer(caller: AuthedUser) {
	requireRole(caller, 'FREELANCER');
	const freelancer = await freelancerRepo.findByUserId(caller.id);
	if (!freelancer) return [];
	return proposalRepo.listForFreelancer(freelancer.id);
}

export async function award(caller: AuthedUser, projectId: string, proposalId: string) {
	requireRole(caller, 'COMPANY', 'ADMIN');
	const project = await projectRepo.findProjectById(projectId);
	if (!project) throw new AppError('NOT_FOUND', 'Project not found.');
	if (!(await ownsProject(caller, project.companyProfileId))) {
		throw new AppError('FORBIDDEN', 'You do not own this project.');
	}
	if (project.status !== ProjectStatus.OPEN) {
		throw new AppError('CONFLICT', 'Only OPEN projects can be awarded.');
	}

	const proposal = await proposalRepo.findById(proposalId);
	if (!proposal || proposal.projectId !== projectId) {
		throw new AppError('NOT_FOUND', 'Proposal not found.');
	}
	if (proposal.status !== ProposalStatus.SUBMITTED) {
		throw new AppError('CONFLICT', 'Only a submitted proposal can be awarded.');
	}
	if (!proposal.freelancerProfileId || !proposal.freelancer) {
		throw new AppError('CONFLICT', 'This proposal no longer has an attached freelancer.');
	}

	const contractorProfileId = proposal.freelancerProfileId;
	const contractorName = proposal.freelancer.displayName;

	// Milestones already live on the project (company-defined). Award simply
	// attaches the contractor; milestone 1 activates when escrow is funded.
	await prisma.$transaction(async (tx) => {
		await proposalRepo.updateStatus(proposalId, ProposalStatus.AWARDED, tx);
		await projectRepo.markAwarded(
			projectId,
			{
				awardedProposalId: proposalId,
				contractorProfileId,
				contractorNameSnapshot: contractorName
			},
			tx
		);
		await proposalRepo.rejectAllExcept(projectId, proposalId, tx);
	});

	// Notify winner + losers (best-effort, outside the transaction).
	const projectUrl = `${appUrl()}/projects/${project.slug}`;
	const all = await proposalRepo.listForProject(projectId);
	await Promise.allSettled(
		all
			.filter((p) => p.freelancer?.user?.id)
			.map((p) => {
				const userId = p.freelancer!.user.id;
				if (p.id === proposalId) {
					return notification.dispatch(userId, 'PROPOSAL_AWARDED', {
						title: 'Your proposal was accepted',
						message: `You've been awarded "${project.title}". The company will fund escrow to begin.`,
						link: projectUrl
					});
				}
				return notification.dispatch(userId, 'PROPOSAL_REJECTED', {
					title: 'Proposal not selected',
					message: `"${project.title}" was awarded to another applicant.`,
					link: projectUrl
				});
			})
	);

	return projectRepo.findProjectById(projectId);
}
