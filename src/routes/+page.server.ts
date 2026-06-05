import * as statsService from '$lib/server/services/stats.service';
import * as bountyService from '$lib/server/services/bounty.service';
import type { PageServerLoad } from './$types';

/**
 * Root home loader. Branches by auth state:
 *  - Logged in   → loads platform stats + first feed page (bounties & projects)
 *                  for the new authenticated home shell.
 *  - Logged out  → returns null `home` + lightweight `marketing` data (public
 *                  stats + a few live bounties) so the landing hero can show a
 *                  real product visual instead of a static mock.
 *
 * Personal-stats roll-up (credits, in-transit earnings, active bounties, etc.)
 * stays on the dedicated dashboard routes — keeping this load fast on first
 * paint matters more than mirroring the dashboard widgets here.
 */
export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		const [stats, bountyFeed] = await Promise.all([
			statsService.getPublicStats({ winnersLimit: 8 }),
			bountyService.listBounties({ type: 'BOUNTY', page: 1, pageSize: 3 })
		]);
		return { home: null, marketing: { stats, bounties: bountyFeed.items } };
	}

	const [stats, bountyFeed, projectFeed] = await Promise.all([
		statsService.getPublicStats({ winnersLimit: 14 }),
		bountyService.listBounties({ type: 'BOUNTY', page: 1, pageSize: 6 }),
		bountyService.listBounties({ type: 'PROJECT', page: 1, pageSize: 6 })
	]);

	return {
		home: {
			stats,
			bountyFeed,
			projectFeed
		}
	};
};
