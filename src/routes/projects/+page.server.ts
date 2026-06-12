import * as projectService from '$lib/server/services/project.service';
import * as skillService from '$lib/server/services/skill.service';
import { majorToMinor } from '$lib/utils';
import type { PageServerLoad } from './$types';

/**
 * Projects feed — the standalone Project domain (a one-company-one-contractor
 * engagement, distinct from the competitive Bounty feed at `/bounties`).
 */
export const load: PageServerLoad = async ({ url }) => {
	const params = Object.fromEntries(url.searchParams.entries());
	const skillIdsAll = url.searchParams.getAll('skillIds');
	// The budget filter is entered in major-unit Leones (label "Min/Max (SLE)") but
	// compared against the minor-unit budget column — convert on the query path. The
	// echoed `filters` below keep the raw major value for the input.
	const toMinorParam = (v: string | undefined) => (v ? String(majorToMinor(Number(v))) : undefined);
	const result = await projectService.listProjects({
		...params,
		...(toMinorParam(params.minBudget) ? { minBudget: toMinorParam(params.minBudget) } : {}),
		...(toMinorParam(params.maxBudget) ? { maxBudget: toMinorParam(params.maxBudget) } : {}),
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
