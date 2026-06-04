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
