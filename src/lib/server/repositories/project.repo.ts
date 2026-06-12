import { prisma } from '../db';
import { ProjectStatus, type Prisma } from '@prisma/client';

/**
 * Public-facing select. Deliberately excludes escrow account ids and the
 * checkout session — those are sponsor-only operational fields. The awarded
 * contractor's identity is exposed (the engagement is no longer secret once a
 * project is past OPEN), but other applicants' proposals never appear here.
 */
export const selectPublic = {
	id: true,
	slug: true,
	title: true,
	description: true,
	requirements: true,
	deliverables: true,
	status: true,
	currency: true,
	budgetCap: true,
	// Public so applicants see which provinces may apply (empty = nationwide).
	targetProvinces: true,
	targetDistricts: true,
	timeToComplete: true,
	publishedAt: true,
	awardedAt: true,
	completedAt: true,
	createdAt: true,
	companyNameSnapshot: true,
	contractorProfileId: true,
	contractorNameSnapshot: true,
	company: {
		select: {
			id: true,
			companyName: true,
			logo: true,
			website: true,
			country: true,
			verified: true
		}
	},
	skills: {
		select: {
			id: true,
			isRequired: true,
			skill: { select: { id: true, name: true, slug: true } }
		}
	},
	// Company-defined milestone plan — public so applicants see what they apply to.
	milestones: {
		select: {
			id: true,
			position: true,
			title: true,
			description: true,
			amount: true,
			dueInDays: true,
			status: true,
			revisionCount: true
		},
		orderBy: { position: 'asc' as const }
	}
} satisfies Prisma.ProjectSelect;

export const selectForCompany = {
	...selectPublic,
	companyProfileId: true,
	awardedProposalId: true,
	// Selected so the service can derive `isPinLocked` and verify unlock PINs; the
	// hash itself is stripped before any client-facing return (see `toCompanyListView`
	// and `project.service.toView`).
	accessPinHash: true,
	escrowFinancialAccountId: true,
	escrowFundedAmount: true,
	checkoutSessionId: true,
	checkoutSessionUrl: true,
	creditsExempt: true,
	activatedAt: true,
	cancelledAt: true,
	updatedAt: true
} satisfies Prisma.ProjectSelect;

export type ProjectPublic = Prisma.ProjectGetPayload<{ select: typeof selectPublic }>;
export type ProjectForCompany = Prisma.ProjectGetPayload<{ select: typeof selectForCompany }>;

/**
 * Owner-facing list shape. Same as the company view but with the raw PIN hash
 * collapsed to `isPinLocked` so it never reaches the dashboard client.
 */
export type ProjectForCompanyList = Omit<ProjectForCompany, 'accessPinHash'> & {
	isPinLocked: boolean;
};

function toCompanyListView(row: ProjectForCompany): ProjectForCompanyList {
	const { accessPinHash, ...rest } = row;
	return { ...rest, isPinLocked: !!accessPinHash };
}

export async function findProjectById(id: string): Promise<ProjectForCompany | null> {
	return prisma.project.findUnique({ where: { id }, select: selectForCompany });
}

export async function findProjectBySlug(slug: string): Promise<ProjectForCompany | null> {
	return prisma.project.findUnique({ where: { slug }, select: selectForCompany });
}

export async function slugExists(slug: string): Promise<boolean> {
	const found = await prisma.project.findUnique({ where: { slug }, select: { id: true } });
	return !!found;
}

export type ProjectListFilter = {
	skillIds?: string[];
	minBudget?: number;
	maxBudget?: number;
	search?: string;
	page: number;
	pageSize: number;
};

/**
 * Public listing — statuses visible to anonymous callers. OPEN is the primary
 * state (accepting proposals); AWARDED/ACTIVE/COMPLETED remain browsable so the
 * marketplace shows track record.
 */
export async function listPublicProjects(
	filter: ProjectListFilter
): Promise<{ items: ProjectPublic[]; total: number }> {
	const where: Prisma.ProjectWhereInput = {
		status: {
			in: [ProjectStatus.OPEN, ProjectStatus.AWARDED, ProjectStatus.ACTIVE, ProjectStatus.COMPLETED]
		}
	};
	if (filter.minBudget !== undefined) where.budgetCap = { gte: filter.minBudget };
	if (filter.maxBudget !== undefined) {
		where.budgetCap = { ...(where.budgetCap as object), lte: filter.maxBudget };
	}
	if (filter.search) {
		where.OR = [
			{ title: { contains: filter.search, mode: 'insensitive' } },
			{ description: { contains: filter.search, mode: 'insensitive' } }
		];
	}
	if (filter.skillIds?.length) {
		where.skills = { some: { skillId: { in: filter.skillIds } } };
	}

	const [items, total] = await Promise.all([
		prisma.project.findMany({
			where,
			select: selectPublic,
			orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
			skip: (filter.page - 1) * filter.pageSize,
			take: filter.pageSize
		}),
		prisma.project.count({ where })
	]);
	return { items, total };
}

export async function listForCompany(companyProfileId: string): Promise<ProjectForCompanyList[]> {
	const rows = await prisma.project.findMany({
		where: { companyProfileId },
		select: selectForCompany,
		orderBy: { updatedAt: 'desc' }
	});
	return rows.map(toCompanyListView);
}

export async function listForContractor(
	contractorProfileId: string
): Promise<ProjectForCompanyList[]> {
	const rows = await prisma.project.findMany({
		where: { contractorProfileId },
		select: selectForCompany,
		orderBy: { updatedAt: 'desc' }
	});
	return rows.map(toCompanyListView);
}

