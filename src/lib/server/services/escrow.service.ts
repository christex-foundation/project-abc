import { BountyStatus, PaymentMethod, PaymentStatus, PaymentType } from '@prisma/client';
import { prisma } from '../db';
import { AppError } from '../http';
import { requireRole, type AuthedUser } from '../auth-helpers';
import { monime, verifyWebhookSignature } from '../monime/client';
import * as bountyRepo from '../repositories/bounty.repo';
import * as paymentRepo from '../repositories/payment.repo';
import * as companyRepo from '../repositories/company.repo';
import * as userRepo from '../repositories/user.repo';
import * as submissionRepo from '../repositories/submission.repo';
import * as notification from './notification.service';
import { ensureCompanyAccount } from './financial-account.service';

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
 * Lazy escrow-account creation. Returns the (possibly newly-persisted)
 * financial account id. Callers that need to read it back should re-load
 * the bounty.
 */
async function ensureEscrowAccount(bountyId: string, currentId: string | null, title: string) {
	if (currentId) return currentId;
	const account = await monime.financialAccounts.create({
		name: `FOW Escrow – ${title}`.slice(0, 80),
		currency: 'SLE'
	});
	await bountyRepo.setEscrowAccount(bountyId, account.id);
	return account.id;
}

/**
 * Fund a bounty via an instant internal transfer from the company's Monime
 * financial account to the bounty's per-bounty escrow account. Synchronous —
 * the bounty is marked FUNDED immediately (no webhook needed).
 */
export async function fundFromFinancialAccount(
	caller: AuthedUser,
	bountyId: string
): Promise<void> {
	requireRole(caller, 'COMPANY', 'ADMIN');
	const bounty = await loadOwnedBounty(caller, bountyId);
	if (bounty.status !== BountyStatus.DRAFT) {
		throw new AppError('CONFLICT', 'Only DRAFT bounties can be funded.');
	}

	// Ensure the company has a financial account
	const companyAccountId = await ensureCompanyAccount(caller);

	// Ensure the bounty has a per-bounty escrow account
	const escrowId = await ensureEscrowAccount(
		bounty.id,
		bounty.escrowFinancialAccountId,
		bounty.title
	);

	// Check balance
	const balance = await monime.financialAccounts.getBalance(companyAccountId);
	if (balance.available < bounty.totalPrizePool) {
		throw new AppError(
			'CONFLICT',
			`Insufficient balance. Available: ${balance.available}, required: ${bounty.totalPrizePool}. Please top up your account or use checkout funding.`
		);
	}

	// Perform internal transfer (synchronous)
	const transfer = await monime.internalTransfers.create({
		from: companyAccountId,
		to: escrowId,
		amount: bounty.totalPrizePool,
		currency: bounty.currency,
		reference: `fund:${bounty.id}`,
		description: `Bounty escrow funding – ${bounty.title}`
	});

	// Persist and mark funded in a transaction
	await prisma.$transaction(async (tx) => {
		await paymentRepo.createDeposit(
			{
				bountyId: bounty.id,
				amount: bounty.totalPrizePool,
				currency: bounty.currency,
				method: PaymentMethod.INTERNAL_TRANSFER,
				monimeTransferId: transfer.id,
				fromEntity: companyAccountId,
				toEntity: escrowId,
				status: PaymentStatus.COMPLETED
			},
			tx
		);
		await bountyRepo.markFunded(bounty.id, bounty.totalPrizePool, tx);
	});

	const owner = await userRepo.findByCompanyProfileId(bounty.companyProfileId);
	if (owner) {
		await notification.dispatch(owner.id, 'BOUNTY_FUNDED', {
			title: 'Bounty funded',
			message: `Escrow for "${bounty.title}" is now locked (internal transfer).`,
			link: `/dashboard/company/bounties`,
			email: {
				bountyTitle: bounty.title,
				bountyUrl: `${appUrl()}/bounties/${bounty.slug}`,
				totalPrizePool: bounty.totalPrizePool,
				currency: bounty.currency
			}
		});
	}
}

