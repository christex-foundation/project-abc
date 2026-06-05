import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * Proposals merged into the unified "My Work" page (Bounties | Projects tabs).
 * Keep this route alive as a redirect so existing links/bookmarks don't 404.
 */
export const load: PageServerLoad = () => {
	throw redirect(307, '/dashboard/freelancer/submissions');
};
