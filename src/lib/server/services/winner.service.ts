import { BountyStatus, BountyType, PaymentStatus, PaymentType } from '@prisma/client';
import { prisma } from '../db';
import { AppError } from '../http';
import { requireRole, type AuthedUser } from '../auth-helpers';
import { monime } from '../monime/client';
import * as bountyRepo from '../repositories/bounty.repo';
import * as companyRepo from '../repositories/company.repo';
import * as submissionRepo from '../repositories/submission.repo';
import * as paymentRepo from '../repositories/payment.repo';
import * as notification from './notification.service';

function appUrl(): string {
	return process.env.PUBLIC_APP_URL?.trim() || 'http://localhost:5173';
}

async function loadOwnedBounty(caller: AuthedUser, bountyId: string) {
	const bounty = await bountyRepo.findBountyById(bountyId);
	if (!bounty) throw new AppError('NOT_FOUND', 'Bounty not found.');
	if (caller.role !== 'ADMIN') {
		const profile = await companyRepo.findByUserId(caller.id);
		if (!profile || profile.id !== bounty.companyProfileId) {
			throw new AppError('FORBIDDEN', 'You do not own this bounty.');
		}
	}
	return bounty;
}

/**
 * Move an ACTIVE bounty to JUDGING. Manual for now — Phase 9+ adds a cron
 * that does this once submissionDeadline passes.
 */
export async function transitionToJudging(caller: AuthedUser, bountyId: string) {
	requireRole(caller, 'COMPANY', 'ADMIN');
	const bounty = await loadOwnedBounty(caller, bountyId);
	if (bounty.status !== BountyStatus.ACTIVE) {
		throw new AppError('CONFLICT', 'Only ACTIVE bounties can transition to JUDGING.');
	}
	await bountyRepo.updateBountyStatus(bountyId, BountyStatus.JUDGING);
	const fresh = await bountyRepo.findBountyById(bountyId);
	if (!fresh) throw new AppError('INTERNAL', 'Failed to reload bounty.');
	return fresh;
}

async function withRetry<T>(fn: () => Promise<T>, max = 3): Promise<T> {
	let lastErr: unknown;
	for (let i = 0; i < max; i++) {
		try {
			return await fn();
		} catch (e) {
			lastErr = e;
			if (i < max - 1) {
				await new Promise((r) => setTimeout(r, 100 * 2 ** i));
			}
		}
	}
	throw lastErr;
}

