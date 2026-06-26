import { AppError } from '../http';
import type { AuthedUser } from '../auth-helpers';
import { resolveAvatar } from '../avatar';
import * as userRepo from '../repositories/user.repo';
import * as freelancerRepo from '../repositories/freelancer.repo';
import * as companyRepo from '../repositories/company.repo';
import * as submissionRepo from '../repositories/submission.repo';
import * as paymentRepo from '../repositories/payment.repo';
import * as bountyRepo from '../repositories/bounty.repo';
import * as projectRepo from '../repositories/project.repo';
import type { BountyForFreelancer } from '../repositories/bounty.repo';
import type { ProjectPublic } from '../repositories/project.repo';
import type { FreelancerWin } from '../repositories/submission.repo';

// A profile view is read by anyone; cap the bounty/project lists shown on it.
const LIST_PAGE_SIZE = 50;

export type PublicFreelancerProfile = {
	kind: 'freelancer';
	handle: string;
	displayName: string;
	avatar: string;
	/** Raw uploaded photo URL (null → DiceBear fallback only); used for OG images. */
	photo: string | null;
	headline: string | null;
	bio: string | null;
	portfolio: string | null;
	experienceLevel: string | null;
	province: string | null;
	district: string | null;
	joinedAt: Date;
	skills: Array<{
		id: string;
		name: string;
		slug: string;
		proficiencyLevel: number;
		yearsExperience: number | null;
	}>;
	wins: FreelancerWin[];
	totalEarnings: number;
	currency: string;
};

export type PublicCompanyProfile = {
	kind: 'company';
	handle: string;
	companyName: string;
	logo: string | null;
	description: string | null;
	website: string | null;
	industry: string | null;
	country: string;
	verified: boolean;
	joinedAt: Date;
	bounties: BountyForFreelancer[];
	projects: ProjectPublic[];
};

export type PublicProfile = PublicFreelancerProfile | PublicCompanyProfile;

/**
 * Resolve a `/u/[handle]` page. Public — `viewer` may be null. Returns a
 * role-discriminated, public-safe shape; throws NOT_FOUND for unknown,
 * deactivated, or non-profile (ADMIN) accounts. `viewer` is reserved for
 * future owner/edit affordances and does not change field visibility today.
 */
export async function getPublicProfile(
	_viewer: AuthedUser | null,
	handle: string
): Promise<PublicProfile> {
	const user = await userRepo.findByHandle(handle);
	if (!user || !user.isActive || !user.handle) {
		throw new AppError('NOT_FOUND', 'Profile not found.');
	}

	if (user.role === 'FREELANCER') {
		const profile = await freelancerRepo.findPublicByUserId(user.id);
		if (!profile) throw new AppError('NOT_FOUND', 'Profile not found.');
		const [wins, totalEarnings] = await Promise.all([
			submissionRepo.listWinsForFreelancer(profile.id),
			paymentRepo.sumCompletedEarningsForFreelancer(profile.id)
		]);
		return {
			kind: 'freelancer',
			handle: user.handle,
			displayName: profile.displayName,
			avatar: resolveAvatar(user.image, profile.displayName),
			photo: user.image,
			headline: profile.headline,
			bio: profile.bio,
			portfolio: profile.portfolio,
			experienceLevel: profile.experienceLevel,
			province: profile.province,
			district: profile.district,
			joinedAt: profile.createdAt,
			skills: profile.skills.map((s) => ({
				id: s.skill.id,
				name: s.skill.name,
				slug: s.skill.slug,
				proficiencyLevel: s.proficiencyLevel,
				yearsExperience: s.yearsExperience
			})),
			wins,
			totalEarnings,
			currency: 'SLE'
		};
	}

	if (user.role === 'COMPANY') {
		const profile = await companyRepo.findPublicByUserId(user.id);
		if (!profile) throw new AppError('NOT_FOUND', 'Profile not found.');
		const [bounties, projects] = await Promise.all([
			bountyRepo.listPublicBounties({
				companyProfileId: profile.id,
				page: 1,
				pageSize: LIST_PAGE_SIZE
			}),
			projectRepo.listPublicProjects({
				companyProfileId: profile.id,
				page: 1,
				pageSize: LIST_PAGE_SIZE
			})
		]);
		return {
			kind: 'company',
			handle: user.handle,
			companyName: profile.companyName,
			logo: profile.logo,
			description: profile.description,
			website: profile.website,
			industry: profile.industry,
			country: profile.country,
			verified: profile.verified,
			joinedAt: profile.createdAt,
			bounties: bounties.items,
			projects: projects.items
		};
	}

	// ADMIN (or any future role) has no public profile.
	throw new AppError('NOT_FOUND', 'Profile not found.');
}
