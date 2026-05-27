import { CreditTxnReason, Prisma } from '@prisma/client';
import { prisma } from '../db';
import { AppError } from '../http';
import { requireRole, type AuthedUser } from '../auth-helpers';
import { getSetting } from '../settings';
import * as creditRepo from '../repositories/credit.repo';
import * as freelancerRepo from '../repositories/freelancer.repo';
import { freelancerCreditSystemValue } from '$lib/validators/credit';

type Config = { enabled: boolean; monthlyAllocation: number };

const DEFAULT_CONFIG: Config = { enabled: false, monthlyAllocation: 3 };

/**
 * Single source of truth for the credit-system feature flag.
 * Reads via the existing 60s-cached `getSetting()` helper.
 */
export async function getConfig(): Promise<Config> {
	const raw = await getSetting<unknown>('FREELANCER_CREDIT_SYSTEM');
	if (!raw) return DEFAULT_CONFIG;
	const parsed = freelancerCreditSystemValue.safeParse(raw);
	return parsed.success ? parsed.data : DEFAULT_CONFIG;
}

/**
 * "YYYY-MM" period key derived from the current date (UTC).
 */
export function currentPeriodKey(now: Date = new Date()): string {
	const y = now.getUTCFullYear();
	const m = String(now.getUTCMonth() + 1).padStart(2, '0');
	return `${y}-${m}`;
}

/**
 * Lazy monthly reset. Runs at the start of every credit read/write.
 * If the cached period on the profile doesn't match the current period, write
 * a `MONTHLY_RESET` ledger row and set the cached balance to `monthlyAllocation`.
 * Mid-month bonus credits are discarded — by design (see plan §2).
 *
 * Returns the (possibly reset) balance and the current period key.
 */
export async function ensureCurrentPeriod(
	freelancerProfileId: string,
	monthlyAllocation: number,
	tx: Prisma.TransactionClient
): Promise<{ balance: number; periodKey: string }> {
	const nowKey = currentPeriodKey();
	const profile = await creditRepo.getProfileBalance(freelancerProfileId, tx);
	if (!profile) {
		throw new AppError('NOT_FOUND', 'Freelancer profile not found.');
	}

	if (profile.creditsPeriodKey === nowKey) {
		return { balance: profile.creditsBalance, periodKey: nowKey };
	}

	const inserted = await creditRepo.insertTransaction(
		{
			freelancerProfileId,
			delta: monthlyAllocation,
			balanceAfter: monthlyAllocation,
			reason: CreditTxnReason.MONTHLY_RESET,
			periodKey: nowKey
		},
		tx
	);

	if (inserted === null) {
		// Another tx reset this period concurrently — re-read.
		const fresh = await creditRepo.getProfileBalance(freelancerProfileId, tx);
		return {
			balance: fresh?.creditsBalance ?? monthlyAllocation,
			periodKey: nowKey
		};
	}

	await creditRepo.updateProfileBalance(freelancerProfileId, monthlyAllocation, nowKey, tx);
	return { balance: monthlyAllocation, periodKey: nowKey };
}

/**
 * Freelancer's own balance for the dashboard / submission form.
 * Returns `null` when the feature is disabled.
 */
export async function getBalanceForCaller(
	caller: AuthedUser
): Promise<{ balance: number; monthlyAllocation: number; periodKey: string } | null> {
	const config = await getConfig();
	if (!config.enabled) return null;
	if (caller.role !== 'FREELANCER') return null;

	const freelancer = await freelancerRepo.findByUserId(caller.id);
	if (!freelancer) return null;

	const { balance, periodKey } = await prisma.$transaction((tx) =>
		ensureCurrentPeriod(freelancer.id, config.monthlyAllocation, tx)
	);
	return { balance, monthlyAllocation: config.monthlyAllocation, periodKey };
}

/**
 * Paginated credit history for the freelancer's own activity feed.
 */
export async function listTransactionsForCaller(
	caller: AuthedUser,
	opts: { limit?: number; cursor?: string } = {}
) {
	const config = await getConfig();
	if (!config.enabled) return [];
	if (caller.role !== 'FREELANCER') return [];

	const freelancer = await freelancerRepo.findByUserId(caller.id);
	if (!freelancer) return [];

	return creditRepo.listForFreelancer(freelancer.id, {
		limit: opts.limit ?? 20,
		cursor: opts.cursor
	});
}

/**
 * Admin view: balance + history for any freelancer.
 * Triggers the lazy monthly reset when the feature is enabled so the displayed
 * balance reflects the current period (otherwise the admin could see last
 * month's stale cache for a freelancer who hasn't been active this month).
 */
export async function getForAdmin(
	caller: AuthedUser,
	freelancerProfileId: string,
	opts: { limit?: number; cursor?: string } = {}
) {
	requireRole(caller, 'ADMIN');
	const config = await getConfig();

	const profileExists = await creditRepo.getProfileBalance(freelancerProfileId);
	if (!profileExists) {
		throw new AppError('NOT_FOUND', 'Freelancer profile not found.');
	}

	let balance = profileExists.creditsBalance;
	let periodKey = profileExists.creditsPeriodKey;
	if (config.enabled) {
		const ensured = await prisma.$transaction((tx) =>
			ensureCurrentPeriod(freelancerProfileId, config.monthlyAllocation, tx)
		);
		balance = ensured.balance;
		periodKey = ensured.periodKey;
	}

	const transactions = await creditRepo.listForAdmin(freelancerProfileId, {
		limit: opts.limit ?? 50,
		cursor: opts.cursor
	});

	return {
		enabled: config.enabled,
		monthlyAllocation: config.monthlyAllocation,
		balance,
		periodKey,
		transactions
	};
}

