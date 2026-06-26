// Company-agent proof-of-concept harness (RESEARCH SPIKE — see
// company-agent-spike.md).
//
// Answers the one question that decides whether this feature is worth building:
// GIVEN a company's memory + some social/website text, does Claude produce
// useful, on-policy bounty/project proposals — and at what cost and latency?
//
// It runs the EXACT prompt builders a service would use (no prompt drift) via
// completeJSONWithMeta across Haiku / Sonnet / Opus against a few fixture
// "companies", prints the proposals for eyeballing, and a per-model table of
// structural-quality / skill-grounding / cost / latency. It NEVER writes to the
// DB and only READS the live skill taxonomy to score skill grounding (mirrors
// scripts/ai-eval.ts).
//
// Usage:  npm run agent:poc   (requires ANTHROPIC_API_KEY; reads DATABASE_URL)

import 'dotenv/config';
import { prisma } from '../src/lib/server/db';
import {
	completeJSONWithMeta,
	MODEL_FAST,
	MODEL_DEFAULT,
	MODEL_DEEP
} from '../src/lib/server/ai/claude';
import * as agentPrompt from '../src/lib/server/ai/company-agent.prompt';
import { companyAgentOutput, type CompanyAgentOutput } from '../src/lib/validators/ai';
import * as skillRepo from '../src/lib/server/repositories/skill.repo';

// --- pricing (matches ai-eval.ts) -------------------------------------------
// APPROXIMATE USD per million tokens — drives the cost column only.
const PRICE_PER_MTOK: Record<string, { in: number; out: number }> = {
	[MODEL_FAST]: { in: 1.0, out: 5.0 },
	[MODEL_DEFAULT]: { in: 3.0, out: 15.0 },
	[MODEL_DEEP]: { in: 15.0, out: 75.0 }
};

const MODELS = [MODEL_FAST, MODEL_DEFAULT, MODEL_DEEP];

function costUsd(model: string, inTok: number, outTok: number): number {
	const p = PRICE_PER_MTOK[model] ?? { in: 0, out: 0 };
	return (inTok / 1_000_000) * p.in + (outTok / 1_000_000) * p.out;
}

// --- fixtures ---------------------------------------------------------------
// Each fixture is a stand-in for what the real feature would assemble at runtime:
// a per-company memory doc + recent source snippets + already-posted titles.

type CompanyFixture = {
	label: string;
	memory: string;
	sources: agentPrompt.AgentSource[];
	existingTitles: string[];
};

const COMPANY_FIXTURES: CompanyFixture[] = [
	{
		label: 'logistics SME (Freetown)',
		memory: [
			'Swift Wheels is a Freetown-based delivery and courier company serving small shops.',
			'Tone: practical, no-nonsense. Past work posted: a logo bounty (done).',
			'Goals: grow online orders, look professional, hire local talent for one-off design and content work.'
		].join('\n'),
		sources: [
			{
				label: 'website: services page',
				text: 'We deliver across Freetown in under 3 hours. Shops can book pickups by WhatsApp. We are launching a same-day grocery delivery service next month and want more shops to sign up.'
			},
			{
				label: 'facebook post (pasted)',
				text: 'Big news! 🚚 Same-day grocery delivery is coming. Tell your favourite shop to partner with Swift Wheels. We are also hiring riders.'
			}
		],
		existingTitles: ['Logo design for Swift Wheels']
	},
	{
		label: 'fintech startup',
		memory: [
			'KashLink is an early-stage fintech building a mobile wallet for market traders.',
			'Tone: modern, ambitious. No work posted yet.',
			'Needs: brand assets, explainer content, and help building a simple marketing site.'
		].join('\n'),
		sources: [
			{
				label: 'blog: launch announcement',
				text: 'We just closed our pre-seed round. Over the next quarter we will pilot with 200 traders in Bo. We need to explain how the wallet works to non-technical users and build trust.'
			},
			{
				label: 'x/twitter (pasted)',
				text: 'Cash is risky to carry at the market. KashLink lets you pay and save from your phone. Pilot starting in Bo soon. 🇸🇱'
			}
		],
		existingTitles: []
	},
	{
		label: 'media / events shop',
		memory: [
			'Lumen Studios is a small media shop doing photography, short video, and event coverage.',
			'Tone: creative, warm. Past work: posted a short-video bounty (done).',
			'Wants steady help with editing and social content during a busy event season.'
		].join('\n'),
		sources: [
			{
				label: 'instagram (pasted)',
				text: 'Wedding and conference season is here! Booked solid through December. Swipe for highlights from last weekend’s tech summit. 📸'
			}
		],
		existingTitles: ['30-second promo video for Lumen Studios']
	}
];

