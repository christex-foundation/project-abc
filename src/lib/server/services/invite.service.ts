import { randomBytes } from 'node:crypto';
import { UserRole, type CompanyInvite } from '@prisma/client';
import { auth } from '../auth';
import { prisma } from '../db';
import { AppError } from '../http';
import { requireRole, type AuthedUser } from '../auth-helpers';
import * as inviteRepo from '../repositories/invite.repo';
import * as companyRepo from '../repositories/company.repo';
import * as userRepo from '../repositories/user.repo';
import { sendEmail } from '../email/send';

export type CreateInviteInput = {
	email: string;
	companyName?: string | null;
	name?: string | null;
};

/**
 * Issue a company invite. Idempotent on the (email, PENDING) tuple:
 *   - If a User already exists for that email, we keep them and re-issue the
 *     reset link (parity with scripts/seed-invite.ts).
 *   - If a PENDING CompanyInvite already exists, we reuse it and re-send the
 *     email rather than 409'ing — administratively useful.
 */
export async function createCompanyInvite(
	caller: AuthedUser | null,
	input: CreateInviteInput
): Promise<{ invite: CompanyInvite; resetUrl?: string }> {
	if (caller) requireRole(caller, 'ADMIN');
	// CLI flow (no session) is permitted — scripts/seed-invite.ts uses it.
	const invitedById = caller?.id ?? (await resolveSystemAdminId());

	const email = input.email.toLowerCase().trim();
	if (!email) throw new AppError('BAD_REQUEST', 'Email is required.');

	// 1. Ensure (or reuse) the PENDING invite row.
	let invite = await inviteRepo.findPendingByEmail(email);
	if (!invite) {
		invite = await inviteRepo.create({
			email,
			companyName: input.companyName ?? null,
			invitedById
		});
	}

	// 2. Ensure a User exists with role=COMPANY.
	let user = await userRepo.findByEmail(email);
	if (!user) {
		const password = randomBytes(32).toString('hex');
		const result = await auth.api.signUpEmail({
			body: { email, password, name: input.name ?? input.companyName ?? email }
		});
		if (!result?.user?.id) {
			throw new AppError('INTERNAL', 'Failed to create user for invite.');
		}
		await prisma.user.update({
			where: { id: result.user.id },
			data: { role: UserRole.COMPANY, isActive: true }
		});
		user = await userRepo.findById(result.user.id);
	} else if (user.role !== UserRole.COMPANY) {
		// Don't trample a freelancer/admin account — surface a clear error instead.
		throw new AppError('CONFLICT', `User ${email} already exists with role ${user.role}.`);
	}

	if (!user) throw new AppError('INTERNAL', 'User lookup failed after creation.');

	// 3. Pre-create an empty CompanyProfile (idempotent).
	await companyRepo.ensureForUser(user.id, input.companyName);

	// 4. Trigger the password-reset link → /accept-invite.
	await auth.api.requestPasswordReset({
		body: { email, redirectTo: '/accept-invite' }
	});

	// 5. Send the invite-company email (in dev, this prints to the console with
	//    the same reset URL Better Auth just generated — the user has already
	//    received the reset-password email separately).
	await sendEmail({
		to: email,
		template: 'invite-company',
		props: {
			email,
			companyName: input.companyName ?? null,
			url: `${process.env.PUBLIC_APP_URL ?? 'http://localhost:5173'}/accept-invite`
		}
	});

	return { invite };
}

export async function completeInvite(email: string, acceptedUserId: string) {
	const pending = await inviteRepo.findPendingByEmail(email.toLowerCase().trim());
	if (!pending) return null;
	return inviteRepo.markAccepted(pending.id, acceptedUserId);
}

/**
 * Look up the user id behind a Better Auth password-reset token. Must be
 * called **before** `auth.api.resetPassword`, which deletes the verification
 * row on success.
 *
 * Better Auth's password reset stores `identifier = "reset-password:<token>"`
 * and `value = userId` in the verification table (see
 * better-auth/dist/api/routes/password.mjs).
 */
export async function findUserIdForResetToken(token: string): Promise<string | null> {
	const verification = await prisma.verification.findFirst({
		where: { identifier: `reset-password:${token}` },
		orderBy: { createdAt: 'desc' }
	});
	return verification?.value ?? null;
}

/**
 * Reconcile a successful /accept-invite reset with the matching CompanyInvite
 * row, given the user id obtained ahead of `resetPassword`.
 */
export async function completeInviteForUserId(userId: string) {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { email: true }
	});
	if (!user?.email) return null;
	return completeInvite(user.email, userId);
}

export async function listInvites(caller: AuthedUser) {
	requireRole(caller, 'ADMIN');
	return inviteRepo.listAll();
}

export type CreateAdminInviteInput = {
	email: string;
	name?: string | null;
};

/**
 * Provision a new ADMIN-role user and send a password-reset link. Unlike
 * companies, admin invites do not create a CompanyInvite row — the User row
 * with role=ADMIN is the source of truth, and /admin/admins lists from there.
 *
 * Refuses to overwrite an existing COMPANY account (which has business data
 * attached). Promotes an existing FREELANCER to ADMIN if the caller passes
 * `promoteExisting` semantics by calling again — for now we just error so the
 * admin makes the role change explicitly via the users page.
 */
export async function createAdminInvite(
	caller: AuthedUser,
	input: CreateAdminInviteInput
): Promise<{ user: { id: string; email: string; name: string | null } }> {
	requireRole(caller, 'ADMIN');
	const email = input.email.toLowerCase().trim();
	if (!email) throw new AppError('BAD_REQUEST', 'Email is required.');

	let user = await userRepo.findByEmail(email);
	if (!user) {
		const password = randomBytes(32).toString('hex');
		const result = await auth.api.signUpEmail({
			body: { email, password, name: input.name ?? email }
		});
		if (!result?.user?.id) {
			throw new AppError('INTERNAL', 'Failed to create user for admin invite.');
		}
		await prisma.user.update({
			where: { id: result.user.id },
			data: { role: UserRole.ADMIN, isActive: true }
		});
		user = await userRepo.findById(result.user.id);
	} else if (user.role === UserRole.COMPANY) {
		throw new AppError(
			'CONFLICT',
			`User ${email} already exists as a COMPANY. Demote them first if you want to make them an admin.`
		);
	} else if (user.role === UserRole.ADMIN) {
		// Already an admin — re-send the reset link (idempotent).
	} else {
		// FREELANCER → promote to ADMIN.
		await prisma.user.update({
			where: { id: user.id },
			data: { role: UserRole.ADMIN, isActive: true }
		});
	}

	if (!user) throw new AppError('INTERNAL', 'User lookup failed after creation.');

	// Trigger the password-reset link → /accept-invite.
	await auth.api.requestPasswordReset({
		body: { email, redirectTo: '/accept-invite' }
	});

	return { user: { id: user.id, email: user.email, name: user.name } };
}

async function resolveSystemAdminId(): Promise<string> {
	const admin = await prisma.user.findFirst({
		where: { role: UserRole.ADMIN },
		orderBy: { createdAt: 'asc' }
	});
	if (!admin) {
		throw new AppError('INTERNAL', 'No ADMIN user exists yet. Run `npm run db:seed` first.');
	}
	return admin.id;
}
