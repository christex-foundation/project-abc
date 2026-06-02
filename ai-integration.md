# AI Integration Plan — Future of Work

**Status:** Proposed (experiment)
**Owner:** Engineering
**Last updated:** 2 June 2026
**Related docs:** `ai-features.md` (feature catalogue), `Future of Work (FOW) - Technical Implementation Plan.md` §10 (AI Matching)

---

## 1. Purpose & framing

FOW is a training ground: it exists to get Sierra Leonean freelancers **ready** for global
platforms like Upwork, while helping local businesses (84% with no digital presence) actually
delegate work. Two real-world gaps drive this plan:

- **Companies can't scope or delegate.** They can't tell a one-off competitive task (Bounty) from
  a managed, milestone-based engagement (Project), and they can't write a usable brief. Bad briefs
  produce bad submissions.
- **Freelancers can't approach work or communicate with clients.** This is exactly the skill set
  Upwork rewards and the one our pilot freelancers lack.

We are adding an **agentic AI layer — not a chatbot** — that helps both sides. This document is a
**phased experiment**: prove the pattern with a thin vertical slice across both sides of the
marketplace, learn the right approach, then expand.

### Locked decisions

| Decision           | Choice                                    | Implication                                                                                                                               |
| ------------------ | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Scope**          | Thin slice of all three flows             | Company decider + project proposal ranking + freelancer coach, each minimal                                                               |
| **Autonomy**       | Suggest & draft, human approves           | AI **never** writes to the DB or sends messages. It returns drafts/rankings the user reviews and submits through existing sanitized paths |
| **Provider**       | Anthropic Claude for reasoning/generation | Keep OpenAI for embeddings only (already live)                                                                                            |
| **Coaching style** | Balance                                   | Coach toward winning now **and** explain the transferable Upwork-ready principle                                                          |

### What already exists (do not rebuild)

- `Bounty.type = BOUNTY | PROJECT` split. Bounties = competitive `Submission`s + prize tiers
  (position 99 = bonus). Projects = single contractor via `ProjectProposal` + `Milestone` workspace.
- **Live embedding layer**: `src/lib/server/ai/embeddings.ts` (OpenAI `text-embedding-3-small`,
  1536 dims, graceful no-op when key absent) + `matching.service.ts` computing embeddings and
  ranking by cosine similarity. `findMatchesForProject()` and `findMatchesForBounty()` exist.
- Plan §10 already **reserves a "Claude ranking" layer and `ANTHROPIC_API_KEY`** as deferred work.
  This experiment is the first version of that layer.

### Architectural rules this plan inherits (from CLAUDE.md / the plan)

- **Repository → Service → API.** No Prisma in `src/routes/`. Services take `AuthedUser` first,
  throw typed `AppError`. Routes are thin: parse Zod, `requireAuth`/`requireRole`, call service,
  `respondError(e)`.
- **Money in minor units** (Int), currency defaults to `SLE`.
- **Rich text is sanitised HTML on write** via `sanitizeRichText`; rendered via `{@html}`. AI text
  only becomes stored HTML _after_ a human submits it through the normal create path.
- **Sponsor `notes`/`label`/`score` never reach freelancers** — `selectForFreelancer` boundary.
- **Mobile-first**: < 200KB initial JS, < 3s FCP on 3G; AI must degrade gracefully.
- **Background work is inline-only at MVP** via `event.platform.context.waitUntil(...)`.

---

## 2. Guiding principles for every phase

1. **Graceful degradation first.** Copy the `embeddings.ts` lazy-client pattern: missing
   `ANTHROPIC_API_KEY` → client is `null` → callers no-op and the UI shows a clean "AI unavailable"
   state. The platform must stay fully usable with no AI key.
2. **AI output is untrusted input.** Every Claude response is validated through a Zod schema before
   it reaches a service consumer or the client. Never `{@html}` raw model output.
3. **Human-in-the-loop is non-negotiable for this experiment.** AI produces _drafts_; the existing
   sanitized create/submit paths remain the only writers to the DB.
4. **Flag-gated and off by default.** A platform `Setting` toggle plus key presence gate every AI
   endpoint, so we can dark-launch and kill instantly.
