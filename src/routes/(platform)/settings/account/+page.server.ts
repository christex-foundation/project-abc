import { requireAuth } from '$lib/server/auth-helpers';
import * as account from '$lib/server/services/account.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent }) => {
	await parent();
	const user = requireAuth(locals);
	const [blockers, hasPassword] = await Promise.all([
		account.getDeletionBlockers(user),
		account.userHasCredentialAccount(user.id)
	]);
	return {
		blockers,
		hasPassword,
		email: user.email
	};
};
