import * as bountyService from '$lib/server/services/bounty.service';
import * as skillService from '$lib/server/services/skill.service';
import * as statsService from '$lib/server/services/stats.service';
import { majorToMinor } from '$lib/utils';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const params = Object.fromEntries(url.searchParams.entries());
	const skillIdsAll = url.searchParams.getAll('skillIds');
	// The price filter is entered in major-unit Leones (label "Min/Max (SLE)") but
	// compared against the minor-unit `totalPrizePool` column — convert on the query
	// path. The echoed `filters` below keep the raw major value for the input.
	const toMinorParam = (v: string | undefined) => (v ? String(majorToMinor(Number(v))) : undefined);
	const [result, skills, pot] = await Promise.all([
		bountyService.listBounties({
			...params,
			...(toMinorParam(params.minPrize) ? { minPrize: toMinorParam(params.minPrize) } : {}),
			...(toMinorParam(params.maxPrize) ? { maxPrize: toMinorParam(params.maxPrize) } : {}),
			// /bounties is the bounty-only feed; legacy PROJECT-type rows live in the
			// separate Projects domain and must never surface here, including the
			// unfiltered ("All") default.
			type: 'BOUNTY',
			...(skillIdsAll.length ? { skillIds: skillIdsAll } : {})
		}),
		skillService.listSkills(),
		// Platform-wide open pot — independent of the active filters, so it reads
		// as a stable "this much is winnable right now" headline.
		statsService.getOpenBountyPot()
	]);

	// Page-level robots: if any filter is applied, prevent indexing of thin
	// derived URLs. Pagination key alone (`page`) doesn't count.
	const filterKeys = [
		'type',
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
		pot,
		page: Number(params.page ?? 1),
		pageSize: Number(params.pageSize ?? 20),
		filters: {
			type: params.type ?? '',
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
