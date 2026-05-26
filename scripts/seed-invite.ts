/**
 * Admin CLI fallback for company invites.
 *
 *   npx tsx scripts/seed-invite.ts <email> [companyName]
 *
 * Mirrors the /admin/invites UI exactly — both paths call invite.service so
 * any logic change stays in one place.
 */
import 'dotenv/config';
import { prisma } from '../src/lib/server/db';
import { createCompanyInvite } from '../src/lib/server/services/invite.service';

const [, , emailArg, companyNameArg] = process.argv;

if (!emailArg) {
	console.error('Usage: tsx scripts/seed-invite.ts <email> [companyName]');
	process.exit(1);
}

async function main() {
	const { invite } = await createCompanyInvite(null, {
		email: emailArg,
		companyName: companyNameArg ?? null
	});

	console.log('✓ Invite issued.');
	console.log(`  id:           ${invite.id}`);
	console.log(`  email:        ${invite.email}`);
	console.log(`  companyName:  ${invite.companyName ?? '(none)'}`);
	console.log(`  status:       ${invite.status}`);
	console.log('');
	console.log('Look for the reset-password URL in the dev-mode email log above.');
}

main()
	.then(async () => prisma.$disconnect())
	.catch(async (e) => {
		console.error(e);
		await prisma.$disconnect();
		process.exit(1);
	});
