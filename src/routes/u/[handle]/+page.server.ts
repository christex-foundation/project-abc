import { error } from '@sveltejs/kit';
import { AppError } from '$lib/server/http';
import { stripHtml, buildPersonJsonLd, buildOrganizationJsonLd } from '$lib/server/seo';
import * as profileService from '$lib/server/services/profile.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	try {
		const profile = await profileService.getPublicProfile(locals.user ?? null, params.handle);
		const canonical = `${url.origin}/u/${profile.handle}`;

		const title = profile.kind === 'freelancer' ? profile.displayName : profile.companyName;
		const rawDescription =
			profile.kind === 'freelancer'
				? (profile.headline ?? profile.bio ?? '')
				: (profile.description ?? '');
		const description = stripHtml(rawDescription) || `${title} on Future of Work.`;
		// OG/Twitter images must be absolute http(s) URLs — the DiceBear fallback is
		// a data URI, so only a real uploaded photo/logo is used (else site default).
		const ogImage = profile.kind === 'freelancer' ? profile.photo : profile.logo;

		const jsonLd =
			profile.kind === 'freelancer'
				? buildPersonJsonLd(profile, canonical)
				: buildOrganizationJsonLd(profile, canonical);

		return {
			profile,
			canonical,
			jsonLd,
			pageMetaTags: { title, description, image: ogImage }
		};
	} catch (e) {
		if (e instanceof AppError && e.code === 'NOT_FOUND') throw error(404, e.message);
		throw e;
	}
};
