import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';
import { AppError } from '$lib/server/http';
import * as bountyService from '$lib/server/services/bounty.service';
import { isAiEnabled } from '$lib/server/ai/ai-flag';
import { buildBountyJsonLd, stripHtml } from '$lib/server/seo';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	try {
		const bounty = await bountyService.getBounty(locals.user, params.slug);
		const origin = env.PUBLIC_APP_URL || 'http://localhost:5173';
		return {
			bounty,
			// Gates the freelancer "Coach me" panel; off → panel is absent.
			aiEnabled: await isAiEnabled(),
			jsonLd: buildBountyJsonLd(bounty, origin),
			pageMetaTags: {
				title: bounty.title,
				description: stripHtml(bounty.description) || `Apply to ${bounty.title} on FOW.`
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