5. **Cheapest viable model per flow.** Start on Sonnet; measure whether Haiku suffices (coach) or
   Opus is needed (decider). Cost/latency is a first-class success metric.

---

## Phase 0 — Foundation

**Goal:** Stand up the shared Claude client, validation, gating, and config so the three flows are
thin to build. No user-facing behaviour yet.

**Deliverables**

- Add dependency `@anthropic-ai/sdk`.
- Add `ANTHROPIC_API_KEY` to `.env.example` (plan §16 already lists it as optional).
- `src/lib/server/ai/claude.ts`:
  - Lazy singleton (mirror `embeddings.ts` `getClient()`: missing key → return `null`).
  - `completeJSON<T>({ schema, system, messages, model? })` — uses Claude **tool-use / forced
    structured output** so the model returns JSON; validate against the Zod `schema` before
    returning; return `null` on missing key, throw `AppError('INTERNAL', …)` on hard failure.
  - Model constants: `MODEL_DEFAULT = 'claude-sonnet-4-6'`, plus Haiku/Opus IDs for per-flow
    override (`claude-haiku-4-5`, `claude-opus-4-8`).
  - A single shared **system preamble**: platform context, currency `SLE`, money in **minor
    units**, and the canonical Bounty-vs-Project definitions (reused by Flow 1 and Flow 3).
- `src/lib/server/ai/ai-flag.ts` (or extend `settings.ts`): `isAiEnabled()` reading a new
  `aiAssistEnabled` platform `Setting` (default `false`) through the existing settings cache.
- `src/lib/validators/ai.ts`: shared scaffolding for AI input/output Zod schemas (filled per flow).
- A small **rate-limit helper** for user-initiated AI calls, surfacing `AppError('RATE_LIMITED')`.
  (In-memory per-instance counter is acceptable at MVP; note the limitation.)

**Conventions**

- Follow the fire-and-forget `enqueue` pattern only where appropriate; note that AI _drafting_
  calls are **synchronous** (the user waits), unlike embeddings.

**Verification / exit criteria**

- `npm run check` passes. App boots with **no** `ANTHROPIC_API_KEY` set; `isAiEnabled()` returns
  `false`; nothing crashes. With key + flag on, a throwaway `completeJSON` call against a tiny
  schema returns a validated object.

---

## Phase 1 — Flow 1: Company "Bounty or Project?" decider + brief/plan drafter

**Goal:** A company types 1–2 sentences about what they need; AI decides Bounty vs Project and
drafts the full brief, prefilling the existing create form. Suggest-only.

**Deliverables**

- `src/lib/validators/ai.ts`: `scopeInput` (need text + optional budget/timeline) and `scopeOutput`
  (`{ type: 'BOUNTY'|'PROJECT', reasoning, draft }`) where `draft` matches the create-form shapes:
  - **BOUNTY** → title, description, requirements, deliverables, suggested prize tiers
    (position + minor-unit amount; position 99 = bonus), suggested `submissionDeadline`, skills.
  - **PROJECT** → title, description, requirements, deliverables, **milestone plan**
    (title/amount/dueInDays — matches `buildMilestonePlan`), suggested `budgetCap`, skills.
- `src/lib/server/services/scoping.service.ts`:
  - `requireRole(caller, 'COMPANY', 'ADMIN')`; gate on `isAiEnabled()`.
  - Grounding: pass the live skill taxonomy (names from `skill.repo`) so suggested skills map to
    real `Skill` rows; include the Bounty-vs-Project preamble.
  - Return validated `scopeOutput`; on AI unavailable, throw a clean `AppError` the UI renders.
- `src/routes/api/ai/scope/+server.ts`: thin `POST`.
- UI: an **"Ask AI to draft this"** entry on the company create flow that calls `/api/ai/scope`,
  then **prefills the existing form**. The company edits and submits through
  `bounty.service.createBounty` / `project.service.createProject` (which sanitize + validate). AI
  does not touch the DB.

**Maps to** `ai-features.md` #7 (Brief Builder) + #9 (Splitter), fused into the decision.

**Verification / exit criteria**

- _"I need one logo, best entry wins"_ → `BOUNTY` with prize tiers.
- _"I want a small 4-page website for my shop"_ → `PROJECT` with a sensible milestone plan.
- Prefill loads into the create form; submitting still routes through the sanitized create path.
- Suggested skills resolve to real `Skill` rows (no hallucinated skills persisted).

