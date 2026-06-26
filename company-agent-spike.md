# Company Agent — Research Spike

**Status:** Research spike (feasibility + proof-of-concept)
**Owner:** Engineering
**Last updated:** 26 June 2026
**Related docs:** `ai-integration.md` (live AI layer), `ai-features.md` (feature catalogue), `Future of Work (FOW) - Technical Implementation Plan.md` §10 (AI Matching)

---

## 1. The idea & the question

> "Each company gets their own agent. The agent has memory, can look at the company's socials, and determines what bounties/projects they should post — helping the company achieve so much."

The original framing asked whether we could bring in **[OpenClaw](https://github.com/openclaw/openclaw)** to give every company an agent. This doc answers two questions:

1. **Can we use OpenClaw for this?** — No, and §2 explains why.
2. **Can we build the idea natively?** — Yes, cheaply, on top of the AI layer we already have. §3–§6 design it; §7 is a runnable proof-of-concept that measures whether the model output is actually good.

This is a **spike**, not a build: the deliverables are this doc + a no-DB harness (`scripts/company-agent-poc.ts`). No migrations, UI, or live social connectors are built here.

---

## 2. OpenClaw assessment — why it doesn't fit

OpenClaw (Peter Steinberger's "🦞" project, ~355k GitHub stars) is a **single-user, local-first personal-assistant gateway**. One long-running self-hosted Node process (state in `~/.openclaw`, SQLite memory, file watchers) bridges _your personal_ messaging channels (WhatsApp, Telegram, Slack, Discord…) to an LLM backend.

| Dimension     | OpenClaw                                                                                                                             | Future of Work                                               |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| Tenancy       | Single user, single workspace (multi-tenant is an [open feature request, #61123](https://github.com/openclaw/openclaw/issues/61123)) | Multi-tenant SaaS — many companies                           |
| Runtime       | Persistent self-hosted gateway, **local filesystem** state                                                                           | **Vercel serverless** — no long-running process, no local FS |
| Embeddability | Not a library; it's a gateway you run                                                                                                | We need an in-app, server-side capability                    |
| I/O surface   | Personal messaging channels                                                                                                          | In-app dashboards                                            |
| Deploy        | One box per user                                                                                                                     | One platform, all tenants                                    |

"Give each company an OpenClaw" would mean **orchestrating one self-hosted gateway per company** — heavy infra that fights both OpenClaw's single-user design and our serverless deploy target. **Not recommended.**

**What is worth borrowing:** OpenClaw's **memory model** is good and portable — markdown files (`SOUL.md` / `MEMORY.md` / `USER.md`) → chunked → embedded → semantic recall. That maps cleanly onto a per-company memory doc (§4), and we already have the embedding half of it live (`embeddings.ts`).

---

## 3. Native architecture (fits the existing layering)

The capability is **memory + multi-source aggregation on top of plumbing we already have**. It slots into the existing Repository → Service → API pattern and reuses the live AI layer (`ai-integration.md`).

**Reused as-is:**

- `src/lib/server/ai/claude.ts` — `completeJSON()` / `completeJSONWithMeta()`. Forces Claude through one tool-use call whose schema is a Zod schema, re-validates the output (the trust boundary), returns `null` when no `ANTHROPIC_API_KEY`. Models `MODEL_FAST` (Haiku 4.5) / `MODEL_DEFAULT` (Sonnet 4.6) / `MODEL_DEEP` (Opus 4.8); shared `AI_SYSTEM_PREAMBLE` already encodes Leone/minor-units + Bounty-vs-Project rules.
- `scopeBountyDraft` / `scopeProjectDraft` shapes in `src/lib/validators/ai.ts` — the same draft shapes Flow 1 (the `/create` decider) already produces, so an approved proposal flows straight into the existing create paths with no new resolver.
- `src/lib/server/ai/embeddings.ts` — `embedText()` + `cosineSimilarity()` for de-dup and memory recall.
- `src/lib/server/repositories/skill.repo.ts` — live taxonomy to ground/validate proposed skills.

**New (built in the spike):**

- `src/lib/validators/ai.ts` → **`companyAgentOutput`** — a batch of proposals, each `{ kind: BOUNTY|PROJECT, rationale, sourceRefs[], bounty?|project? }`. Same trust-boundary discipline as `scopeOutput` (bounded strings, skills reconciled by name later, `superRefine` enforces the draft matches `kind`).
- `src/lib/server/ai/company-agent.prompt.ts` — pure prompt builders (`buildSystem`, `buildUserMessage`), kept out of any service so the harness can import them under plain `tsx` (mirrors `scope.prompt.ts`).
- `scripts/company-agent-poc.ts` + `npm run agent:poc` — the measurement harness (§7).

**New (sketched, NOT built — the follow-on phase):**

- `companyAgent.service.ts` — `AuthedUser`-first, throws `AppError`; loads memory → gathers source text → calls Claude → returns proposals. Never writes the DB on the propose path.
- `src/routes/api/company-agent/+server.ts` — thin route (Zod parse → `requireAuth` → service → `respondError`).
- A company-dashboard panel that shows proposals as reviewable cards; **Approve → prefilled existing create wizard**.

---

## 4. Memory model

Borrowing OpenClaw's idea: each company has a **memory doc** — plain text describing what they do, their tone, goals, and a running log of past bounties/outcomes. For the spike it's a fixture string. Production sketch:

- Store as a `CompanyAgentMemory` row (or a `Text` field on `CompanyProfile`), editable by the company.
- Optionally embed it (and append a short summary after each posted bounty) for recall — mirrors how `aiEmbedding` is already a `Float[]` on profiles/bounties today; migrate to pgvector with the rest of the AI layer past ~10k rows.
- Pass `memory + recent source snippets + already-posted titles` into the prompt. Existing titles are fed in explicitly so the agent **de-dups** against work the company already ran.

---

## 5. Social sourcing — the honest constraints

This is the riskiest part operationally, so be clear-eyed about it. Design a small `SourceConnector` interface — `fetch(company) → { label, text }[]` — and ship the easy connectors first:

| Source                   | Feasibility                                                        | Plan                                                           |
| ------------------------ | ------------------------------------------------------------------ | -------------------------------------------------------------- |
| **Website / blog / RSS** | Easy & compliant — `fetch` + HTML/RSS parse                        | **Ship first.** Highest signal-to-effort.                      |
| **Manual paste**         | Trivial                                                            | **Ship first.** Company pastes recent posts; zero ToS risk.    |
| **X / Twitter**          | Hard — needs paid API tiers; scraping breaks ToS                   | Later, **gated** connector; paid-tier or stay on manual-paste. |
| **LinkedIn**             | Hardest — no compliant public read API for arbitrary company posts | Realistically **manual paste** indefinitely.                   |

**Conclusion:** the agent's value does **not** depend on live X/LinkedIn access. Website/RSS + manual paste already give it enough to reason from; treat the social APIs as optional, gated add-ons rather than a prerequisite.

---

## 6. Autonomy — draft-for-approval only

Consistent with the locked decision in `ai-integration.md`: **the agent never writes to the DB or posts anything.** It returns drafts a human reviews and submits through the existing sanitized create paths. For a money/escrow platform this is the only safe default; the drafted text only becomes stored HTML after the normal `sanitizeRichText` create path runs. No autonomous posting, no scheduled auto-publish.

---

## 7. Proof-of-concept — `npm run agent:poc`

`scripts/company-agent-poc.ts` (modeled on `scripts/ai-eval.ts`) answers the only question that decides whether to build the UI/DB layer: **given company memory + social/website text, does Claude produce useful, on-policy proposals, and at what cost?**

- 3 fixture "companies" (a Freetown logistics SME, a fintech startup, a media/events shop), each with a memory blurb, a couple of pasted source snippets, and already-posted titles.
- Runs the real prompt builders across Haiku / Sonnet / Opus via `completeJSONWithMeta` (no prompt drift, no DB writes — only reads the live skill taxonomy to score grounding).
- Prints every proposal (kind, title, rationale, headline money, skills) for human eyeballing, plus a per-model table: structural-pass rate, avg #proposals, latency, tokens, approximate cost, and a suggested cheapest-model-that-clears-the-bar.

**Structural checks** flag: too few proposals, empty rationale, hallucinated skills (not in taxonomy), non-positive money, missing prize tier / milestones, and duplicates of already-posted titles.

### Run it

```sh
npm run agent:poc      # requires ANTHROPIC_API_KEY; reads DATABASE_URL for the skill taxonomy
```

Without `ANTHROPIC_API_KEY` it exits cleanly (the wrapper degrades to `null`), mirroring `ai:eval`. Run `npm run db:seed` first if the skill grounding warns the taxonomy is empty.

### Results (first run — 26 June 2026, 3 companies × 3 models)

| Model          | Struct pass | Avg #proposals | Avg latency | Approx cost / company |
| -------------- | ----------- | -------------- | ----------- | --------------------- |
| Haiku 4.5      | 67%         | 3.7            | ~43 s       | ~$0.013               |
| **Sonnet 4.6** | **100%**    | 4.0            | ~52 s       | ~$0.049               |
| Opus 4.8       | 67%         | 3.5            | ~33 s       | ~$0.238               |

**The proposals are genuinely good and on-policy** — sensible BOUNTY-vs-PROJECT splits (e.g. a logo _bounty_ but a marketing-site _project_), plain-Leone money, skills drawn from the real taxonomy, rationales tied to the source snippets, and no duplication of already-posted titles. Qualitatively this validates the idea: the model, given memory + a couple of social snippets, produces a campaign a company owner would plausibly approve.

**Findings worth carrying into the build:**

- **Sonnet is the pick** — only model at 100% structural pass, ~$0.05/company. Cheap enough to run on demand.
- **Haiku and Opus each had one run fail `schema.parse`** ("unexpected response shape") — the per-proposal `superRefine` over nested nullable `bounty`/`project` drafts occasionally trips the smaller and largest models when a draft is malformed. For production, consider (a) pinning Sonnet, and/or (b) making the agent flow tolerant of a single bad proposal (drop-and-continue) rather than failing the whole batch the way `completeJSON` does today. The current all-or-nothing validation is correct for a single-draft flow but is stricter than a batch flow wants.
- Latency (~30–50 s for a 3–4 proposal batch) is fine for an async "generate my campaign" action; it is **not** a synchronous keystroke flow.

---

## 8. Recommendation & next steps

**Green to build.** The POC clears the bar: Sonnet produces a full, on-policy proposal batch a human would plausibly approve, at ~$0.05/company and acceptable latency.

Phased follow-on, if it proves out:

1. **Memory + service + API** — `CompanyAgentMemory`, `companyAgent.service.ts`, the thin route. Sources: website/RSS + manual paste only.
2. **Dashboard panel** — proposal cards → Approve → prefilled create wizard (reuses Flow 1's resolver).
3. **Refresh** — on-demand "regenerate" button at first; scheduled refresh waits until FOW has cron/queues (Phase 9+ — there is no scheduler today).
4. **Gated social connectors** — X (paid) / LinkedIn (paste) behind flags, only if demand justifies the cost.
