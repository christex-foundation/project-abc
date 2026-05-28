import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { tryProvisionAccountAfterProfileUpdate } from '$lib/server/services/financial-account.service';

// Auth gate for all (platform) routes. Child +page.server.ts loads that call
// requireAuth(locals) MUST `await parent()` first — SvelteKit runs parent and
// child loads in parallel, so without `await parent()` a child's synchronous
// throw can beat this redirect and unauthenticated users see a 500.
export const load: LayoutServerLoad = (event) => {
	const { locals, url, platform } = event;
	if (!locals.user) {
		throw redirect(303, `/login?redirect=${encodeURIComponent(url.pathname)}`);
	}

	// Backfill Monime financial account for existing users who don't have one.
	// The service is internally idempotent (short-circuits on `monimeFinancialAccountId`)
	// and already swallows + logs errors, so this is fire-and-forget.
	if (locals.user.role === 'COMPANY' || locals.user.role === 'FREELANCER') {
		const task = tryProvisionAccountAfterProfileUpdate(locals.user);
		if (platform?.context?.waitUntil) {
			platform.context.waitUntil(task);
		} else {
			void task.catch(() => {});
		}
	}

	return {};
};
