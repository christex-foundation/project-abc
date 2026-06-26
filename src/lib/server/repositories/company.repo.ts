import { prisma } from '../db';
import { ensureHandle } from '../handle';
import type { CompanyProfile, Prisma } from '@prisma/client';

/** Public company profile shape for the shareable `/u/[handle]` page. */
export const selectPublicProfile = {
	id: true,
	companyName: true,
	description: true,
	website: true,
	logo: true,
	industry: true,
	country: true,
	verified: true,
	createdAt: true
} satisfies Prisma.CompanyProfileSelect;

export type CompanyPublicProfile = Prisma.CompanyProfileGetPayload<{
	select: typeof selectPublicProfile;
}>;

export async function createEmpty(
	userId: string,
	companyName?: string | null
): Promise<CompanyProfile> {
	const profile = await prisma.companyProfile.create({
		data: { userId, companyName: companyName ?? '' }
	});
	// Best-effort public handle; never block provisioning on a handle failure.
	try {
		await ensureHandle(userId, companyName || 'company');
	} catch (e) {
		console.error('[company.repo] handle generation failed:', e);
	}
	return profile;
}

export async function findPublicByUserId(userId: string): Promise<CompanyPublicProfile | null> {
	return prisma.companyProfile.findUnique({
		where: { userId },
		select: selectPublicProfile
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

export type WithdrawalDestinationInput = {
	phone: string;
	holderName: string;
	providerName: string;
};

export async function setWithdrawalDestination(
	profileId: string,
	dest: WithdrawalDestinationInput
): Promise<void> {
	await prisma.companyProfile.update({
		where: { id: profileId },
		data: {
			withdrawalPhone: dest.phone,
			withdrawalHolderName: dest.holderName,
			withdrawalProviderName: dest.providerName,
			withdrawalVerifiedAt: new Date()
		}
	});
}
