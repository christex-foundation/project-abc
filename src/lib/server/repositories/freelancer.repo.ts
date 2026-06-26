import { prisma } from '../db';
import { ensureHandle } from '../handle';
import type { District, FreelancerProfile, Prisma, PrismaClient, Province } from '@prisma/client';

/**
 * Public profile shape for the shareable `/u/[handle]` page. Deliberately omits
 * every sensitive column (bankDetails, monime*, withdrawal*, whatsappNumber,
 * aiEmbedding, credits) — only what a freelancer chooses to show publicly.
 */
export const selectPublicProfile = {
	id: true,
	displayName: true,
	headline: true,
	bio: true,
	portfolio: true,
	experienceLevel: true,
	province: true,
	district: true,
	createdAt: true,
	skills: {
		select: {
			proficiencyLevel: true,
			yearsExperience: true,
			skill: { select: { id: true, name: true, slug: true } }
		}
	}
} satisfies Prisma.FreelancerProfileSelect;

export type FreelancerPublicProfile = Prisma.FreelancerProfileGetPayload<{
	select: typeof selectPublicProfile;
}>;

export type FreelancerProfileWithSkills = Prisma.FreelancerProfileGetPayload<{
	include: {
		skills: {
			include: { skill: { select: { id: true; name: true; slug: true; categoryId: true } } };
		};
	};
}>;

export type UpdateProfileInput = {
	displayName?: string;
	headline?: string | null;
	bio?: string | null;
	portfolio?: string | null;
	experienceLevel?: string | null;
	whatsappNumber?: string | null;
	province?: Province | null;
	district?: District | null;
};

export type FreelancerSkillInput = {
	skillId: string;
	proficiencyLevel: number;
	yearsExperience?: number | null;
};

export async function createEmpty(userId: string, displayName: string): Promise<FreelancerProfile> {
	const profile = await prisma.freelancerProfile.create({
		data: { userId, displayName }
	});
	// Give every new freelancer an immediately-shareable public handle. Best-effort:
	// a handle failure must never block sign-up (getMyProfile backfills later).
	try {
		await ensureHandle(userId, displayName);
	} catch (e) {
		console.error('[freelancer.repo] handle generation failed:', e);
	}
	return profile;
}

export async function findPublicByUserId(userId: string): Promise<FreelancerPublicProfile | null> {
	return prisma.freelancerProfile.findUnique({
		where: { userId },
		select: selectPublicProfile
	});
}

export async function findByUserId(userId: string): Promise<FreelancerProfile | null> {
	return prisma.freelancerProfile.findUnique({ where: { userId } });
}

export async function findByUserIdWithSkills(
	userId: string
): Promise<FreelancerProfileWithSkills | null> {
	return prisma.freelancerProfile.findUnique({
		where: { userId },
		include: {
			skills: {
				include: { skill: { select: { id: true, name: true, slug: true, categoryId: true } } }
			}
		}
	});
}

export async function findByIdWithSkills(id: string): Promise<FreelancerProfileWithSkills | null> {
	return prisma.freelancerProfile.findUnique({
		where: { id },
		include: {
			skills: {
				include: { skill: { select: { id: true, name: true, slug: true, categoryId: true } } }
			}
		}
	});
}

export async function updateProfile(
	tx: Prisma.TransactionClient | PrismaClient,
	id: string,
	data: UpdateProfileInput
): Promise<FreelancerProfile> {
	return tx.freelancerProfile.update({ where: { id }, data });
}

export async function replaceSkills(
	tx: Prisma.TransactionClient | PrismaClient,
	freelancerProfileId: string,
	skills: FreelancerSkillInput[]
) {
	await tx.freelancerSkill.deleteMany({ where: { freelancerProfileId } });
	if (skills.length === 0) return;
	await tx.freelancerSkill.createMany({
		data: skills.map((s) => ({
			freelancerProfileId,
			skillId: s.skillId,
			proficiencyLevel: s.proficiencyLevel,
			yearsExperience: s.yearsExperience ?? null
		}))
	});
}

export async function setAiEmbedding(id: string, vector: number[]) {
	await prisma.freelancerProfile.update({
		where: { id },
		data: { aiEmbedding: vector }
	});
}

export async function setFinancialAccount(
	profileId: string,
	accountId: string,
	uvan: string | null
): Promise<void> {
	await prisma.freelancerProfile.update({
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
	await prisma.freelancerProfile.update({
		where: { id: profileId },
		data: {
			withdrawalPhone: dest.phone,
			withdrawalHolderName: dest.holderName,
			withdrawalProviderName: dest.providerName,
			withdrawalVerifiedAt: new Date()
		}
	});
}

export type FreelancerForMatching = {
	id: string;
	userId: string;
	displayName: string;
	aiEmbedding: number[];
};

/**
 * All freelancers that have an embedding computed. Used by
 * matching.service.findMatchesForBounty to rank candidates for a newly
 * published bounty.
 *
 * Postgres array filtering through Prisma is awkward; we filter empty
 * embeddings in the service layer instead. At MVP scale (Sierra Leone,
 * < 500 freelancers per §10) the in-memory pass is cheap. TODO: pgvector
 * when > 5k profiles.
 */
export async function listAllWithEmbeddings(): Promise<FreelancerForMatching[]> {
	return prisma.freelancerProfile.findMany({
		select: { id: true, userId: true, displayName: true, aiEmbedding: true }
	});
}
