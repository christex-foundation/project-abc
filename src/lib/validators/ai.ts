// Shared Zod schemas for the AI assist experiment.
//
// IMPORTANT: every *output* schema here is a TRUST BOUNDARY. AI responses are
// untrusted input — `claude.completeJSON` derives the model's tool input_schema
// from these schemas (via z.toJSONSchema) AND re-validates the response with
// `schema.parse()` before returning. Keep output schemas strict (bounded
// lengths, enums, no free-form HTML). Drafted text only becomes stored HTML
// later, after a human submits it through the existing sanitized create paths.
//
// Per-flow schemas land with their phases:
//   Flow 1 (decider/brief) → scopeInput / scopeOutput      (Phase 1)
//   Flow 2 (proposal rank)  → proposalRankOutput            (Phase 2)
//   Flow 3 (coach)          → coachInput / coachOutput      (Phase 3)
// This file currently holds only shared scaffolding.

import { z } from 'zod';

/** Bounty vs Project — the decision Flow 1 returns; reused wherever the type is named. */
export const aiBountyType = z.enum(['BOUNTY', 'PROJECT']);
export type AiBountyType = z.infer<typeof aiBountyType>;

/**
 * A skill the model suggests. Suggested skills must be reconciled against real
 * `Skill` rows at the service layer (by name) — never persist a raw suggestion.
 */
export const aiSkillSuggestion = z.string().trim().min(1).max(60);

/** Short reasoning string the model attaches to a decision/ranking. */
export const aiReasoning = z.string().trim().min(1).max(2000);

// ---------------------------------------------------------------------------
// Flow 1 — Company "Bounty or Project?" decider + brief drafter (Phase 1)
// ---------------------------------------------------------------------------

/** What the company types on /create. Money is minor-unit Int (SLE × 100), never a float. */
export const scopeInput = z.object({
	need: z.string().trim().min(10).max(2000),
	budgetMinor: z.number().int().min(0).max(1_000_000_000).nullish(),
	timeline: z.string().trim().max(120).nullish()
});
export type ScopeInput = z.infer<typeof scopeInput>;

// Plain TEXT only (no HTML). The client wraps these into <p> for the editor's
// initialHTML; they only become stored HTML after the normal create path's
// sanitizeRichText. Bounds keep token cost and the trust boundary tight.
const scopeTitle = z.string().trim().min(5).max(200);
const scopeBody = z.string().trim().min(1).max(8000);
const scopeBodyOpt = z.string().trim().max(8000).nullish();

// position 99 = bonus; amount is minor-unit Int. Bounded to keep the schema small.
const scopePrizeTier = z.object({
	position: z.number().int().min(1).max(99),
	amount: z.number().int().min(1).max(1_000_000_000),
	label: z.string().trim().max(120).nullish()
});

const scopeMilestone = z.object({
	title: z.string().trim().min(3).max(200),
	description: z.string().trim().max(4000).nullish(),
	amount: z.number().int().min(1).max(1_000_000_000),
	dueInDays: z.number().int().min(1).max(3650).nullish()
});

const scopeBountyDraft = z.object({
	title: scopeTitle,
	description: scopeBody,
	requirements: scopeBodyOpt,
	deliverables: scopeBodyOpt,
	compensationType: z.enum(['FIXED', 'RANGE', 'VARIABLE']).default('FIXED'),
	numberOfWinners: z.number().int().min(1).max(10).default(1),
	maxBonusSpots: z.number().int().min(0).max(10).default(0),
	prizeTiers: z.array(scopePrizeTier).max(20).default([]),
	// Relative days from now; the service computes the ISO submissionDeadline so
	// the model never has to know today's date.
	submissionInDays: z.number().int().min(1).max(365).default(14),
	skills: z.array(aiSkillSuggestion).max(12).default([])
});

const scopeProjectDraft = z.object({
	title: scopeTitle,
	description: scopeBody,
	requirements: scopeBodyOpt,
	deliverables: scopeBodyOpt,
	milestones: z.array(scopeMilestone).min(1).max(20),
	budgetCapMinor: z.number().int().min(0).max(1_000_000_000).nullish(),
	timeToComplete: z.string().trim().max(120).nullish(),
	skills: z.array(aiSkillSuggestion).max(12).default([])
});

/**
 * The model's tool output. A single object (not a discriminated union) so the
 * derived JSON Schema has an `object` root that Claude tool-use accepts cleanly.
 * The model fills exactly the draft matching `type`; `superRefine` enforces it.
 */
export const scopeOutput = z
	.object({
		type: aiBountyType,
		reasoning: aiReasoning,
		bounty: scopeBountyDraft.nullish(),
		project: scopeProjectDraft.nullish()
	})
	.superRefine((data, ctx) => {
		if (data.type === 'BOUNTY' && !data.bounty) {
			ctx.addIssue({
				code: 'custom',
				path: ['bounty'],
				message: 'bounty draft required when type is BOUNTY.'
			});
		}
		if (data.type === 'PROJECT' && !data.project) {
			ctx.addIssue({
				code: 'custom',
				path: ['project'],
				message: 'project draft required when type is PROJECT.'
			});
		}
	});
export type ScopeOutput = z.infer<typeof scopeOutput>;

// Form-ready result the service returns to the browser: skills resolved to real
// Skill rows, money totals computed, relative days resolved to ISO dates.
export type ResolvedSkill = { skillId: string; isRequired: boolean };

export type ScopeBountyResult = {
	type: 'BOUNTY';
	reasoning: string;
	draft: {
		title: string;
		description: string;
		requirements: string | null;
		deliverables: string | null;
		compensationType: 'FIXED' | 'RANGE' | 'VARIABLE';
		numberOfWinners: number;
		maxBonusSpots: number;
		prizeTiers: { position: number; amount: number; label: string | null }[];
		totalPrizePool: number;
		submissionDeadline: string; // ISO
		skills: ResolvedSkill[];
	};
};

export type ScopeProjectResult = {
	type: 'PROJECT';
	reasoning: string;
	draft: {
		title: string;
		description: string;
		requirements: string | null;
		deliverables: string | null;
		milestones: {
			title: string;
			description: string | null;
			amount: number;
			dueInDays: number | null;
		}[];
		budgetCap: number | null;
		timeToComplete: string | null;
		skills: ResolvedSkill[];
	};
};

export type ScopeResult = ScopeBountyResult | ScopeProjectResult;