// --- structural checks ------------------------------------------------------

type Sample = {
	ok: boolean;
	structuralPass: boolean;
	proposalCount: number;
	issues: string[];
	latencyMs: number;
	inputTokens: number;
	outputTokens: number;
	costUsd: number;
};

function checkAgent(
	out: CompanyAgentOutput,
	fx: CompanyFixture,
	resolves: (name: string) => boolean
): { structuralPass: boolean; issues: string[] } {
	const issues: string[] = [];
	if (out.proposals.length < 2) issues.push(`only ${out.proposals.length} proposal(s) (want 2–6)`);

	const existing = new Set(fx.existingTitles.map((t) => t.trim().toLowerCase()));

	for (const [i, p] of out.proposals.entries()) {
		const tag = `proposal #${i + 1}`;
		if (!p.rationale?.trim()) issues.push(`${tag}: empty rationale`);

		if (p.kind === 'BOUNTY') {
			const b = p.bounty;
			if (!b) {
				issues.push(`${tag}: no bounty draft`);
				continue;
			}
			if (existing.has(b.title.trim().toLowerCase()))
				issues.push(`${tag}: duplicates posted title`);
			const regular = b.prizeTiers.filter((t) => t.position !== 99);
			if (regular.length < 1) issues.push(`${tag}: no regular prize tier`);
			if (b.prizeTiers.some((t) => t.amount <= 0)) issues.push(`${tag}: non-positive prize`);
			const bad = b.skills.filter((s) => !resolves(s));
			if (bad.length) issues.push(`${tag}: hallucinated skills: ${bad.join(', ')}`);
		} else {
			const pr = p.project;
			if (!pr) {
				issues.push(`${tag}: no project draft`);
				continue;
			}
			if (existing.has(pr.title.trim().toLowerCase()))
				issues.push(`${tag}: duplicates posted title`);
			if (pr.milestones.length < 1) issues.push(`${tag}: no milestones`);
			if (pr.milestones.some((m) => m.amount <= 0)) issues.push(`${tag}: non-positive milestone`);
			const bad = pr.skills.filter((s) => !resolves(s));
			if (bad.length) issues.push(`${tag}: hallucinated skills: ${bad.join(', ')}`);
		}
	}
	return { structuralPass: issues.length === 0, issues };
}

function hardFail(issues: string[] = ['hard fail (null / no key)']): Sample {
	return {
		ok: false,
		structuralPass: false,
		proposalCount: 0,
		issues,
		latencyMs: 0,
		inputTokens: 0,
		outputTokens: 0,
		costUsd: 0
	};
}

async function runAgent(
	model: string,
	fx: CompanyFixture,
	resolves: (n: string) => boolean
): Promise<Sample> {
	try {
		const meta = await completeJSONWithMeta({
			schema: companyAgentOutput,
			model,
			system: agentPrompt.buildSystem(SKILL_NAMES),
			messages: [
				{
					role: 'user',
					content: agentPrompt.buildUserMessage({
						memory: fx.memory,
						sources: fx.sources,
						existingTitles: fx.existingTitles
					})
				}
			]
		});
		if (!meta) return hardFail();
		const c = checkAgent(meta.data, fx, resolves);
		// Print the proposals so a human can judge usefulness (the real question).
		printProposals(model, fx, meta.data);
		return {
			ok: true,
			structuralPass: c.structuralPass,
			proposalCount: meta.data.proposals.length,
			issues: c.issues,
			latencyMs: meta.latencyMs,
			inputTokens: meta.usage.inputTokens,
			outputTokens: meta.usage.outputTokens,
			costUsd: costUsd(model, meta.usage.inputTokens, meta.usage.outputTokens)
		};
	} catch (e) {
		return hardFail([`threw: ${String((e as Error)?.message ?? e)}`]);
	}
}

function printProposals(model: string, fx: CompanyFixture, out: CompanyAgentOutput) {
	console.log(`\n  ── ${fx.label} × ${model} ──`);
	for (const [i, p] of out.proposals.entries()) {
		const draft = p.kind === 'BOUNTY' ? p.bounty : p.project;
		const title = draft?.title ?? '(no title)';
		console.log(`    ${i + 1}. [${p.kind}] ${title}`);
		console.log(`       why: ${p.rationale}`);
		if (p.kind === 'BOUNTY' && p.bounty) {
			const top = p.bounty.prizeTiers.find((t) => t.position === 1);
			console.log(
				`       prize #1: Le ${top ? (top.amount / 100).toFixed(2) : '?'} · skills: ${p.bounty.skills.join(', ') || '—'}`
			);
		} else if (p.kind === 'PROJECT' && p.project) {
			const cap = p.project.milestones.reduce((a, m) => a + m.amount, 0);
			console.log(
				`       ${p.project.milestones.length} milestone(s), ~Le ${(cap / 100).toFixed(2)} · skills: ${p.project.skills.join(', ') || '—'}`
			);
		}
	}
}

