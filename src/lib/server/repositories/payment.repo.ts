import { prisma } from '../db';
import { PaymentStatus, PaymentType, type Payment, type Prisma } from '@prisma/client';

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

type CreateDepositInput = {
	bountyId: string;
	amount: number;
	currency?: string;
	checkoutSessionId: string;
	monimePaymentId: string;
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
			status: input.status ?? PaymentStatus.COMPLETED,
			currency: input.currency ?? 'SLE',
			amount: input.amount,
			checkoutSessionId: input.checkoutSessionId,
			monimePaymentId: input.monimePaymentId,
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
	monimePayoutId: string;
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
			status: input.status ?? PaymentStatus.PROCESSING,
			currency: input.currency ?? 'SLE',
			amount: input.amount,
			monimePayoutId: input.monimePayoutId,
			toEntity: input.toEntity ?? null,
			fromEntity: input.fromEntity ?? null
		}
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
