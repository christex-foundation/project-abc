import { json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth-helpers';
import { respondError } from '$lib/server/http';
import * as account from '$lib/server/services/account.service';
import type { RequestHandler } from './$types';

// Better Auth's default session cookie name (cookiePrefix=`better-auth`,
// cookieName=`session_token`). The Session row is cascade-deleted when the
// user is removed, but we explicitly clear the cookie so the browser stops
// sending stale credentials. The `__Secure-`-prefixed variant is set in
// production over HTTPS; clear both so this works in both environments.
const SESSION_COOKIE_NAMES = ['better-auth.session_token', '__Secure-better-auth.session_token'];

export const POST: RequestHandler = async ({ locals, request, cookies }) => {
	try {
		const user = requireAuth(locals);
		const body = await request.json().catch(() => ({}));
		await account.deleteMyAccount(user, body);
		for (const name of SESSION_COOKIE_NAMES) cookies.delete(name, { path: '/' });
		return json({ ok: true }, { status: 200 });
	} catch (e) {
		return respondError(e);
	}
};
