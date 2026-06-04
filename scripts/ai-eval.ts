// AI eval harness (Phase 4 — Evaluation, hardening & measurement).
//
// Runs the production prompts for Flow 1 (decider) and Flow 3 (coach) against a
// set of fixtures, across Haiku / Sonnet / Opus, and prints a per-flow × per-model
// comparison: classification accuracy (Flow 1), deterministic structural-quality
// pass rate, average latency, token usage, and approximate cost per call. The
// point is to answer research question #1 — which model fits each flow — with
// numbers instead of vibes.
//
// It calls the EXACT exported prompt builders the services use (no prompt drift)
// via completeJSONWithMeta (which adds usage + latency). It NEVER writes to the
// DB and only reads the live skill taxonomy to score skill grounding.
//
// Flow 2 (proposal ranking) is intentionally out of this automated run: its
// quality depends on seeded proposals + embeddings, so verify it manually with
// `npm run seed:projects` and the owner shortlist panel.
//
// Usage:  npm run ai:eval   (requires ANTHROPIC_API_KEY; reads DATABASE_URL)

import 'dotenv/config';
import { prisma } from '../src/lib/server/db';
import {
	completeJSONWithMeta,
	MODEL_FAST,
	MODEL_DEFAULT,
	MODEL_DEEP
} from '../src/lib/server/ai/claude';
import * as scopePrompt from '../src/lib/server/ai/scope.prompt';
import * as coachPrompt from '../src/lib/server/ai/coach.prompt';
import * as workspaceCoachPrompt from '../src/lib/server/ai/workspace-coach.prompt';
import {
	scopeOutput,
	coachOutput,
	workspaceCoachOutput,
	type ScopeInput
} from '../src/lib/validators/ai';
import * as skillRepo from '../src/lib/server/repositories/skill.repo';

// --- pricing ----------------------------------------------------------------
// APPROXIMATE USD per million tokens. Update when Anthropic pricing changes —
// these drive the cost column only, not correctness.
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

type ScopeFixture = ScopeInput & { label: string; expect: 'BOUNTY' | 'PROJECT' };

const SCOPE_FIXTURES: ScopeFixture[] = [
	{
		label: 'one logo',
		need: 'I need one logo for my new coffee shop, best entry wins.',
		expect: 'BOUNTY'
	},
	{
		label: 'social banner',
		need: 'A single banner image for my Facebook page promotion.',
		expect: 'BOUNTY'
	},
	{
		label: 'name ideas',
		need: 'I want naming ideas for a new juice brand, pick the best.',
		budgetMinor: 50_000,
		expect: 'BOUNTY'
	},
	{
		label: 'short jingle',
		need: 'A short 15-second jingle for a radio ad, run it as a contest.',
		expect: 'BOUNTY'
	},
	{
		label: 'shop website',
		need: 'I want a small 4-page website for my shop, built and launched.',
		budgetMinor: 800_000,
		timeline: 'about a month',
		expect: 'PROJECT'
	},
	{
		label: 'inventory app',
		need: 'Build me an inventory tracking app for my store over the next two months.',
		expect: 'PROJECT'
	},
	{
		label: 'rebrand rollout',
		need: 'Full rebrand: new identity, then roll it out across packaging and signage with me.',
		budgetMinor: 2_000_000,
		expect: 'PROJECT'
	},
	{
		label: 'ongoing social',
		need: 'Manage my social media accounts and post weekly content for three months.',
		expect: 'PROJECT'
	}
];

type CoachFixture = { label: string; kind: 'BOUNTY' | 'PROJECT'; brief: string };

const PROFILE_SUMMARY = [
	'Headline: Junior graphic designer',
	'Experience level: BEGINNER',
	'Skills: Graphic Design, Logo Design',
	'Bio: Two years freelancing locally, building a portfolio and learning client work.'
].join('\n');

