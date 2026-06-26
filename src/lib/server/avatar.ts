import { createAvatar } from '@dicebear/core';
import { adventurer } from '@dicebear/collection';

/**
 * Generate a deterministic DiceBear `adventurer` avatar as an inline SVG
 * data URI, seeded from a stable user string (name or email).
 *
 * This runs server-only so the ~275 KB DiceBear collection never reaches the
 * client bundle (mobile-first < 200 KB initial-JS budget — see CLAUDE.md).
 * The SVG is size-agnostic; the rendering `<img>` element handles sizing.
 */
export function avatarDataUri(seed: string): string {
	return (
		'data:image/svg+xml;utf8,' + encodeURIComponent(createAvatar(adventurer, { seed }).toString())
	);
}

/**
 * Resolve the avatar to show for a user: their uploaded Cloudinary image when
 * present, otherwise the deterministic DiceBear fallback seeded from `seed`.
 */
export function resolveAvatar(image: string | null | undefined, seed: string): string {
	return image ?? avatarDataUri(seed);
}
