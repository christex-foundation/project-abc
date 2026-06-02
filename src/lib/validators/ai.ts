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
