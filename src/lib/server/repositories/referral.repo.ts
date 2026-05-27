import { randomBytes } from 'node:crypto';
import { prisma } from '../db';
import { Prisma } from '@prisma/client';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L
const CODE_LENGTH = 8;
const MAX_CODE_TRIES = 5;

export type ReferrerLookup = {
	userId: string;
	freelancerProfileId: string | null;
	emailVerified: boolean;
};

function makeCandidate(): string {
	const bytes = randomBytes(CODE_LENGTH);
	let out = '';
	for (let i = 0; i < CODE_LENGTH; i++) {
		out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
	}
	return out;
}

/**
 * Generate a referral code that doesn't collide with any existing user. Retries
 * on the (extremely rare) collision; throws after MAX_CODE_TRIES rather than
 * looping forever.
 */
export async function generateUniqueReferralCode(
	tx: Prisma.TransactionClient = prisma
): Promise<string> {
	for (let i = 0; i < MAX_CODE_TRIES; i++) {
		const candidate = makeCandidate();
		const hit = await tx.user.findUnique({
			where: { referralCode: candidate },
			select: { id: true }
		});
		if (!hit) return candidate;
	}
	throw new Error('Failed to generate a unique referral code after multiple attempts.');
}

export async function setUserReferralCode(
	userId: string,
	code: string,
	tx: Prisma.TransactionClient = prisma
): Promise<void> {
	await tx.user.update({ where: { id: userId }, data: { referralCode: code } });
}

export async function getUserReferralCode(
	userId: string,
	tx: Prisma.TransactionClient = prisma
): Promise<string | null> {
	const row = await tx.user.findUnique({ where: { id: userId }, select: { referralCode: true } });
	return row?.referralCode ?? null;
}

/**
 * Look up the *referrer* by their code. Returns enough state to enforce caps
 * and self-referral checks at signup time.
 */
export async function findReferrerByCode(
	code: string,
	tx: Prisma.TransactionClient = prisma
): Promise<ReferrerLookup | null> {
	const row = await tx.user.findUnique({
		where: { referralCode: code },
		select: {
			id: true,
			emailVerified: true,
			freelancerProfile: { select: { id: true } }
		}
	});
	if (!row) return null;
	return {
		userId: row.id,
		freelancerProfileId: row.freelancerProfile?.id ?? null,
		emailVerified: row.emailVerified
	};
}

export async function setReferrer(
	freelancerProfileId: string,
	referrerProfileId: string,
	tx: Prisma.TransactionClient
): Promise<void> {
	await tx.freelancerProfile.update({
		where: { id: freelancerProfileId },
		data: { referrerProfileId }
	});
}

/**
 * Count of successful referrals against a referrer's cap. Definition of
 * "successful" matches the anti-abuse rule: the referred user must have
 * verified their email. Pending/unverified accounts do not consume a slot.
 */
export async function countSuccessfulReferrals(
	referrerProfileId: string,
	tx: Prisma.TransactionClient = prisma
): Promise<number> {
	return tx.freelancerProfile.count({
		where: {
			referrerProfileId,
			user: { emailVerified: true }
		}
	});
}

/**
 * Has the referrer already received a credit for this referee's first
 * non-spam submission? Used as a fast precheck so we don't increment the
 * balance when the unique index would reject the insert anyway.
 */
export async function findFirstSubmissionGrant(
	referrerProfileId: string,
	referredProfileId: string,
	tx: Prisma.TransactionClient = prisma
): Promise<{ id: string; submissionId: string | null } | null> {
	return tx.creditTransaction.findFirst({
		where: {
			freelancerProfileId: referrerProfileId,
			referredProfileId,
			reason: 'REFERRAL_FIRST_SUBMISSION'
		},
		select: { id: true, submissionId: true }
	});
}

export type ReferralListItem = {
	freelancerProfileId: string;
	displayName: string;
	emailVerified: boolean;
	createdAt: Date;
	firstSubmissionAt: Date | null;
	winCount: number;
};

/**
 * For the dashboard list: who has this freelancer referred, and what state are
 * they in? Read-only — drives status chips.
 */
export async function listReferralsFor(
	referrerProfileId: string,
	tx: Prisma.TransactionClient = prisma
): Promise<ReferralListItem[]> {
	const rows = await tx.freelancerProfile.findMany({
		where: { referrerProfileId },
		select: {
			id: true,
			displayName: true,
			createdAt: true,
			user: { select: { emailVerified: true } },
			submissions: {
				select: { createdAt: true, isWinner: true, label: true },
				orderBy: { createdAt: 'asc' }
			}
		},
		orderBy: { createdAt: 'desc' },
		take: 50
	});

	return rows.map((r) => {
		const firstNonSpam = r.submissions.find((s) => s.label !== 'SPAM');
		const winCount = r.submissions.filter((s) => s.isWinner).length;
		return {
			freelancerProfileId: r.id,
			displayName: r.displayName,
			emailVerified: r.user.emailVerified,
			createdAt: r.createdAt,
			firstSubmissionAt: firstNonSpam?.createdAt ?? null,
			winCount
		};
	});
}
