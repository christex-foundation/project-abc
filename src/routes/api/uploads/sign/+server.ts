import { json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth-helpers';
import { respondError } from '$lib/server/http';
import { signUploadInput } from '$lib/validators/upload';
import * as userService from '$lib/server/services/user.service';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, request }) => {
	try {
		const caller = requireAuth(locals);
		const { purpose } = signUploadInput.parse(await request.json());
		return json(userService.signAvatarUpload(caller, purpose));
	} catch (e) {
		return respondError(e);
	}
};
