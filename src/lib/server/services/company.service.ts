import { AppError } from '../http';
import { requireRole, type AuthedUser } from '../auth-helpers';
import * as companyRepo from '../repositories/company.repo';
import { updateCompanyProfileInput, type UpdateCompanyProfileInput } from '$lib/validators/company';

export async function getMyProfile(caller: AuthedUser) {
	requireRole(caller, 'COMPANY');
	const profile = await companyRepo.findByUserId(caller.id);
	if (!profile) {
		throw new AppError('CONFLICT', 'Company profile not found for this account.');
	}
	return profile;
}

export async function updateProfile(caller: AuthedUser, raw: unknown) {
	requireRole(caller, 'COMPANY');
	const parsed: UpdateCompanyProfileInput = updateCompanyProfileInput.parse(raw);

	const profile = await companyRepo.findByUserId(caller.id);
	if (!profile) {
		throw new AppError('CONFLICT', 'Company profile not found for this account.');
	}

	return companyRepo.updateById(profile.id, {
		companyName: parsed.companyName,
		description: parsed.description,
		website: parsed.website,
		logo: parsed.logo,
		industry: parsed.industry,
		country: parsed.country ?? 'SL'
	});
}
