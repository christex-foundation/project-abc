import { prisma } from '../db';
import type { Setting } from '@prisma/client';

export async function findByKey(key: string): Promise<Setting | null> {
	return prisma.setting.findUnique({ where: { key } });
}

export async function listAll(): Promise<Setting[]> {
	return prisma.setting.findMany();
}

export async function upsert(
	key: string,
	value: unknown,
	updatedById: string | null
): Promise<Setting> {
	return prisma.setting.upsert({
		where: { key },
		update: { value: value as object, updatedById: updatedById ?? undefined },
		create: { key, value: value as object, updatedById: updatedById ?? undefined }
	});
}