export async function announceWinners(caller: AuthedUser, bountyId: string) {
	requireRole(caller, 'COMPANY', 'ADMIN');
	const bounty = await loadOwnedBounty(caller, bountyId);

	if (bounty.status !== BountyStatus.JUDGING) {
		throw new AppError('CONFLICT', 'Only JUDGING bounties can have winners announced.');
	}
	if (bounty.isWinnersAnnounced) {
		throw new AppError('CONFLICT', 'Winners have already been announced.');
	}
	if (!bounty.escrowFinancialAccountId) {
		throw new AppError('INTERNAL', 'Bounty is missing its escrow account.');
	}

	const winners = await submissionRepo.listWinners(bountyId);
	if (winners.length === 0) {
		throw new AppError('BAD_REQUEST', 'Mark at least one winner before announcing.');
	}

	// Validation — per winner.
	for (const w of winners) {
		if (!w.freelancer.momoNumber) {
			throw new AppError(
				'CONFLICT',
				`${w.freelancer.displayName} has no MoMo number set — cannot pay out.`
			);
		}
		if (w.prizeAmount == null || w.prizeAmount <= 0) {
			throw new AppError('CONFLICT', `${w.freelancer.displayName} has no prize amount set.`);
		}
		if (w.winnerPosition == null) {
			throw new AppError('CONFLICT', `${w.freelancer.displayName} has no position set.`);
		}
	}

	// Validation — set-wide.
	const positions = winners.map((w) => w.winnerPosition!);
	if (
		new Set(positions.filter((p) => p !== 99)).size !== positions.filter((p) => p !== 99).length
	) {
		throw new AppError('CONFLICT', 'Winner positions must be unique.');
	}
	const bonusCount = positions.filter((p) => p === 99).length;
	if (bonusCount > bounty.maxBonusSpots) {
		throw new AppError(
			'CONFLICT',
			`Bonus winners (${bonusCount}) exceed maxBonusSpots (${bounty.maxBonusSpots}).`
		);
	}
	if (bounty.type === BountyType.PROJECT) {
		if (winners.length !== 1 || winners[0].winnerPosition !== 1) {
			throw new AppError('CONFLICT', 'Projects require exactly one winner at position 1.');
		}
	}

	const totalPayouts = winners.reduce((s, w) => s + (w.prizeAmount ?? 0), 0);
	if (totalPayouts > bounty.escrowFundedAmount) {
		throw new AppError(
			'CONFLICT',
			`Total payouts (${totalPayouts}) exceed escrow balance (${bounty.escrowFundedAmount}).`
		);
	}

	// Initiate Monime payouts — outside the DB transaction so a slow/flaky
	// external call doesn't hold a write lock open.
	const payoutResults: Array<{
		submissionId: string;
		monimePayoutId: string;
		amount: number;
		toEntity: string;
	}> = [];

	for (const w of winners) {
		const payout = await withRetry(() =>
			monime.payouts.create({
				sourceAccountId: bounty.escrowFinancialAccountId!,
				destination: { type: 'MOMO', phoneNumber: w.freelancer.momoNumber! },
				amount: w.prizeAmount!,
				currency: bounty.currency,
				reference: `prize:${w.id}`
			})
		);
		payoutResults.push({
			submissionId: w.id,
			monimePayoutId: payout.id,
			amount: w.prizeAmount!,
			toEntity: w.freelancer.momoNumber!
		});
	}

	// Persist Payment rows + flip bounty in one tx.
	await prisma.$transaction(async (tx) => {
		for (const p of payoutResults) {
			await paymentRepo.createPayout(
				{
					bountyId: bounty.id,
					submissionId: p.submissionId,
					type: PaymentType.PRIZE_PAYOUT,
					amount: p.amount,
					currency: bounty.currency,
					monimePayoutId: p.monimePayoutId,
					toEntity: p.toEntity,
					status: PaymentStatus.PROCESSING
				},
				tx
			);
			if (bounty.type === BountyType.PROJECT) {
				await submissionRepo.appendPaymentDetails(
					p.submissionId,
					{ monimePayoutId: p.monimePayoutId, amount: p.amount, tranche: 1 },
					tx
				);
			}
		}
		await bountyRepo.markCompletedAndAnnounced(bounty.id, tx);
	});

	// Fan out notifications. Each `dispatch` is wrapped in its own try/catch
	// (notification.service is advisory) so a single email failure cannot
	// break the others. Awaited so the response only returns after fan-out
	// kicks off.
	const allSubmitters = await submissionRepo.listSubmittersForBounty(bountyId);
	const winnerById = new Map(winners.map((w) => [w.id, w]));
	const bountyUrl = `${appUrl()}/bounties/${bounty.slug}`;

	await Promise.all(
		allSubmitters.map((s) => {
			const w = winnerById.get(s.id);
			const isWinner = !!w;
			const freelancerName = s.freelancer.displayName;
			return notification.dispatch(s.freelancer.user.id, 'WINNERS_ANNOUNCED', {
				title: isWinner ? 'You won!' : 'Winners announced',
				message: isWinner
					? `You won "${bounty.title}" — payout initiated.`
					: `Winners were announced for "${bounty.title}".`,
				link: bountyUrl,
				email: {
					bountyTitle: bounty.title,
					bountyUrl,
					freelancerName,
					isWinner,
					position: w?.winnerPosition ?? null,
					amount: w?.prizeAmount ?? null,
					currency: bounty.currency
				}
			});
		})
	);

	const fresh = await bountyRepo.findBountyById(bountyId);
	if (!fresh) throw new AppError('INTERNAL', 'Failed to reload bounty.');
	return { bounty: fresh, payouts: payoutResults };
}

