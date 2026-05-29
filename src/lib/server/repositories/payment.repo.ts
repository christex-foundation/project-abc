import { prisma } from '../db';
import {
	PaymentMethod,
	PaymentStatus,
	PaymentType,
	WithdrawalStatus,
	type AccountWithdrawal,
	type Payment,
	type Prisma
} from '@prisma/client';

export async function findById(id: string): Promise<Payment | null> {
	return prisma.payment.findUnique({ where: { id } });
}

export async function findByMonimePaymentId(monimePaymentId: string): Promise<Payment | null> {
	return prisma.payment.findFirst({ where: { monimePaymentId } });
}

export async function findByMonimePayoutId(monimePayoutId: string): Promise<Payment | null> {
	return prisma.payment.findFirst({ where: { monimePayoutId } });
}

export async function listForBounty(bountyId: string): Promise<Payment[]> {
	return prisma.payment.findMany({
		where: { bountyId },
		orderBy: { createdAt: 'desc' }
	});
}

export async function listForSubmission(submissionId: string): Promise<Payment[]> {
	return prisma.payment.findMany({
		where: { submissionId },
		orderBy: { createdAt: 'asc' }
	});
}

/**
 * Total amount of `COMPLETED` PRIZE_PAYOUT rows on a submission. Used by the
 * payout webhook to decide whether the final PROJECT tranche has settled and
 * `Submission.isPaid` can flip.
 */
export async function sumCompletedPrizePayoutsForSubmission(
	submissionId: string,
	tx: Prisma.TransactionClient = prisma
): Promise<number> {
	const agg = await tx.payment.aggregate({
		where: {
			submissionId,
			type: PaymentType.PRIZE_PAYOUT,
			status: PaymentStatus.COMPLETED
		},
		_sum: { amount: true }
	});
	return agg._sum.amount ?? 0;
}

export type FreelancerEarningRow = Payment & {
	submission: {
		id: string;
		// Bounty is nullable when the owning company has deleted their account
		// (Bounty stays alive but loses its company FK).
		bounty: { id: string; slug: string; title: string; type: string; currency: string } | null;
	} | null;
	// Set for project MILESTONE_PAYOUT rows.
	project: { id: string; slug: string; title: string; currency: string } | null;
	milestone: { id: string; title: string; position: number } | null;
};

/**
 * Earnings rows for the freelancer dashboard. Includes bounty prize payouts
 * (joined through submission) and project milestone payouts (joined through the
 * project's awarded contractor).
 */
export async function listEarningsForFreelancer(
	freelancerProfileId: string
): Promise<FreelancerEarningRow[]> {
	return prisma.payment.findMany({
		where: {
			OR: [
				{ type: PaymentType.PRIZE_PAYOUT, submission: { freelancerProfileId } },
				{
					type: PaymentType.MILESTONE_PAYOUT,
					project: { contractorProfileId: freelancerProfileId }
				}
			]
		},
		include: {
			submission: {
				select: {
					id: true,
					bounty: {
						select: { id: true, slug: true, title: true, type: true, currency: true }
					}
				}
			},
			project: { select: { id: true, slug: true, title: true, currency: true } },
			milestone: { select: { id: true, title: true, position: true } }
		},
		orderBy: { createdAt: 'desc' }
	}) as Promise<FreelancerEarningRow[]>;
}

type CreateDepositInput = {
	bountyId: string;
	amount: number;
	currency?: string;
	/** Required for CHECKOUT method deposits. */
	checkoutSessionId?: string;
	/** Required for CHECKOUT method deposits. */
	monimePaymentId?: string;
	/** Required for INTERNAL_TRANSFER method deposits. */
	monimeTransferId?: string;
	method?: PaymentMethod;
	fromEntity?: string;
	toEntity?: string;
	status?: PaymentStatus;
};

export async function createDeposit(
	input: CreateDepositInput,
	tx: Prisma.TransactionClient = prisma
): Promise<Payment> {
	return tx.payment.create({
		data: {
			bountyId: input.bountyId,
			type: PaymentType.ESCROW_DEPOSIT,
			method: input.method ?? PaymentMethod.CHECKOUT,
			status: input.status ?? PaymentStatus.COMPLETED,
			currency: input.currency ?? 'SLE',
			amount: input.amount,
			checkoutSessionId: input.checkoutSessionId ?? null,
			monimePaymentId: input.monimePaymentId ?? null,
			monimeTransferId: input.monimeTransferId ?? null,
			fromEntity: input.fromEntity ?? null,
			toEntity: input.toEntity ?? null
		}
	});
}