const COACH_FIXTURES: CoachFixture[] = [
	{
		label: 'logo bounty',
		kind: 'BOUNTY',
		brief: [
			'BOUNTY BRIEF',
			'Title: Logo for a coffee shop',
			'Description: We want a clean, modern logo for a new coffee shop called "Kola Roast".',
			'Skills: Graphic Design, Logo Design',
			'Compensation: FIXED, 1 winner(s)',
			'Prize tiers:\n  #1: 50000 (minor units, SLE)'
		].join('\n')
	},
	{
		label: 'flyer bounty',
		kind: 'BOUNTY',
		brief: [
			'BOUNTY BRIEF',
			'Title: Event flyer design',
			'Description: A4 flyer for a community tech meetup, print-ready.',
			'Skills: Graphic Design',
			'Compensation: FIXED, 1 winner(s)'
		].join('\n')
	},
	{
		label: 'website project',
		kind: 'PROJECT',
		brief: [
			'PROJECT BRIEF',
			'Title: 4-page shop website',
			'Description: A 4-page marketing website for a retail shop, mobile-first.',
			'Skills: Web Design',
			'Budget cap: 800000 (minor units, SLE)',
			'Milestone plan:\n  1. Design mockups — 300000 (minor units, SLE)\n  2. Build and launch — 500000 (minor units, SLE)'
		].join('\n')
	},
	{
		label: 'branding project',
		kind: 'PROJECT',
		brief: [
			'PROJECT BRIEF',
			'Title: Brand identity package',
			'Description: Full brand identity (logo, palette, type, guidelines) for a juice startup.',
			'Skills: Graphic Design, Branding',
			'Budget cap: 1200000 (minor units, SLE)',
			'Milestone plan:\n  1. Discovery and moodboard — 400000 (minor units, SLE)\n  2. Identity and guidelines — 800000 (minor units, SLE)'
		].join('\n')
	},
	{
		label: 'poster bounty',
		kind: 'BOUNTY',
		brief: [
			'BOUNTY BRIEF',
			'Title: Campaign poster',
			'Description: A bold poster for a youth job-fair campaign, social + print sizes.',
			'Skills: Graphic Design',
			'Compensation: FIXED, 1 winner(s)',
			'Prize tiers:\n  #1: 75000 (minor units, SLE)'
		].join('\n')
	},
	{
		label: 'catalog project',
		kind: 'PROJECT',
		brief: [
			'PROJECT BRIEF',
			'Title: Product catalog design',
			'Description: A 12-page print-ready product catalog for a furniture shop, with photography layout.',
			'Skills: Graphic Design',
			'Budget cap: 900000 (minor units, SLE)',
			'Milestone plan:\n  1. Layout and first draft — 400000 (minor units, SLE)\n  2. Revisions and print files — 500000 (minor units, SLE)'
		].join('\n')
	}
];

// Flow 4 — workspace coach. Each fixture is a milestone brief + thread + the
// contractor's current draft. `expect` flags what a good response must contain.
type WorkspaceFixture = {
	label: string;
	brief: string;
	thread: string;
	draft: workspaceCoachPrompt.WorkspaceDraft;
	expect: { feedback: boolean; polish: boolean; selfCheck?: boolean };
};

