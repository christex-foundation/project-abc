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

// ---------------------------------------------------------------------------
// Flow 2 — Company proposal ranking / "AI shortlist" (Phase 2)
// ---------------------------------------------------------------------------

// One ranked candidate the model returns. `freelancerProfileId` is reconciled
// against the project's real proposals at the service layer (hallucinated ids
// are dropped); the strings are bounded so the trust boundary stays tight.
const aiRankItem = z.object({
	freelancerProfileId: z.string().trim().min(1).max(64),
	rank: z.number().int().min(1).max(50),
	// The model's own holistic fit, 0–100. Distinct from the embedding cosine
	// similarity (0–1) the service merges in separately.
	matchScore: z.number().int().min(0).max(100),
	strengths: z.array(z.string().trim().min(1).max(300)).max(5).default([]),
	risks: z.array(z.string().trim().min(1).max(300)).max(5).default([]),
	suggestedQuestions: z.array(z.string().trim().min(1).max(300)).max(5).default([])
});

/**
 * The model's tool output for Flow 2. Wrapped in an object (not a bare array) so
 * the derived JSON Schema has an `object` root that Claude tool-use accepts
 * cleanly — same reason as `scopeOutput`.
 */
export const proposalRankOutput = z.object({
	rankings: z.array(aiRankItem).max(50)
});
export type ProposalRankOutput = z.infer<typeof proposalRankOutput>;

// Form-ready result the browser receives: each ranked proposal merged with its
// display data and the embedding cosine. `rankedBy` drives the UI label:
//   'ai'        → Claude-reasoned ranking (strengths/risks/questions present)
//   'embedding' → fallback to cosine order only ("ranked by similarity only")
//   'none'      → no signal at all (no proposals, or no embeddings either)
export type ProposalRankedItem = {
	proposalId: string;
	freelancerProfileId: string | null;
	displayName: string;
	rank: number;
	matchScore: number | null; // AI 0–100; null in fallback
	similarity: number | null; // embedding cosine 0–1; null when unavailable
	strengths: string[];
	risks: string[];
	suggestedQuestions: string[];
};

export type ProposalRankResult = {
	rankedBy: 'ai' | 'embedding' | 'none';
	items: ProposalRankedItem[];
};

// ---------------------------------------------------------------------------
// Flow 3 — Freelancer coach: approach + communication (Phase 3)
// ---------------------------------------------------------------------------

/**
 * What the freelancer asks coaching on: exactly one of a bounty or a project.
 * The id is a CUID; bounds keep the trust boundary tight (the service still
 * loads the row through the public-safe loader before trusting it).
 */
export const coachInput = z
	.object({
		bountyId: z.string().trim().min(1).max(64).nullish(),
		projectId: z.string().trim().min(1).max(64).nullish()
	})
	.superRefine((data, ctx) => {
		const n = (data.bountyId ? 1 : 0) + (data.projectId ? 1 : 0);
		if (n !== 1) {
			ctx.addIssue({
				code: 'custom',
				message: 'Provide exactly one of bountyId or projectId.'
			});
		}
	});
export type CoachInput = z.infer<typeof coachInput>;

// One coaching point + its transferable "why this matters on Upwork too" note
// (the locked "balance" coaching style). Plain text only.
// As with Flow 4 above, the OUTPUT `.max()` bounds are advisory model hints, not a
// trust boundary; set generously so the model can't 500 the request by exceeding one.
const coachApproachItem = z.object({
	point: z.string().trim().min(1).max(2000),
	whyUpwork: z.string().trim().min(1).max(1500)
});

const coachCommunication = z.object({
	// A draft professional note to the company. Plain text — it only becomes
	// stored HTML if the freelancer carries it into the sanitized submit path.
	message: z.string().trim().min(1).max(8000),
	clarifyingQuestions: z.array(z.string().trim().min(1).max(1000)).max(20).default([]),
	// Project-only proposal skeleton; null for bounties (no message field there).
	coverLetter: z.string().trim().max(20_000).nullish()
});

