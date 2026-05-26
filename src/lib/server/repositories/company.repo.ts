import { prisma } from '../db';
import type { CompanyProfile } from '@prisma/client';

export async function createEmpty(
	userId: string,
	companyName?: string | null
): Promise<CompanyProfile> {
	return prisma.companyProfile.create({
		data: { userId, companyName: companyName ?? '' }
	});
}

export async function findByUserId(userId: string): Promise<CompanyProfile | null> {
	return prisma.companyProfile.findUnique({ where: { userId } });
}

export async function ensureForUser(
	userId: string,
	companyName?: string | null
): Promise<CompanyProfile> {
	const existing = await findByUserId(userId);
	if (existing) return existing;
	return createEmpty(userId, companyName);
}
