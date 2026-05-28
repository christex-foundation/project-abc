import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

// Auth gate for all (platform) routes. Child +page.server.ts loads that call
// requireAuth(locals) MUST `await parent()` first — SvelteKit runs parent and
// child loads in parallel, so without `await parent()` a child's synchronous
// throw can beat this redirect and unauthenticated users see a 500.
export const load: LayoutServerLoad = ({ locals, url }) => {
	if (!locals.user) {
		throw redirect(303, `/login?redirect=${encodeURIComponent(url.pathname)}`);
	}
	return {};
};
