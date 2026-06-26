import 'dotenv/config';
import { v2 as cloudinary } from 'cloudinary';
import { AppError } from './http';

// Server-only Cloudinary helpers. We never expose the API secret to the client:
// the browser uploads directly to Cloudinary using a short-lived signature we
// produce here, then we persist the returned URL (validated below). Config reads
// `process.env` to match the rest of the server (see auth.ts), not `$env`.

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (cloudName && apiKey && apiSecret) {
	cloudinary.config({
		cloud_name: cloudName,
		api_key: apiKey,
		api_secret: apiSecret,
		secure: true
	});
}

/** Folders we upload into. One deterministic asset per user per folder. */
export const UPLOAD_FOLDERS = {
	avatar: 'fow/avatars',
	logo: 'fow/logos'
} as const;

export type UploadPurpose = keyof typeof UPLOAD_FOLDERS;

export type SignedUpload = {
	cloudName: string;
	apiKey: string;
	timestamp: number;
	signature: string;
	folder: string;
	publicId: string;
	/** Replace the user's existing asset rather than create a new one. */
	overwrite: true;
	invalidate: true;
};

function requireConfig(): { cloudName: string; apiKey: string; apiSecret: string } {
	if (!cloudName || !apiKey || !apiSecret) {
		throw new AppError('INTERNAL', 'Image uploads are not configured.');
	}
	return { cloudName, apiKey, apiSecret };
}

/** Deterministic public id so re-uploads overwrite the same asset (no orphans). */
function publicIdFor(folder: string, userId: string): string {
	return `${folder}/${userId}`;
}

/**
 * Produce a signed upload payload the browser POSTs straight to Cloudinary.
 * `timestamp` (unix seconds) is supplied by the caller so this module stays free
 * of wall-clock reads and the signing logic is testable.
 */
export function signUpload(
	purpose: UploadPurpose,
	userId: string,
	timestamp: number
): SignedUpload {
	const cfg = requireConfig();
	const folder = UPLOAD_FOLDERS[purpose];
	const publicId = publicIdFor(folder, userId);
	// These params (minus api_key/secret/file) MUST match what the browser sends,
	// or Cloudinary rejects the signature.
	const signature = cloudinary.utils.api_sign_request(
		{ folder, public_id: publicId, overwrite: true, invalidate: true, timestamp },
		cfg.apiSecret
	);
	return {
		cloudName: cfg.cloudName,
		apiKey: cfg.apiKey,
		timestamp,
		signature,
		folder,
		publicId,
		overwrite: true,
		invalidate: true
	};
}

/**
 * Trust boundary for any Cloudinary URL we persist: it must be an https
 * res.cloudinary.com URL on OUR cloud, under the expected folder, and scoped to
 * this user's own deterministic public id. Blocks storing an arbitrary URL or
 * pointing at another user's asset.
 */
export function assertOwnedCloudinaryUrl(
	url: string,
	purpose: UploadPurpose,
	userId: string
): void {
	const cfg = requireConfig();
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		throw new AppError('BAD_REQUEST', 'Invalid image URL.');
	}
	const folder = UPLOAD_FOLDERS[purpose];
	const publicId = publicIdFor(folder, userId);
	const okHost = parsed.protocol === 'https:' && parsed.hostname === 'res.cloudinary.com';
	// Path looks like: /<cloud>/image/upload/v<version>/<folder>/<userId>.<ext>
	const okCloud = parsed.pathname.startsWith(`/${cfg.cloudName}/`);
	const okAsset = parsed.pathname.includes(`/${publicId}`);
	if (!okHost || !okCloud || !okAsset) {
		throw new AppError('BAD_REQUEST', 'Image URL is not an accepted upload.');
	}
}
