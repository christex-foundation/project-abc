/**
 * One-off cleanup: permanently delete all dev/test bounties and submissions,
 * plus their financial-ledger byproducts, ahead of posting real bounties.
 *
 *   tsx scripts/wipe-test-bounties.ts            # dry run — prints counts, no writes
 *   tsx scripts/wipe-test-bounties.ts --confirm  # actually wipes (irreversible)
 *
 * What it removes (full financial reset):
 *   - all Payment rows                (incl. project-linked; projects themselves stay)
 *   - all CreditTransaction rows      (ledger), then resets cached freelancer balances
 *   - all Bounty rows                 (cascades PrizeTier, BountySkill, Submission)
 *
 * What it preserves: companies, freelancers, users, skills, projects, settings.
 *
 * No Monime refund is triggered for funded-escrow bounties (test/sandbox money).
 * All deletes run inside a single transaction — any failure rolls everything back.
 */
import 'dotenv/config';
import { prisma } from '../src/lib/server/db';

const confirm = process.argv.slice(2).includes('--confirm');

async function counts() {
	const [bounties, submissions, payments, credits] = await Promise.all([
		prisma.bounty.count(),
		prisma.submission.count(),
		prisma.payment.count(),
		prisma.creditTransaction.count()
	]);
	return { bounties, submissions, payments, credits };
}

async function main() {
	const before = await counts();
	console.log('Current data:', before);

	if (!confirm) {
		console.log('\nDRY RUN — no changes made.');
		console.log('Would delete: all payments, all credit transactions, all bounties');
		console.log('(cascades submissions, prize tiers, bounty skills) and reset cached');
		console.log('freelancer credit balances to 0.');
		console.log('\nRe-run with --confirm to execute.');
		return;
	}

	console.log('\n--confirm set — wiping in a transaction...');
	await prisma.$transaction([
		prisma.payment.deleteMany(),
		prisma.creditTransaction.deleteMany(),
		prisma.freelancerProfile.updateMany({
			data: { creditsBalance: 0, creditsPeriodKey: null }
		}),
		prisma.bounty.deleteMany()
	]);

	const after = await counts();
	console.log('\nAfter wipe:', after);
	console.log(
		`bounties ${before.bounties}→${after.bounties}, ` +
			`submissions ${before.submissions}→${after.submissions}, ` +
			`payments ${before.payments}→${after.payments}, ` +
			`credits ${before.credits}→${after.credits}`
	);

	const leftover = after.bounties + after.submissions + after.payments + after.credits;
	if (leftover !== 0) {
		console.error(`\nExpected all zero but ${leftover} rows remain.`);
		process.exit(1);
	}
	console.log('\nDone — clean slate ready for real bounties.');
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
