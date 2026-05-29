import { prisma } from '../db';
import { ProposalStatus, type Prisma } from '@prisma/client';

/**
 * The proposal author's own view — their cover letter + a minimal project
 * reference. Milestones live on the project now (company-defined), not on the
 * proposal. Never exposes other applicants' proposals.
 */
export const selectForFreelancer = {
	id: true,
	projectId: true,
	freelancerProfileId: true,
	coverLetter: true,
	proposedTimeline: true,
	status: true,
	createdAt: true,
	updatedAt: true,
	project: {
		select: { id: true, slug: true, title: true, status: true, currency: true, budgetCap: true }
	}
} satisfies Prisma.ProjectProposalSelect;

/**
 * The reviewing company's view — proposal + applicant's public profile. Used on
 * the proposals review page; this is company-only (other freelancers never see
 * competitors' cover letters).
 */
export const selectForCompany = {
	...selectForFreelancer,
	freelancerNameSnapshot: true,
	freelancer: {
		select: {
			id: true,
			displayName: true,
			headline: true,
			bio: true,
			portfolio: true,
			experienceLevel: true,
			whatsappNumber: true,
			monimeFinancialAccountId: true,
			user: { select: { id: true, name: true, email: true } }
		}
	}
} satisfies Prisma.ProjectProposalSelect;

export type ProposalForFreelancer = Prisma.ProjectProposalGetPayload<{
	select: typeof selectForFreelancer;
}>;
export type ProposalForCompany = Prisma.ProjectProposalGetPayload<{
	select: typeof selectForCompany;
}>;

export type CreateProposalData = {
	projectId: string;
	freelancerProfileId: string;
	freelancerNameSnapshot: string | null;
	coverLetter: string;
	proposedTimeline: string | null;
};

export async function create(
	data: CreateProposalData,
	tx: Prisma.TransactionClient = prisma
): Promise<{ id: string }> {
	return tx.projectProposal.create({
		data: {
			projectId: data.projectId,
			freelancerProfileId: data.freelancerProfileId,
			freelancerNameSnapshot: data.freelancerNameSnapshot,
			coverLetter: data.coverLetter,
			proposedTimeline: data.proposedTimeline
		},
		select: { id: true }
	});
}

export async function findById(id: string): Promise<ProposalForCompany | null> {
	return prisma.projectProposal.findUnique({ where: { id }, select: selectForCompany });
}

export async function findByIdForFreelancer(id: string): Promise<ProposalForFreelancer | null> {
	return prisma.projectProposal.findUnique({ where: { id }, select: selectForFreelancer });
}

export async function findOwnForProject(
	projectId: string,
	freelancerProfileId: string
): Promise<{ id: string; status: ProposalStatus } | null> {
	return prisma.projectProposal.findUnique({
		where: { projectId_freelancerProfileId: { projectId, freelancerProfileId } },
		select: { id: true, status: true }
	});
}

export async function listForProject(projectId: string): Promise<ProposalForCompany[]> {
	return prisma.projectProposal.findMany({
		where: { projectId },
		select: selectForCompany,
		orderBy: { createdAt: 'asc' }
	});
}

export async function countForProject(projectId: string): Promise<number> {
	return prisma.projectProposal.count({ where: { projectId } });
}

export async function listForFreelancer(
	freelancerProfileId: string
): Promise<ProposalForFreelancer[]> {
	return prisma.projectProposal.findMany({
		where: { freelancerProfileId },
		select: selectForFreelancer,
		orderBy: { createdAt: 'desc' }
	});
}

export async function updateStatus(
	id: string,
	status: ProposalStatus,
	tx: Prisma.TransactionClient = prisma
) {
	return tx.projectProposal.update({
		where: { id },
		data: { status },
		select: { id: true, status: true }
	});
}

/** Bulk-reject every other SUBMITTED proposal on a project (used at award). */
export async function rejectAllExcept(
	projectId: string,
	keepProposalId: string,
	tx: Prisma.TransactionClient = prisma
) {
	await tx.projectProposal.updateMany({
		where: { projectId, id: { not: keepProposalId }, status: ProposalStatus.SUBMITTED },
		data: { status: ProposalStatus.REJECTED }
	});
}