export type AdminProjectRow = {
	id: string;
	slug: string;
	title: string;
	status: ProjectStatus;
	currency: string;
	budgetCap: number;
	escrowFundedAmount: number;
	creditsExempt: boolean;
	createdAt: Date;
	// Nullable after the owning company's GDPR account deletion (FK is SET NULL).
	company: { id: string; companyName: string } | null;
	_count: { proposals: number; milestones: number };
};

export async function listForAdmin(filter: {
	search?: string;
	status?: ProjectStatus;
}): Promise<AdminProjectRow[]> {
	const where: Prisma.ProjectWhereInput = {};
	if (filter.status) where.status = filter.status;
	if (filter.search) {
		where.OR = [
			{ title: { contains: filter.search, mode: 'insensitive' } },
			{ slug: { contains: filter.search, mode: 'insensitive' } }
		];
	}
	return prisma.project.findMany({
		where,
		select: {
			id: true,
			slug: true,
			title: true,
			status: true,
			currency: true,
			budgetCap: true,
			escrowFundedAmount: true,
			creditsExempt: true,
			createdAt: true,
			company: { select: { id: true, companyName: true } },
			_count: { select: { proposals: true, milestones: true } }
		},
		orderBy: { createdAt: 'desc' },
		take: 100
	});
}

export async function listActiveProjectSlugs(): Promise<string[]> {
	const rows = await prisma.project.findMany({
		where: { status: { in: [ProjectStatus.OPEN, ProjectStatus.ACTIVE, ProjectStatus.COMPLETED] } },
		select: { slug: true }
	});
	return rows.map((r) => r.slug);
}

export async function createProject(data: Prisma.ProjectCreateInput) {
	return prisma.project.create({ data, select: selectForCompany });
}

export async function setCreditsExempt(
	projectId: string,
	creditsExempt: boolean
): Promise<{ id: string; creditsExempt: boolean }> {
	return prisma.project.update({
		where: { id: projectId },
		data: { creditsExempt },
		select: { id: true, creditsExempt: true }
	});
}

export async function deleteProject(id: string) {
	await prisma.project.delete({ where: { id } });
}

export async function markPublished(id: string, tx: Prisma.TransactionClient = prisma) {
	return tx.project.update({
		where: { id },
		data: { status: ProjectStatus.OPEN, publishedAt: new Date() },
		select: { id: true, status: true, publishedAt: true }
	});
}

export async function markAwarded(
	id: string,
	input: {
		awardedProposalId: string;
		contractorProfileId: string;
		contractorNameSnapshot: string | null;
	},
	tx: Prisma.TransactionClient = prisma
) {
	return tx.project.update({
		where: { id },
		data: {
			status: ProjectStatus.AWARDED,
			awardedProposalId: input.awardedProposalId,
			contractorProfileId: input.contractorProfileId,
			contractorNameSnapshot: input.contractorNameSnapshot,
			awardedAt: new Date()
		},
		select: { id: true, status: true, awardedProposalId: true, contractorProfileId: true }
	});
}

export async function setEscrowAccount(
	id: string,
	escrowFinancialAccountId: string,
	tx: Prisma.TransactionClient = prisma
) {
	return tx.project.update({
		where: { id },
		data: { escrowFinancialAccountId },
		select: { id: true, escrowFinancialAccountId: true }
	});
}

export async function setCheckoutSession(
	id: string,
	input: { checkoutSessionId: string; checkoutSessionUrl: string }
) {
	return prisma.project.update({
		where: { id },
		data: {
			checkoutSessionId: input.checkoutSessionId,
			checkoutSessionUrl: input.checkoutSessionUrl
		},
		select: { id: true, checkoutSessionId: true, checkoutSessionUrl: true }
	});
}

/** AWARDED → ACTIVE once escrow is funded. */
export async function markFunded(
	id: string,
	escrowFundedAmount: number,
	tx: Prisma.TransactionClient = prisma
) {
	return tx.project.update({
		where: { id },
		data: { status: ProjectStatus.ACTIVE, escrowFundedAmount, activatedAt: new Date() },
		select: { id: true, status: true, escrowFundedAmount: true }
	});
}

export async function markCompleted(id: string, tx: Prisma.TransactionClient = prisma) {
	return tx.project.update({
		where: { id },
		data: { status: ProjectStatus.COMPLETED, completedAt: new Date() },
		select: { id: true, status: true, completedAt: true }
	});
}

export async function markCancelled(id: string, tx: Prisma.TransactionClient = prisma) {
	return tx.project.update({
		where: { id },
		data: { status: ProjectStatus.CANCELLED, cancelledAt: new Date() },
		select: { id: true, status: true, cancelledAt: true }
	});
}

export async function setAiEmbedding(id: string, vector: number[]) {
	await prisma.project.update({ where: { id }, data: { aiEmbedding: vector } });
}

export const selectForMatching = {
	...selectPublic,
	aiEmbedding: true
} satisfies Prisma.ProjectSelect;

export type ProjectForMatching = Prisma.ProjectGetPayload<{ select: typeof selectForMatching }>;

/** OPEN projects with embeddings, for cosine-similarity ranking in the service. */
export async function listActiveForMatching(): Promise<ProjectForMatching[]> {
	return prisma.project.findMany({
		where: { status: ProjectStatus.OPEN },
		select: selectForMatching,
		orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }]
	});
}

export async function findForEmbedding(id: string) {
	return prisma.project.findUnique({
		where: { id },
		select: {
			id: true,
			title: true,
			description: true,
			requirements: true,
			deliverables: true,
			skills: { select: { skill: { select: { name: true } } } }
		}
	});
}

export async function findForMatchingWithEmbedding(id: string) {
	return prisma.project.findUnique({
		where: { id },
		select: {
			id: true,
			slug: true,
			title: true,
			aiEmbedding: true,
			skills: { select: { skill: { select: { name: true } } } }
		}
	});
}
