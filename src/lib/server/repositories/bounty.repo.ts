import { prisma } from '../db';
import { BountyStatus, type BountyType, type CompensationType, type Prisma } from '@prisma/client';

/**
 * `selectForFreelancer` deliberately excludes Submission-level fields that
 * sponsors keep private (`notes`, `label`). Phase 2 does not yet join
 * Submissions onto the detail response, but the shape is locked here so
 * Phase 4 cannot accidentally leak them.
 */
export const selectForFreelancer = {
	id: true,
	slug: true,
	title: true,
	description: true,
	requirements: true,
	deliverables: true,
	type: true,
	status: true,
	compensationType: true,
	currency: true,
	totalPrizePool: true,
	rewardAmount: true,
	minRewardAsk: true,
	maxRewardAsk: true,
	rewards: true,
	numberOfWinners: true,
	maxBonusSpots: true,
	eligibility: true,
	creditsExempt: true,
	timeToComplete: true,
	submissionDeadline: true,
	judgingDeadline: true,
	publishedAt: true,
	createdAt: true,
	companyNameSnapshot: true,
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
	prizeTiers: {
		select: { id: true, position: true, amount: true, label: true },
		orderBy: { position: 'asc' as const }
	},
	skills: {
		select: {
			id: true,
			isRequired: true,
			skill: { select: { id: true, name: true, slug: true } }
		}
	}
} satisfies Prisma.BountySelect;

export const selectForSponsor = {
	...selectForFreelancer,
	companyProfileId: true,
	escrowFinancialAccountId: true,
	escrowFundedAmount: true,
	checkoutSessionId: true,
	checkoutSessionUrl: true,
	isWinnersAnnounced: true,
	winnersAnnouncedAt: true,
	completedAt: true,
	cancelledAt: true,
	updatedAt: true
} satisfies Prisma.BountySelect;

export type BountyForFreelancer = Prisma.BountyGetPayload<{ select: typeof selectForFreelancer }>;
export type BountyForSponsor = Prisma.BountyGetPayload<{ select: typeof selectForSponsor }>;

export async function findBountyById(id: string): Promise<BountyForSponsor | null> {
	return prisma.bounty.findUnique({ where: { id }, select: selectForSponsor });
}

export async function findBountyBySlug(slug: string): Promise<BountyForSponsor | null> {
	return prisma.bounty.findUnique({ where: { slug }, select: selectForSponsor });
}

export async function slugExists(slug: string): Promise<boolean> {
	const found = await prisma.bounty.findUnique({ where: { slug }, select: { id: true } });
	return !!found;
}

export type BountyListFilter = {
	type?: BountyType;
	compensationType?: CompensationType;
	skillIds?: string[];
	minPrize?: number;
	maxPrize?: number;
	beforeDeadline?: Date;
	search?: string;
	page: number;
	pageSize: number;
};

/**
 * Public-facing listing. Restricts to statuses visible to anonymous callers.
 */
export async function listPublicBounties(
	filter: BountyListFilter
): Promise<{ items: BountyForFreelancer[]; total: number }> {
	const where: Prisma.BountyWhereInput = {
		status: { in: [BountyStatus.ACTIVE, BountyStatus.JUDGING, BountyStatus.COMPLETED] }
	};
	if (filter.type) where.type = filter.type;
	if (filter.compensationType) where.compensationType = filter.compensationType;
	if (filter.minPrize !== undefined) where.totalPrizePool = { gte: filter.minPrize };
	if (filter.maxPrize !== undefined) {
		where.totalPrizePool = { ...(where.totalPrizePool as object), lte: filter.maxPrize };
	}
	if (filter.beforeDeadline) where.submissionDeadline = { lte: filter.beforeDeadline };
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
		prisma.bounty.findMany({
			where,
			select: selectForFreelancer,
			orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
			skip: (filter.page - 1) * filter.pageSize,
			take: filter.pageSize
		}),
		prisma.bounty.count({ where })
	]);
	return { items, total };
}

export async function listForCompany(companyProfileId: string): Promise<BountyForSponsor[]> {
	return prisma.bounty.findMany({
		where: { companyProfileId },
		select: selectForSponsor,
		orderBy: { updatedAt: 'desc' }
	});
}

export type AdminBountyRow = {
	id: string;
	slug: string;
	title: string;
	status: BountyStatus;
	type: BountyType;
	currency: string;
	totalPrizePool: number;
	escrowFundedAmount: number;
	creditsExempt: boolean;
	submissionDeadline: Date;
	createdAt: Date;
	// Nullable after the owning company's GDPR account deletion (FK is SET NULL).
	company: { id: string; companyName: string } | null;
	_count: { submissions: number };
};

export async function setCreditsExempt(
	bountyId: string,
	creditsExempt: boolean
): Promise<{ id: string; creditsExempt: boolean }> {
	return prisma.bounty.update({
		where: { id: bountyId },
		data: { creditsExempt },
		select: { id: true, creditsExempt: true }
	});
}

