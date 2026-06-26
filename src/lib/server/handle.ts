import { prisma } from './db';
import type { Prisma } from '@prisma/client';

const MAX_TRIES = 50;

/**
 * Handles that would collide with top-level routes or read as impersonation.
 * Generation skips straight past these; the edit path rejects them.
 */
export const RESERVED_HANDLES = new Set([
	'admin',
	'api',
	'u',
	'login',
	'logout',
	'register',
	'settings',
	'dashboard',
	'bounties',
	'projects',
	'legal',
	'offline',
	'goodbye',
	'me',
	'fow',
	'support'
]);

/** Valid edited handle: 3–40 chars, lowercase alnum + single hyphens, no edge hyphen. */
export const HANDLE_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Slugify a raw string (display name / company name) into a handle-safe token:
 * lowercase `a–z0–9`, words joined by single hyphens, 3–40 chars. Falls back to
 * a padded/`user` value so we always return something usable.
 */
export function slugifyHandle(raw: string): string {
	const base = (raw ?? '')
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '') // strip accents
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-') // non-alnum runs → hyphen
		.replace(/-+/g, '-') // collapse repeats
		.replace(/^-+|-+$/g, '') // trim edge hyphens
		.slice(0, 40);
	if (base.length >= 3 && !RESERVED_HANDLES.has(base)) return base;
	// Pad short / empty / reserved slugs so they satisfy the 3-char minimum.
	return `${base || 'user'}-fow`.slice(0, 40);
}

/**
 * Ensure the user has a unique, URL-safe handle, deriving one from `source`
 * (their display/company name) on first call. Idempotent — returns the existing
 * handle untouched. Mirrors the referral-code collision loop in `referral.repo`.
 */
export async function ensureHandle(
	userId: string,
	source: string,
	tx: Prisma.TransactionClient = prisma
): Promise<string> {
	const existing = await tx.user.findUnique({ where: { id: userId }, select: { handle: true } });
	if (existing?.handle) return existing.handle;

	const base = slugifyHandle(source);
	for (let i = 0; i < MAX_TRIES; i++) {
		const candidate = i === 0 ? base : `${base}-${i + 1}`.slice(0, 40);
		const hit = await tx.user.findUnique({ where: { handle: candidate }, select: { id: true } });
		if (!hit) {
			await tx.user.update({ where: { id: userId }, data: { handle: candidate } });
			return candidate;
		}
	}
	// Practically unreachable at our scale; suffix with part of the id as a last resort.
	const fallback = `${base}-${userId.slice(-6).toLowerCase()}`.slice(0, 40);
	await tx.user.update({ where: { id: userId }, data: { handle: fallback } });
	return fallback;
}
