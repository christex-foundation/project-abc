import { PaymentStatus, PaymentType } from '@prisma/client';
import { AppError } from '../http';
import { requireRole, type AuthedUser } from '../auth-helpers';
import { monime } from '../monime/client';
import * as paymentRepo from '../repositories/payment.repo';
import * as bountyRepo from '../repositories/bounty.repo';
import * as submissionRepo from '../repositories/submission.repo';

const MAX_RETRIES = 3;

export async function retryPayout(caller: AuthedUser, paymentId: string) {
	requireRole(caller, 'ADMIN');
	const payment = await paymentRepo.findById(paymentId);
	if (!payment) throw new AppError('NOT_FOUND', 'Payment not found.');
	if (payment.status !== PaymentStatus.FAILED) {
		throw new AppError('CONFLICT', 'Only FAILED payments can be retried.');
	}
	if (payment.retryCount >= MAX_RETRIES) {
		throw new AppError('CONFLICT', `Retry limit (${MAX_RETRIES}) reached.`);
	}
	if (payment.type !== PaymentType.PRIZE_PAYOUT && payment.type !== PaymentType.REFUND) {
		throw new AppError('CONFLICT', 'Only payouts and refunds can be retried.');
	}

	const bounty = await bountyRepo.findBountyById(payment.bountyId);
	if (!bounty?.escrowFinancialAccountId) {
		throw new AppError('INTERNAL', 'Bounty escrow account missing.');
	}

	let destinationMomo: string | null = payment.toEntity ?? null;
	if (!destinationMomo && payment.submissionId) {
		const sub = await submissionRepo.findByIdForSponsor(payment.submissionId);
		destinationMomo = sub?.freelancer.momoNumber ?? null;
	}
	if (!destinationMomo) {
		throw new AppError('CONFLICT', 'No destination MoMo number on file for this payment.');
	}

	const referencePrefix = payment.type === PaymentType.REFUND ? 'refund' : 'prize';
	const reference =
		payment.type === PaymentType.REFUND
			? `refund:${payment.bountyId}:retry${payment.retryCount + 1}`
			: `prize:${payment.submissionId ?? payment.bountyId}:retry${payment.retryCount + 1}`;

	const newPayout = await monime.payouts.create({
		sourceAccountId: bounty.escrowFinancialAccountId,
		destination: { type: 'MOMO', phoneNumber: destinationMomo },
		amount: payment.amount,
		currency: payment.currency,
		reference
	});

	void referencePrefix;

	await paymentRepo.incrementRetry(payment.id);
	const updated = await paymentRepo.markStatus(payment.id, PaymentStatus.PROCESSING, {
		monimePaymentId: newPayout.id
	});
	// Also overwrite the monimePayoutId so the webhook router lands on this row.
	await (async () => {
		const { prisma } = await import('../db');
		await prisma.payment.update({
			where: { id: payment.id },
			data: { monimePayoutId: newPayout.id, failureCode: null, failureMessage: null }
		});
	})();

	return { ...updated, monimePayoutId: newPayout.id };
}

export async function listForAdmin(
	caller: AuthedUser,
	filter: Parameters<typeof paymentRepo.listForAdmin>[0]
) {
	requireRole(caller, 'ADMIN');
	return paymentRepo.listForAdmin(filter);
}