export async function createFundingCheckoutSession(
	caller: AuthedUser,
	bountyId: string
): Promise<{ url: string }> {
	requireRole(caller, 'COMPANY', 'ADMIN');
	const bounty = await loadOwnedBounty(caller, bountyId);
	if (bounty.status !== BountyStatus.DRAFT) {
		throw new AppError('CONFLICT', 'Only DRAFT bounties can be funded.');
	}

	const escrowId = await ensureEscrowAccount(
		bounty.id,
		bounty.escrowFinancialAccountId,
		bounty.title
	);

	const session = await monime.checkoutSessions.create({
		financialAccountId: escrowId,
		amount: bounty.totalPrizePool,
		currency: bounty.currency,
		reference: `bounty:${bounty.id}`,
		successUrl: `${appUrl()}/dashboard/company/bounties?funded=${bounty.id}`,
		cancelUrl: `${appUrl()}/dashboard/company/bounties/${bounty.id}/fund?cancelled=1`
	});

	await bountyRepo.setCheckoutSession(bounty.id, {
		checkoutSessionId: session.id,
		checkoutSessionUrl: session.url
	});

	return { url: session.url };
}

type MonimeEvent = {
	type: string;
	data?: {
		id?: string;
		reference?: string;
		financialAccountId?: string;
		amount?: { value?: number };
		paymentId?: string;
		payoutId?: string;
		failureCode?: string;
		failureMessage?: string;
	};
};

function parseEvent(rawBody: string): MonimeEvent {
	try {
		return JSON.parse(rawBody) as MonimeEvent;
	} catch {
		throw new AppError('BAD_REQUEST', 'Webhook body is not valid JSON.');
	}
}

export async function handleWebhook(rawBody: string, signatureHeader: string | null) {
	if (!verifyWebhookSignature(rawBody, signatureHeader)) {
		throw new AppError('UNAUTHENTICATED', 'Invalid webhook signature.');
	}
	const event = parseEvent(rawBody);

	switch (event.type) {
		case 'checkout_session.completed':
			await handleFundingCompleted(event);
			return;
		case 'payout.completed':
		case 'payout.failed':
			await handlePayoutTerminal(event);
			return;
		default:
			console.info('[monime] unhandled event', event.type);
	}
}

async function handleFundingCompleted(event: MonimeEvent) {
	const ref = event.data?.reference ?? '';
	const match = /^bounty:(.+)$/.exec(ref);
	if (!match) {
		console.warn('[escrow] checkout.completed without bounty reference', ref);
		return;
	}
	const bountyId = match[1];
	const monimePaymentId = event.data?.paymentId ?? event.data?.id;
	if (!monimePaymentId) {
		throw new AppError('BAD_REQUEST', 'Webhook missing payment id.');
	}

	const existing = await paymentRepo.findByMonimePaymentId(monimePaymentId);
	if (existing && existing.status === PaymentStatus.COMPLETED) return;

	const bounty = await bountyRepo.findBountyById(bountyId);
	if (!bounty) {
		console.warn('[escrow] checkout for unknown bounty', bountyId);
		return;
	}
	if (!bounty.escrowFinancialAccountId) {
		console.warn('[escrow] bounty has no escrow account', bountyId);
		return;
	}

	const balance = await monime.financialAccounts.getBalance(bounty.escrowFinancialAccountId);
	if (balance.available < bounty.totalPrizePool) {
		await paymentRepo.createDeposit({
			bountyId: bounty.id,
			amount: balance.available,
			currency: bounty.currency,
			checkoutSessionId: bounty.checkoutSessionId ?? '',
			monimePaymentId,
			status: PaymentStatus.FAILED
		});
		console.error('[escrow] funding amount mismatch', {
			bountyId,
			available: balance.available,
			expected: bounty.totalPrizePool
		});
		return;
	}

	await prisma.$transaction(async (tx) => {
		await paymentRepo.createDeposit(
			{
				bountyId: bounty.id,
				amount: bounty.totalPrizePool,
				currency: bounty.currency,
				checkoutSessionId: bounty.checkoutSessionId ?? '',
				monimePaymentId,
				status: PaymentStatus.COMPLETED
			},
			tx
		);
		await bountyRepo.markFunded(bounty.id, bounty.totalPrizePool, tx);
	});

	const owner = await userRepo.findByCompanyProfileId(bounty.companyProfileId);
	if (owner) {
		await notification.dispatch(owner.id, 'BOUNTY_FUNDED', {
			title: 'Bounty funded',
			message: `Escrow for "${bounty.title}" is now locked.`,
			link: `/dashboard/company/bounties`,
			email: {
				bountyTitle: bounty.title,
				bountyUrl: `${appUrl()}/bounties/${bounty.slug}`,
				totalPrizePool: bounty.totalPrizePool,
				currency: bounty.currency
			}
		});
	}
}