---

## Phase 2 — Flow 2: Company proposal ranking (best freelancer for the project)

**Goal:** For a Project that has received proposals, AI ranks which freelancer best fits the
tasks, with reasoning — building on existing embedding matches. Sponsor-facing only.

**Deliverables**

- `src/lib/validators/ai.ts`: `proposalRankOutput` —
  `[{ freelancerProfileId, rank, matchScore, strengths[], risks[], suggestedQuestions[] }]`.
- `src/lib/server/services/proposal-rank.service.ts`:
  - **Owner/admin only** — reuse the ownership guard from `project.service.loadOwnedProject`.
  - **Privacy:** sponsor-facing only; never exposed to freelancers. No sponsor `notes`/`label`
    enter any freelancer-facing prompt.
  - Signals fused: existing `matchingService.findMatchesForProject()` (embedding pre-filter) +
    each proposal's `coverLetter` + freelancer skills/experience + project requirements/milestones
    → Claude returns the ranked shortlist.
  - **Fallback:** if Claude unavailable, return the raw embedding order with a flag so the UI can
    say "ranked by similarity only".
- `src/routes/api/projects/[projectId]/ai-shortlist/+server.ts`: thin `POST` (owner-guarded).
- UI: an **"AI shortlist"** panel on the owner's project-proposals view.

**Maps to** the deferred plan §10 "Claude ranking" layer, scoped to project proposals.

**Verification / exit criteria**

- Seed a project + several proposals (`npm run seed:projects`) → owner gets a ranked list with
  per-candidate strengths/risks/questions. A freelancer hitting the endpoint gets `FORBIDDEN`.
- With AI disabled, the panel falls back to embedding order and says so.

---

## Phase 3 — Flow 3: Freelancer coach (approach + communication)

**Goal:** For a chosen bounty/project, AI coaches the freelancer on how to approach the work and
how to communicate with the company — balanced toward winning now and Upwork-ready habits.

**Deliverables**

- `src/lib/validators/ai.ts`: `coachInput` (`{ bountyId } | { projectId }`) and `coachOutput`:
  - **approach**: how to break the work down, what the brief is _really_ asking, what to
    prioritise, common pitfalls.
  - **communication**: a draft professional message / clarifying questions for the company; for
    projects, a `coverLetter` skeleton.
  - each item carries a short **"why this matters on Upwork too"** note (the balance).
- `src/lib/server/services/coach.service.ts`:
  - `requireRole(caller, 'FREELANCER')`; gate on `isAiEnabled()`.
  - Loads the bounty/project context (public-safe fields only — never sponsor-private fields).
- `src/routes/api/ai/coach/+server.ts`: thin `POST`.
- UI: a **"Coach me"** entry on the bounty/project detail. The freelancer edits the draft and
  submits via the normal proposal/submission path (sanitized on write). AI does not auto-submit.

**Maps to** `ai-features.md` #3 (Submission Coach), extended with the communication/Upwork angle.

**Verification / exit criteria**

- As a freelancer, "Coach me" on a bounty returns approach + communication drafts with
  transferable-skill notes. Editing + submitting still passes through `sanitizeRichText`.

---

## Phase 4 — Evaluation, hardening & measurement

**Goal:** Turn the slice into something we can judge and tune — the "best approach" research the
experiment is for.

**Deliverables**

- `scripts/ai-eval.ts` (tsx, mirrors existing `scripts/`): ~6–10 fixture inputs per flow; prints
  classification accuracy (Flow 1), draft quality, and **cost/latency per model** so we can
  compare Sonnet vs Haiku vs Opus per flow.
- Streaming for the decider/coach responses (perceived latency on 3G; respects the mobile-first
  rule) with a clear loading state.
- Confirm per-user rate limiting and cost caps behave under repeated calls.
- Document findings inline here (a short "Results" subsection per research question).

**Research questions to resolve**

1. **Model per flow** — Sonnet everywhere vs Haiku (coach) / Opus (decider). Measure quality vs
   cost/latency on fixtures.
