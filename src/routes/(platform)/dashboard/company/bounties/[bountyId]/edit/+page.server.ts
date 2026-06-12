import { error, redirect } from '@sveltejs/kit';
import { requireAuth, requireRole } from '$lib/server/auth-helpers';
import { AppError } from '$lib/server/http';
import * as bountyService from '$lib/server/services/bounty.service';
import * as skillService from '$lib/server/services/skill.service';
import type { PageServerLoad } from './$types';

/**
 * Render a stored instant as a `datetime-local` value (`YYYY-MM-DDTHH:mm`).
 * Sierra Leone is UTC+0 year-round (no DST), so formatting in UTC matches the
 * wall-clock the create wizard captured and round-trips on save.
 */
function toLocalInput(date: Date | string | null | undefined): string {
	if (!date) return '';
	return new Date(date).toISOString().slice(0, 16);
}

export const load: PageServerLoad = async ({ params, locals, parent }) => {
	await parent();
	const caller = requireAuth(locals);
	requireRole(caller, 'COMPANY', 'ADMIN');

	let bounty;
	try {
		bounty = await bountyService.getBounty(caller, params.bountyId);
	} catch (e) {
		if (e instanceof AppError) throw error(e.httpStatus, e.message);
		throw e;
	}

	// Editing is allowed only while the bounty is still a draft (nothing public,
	// no submissions, escrow unfunded) — matches the service-layer gate.
	if (bounty.status !== 'DRAFT') {
		throw redirect(303, '/dashboard/company/bounties');
	}

	const categories = await skillService.listSkills();

	return {
		bounty,
		categories,
		initial: {
			title: bounty.title,
			description: bounty.description,
			requirements: bounty.requirements ?? '',
			deliverables: bounty.deliverables ?? '',
			skills: bounty.skills.map((s) => ({ skillId: s.skill.id, isRequired: s.isRequired })),
			compensationType: bounty.compensationType,
			currency: bounty.currency,
			totalPrizePool: bounty.totalPrizePool,
			minRewardAsk: (bounty.minRewardAsk ?? '') as number | '',
			maxRewardAsk: (bounty.maxRewardAsk ?? '') as number | '',
			numberOfWinners: bounty.numberOfWinners,
			maxBonusSpots: bounty.maxBonusSpots,
			prizeTiers: bounty.prizeTiers.map((t) => ({
				position: t.position,
				amount: t.amount,
				label: t.label ?? undefined
			})),
			eligibility: (bounty.eligibility ?? []) as { question: string; optional: boolean }[],
			timeToComplete: bounty.timeToComplete ?? '',
			submissionDeadline: toLocalInput(bounty.submissionDeadline),
			judgingDeadline: toLocalInput(bounty.judgingDeadline),
			targetProvinces: bounty.targetProvinces,
			// Never prefilled — the stored PIN hash is never read back.
			accessPin: ''
		}
	};
};
