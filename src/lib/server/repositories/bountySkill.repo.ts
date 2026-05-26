import type { Prisma, PrismaClient } from '@prisma/client';

export type BountySkillInput = { skillId: string; isRequired: boolean };

export async function replaceAllForBounty(
	tx: Prisma.TransactionClient | PrismaClient,
	bountyId: string,
	skills: BountySkillInput[]
) {
	await tx.bountySkill.deleteMany({ where: { bountyId } });
	if (skills.length === 0) return;
	await tx.bountySkill.createMany({
		data: skills.map((s) => ({
			bountyId,
			skillId: s.skillId,
			isRequired: s.isRequired
		}))
	});
}
