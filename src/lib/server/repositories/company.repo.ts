import { prisma } from '../db';
import type { CompanyProfile, Prisma } from '@prisma/client';

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

export async function updateById(
	id: string,
	data: Prisma.CompanyProfileUpdateInput
): Promise<CompanyProfile> {
	return prisma.companyProfile.update({ where: { id }, data });
}

export async function setFinancialAccount(
	profileId: string,
	accountId: string,
	uvan: string | null
): Promise<void> {
	await prisma.companyProfile.update({
		where: { id: profileId },
		data: { monimeFinancialAccountId: accountId, monimeUvan: uvan }
	});
}
