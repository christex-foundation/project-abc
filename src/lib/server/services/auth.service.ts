import { UserRole } from '@prisma/client';
import { auth } from '../auth';
import { prisma } from '../db';
import { AppError } from '../http';
import { getSetting } from '../settings';
import * as companyRepo from '../repositories/company.repo';
import * as freelancerRepo from '../repositories/freelancer.repo';
import * as referralService from './referral.service';

type CompanySelfRegister = { enabled?: boolean } | null;

export async function registerFreelancer(input: {
	email: string;
	password: string;
	name: string;
	referralCode?: string;
}) {
	const result = await auth.api.signUpEmail({
		body: { email: input.email, password: input.password, name: input.name }
	});
	if (!result?.user?.id) {
		throw new AppError('BAD_REQUEST', 'Sign-up failed.');
	}
	// Better Auth returns a synthetic, un-persisted user when the email already
	// exists and requireEmailVerification is true (anti-enumeration). Short-circuit
	// silently so the route still redirects to /verify-email without leaking that
	// the address is taken — and without P2025'ing on the phantom id.
	const persisted = await prisma.user.findUnique({
		where: { id: result.user.id },
		select: { id: true }
	});
	if (!persisted) return { userId: result.user.id };
	await prisma.user.update({
		where: { id: result.user.id },
		data: { role: UserRole.FREELANCER, isActive: true }
	});
	const profile = await freelancerRepo.createEmpty(result.user.id, input.name);
	// Best-effort referral attachment. Failures here (bad/expired/capped code)
	// must never block account creation — the freelancer can still join FOW.
	try {
		await referralService.applyReferralCodeAtSignup(
			result.user.id,
			profile.id,
			input.email,
			null,
			input.referralCode ?? null
		);
	} catch (e) {
		console.error('[auth.service] referral attach failed:', e);
	}
	return { userId: result.user.id };
}

export async function registerCompany(input: {
	email: string;
	password: string;
	name: string;
	companyName: string;
}) {
	const flag = (await getSetting<CompanySelfRegister>('COMPANY_SELF_REGISTER')) ?? null;
	if (!flag?.enabled) {
		throw new AppError('FORBIDDEN', 'Companies join FOW by invitation only. Contact your admin.');
	}

	const result = await auth.api.signUpEmail({
		body: { email: input.email, password: input.password, name: input.name }
	});
	if (!result?.user?.id) {
		throw new AppError('BAD_REQUEST', 'Sign-up failed.');
	}
	// See registerFreelancer: Better Auth returns an un-persisted synthetic user
	// for duplicate emails when requireEmailVerification is true.
	const persisted = await prisma.user.findUnique({
		where: { id: result.user.id },
		select: { id: true }
	});
	if (!persisted) return { userId: result.user.id };
	await prisma.user.update({
		where: { id: result.user.id },
		data: { role: UserRole.COMPANY, isActive: true }
	});
	await companyRepo.createEmpty(result.user.id, input.companyName);
	return { userId: result.user.id };
}
