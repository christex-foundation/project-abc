import { prisma } from '../db';
import type { Skill, SkillCategory } from '@prisma/client';

export async function listAllWithCategories() {
	return prisma.skillCategory.findMany({
		orderBy: { name: 'asc' },
		include: { skills: { orderBy: { name: 'asc' } } }
	});
}

export async function findByIds(ids: string[]) {
	if (ids.length === 0) return [];
	return prisma.skill.findMany({ where: { id: { in: ids } } });
}

export async function findBySlug(slug: string) {
	return prisma.skill.findUnique({ where: { slug } });
}

export async function findById(id: string): Promise<Skill | null> {
	return prisma.skill.findUnique({ where: { id } });
}

export async function findCategoryById(id: string): Promise<SkillCategory | null> {
	return prisma.skillCategory.findUnique({ where: { id } });
}

export async function findCategoryBySlug(slug: string): Promise<SkillCategory | null> {
	return prisma.skillCategory.findUnique({ where: { slug } });
}

export async function createCategory(data: { name: string; slug: string }): Promise<SkillCategory> {
	return prisma.skillCategory.create({ data });
}

export async function createSkill(data: {
	name: string;
	slug: string;
	categoryId: string;
}): Promise<Skill> {
	return prisma.skill.create({ data });
}

export async function updateSkill(
	id: string,
	data: { name?: string; slug?: string; categoryId?: string }
): Promise<Skill> {
	return prisma.skill.update({ where: { id }, data });
}

export async function deleteSkill(id: string): Promise<void> {
	await prisma.skill.delete({ where: { id } });
}

export async function countSkillReferences(id: string): Promise<number> {
	const [freelancers, bounties] = await Promise.all([
		prisma.freelancerSkill.count({ where: { skillId: id } }),
		prisma.bountySkill.count({ where: { skillId: id } })
	]);
	return freelancers + bounties;
}