const WORKSPACE_FIXTURES: WorkspaceFixture[] = [
	{
		// Vague "make it pop" change request → must interpret + draft a reply.
		label: 'vague change request',
		brief: [
			'PROJECT BRIEF',
			'Title: Brand identity package',
			'Description: Full brand identity for a juice startup.',
			'',
			'THE MILESTONE BEING DELIVERED',
			'#1: Logo and palette',
			'Reward on approval: 400000 (minor units, SLE)',
			'Current status: CHANGES_REQUESTED',
			'Revision round: #1'
		].join('\n'),
		thread: [
			'[contractor update] First draft of the logo and colour palette. (links: https://drive/x)',
			'[client comment] Thanks but it does not really pop, can you make it more lively?'
		].join('\n'),
		draft: { note: '', deliverables: [], comment: '' },
		expect: { feedback: true, polish: false }
	},
	{
		// Thin note that omits a required deliverable → must flag a gap + polish.
		label: 'thin update note',
		brief: [
			'PROJECT BRIEF',
			'Title: 4-page shop website',
			'Description: A mobile-first marketing website.',
			'Requirements: Must include a deployed staging URL and the source repo.',
			'',
			'THE MILESTONE BEING DELIVERED',
			'#2: Build and launch',
			'Reward on approval: 500000 (minor units, SLE)',
			'Current status: IN_PROGRESS'
		].join('\n'),
		thread: '(no updates or comments yet)',
		draft: {
			note: 'done',
			deliverables: [{ label: 'repo', url: 'https://github.com/x/y' }],
			comment: ''
		},
		expect: { feedback: false, polish: true }
	},
	{
		// No client feedback yet → feedback fields must be null; coach the start.
		label: 'no feedback yet',
		brief: [
			'PROJECT BRIEF',
			'Title: Product catalog design',
			'Description: A 12-page print-ready product catalog.',
			'',
			'THE MILESTONE BEING DELIVERED',
			'#1: Layout and first draft',
			'Reward on approval: 400000 (minor units, SLE)',
			'Current status: IN_PROGRESS'
		].join('\n'),
		thread: '(no updates or comments yet)',
		draft: { note: '', deliverables: [], comment: '' },
		expect: { feedback: false, polish: false }
	},
	{
		// Curt/defensive draft comment → must surface a self-check warning.
		label: 'rude draft comment',
		brief: [
			'PROJECT BRIEF',
			'Title: Brand identity package',
			'',
			'THE MILESTONE BEING DELIVERED',
			'#1: Logo and palette',
			'Reward on approval: 400000 (minor units, SLE)',
			'Current status: CHANGES_REQUESTED',
			'Revision round: #2'
		].join('\n'),
		thread: '[client comment] Could the spacing be tightened a little?',
		draft: {
			note: '',
			deliverables: [],
			comment: 'I already did this, just look properly. Not my problem if you cannot see it.'
		},
		expect: { feedback: true, polish: false, selfCheck: true }
	}
];

// --- structural checks ------------------------------------------------------

type Sample = {
	ok: boolean; // no throw / non-null
	classificationCorrect: boolean | null; // Flow 1 only
	structuralPass: boolean;
	issues: string[];
	latencyMs: number;
	inputTokens: number;
	outputTokens: number;
	costUsd: number;
};

function checkScope(
	out: ReturnType<typeof scopeOutput.parse>,
	fx: ScopeFixture,
	resolves: (name: string) => boolean
): { classificationCorrect: boolean; structuralPass: boolean; issues: string[] } {
	const issues: string[] = [];
	const classificationCorrect = out.type === fx.expect;
	if (!classificationCorrect) issues.push(`classified ${out.type}, expected ${fx.expect}`);

	if (out.type === 'BOUNTY') {
		const b = out.bounty;
		if (!b) issues.push('no bounty draft');
		else {
			const regular = b.prizeTiers.filter((t) => t.position !== 99);
			if (regular.length < 1) issues.push('no regular prize tier');
			if (b.prizeTiers.some((t) => t.amount <= 0)) issues.push('non-positive prize amount');
			const bad = b.skills.filter((s) => !resolves(s));
			if (bad.length) issues.push(`hallucinated skills: ${bad.join(', ')}`);
		}
	} else {
		const p = out.project;
		if (!p) issues.push('no project draft');
		else {
			if (p.milestones.length < 1) issues.push('no milestones');
			if (p.milestones.some((m) => m.amount <= 0)) issues.push('non-positive milestone amount');
			const bad = p.skills.filter((s) => !resolves(s));
			if (bad.length) issues.push(`hallucinated skills: ${bad.join(', ')}`);
		}
	}
	// Structural pass = draft shape is sound (classification reported separately).
	const structuralIssues = issues.filter((i) => !i.startsWith('classified'));
	return { classificationCorrect, structuralPass: structuralIssues.length === 0, issues };
}

function checkCoach(
	out: ReturnType<typeof coachOutput.parse>,
	fx: CoachFixture
): { structuralPass: boolean; issues: string[] } {
	const issues: string[] = [];
	if (out.approach.length < 1) issues.push('no approach points');
	if (out.approach.some((a) => !a.whyUpwork?.trim())) issues.push('missing whyUpwork note');
	if (!out.communication.message?.trim()) issues.push('empty communication message');
	const hasCover = !!out.communication.coverLetter?.trim();
	if (fx.kind === 'PROJECT' && !hasCover) issues.push('project missing cover letter');
	if (fx.kind === 'BOUNTY' && hasCover) issues.push('bounty has stray cover letter');
	return { structuralPass: issues.length === 0, issues };
}

