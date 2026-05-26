import { prisma } from '../db';
import { AppError } from '../http';
import { requireRole, type AuthedUser } from '../auth-helpers';
import * as freelancerRepo from '../repositories/freelancer.repo';
import * as skillRepo from '../repositories/skill.repo';
import * as matchingService from './matching.service';
import {
	updateFreelancerProfileInput,
	type UpdateFreelancerProfileInput
} from '$lib/validators/freelancer';

export async function getMyProfile(caller: AuthedUser) {
	requireRole(caller, 'FREELANCER');
	const profile = await freelancerRepo.findByUserIdWithSkills(caller.id);
	if (!profile) {
		throw new AppError('CONFLICT', 'Freelancer profile not found for this account.');
	}
	return profile;
}

export async function updateProfile(caller: AuthedUser, raw: unknown) {
	requireRole(caller, 'FREELANCER');
	const parsed: UpdateFreelancerProfileInput = updateFreelancerProfileInput.parse(raw);

	const profile = await freelancerRepo.findByUserId(caller.id);
	if (!profile) {
		throw new AppError('CONFLICT', 'Freelancer profile not found for this account.');
	}

	const skillIds = parsed.skills.map((s) => s.skillId);
	if (skillIds.length > 0) {
		const found = await skillRepo.findByIds(skillIds);
		if (found.length !== skillIds.length) {
			throw new AppError('BAD_REQUEST', 'One or more skills do not exist.');
		}
	}

	await prisma.$transaction(async (tx) => {
		await freelancerRepo.updateProfile(tx, profile.id, {
			displayName: parsed.displayName,
			headline: parsed.headline,
			bio: parsed.bio,
			portfolio: parsed.portfolio,
			experienceLevel: parsed.experienceLevel,
			momoNumber: parsed.momoNumber,
			whatsappNumber: parsed.whatsappNumber
		});
		await freelancerRepo.replaceSkills(tx, profile.id, parsed.skills);
	});

	// Fire-and-forget embedding recompute. A failed OpenAI call must not
	// roll back the profile save; the user will simply see no recommendation
	// updates until their next save.
	void matchingService
		.recomputeFreelancerEmbedding(profile.id)
		.catch((e) => console.error('[freelancer.service] embedding recompute failed:', e));

	return freelancerRepo.findByIdWithSkills(profile.id);
}