/** The model's tool output for Flow 3 — an object root for clean tool-use. */
export const coachOutput = z.object({
	approach: z.array(coachApproachItem).min(1).max(20),
	communication: coachCommunication
});
export type CoachOutput = z.infer<typeof coachOutput>;

// Form-ready result the browser receives. `kind`/`title` carried from the
// loaded row; `coverLetter` is forced null for bounties at the service layer.
export type CoachResult = {
	kind: 'BOUNTY' | 'PROJECT';
	title: string;
	approach: { point: string; whyUpwork: string }[];
	communication: {
		message: string;
		clarifyingQuestions: string[];
		coverLetter: string | null;
	};
};

// ---------------------------------------------------------------------------
// Flow 4 — Workspace coach: contractor milestone DELIVERY assistant (Phase 4)
// ---------------------------------------------------------------------------
//
// Unlike Flow 3 (pre-application), this runs AFTER the freelancer has won a
// project and is mid-milestone in the workspace. It is contractor-only and
// suggest-only — nothing here writes the DB. Everything it reads (project brief,
// milestone description, the update/comment thread) is data the contractor
// already sees on the workspace page, so there is no new privacy surface;
// sponsor-private fields (notes/label/score) live on bounty Submissions, not
// project milestones.

/**
 * What the contractor asks coaching on: a milestone, plus their in-progress
 * draft from the workspace form (all optional — they may ask before typing
 * anything). The id is a CUID; bounds keep the trust boundary tight (the
 * service still loads the row and authorises the caller before trusting it).
 */
export const workspaceCoachInput = z.object({
	milestoneId: z.string().trim().min(1).max(64),
	draftNote: z.string().trim().max(20_000).nullish(),
	draftDeliverables: z
		.array(
			z.object({
				label: z.string().trim().max(120).default(''),
				url: z.string().trim().max(2000).default('')
			})
		)
		.max(20)
		.default([]),
	draftComment: z.string().trim().max(10_000).nullish()
});
export type WorkspaceCoachInput = z.infer<typeof workspaceCoachInput>;

// One gap between the contractor's draft and the brief, plus how to close it.
const workspaceGap = z.object({
	point: z.string().trim().min(1).max(2000),
	suggestion: z.string().trim().min(1).max(2000)
});

// NOTE: the `.max()` bounds on the OUTPUT below are advisory model hints
// (`maxLength` in the tool schema), NOT a trust boundary — this is plain text the
// contractor sees, re-sanitized at the real submit/comment write paths. They are
// set generously (well above what `max_tokens` can produce) so a count/length cap
// is never the binding constraint that fails `schema.parse` and 500s the request.
// Truncation (handled in completeJSONWithMeta) is the only real limit.
/** The model's tool output for Flow 4 — an object root for clean tool-use. */
export const workspaceCoachOutput = z.object({
	// (1) review work vs brief — gaps to close before submitting for approval
	gaps: z.array(workspaceGap).max(20).default([]),
	// self-check on the contractor's OWN draft tone/clarity (the "moderation"
	// self-check — a warning to them, never a block).
	selfCheck: z.array(z.string().trim().min(1).max(1000)).max(20).default([]),
	// (2) interpret client feedback — plain-language summary + a draft reply
	clientNeedsSummary: z.string().trim().max(6000).nullish(),
	replyDraft: z.string().trim().max(6000).nullish(),
	// (3) polish — a cleaned-up version of their update note (plain text)
	polishedNote: z.string().trim().max(20_000).nullish()
});
export type WorkspaceCoachOutput = z.infer<typeof workspaceCoachOutput>;

// Form-ready result the browser receives; `milestoneTitle` carried from the
// loaded row so the panel can label which milestone it coached.
export type WorkspaceCoachResult = WorkspaceCoachOutput & { milestoneTitle: string };
