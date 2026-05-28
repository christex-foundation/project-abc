import * as bountyService from '$lib/server/services/bounty.service';
import * as skillService from '$lib/server/services/skill.service';
import type { PageServerLoad } from './$types';

/**
 * Projects feed — alias of the bounties list locked to `type=PROJECT`.
 * Same shape as `/bounties` so it can share components; the `type` query
 * parameter is force-set server-side and not exposed as a user-toggleable
 * filter on this page (the page IS the type).
 */
export const load: PageServerLoad = async ({ url }) => {
	const params = Object.fromEntries(url.searchParams.entries());
	const skillIdsAll = url.searchParams.getAll('skillIds');
	const result = await bountyService.listBounties({
		...params,
		type: 'PROJECT',
		...(skillIdsAll.length ? { skillIds: skillIdsAll } : {})
	});
	const skills = await skillService.listSkills();

	const filterKeys = [
		'compensationType',
		'skillIds',
		'minPrize',
		'maxPrize',
		'beforeDeadline',
		'search'
	];
	const hasFilter = filterKeys.some((k) => url.searchParams.has(k));

	return {
		items: result.items,
		total: result.total,
		page: Number(params.page ?? 1),
		pageSize: Number(params.pageSize ?? 20),
		filters: {
			compensationType: params.compensationType ?? '',
			minPrize: params.minPrize ?? '',
			maxPrize: params.maxPrize ?? '',
			beforeDeadline: params.beforeDeadline ?? '',
			search: params.search ?? '',
			skillIds: skillIdsAll
		},
		categories: skills,
		pageMetaTags: hasFilter ? { robots: 'noindex, nofollow' } : undefined
	};
};
