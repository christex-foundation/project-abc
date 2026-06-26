import { z } from 'zod';

// Shared schemas for the signed Cloudinary upload flow. The Cloudinary-host /
// ownership check needs runtime env, so it lives in the service
// (`assertOwnedCloudinaryUrl`), not here.

export const signUploadInput = z.object({
	purpose: z.enum(['avatar', 'logo'])
});
export type SignUploadInput = z.infer<typeof signUploadInput>;

export const setAvatarInput = z.object({
	imageUrl: z.string().url().max(500)
});
export type SetAvatarInput = z.infer<typeof setAvatarInput>;