/**
 * SPEND — called from submission.service.create inside its transaction.
 * Throws CONFLICT when the freelancer has no credits remaining this month.
 * Returns the new balance.
 */
export async function spendForSubmission(
	freelancerProfileId: string,
	submissionId: string,
	tx: Prisma.TransactionClient
): Promise<number> {
	const config = await getConfig();
	if (!config.enabled) return 0;

	const { balance, periodKey } = await ensureCurrentPeriod(
		freelancerProfileId,
		config.monthlyAllocation,
		tx
	);

	if (balance < 1) {
		throw new AppError(
			'CONFLICT',
			'You have no credits remaining this month. Credits reset on the 1st.'
		);
	}

	const newBalance = balance - 1;
	const inserted = await creditRepo.insertTransaction(
		{
			freelancerProfileId,
			delta: -1,
			balanceAfter: newBalance,
			reason: CreditTxnReason.SUBMISSION_SPEND,
			periodKey,
			submissionId
		},
		tx
	);

	if (inserted === null) {
		// Already charged for this submission (idempotent retry). Don't double-spend.
		const fresh = await creditRepo.getProfileBalance(freelancerProfileId, tx);
		return fresh?.creditsBalance ?? balance;
	}

	await creditRepo.updateProfileBalance(freelancerProfileId, newBalance, periodKey, tx);
	return newBalance;
}

/**
 * WIN BONUS — called from winner.service.announceWinners inside its transaction.
 * Idempotent via the partial-unique index on (submissionId WHERE reason=WIN_BONUS).
 */
export async function grantWinBonus(
	freelancerProfileId: string,
	submissionId: string,
	bountyId: string,
	tx: Prisma.TransactionClient
): Promise<void> {
	const config = await getConfig();
	if (!config.enabled) return;

	const { balance, periodKey } = await ensureCurrentPeriod(
		freelancerProfileId,
		config.monthlyAllocation,
		tx
	);

	const newBalance = balance + 1;
	const inserted = await creditRepo.insertTransaction(
		{
			freelancerProfileId,
			delta: 1,
			balanceAfter: newBalance,
			reason: CreditTxnReason.WIN_BONUS,
			periodKey,
			submissionId,
			bountyId
		},
		tx
	);

	if (inserted === null) return; // already granted for this submission

	await creditRepo.updateProfileBalance(freelancerProfileId, newBalance, periodKey, tx);
}

/**
 * SPAM PENALTY — called from submission.service.setLabel on UNSPAM→SPAM transition.
 * Floors at 0: if balance is already 0, still inserts an audit row with delta=0
 * (preserves the "spam happened" record and the unique-index idempotency lock).
 */
export async function penalizeSpam(
	freelancerProfileId: string,
	submissionId: string,
	tx: Prisma.TransactionClient
): Promise<void> {
	const config = await getConfig();
	if (!config.enabled) return;

	const { balance, periodKey } = await ensureCurrentPeriod(
		freelancerProfileId,
		config.monthlyAllocation,
		tx
	);

	const delta = balance > 0 ? -1 : 0;
	const newBalance = balance + delta;

	const inserted = await creditRepo.insertTransaction(
		{
			freelancerProfileId,
			delta,
			balanceAfter: newBalance,
			reason: CreditTxnReason.SPAM_PENALTY,
			periodKey,
			submissionId
		},
		tx
	);

	if (inserted === null) return; // already penalized for this submission

	if (delta !== 0) {
		await creditRepo.updateProfileBalance(freelancerProfileId, newBalance, periodKey, tx);
	}
}

/**
 * ADMIN ADJUST — manual grant/revoke with audit notes.
 * Floors at 0 for revokes.
 */
export async function adminAdjust(
	caller: AuthedUser,
	freelancerProfileId: string,
	delta: number,
	notes: string
): Promise<{ balance: number }> {
	requireRole(caller, 'ADMIN');
	if (!Number.isInteger(delta) || delta === 0) {
		throw new AppError('BAD_REQUEST', 'delta must be a non-zero integer.');
	}

	const trimmedNotes = notes.trim();
	if (!trimmedNotes) {
		throw new AppError('BAD_REQUEST', 'A reason is required.');
	}

	const config = await getConfig();

	return prisma.$transaction(async (tx) => {
		// When the feature is enabled, lazily roll over to the current period
		// before applying the admin delta. When disabled, adjust the cached
		// balance directly — don't synthesize a monthly reset using the
		// default allocation.
		let balance: number;
		let periodKey: string;
		if (config.enabled) {
			const ensured = await ensureCurrentPeriod(freelancerProfileId, config.monthlyAllocation, tx);
			balance = ensured.balance;
			periodKey = ensured.periodKey;
		} else {
			const profile = await creditRepo.getProfileBalance(freelancerProfileId, tx);
			if (!profile) {
				throw new AppError('NOT_FOUND', 'Freelancer profile not found.');
			}
			balance = profile.creditsBalance;
			periodKey = profile.creditsPeriodKey ?? currentPeriodKey();
		}

		let effectiveDelta = delta;
		if (delta < 0 && balance + delta < 0) {
			effectiveDelta = -balance;
		}
		const newBalance = balance + effectiveDelta;

		await creditRepo.insertTransaction(
			{
				freelancerProfileId,
				delta: effectiveDelta,
				balanceAfter: newBalance,
				reason: delta > 0 ? CreditTxnReason.ADMIN_GRANT : CreditTxnReason.ADMIN_REVOKE,
				periodKey,
				adminUserId: caller.id,
				notes: trimmedNotes
			},
			tx
		);

		if (effectiveDelta !== 0) {
			await creditRepo.updateProfileBalance(freelancerProfileId, newBalance, periodKey, tx);
		}

		return { balance: newBalance };
	});
}
