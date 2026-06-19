import { requireAuth } from '$lib/server/auth-helpers';
import * as account from '$lib/server/services/account.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent }) => {
	await parent();
	const user = requireAuth(locals);
	// OAuth-only users have no password to change.
	const hasPassword = await account.userHasCredentialAccount(user.id);
	return { hasPassword };
};