function checkWorkspace(
	out: ReturnType<typeof workspaceCoachOutput.parse>,
	fx: WorkspaceFixture
): { structuralPass: boolean; issues: string[] } {
	const issues: string[] = [];
	const hasFeedback = !!out.clientNeedsSummary?.trim() && !!out.replyDraft?.trim();
	if (fx.expect.feedback && !hasFeedback) {
		issues.push('expected a client-feedback summary + reply');
	}
	if (!fx.expect.feedback && (out.clientNeedsSummary?.trim() || out.replyDraft?.trim())) {
		issues.push('invented client feedback (no feedback in thread)');
	}
	const hasPolish = !!out.polishedNote?.trim();
	if (fx.expect.polish && !hasPolish) issues.push('expected a polished note');
	if (!fx.draft.note.trim() && hasPolish) issues.push('polished a note the contractor never wrote');
	if (fx.expect.selfCheck && out.selfCheck.length < 1) {
		issues.push('expected a self-check warning on a rude draft');
	}
	if (out.gaps.some((g) => !g.point?.trim() || !g.suggestion?.trim())) {
		issues.push('gap missing point/suggestion');
	}
	return { structuralPass: issues.length === 0, issues };
}

// --- runner -----------------------------------------------------------------

async function runScope(
	model: string,
	fx: ScopeFixture,
	resolves: (n: string) => boolean
): Promise<Sample> {
	const skillNames = SKILL_NAMES;
	try {
		const meta = await completeJSONWithMeta({
			schema: scopeOutput,
			model,
			system: scopePrompt.buildSystem(skillNames),
			messages: [{ role: 'user', content: scopePrompt.buildUserMessage(fx) }]
		});
		if (!meta) return hardFail();
		const c = checkScope(meta.data, fx, resolves);
		return {
			ok: true,
			classificationCorrect: c.classificationCorrect,
			structuralPass: c.structuralPass,
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

async function runCoach(model: string, fx: CoachFixture): Promise<Sample> {
	try {
		const meta = await completeJSONWithMeta({
			schema: coachOutput,
			model,
			system: coachPrompt.buildSystem(fx.kind),
			messages: [{ role: 'user', content: coachPrompt.buildUserMessage(fx.brief, PROFILE_SUMMARY) }]
		});
		if (!meta) return hardFail();
		const c = checkCoach(meta.data, fx);
		return {
			ok: true,
			classificationCorrect: null,
			structuralPass: c.structuralPass,
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

async function runWorkspace(model: string, fx: WorkspaceFixture): Promise<Sample> {
	try {
		const meta = await completeJSONWithMeta({
			schema: workspaceCoachOutput,
			model,
			system: workspaceCoachPrompt.buildSystem(),
			messages: [
				{
					role: 'user',
					content: workspaceCoachPrompt.buildUserMessage(fx.brief, fx.thread, fx.draft)
				}
			]
		});
		if (!meta) return hardFail();
		const c = checkWorkspace(meta.data, fx);
		return {
			ok: true,
			classificationCorrect: null,
			structuralPass: c.structuralPass,
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

function hardFail(issues: string[] = ['hard fail (null / no key)']): Sample {
	return {
		ok: false,
		classificationCorrect: false,
		structuralPass: false,
		issues,
		latencyMs: 0,
		inputTokens: 0,
		outputTokens: 0,
		costUsd: 0
	};
}

// --- aggregation + output ---------------------------------------------------

type Agg = {
	model: string;
	n: number;
	classifAcc: number | null; // Flow 1 only
	structPass: number;
	avgLatency: number;
	avgIn: number;
	avgOut: number;
	avgCost: number;
};

function aggregate(model: string, samples: Sample[], withClassification: boolean): Agg {
	const n = samples.length;
	const okSamples = samples.filter((s) => s.ok);
	const denom = okSamples.length || 1;
	return {
		model,
		n,
		classifAcc: withClassification
			? samples.filter((s) => s.classificationCorrect === true).length / n
			: null,
		structPass: samples.filter((s) => s.structuralPass).length / n,
		avgLatency: okSamples.reduce((a, s) => a + s.latencyMs, 0) / denom,
		avgIn: okSamples.reduce((a, s) => a + s.inputTokens, 0) / denom,
		avgOut: okSamples.reduce((a, s) => a + s.outputTokens, 0) / denom,
		avgCost: okSamples.reduce((a, s) => a + s.costUsd, 0) / denom
	};
}

function pct(x: number | null): string {
	return x === null ? '—' : `${Math.round(x * 100)}%`;
}

function printTable(flow: string, aggs: Agg[], withClassification: boolean) {
	console.log(`\n=== ${flow} ===`);
	const head = [
		'model',
		withClassification ? 'classif' : '',
		'struct',
		'lat ms',
		'in tok',
		'out tok',
		'cost $'
	]
		.filter(Boolean)
		.map((h) => h.padEnd(h === 'model' ? 20 : 8));
	console.log(head.join(' '));
	for (const a of aggs) {
		const cols = [
			a.model.padEnd(20),
			...(withClassification ? [pct(a.classifAcc).padEnd(8)] : []),
			pct(a.structPass).padEnd(8),
			Math.round(a.avgLatency).toString().padEnd(8),
			Math.round(a.avgIn).toString().padEnd(8),
			Math.round(a.avgOut).toString().padEnd(8),
			a.avgCost.toFixed(5).padEnd(8)
		];
		console.log(cols.join(' '));
	}
}

// Cheapest model (by avg cost) that clears the quality bar.
function suggestPick(aggs: Agg[], withClassification: boolean): string {
	const clears = (a: Agg) => a.structPass >= 0.9 && (!withClassification || a.classifAcc === 1);
	const ordered = [...aggs].sort((a, b) => a.avgCost - b.avgCost);
	const winner = ordered.find(clears);
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

	// Live skill taxonomy: grounds Flow 1's prompt and lets us flag hallucinations.
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
		`AI eval — ${SCOPE_FIXTURES.length} scope, ${COACH_FIXTURES.length} coach, ${WORKSPACE_FIXTURES.length} workspace-coach fixtures × ${MODELS.length} models.`
	);
	console.log(
		'Flow 2 (proposal ranking) is excluded — verify it manually via `npm run seed:projects`.'
	);
	console.log(
		'Cost figures use APPROXIMATE pricing in PRICE_PER_MTOK — treat as relative, not exact.\n'
	);

	// Flow 1 — decider
	const scopeAggs: Agg[] = [];
	for (const model of MODELS) {
		const samples: Sample[] = [];
		for (const fx of SCOPE_FIXTURES) {
			process.stdout.write(`  scope/${model}/${fx.label}… `);
			const s = await runScope(model, fx, resolves);
			console.log(
				s.structuralPass && s.classificationCorrect ? 'ok' : `issues: ${s.issues.join('; ')}`
			);
			samples.push(s);
		}
		scopeAggs.push(aggregate(model, samples, true));
	}

	// Flow 3 — coach
	const coachAggs: Agg[] = [];
	for (const model of MODELS) {
		const samples: Sample[] = [];
		for (const fx of COACH_FIXTURES) {
			process.stdout.write(`  coach/${model}/${fx.label}… `);
			const s = await runCoach(model, fx);
			console.log(s.structuralPass ? 'ok' : `issues: ${s.issues.join('; ')}`);
			samples.push(s);
		}
		coachAggs.push(aggregate(model, samples, false));
	}

	// Flow 4 — workspace coach
	const workspaceAggs: Agg[] = [];
	for (const model of MODELS) {
		const samples: Sample[] = [];
		for (const fx of WORKSPACE_FIXTURES) {
			process.stdout.write(`  workspace/${model}/${fx.label}… `);
			const s = await runWorkspace(model, fx);
			console.log(s.structuralPass ? 'ok' : `issues: ${s.issues.join('; ')}`);
			samples.push(s);
		}
		workspaceAggs.push(aggregate(model, samples, false));
	}

	printTable('Flow 1 — decider (scope)', scopeAggs, true);
	console.log(`  → suggested pick: ${suggestPick(scopeAggs, true)}`);
	printTable('Flow 3 — coach', coachAggs, false);
	console.log(`  → suggested pick: ${suggestPick(coachAggs, false)}`);
	printTable('Flow 4 — workspace coach', workspaceAggs, false);
	console.log(`  → suggested pick: ${suggestPick(workspaceAggs, false)}`);
	console.log('\nRecord the chosen model per flow in ai-integration.md (Phase 4 → Results).');
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