export async function cancelBountyWithRefund(caller: AuthedUser, bountyId: string) {
	requireRole(caller, 'COMPANY', 'ADMIN');
	const bounty = await loadOwnedBounty(caller, bountyId);
	const cancellable: BountyStatus[] = [
		BountyStatus.DRAFT,
		BountyStatus.FUNDED,
		BountyStatus.ACTIVE
	];
	if (!cancellable.includes(bounty.status)) {
		throw new AppError('CONFLICT', `Cannot cancel a bounty in status ${bounty.status}.`);
	}

	// DRAFT without funded escrow: just mark cancelled — no Monime call needed.
	const isEmptyDraft = bounty.status === BountyStatus.DRAFT && bounty.escrowFundedAmount === 0;

	if (isEmptyDraft) {
		await bountyRepo.markCancelled(bounty.id);
	} else {
		const company = await companyRepo.findByUserId(caller.id);
		if (!bounty.escrowFinancialAccountId) {
			throw new AppError('INTERNAL', 'Funded bounty is missing its escrow account.');
		}
		if (!company?.monimeFinancialAccountId) {
			throw new AppError(
				'CONFLICT',
				'Set up your payment account before cancelling a funded bounty.'
			);
		}

		const transfer = await monime.internalTransfers.create({
			from: bounty.escrowFinancialAccountId,
			to: company.monimeFinancialAccountId,
			amount: bounty.escrowFundedAmount,
			currency: bounty.currency,
			reference: `refund:${bounty.id}`,
			description: `Bounty cancellation refund – ${bounty.title}`
		});

		await prisma.$transaction(async (tx) => {
			await paymentRepo.createPayout(
				{
					bountyId: bounty.id,
					type: PaymentType.REFUND,
					method: PaymentMethod.INTERNAL_TRANSFER,
					amount: bounty.escrowFundedAmount,
					currency: bounty.currency,
					monimeTransferId: transfer.id,
					fromEntity: bounty.escrowFinancialAccountId!,
					toEntity: company.monimeFinancialAccountId!,
					status: PaymentStatus.COMPLETED
				},
				tx
			);
			await bountyRepo.markCancelled(bounty.id, tx);
		});

		await notification.dispatch(caller.id, 'BOUNTY_CANCELLED', {
			title: 'Refund processed',
			message: `Refund for "${bounty.title}" has been returned to your payment account.`,
			link: `/dashboard/company/bounties`,
			email: {
				bountyTitle: bounty.title,
				refundedAmount: bounty.escrowFundedAmount,
				currency: bounty.currency,
				isSubmitter: false
			}
		});
	}

	if (isEmptyDraft) {
		await notification.dispatch(caller.id, 'BOUNTY_CANCELLED', {
			title: 'Bounty cancelled',
			message: `"${bounty.title}" was cancelled.`,
			link: `/dashboard/company/bounties`
		});
	}

	await fanOutBountyCancelledToSubmitters(bounty.id, bounty.title);

	const fresh = await bountyRepo.findBountyById(bounty.id);
	return fresh!;
}

async function fanOutBountyCancelledToSubmitters(bountyId: string, bountyTitle: string) {
	const submitters = await submissionRepo.listSubmittersForBounty(bountyId);
	await Promise.all(
		submitters.map((s) =>
			notification.dispatch(s.freelancer.user.id, 'BOUNTY_CANCELLED', {
				title: 'Bounty cancelled',
				message: `"${bountyTitle}" was cancelled by the sponsor.`,
				email: {
					bountyTitle,
					isSubmitter: true
				}
			})
		)
	);
}

