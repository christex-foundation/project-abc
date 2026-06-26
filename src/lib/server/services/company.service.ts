import { AppError } from '../http';
import { requireRole, type AuthedUser } from '../auth-helpers';
import * as companyRepo from '../repositories/company.repo';
import { assertOwnedCloudinaryUrl } from '../cloudinary';
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

	// A logo URL must be one of our own Cloudinary uploads (uploaded via the
	// signed flow), never an arbitrary or someone else's URL.
	if (parsed.logo) assertOwnedCloudinaryUrl(parsed.logo, 'logo', caller.id);

	return companyRepo.updateById(profile.id, {
		companyName: parsed.companyName,
		description: parsed.description,
		website: parsed.website,
		logo: parsed.logo,
		industry: parsed.industry,
		country: parsed.country ?? 'SL'
	});
}

/** Persist an uploaded company logo immediately, after validating its origin. */
export async function setLogo(caller: AuthedUser, imageUrl: string) {
	requireRole(caller, 'COMPANY');
	assertOwnedCloudinaryUrl(imageUrl, 'logo', caller.id);
	const profile = await companyRepo.findByUserId(caller.id);
	if (!profile) {
		throw new AppError('CONFLICT', 'Company profile not found for this account.');
	}
	const updated = await companyRepo.updateById(profile.id, { logo: imageUrl });
	return { logo: updated.logo };
}
