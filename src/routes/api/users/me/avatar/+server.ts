import { json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth-helpers';
import { respondError } from '$lib/server/http';
import { setAvatarInput } from '$lib/validators/upload';
import * as userService from '$lib/server/services/user.service';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async ({ locals, request }) => {
	try {
		const caller = requireAuth(locals);
		const { imageUrl } = setAvatarInput.parse(await request.json());
		const result = await userService.setAvatar(caller, imageUrl);
		return json(result);
	} catch (e) {
		return respondError(e);
	}
};
