import { CreditTxnReason, Prisma } from '@prisma/client';
import { prisma } from '../db';
import { requireRole, type AuthedUser } from '../auth-helpers';
import { getSetting } from '../settings';
import * as creditRepo from '../repositories/credit.repo';
import * as creditService from './credit.service';
import * as freelancerRepo from '../repositories/freelancer.repo';
import * as referralRepo from '../repositories/referral.repo';
import { freelancerReferralSystemValue, referralCodeSchema } from '$lib/validators/referral';

type Config = {
	enabled: boolean;
	maxReferrals: number;
	creditsPerFirstSubmission: number;
	creditsPerWin: number;
};

const DEFAULT_CONFIG: Config = {
	enabled: false,
	maxReferrals: 10,
	creditsPerFirstSubmission: 1,
	creditsPerWin: 2
};

export async function getConfig(): Promise<Config> {
	const raw = await getSetting<unknown>('FREELANCER_REFERRAL_SYSTEM');
	if (!raw) return DEFAULT_CONFIG;
	const parsed = freelancerReferralSystemValue.safeParse(raw);
	return parsed.success ? parsed.data : DEFAULT_CONFIG;
}

function appUrl(): string {
	return process.env.PUBLIC_APP_URL?.trim() || 'http://localhost:5173';
}

function buildShareLink(code: string): string {
	return `${appUrl()}/register?ref=${code}`;
}

async function ensureReferralCode(userId: string): Promise<string> {
	const existing = await referralRepo.getUserReferralCode(userId);
	if (existing) return existing;
	return prisma.$transaction(async (tx) => {
		const fresh = await referralRepo.getUserReferralCode(userId, tx);
		if (fresh) return fresh;
		const code = await referralRepo.generateUniqueReferralCode(tx);
		await referralRepo.setUserReferralCode(userId, code, tx);
		return code;
	});
}

export type ReferralStatus = {
	enabled: boolean;
	code: string;
	link: string;
	cap: number;
	used: number;
	remaining: number;
	creditsPerFirstSubmission: number;
	creditsPerWin: number;
	referrals: Array<{
		id: string;
		displayName: string;
		emailVerified: boolean;
		hasSubmitted: boolean;
		winCount: number;
		joinedAt: Date;
	}>;
};

export async function getMyReferralStatus(caller: AuthedUser): Promise<ReferralStatus | null> {
	requireRole(caller, 'FREELANCER');
	const config = await getConfig();

	const freelancer = await freelancerRepo.findByUserId(caller.id);
	if (!freelancer) return null;

	const code = await ensureReferralCode(caller.id);

	if (!config.enabled) {
		return {
			enabled: false,
			code,
			link: buildShareLink(code),
			cap: config.maxReferrals,
			used: 0,
			remaining: config.maxReferrals,
			creditsPerFirstSubmission: config.creditsPerFirstSubmission,
			creditsPerWin: config.creditsPerWin,
			referrals: []
		};
	}

	const used = await referralRepo.countSuccessfulReferrals(freelancer.id);
	const list = await referralRepo.listReferralsFor(freelancer.id);

	return {
		enabled: true,
		code,
		link: buildShareLink(code),
		cap: config.maxReferrals,
		used,
		remaining: Math.max(0, config.maxReferrals - used),
		creditsPerFirstSubmission: config.creditsPerFirstSubmission,
		creditsPerWin: config.creditsPerWin,
		referrals: list.map((r) => ({
			id: r.freelancerProfileId,
			displayName: r.displayName,
			emailVerified: r.emailVerified,
			hasSubmitted: r.firstSubmissionAt !== null,
			winCount: r.winCount,
			joinedAt: r.createdAt
		}))
	};
}

/**
 * Called from the freelancer signup completion path. Best-effort: a malformed,
 * unknown, capped, or duplicate code does NOT block the signup — we just don't
 * attach a referrer. The user can still join Learn2Earn; they simply won't credit anyone.
 */
export async function applyReferralCodeAtSignup(
	refereeUserId: string,
	refereeProfileId: string,
	refereeEmail: string,
	refereePhone: string | null,
	rawCode: string | null
): Promise<{ referrerProfileId: string } | null> {
	if (!rawCode) return null;
	const config = await getConfig();
	if (!config.enabled) return null;

	const parsed = referralCodeSchema.safeParse(rawCode);
	if (!parsed.success) return null;
	const code = parsed.data;

	const referrer = await referralRepo.findReferrerByCode(code);
	if (!referrer || !referrer.freelancerProfileId) return null;
	if (referrer.userId === refereeUserId) return null; // self-referral

	if (refereePhone) {
		const phoneDupe = await prisma.freelancerProfile.findFirst({
			where: {
				NOT: { id: refereeProfileId },
				referrerProfileId: { not: null },
				user: { phoneNumber: refereePhone }
			},
			select: { id: true }
		});
		if (phoneDupe) return null;
	}
	const emailDupe = await prisma.freelancerProfile.findFirst({
		where: {
			NOT: { id: refereeProfileId },
			referrerProfileId: { not: null },
			user: { email: refereeEmail }
		},
		select: { id: true }
	});
	if (emailDupe) return null;

	const used = await referralRepo.countSuccessfulReferrals(referrer.freelancerProfileId);
	if (used >= config.maxReferrals) return null;

	await prisma.$transaction((tx) =>
		referralRepo.setReferrer(refereeProfileId, referrer.freelancerProfileId!, tx)
	);
	return { referrerProfileId: referrer.freelancerProfileId };
}

