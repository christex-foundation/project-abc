import { json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth-helpers';
import { AppError, respondError } from '$lib/server/http';
import * as freelancerService from '$lib/server/services/freelancer.service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	try {
		const caller = requireAuth(locals);
		if (caller.role === 'FREELANCER') {
			const profile = await freelancerService.getMyProfile(caller);
			return json({ user: caller, freelancerProfile: profile });
		}
		// Company / admin profile reads land in Phase 7.
		return json({ user: caller });
	} catch (e) {
		return respondError(e);
	}
};

export const PATCH: RequestHandler = async ({ locals, request }) => {
	try {
		const caller = requireAuth(locals);
		if (caller.role !== 'FREELANCER') {
			throw new AppError('FORBIDDEN', 'Profile editing for this role lands in a later phase.');
		}
		const body = await request.json();
		const profile = await freelancerService.updateProfile(caller, body);
		return json({ freelancerProfile: profile });
	} catch (e) {
		return respondError(e);
	}
};
