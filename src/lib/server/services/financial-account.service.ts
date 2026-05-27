/**
 * financial-account.service.ts
 *
 * Manages Monime financial accounts (UVAN + financialAccountId) for both
 * companies and freelancers. Each profile gets one lazily-created account
 * that holds their balance on the Monime platform.
 *
 * Key flows:
 *  - Lazy account creation: triggered on profile completion (profile update handler).
 *  - Balance query: used on the financial account dashboard page.
 *  - KYC verification: run before any withdrawal to mobile money.
 *  - Withdrawal: payout from financial account → mobile money (async; webhook finalises).
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
		throw new AppError('CONFLICT', 'Complete your company profile before setting up a payment account.');
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
 * Verify KYC for a Sierra Leone mobile money number before withdrawal.
 * Uses `mobile-operator-lookup` to identify the operator → Monime provider KYC.
 *
 * @param phoneNumber - Full number without '+', e.g. "23277123456"
 */
export async function verifyKycForWithdrawal(
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
				'This number is not registered on any supported mobile money wallet.'
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

/**
 * Withdraw from the caller's Monime financial account to a mobile money number.
 * KYC is verified inline — the holder name must be present before the payout is created.
 *
 * The payout is asynchronous; the `payout.completed`/`payout.failed` webhook in
 * escrow.service will finalize the `AccountWithdrawal` record.
 */
export async function withdraw(
	caller: AuthedUser,
	input: { phoneNumber: string; amount: number }
): Promise<{ withdrawalId: string; monimePayoutId: string }> {
	requireRole(caller, 'COMPANY', 'FREELANCER');

	if (input.amount <= 0) throw new AppError('BAD_REQUEST', 'Amount must be greater than zero.');

	// Resolve the caller's financial account
	let accountId: string | null = null;
	const role = caller.role as 'COMPANY' | 'FREELANCER';

	if (role === 'COMPANY') {
		const profile = await companyRepo.findByUserId(caller.id);
		accountId = profile?.monimeFinancialAccountId ?? null;
	} else {
		const profile = await freelancerRepo.findByUserId(caller.id);
		accountId = profile?.monimeFinancialAccountId ?? null;
	}

	if (!accountId) {
		throw new AppError(
			'CONFLICT',
			'You must set up your payment account before withdrawing funds.'
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

	// KYC check
	const kyc = await verifyKycForWithdrawal(input.phoneNumber);

	// Create Monime payout
	const payout = await monime.payouts.create({
		sourceAccountId: accountId,
		destination: { type: 'MOMO', phoneNumber: input.phoneNumber },
		amount: input.amount,
		currency: 'SLE',
		reference: `withdraw_${caller.id}_${Date.now()}`
	});

	// Persist withdrawal record
	const withdrawal = await paymentRepo.createWithdrawal({
		userId: caller.id,
		role,
		fromAccountId: accountId,
		toPhoneNumber: input.phoneNumber,
		holderName: kyc.holderName,
		providerName: kyc.providerName,
		amount: input.amount,
		currency: 'SLE',
		monimePayoutId: payout.id
	});

	// Notify user
	await notification.dispatch(caller.id, 'PAYOUT_COMPLETED', {
		title: 'Withdrawal initiated',
		message: `Your withdrawal of ${input.amount} SLE to ${kyc.holderName} (${kyc.providerName}) is being processed.`,
		link: '/dashboard/settings'
	});

	return { withdrawalId: withdrawal.id, monimePayoutId: payout.id };
}

/**
 * Called after a successful profile save to lazily provision a Monime account.
 * Non-blocking — errors are caught and logged so they don't fail the profile save.
 */
export async function tryProvisionAccountAfterProfileUpdate(
	caller: AuthedUser
): Promise<void> {
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