export async function payProjectTranche(
	caller: AuthedUser,
	submissionId: string,
	amount: number,
	final: boolean
) {
	requireRole(caller, 'COMPANY', 'ADMIN');
	if (amount <= 0) {
		throw new AppError('BAD_REQUEST', 'Tranche amount must be positive.');
	}

	const submission = await submissionRepo.findByIdForSponsor(submissionId);
	if (!submission) throw new AppError('NOT_FOUND', 'Submission not found.');
	const bounty = await loadOwnedBounty(caller, submission.bountyId);

	if (bounty.type !== BountyType.PROJECT) {
		throw new AppError('CONFLICT', 'Tranche payouts are only valid for PROJECTs.');
	}
	if (!submission.isWinner || submission.winnerPosition !== 1) {
		throw new AppError('CONFLICT', 'Submission is not the project winner.');
	}
	if (!bounty.isWinnersAnnounced) {
		throw new AppError('CONFLICT', 'Cannot pay tranches before winners are announced.');
	}
	if (!bounty.escrowFinancialAccountId) {
		throw new AppError('INTERNAL', 'Bounty is missing its escrow account.');
	}
	if (!submission.freelancer.momoNumber) {
		throw new AppError('CONFLICT', 'Winner has no MoMo number set.');
	}
	if (submission.isPaid) {
		throw new AppError('CONFLICT', 'All tranches have already been paid.');
	}

	// Prior tranche must be terminal (COMPLETED) before we initiate the next one —
	// avoids cascading failures on a stuck payout.
	const prior = await paymentRepo.listForSubmission(submissionId);
	const lastPrize = prior.filter((p) => p.type === PaymentType.PRIZE_PAYOUT).pop();
	if (lastPrize && lastPrize.status !== PaymentStatus.COMPLETED) {
		throw new AppError(
			'CONFLICT',
			'Wait for the previous tranche to settle before paying the next one.'
		);
	}

	// Sum of all prior tranches + this one must not exceed the prize pool.
	const completedSoFar = prior
		.filter(
			(p) =>
				p.type === PaymentType.PRIZE_PAYOUT &&
				(p.status === PaymentStatus.COMPLETED || p.status === PaymentStatus.PROCESSING)
		)
		.reduce((s, p) => s + p.amount, 0);
	if (completedSoFar + amount > bounty.totalPrizePool) {
		throw new AppError(
			'CONFLICT',
			`Total tranches would exceed prize pool (${bounty.totalPrizePool}).`
		);
	}

	const nextTrancheNumber =
		(lastPrize ? prior.filter((p) => p.type === PaymentType.PRIZE_PAYOUT).length : 0) + 1;

	const payout = await withRetry(() =>
		monime.payouts.create({
			sourceAccountId: bounty.escrowFinancialAccountId!,
			destination: { type: 'MOMO', phoneNumber: submission.freelancer.momoNumber! },
			amount,
			currency: bounty.currency,
			reference: `tranche:${submission.id}:${nextTrancheNumber}`
		})
	);

	await prisma.$transaction(async (tx) => {
		await paymentRepo.createPayout(
			{
				bountyId: bounty.id,
				submissionId: submission.id,
				type: PaymentType.PRIZE_PAYOUT,
				amount,
				currency: bounty.currency,
				monimePayoutId: payout.id,
				toEntity: submission.freelancer.momoNumber!,
				status: PaymentStatus.PROCESSING
			},
			tx
		);
		await submissionRepo.appendPaymentDetails(
			submission.id,
			{ monimePayoutId: payout.id, amount, tranche: nextTrancheNumber, final },
			tx
		);
	});

	return {
		monimePayoutId: payout.id,
		tranche: nextTrancheNumber,
		amount
	};
}