async function handlePayoutTerminal(event: MonimeEvent) {
	const monimePayoutId = event.data?.payoutId ?? event.data?.id;
	if (!monimePayoutId) return;

	// Check if this is a user withdrawal payout (AccountWithdrawal record)
	const withdrawal = await paymentRepo.findWithdrawalByPayoutId(monimePayoutId);
	if (withdrawal) {
		if (event.type === 'payout.completed') {
			await paymentRepo.markWithdrawalStatus(withdrawal.id, 'COMPLETED');
			await notification.dispatch(withdrawal.userId, 'PAYOUT_COMPLETED', {
				title: 'Withdrawal completed',
				message: `Your withdrawal of ${withdrawal.amount} ${withdrawal.currency} to ${withdrawal.holderName} (${withdrawal.providerName}) has been processed.`,
				link: '/dashboard/settings'
			});
		} else {
			await paymentRepo.markWithdrawalStatus(withdrawal.id, 'FAILED', {
				failureCode: event.data?.failureCode,
				failureMessage: event.data?.failureMessage
			});
			await notification.dispatch(withdrawal.userId, 'PAYOUT_FAILED', {
				title: 'Withdrawal failed',
				message: `Your withdrawal to ${withdrawal.toPhoneNumber} failed. Please try again.`,
				link: '/dashboard/settings'
			});
		}
		return;
	}

	// Otherwise it's a bounty prize payout or refund
	const payment = await paymentRepo.findByMonimePayoutId(monimePayoutId);
	if (!payment) {
		console.warn('[escrow] payout webhook for unknown payment', monimePayoutId);
		return;
	}
	if (payment.status === PaymentStatus.COMPLETED || payment.status === PaymentStatus.FAILED) {
		return;
	}

	if (event.type === 'payout.completed') {
		await paymentRepo.markStatus(payment.id, PaymentStatus.COMPLETED);
		if (payment.type === PaymentType.PRIZE_PAYOUT && payment.submissionId) {
			await onPrizePayoutCompleted(payment.submissionId, payment.amount);
		}
	} else {
		await paymentRepo.markStatus(payment.id, PaymentStatus.FAILED, {
			failureCode: event.data?.failureCode,
			failureMessage: event.data?.failureMessage
		});
		if (payment.type === PaymentType.PRIZE_PAYOUT) {
			await onPrizePayoutFailed(payment.bountyId, payment.submissionId, {
				failureCode: event.data?.failureCode ?? null,
				failureMessage: event.data?.failureMessage ?? null
			});
		}
	}
}

async function onPrizePayoutCompleted(submissionId: string, amount: number) {
	const submission = await submissionRepo.findByIdForSponsor(submissionId);
	if (!submission) {
		console.warn('[escrow] payout completed for unknown submission', submissionId);
		return;
	}
	const bounty = await bountyRepo.findBountyById(submission.bountyId);
	if (!bounty) return;

	// Decide isPaid: BOUNTY is single-payout; PROJECT is paid in tranches.
	let markFinal = false;
	if (bounty.type === 'BOUNTY') {
		markFinal = true;
	} else if (bounty.type === 'PROJECT') {
		const totalPaid = await paymentRepo.sumCompletedPrizePayoutsForSubmission(submissionId);
		markFinal = totalPaid >= bounty.totalPrizePool;
	}
	if (markFinal && !submission.isPaid) {
		await submissionRepo.markPaid(submissionId);
	}

	const tranches = Array.isArray(submission.paymentDetails)
		? (submission.paymentDetails as Array<{ tranche?: number }>)
		: [];
	const trancheNum = tranches.length > 0 ? (tranches[tranches.length - 1]?.tranche ?? null) : null;

	await notification.dispatch(submission.freelancer.user.id, 'PAYOUT_COMPLETED', {
		title: 'Payout settled',
		message: `Your prize for "${bounty.title}" has been paid.`,
		link: `/bounties/${bounty.slug}`,
		email: {
			bountyTitle: bounty.title,
			amount,
			currency: bounty.currency,
			tranche: bounty.type === 'PROJECT' ? trancheNum : null,
			totalTranches: null
		}
	});
}

async function onPrizePayoutFailed(
	bountyId: string,
	submissionId: string | null,
	failure: { failureCode: string | null; failureMessage: string | null }
) {
	const bounty = await bountyRepo.findBountyById(bountyId);
	if (!bounty) return;

	const sponsor = await userRepo.findCompanyOwnerByBountyId(bountyId);
	const admins = await userRepo.listActiveAdmins();
	const recipients = new Set<string>();
	if (sponsor) recipients.add(sponsor.id);
	for (const a of admins) recipients.add(a.id);

	const detail = failure.failureMessage ?? failure.failureCode ?? 'No detail provided.';
	await Promise.all(
		Array.from(recipients).map((userId) =>
			notification.dispatch(userId, 'PAYOUT_FAILED', {
				title: 'Payout failed',
				message: `A payout for "${bounty.title}" failed: ${detail}`,
				link: `/dashboard/company/bounties/${bountyId}/submissions`
			})
		)
	);

	// Reference submissionId so a downstream alert routes back to the affected row.
	if (submissionId) {
		console.error('[escrow] prize payout failed', {
			bountyId,
			submissionId,
			failure
		});
	}
}