/**
 * Insert a referral ledger row + update the referrer's balance. Centralises the
 * "ensure period → insert → stamp referredProfileId → update cached balance"
 * dance so the three trigger hooks below stay readable.
 */
async function applyReferralTxn(
	tx: Prisma.TransactionClient,
	args: {
		referrerProfileId: string;
		referredProfileId: string;
		reason: CreditTxnReason;
		delta: number;
		floor0?: boolean;
		submissionId?: string;
		bountyId?: string;
		notes: string;
	}
): Promise<void> {
	const creditConfig = await creditService.getConfig();
	if (!creditConfig.enabled) return;

	const { balance, periodKey } = await creditService.ensureCurrentPeriod(
		args.referrerProfileId,
		creditConfig.monthlyAllocation,
		tx
	);

	let effectiveDelta = args.delta;
	if (args.floor0 && balance + args.delta < 0) {
		effectiveDelta = -balance;
	}
	const newBalance = balance + effectiveDelta;

	const inserted = await creditRepo.insertTransaction(
		{
			freelancerProfileId: args.referrerProfileId,
			delta: effectiveDelta,
			balanceAfter: newBalance,
			reason: args.reason,
			periodKey,
			submissionId: args.submissionId ?? null,
			bountyId: args.bountyId ?? null,
			notes: args.notes
		},
		tx
	);

	if (inserted === null) return; // partial-unique idempotency hit

	await tx.creditTransaction.update({
		where: { id: inserted.id },
		data: { referredProfileId: args.referredProfileId }
	});

	if (effectiveDelta !== 0) {
		await creditRepo.updateProfileBalance(args.referrerProfileId, newBalance, periodKey, tx);
	}
}

/**
 * First non-spam submission by a referred freelancer → credit the referrer.
 * Called inside submission.service.create's transaction. Idempotent.
 */
export async function onFirstNonSpamSubmission(
	refereeProfileId: string,
	submissionId: string,
	tx: Prisma.TransactionClient
): Promise<void> {
	const config = await getConfig();
	if (!config.enabled || config.creditsPerFirstSubmission <= 0) return;

	const referee = await tx.freelancerProfile.findUnique({
		where: { id: refereeProfileId },
		select: { referrerProfileId: true, user: { select: { emailVerified: true } } }
	});
	if (!referee?.referrerProfileId) return;
	// Anti-abuse: hold credit until referee has verified email.
	if (!referee.user.emailVerified) return;

	await applyReferralTxn(tx, {
		referrerProfileId: referee.referrerProfileId,
		referredProfileId: refereeProfileId,
		reason: CreditTxnReason.REFERRAL_FIRST_SUBMISSION,
		delta: config.creditsPerFirstSubmission,
		submissionId,
		notes: 'Referral — first non-spam submission.'
	});
}

/**
 * Submission later labelled SPAM → reverse the first-submission grant, but only
 * if that specific submission was the one that earned it. Floors at 0 to match
 * `penalizeSpam`. Called inside submission.service.setLabel.
 */
export async function onSubmissionLabelledSpam(
	refereeProfileId: string,
	submissionId: string,
	tx: Prisma.TransactionClient
): Promise<void> {
	const config = await getConfig();
	if (!config.enabled) return;

	const referee = await tx.freelancerProfile.findUnique({
		where: { id: refereeProfileId },
		select: { referrerProfileId: true }
	});
	if (!referee?.referrerProfileId) return;

	const grant = await referralRepo.findFirstSubmissionGrant(
		referee.referrerProfileId,
		refereeProfileId,
		tx
	);
	if (!grant || grant.submissionId !== submissionId) return;

	await applyReferralTxn(tx, {
		referrerProfileId: referee.referrerProfileId,
		referredProfileId: refereeProfileId,
		reason: CreditTxnReason.REFERRAL_REVERSAL,
		delta: -config.creditsPerFirstSubmission,
		floor0: true,
		submissionId,
		notes: 'Referral — submission marked SPAM, reversing earlier grant.'
	});
}

/**
 * Per-win bonus to the referrer when their referred freelancer wins. Called
 * inside winner.service.announceWinners's transaction.
 */
export async function onReferredWin(
	winnerProfileId: string,
	submissionId: string,
	bountyId: string,
	tx: Prisma.TransactionClient
): Promise<void> {
	const config = await getConfig();
	if (!config.enabled || config.creditsPerWin <= 0) return;

	const winner = await tx.freelancerProfile.findUnique({
		where: { id: winnerProfileId },
		select: { referrerProfileId: true }
	});
	if (!winner?.referrerProfileId) return;

	await applyReferralTxn(tx, {
		referrerProfileId: winner.referrerProfileId,
		referredProfileId: winnerProfileId,
		reason: CreditTxnReason.REFERRAL_WIN_BONUS,
		delta: config.creditsPerWin,
		submissionId,
		bountyId,
		notes: 'Referral — referred freelancer won a bounty.'
	});
}
