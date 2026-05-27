import { prisma } from '../db';
import { Prisma, type CreditTxnReason } from '@prisma/client';

/**
 * Freelancer-safe transaction view. Surfaces enough context for the activity
 * feed without leaking sponsor-private fields (notes, label, score).
 */
export const selectTransactionForFreelancer = {
	id: true,
	delta: true,
	balanceAfter: true,
	reason: true,
	periodKey: true,
	notes: true,
	createdAt: true,
	submission: {
		select: {
			id: true,
			bounty: { select: { id: true, slug: true, title: true } }
		}
	}
} satisfies Prisma.CreditTransactionSelect;

export const selectTransactionForAdmin = {
	...selectTransactionForFreelancer,
	bountyId: true,
	adminUserId: true,
	adminUser: { select: { id: true, email: true, name: true } }
} satisfies Prisma.CreditTransactionSelect;

export type CreditTransactionForFreelancer = Prisma.CreditTransactionGetPayload<{
	select: typeof selectTransactionForFreelancer;
}>;
export type CreditTransactionForAdmin = Prisma.CreditTransactionGetPayload<{
	select: typeof selectTransactionForAdmin;
}>;

export async function getProfileBalance(
	freelancerProfileId: string,
	tx: Prisma.TransactionClient = prisma
): Promise<{ creditsBalance: number; creditsPeriodKey: string | null } | null> {
	return tx.freelancerProfile.findUnique({
		where: { id: freelancerProfileId },
		select: { creditsBalance: true, creditsPeriodKey: true }
	});
}

export async function updateProfileBalance(
	freelancerProfileId: string,
	balance: number,
	periodKey: string,
	tx: Prisma.TransactionClient
): Promise<void> {
	await tx.freelancerProfile.update({
		where: { id: freelancerProfileId },
		data: { creditsBalance: balance, creditsPeriodKey: periodKey }
	});
}

type InsertInput = {
	freelancerProfileId: string;
	delta: number;
	balanceAfter: number;
	reason: CreditTxnReason;
	periodKey: string;
	submissionId?: string | null;
	bountyId?: string | null;
	adminUserId?: string | null;
	notes?: string | null;
};

/**
 * Insert a credit ledger row.
 *
 * Returns `null` when a partial-unique idempotency index fires (P2002) —
 * callers treat that as "this side-effect already happened; no-op."
 */
export async function insertTransaction(
	input: InsertInput,
	tx: Prisma.TransactionClient = prisma
): Promise<{ id: string } | null> {
	try {
		return await tx.creditTransaction.create({
			data: {
				freelancerProfileId: input.freelancerProfileId,
				delta: input.delta,
				balanceAfter: input.balanceAfter,
				reason: input.reason,
				periodKey: input.periodKey,
				submissionId: input.submissionId ?? null,
				bountyId: input.bountyId ?? null,
				adminUserId: input.adminUserId ?? null,
				notes: input.notes ?? null
			},
			select: { id: true }
		});
	} catch (e) {
		if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
			return null;
		}
		throw e;
	}
}

export async function listForFreelancer(
	freelancerProfileId: string,
	opts: { limit: number; cursor?: string }
): Promise<CreditTransactionForFreelancer[]> {
	return prisma.creditTransaction.findMany({
		where: { freelancerProfileId },
		orderBy: { createdAt: 'desc' },
		take: opts.limit,
		...(opts.cursor ? { skip: 1, cursor: { id: opts.cursor } } : {}),
		select: selectTransactionForFreelancer
	});
}

export async function listForAdmin(
	freelancerProfileId: string,
	opts: { limit: number; cursor?: string }
): Promise<CreditTransactionForAdmin[]> {
	return prisma.creditTransaction.findMany({
		where: { freelancerProfileId },
		orderBy: { createdAt: 'desc' },
		take: opts.limit,
		...(opts.cursor ? { skip: 1, cursor: { id: opts.cursor } } : {}),
		select: selectTransactionForAdmin
	});
}

export async function findByProfileAndPeriod(
	freelancerProfileId: string,
	periodKey: string,
	reason: CreditTxnReason
): Promise<{ id: string } | null> {
	return prisma.creditTransaction.findFirst({
		where: { freelancerProfileId, periodKey, reason },
		select: { id: true }
	});
}
