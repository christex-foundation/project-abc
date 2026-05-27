import { prisma } from '../db';
import { AppError } from '../http';
import { requireRole, type AuthedUser } from '../auth-helpers';
import * as proofOfWorkRepo from '../repositories/proofOfWork.repo';
import * as freelancerRepo from '../repositories/freelancer.repo';
import * as skillRepo from '../repositories/skill.repo';
import { proofOfWorkInput, type ProofOfWorkInput } from '$lib/validators/proofOfWork';

async function getOwnedProfile(caller: AuthedUser) {
	requireRole(caller, 'FREELANCER');
	const profile = await freelancerRepo.findByUserId(caller.id);
	if (!profile) {
		throw new AppError('CONFLICT', 'Freelancer profile not found for this account.');
	}
	return profile;
}

async function validateSkillSplit(skillIds: string[]): Promise<string[]> {
	const unique = Array.from(new Set(skillIds));
	const skills = await skillRepo.findByIds(unique);
	if (skills.length !== unique.length) {
		throw new AppError('BAD_REQUEST', 'One or more skills do not exist.');
	}
	const parents = skills.filter((s) => s.parentSkillId === null);
	const subs = skills.filter((s) => s.parentSkillId !== null);
	if (parents.length === 0) {
		throw new AppError('BAD_REQUEST', 'Pick at least one skill.');
	}
	if (subs.length === 0) {
		throw new AppError('BAD_REQUEST', 'Pick at least one sub-skill.');
	}
	return unique;
}

export async function list(caller: AuthedUser) {
	const profile = await getOwnedProfile(caller);
	return proofOfWorkRepo.listByFreelancerProfileId(profile.id);
}

export async function create(caller: AuthedUser, raw: unknown) {
	const profile = await getOwnedProfile(caller);
	const parsed: ProofOfWorkInput = proofOfWorkInput.parse(raw);
	const skillIds = await validateSkillSplit(parsed.skillIds);

	const created = await prisma.$transaction(async (tx) => {
		return proofOfWorkRepo.create(
			tx,
			profile.id,
			{ title: parsed.title, description: parsed.description, link: parsed.link },
			skillIds
		);
	});

	return proofOfWorkRepo.findByIdWithSkills(created.id);
}

export async function update(caller: AuthedUser, id: string, raw: unknown) {
	const profile = await getOwnedProfile(caller);
	const existing = await proofOfWorkRepo.findById(id);
	if (!existing) {
		throw new AppError('NOT_FOUND', 'Proof of work not found.');
	}
	if (existing.freelancerProfileId !== profile.id) {
		throw new AppError('FORBIDDEN', 'You do not own this proof of work.');
	}

	const parsed: ProofOfWorkInput = proofOfWorkInput.parse(raw);
	const skillIds = await validateSkillSplit(parsed.skillIds);

	await prisma.$transaction(async (tx) => {
		await proofOfWorkRepo.update(tx, id, {
			title: parsed.title,
			description: parsed.description,
			link: parsed.link
		});
		await proofOfWorkRepo.replaceSkills(tx, id, skillIds);
	});

	return proofOfWorkRepo.findByIdWithSkills(id);
}

export async function remove(caller: AuthedUser, id: string) {
	const profile = await getOwnedProfile(caller);
	const existing = await proofOfWorkRepo.findById(id);
	if (!existing) {
		throw new AppError('NOT_FOUND', 'Proof of work not found.');
	}
	if (existing.freelancerProfileId !== profile.id) {
		throw new AppError('FORBIDDEN', 'You do not own this proof of work.');
	}
	await proofOfWorkRepo.remove(id);
}
