# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Context

This is **Future of Work (FOW)** — a bounty platform for Sierra Leone / West Africa where companies post paid bounties and freelancers compete by submitting work. Winners get paid via Monime (mobile money / bank). The repo is currently a fresh SvelteKit minimal scaffold; the full design lives in `Future of Work (FOW) - Technical Implementation Plan.md` and is the source of truth for architecture decisions. Read that document before making non-trivial changes — it covers the data model, escrow state machine, auth flows, admin subdomain split, AI matching, PWA/push, and phased rollout.

## Commands

```sh
npm run dev          # vite dev server (http://localhost:5173)
npm run build        # production build
npm run preview      # preview built output
npm run check        # svelte-kit sync + svelte-check (typecheck)
npm run check:watch  # typecheck in watch mode
npm run lint         # prettier --check .
npm run format       # prettier --write .
```

There is no test runner configured yet. `npm run prepare` runs `svelte-kit sync`.

## Stack

- **SvelteKit 2 + Svelte 5** with **runes mode forced on** for everything outside `node_modules` (see `svelte.config.js`). Use `$state`, `$props`, `$derived`, `$effect` — not legacy `let` reactivity or `export let`.
- **TypeScript strict**, `moduleResolution: "bundler"`, `allowJs` + `checkJs` enabled, `rewriteRelativeImportExtensions` on.
- **Adapter**: `@sveltejs/adapter-auto` (deploy target is **Vercel** per the plan).
- **Prettier**: tabs, single quotes, no trailing commas, 100-char width, `prettier-plugin-svelte`.

## Architecture (Planned — Repository → Service → API)

When implementing server features, follow the three-layer pattern from §2 of the plan:

1. **Repositories** (`src/lib/server/repositories/*.repo.ts`) — pure Prisma I/O. No auth, no business rules, no external calls.
2. **Services** (`src/lib/server/services/*.service.ts`) — business rules, authorization, cross-entity coordination, external API calls (Monime, Resend, OpenAI, Web Push). Take an `AuthedUser` as the first arg, throw typed `AppError`.
3. **API routes** (`src/routes/api/**/+server.ts`) — thin: parse Zod input, resolve session via `requireAuth(locals)`, call a service, map errors via `respondError(e)`. **Never import Prisma directly in `src/routes/`.**

Route guards live in `+layout.server.ts` files (`requireAuth` / `requireRole`), not in middleware. CI greps for `prisma\.` in `src/routes/` and `fetch.*monime` outside `monime/client.ts` to enforce layering.

## Hard Rules from the Plan

- **Mobile-first**. Target Android browsers on mid-range devices, < 200KB initial JS, < 3s FCP on 3G. All multi-step forms must auto-save drafts to localStorage.
- **Money in minor units** (Int, never Float). Currency defaults to `SLE`.
- **CUID IDs** everywhere to prevent enumeration.
- **Link-based submissions only** — freelancers paste URLs (GitHub, Drive, etc.). Cloudinary is for profile avatars/logos only, never submissions.
- **Rich text stored as sanitised HTML**. `sanitize-html` allowlist is the trust boundary on every write; render via `{@html sanitized}`. Fields: `Bounty.description/requirements/deliverables`, `Submission.otherInfo/feedback`.
- **Position 99 = bonus** convention on prize tiers (not a separate enum). `maxBonusSpots` on Bounty caps the count.
- **Two-phase winners**: selection (`isWinner` toggles per submission) is separate from announcement (`isWinnersAnnounced` lock + payout trigger).
- **Sponsor `notes` and `label` must never appear in freelancer-facing API responses.** Use distinct `selectForFreelancer` / `selectForSponsor` shapes at the repo layer.
- **Webhook handlers** must HMAC-verify (`crypto.timingSafeEqual`) and be idempotent on Monime payment IDs.
- **Admin lives on a separate subdomain** (`admin.fow.sl` / `admin.localhost:5173`). Sessions are host-only (no cookie `domain` attribute) so admin auth is isolated from the main platform. Host routing lives in `hooks.server.ts`.
- **Better Auth** `additionalFields.role` uses `input: false` — services set `role` server-side via Prisma after `signUpEmail`. The same `invite.service` powers both the admin UI and `scripts/seed-invite.ts`.
- **Background jobs are inline-only at MVP** via `event.platform.context.waitUntil(...)`. No cron, no queues until Phase 9+.

## Project Layout (Planned)

See §1 of the plan for the full tree. Key directories once built out:

- `src/lib/server/` — server-only modules (Prisma, auth, Monime, email, push, AI, repos, services). Never import these from client code.
- `src/lib/client/` — browser-only modules (push subscribe, better-auth client, stores).
- `src/lib/validators/` — Zod schemas shared by server + client.
- `src/lib/components/` — UI primitives (shadcn-svelte), `editor/` (ProseKit wrappers), feature folders.
- `src/routes/(auth)/`, `src/routes/(platform)/`, `src/routes/admin/`, `src/routes/api/` — route groups; guards in each group's `+layout.server.ts`.
- `prisma/` — `schema.prisma` + `seed.ts` (skills taxonomy, admin user, default `Setting` row).
- `scripts/seed-invite.ts` — CLI fallback for company invites; must call into `invite.service` to stay in sync with the UI path.

## Current State

The repo is essentially `npx sv create --template minimal --types ts --add prettier` output: just `src/routes/+page.svelte`, `+layout.svelte`, `src/lib/index.ts`, and the favicon. Implementation work follows the phased plan in §17 (Phase 1 = foundation, scaffolding, auth, admin subdomain split).