type CreatePayoutInput = {
	bountyId: string;
	submissionId?: string | null;
	type: typeof PaymentType.PRIZE_PAYOUT | typeof PaymentType.REFUND;
	amount: number;
	currency?: string;
	/** Required for MOMO_PAYOUT method. */
	monimePayoutId?: string;
	/** Required for INTERNAL_TRANSFER method. */
	monimeTransferId?: string;
	method?: PaymentMethod;
	toEntity?: string;
	fromEntity?: string;
	status?: PaymentStatus;
};

export async function createPayout(
	input: CreatePayoutInput,
	tx: Prisma.TransactionClient = prisma
): Promise<Payment> {
	return tx.payment.create({
		data: {
			bountyId: input.bountyId,
			submissionId: input.submissionId ?? null,
			type: input.type,
			method: input.method ?? PaymentMethod.MOMO_PAYOUT,
			status: input.status ?? PaymentStatus.PROCESSING,
			currency: input.currency ?? 'SLE',
			amount: input.amount,
			monimePayoutId: input.monimePayoutId ?? null,
			monimeTransferId: input.monimeTransferId ?? null,
			toEntity: input.toEntity ?? null,
			fromEntity: input.fromEntity ?? null
		}
	});
}

// ─── Project payments (polymorphic Payment keyed by projectId/milestoneId) ───

type CreateProjectDepositInput = {
	projectId: string;
	amount: number;
	currency?: string;
	checkoutSessionId?: string;
	monimePaymentId?: string;
	monimeTransferId?: string;
	method?: PaymentMethod;
	fromEntity?: string;
	toEntity?: string;
	status?: PaymentStatus;
};

export async function createProjectDeposit(
	input: CreateProjectDepositInput,
	tx: Prisma.TransactionClient = prisma
): Promise<Payment> {
	return tx.payment.create({
		data: {
			projectId: input.projectId,
			type: PaymentType.ESCROW_DEPOSIT,
			method: input.method ?? PaymentMethod.CHECKOUT,
			status: input.status ?? PaymentStatus.COMPLETED,
			currency: input.currency ?? 'SLE',
			amount: input.amount,
			checkoutSessionId: input.checkoutSessionId ?? null,
			monimePaymentId: input.monimePaymentId ?? null,
			monimeTransferId: input.monimeTransferId ?? null,
			fromEntity: input.fromEntity ?? null,
			toEntity: input.toEntity ?? null
		}
	});
}

type CreateMilestonePayoutInput = {
	projectId: string;
	milestoneId: string;
	type: typeof PaymentType.MILESTONE_PAYOUT | typeof PaymentType.REFUND;
	amount: number;
	currency?: string;
	monimePayoutId?: string;
	monimeTransferId?: string;
	method?: PaymentMethod;
	toEntity?: string;
	fromEntity?: string;
	status?: PaymentStatus;
};

export async function createMilestonePayout(
	input: CreateMilestonePayoutInput,
	tx: Prisma.TransactionClient = prisma
): Promise<Payment> {
	return tx.payment.create({
		data: {
			projectId: input.projectId,
			milestoneId: input.milestoneId,
			type: input.type,
			method: input.method ?? PaymentMethod.INTERNAL_TRANSFER,
			status: input.status ?? PaymentStatus.PROCESSING,
			currency: input.currency ?? 'SLE',
			amount: input.amount,
			monimePayoutId: input.monimePayoutId ?? null,
			monimeTransferId: input.monimeTransferId ?? null,
			toEntity: input.toEntity ?? null,
			fromEntity: input.fromEntity ?? null
		}
	});
}

/** Refund payout keyed to a project (cancellation), no milestone. */
export async function createProjectRefund(
	input: {
		projectId: string;
		amount: number;
		currency?: string;
		monimeTransferId?: string;
		toEntity?: string;
		fromEntity?: string;
		status?: PaymentStatus;
	},
	tx: Prisma.TransactionClient = prisma
): Promise<Payment> {
	return tx.payment.create({
		data: {
			projectId: input.projectId,
			type: PaymentType.REFUND,
			method: PaymentMethod.INTERNAL_TRANSFER,
			status: input.status ?? PaymentStatus.COMPLETED,
			currency: input.currency ?? 'SLE',
			amount: input.amount,
			monimeTransferId: input.monimeTransferId ?? null,
			toEntity: input.toEntity ?? null,
			fromEntity: input.fromEntity ?? null
		}
	});
}