export async function listForAdmin(filter: {
	search?: string;
	status?: BountyStatus;
	type?: BountyType;
}): Promise<AdminBountyRow[]> {
	const where: Prisma.BountyWhereInput = {};
	if (filter.status) where.status = filter.status;
	if (filter.type) where.type = filter.type;
	if (filter.search) {
		where.OR = [
			{ title: { contains: filter.search, mode: 'insensitive' } },
			{ slug: { contains: filter.search, mode: 'insensitive' } }
		];
	}
	return prisma.bounty.findMany({
		where,
		select: {
			id: true,
			slug: true,
			title: true,
			status: true,
			type: true,
			currency: true,
			totalPrizePool: true,
			escrowFundedAmount: true,
			creditsExempt: true,
			submissionDeadline: true,
			createdAt: true,
			company: { select: { id: true, companyName: true } },
			_count: { select: { submissions: true } }
		},
		orderBy: { createdAt: 'desc' },
		take: 100
	});
}

export async function listActiveBountySlugs(): Promise<string[]> {
	const rows = await prisma.bounty.findMany({
		where: { status: BountyStatus.ACTIVE },
		select: { slug: true }
	});
	return rows.map((r) => r.slug);
}

export async function createBounty(data: Prisma.BountyCreateInput) {
	return prisma.bounty.create({ data, select: selectForSponsor });
}

export async function updateBounty(id: string, data: Prisma.BountyUpdateInput) {
	return prisma.bounty.update({ where: { id }, data, select: selectForSponsor });
}

export async function updateBountyStatus(id: string, status: BountyStatus) {
	return prisma.bounty.update({
		where: { id },
		data: { status },
		select: { id: true, status: true }
	});
}

export async function setEscrowAccount(
	id: string,
	escrowFinancialAccountId: string,
	tx: Prisma.TransactionClient = prisma
) {
	return tx.bounty.update({
		where: { id },
		data: { escrowFinancialAccountId },
		select: { id: true, escrowFinancialAccountId: true }
	});
}

export async function setCheckoutSession(
	id: string,
	input: { checkoutSessionId: string; checkoutSessionUrl: string }
) {
	return prisma.bounty.update({
		where: { id },
		data: {
			checkoutSessionId: input.checkoutSessionId,
			checkoutSessionUrl: input.checkoutSessionUrl
		},
		select: { id: true, checkoutSessionId: true, checkoutSessionUrl: true }
	});
}

export async function markFunded(
	id: string,
	escrowFundedAmount: number,
	tx: Prisma.TransactionClient = prisma
) {
	return tx.bounty.update({
		where: { id },
		data: { status: BountyStatus.FUNDED, escrowFundedAmount },
		select: { id: true, status: true, escrowFundedAmount: true }
	});
}

export async function markCompletedAndAnnounced(id: string, tx: Prisma.TransactionClient = prisma) {
	const now = new Date();
	return tx.bounty.update({
		where: { id },
		data: {
			status: BountyStatus.COMPLETED,
			isWinnersAnnounced: true,
			winnersAnnouncedAt: now,
			completedAt: now
		},
		select: { id: true, status: true, isWinnersAnnounced: true }
	});
}

export async function markCancelled(id: string, tx: Prisma.TransactionClient = prisma) {
	return tx.bounty.update({
		where: { id },
		data: { status: BountyStatus.CANCELLED, cancelledAt: new Date() },
		select: { id: true, status: true, cancelledAt: true }
	});
}

export async function markPublished(id: string, tx: Prisma.TransactionClient = prisma) {
	return tx.bounty.update({
		where: { id },
		data: { status: BountyStatus.ACTIVE, publishedAt: new Date() },
		select: { id: true, status: true, publishedAt: true }
	});
}

export async function deleteBounty(id: string) {
	await prisma.bounty.delete({ where: { id } });
}

export async function setAiEmbedding(id: string, vector: number[]) {
	await prisma.bounty.update({
		where: { id },
		data: { aiEmbedding: vector }
	});
}

/**
 * Used by matching.service. Reuses `selectForFreelancer` (sponsor-private
 * fields stay excluded) and adds `aiEmbedding` so the service can compute
 * cosine similarity in memory.
 */
export const selectForMatching = {
	...selectForFreelancer,
	aiEmbedding: true
} satisfies Prisma.BountySelect;

export type BountyForMatching = Prisma.BountyGetPayload<{ select: typeof selectForMatching }>;

/**
 * Returns ACTIVE bounties with their embeddings for cosine-similarity ranking.
 * Bounties without an embedding are filtered out in the service layer (Prisma
 * cannot express "non-empty array" cleanly across providers).
 */
export async function listActiveForMatching(): Promise<BountyForMatching[]> {
	return prisma.bounty.findMany({
		where: { status: BountyStatus.ACTIVE },
		select: selectForMatching,
		orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }]
	});
}

/**
 * Lightweight load used to compose the bounty's embedding prompt.
 */
export async function findForEmbedding(id: string) {
	return prisma.bounty.findUnique({
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

/**
 * Same as findForEmbedding but also returns the stored embedding vector.
 * Used by matching.service.findMatchesForBounty (post-publish fan-out).
 */
export async function findForMatchingWithEmbedding(id: string) {
	return prisma.bounty.findUnique({
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
