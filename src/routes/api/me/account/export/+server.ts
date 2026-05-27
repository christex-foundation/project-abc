import { requireAuth } from '$lib/server/auth-helpers';
import { respondError } from '$lib/server/http';
import * as account from '$lib/server/services/account.service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	try {
		const user = requireAuth(locals);
		const { filename, zip } = await account.exportMyData(user);
		return new Response(new Uint8Array(zip), {
			status: 200,
			headers: {
				'content-type': 'application/zip',
				'content-disposition': `attachment; filename="${filename}"`,
				'cache-control': 'no-store'
			}
		});
	} catch (e) {
		return respondError(e);
	}
};
