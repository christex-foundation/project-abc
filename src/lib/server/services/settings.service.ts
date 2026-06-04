import * as settingsRepo from '../repositories/settings.repo';
import { getAllSettings, invalidate } from '../settings';
import { AppError } from '../http';
import { requireRole, type AuthedUser } from '../auth-helpers';
import {
	companySelfRegisterValue,
	socialLinksValue,
	legalLinksValue,
	featureFlagsValue,
	aiAssistEnabledValue
} from '$lib/validators/settings';
import { freelancerCreditSystemValue } from '$lib/validators/credit';
import { freelancerReferralSystemValue } from '$lib/validators/referral';

const VALIDATORS: Record<string, { parse: (v: unknown) => unknown }> = {
	COMPANY_SELF_REGISTER: companySelfRegisterValue,
	FREELANCER_CREDIT_SYSTEM: freelancerCreditSystemValue,
	FREELANCER_REFERRAL_SYSTEM: freelancerReferralSystemValue,
	SOCIAL_LINKS: socialLinksValue,
	LEGAL_LINKS: legalLinksValue,
	FEATURE_FLAGS: featureFlagsValue,
	AI_ASSIST_ENABLED: aiAssistEnabledValue
};

export async function getAll(): Promise<Record<string, unknown>> {
	return getAllSettings();
}

export async function update(caller: AuthedUser, key: string, value: unknown) {
	requireRole(caller, 'ADMIN');
	if (!key || typeof key !== 'string') {
		throw new AppError('BAD_REQUEST', 'Setting key is required.');
	}
	const validator = VALIDATORS[key];
	const parsed = validator ? validator.parse(value) : value;
	const row = await settingsRepo.upsert(key, parsed, caller.id);
	invalidate(key);
	return row;
}
