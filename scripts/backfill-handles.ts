/**
 * Backfill public profile handles for existing freelancer/company accounts
 * created before handles existed.
 *
 *   tsx scripts/backfill-handles.ts
 *
 * Idempotent — `ensureHandle` skips users that already have one. Sources the
 * handle from the freelancer displayName / company name, falling back to the
 * user's name then email local-part.
 */
import 'dotenv/config';
import { prisma } from '../src/lib/server/db';
import { ensureHandle } from '../src/lib/server/handle';

async function main() {
	const users = await prisma.user.findMany({
		where: {
			handle: null,
			isActive: true,
			role: { in: ['FREELANCER', 'COMPANY'] }
		},
		select: {
			id: true,
			name: true,
			email: true,
			role: true,
			freelancerProfile: { select: { displayName: true } },
			companyProfile: { select: { companyName: true } }
		}
	});

	console.log(`Found ${users.length} account(s) without a handle.`);
	let done = 0;
	for (const u of users) {
		const source =
			u.role === 'COMPANY'
				? (u.companyProfile?.companyName ?? u.name ?? u.email.split('@')[0])
				: (u.freelancerProfile?.displayName ?? u.name ?? u.email.split('@')[0]);
		const handle = await ensureHandle(u.id, source);
		console.log(`  ${u.role.padEnd(10)} ${u.email} → /u/${handle}`);
		done++;
	}
	console.log(`Backfilled ${done} handle(s).`);
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
