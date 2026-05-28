/**
 * wallet.service.ts
 *
 * Single source for the credits + wallet-balance numbers shown in the TopNav
 * chips and avatar dropdown. Wraps:
 *   - `credit.service.getBalanceForCaller` (DB, cheap, gated by feature flag)
 *   - `financial-account.service.getAccountInfo` (Monime API call)
 *
 * Adds a small in-process TTL cache so navigating between platform pages
 * within the same SSR worker doesn't hammer Monime — every platform
 * request would otherwise pay one Monime round-trip just to render the topnav.
 */

import type { AuthedUser } from '../auth-helpers';
import * as creditService from './credit.service';
import * as financialAccount from './financial-account.service';

export type WalletSummary = {
	creditsBalance: number | null;
	walletBalanceMinor: number | null;
	currencyDisplay: string;
};

type CacheEntry = { value: WalletSummary; expiresAt: number };
const CACHE = new Map<string, CacheEntry>();
const TTL_MS = 30_000;

function cacheKey(user: AuthedUser): string {
	return `${user.role}:${user.id}`;
}

export function invalidate(user: AuthedUser): void {
	CACHE.delete(cacheKey(user));
}

export async function getWalletSummary(user: AuthedUser): Promise<WalletSummary> {
	const key = cacheKey(user);
	const now = Date.now();
	const cached = CACHE.get(key);
	if (cached && cached.expiresAt > now) return cached.value;

	// Both reads are safe to fail-soft: an outage on Monime or a missing
	// freelancer profile shouldn't break the topnav.
	const [credits, account] = await Promise.allSettled([
		creditService.getBalanceForCaller(user),
		financialAccount.getAccountInfo(user)
	]);

	const value: WalletSummary = {
		creditsBalance: credits.status === 'fulfilled' && credits.value ? credits.value.balance : null,
		walletBalanceMinor:
			account.status === 'fulfilled' && account.value.balance != null
				? account.value.balance
				: null,
		// Display label is the short form used in chips ("Le 1.25M") — the canonical
		// currency code on the platform is always "SLE".
		currencyDisplay: 'Le'
	};

	CACHE.set(key, { value, expiresAt: now + TTL_MS });
	return value;
}
