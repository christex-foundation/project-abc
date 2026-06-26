import { prisma } from '../db';
import { Prisma, SubmissionLabel, SubmissionStatus, type Submission } from '@prisma/client';

/**
 * `selectForFreelancer` deliberately excludes sponsor-private fields
 * (`label`, `notes`, `score`). This is the trust boundary that keeps
 * sponsor triage hidden from submitters — plan §6.3 / CLAUDE.md.
 */
export const selectForFreelancer = {
	id: true,
	bountyId: true,
	freelancerProfileId: true,
	link: true,
	tweet: true,
	otherInfo: true,
	eligibilityAnswers: true,
	ask: true,
	status: true,
	isWinner: true,
	winnerPosition: true,
	prizeAmount: true,
	isPaid: true,
	paymentDetails: true,
	feedback: true,
	createdAt: true,
	updatedAt: true,
	bounty: {
		select: {
			id: true,
			slug: true,
			title: true,
			type: true,
			currency: true,
			isWinnersAnnounced: true,
			winnersAnnouncedAt: true
		}
	}
} satisfies Prisma.SubmissionSelect;

export const selectForSponsor = {
	...selectForFreelancer,
	label: true,
	notes: true,
	score: true,
	isActive: true,
	freelancerNameSnapshot: true,
	freelancer: {
		select: {
			id: true,
			displayName: true,
			headline: true,
			portfolio: true,
			whatsappNumber: true,
			bankDetails: true,
			monimeFinancialAccountId: true,
			monimeUvan: true,
			user: { select: { id: true, email: true, name: true } }
		}
	}
} satisfies Prisma.SubmissionSelect;

export type SubmissionForFreelancer = Prisma.SubmissionGetPayload<{
	select: typeof selectForFreelancer;
}>;
export type SubmissionForSponsor = Prisma.SubmissionGetPayload<{
	select: typeof selectForSponsor;
}>;

export async function findByIdForFreelancer(id: string): Promise<SubmissionForFreelancer | null> {
	return prisma.submission.findUnique({ where: { id }, select: selectForFreelancer });
}

export async function findByIdForSponsor(id: string): Promise<SubmissionForSponsor | null> {
	return prisma.submission.findUnique({ where: { id }, select: selectForSponsor });
}

export async function findByBountyAndFreelancer(
	bountyId: string,
	freelancerProfileId: string
): Promise<Pick<Submission, 'id'> | null> {
	return prisma.submission.findFirst({
		where: { bountyId, freelancerProfileId },
		select: { id: true }
	});
}

type CreateInput = {
	bountyId: string;
	freelancerProfileId: string;
	link: string;
	tweet?: string | null;
	otherInfo?: string | null;
	ask?: number | null;
	eligibilityAnswers?: Prisma.InputJsonValue | null;
};

export async function create(
	input: CreateInput,
	tx: Prisma.TransactionClient = prisma
): Promise<SubmissionForSponsor> {
	return tx.submission.create({
		data: {
			bountyId: input.bountyId,
			freelancerProfileId: input.freelancerProfileId,
			link: input.link,
			tweet: input.tweet ?? null,
			otherInfo: input.otherInfo ?? null,
			ask: input.ask ?? null,
			eligibilityAnswers:
				input.eligibilityAnswers === undefined || input.eligibilityAnswers === null
					? Prisma.JsonNull
					: input.eligibilityAnswers,
			status: SubmissionStatus.PENDING,
			label: SubmissionLabel.UNREVIEWED
		},
		select: selectForSponsor
	});
}

export async function listForBountySponsor(
	bountyId: string,
	opts: { label?: SubmissionLabel; activeOnly?: boolean } = {}
): Promise<SubmissionForSponsor[]> {
	return prisma.submission.findMany({
		where: {
			bountyId,
			...(opts.label && { label: opts.label }),
			...(opts.activeOnly !== false && { isActive: true })
		},
		select: selectForSponsor,
		orderBy: [{ isWinner: 'desc' }, { createdAt: 'desc' }]
	});
}

export async function listForFreelancer(
	freelancerProfileId: string
): Promise<SubmissionForFreelancer[]> {
	return prisma.submission.findMany({
		where: { freelancerProfileId, isActive: true },
		select: selectForFreelancer,
		orderBy: { createdAt: 'desc' }
	});
}

export async function countSubmissionsForCompany(companyProfileId: string): Promise<number> {
	return prisma.submission.count({
		where: { isActive: true, bounty: { companyProfileId } }
	});
}

export type FreelancerWin = {
	submissionId: string;
	bountySlug: string;
	bountyTitle: string;
	bountyType: string;
	winnerPosition: number | null;
	prizeAmount: number | null;
	currency: string;
	winnersAnnouncedAt: Date | null;
};

/**
 * Public win history for a freelancer's profile: their winning submissions on
 * bounties whose winners have been announced. Only public-safe bounty fields are
 * exposed (no sponsor notes/labels).
 */
