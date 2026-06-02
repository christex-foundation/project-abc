// Flow 1 — "Bounty or Project?" decider + brief drafter (AI assist experiment).
//
// A company types 1–2 sentences; Claude decides BOUNTY vs PROJECT and drafts the
// create-form fields. This is SUGGEST-ONLY: nothing here writes the DB. The
// returned draft prefills the existing create forms, and the company edits and
// submits through the unchanged sanitized createBounty/createProject paths.
//
// Trust boundary: the model's output is validated by `scopeOutput` (via
// completeJSON) and re-shaped here — money stays minor-unit Int, relative days
// are resolved to ISO server-side, and suggested skill NAMES are reconciled
// against real Skill rows (unmatched names are dropped, never persisted).

import { requireRole, type AuthedUser } from '../auth-helpers';
import { AppError } from '../http';
import { isAiEnabled } from '../ai/ai-flag';
import { checkRateLimit } from '../ai/rate-limit';
import { completeJSON, MODEL_DEFAULT } from '../ai/claude';
import { buildSystem, buildUserMessage } from '../ai/scope.prompt';
import { scopeInput, scopeOutput, type ScopeResult, type ResolvedSkill } from '$lib/validators/ai';
import * as skillRepo from '../repositories/skill.repo';

const DAY_MS = 86_400_000;

export async function scopeWork(caller: AuthedUser, raw: unknown): Promise<ScopeResult> {
	// Guard order: role (cheap, no I/O) → flag (one cached settings read) →
	// rate-limit (mutates the counter; only after the caller is eligible) → input.
	requireRole(caller, 'COMPANY', 'ADMIN');
	if (!(await isAiEnabled())) {
		throw new AppError('FORBIDDEN', 'AI assist is currently unavailable.');
	}
	checkRateLimit(caller.id, { flow: 'scope' });

	const input = scopeInput.parse(raw);

	// Grounding: pass the live taxonomy names so the model picks real skills, and
	// build a name→id map to reconcile what it returns.
	const categories = await skillRepo.listAllWithCategories();
	const byName = new Map(
		categories.flatMap((c) => c.skills.map((s) => [s.name.trim().toLowerCase(), s.id] as const))
	);
	const skillNames = categories.flatMap((c) => c.skills.map((s) => s.name));

	const out = await completeJSON({
		schema: scopeOutput,
		model: MODEL_DEFAULT,
		system: buildSystem(skillNames),
		messages: [{ role: 'user', content: buildUserMessage(input) }]
	});

	// null only when no key — already gated by isAiEnabled, so this means the key
	// was removed mid-request. Surface the same clean "unavailable" state.
	if (!out) throw new AppError('FORBIDDEN', 'AI assist is currently unavailable.');

	const resolveSkills = (names: string[]): ResolvedSkill[] => {
		const seen = new Set<string>();
		const resolved: ResolvedSkill[] = [];
		for (const n of names) {
			const id = byName.get(n.trim().toLowerCase());
			if (id && !seen.has(id)) {
				seen.add(id);
				resolved.push({ skillId: id, isRequired: false });
			}
		}
		return resolved;
	};

	if (out.type === 'BOUNTY' && out.bounty) {
		const d = out.bounty;
		// Normalize tiers so the prefilled draft already satisfies createBountyInput's
		// refiner: regular tiers must cover exactly positions 1..numberOfWinners and
		// bonus tiers (position 99) must not exceed maxBonusSpots.
		const regular = d.prizeTiers
			.filter((t) => t.position !== 99)
			.sort((a, b) => a.position - b.position)
			.slice(0, d.numberOfWinners)
			.map((t, i) => ({ position: i + 1, amount: t.amount, label: t.label ?? null }));
		const bonus = d.prizeTiers
			.filter((t) => t.position === 99)
			.slice(0, d.maxBonusSpots)
			.map((t) => ({ position: 99, amount: t.amount, label: t.label ?? null }));
		const prizeTiers = [...regular, ...bonus];

		// Keep numberOfWinners consistent with the regular tiers we actually emit so
		// the prefill satisfies the wizard's "positions 1..numberOfWinners" refiner
		// even when the model returned fewer tiers than it claimed winners.
		const numberOfWinners = regular.length > 0 ? regular.length : d.numberOfWinners;

		const totalPrizePool =
			d.compensationType === 'FIXED'
				? regular.reduce((s, t) => s + t.amount, 0) +
					bonus.reduce((s, t) => s + t.amount * d.maxBonusSpots, 0)
				: 0;

		return {
			type: 'BOUNTY',
			reasoning: out.reasoning,
			draft: {
				title: d.title,
				description: d.description,
				requirements: d.requirements ?? null,
				deliverables: d.deliverables ?? null,
				compensationType: d.compensationType,
				numberOfWinners,
				maxBonusSpots: d.maxBonusSpots,
				prizeTiers,
				totalPrizePool,
				submissionDeadline: new Date(Date.now() + d.submissionInDays * DAY_MS).toISOString(),
				skills: resolveSkills(d.skills)
			}
		};
	}

	if (out.type === 'PROJECT' && out.project) {
		const d = out.project;
		return {
			type: 'PROJECT',
			reasoning: out.reasoning,
			draft: {
				title: d.title,
				description: d.description,
				requirements: d.requirements ?? null,
				deliverables: d.deliverables ?? null,
				milestones: d.milestones.map((m) => ({
					title: m.title,
					description: m.description ?? null,
					amount: m.amount,
					dueInDays: m.dueInDays ?? null
				})),
				budgetCap: d.budgetCapMinor ?? null,
				timeToComplete: d.timeToComplete ?? null,
				skills: resolveSkills(d.skills)
			}
		};
	}

	// scopeOutput.superRefine guarantees the matching draft is present, so this is
	// only reachable on a malformed-but-valid edge; treat as a hard failure.
	throw new AppError('INTERNAL', 'AI returned an incomplete draft.');
}