// ─── Account Withdrawal (separate from bounty-scoped Payment) ────────────────

type CreateWithdrawalInput = {
	userId: string;
	role: 'COMPANY' | 'FREELANCER';
	fromAccountId: string;
	toPhoneNumber: string;
	holderName: string;
	providerName: string;
	amount: number;
	currency?: string;
	monimePayoutId: string;
};

export async function createWithdrawal(
	input: CreateWithdrawalInput,
	tx: Prisma.TransactionClient = prisma
): Promise<AccountWithdrawal> {
	return tx.accountWithdrawal.create({
		data: {
			userId: input.userId,
			role: input.role,
			fromAccountId: input.fromAccountId,
			toPhoneNumber: input.toPhoneNumber,
			holderName: input.holderName,
			providerName: input.providerName,
			amount: input.amount,
			currency: input.currency ?? 'SLE',
			monimePayoutId: input.monimePayoutId,
			status: WithdrawalStatus.PROCESSING
		}
	});
}

export async function findWithdrawalByPayoutId(
	monimePayoutId: string
): Promise<AccountWithdrawal | null> {
	return prisma.accountWithdrawal.findFirst({ where: { monimePayoutId } });
}

export async function markWithdrawalStatus(
	id: string,
	status: WithdrawalStatus,
	opts: { failureCode?: string; failureMessage?: string } = {}
): Promise<AccountWithdrawal> {
	return prisma.accountWithdrawal.update({
		where: { id },
		data: {
			status,
			...(opts.failureCode !== undefined && { failureCode: opts.failureCode }),
			...(opts.failureMessage !== undefined && { failureMessage: opts.failureMessage })
		}
	});
}

export async function listWithdrawalsForUser(userId: string): Promise<AccountWithdrawal[]> {
	return prisma.accountWithdrawal.findMany({
		where: { userId },
		orderBy: { createdAt: 'desc' }
	});
}

type MarkStatusOpts = {
	monimePaymentId?: string;
	failureCode?: string;
	failureMessage?: string;
};

export async function markStatus(
	id: string,
	status: PaymentStatus,
	opts: MarkStatusOpts = {}
): Promise<Payment> {
	return prisma.payment.update({
		where: { id },
		data: {
			status,
			...(opts.monimePaymentId !== undefined && { monimePaymentId: opts.monimePaymentId }),
			...(opts.failureCode !== undefined && { failureCode: opts.failureCode }),
			...(opts.failureMessage !== undefined && { failureMessage: opts.failureMessage })
		}
	});
}

export async function incrementRetry(id: string): Promise<Payment> {
	return prisma.payment.update({
		where: { id },
		data: { retryCount: { increment: 1 } }
	});
}

export type AdminPaymentRow = Payment & {
	// Polymorphic: a payment belongs to a bounty OR a project (never both).
	bounty: { id: string; slug: string; title: string } | null;
	project: { id: string; slug: string; title: string } | null;
	// Freelancer is nullable when the submitter has deleted their account.
	submission: { id: string; freelancer: { displayName: string } | null } | null;
};

export async function listForAdmin(filter: {
	status?: PaymentStatus;
	type?: PaymentType;
	take?: number;
	skip?: number;
}): Promise<{ items: AdminPaymentRow[]; total: number }> {
	const where: Prisma.PaymentWhereInput = {};
	if (filter.status) where.status = filter.status;
	if (filter.type) where.type = filter.type;
	const take = filter.take ?? 50;
	const skip = filter.skip ?? 0;
	const [items, total] = await Promise.all([
		prisma.payment.findMany({
			where,
			include: {
				bounty: { select: { id: true, slug: true, title: true } },
				project: { select: { id: true, slug: true, title: true } },
				submission: {
					select: { id: true, freelancer: { select: { displayName: true } } }
				}
			},
			orderBy: { createdAt: 'desc' },
			take,
			skip
		}) as Promise<AdminPaymentRow[]>,
		prisma.payment.count({ where })
	]);
	return { items, total };
}
