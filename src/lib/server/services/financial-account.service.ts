/**
 * financial-account.service.ts
 *
 * Manages Monime financial accounts (UVAN + financialAccountId) for both
 * companies and freelancers. Each profile gets one lazily-created account
 * that holds their balance on the Monime platform.
 *
 * Key flows:
 *  - Lazy account creation: triggered on profile completion (profile update handler).
 *  - Balance query: used on the wallet section of the profile page.
 *  - Withdrawal destination: user sets a verified mobile money number once
 *    (KYC runs at setup) and every subsequent withdrawal goes straight to it.
 *  - Withdrawal: payout from financial account → verified mobile money number
 *    (async; webhook finalises).
 */

import { lookupMobileOperator, isLookupError } from 'mobile-operator-lookup';
import { monime } from '../monime/client';
import { AppError } from '../http';
import { requireRole, type AuthedUser } from '../auth-helpers';
import * as companyRepo from '../repositories/company.repo';
import * as freelancerRepo from '../repositories/freelancer.repo';
import * as paymentRepo from '../repositories/payment.repo';
import * as notification from './notification.service';

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function createAndPersistCompanyAccount(
	profileId: string,
	companyName: string
): Promise<{ id: string; uvan: string | null }> {
	const reference = `company_${profileId}`;
	let account: { id: string; uvan?: string };
	try {
		account = await monime.financialAccounts.create({
			name: companyName.slice(0, 80),
			currency: 'SLE',
			reference
		});
	} catch (err) {
		// If the account already exists (409-style conflict), recover by reference.
		const existing = await monime.financialAccounts.findByReference(reference);
		if (!existing) throw err;
		account = existing;
	}
	await companyRepo.setFinancialAccount(profileId, account.id, account.uvan ?? null);
	return { id: account.id, uvan: account.uvan ?? null };
}

