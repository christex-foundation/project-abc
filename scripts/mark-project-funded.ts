/**
 * One-off remediation: manually mark an AWARDED project as funded (ACTIVE)
 * when its escrow account has been credited but the Monime webhook never fired
 * — or, in dev, when there is no real Monime escrow account at all.
 *
 *   tsx scripts/mark-project-funded.ts <slug> [--force]
 *
 * Mirrors the DB transition in `project-escrow.service.handleFundingCompleted`:
 * create an ESCROW_DEPOSIT payment, flip the project AWARDED → ACTIVE, and
 * activate the first milestone.
 *
 * Idempotent — re-running on an ACTIVE project is a no-op.
 *
 * Pass --force to skip the Monime balance check (required when the project has
 * no escrow account yet, e.g. seeded dev projects).
 *
 * Note: this script intentionally avoids importing `monime/client` and
 * `notification.service` because they pull in `$env/dynamic/private`, a
 * SvelteKit virtual module that doesn't resolve outside the vite runtime.
 * The Monime balance check is inlined via raw fetch instead.
 */
import 'dotenv/config';
import { PaymentStatus, ProjectStatus } from '@prisma/client';
import { prisma } from '../src/lib/server/db';
import * as projectRepo from '../src/lib/server/repositories/project.repo';
import * as paymentRepo from '../src/lib/server/repositories/payment.repo';
import * as milestoneRepo from '../src/lib/server/repositories/milestone.repo';

const args = process.argv.slice(2);
const force = args.includes('--force');
const slugArg = args.find((a) => !a.startsWith('--'));

if (!slugArg) {
	console.error('Usage: tsx scripts/mark-project-funded.ts <slug> [--force]');
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
	const project = await projectRepo.findProjectBySlug(slugArg);
	if (!project) {
		console.error(`project not found: ${slugArg}`);
		process.exit(1);
	}

	if (project.status === ProjectStatus.ACTIVE) {
		console.log(`project ${project.id} already ACTIVE, skipping`);
		return;
	}
	if (project.status !== ProjectStatus.AWARDED) {
		console.error(`project ${project.id} is in status ${project.status}, refusing to act`);
		process.exit(1);
	}

	const amount = project.budgetCap;

	if (project.escrowFinancialAccountId) {
		if (force) {
			console.log(
				`--force set, skipping Monime balance check for ${project.escrowFinancialAccountId}`
			);
		} else {
			const available = await fetchEscrowBalance(project.escrowFinancialAccountId);
			console.log(
				`escrow ${project.escrowFinancialAccountId} balance: ${available} ${project.currency} (need ${amount})`
			);
			if (available < amount) {
				console.error(
					`insufficient balance: have ${available}, need ${amount}. ` +
						`Pass --force to override (e.g. when Monime has taken a processing fee).`
				);
				process.exit(1);
			}
		}
	} else if (!force) {
		console.error(
			`project ${project.id} has no escrow account — pass --force to fund it manually anyway.`
		);
		process.exit(1);
	} else {
		console.log('--force set, project has no escrow account; funding without a Monime balance check');
	}

	const result = await prisma.$transaction(async (tx) => {
		const deposit = await paymentRepo.createProjectDeposit(
			{
				projectId: project.id,
				amount,
				currency: project.currency,
				checkoutSessionId: project.checkoutSessionId ?? '',
				monimePaymentId: `manual:${project.id}:${Date.now()}`,
				status: PaymentStatus.COMPLETED
			},
			tx
		);
		await projectRepo.markFunded(project.id, amount, tx);
		const milestone = await milestoneRepo.activateFirst(project.id, tx);
		return { deposit, milestone };
	});

	console.log(
		`✓ marked project ${project.id} as ACTIVE, escrowFundedAmount=${amount}, ` +
			`paymentId=${result.deposit.id}` +
			(result.milestone
				? `, activated milestone position ${result.milestone.position}`
				: ', no PENDING milestone to activate')
	);
}

main()
	.then(async () => prisma.$disconnect())
	.catch(async (e) => {
		console.error(e);
		await prisma.$disconnect();
		process.exit(1);
	});
