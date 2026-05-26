import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../db';

export type TierInput = { position: number; amount: number; label?: string | null };

/**
 * Replace the full prize-tier set for a bounty atomically. The caller passes
 * a transaction client so the surrounding bounty mutation can roll back if
 * any tier insert fails.
 */
export async function replaceAllForBounty(
	tx: Prisma.TransactionClient | PrismaClient,
	bountyId: string,
	tiers: TierInput[]
) {
	await tx.prizeTier.deleteMany({ where: { bountyId } });
	if (tiers.length === 0) return;
	await tx.prizeTier.createMany({
		data: tiers.map((t) => ({
			bountyId,
			position: t.position,
			amount: t.amount,
			label: t.label ?? null
		}))
	});
}

export async function listByBounty(bountyId: string) {
	return prisma.prizeTier.findMany({
		where: { bountyId },
		orderBy: { position: 'asc' }
	});
}
