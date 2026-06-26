import { requireRole, type AuthedUser } from '../auth-helpers';
import * as userRepo from '../repositories/user.repo';
import {
	signUpload,
	assertOwnedCloudinaryUrl,
	type SignedUpload,
	type UploadPurpose
} from '../cloudinary';

/**
 * Sign a direct-to-Cloudinary upload for the caller. `avatar` (personal photo →
 * User.image) is open to any signed-in user; `logo` (company brand → handled via
 * the company profile save) requires the COMPANY role.
 */
export function signAvatarUpload(caller: AuthedUser, purpose: UploadPurpose): SignedUpload {
	if (purpose === 'logo') requireRole(caller, 'COMPANY');
	return signUpload(purpose, caller.id, Math.floor(Date.now() / 1000));
}

/** Persist an uploaded personal photo to User.image after validating its origin. */
export async function setAvatar(caller: AuthedUser, imageUrl: string) {
	assertOwnedCloudinaryUrl(imageUrl, 'avatar', caller.id);
	const user = await userRepo.setImage(caller.id, imageUrl);
	return { image: user.image };
}