export async function listWinsForFreelancer(freelancerProfileId: string): Promise<FreelancerWin[]> {
	const rows = await prisma.submission.findMany({
		where: {
			freelancerProfileId,
			isWinner: true,
			isActive: true,
			bounty: { isWinnersAnnounced: true }
		},
		select: {
			id: true,
			winnerPosition: true,
			prizeAmount: true,
			bounty: {
				select: {
					slug: true,
					title: true,
					type: true,
					currency: true,
					winnersAnnouncedAt: true
				}
			}
		},
		orderBy: { createdAt: 'desc' }
	});
	return rows.map((r) => ({
		submissionId: r.id,
		bountySlug: r.bounty.slug,
		bountyTitle: r.bounty.title,
		bountyType: r.bounty.type,
		winnerPosition: r.winnerPosition,
		prizeAmount: r.prizeAmount,
		currency: r.bounty.currency,
		winnersAnnouncedAt: r.bounty.winnersAnnouncedAt
	}));
}

export async function listWinners(bountyId: string): Promise<SubmissionForSponsor[]> {
	return prisma.submission.findMany({
		where: { bountyId, isWinner: true, isActive: true },
		select: selectForSponsor,
		orderBy: { winnerPosition: 'asc' }
	});
}

/**
 * Used to fan out `BOUNTY_CANCELLED` and `WINNERS_ANNOUNCED` (non-winner
 * variant) notifications. Returns one row per submitter with the user id
 * needed by `notification.dispatch`.
 */
export async function listSubmittersForBounty(bountyId: string) {
	return prisma.submission.findMany({
		where: { bountyId, isActive: true },
		select: {
			id: true,
			isWinner: true,
			winnerPosition: true,
			prizeAmount: true,
			freelancer: {
				select: {
					displayName: true,
					user: { select: { id: true, email: true, name: true } }
				}
			}
		}
	});
}

export async function setLabel(
	id: string,
	label: SubmissionLabel,
	tx: Prisma.TransactionClient = prisma
): Promise<SubmissionForSponsor> {
	return tx.submission.update({
		where: { id },
		data: { label },
		select: selectForSponsor
	});
}

export async function setNotes(
	id: string,
	notes: string,
	tx: Prisma.TransactionClient = prisma
): Promise<SubmissionForSponsor> {
	return tx.submission.update({
		where: { id },
		data: { notes },
		select: selectForSponsor
	});
}

export async function setFeedback(
	id: string,
	feedback: string,
	tx: Prisma.TransactionClient = prisma
): Promise<SubmissionForSponsor> {
	return tx.submission.update({
		where: { id },
		data: { feedback },
		select: selectForSponsor
	});
}

/**
 * Update the freelancer-visible `status` field (PENDING → APPROVED / REJECTED).
 * `SubmissionStatus.APPROVED` surfaces as "Shortlisted" to the freelancer;
 * the sponsor-private `label` field is untouched.
 */
export async function setStatus(
	id: string,
	status: SubmissionStatus,
	tx: Prisma.TransactionClient = prisma
): Promise<SubmissionForSponsor> {
	return tx.submission.update({
		where: { id },
		data: { status },
		select: selectForSponsor
	});
}

type ToggleWinnerInput = {
	isWinner: boolean;
	winnerPosition?: number | null;
	prizeAmount?: number | null;
};

export async function toggleWinner(
	id: string,
	input: ToggleWinnerInput,
	tx: Prisma.TransactionClient = prisma
): Promise<SubmissionForSponsor> {
	return tx.submission.update({
		where: { id },
		data: input.isWinner
			? {
					isWinner: true,
					winnerPosition: input.winnerPosition ?? null,
					prizeAmount: input.prizeAmount ?? null
				}
			: {
					isWinner: false,
					winnerPosition: null,
					prizeAmount: null
				},
		select: selectForSponsor
	});
}

export async function markPaid(
	id: string,
	tx: Prisma.TransactionClient = prisma
): Promise<Pick<Submission, 'id' | 'isPaid'>> {
	return tx.submission.update({
		where: { id },
		data: { isPaid: true },
		select: { id: true, isPaid: true }
	});
}

export type TrancheEntry = {
	/** Populated for MOMO_PAYOUT method tranches (legacy). */
	monimePayoutId?: string;
	/** Populated for INTERNAL_TRANSFER method tranches. */
	monimeTransferId?: string;
	amount: number;
	tranche: number;
	final?: boolean;
};

/**
 * Read-modify-write append onto the `paymentDetails` Json array.
 * Must be called inside a serialisable transaction or behind another
 * concurrency-safe boundary — see plan §17 Phase 4 "Open assumptions".
 */
export async function appendPaymentDetails(
	id: string,
	entry: TrancheEntry,
	tx: Prisma.TransactionClient = prisma
): Promise<TrancheEntry[]> {
	const existing = await tx.submission.findUnique({
		where: { id },
		select: { paymentDetails: true }
	});
	const current: TrancheEntry[] = Array.isArray(existing?.paymentDetails)
		? (existing!.paymentDetails as unknown as TrancheEntry[])
		: [];
	const next = [...current, entry];
	await tx.submission.update({
		where: { id },
		data: { paymentDetails: next as unknown as Prisma.InputJsonValue }
	});
	return next;
}
