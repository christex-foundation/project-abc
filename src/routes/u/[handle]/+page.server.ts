import { error } from '@sveltejs/kit';
import { AppError } from '$lib/server/http';
import { stripHtml } from '$lib/server/seo';
import * as profileService from '$lib/server/services/profile.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	try {
		const profile = await profileService.getPublicProfile(locals.user ?? null, params.handle);

		const title = profile.kind === 'freelancer' ? profile.displayName : profile.companyName;
		const rawDescription =
			profile.kind === 'freelancer'
				? (profile.headline ?? profile.bio ?? '')
				: (profile.description ?? '');
		// OG images must be absolute http(s) URLs — the DiceBear fallback is a data
		// URI, so only a real uploaded photo/logo is used (else the site default).
		const ogImage = profile.kind === 'freelancer' ? profile.photo : profile.logo;

		return {
			profile,
			pageMetaTags: {
				title,
				description: stripHtml(rawDescription) || `${title} on Future of Work.`,
				image: ogImage
			}
		};
	} catch (e) {
		if (e instanceof AppError && e.code === 'NOT_FOUND') throw error(404, e.message);
		throw e;
	}
};
