import * as projectService from '$lib/server/services/project.service';
import * as skillService from '$lib/server/services/skill.service';
import type { PageServerLoad } from './$types';

/**
 * Projects feed — the standalone Project domain (a one-company-one-contractor
 * engagement, distinct from the competitive Bounty feed at `/bounties`).
 */
export const load: PageServerLoad = async ({ url }) => {
	const params = Object.fromEntries(url.searchParams.entries());
	const skillIdsAll = url.searchParams.getAll('skillIds');
	const result = await projectService.listProjects({
		...params,
		...(skillIdsAll.length ? { skillIds: skillIdsAll } : {})
	});
	const skills = await skillService.listSkills();

	const filterKeys = ['skillIds', 'minBudget', 'maxBudget', 'search'];
	const hasFilter = filterKeys.some((k) => url.searchParams.has(k));

	return {
		items: result.items,
		total: result.total,
		page: Number(params.page ?? 1),
		pageSize: Number(params.pageSize ?? 20),
		filters: {
			minBudget: params.minBudget ?? '',
			maxBudget: params.maxBudget ?? '',
			search: params.search ?? '',
			skillIds: skillIdsAll
		},
		categories: skills,
		pageMetaTags: hasFilter ? { robots: 'noindex, nofollow' } : undefined
	};
};