async function createAndPersistFreelancerAccount(
	profileId: string,
	displayName: string
): Promise<{ id: string; uvan: string | null }> {
	const reference = `freelancer_${profileId}`;
	let account: { id: string; uvan?: string };
	try {
		account = await monime.financialAccounts.create({
			name: displayName.slice(0, 80),
			currency: 'SLE',
			reference
		});
	} catch (err) {
		const existing = await monime.financialAccounts.findByReference(reference);
		if (!existing) throw err;
		account = existing;
	}
	await freelancerRepo.setFinancialAccount(profileId, account.id, account.uvan ?? null);
	return { id: account.id, uvan: account.uvan ?? null };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Ensure a company financial account exists on Monime and is stored on the
 * profile. Returns the Monime account ID. Safe to call repeatedly — idempotent.
 */
export async function ensureCompanyAccount(caller: AuthedUser): Promise<string> {
	requireRole(caller, 'COMPANY', 'ADMIN');
	const profile = await companyRepo.findByUserId(caller.id);
	if (!profile) throw new AppError('NOT_FOUND', 'Company profile not found.');
	if (!profile.companyName)
		throw new AppError(
			'CONFLICT',
			'Complete your company profile before setting up a payment account.'
		);
	if (profile.monimeFinancialAccountId) return profile.monimeFinancialAccountId;
	const { id } = await createAndPersistCompanyAccount(profile.id, profile.companyName);
	return id;
}

/**
 * Ensure a freelancer financial account exists on Monime. Returns the account ID.
 */
export async function ensureFreelancerAccount(caller: AuthedUser): Promise<string> {
	requireRole(caller, 'FREELANCER');
	const profile = await freelancerRepo.findByUserId(caller.id);
	if (!profile) throw new AppError('NOT_FOUND', 'Freelancer profile not found.');
	if (profile.monimeFinancialAccountId) return profile.monimeFinancialAccountId;
	const { id } = await createAndPersistFreelancerAccount(profile.id, profile.displayName);
	return id;
}

/**
 * Get the current available balance (in minor units) for a Monime financial account.
 */
export async function getAccountBalance(accountId: string): Promise<number> {
	const result = await monime.financialAccounts.getBalance(accountId);
	return result.available;
}

/**
 * Get the caller's financial account ID and UVAN. Returns null fields if not yet created.
 */
export async function getAccountInfo(caller: AuthedUser): Promise<{
	accountId: string | null;
	uvan: string | null;
	balance: number | null;
}> {
	let accountId: string | null = null;
	let uvan: string | null = null;

	if (caller.role === 'COMPANY') {
		const profile = await companyRepo.findByUserId(caller.id);
		accountId = profile?.monimeFinancialAccountId ?? null;
		uvan = profile?.monimeUvan ?? null;
	} else if (caller.role === 'FREELANCER') {
		const profile = await freelancerRepo.findByUserId(caller.id);
		accountId = profile?.monimeFinancialAccountId ?? null;
		uvan = profile?.monimeUvan ?? null;
	}

	if (!accountId) return { accountId: null, uvan: null, balance: null };

	const balance = await getAccountBalance(accountId);
	return { accountId, uvan, balance };
}

/**
 * Verify KYC for a Sierra Leone mobile money number.
 * Uses `mobile-operator-lookup` to identify the operator → Monime provider KYC.
 *
 * @param phoneNumber - Full number without '+', e.g. "23277123456"
 */
export async function verifyKycForPhone(
	phoneNumber: string
): Promise<{ holderName: string; providerName: string; operatorCode: string }> {
	const result = lookupMobileOperator('+' + phoneNumber);
	if (isLookupError(result)) {
		throw new AppError(
			'BAD_REQUEST',
			'Phone number is not a valid Sierra Leone mobile money number.'
		);
	}
	try {
		const kyc = await monime.providerKyc.get(result.monime_code, phoneNumber);
		if (!kyc.holderName) {
			throw new AppError(
				'BAD_REQUEST',
				'This number is not registered on any supported mobile money account.'
			);
		}
		return {
			holderName: kyc.holderName,
			providerName: kyc.providerName,
			operatorCode: result.monime_code
		};
	} catch (err) {
		if (err instanceof AppError) throw err;
		throw new AppError(
			'BAD_REQUEST',
			'Unable to verify this number. Please check it and try again.'
		);
	}
}

export type WithdrawalDestination = {
	phone: string;
	holderName: string;
	providerName: string;
	verifiedAt: Date;
};

/**
 * Returns the caller's saved verified withdrawal destination, or null if not set.
 */
export async function getWithdrawalDestination(
	caller: AuthedUser
): Promise<WithdrawalDestination | null> {
	if (caller.role === 'COMPANY') {
		const profile = await companyRepo.findByUserId(caller.id);
		if (!profile?.withdrawalPhone || !profile.withdrawalVerifiedAt) return null;
		return {
			phone: profile.withdrawalPhone,
			holderName: profile.withdrawalHolderName ?? '',
			providerName: profile.withdrawalProviderName ?? '',
			verifiedAt: profile.withdrawalVerifiedAt
		};
	}
	if (caller.role === 'FREELANCER') {
		const profile = await freelancerRepo.findByUserId(caller.id);
		if (!profile?.withdrawalPhone || !profile.withdrawalVerifiedAt) return null;
		return {
			phone: profile.withdrawalPhone,
			holderName: profile.withdrawalHolderName ?? '',
			providerName: profile.withdrawalProviderName ?? '',
			verifiedAt: profile.withdrawalVerifiedAt
		};
	}
	return null;
}

/**
 * Verify KYC for a candidate mobile money number and save it as the caller's
 * default withdrawal destination. Subsequent withdrawals reuse these fields
 * without re-running KYC.
 */
export async function setWithdrawalDestination(
	caller: AuthedUser,
	phoneNumber: string
): Promise<WithdrawalDestination> {
	requireRole(caller, 'COMPANY', 'FREELANCER');

	// Canonical form is without a leading '+'; tolerate input that includes one.
	const normalized = phoneNumber.replace(/^\+/, '');

	const kyc = await verifyKycForPhone(normalized);

	if (caller.role === 'COMPANY') {
		const profile = await companyRepo.findByUserId(caller.id);
		if (!profile) throw new AppError('NOT_FOUND', 'Company profile not found.');
		await companyRepo.setWithdrawalDestination(profile.id, {
			phone: normalized,
			holderName: kyc.holderName,
			providerName: kyc.providerName
		});
	} else {
		const profile = await freelancerRepo.findByUserId(caller.id);
		if (!profile) throw new AppError('NOT_FOUND', 'Freelancer profile not found.');
		await freelancerRepo.setWithdrawalDestination(profile.id, {
			phone: normalized,
			holderName: kyc.holderName,
			providerName: kyc.providerName
		});
	}

	return {
		phone: normalized,
		holderName: kyc.holderName,
		providerName: kyc.providerName,
		verifiedAt: new Date()
	};
}

/**
 * Withdraw from the caller's Monime financial account to their saved, verified
 * mobile money number. KYC is NOT re-run — it was verified at setup time.
 *
 * The payout is asynchronous; the `payout.completed`/`payout.failed` webhook in
 * escrow.service will finalize the `AccountWithdrawal` record.
 */
export async function withdraw(
	caller: AuthedUser,
	input: { amount: number }
): Promise<{ withdrawalId: string; monimePayoutId: string }> {
	requireRole(caller, 'COMPANY', 'FREELANCER');

	if (input.amount <= 0) throw new AppError('BAD_REQUEST', 'Amount must be greater than zero.');

	// Resolve the caller's financial account + verified destination
	const role = caller.role as 'COMPANY' | 'FREELANCER';
	let accountId: string | null = null;
	let destination: WithdrawalDestination | null = null;

	if (role === 'COMPANY') {
		const profile = await companyRepo.findByUserId(caller.id);
		accountId = profile?.monimeFinancialAccountId ?? null;
		if (profile?.withdrawalPhone && profile.withdrawalVerifiedAt) {
			destination = {
				phone: profile.withdrawalPhone,
				holderName: profile.withdrawalHolderName ?? '',
				providerName: profile.withdrawalProviderName ?? '',
				verifiedAt: profile.withdrawalVerifiedAt
			};
		}
	} else {
		const profile = await freelancerRepo.findByUserId(caller.id);
		accountId = profile?.monimeFinancialAccountId ?? null;
		if (profile?.withdrawalPhone && profile.withdrawalVerifiedAt) {
			destination = {
				phone: profile.withdrawalPhone,
				holderName: profile.withdrawalHolderName ?? '',
				providerName: profile.withdrawalProviderName ?? '',
				verifiedAt: profile.withdrawalVerifiedAt
			};
		}
	}

	if (!accountId) {
		throw new AppError('CONFLICT', 'Your wallet is not set up yet.');
	}
	if (!destination) {
		throw new AppError(
			'CONFLICT',
			'Add a verified mobile money number on your profile before withdrawing.'
		);
	}

	// Check balance
	const balance = await getAccountBalance(accountId);
	if (balance < input.amount) {
		throw new AppError(
			'CONFLICT',
			`Insufficient balance. Available: ${balance}, requested: ${input.amount}.`
		);
	}

	// Create Monime payout
	const payout = await monime.payouts.create({
		sourceAccountId: accountId,
		destination: { type: 'MOMO', phoneNumber: destination.phone },
		amount: input.amount,
		currency: 'SLE',
		reference: `withdraw_${caller.id}_${Date.now()}`
	});

	// Persist withdrawal record
	const withdrawal = await paymentRepo.createWithdrawal({
		userId: caller.id,
		role,
		fromAccountId: accountId,
		toPhoneNumber: destination.phone,
		holderName: destination.holderName,
		providerName: destination.providerName,
		amount: input.amount,
		currency: 'SLE',
		monimePayoutId: payout.id
	});

	// Notify user
	await notification.dispatch(caller.id, 'PAYOUT_COMPLETED', {
		title: 'Withdrawal initiated',
		message: `Your withdrawal of ${input.amount} SLE to ${destination.holderName} (${destination.providerName}) is being processed.`,
		link: '/dashboard/settings'
	});

	return { withdrawalId: withdrawal.id, monimePayoutId: payout.id };
}

/**
 * Called after a successful profile save to lazily provision a Monime account.
 * Non-blocking — errors are caught and logged so they don't fail the profile save.
 */
export async function tryProvisionAccountAfterProfileUpdate(caller: AuthedUser): Promise<void> {
	try {
		if (caller.role === 'COMPANY') {
			await ensureCompanyAccount(caller);
		} else if (caller.role === 'FREELANCER') {
			await ensureFreelancerAccount(caller);
		}
	} catch (err) {
		// Log but don't surface — provisioning failures are retried on next update
		console.warn('[financial-account] lazy provisioning failed', {
			userId: caller.id,
			role: caller.role,
			err: err instanceof Error ? err.message : err
		});
	}
}
