/**
 * Provision a ready-to-use COMPANY account with a known password.
 *
 *   tsx scripts/create-company.ts <email> "<Company Name>" [password]
 *
 * Reuses the same path as the /admin/invites UI:
 *   1. createCompanyInvite() — creates the User (role=COMPANY), an empty
 *      CompanyProfile, the CompanyInvite row, and a password-reset token.
 *   2. We then consume that reset token with a chosen password (the supported
 *      Better Auth flow, identical to /accept-invite), so the account is usable
 *      immediately without the email round-trip.
 *
 * Password policy (src/lib/server/auth.ts): >= 8 chars and >= 1 digit.
 */
import 'dotenv/config';
import { randomInt } from 'node:crypto';
import { prisma } from '../src/lib/server/db';
import { auth } from '../src/lib/server/auth';
import {
	createCompanyInvite,
	completeInviteForUserId
} from '../src/lib/server/services/invite.service';

const [, , emailArg, nameArg, passwordArg] = process.argv;

const email = (emailArg ?? 'learn2earn@gmail.com').toLowerCase().trim();
const companyName = nameArg ?? 'Learn2Earn';
const password = passwordArg ?? `Learn2Earn-${randomInt(1000, 9999)}`;

if (password.length < 8 || !/\d/.test(password)) {
	console.error('Password must be at least 8 characters and contain a digit.');
	process.exit(1);
}

async function main() {
	// 1. Create (or reuse) the COMPANY user + profile + invite + reset token.
	await createCompanyInvite(null, { email, companyName });

	const user = await prisma.user.findUnique({ where: { email } });
	if (!user) throw new Error('User not found after invite creation.');

	// 2. Grab the freshest reset token Better Auth just stored for this user.
	const verification = await prisma.verification.findFirst({
		where: { value: user.id, identifier: { startsWith: 'reset-password:' } },
		orderBy: { createdAt: 'desc' }
	});
	if (!verification) throw new Error('No reset-password token found for user.');
	const token = verification.identifier.slice('reset-password:'.length);

	// 3. Set the chosen password via the supported reset flow.
	const result = await auth.api.resetPassword({ body: { newPassword: password, token } });
	if (result?.status === false) throw new Error('resetPassword returned status=false.');

	// 4. Mark the invite accepted (parity with /accept-invite).
	await completeInviteForUserId(user.id);

	console.log('\n✓ Company account ready.\n');
	console.log(`  Company:   ${companyName}`);
	console.log(`  Email:     ${email}`);
	console.log(`  Password:  ${password}`);
	console.log(`  Role:      ${user.role}`);
	console.log(`  User ID:   ${user.id}\n`);
}

main()
	.catch((e) => {
		console.error(e);
		process.exitCode = 1;
	})
	.finally(() => prisma.$disconnect());