2. **Single-shot vs conversational** — the decider may work better as a short multi-turn
   "diagnostic" (`ai-features.md` #8). Prototype one-shot first, then evaluate.
3. **Skill grounding** — full taxonomy in the prompt vs an embeddings-assisted candidate shortlist.
4. **Quality logging** — see Phase 5.

**Verification / exit criteria**

- `tsx scripts/ai-eval.ts` runs clean and prints a comparison table. A model + prompt choice per
  flow is recorded here with rationale.

### Results

Harness: `scripts/ai-eval.ts` (`npm run ai:eval`) — 8 labelled scope fixtures + 6 coach fixtures
× Haiku/Sonnet/Opus, scored with deterministic structural checks (classification, tiers/milestones
present, positive minor-unit amounts, skills resolve to real `Skill` rows, conditional cover
letter). Flow 2 excluded (needs seeded proposals; verified manually). Run 2 June 2026 (figures from
the latest of two runs) — cost uses the approximate `PRICE_PER_MTOK` table, so read it as
**relative**.

**RQ1 — Model per flow.** Latest run:

| Flow           | Model  | Classif | Struct | Avg latency | Avg cost/call |
| -------------- | ------ | ------- | ------ | ----------- | ------------- |
| Flow 1 decider | Haiku  | 88%     | 75%    | ~7.8s       | ~$0.005       |
| Flow 1 decider | Sonnet | 100%    | 100%   | ~14.5s      | ~$0.018       |
| Flow 1 decider | Opus   | 100%    | 100%   | ~14.3s      | ~$0.118       |
| Flow 3 coach   | Haiku  | —       | 100%   | ~19s        | ~$0.009       |
| Flow 3 coach   | Sonnet | —       | 100%   | ~31s        | ~$0.025       |
| Flow 3 coach   | Opus   | —       | 100%   | ~22s        | ~$0.124       |

- **Decider → Sonnet (`MODEL_DEFAULT`, unchanged).** Sonnet was the only model at 100%/100% in
  **both** runs — the consistent choice. **Haiku is too unreliable for the decider**: it swung from
  100%/88% (run 1, with two hallucinated off-taxonomy skills) to 88%/75% (run 2). **Opus matches
  Sonnet's quality but not consistently and never cheaply** — it hit 100%/100% in run 2 but in run 1
  produced a misclassification _and_ a malformed tool-output (`ZodError`: missing `type`/
  `reasoning`), all at ~6.6× Sonnet's cost. No upside over Sonnet for this flow.
- **Coach → Haiku (`MODEL_FAST`).** All three models hit 100% structural across all 6 coach
  fixtures in both runs; Haiku does it at ~1/3 Sonnet's cost and lower latency, with no quality
  loss. **Changed `coach.service.ts` from `MODEL_DEFAULT` to `MODEL_FAST`.**

**RQ3 — Skill grounding.** Full-taxonomy-in-prompt held up on Sonnet (no hallucinations in either
run), but Haiku invented off-taxonomy skills on the decider ("Audio Production", "Music
Composition" on the jingle case). The service-layer reconciliation already drops these, so nothing
bad persists — but it's another reason to keep the decider off Haiku, and a signal that an
embeddings-assisted candidate shortlist would help if we ever move it to a cheaper model. Left as a
Phase 5 follow-up.

**RQ2 — Single-shot vs conversational.** One-shot is good enough on these fixtures (100%
classification on Sonnet); no evidence yet that a multi-turn diagnostic is needed. Revisit only if
real-world ambiguous inputs show one-shot misclassifying. Deferred.

**RQ4 — Quality logging.** Deferred to Phase 5 (`AiInteraction` table) as planned.

**Hardening — the phase's other two deliverables, scoped down by decision:**

- **Streaming → deferred; replaced with a staged loading state.** Both AI calls return a single
  Zod-validated structured object (forced tool-use), so there is no trustworthy partial output to
  stream token-by-token. Instead `CoachPanel.svelte` and the `/create` "Ask AI to draft this"
  action cycle staged labels ("Reading your brief…" → "Deciding…" → "Drafting…") while awaiting the
  response — perceived-latency relief on 3G without the complexity. Real streaming revisited only
  if the wait proves too long in the field.
- **Rate-limit / cost-cap confirmation → deferred.** The in-memory per-user limiter
  (`rate-limit.ts`, `checkRateLimit`) is unchanged and still gates each flow; this phase did not
  add a spend cap or a repeated-call test. The eval calls `completeJSONWithMeta` directly and so
  bypasses the limiter by design (it must make many calls). A cheap follow-up: a no-API unit check
  that `checkRateLimit` trips after N calls.

**Caveats.** Two runs on a small fixture set; output is non-deterministic and Haiku/Opus quality
swung noticeably between them on the decider. Sonnet (decider) and Haiku (coach) were stable in
both, and the cost/quality gaps are wide enough that the picks are safe — but treat absolute
numbers as indicative, not exact, and re-run `npm run ai:eval` after any prompt change.

---

## Phase 5 — Beyond the slice (deferred, not in this experiment)

Only after the slice proves out. Each is its own scoped piece of work.

- **`AiInteraction` log table** (the one schema change we deferred): persist prompt/flow/model/
  cost/accepted-or-not to measure real-world quality and acceptance rate. Enables A/B of prompts.
- **Conversational Digital Transformation Diagnostic** (`ai-features.md` #8) — multi-turn
  onboarding for first-time businesses, building on Flow 1.
- **Loss Feedback Generator** (`ai-features.md` #4) — AI explains a loss vs the winning submission.
- **Earning Strategy Planner / Skill Gap Analyser** (`ai-features.md` #5, #6) — agentic, runs over
  the freelancer's history and the open bounty pool.
- **pgvector migration** — move cosine ranking into Postgres when the freelancer base exceeds the
  in-memory threshold noted in `matching.service.ts` (plan §10).
- **Platform-defining bets** (`ai-features.md` #1 Talent Graph, #2 Global Workforce Brokerage,
  #10 Provenance Verifier) — strategic, separate planning.

---

## Critical files (slice, Phases 0–4)

**New**

- `src/lib/server/ai/claude.ts` — lazy client + `completeJSON` + model/preamble constants
- `src/lib/server/ai/ai-flag.ts` — `isAiEnabled()` over a platform `Setting`
- `src/lib/validators/ai.ts` — Zod input/output schemas for all three flows
- `src/lib/server/services/scoping.service.ts` — Flow 1
- `src/lib/server/services/proposal-rank.service.ts` — Flow 2
- `src/lib/server/services/coach.service.ts` — Flow 3
- `src/routes/api/ai/scope/+server.ts`, `src/routes/api/ai/coach/+server.ts`,
  `src/routes/api/projects/[projectId]/ai-shortlist/+server.ts`
- `scripts/ai-eval.ts`
- UI hooks: "Ask AI to draft this" on the company create flow; "AI shortlist" on the owner's
  proposals view; "Coach me" on bounty/project detail.

**Reuse (do not duplicate)**

- `src/lib/server/ai/embeddings.ts` — the graceful-degradation client pattern
- `matchingService.findMatchesForProject()` — Flow 2's first-pass signal
- `project.service.ts` (`loadOwnedProject`, `buildMilestonePlan`, `enqueue`),
  `bounty.service.createBounty`, the proposal service — the human-approved submit paths
- `auth-helpers` (`requireAuth`/`requireRole`), `http.ts` (`AppError`/`respondError`),
  `sanitize.ts`, `settings.ts`, `skill.repo`

**No DB migration in the slice.** `Bounty`, `Project`, `ProjectProposal`, `Milestone`,
`Submission`, `Skill`, `FreelancerProfile` already exist with `aiEmbedding` fields.

---

## End-to-end verification (whole slice)

1. `npm run check` passes; `npm run dev` boots with **no `ANTHROPIC_API_KEY`** → all three AI entry
   points show a clean "AI unavailable" state, nothing crashes.
2. With key + flag on:
   - **Flow 1:** logo prompt → `BOUNTY` + tiers; website prompt → `PROJECT` + milestones; prefill
     submits through the sanitized create path.
   - **Flow 2:** seeded project + proposals → owner sees a reasoned ranked list; freelancer gets
     `FORBIDDEN`; AI-off falls back to embedding order.
   - **Flow 3:** freelancer "Coach me" → approach + communication drafts with Upwork notes; submit
     still passes through `sanitizeRichText`.
3. `tsx scripts/ai-eval.ts` prints the model/cost/quality comparison.
