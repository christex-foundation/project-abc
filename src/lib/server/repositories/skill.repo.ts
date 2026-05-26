import { prisma } from '../db';

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
