/**
 * stats.service.ts
 *
 * Public-facing platform stats for the authenticated home and (eventually) the
 * marketing site. Centralises masking and shaping so callers can drop the
 * result straight into the UI.
 *
 * Reads only — no caller arg required. Cache headers are set by the route
 * handler, not here.
 */

import { maskDisplayName } from '$lib/utils';
import * as statsRepo from '../repositories/stats.repo';

export type WinnerEvent = {
	id: string;
	maskedName: string;
	amountMinor: number;
	currency: string;
	bountyTitle: string;
	bountySlug: string | null;
	bountyType: 'BOUNTY' | 'PROJECT' | null;
	settledAt: string; // ISO
};

export type PublicStats = {
	liveBounties: number;
	liveProjects: number;
	liveBountyValueMinor: number;
	totalPaidMinor: number;
	currency: string;
	winnersToday: number;
	winners: WinnerEvent[];
};

export async function getPublicStats(opts: { winnersLimit?: number } = {}): Promise<PublicStats> {
	const limit = opts.winnersLimit ?? 20;
	const [liveBounties, liveProjects, liveBountyValue, totals, winnersToday, rawWinners] =
		await Promise.all([
			statsRepo.countLiveBounties('BOUNTY'),
			statsRepo.countLiveBounties('PROJECT'),
			statsRepo.sumLiveBountyValue('BOUNTY'),
			statsRepo.sumTotalPayouts(),
			statsRepo.countWinnersToday(),
			statsRepo.recentWinners(limit)
		]);

	const winners: WinnerEvent[] = rawWinners
		.filter((w) => w.bountyTitle != null) // skip orphaned rows whose bounty is gone
		.map((w) => ({
			id: w.paymentId,
			maskedName: maskDisplayName(w.displayName),
			amountMinor: w.amount,
			currency: w.currency,
			bountyTitle: w.bountyTitle ?? '',
			bountySlug: w.bountySlug,
			bountyType: w.bountyType,
			settledAt: w.settledAt.toISOString()
		}));

	return {
		liveBounties,
		liveProjects,
		liveBountyValueMinor: liveBountyValue.amount,
		totalPaidMinor: totals.amount,
		currency: totals.currency,
		winnersToday,
		winners
	};
}

export type OpenBountyPot = { valueMinor: number; count: number; currency: string };

/**
 * The bounty prize money currently up for grabs, platform-wide, with the count
 * of live bounties it spans. Feeds the /bounties header stat.
 */
export async function getOpenBountyPot(): Promise<OpenBountyPot> {
	const [value, count] = await Promise.all([
		statsRepo.sumLiveBountyValue('BOUNTY'),
		statsRepo.countLiveBounties('BOUNTY')
	]);
	return { valueMinor: value.amount, count, currency: value.currency };
}
