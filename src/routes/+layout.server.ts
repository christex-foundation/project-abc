import * as walletService from '$lib/server/services/wallet.service';
import { resolveAvatar } from '$lib/server/avatar';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	// Wallet summary feeds the TopNav credits + balance chips. Loaded here at
	// the root layout so it's available across both the (platform) group and
	// the public /bounties + /projects routes for signed-in users. The service
	// caches results per-user with a short TTL so navigating between pages
	// doesn't hammer Monime.
	let wallet: walletService.WalletSummary | null = null;
	if (locals.user && locals.user.isActive) {
		try {
			wallet = await walletService.getWalletSummary(locals.user);
		} catch (err) {
			// Topnav chips degrade gracefully to "—"; a wallet failure must never
			// break navigation chrome.
			console.warn('[layout] wallet summary failed', err);
		}
	}

	// Avatar SVG is generated server-side so DiceBear stays out of the client
	// bundle; the TopNav renders it for signed-in (non-company) users.
	const userAvatar = locals.user
		? resolveAvatar(locals.user.image, locals.user.name ?? locals.user.email)
		: null;

	return {
		user: locals.user,
		userAvatar,
		settings: locals.settings,
		isAdminHost: locals.isAdminHost,
		wallet
	};
};
