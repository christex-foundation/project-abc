import { json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth-helpers';
import { AppError, respondError } from '$lib/server/http';
import * as freelancerService from '$lib/server/services/freelancer.service';
import * as companyService from '$lib/server/services/company.service';
import { tryProvisionAccountAfterProfileUpdate } from '$lib/server/services/financial-account.service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	try {
		const caller = requireAuth(locals);
		if (caller.role === 'FREELANCER') {
			const profile = await freelancerService.getMyProfile(caller);
			return json({ user: caller, freelancerProfile: profile });
		}
		if (caller.role === 'COMPANY') {
			const profile = await companyService.getMyProfile(caller);
			return json({ user: caller, companyProfile: profile });
		}
		return json({ user: caller });
	} catch (e) {
		return respondError(e);
	}
};

export const PATCH: RequestHandler = async ({ locals, request }) => {
	try {
		const caller = requireAuth(locals);
		const body = await request.json();
		if (caller.role === 'FREELANCER') {
			const profile = await freelancerService.updateProfile(caller, body);
			// Lazily provision Monime financial account after profile save (non-blocking).
			tryProvisionAccountAfterProfileUpdate(caller).catch(() => {});
			return json({ freelancerProfile: profile });
		}
		if (caller.role === 'COMPANY') {
			const profile = await companyService.updateProfile(caller, body);
			// Lazily provision Monime financial account after profile save (non-blocking).
			tryProvisionAccountAfterProfileUpdate(caller).catch(() => {});
			return json({ companyProfile: profile });
		}
		throw new AppError('FORBIDDEN', 'No editable profile for this role.');
	} catch (e) {
		return respondError(e);
	}
};
