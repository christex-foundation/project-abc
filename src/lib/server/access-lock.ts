/**
 * PIN-lock primitives for bounties.
 *
 *  - PINs are hashed with a salted scrypt KDF (`accessPinHash` on Bounty). PINs
 *    are low-entropy by design, so a KDF — not a bare hash — is the trust boundary.
 *  - An "unlock" is remembered in a signed, http-only cookie holding the list of
 *    bounty IDs the visitor has entered the correct PIN for. The cookie is HMAC
 *    signed with `BETTER_AUTH_SECRET` so it cannot be forged client-side.
 */

import {
	createHmac,
	randomBytes,
	scrypt as _scrypt,
	timingSafeEqual,
	type BinaryLike
} from 'node:crypto';
import { promisify } from 'node:util';
import type { Cookies } from '@sveltejs/kit';

const scrypt = promisify(_scrypt) as (
	password: BinaryLike,
	salt: BinaryLike,
	keylen: number
) => Promise<Buffer>;

const KEYLEN = 32;

/** Returns a `salt:hash` string suitable for storing in `Bounty.accessPinHash`. */
export async function hashPin(pin: string): Promise<string> {
	const salt = randomBytes(16).toString('hex');
	const derived = await scrypt(pin.normalize('NFKC'), salt, KEYLEN);
	return `${salt}:${derived.toString('hex')}`;
}

/** Constant-time verification of a candidate PIN against a stored `salt:hash`. */
export async function verifyPin(pin: string, stored: string | null | undefined): Promise<boolean> {
	if (!stored) return false;
	const [salt, hash] = stored.split(':');
	if (!salt || !hash) return false;
	const expected = Buffer.from(hash, 'hex');
	const derived = await scrypt(pin.normalize('NFKC'), salt, KEYLEN);
	return expected.length === derived.length && timingSafeEqual(expected, derived);
}

// ---------------------------------------------------------------------------
// Unlock cookie
// ---------------------------------------------------------------------------

export const PIN_COOKIE = 'fow_pin';

const COOKIE_OPTIONS = {
	path: '/',
	httpOnly: true,
	sameSite: 'lax' as const,
	maxAge: 60 * 60 * 24 * 30 // 30 days
};

function secret(): string {
	// Falls back to a constant in dev so local runs work without the env var.
	return process.env.BETTER_AUTH_SECRET || 'fow-dev-insecure-pin-secret';
}

function sign(payload: string): string {
	return createHmac('sha256', secret()).update(payload).digest('base64url');
}

function serialize(ids: string[]): string {
	const payload = ids.join(',');
	return `${Buffer.from(payload).toString('base64url')}.${sign(payload)}`;
}

function deserialize(value: string | undefined): string[] {
	if (!value) return [];
	const [b64, sig] = value.split('.');
	if (!b64 || !sig) return [];
	const payload = Buffer.from(b64, 'base64url').toString('utf8');
	const expected = sign(payload);
	const sigBuf = Buffer.from(sig);
	const expBuf = Buffer.from(expected);
	if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return [];
	return payload ? payload.split(',') : [];
}

/** Bounty IDs the visitor has unlocked, read from the signed cookie. */
export function readUnlockedIds(cookies: Cookies): string[] {
	return deserialize(cookies.get(PIN_COOKIE));
}

/** True when the visitor has already entered the right PIN for this bounty. */
export function isUnlocked(cookies: Cookies, bountyId: string): boolean {
	return readUnlockedIds(cookies).includes(bountyId);
}

/** Records a successful unlock for `bountyId` in the signed cookie. */
export function grantUnlock(cookies: Cookies, bountyId: string): void {
	const ids = new Set(readUnlockedIds(cookies));
	ids.add(bountyId);
	cookies.set(PIN_COOKIE, serialize([...ids]), COOKIE_OPTIONS);
}
