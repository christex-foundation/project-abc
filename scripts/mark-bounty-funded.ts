/**
 * One-off remediation: manually mark a bounty as FUNDED when its escrow
 * account has been credited but the Monime webhook never fired.
 *
 *   tsx scripts/mark-bounty-funded.ts <slug>
 *
 * Idempotent — re-running on a FUNDED bounty is a no-op.
 *
 * Note: this script intentionally avoids importing `monime/client` and
 * `notification.service` because they pull in `$env/dynamic/private`, a
 * SvelteKit virtual module that doesn't resolve outside the vite runtime.
 * The Monime balance check is inlined via raw fetch instead.
 */
import 'dotenv/config';
import { BountyStatus, PaymentStatus } from '@prisma/client';
import { prisma } from '../src/lib/server/db';
import * as bountyRepo from '../src/lib/server/repositories/bounty.repo';
import * as paymentRepo from '../src/lib/server/repositories/payment.repo';

const args = process.argv.slice(2);
const force = args.includes('--force');
const slugArg = args.find((a) => !a.startsWith('--'));

if (!slugArg) {
	console.error('Usage: tsx scripts/mark-bounty-funded.ts <slug> [--force]');
	process.exit(1);
}

function envOrDie(name: string): string {
	const v = process.env[name];
	if (!v) {
		console.error(`${name} is not set`);
		process.exit(1);
	}
	return v;
}

async function fetchEscrowBalance(accountId: string): Promise<number> {
	const baseUrl = process.env.MONIME_BASE_URL?.trim() || 'https://api.monime.io';
	const url = `${baseUrl}/v1/financial-accounts/${encodeURIComponent(accountId)}?withBalance=true`;
	const res = await fetch(url, {
		method: 'GET',
		headers: {
			authorization: `Bearer ${envOrDie('MONIME_ACCESS_TOKEN')}`,
			'monime-space-id': envOrDie('MONIME_SPACE_ID'),
			'monime-version': envOrDie('MONIME_VERSION'),
			accept: 'application/json'
		}
	});
	const text = await res.text();
	if (!res.ok) {
		console.error(`Monime GET ${url} failed (${res.status}): ${text}`);
		process.exit(1);
	}
	const parsed = text ? JSON.parse(text) : {};
	const account = parsed.data ?? parsed.result ?? parsed;
	const available = account?.balance?.available?.value;
	if (typeof available !== 'number') {
		console.error('Monime response missing balance.available.value:', text);
		process.exit(1);
	}
	return available;
}

async function main() {
	const bounty = await bountyRepo.findBountyBySlug(slugArg);
	if (!bounty) {
		console.error(`bounty not found: ${slugArg}`);
		process.exit(1);
	}

	if (bounty.status === BountyStatus.FUNDED) {
		console.log(`bounty ${bounty.id} already FUNDED, skipping`);
		return;
	}
	if (bounty.status !== BountyStatus.DRAFT) {
		console.error(`bounty ${bounty.id} is in status ${bounty.status}, refusing to act`);
		process.exit(1);
	}
	if (!bounty.escrowFinancialAccountId) {
		console.error(`bounty ${bounty.id} has no escrow account — nothing to verify`);
		process.exit(1);
	}

	if (force) {
		console.log(`--force set, skipping Monime balance check for ${bounty.escrowFinancialAccountId}`);
	} else {
		const available = await fetchEscrowBalance(bounty.escrowFinancialAccountId);
		console.log(
			`escrow ${bounty.escrowFinancialAccountId} balance: ${available} ${bounty.currency} (need ${bounty.totalPrizePool})`
		);
		if (available < bounty.totalPrizePool) {
			console.error(
				`insufficient balance: have ${available}, need ${bounty.totalPrizePool}. ` +
					`Pass --force to override (e.g. when Monime has taken a processing fee).`
			);
			process.exit(1);
		}
	}

	const payment = await prisma.$transaction(async (tx) => {
		const deposit = await paymentRepo.createDeposit(
			{
				bountyId: bounty.id,
				amount: bounty.totalPrizePool,
				currency: bounty.currency,
				checkoutSessionId: bounty.checkoutSessionId ?? '',
				monimePaymentId: `manual:${bounty.id}:${Date.now()}`,
				status: PaymentStatus.COMPLETED
			},
			tx
		);
		await bountyRepo.markFunded(bounty.id, bounty.totalPrizePool, tx);
		return deposit;
	});

	console.log(
		`✓ marked bounty ${bounty.id} as FUNDED, escrowFundedAmount=${bounty.totalPrizePool}, paymentId=${payment.id}`
	);
}

main()
	.then(async () => prisma.$disconnect())
	.catch(async (e) => {
		console.error(e);
		await prisma.$disconnect();
		process.exit(1);
	});
