import { error, fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';
import { AppError } from '$lib/server/http';
import * as bountyService from '$lib/server/services/bounty.service';
import { isAiEnabled } from '$lib/server/ai/ai-flag';
import { buildBountyJsonLd, stripHtml } from '$lib/server/seo';
import { grantUnlock, readUnlockedIds } from '$lib/server/access-lock';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, cookies }) => {
	try {
		const bounty = await bountyService.getBounty(locals.user, params.slug, {
			unlockedIds: readUnlockedIds(cookies)
		});
		const origin = env.PUBLIC_APP_URL || 'http://localhost:5173';
		return {
			bounty,
			// Gates the freelancer "Coach me" panel; off → panel is absent.
			aiEnabled: await isAiEnabled(),
			jsonLd: buildBountyJsonLd(bounty, origin),
			pageMetaTags: {
				title: bounty.title,
				description: stripHtml(bounty.description) || `Apply to ${bounty.title} on Learn2Earn.`
			}
		};
	} catch (e) {
		if (e instanceof AppError) {
			if (e.code === 'NOT_FOUND') throw error(404, e.message);
			if (e.code === 'FORBIDDEN') throw error(403, e.message);
		}
		throw e;
	}
};

export const actions: Actions = {
	// Verify the PIN and, on success, record the unlock in the signed cookie. The
	// page re-runs `load` afterwards, which now returns the full (unlocked) bounty.
	unlock: async ({ request, params, cookies }) => {
		const form = await request.formData();
		const pin = String(form.get('pin') ?? '').trim();
		try {
			const { bountyId } = await bountyService.unlockBounty(params.slug, pin);
			grantUnlock(cookies, bountyId);
		} catch (e) {
			if (e instanceof AppError) return fail(e.httpStatus, { unlockError: e.message });
			throw e;
		}
		return { unlocked: true };
	}
};
