import type { Prisma, PrismaClient } from '@prisma/client';

export type ProjectSkillInput = { skillId: string; isRequired: boolean };

export async function replaceAllForProject(
	tx: Prisma.TransactionClient | PrismaClient,
	projectId: string,
	skills: ProjectSkillInput[]
) {
	await tx.projectSkill.deleteMany({ where: { projectId } });
	if (skills.length === 0) return;
	await tx.projectSkill.createMany({
		data: skills.map((s) => ({
			projectId,
			skillId: s.skillId,
			isRequired: s.isRequired
		}))
	});
}
