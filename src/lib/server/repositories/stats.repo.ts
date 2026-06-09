import { BountyStatus, PaymentStatus, PaymentType, type BountyType } from '@prisma/client';
import { prisma } from '../db';

/**
 * Stats repo — pure Prisma I/O for the platform-wide social-proof numbers
 * shown on the authenticated home (live counts, total payouts, recent
 * earners). No auth, no masking — those happen at the service layer.
 */

export async function countLiveBounties(type?: BountyType): Promise<number> {
	return prisma.bounty.count({
		where: {
			status: { in: [BountyStatus.ACTIVE, BountyStatus.JUDGING] },
			...(type ? { type } : {})
		}
	});
}

/**
 * Sum of `totalPrizePool` (minor units) across live bounties — the prize money
 * currently up for grabs. Mirrors `countLiveBounties`'s status filter so the
 * value and the count always describe the same set.
 */
export async function sumLiveBountyValue(
	type?: BountyType
): Promise<{ amount: number; currency: string }> {
	const agg = await prisma.bounty.aggregate({
		where: {
			status: { in: [BountyStatus.ACTIVE, BountyStatus.JUDGING] },
			...(type ? { type } : {})
		},
		_sum: { totalPrizePool: true }
	});
	// All money on the platform is in SLE per CLAUDE.md.
	return { amount: agg._sum.totalPrizePool ?? 0, currency: 'SLE' };
}

/**
 * Sum of COMPLETED `PRIZE_PAYOUT` rows across the platform, in minor units.
 * Returns 0 when there are no completed payouts yet (e.g. a fresh DB).
 */
export async function sumTotalPayouts(): Promise<{ amount: number; currency: string }> {
	const agg = await prisma.payment.aggregate({
		where: { type: PaymentType.PRIZE_PAYOUT, status: PaymentStatus.COMPLETED },
		_sum: { amount: true }
	});
	// All money on the platform is in SLE per CLAUDE.md.
	return { amount: agg._sum.amount ?? 0, currency: 'SLE' };
}

/**
 * Count of unique winners whose payouts completed within the last 24h.
 * Used by the home page "X paid today" counter.
 */
export async function countWinnersToday(): Promise<number> {
	const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
	const rows = await prisma.payment.findMany({
		where: {
			type: PaymentType.PRIZE_PAYOUT,
			status: PaymentStatus.COMPLETED,
			updatedAt: { gte: since },
			submissionId: { not: null }
		},
		select: { submissionId: true },
		distinct: ['submissionId']
	});
	return rows.length;
}

export type RecentWinnerRow = {
	paymentId: string;
	amount: number;
	currency: string;
	settledAt: Date;
	displayName: string | null; // unmasked — masking is the service's job
	bountyTitle: string | null;
	bountySlug: string | null;
	bountyType: BountyType | null;
};

/**
 * Most recent completed PRIZE_PAYOUT rows joined to submission → freelancer →
 * bounty. Returns full display names; the service masks them before they
 * leave the server.
 */
export async function recentWinners(limit = 20): Promise<RecentWinnerRow[]> {
	const rows = await prisma.payment.findMany({
		where: {
			type: PaymentType.PRIZE_PAYOUT,
			status: PaymentStatus.COMPLETED,
			submissionId: { not: null }
		},
		select: {
			id: true,
			amount: true,
			currency: true,
			updatedAt: true,
			submission: {
				select: {
					freelancerNameSnapshot: true,
					freelancer: { select: { displayName: true } },
					bounty: { select: { title: true, slug: true, type: true } }
				}
			}
		},
		orderBy: { updatedAt: 'desc' },
		take: limit
	});
	return rows.map((r) => ({
		paymentId: r.id,
		amount: r.amount,
		currency: r.currency,
		settledAt: r.updatedAt,
		displayName:
			r.submission?.freelancer?.displayName ?? r.submission?.freelancerNameSnapshot ?? null,
		bountyTitle: r.submission?.bounty?.title ?? null,
		bountySlug: r.submission?.bounty?.slug ?? null,
		bountyType: r.submission?.bounty?.type ?? null
	}));
}