// --- aggregation + output (matches ai-eval.ts) ------------------------------

type Agg = {
	model: string;
	n: number;
	structPass: number;
	avgProposals: number;
	avgLatency: number;
	avgIn: number;
	avgOut: number;
	avgCost: number;
};

function aggregate(model: string, samples: Sample[]): Agg {
	const okSamples = samples.filter((s) => s.ok);
	const denom = okSamples.length || 1;
	return {
		model,
		n: samples.length,
		structPass: samples.filter((s) => s.structuralPass).length / samples.length,
		avgProposals: okSamples.reduce((a, s) => a + s.proposalCount, 0) / denom,
		avgLatency: okSamples.reduce((a, s) => a + s.latencyMs, 0) / denom,
		avgIn: okSamples.reduce((a, s) => a + s.inputTokens, 0) / denom,
		avgOut: okSamples.reduce((a, s) => a + s.outputTokens, 0) / denom,
		avgCost: okSamples.reduce((a, s) => a + s.costUsd, 0) / denom
	};
}

function pct(x: number): string {
	return `${Math.round(x * 100)}%`;
}

function printTable(aggs: Agg[]) {
	console.log('\n=== Company agent — proposal quality / cost ===');
	const head = ['model', 'struct', '#prop', 'lat ms', 'in tok', 'out tok', 'cost $'].map((h) =>
		h.padEnd(h === 'model' ? 20 : 8)
	);
	console.log(head.join(' '));
	for (const a of aggs) {
		console.log(
			[
				a.model.padEnd(20),
				pct(a.structPass).padEnd(8),
				a.avgProposals.toFixed(1).padEnd(8),
				Math.round(a.avgLatency).toString().padEnd(8),
				Math.round(a.avgIn).toString().padEnd(8),
				Math.round(a.avgOut).toString().padEnd(8),
				a.avgCost.toFixed(5).padEnd(8)
			].join(' ')
		);
	}
}

function suggestPick(aggs: Agg[]): string {
	const ordered = [...aggs].sort((a, b) => a.avgCost - b.avgCost);
	const winner = ordered.find((a) => a.structPass >= 0.9);
	return winner
		? `${winner.model} (cheapest clearing the bar)`
		: 'none cleared the bar — review issues above';
}

let SKILL_NAMES: string[] = [];

async function main() {
	if (!process.env.ANTHROPIC_API_KEY) {
		console.error('ANTHROPIC_API_KEY is not set — nothing to evaluate. Set it and re-run.');
		process.exit(1);
	}

	// Live skill taxonomy: grounds the prompt and lets us flag hallucinations.
	const categories = await skillRepo.listAllWithCategories();
	SKILL_NAMES = categories.flatMap((c) => c.skills.map((s) => s.name));
	const known = new Set(SKILL_NAMES.map((s) => s.trim().toLowerCase()));
	const resolves = (name: string) => known.has(name.trim().toLowerCase());
	if (SKILL_NAMES.length === 0) {
		console.warn(
			'⚠ No skills in the DB — skill-grounding checks will fail. Run `npm run db:seed` first.'
		);
	}

	console.log(
		`Company-agent POC — ${COMPANY_FIXTURES.length} fixture companies × ${MODELS.length} models.`
	);
	console.log('Cost figures use APPROXIMATE pricing — treat as relative, not exact.');

	const aggs: Agg[] = [];
	for (const model of MODELS) {
		const samples: Sample[] = [];
		for (const fx of COMPANY_FIXTURES) {
			const s = await runAgent(model, fx, resolves);
			if (s.issues.length) console.log(`       ⚠ issues: ${s.issues.join('; ')}`);
			samples.push(s);
		}
		aggs.push(aggregate(model, samples));
	}

	printTable(aggs);
	console.log(`  → suggested pick: ${suggestPick(aggs)}`);
	console.log('\nEyeball the proposals above: on-policy money (plain Leones), real skills,');
	console.log('sensible BOUNTY-vs-PROJECT split, and no duplicates of already-posted work.');
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
