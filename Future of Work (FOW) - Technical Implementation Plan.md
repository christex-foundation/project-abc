# Future of Work (FOW) — Technical Implementation Plan

## Context

Building a bounty platform where companies post paid bounties and freelancers compete by submitting work. Winners receive payouts via Monime (African payment infrastructure focused on Sierra Leone). AI matches freelancers to relevant bounties based on skills. The platform launches with no platform fees to build traction.

- **Target market**: Sierra Leone / West Africa
- **Currency**: SLE (Leone), amounts stored in minor units
- **Payment methods**: Mobile Money, local bank transfers, cards (via Monime)
- **Deployment**: Vercel
- **File storage**: Cloudinary (profile avatars/logos only, NOT for submissions)
- **Design principle**: Mobile-first. Sierra Leone has 93% mobile penetration; most users access via Android browsers on mid-range devices. All layouts must be mobile-first with desktop as progressive enhancement. Target < 200KB initial JS bundle, < 3s first contentful paint on 3G.
- **Connectivity constraints**: Unreliable power, expensive mobile data, frequent disconnections. All multi-step forms must auto-save drafts to localStorage. Use lazy loading, minimal JS bundles, and optimistic UI patterns.

### Key Product Decisions (preserved from original spec)

1. **Link-based submissions, no file uploads** — Freelancers submit GitHub links, Google Drive links, portfolio URLs, etc. Cloudinary is used only for profile avatars/logos. Submission fields: `link` (required URL), `tweet` (optional URL), `otherInfo` (optional rich text).
2. **Submission quality labels for triage** — Sponsors label submissions during review before selecting winners. Labels: UNREVIEWED, REVIEWED, SHORTLISTED, SPAM, LOW_QUALITY, MID_QUALITY, HIGH_QUALITY.
3. **Sponsor notes per submission** — Private `notes` field on Submission, never exposed in freelancer-facing API responses.
4. **Two-phase winner flow** — (a) Sponsor toggles `isWinner` + `winnerPosition` on individual submissions. (b) Sponsor triggers "Announce Winners" as a separate action that locks results, triggers payouts, and sends notifications.
5. **Eligibility questions** — Bounties can define custom questions (`eligibility Json[]` on Bounty). Freelancers answer them during submission (`eligibilityAnswers Json[]` on Submission).
6. **Bonus reward position** — Position `99` = bonus. `maxBonusSpots` on Bounty controls how many bonus winners. Prize tiers 1, 2, 3… are regular; tier 99 is bonus (smaller amount, multiple recipients).
7. **Compensation types** — Support FIXED (set prizes), RANGE (min/max, freelancer states ask), VARIABLE (freelancer proposes amount). Fields: `compensationType`, `minRewardAsk`, `maxRewardAsk` on Bounty, and `ask` on Submission.
8. **Both Bounties and Projects** — Bounties are one-off competitions (multiple winners, single payout each). Projects are longer engagements (one winner, milestone-based payments with tranches). Projects require freelancer contact info (e.g., phone/WhatsApp). `Submission.paymentDetails Json[]` tracks multi-tranche payments for projects.

### Architectural Changes vs. Original Plan

This revision replaces the original Next.js + NextAuth design with the following:

1. **Framework**: Next.js → **SvelteKit 2** (Svelte 5, Vite, `@sveltejs/adapter-vercel`).
2. **Auth**: NextAuth (Auth.js v5) → **Better Auth** (email/password + Google OAuth + email verification + password reset + admin plugin).
3. **Architecture**: Logic-in-routes → **Repository / Service / API** three-layer pattern. API endpoints are thin HTTP adapters that parse input, call a service, and serialise output.
4. **Company onboarding**: New global **`COMPANY_SELF_REGISTER`** toggle (admin-controlled). When OFF, the public `/register` page hides the COMPANY role; admins always retain the ability to invite a company by email (Better-Auth password-reset link → `/accept-invite`, mirroring `seed-invite.ts`).
5. **Email**: **Resend** drives all transactional + notification emails (auth, submission lifecycle, bounty lifecycle, weekly AI digests).
6. **Rich text**: **ProseKit** (`@prosekit/svelte`) for bounty description / requirements / deliverables and submission fields.
7. **PWA + Push**: Installable PWA via `@vite-pwa/sveltekit` with **Declarative Web Push** (VAPID) for urgent / time-sensitive events only. Service worker also caches critical static assets / app shell. No offline data sync at MVP.
8. **Background jobs**: Inline only at MVP (fire-and-forget via `event.platform.context.waitUntil` on Vercel). No queue, no cron — digests/reminders/retries deferred to Phase 9+.

All other product decisions stand (link submissions, labels, sponsor notes, two-phase winners, eligibility questions, FIXED/RANGE/VARIABLE, position-99 bonus, BOUNTY vs PROJECT, Monime escrow, OpenAI embeddings + optional Claude ranking, Cloudinary for avatars/logos, money in minor units, CUID IDs, mobile-first, localStorage drafts).

---

## Tech Stack

| Layer | Technology |
| :---- | :---- |
| Framework | **SvelteKit 2** (Svelte 5, Vite, `@sveltejs/adapter-vercel`) |
| Language | TypeScript (strict) |
| Database | PostgreSQL + **Prisma ORM** (provider-agnostic; `DATABASE_URL`) |
| Auth | **Better Auth** + Prisma adapter |
| UI | **shadcn-svelte** ([huntabyte/shadcn-svelte](https://github.com/huntabyte/shadcn-svelte)) + Tailwind CSS v4 |
| Rich text | **ProseKit** ([prosekit/prosekit](https://github.com/prosekit/prosekit)) |
| Validation | Zod |
| Payments | Monime API (escrow via per-bounty Financial Accounts) |
| AI matching | OpenAI `text-embedding-3-small`; Claude Sonnet ranking deferred |
| File storage | Cloudinary (avatars/logos only) |
| Email | **Resend** (`resend` SDK) |
| Push | **Web Push** with VAPID (`web-push` server lib) |
| PWA | `@vite-pwa/sveltekit` (Workbox) |
| SEO | **svelte-meta-tags** ([oekazuma/svelte-meta-tags](https://oekazuma.github.io/svelte-meta-tags/)) + **super-sitemap** ([jasongitmail/super-sitemap](https://github.com/jasongitmail/super-sitemap)) |
| Deployment | Vercel |

### Hosts

Two domains route to the same SvelteKit deploy on Vercel.

- `fow.sl` — public + freelancer + company platform.
- `admin.fow.sl` — admin panel only.

Both share one codebase, one database, one Better Auth instance. Host-based routing lives in `hooks.server.ts`. See §5 (Admin Subdomain) for the split.

---

## 1. Project Structure (SvelteKit)

```
fow/
├── .env.example
├── svelte.config.js
├── vite.config.ts
├── tsconfig.json
├── package.json
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts                    # Skills taxonomy + admin user + default Setting row
│   │                              # Categories: Development, Design, Writing, Marketing,
│   │                              # Data, Video, Community, Mobile & Telecom, Research & Consulting
│   │                              # SL-relevant: Mobile Money Integration, USSD Development,
│   │                              # SMS Gateway, WhatsApp Bots, Community Management,
│   │                              # Local Content Creation, Data Entry, Field Research,
│   │                              # NGO/Development Reporting, Social Media Marketing
│   └── migrations/
├── scripts/
│   └── seed-invite.ts             # Admin CLI fallback (mirrors the supplied reference)
├── static/
│   ├── manifest.webmanifest
│   ├── icons/                     # 192, 512, maskable
│   └── favicon.ico
└── src/
    ├── app.html
    ├── app.d.ts                   # App.Locals: { session, user, settings }
    ├── hooks.server.ts            # Better Auth handler + session resolution + Settings cache
    ├── service-worker.ts          # Vite PWA injects + custom push handler
    │
    ├── routes/
    │   ├── +layout.svelte                # Root shell, PWA install prompt, theme
    │   ├── +layout.server.ts             # Loads user + global Settings (toggle)
    │   ├── +page.svelte                  # Landing
    │   │
    │   ├── (auth)/                       # Centered auth layout
    │   │   ├── login/+page.svelte
    │   │   ├── register/+page.svelte
    │   │   ├── accept-invite/+page.svelte
    │   │   ├── forgot-password/+page.svelte
    │   │   └── verify-email/+page.svelte
    │   │
    │   ├── (platform)/                   # Authed shell: bottom nav (mobile) / sidebar (desktop)
    │   │   ├── +layout.svelte
    │   │   ├── +layout.server.ts         # requireAuth
    │   │   ├── bounties/
    │   │   │   ├── +page.svelte          # Browse + filters
    │   │   │   ├── create/+page.svelte
    │   │   │   └── [slug]/
    │   │   │       ├── +page.svelte
    │   │   │       ├── submit/+page.svelte
    │   │   │       └── submissions/+page.svelte
    │   │   ├── dashboard/
    │   │   │   ├── +page.server.ts       # Role-based redirect
    │   │   │   ├── company/…             # Mirrors original (overview, bounties, judge, fund, payments)
    │   │   │   └── freelancer/…          # Overview, submissions, recommendations, earnings
    │   │   ├── profile/+page.svelte
    │   │   ├── settings/notifications/+page.svelte   # Per-channel toggles
    │   │   └── notifications/+page.svelte
    │   │
    │   ├── admin/                        # Guard in +layout.server.ts
    │   │   ├── +layout.server.ts
    │   │   ├── settings/+page.svelte     # COMPANY_SELF_REGISTER toggle, future flags
    │   │   ├── invites/+page.svelte      # Invite company by email
    │   │   ├── users/+page.svelte
    │   │   ├── bounties/+page.svelte
    │   │   ├── payments/+page.svelte
    │   │   ├── disputes/+page.svelte
    │   │   └── skills/+page.svelte
    │   │
    │   └── api/                          # ALL endpoints are *thin*. Parse → service → respond.
    │       ├── auth/[...all]/+server.ts        # Better Auth catch-all
    │       ├── bounties/+server.ts
    │       ├── bounties/[bountyId]/+server.ts
    │       ├── bounties/[bountyId]/fund/+server.ts
    │       ├── bounties/[bountyId]/publish/+server.ts
    │       ├── bounties/[bountyId]/cancel/+server.ts
    │       ├── bounties/[bountyId]/announce-winners/+server.ts
    │       ├── bounties/[bountyId]/submissions/+server.ts
    │       ├── bounties/[bountyId]/submissions/[submissionId]/+server.ts
    │       ├── bounties/[bountyId]/submissions/[submissionId]/toggle-winner/+server.ts
    │       ├── bounties/[bountyId]/submissions/[submissionId]/label/+server.ts
    │       ├── users/me/+server.ts
    │       ├── users/me/notification-prefs/+server.ts
    │       ├── skills/+server.ts
    │       ├── matching/+server.ts
    │       ├── payments/+server.ts
    │       ├── push/subscribe/+server.ts        # Register PushSubscription
    │       ├── push/unsubscribe/+server.ts
    │       ├── webhooks/monime/+server.ts       # HMAC-verified
    │       ├── notifications/+server.ts
    │       ├── admin/invites/+server.ts         # POST: invite company by email
    │       ├── admin/settings/+server.ts        # PATCH: toggle settings
    │       └── admin/stats/+server.ts
    │
    └── lib/
        ├── client/                        # Browser-only modules
        │   ├── push.ts                    # subscribe()/unsubscribe()/registerSW
        │   ├── auth-client.ts             # better-auth client
        │   └── stores/…
        │
        ├── server/                        # Server-only (never imported by client code)
        │   ├── db.ts                      # Prisma singleton
        │   ├── auth.ts                    # Better Auth (SvelteKit-aware)
        │   ├── auth-cli.ts                # Better Auth (Node-only; used by scripts/seed-invite.ts)
        │   ├── http.ts                    # AppError + respondError helpers
        │   ├── sanitize.ts                # sanitize-html allowlist (rich text trust boundary)
        │   ├── settings.ts                # In-memory cache w/ TTL for Setting rows
        │   │
        │   ├── email/
        │   │   ├── client.ts              # Resend instance
        │   │   ├── send.ts                # sendEmail(template, props, to)
        │   │   └── templates/             # One .ts module per template, returns {subject, html, text}
        │   │       ├── verify-email.ts
        │   │       ├── reset-password.ts
        │   │       ├── invite-company.ts
        │   │       ├── submission-received.ts
        │   │       ├── submission-shortlisted.ts
        │   │       ├── winners-announced.ts
        │   │       ├── payout-completed.ts
        │   │       ├── bounty-published.ts
        │   │       ├── bounty-funded.ts
        │   │       ├── bounty-deadline.ts        # deferred (cron)
        │   │       ├── bounty-cancelled.ts
        │   │       └── weekly-digest.ts          # deferred (cron)
        │   │
        │   ├── push/
        │   │   ├── client.ts              # web-push configured w/ VAPID
        │   │   └── send.ts                # sendPush(userId, payload)
        │   │
        │   ├── monime/
        │   │   ├── client.ts              # Typed wrapper (financialAccounts, checkoutSessions, payouts, internalTransfers)
        │   │   └── webhook.ts             # HMAC verification + event routing
        │   │
        │   ├── ai/
        │   │   ├── embeddings.ts          # OpenAI client + cosine util
        │   │   └── matching.ts            # Top-N retrieval
        │   │
        │   ├── cloudinary.ts              # Avatars/logos uploader
        │   │
        │   ├── repositories/              # ONLY DB I/O. No business rules.
        │   │   ├── base.ts                # Optional shared type helpers
        │   │   ├── user.repo.ts
        │   │   ├── company.repo.ts
        │   │   ├── freelancer.repo.ts
        │   │   ├── skill.repo.ts
        │   │   ├── bounty.repo.ts
        │   │   ├── submission.repo.ts
        │   │   ├── payment.repo.ts
        │   │   ├── notification.repo.ts
        │   │   ├── pushSubscription.repo.ts
        │   │   ├── invite.repo.ts
        │   │   └── settings.repo.ts
        │   │
        │   └── services/                  # Business rules. Compose repos + external clients.
        │       ├── auth.service.ts        # registerCompany/Freelancer w/ toggle enforcement
        │       ├── invite.service.ts      # createCompanyInvite (admin only)
        │       ├── settings.service.ts    # Read/write platform toggles
        │       ├── bounty.service.ts      # CRUD + publish + cancel
        │       ├── escrow.service.ts      # State machine (Monime calls)
        │       ├── submission.service.ts  # Create / label / notes / toggle-winner
        │       ├── winner.service.ts      # announceWinners(), payProjectTranche()
        │       ├── matching.service.ts    # Embedding gen + retrieval
        │       ├── notification.service.ts # Persists Notification + dispatches Email + Push
        │       └── payment.service.ts     # Reconcile webhooks → Payment rows
        │
        ├── validators/                    # Zod schemas, importable both server + client
        │   ├── bounty.ts
        │   ├── submission.ts
        │   ├── user.ts
        │   ├── invite.ts
        │   └── settings.ts
        │
        ├── components/
        │   ├── ui/                        # shadcn-svelte primitives (added via npx shadcn-svelte@latest add …)
        │   ├── layout/                    # Header, sidebar, bottom-nav, footer, PWA install
        │   ├── editor/                    # ProseKit-based rich text editor + read-only renderer
        │   │   ├── RichTextEditor.svelte
        │   │   └── RichTextView.svelte
        │   ├── bounty/  submission/  dashboard/  matching/  payment/  profile/  shared/
        │   │
        │   └── push/
        │       └── PushPrompt.svelte      # Asks for permission; mounted post-login
        │
        ├── hooks/                         # Svelte action helpers (NOT SvelteKit hooks)
        │   ├── useDebounce.ts
        │   └── useLocalDraft.ts           # localStorage auto-save (multi-step forms)
        │
        └── types/
            ├── index.ts
            ├── monime.ts
            └── env.d.ts
```

---

## 2. Architecture — Repository → Service → API

Every server-side feature follows this layering. **API handlers never touch Prisma directly.** Services do not handle HTTP. Repositories do not contain business rules.

### Layer 1 — Repository (`src/lib/server/repositories/*.repo.ts`)

- Pure Prisma I/O. Single-purpose functions: `findById`, `findBySlug`, `create`, `update`, `listActive`, etc.
- Accepts plain arguments, returns Prisma model types (or narrow `select`/`include` types).
- **No** authorization, no validation, no external API calls, no notifications.
- Example signatures (`bounty.repo.ts`):
  ```ts
  export async function findBountyById(id: string) { … }
  export async function findBountyBySlug(slug: string) { … }
  export async function listActiveBounties(filter: BountyFilter) { … }
  export async function createBounty(data: Prisma.BountyCreateInput) { … }
  export async function updateBountyStatus(id: string, status: BountyStatus) { … }
  ```

### Layer 2 — Service (`src/lib/server/services/*.service.ts`)

- Owns business rules, ordering of operations, cross-entity coordination, external API calls (Monime, Resend, OpenAI, Web Push).
- Throws typed errors (`AppError` with `code` + `httpStatus`) that the API layer maps to HTTP responses.
- Authorisation checks happen here — the service receives the *caller* (`AuthedUser` from session) as the first argument.
- Example (`winner.service.ts`):
  ```ts
  export async function announceWinners(caller: AuthedUser, bountyId: string) {
    const bounty = await bountyRepo.findBountyById(bountyId);
    assertOwner(caller, bounty);                     // throws Forbidden
    assertStatus(bounty, ['JUDGING']);               // throws Conflict
    const winners = await submissionRepo.listWinners(bountyId);
    validatePayoutMethods(winners);                  // throws BadRequest
    validateEscrowCovers(bounty, winners);           // throws BadRequest
    const payouts = await escrowService.payoutWinners(bounty, winners);
    await bountyRepo.markWinnersAnnounced(bountyId);
    await notificationService.notifyWinners(bounty, winners, payouts);
    return { bounty, payouts };
  }
  ```

### Layer 3 — API endpoint (`src/routes/api/.../+server.ts`)

- **Thin.** Parse body via Zod, resolve session, call service, return JSON.
- Map `AppError` codes to status codes via a single `respondError(e)` helper.
- Template:
  ```ts
  // src/routes/api/bounties/[bountyId]/announce-winners/+server.ts
  import { json } from '@sveltejs/kit';
  import { announceWinners } from '$lib/server/services/winner.service';
  import { requireAuth } from '$lib/server/auth';
  import { respondError } from '$lib/server/http';

  export const POST = async ({ params, locals }) => {
    const user = requireAuth(locals);                // 401 if no session
    try {
      const result = await announceWinners(user, params.bountyId);
      return json(result);
    } catch (e) { return respondError(e); }
  };
  ```

### Authorisation helpers (`src/lib/server/auth-helpers.ts`)

- `requireAuth(locals)` — returns `AuthedUser` or throws 401.
- `requireRole(user, ...roles)` — throws 403.
- `assertOwner(user, resource)` — throws 403 when `resource.companyProfile.userId !== user.id` (unless admin).

### Layering audit
Add a CI grep step:
```bash
grep -r "prisma\." src/routes && exit 1   # routes must NOT import Prisma directly
grep -r "fetch.*monime" src/routes && exit 1
```

---

## 3. Database Schema (Prisma)

### Enums

```prisma
enum UserRole         { COMPANY  FREELANCER  ADMIN }
enum BountyStatus     { DRAFT  FUNDED  ACTIVE  JUDGING  COMPLETED  CANCELLED }
enum BountyType       { BOUNTY  PROJECT }
enum CompensationType { FIXED  RANGE  VARIABLE }
enum SubmissionStatus { PENDING  APPROVED  REJECTED }
enum SubmissionLabel  { UNREVIEWED  REVIEWED  SHORTLISTED  SPAM  LOW_QUALITY  MID_QUALITY  HIGH_QUALITY }
enum PaymentType      { ESCROW_DEPOSIT  PRIZE_PAYOUT  REFUND }
enum PaymentStatus    { PENDING  PROCESSING  COMPLETED  FAILED }
enum InviteStatus     { PENDING  ACCEPTED  REVOKED }
```

### Models (preserved from original)

- **Better Auth tables** (`user`, `account`, `session`, `verification`) — generated by the Better Auth Prisma adapter. The `user` table is extended with custom columns (`role`, `phoneNumber`, `isActive`, `image`) via Better Auth's `user.additionalFields` config.
- **CompanyProfile** — `id`, `userId` (unique), `companyName`, `description?`, `website?`, `logo?`, `industry?`, `country` (default `"SL"`), `verified` (default `false`), `monimePayoutMomoNumber?`. Relations: `user`, `bounties[]`.
- **FreelancerProfile** — `id`, `userId` (unique), `displayName`, `headline?`, `bio?`, `portfolio?`, `experienceLevel?`, `momoNumber?`, `whatsappNumber String?`, `bankDetails Json?`, `aiEmbedding Float[]`. Relations: `user`, `skills[]`, `submissions[]`.
- **SkillCategory** — `id`, `name` (unique), `slug` (unique). Relations: `skills[]`.
- **Skill** — `id`, `name` (unique), `slug` (unique), `categoryId`. Relations: `category`, `freelancerSkills[]`, `bountySkills[]`.
- **FreelancerSkill** — `id`, `freelancerProfileId`, `skillId`, `proficiencyLevel` (1-5), `yearsExperience?`. Unique on `[freelancerProfileId, skillId]`.
- **Bounty** — Core model:
  - Identity: `id` (cuid), `companyProfileId`, `title`, `slug` (unique), `description` (sanitised HTML), `requirements?` (sanitised HTML), `deliverables?` (sanitised HTML).
  - Type & status: `type` (BountyType, default `BOUNTY`), `status` (BountyStatus, default `DRAFT`).
  - Compensation: `compensationType` (default `FIXED`), `currency` (default `"SLE"`), `totalPrizePool Int` (minor units), `rewardAmount Int?`, `minRewardAsk Int?`, `maxRewardAsk Int?`, `rewards Json?` (map of position → amount, e.g. `{1:10000, 2:5000, 99:1000}`).
  - Winners: `numberOfWinners Int` (default 1), `maxBonusSpots Int` (default 0), `isWinnersAnnounced` (default false), `winnersAnnouncedAt?`.
  - Eligibility: `eligibility Json?` (array of `{question, optional}`).
  - Timeline: `timeToComplete String?` (for projects, e.g. "2 weeks"), `submissionDeadline`, `judgingDeadline?`, `publishedAt?`, `completedAt?`, `cancelledAt?`.
  - Monime escrow: `escrowFinancialAccountId?`, `escrowFundedAmount Int` (default 0), `checkoutSessionId?`, `checkoutSessionUrl?`.
  - AI: `aiEmbedding Float[]`.
  - Meta: `createdAt`, `updatedAt`.
  - Relations: `company`, `prizeTiers[]`, `skills[]`, `submissions[]`, `payments[]`.
  - **Bounty type rules**: BOUNTY ⇒ multiple winners (positions 1, 2, 3… + optional 99 bonus), single payout per winner. PROJECT ⇒ single winner (position 1 only), multi-tranche milestone payouts, requires `timeToComplete`.
- **PrizeTier** — `id`, `bountyId`, `position Int` (1=first, 99=bonus), `amount Int` (minor units), `label?`. Unique on `[bountyId, position]`.
- **BountySkill** — junction: `bountyId`, `skillId`, `isRequired` (default false). Unique on `[bountyId, skillId]`.
- **Submission**:
  - Identity: `id` (cuid), `bountyId`, `freelancerProfileId`.
  - Content: `link String` (required URL), `tweet String?` (optional URL), `otherInfo String?` (sanitised HTML).
  - Status: `status` (default `PENDING`), `label` (default `UNREVIEWED`), `isActive` (default true).
  - Eligibility: `eligibilityAnswers Json?` (array of `{question, answer}`).
  - Compensation ask: `ask Int?` (for RANGE/VARIABLE bounties, minor units).
  - Winner fields: `isWinner` (default false), `winnerPosition Int?`.
  - Judging: `score Int?`, `feedback String?` (sanitised HTML, sponsor → freelancer), `notes String?` (sponsor-private, never returned to freelancer).
  - Payment: `prizeAmount Int?`, `isPaid` (default false), `paymentDetails Json?` (array of `{monimePayoutId, amount, tranche}` for projects).
  - Meta: `createdAt`, `updatedAt`.
  - Unique on `[bountyId, freelancerProfileId]`.
  - Relations: `bounty`, `freelancer`, `payments[]`.
- **Payment** — tracks all money movement: `id` (cuid), `bountyId`, `submissionId?`, `type` (PaymentType), `status` (PaymentStatus, default `PENDING`), `currency` (default `"SLE"`), `amount Int`, `feeAmount Int` (default 0), `fromEntity?`, `toEntity?`, `checkoutSessionId?`, `monimePaymentId?`, `monimePayoutId?`, `failureCode?`, `failureMessage?`, `retryCount Int` (default 0), `createdAt`, `updatedAt`. Relations: `bounty`, `submission?`.
- **Dispute** — `id`, `bountyId`, `raisedById`, `reason String`, `status String` (default `"OPEN"`), `resolution?`, `createdAt`, `updatedAt`.

### Models (new in this revision)

- **Setting** — platform-wide toggles, cached in memory with 60s TTL via `settings.service.ts`.
  - `id`, `key` (unique), `value Json`, `updatedAt`, `updatedById?`.
  - Seed row: `{ key: "COMPANY_SELF_REGISTER", value: { enabled: true } }`.
- **CompanyInvite** — tracks admin-issued company invites.
  - `id` (cuid), `email`, `companyName?`, `invitedById`, `status` (`InviteStatus`, default `PENDING`), `acceptedUserId?`, `createdAt`, `acceptedAt?`.
  - Unique partial index on `email` where `status = PENDING` (one open invite per email at a time).
- **PushSubscription** — one row per device.
  - `id`, `userId`, `endpoint` (unique), `p256dh`, `auth`, `userAgent?`, `createdAt`.
- **NotificationPreference** — one row per user; `Json` map of `{ eventType: { email: bool, push: bool, inApp: bool } }`. Defaults applied in code if missing.
- **Notification** (revised) — `id`, `userId`, `eventType String` (e.g. `SUBMISSION_RECEIVED`, `WINNERS_ANNOUNCED`, `PAYOUT_COMPLETED`, `BOUNTY_PUBLISHED`, `BOUNTY_DEADLINE`, `WEEKLY_DIGEST`, …), `title`, `message?`, `link?`, `isRead` (default false), `createdAt`. The original `channel` column is dropped — channels are no longer 1:1 with rows; the notification *service* fans out to email + push + in-app.

### Indexes

- All foreign keys (`companyProfileId`, `freelancerProfileId`, `bountyId`, `submissionId`, `userId`, `categoryId`, `skillId`, `invitedById`).
- Status fields (`Bounty.status`, `Submission.status`, `Submission.label`, `Payment.status`, `CompanyInvite.status`).
- Slug fields (`Bounty.slug`, `Skill.slug`, `SkillCategory.slug`).
- `Notification.userId + eventType + createdAt` composite for feed queries.
- `PushSubscription.userId`.

### Key design decisions

- **All money in minor units** (Int, never Float) to avoid precision issues.
- **CUID IDs** to prevent enumeration attacks.
- **Link-based submissions** — no file-upload infrastructure for submissions; Cloudinary only for profile avatars/logos.
- **Embeddings as `Float[]`** initially; migrate to pgvector past ~10k users.
- **Position 99 = bonus** — simple convention, no extra enum.
- **Two-phase winners** — selection (`isWinner` toggles) is separate from announcement (`isWinnersAnnounced`).
- **Rich text stored as sanitised HTML** — `sanitize-html` allowlist applied on every write (see §15).

### Sierra Leone market context (unchanged)

- **Population**: 8.8M, median age 19.7. Massive young population with limited formal employment.
- **Internet**: ~30% penetration. Mobile-dominant. 1–17 Mbps typical. Data ~$0.67/GB.
- **Payments**: 85%+ unbanked. Mobile money (Afrimoney, Orange Money) is primary. Monime aggregates. Salone Payment Switch (2025) enables MoMo-bank interoperability.
- **Tech ecosystem**: Nascent, growing. Hubs: Sensi Tech Hub, Innovation SL. Government-backed Learn2Earn program.
- **Competition**: No local bounty/freelance platform; global platforms don't support MoMo payouts. FOW's edge: local payment rails + escrow.
- **Language**: English (business/tech). Krio (spoken by 90%+) deferred.
- **Regulatory**: Data-protection law in draft. Fintech sandbox exists. Bank of Sierra Leone regulates mobile money.

---

## 4. Authentication — Better Auth

### Setup

- `src/lib/server/auth.ts` — SvelteKit-aware Better Auth instance (used in `hooks.server.ts` and API routes).
- `src/lib/server/auth-cli.ts` — identical config but without any `$app/*` imports; used by Node scripts (`scripts/seed-invite.ts`). Mirrors the pattern in the supplied reference file exactly.
- Plugins enabled:
  - **Email & Password** — built-in, with `requireEmailVerification: true`.
  - **Email verification** — built-in; `sendVerificationEmail` calls `email/send.ts` with the `verify-email` template.
  - **Password reset** — built-in; `sendResetPassword` uses `reset-password` template. **Reused verbatim for invites** with `redirectTo: '/accept-invite'`.
  - **Google OAuth** — `socialProviders.google`.
  - **Admin plugin** — provides server endpoints to list/ban/impersonate users and set roles; consumed by `/admin/users`.
- `additionalFields` on user:
  - `role` — enum `COMPANY | FREELANCER | ADMIN`, **`input: false`** so the public signup endpoint cannot set it. Services mutate it server-side.
  - `phoneNumber String?`
  - `isActive Boolean` (default true).
- Session strategy: cookie-based, **host-only scoping** (no `Domain` attribute) so sessions on `admin.fow.sl` are independent from `fow.sl`. `trustedOrigins` lists both production hosts and both dev hosts (`localhost:5173`, `admin.localhost:5173`). See §5 for the full subdomain split.
- Password policy hook (Better Auth `password.validator`): `>=8 chars`, must contain at least one digit. Matches the throwaway password generation in `seed-invite.ts`.

### `hooks.server.ts`

1. Delegate `/api/auth/*` to Better Auth's handler.
2. Resolve the session on every other request; stash `{ user, session }` on `event.locals`.
3. Load cached `Setting` rows into `event.locals.settings` (used by `/register` to hide the COMPANY role when self-register is OFF).

### Registration flows

**Freelancer self-register** — always available.
1. `/register` POSTs `{ role: 'FREELANCER', email, password, name }`.
2. `auth.service.registerFreelancer()` calls `auth.api.signUpEmail()`, then patches `role` and creates the `FreelancerProfile`, and triggers verification email.

**Company self-register** — only when `Setting.COMPANY_SELF_REGISTER.enabled === true`.
1. `/register` reads `locals.settings.COMPANY_SELF_REGISTER`. When `false`, COMPANY is hidden from the role selector and the page shows: *"Companies join FOW by invitation only. Contact your admin."*
2. Same path as freelancer but creates `CompanyProfile`.

**Company invite (always available to admin)** — from `/admin/invites` or `scripts/seed-invite.ts`.
1. Admin submits `{ email, companyName?, name? }`.
2. `invite.service.createCompanyInvite(caller, input)`:
   - Inserts a `CompanyInvite` row (status `PENDING`).
   - Creates a User via `auth.api.signUpEmail()` with a 32-byte throwaway password (same approach as `seed-invite.ts`).
   - Sets `role = COMPANY`, `isActive = true` directly via Prisma (because `input: false` blocks role on the public signup).
   - Pre-creates an empty `CompanyProfile` with the supplied `companyName`.
   - Calls `auth.api.requestPasswordReset({ email, redirectTo: '/accept-invite' })`.
3. Resend delivers the invite email via the `invite-company` template (subject *"You've been invited to FOW"*).
4. Invitee opens the link → `/accept-invite` → sets first password → on success, `invite.service.completeInvite()` marks `CompanyInvite.status = ACCEPTED` and stamps `acceptedUserId`.

Both the UI and the CLI path call the **same** `invite.service` to avoid divergence. `scripts/seed-invite.ts` mirrors the supplied reference: re-issues the link if the user already exists, prints the dev-email URL to stdout.

### Route protection

Done in **`+layout.server.ts`** files (SvelteKit's idiomatic guard) rather than middleware:

- `(platform)/+layout.server.ts` → `requireAuth`.
- `(platform)/dashboard/company/+layout.server.ts` → `requireRole('COMPANY')`.
- `(platform)/dashboard/freelancer/+layout.server.ts` → `requireRole('FREELANCER')`.
- `admin/+layout.server.ts` → `requireRole('ADMIN')`.

API routes call `requireAuth(locals)` / `requireRole(...)` themselves.

**Public routes**: `/`, `/login`, `/register`, `/bounties`, `/bounties/[slug]`, `/api/webhooks/*`.

---

## 5. Admin Subdomain

The admin panel is served from a dedicated subdomain. Same codebase, host-based routing in `hooks.server.ts`. Sessions are host-only so admin auth state is isolated from the main platform.

### Hosts

- **Production**: `fow.sl` (platform) + `admin.fow.sl` (admin).
- **Local dev**: `localhost:5173` (platform) + `admin.localhost:5173` (admin).
  - Chromium/Safari resolve `*.localhost` to `127.0.0.1` natively.
  - Firefox: add `127.0.0.1 admin.localhost` to `/etc/hosts` (documented in README).

### Routing (`src/lib/server/host.ts` + `hooks.server.ts`)

`src/lib/server/host.ts`:
- `isAdminHost(url)` — returns true when `url.hostname` starts with `admin.` or equals `admin.localhost`.
- `mainHostFor(url)` — strips the leading `admin.` for redirect targets, preserving port.

`hooks.server.ts` (`handle` hook, running before any service code):
1. Let Better Auth handle `/api/auth/*` on any host first.
2. If `isAdminHost(url)`:
   - `pathname === "/"` → `302` to `/admin`.
   - `pathname` not in `["/admin*", "/api/*", "/login", "/forgot-password", "/accept-invite", "/verify-email"]` → `404`. Keeps the admin host single-purpose while still permitting the auth-page allowlist.
3. Else (main host):
   - `pathname` starts with `/admin` or `/api/admin` → `302` to `https://admin.<host>${pathname}${search}` (port preserved in dev).
4. Stash `event.locals.isAdminHost` so layouts can branch on chrome (admin vs platform).

### Sessions (independent per host)

Better Auth `advanced.cookies.sessionToken.attributes`:
- The `domain` field is **omitted** so the cookie is host-only. `admin.fow.sl` cookies do not leak to `fow.sl` and vice versa.
- Local dev: same — host-only cookies. `admin.localhost` and `localhost` get separate cookie jars (browsers treat them as different origins).
- `secure: true` in prod, `sameSite: "lax"`, `httpOnly: true`.

Consequence: a freelancer logged in on `fow.sl` who navigates to `admin.fow.sl` sees the admin login page. Intentional — reduces session-theft blast radius if main-site code is compromised.

### Login on the admin host

`/admin/+layout.server.ts` calls `requireRole('ADMIN')` and redirects unauthenticated visitors to `/login` (relative — stays on `admin.fow.sl`). The `/login` route is shared code, but on the admin host the host rule allowlists it explicitly so it doesn't 404.

### Better Auth `trustedOrigins`

In `src/lib/server/auth.ts`:

```ts
trustedOrigins: [
  'https://fow.sl',
  'https://admin.fow.sl',
  'http://localhost:5173',
  'http://admin.localhost:5173',
]
```

### Vercel configuration

- Add both `fow.sl` and `admin.fow.sl` to the project's Domains list.
- No `vercel.json` rewrites needed; the SvelteKit hook handles routing.
- `BETTER_AUTH_URL` is set to the canonical origin (`https://fow.sl`). Cookie scoping is host-only so cross-origin URL doesn't matter for cookie domain; what matters is that `trustedOrigins` includes both hosts.

### SEO on the admin host

- `robots.txt/+server.ts` inspects the request host. When `isAdminHost(url)`, serve `User-agent: *\nDisallow: /`.
- Main host `robots.txt` is unchanged; `super-sitemap`'s `excludeRoutePatterns` already covers `^/admin.*` so the sitemap stays clean.

### Cross-host link in the platform shell

When the logged-in user is ADMIN on the main host, the user dropdown renders an "Admin portal" link pointing at `PUBLIC_ADMIN_URL`. Clicking it lands on `admin.fow.sl/login` (because sessions are independent).

---

## 6. Escrow Flow (Monime Integration)

Monime has **no native escrow**. We build it at the application level using dedicated financial accounts per bounty. State machine moves from the original `src/lib/escrow.ts` into **`src/lib/server/services/escrow.service.ts`** (uses `monime/client.ts` + `bounty.repo.ts` + `payment.repo.ts` + `notification.service.ts`). The webhook handler at `src/routes/api/webhooks/monime/+server.ts` only HMAC-verifies and routes to `escrow.service.handleWebhook(event)`.

```
Flow
1. Company creates bounty (DRAFT)
   └─> escrow.service.createEscrowAccount(bounty)
       Creates a Monime Financial Account
       Stores escrowFinancialAccountId on Bounty

2. Company funds bounty
   └─> escrow.service.createFundingCheckoutSession(bounty)
       Creates Monime Checkout Session targeting the escrow account
       Returns checkoutSessionUrl; client redirects to Monime hosted checkout

3. Monime sends webhook: checkout_session.completed
   └─> Handler verifies HMAC, idempotency check on monimePaymentId
       Verifies deposited amount === totalPrizePool
       Updates Bounty status: DRAFT → FUNDED
       Creates Payment record (ESCROW_DEPOSIT, COMPLETED)
       notification.service.dispatch(companyOwner, 'BOUNTY_FUNDED')

4. Company publishes bounty
   └─> Status: FUNDED → ACTIVE
       matching.service.recomputeBountyEmbedding(bountyId)
       notification.service.dispatch matched-freelancer fan-out (BOUNTY_PUBLISHED)

5. Submission deadline passes → Company reviews
   └─> Status: ACTIVE → JUDGING (manual button or — deferred — cron)

6. Company reviews submissions (two-phase winner flow)
   Phase A — Triage & selection:
       - submission.service.setLabel(caller, id, label)
       - submission.service.setNotes(caller, id, notes)
       - submission.service.toggleWinner(caller, id, position)
       - For RANGE/VARIABLE bounties, sponsor reviews freelancer ask amounts
   Phase B — Announce Winners (single action):
       - winner.service.announceWinners(caller, bountyId)
         · Validates all selected winners have payout methods
         · Validates total payouts <= escrow balance
         · Validates positions (1..N for regular, 99 for bonus, count <= maxBonusSpots)
         · For BOUNTY: single payout per winner based on position
         · For PROJECT: first tranche payout to the single winner
         · Locks results (isWinnersAnnounced = true, winnersAnnouncedAt set)
         · Triggers Monime Payouts from escrow → winners' MoMo/bank
         · Creates Payment records (PRIZE_PAYOUT, PROCESSING)
         · notification.service.dispatch to all submitters (winners + non-winners)
         · Bounty status: JUDGING → COMPLETED

7. For PROJECT type — subsequent tranche payouts
   └─> winner.service.payProjectTranche(caller, submissionId, amount)
       Appends to Submission.paymentDetails:
       [{monimePayoutId, amount, tranche: 1}, {monimePayoutId, amount, tranche: 2}, …]

8. Monime sends webhook: payout.completed / payout.failed
   └─> Updates Payment status
       Updates Submission.isPaid when all tranches complete
       notification.service.dispatch (PAYOUT_COMPLETED to winner, PAYOUT_FAILED to admin)
```

### Edge cases

- **Cancellation with refund**: DRAFT/FUNDED/ACTIVE bounty with escrow funds → initiate payout from escrow back to company's MoMo. Status → CANCELLED. All submitters notified by email + in-app.
- **Partial funding**: Don't move to FUNDED until deposited amount equals `totalPrizePool`. Checkout session can be re-created.
- **Payout failure**: Mark Payment FAILED, alert admins for manual intervention. Inline retry with exponential backoff, max 3 attempts (queue-based retry deferred to Phase 9+).
- **Winner without payout method**: Block winner announcement until all selected winners have MoMo/bank details.
- **Bonus winners**: Validate `count(position=99) <= maxBonusSpots`.
- **Project tranche failure**: Block next tranche until previous tranche `COMPLETED`.
- **Mobile money limits**: Afrimoney daily SLE 15,000, monthly SLE 100,000. For amounts exceeding limits, fall back to bank transfer (supported by Monime). Warn sponsors during checkout if amount > MoMo daily limit.

### Key files

```
src/lib/server/monime/client.ts        - API client wrapper (financialAccounts, checkoutSessions, payouts, internalTransfers)
src/lib/server/services/escrow.service.ts - State machine: createEscrowAccount, createFundingCheckoutSession,
                                          handleFundingCompleted, payoutWinners, payProjectTranche, cancelBountyWithRefund
src/routes/api/webhooks/monime/+server.ts - Thin HMAC verifier + event router
```

---

## 7. Email System (Resend)

- `src/lib/server/email/client.ts` — Resend instance.
- `src/lib/server/email/send.ts` — `sendEmail({ to, template, props })` resolves a template module, renders to HTML+text, calls `resend.emails.send`. Wrapped in try/catch — never throws to caller (emails are advisory). Failures logged with structured error.
- Templates live as plain TS functions returning `{ subject, html, text }` (no SSR-rendering toolchain). Use inline-styled HTML for broad email-client compat.

### Required templates at MVP

- **Auth**: `verify-email`, `reset-password`, `invite-company`.
- **Submission**: `submission-received` (to sponsor), `submission-shortlisted`, `winners-announced` (winner + non-winner variants), `payout-completed`.
- **Bounty**: `bounty-published` (to matched freelancers — top-30 by embedding cosine), `bounty-funded` (to sponsor), `bounty-cancelled` (to sponsor + all submitters).

### Deferred to Phase 9+ (require scheduler)

- `bounty-deadline` (24h before `submissionDeadline`).
- `weekly-digest` (AI-matching digest of top recommended bounties).
- Payout-failure retry as scheduled job (currently inline w/ 3 attempts).

### Dispatch flow

`notification.service.dispatch(userId, eventType, payload)`:

1. Creates a `Notification` row (in-app feed).
2. Loads `NotificationPreference` (defaults if missing).
3. If `email.enabled` for this event → `email/send.ts`.
4. If event is in the **urgent push set** AND `push.enabled` → `push/send.ts` to all of user's `PushSubscription` rows.

Email + push are fired with `event.platform.context.waitUntil(...)` so the originating request completes even if Resend / Web Push is slow.

---

## 8. Push Notifications (Declarative Web Push)

**Trigger policy**: push is reserved for **urgent / time-sensitive** events:
`SUBMISSION_SHORTLISTED`, `WINNERS_ANNOUNCED`, `PAYOUT_COMPLETED`, `PAYOUT_FAILED`, `BOUNTY_DEADLINE_IMMINENT`. All other events stay email + in-app only.

### Server side

- `src/lib/server/push/client.ts` — `web-push` library configured with `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.
- `src/lib/server/push/send.ts` — `sendPush(userId, { title, body, url, tag })`:
  - Loads all `PushSubscription` rows for the user.
  - For each, calls `webpush.sendNotification(sub, JSON.stringify(payload))`.
  - On 410 (Gone) / 404, deletes the subscription row.

### Client side (`src/lib/client/push.ts`)

- `registerSW()` — registers `/service-worker.js`.
- `requestPermission()` — calls `Notification.requestPermission()` only after the user clicks an explicit "Enable" button (iOS PWAs and Chrome down-rank silent prompts).
- `subscribe()` — converts VAPID public key from base64url to Uint8Array, calls `pushManager.subscribe`, POSTs `{ endpoint, keys: {p256dh, auth} }` to `/api/push/subscribe`.
- `unsubscribe()` — opposite.
- `src/lib/components/push/PushPrompt.svelte` — mounted on `(platform)` layout; dismissable banner shown after first login.

### Service worker (`src/service-worker.ts`)

- `@vite-pwa/sveltekit` generates the Workbox boilerplate.
- Custom `push` handler: parses payload → `self.registration.showNotification(title, { body, icon, badge, data: { url }, tag })`.
- Custom `notificationclick` handler: focuses or opens `data.url`.
- **Declarative Web Push** (`application/web-push-options+json`) is deferred until broad browser support — at MVP we ship the explicit `push` handler which works across Safari 16.4+, Chrome, Edge, Firefox.

---

## 9. PWA Setup

- `@vite-pwa/sveltekit` plugin configured in `vite.config.ts`.
- Manifest fields: `name`, `short_name`, `description`, `start_url`, `display: standalone`, `theme_color`, `background_color`, `icons` (192, 512, maskable). `gcm_sender_id` not required (VAPID).
- Workbox strategies (critical-asset caching only):
  - **App shell** (`/`, `/bounties`, `/login`): `NetworkFirst` with 3 s timeout, fallback to cache.
  - **Static assets** (`/_app/immutable/*`, fonts, icons): `CacheFirst`, 1-year expiry.
  - **API**: `NetworkOnly` (no caching — auth and freshness matter).
- Install prompt UI in root `+layout.svelte` listening for `beforeinstallprompt`.
- **No** offline data sync, **no** IndexedDB queues, **no** background sync at MVP (deferred to Phase 9+).

---

## 10. AI Matching System

Two-level architecture (unchanged logic, repackaged into services).

### Level 1 — Embedding pre-filtering (fast)

- `src/lib/server/ai/embeddings.ts` — OpenAI `text-embedding-3-small` (1536 dims), `cosineSimilarity(a, b)`.
- Trigger points:
  - `freelancer.service.updateProfile` → `matching.service.recomputeFreelancerEmbedding(freelancerId)`.
  - `bounty.service.publish` → `matching.service.recomputeBountyEmbedding(bountyId)`.
- `matching.service.recommendBounties(freelancerId)` returns top 50 by cosine.

### Level 2 — Claude ranking (deferred)

- When freelancer visits `/dashboard/freelancer/recommendations`, top 30 embedding matches → Claude Sonnet → ranked list with `matchScore` (0–100), `reason`, `skillGaps`. Fallback to embedding-sorted on LLM failure.
- **Defer to Phase 5+**, gated behind a feature flag. Only enable when freelancer base > ~500.

### Cost controls

- **Level 1**: Run for all bounties — cost negligible (~$0.02/1M tokens).
- **Level 2**: Feature-flag-gated, off by default.
- Cache all embeddings; regenerate only on profile/bounty content changes.

### Scaling path

When user base exceeds ~10k, add pgvector and move similarity to SQL:

```sql
SELECT id, 1 - (ai_embedding <=> $1::vector) AS similarity
FROM "Bounty" WHERE status = 'ACTIVE'
ORDER BY ai_embedding <=> $1::vector LIMIT 50;
```

---

## 11. API Routes

All mutation routes validate via Zod. All protected routes verify session + role + ownership. Every `+server.ts` follows the thin template in §2.

| Method | Route | Auth | Role | Service call |
| ---- | ---- | ---- | ---- | ---- |
| GET/POST | `/api/auth/[...all]` | – | – | Better Auth handler |
| GET | `/api/bounties` | No | – | `bounty.service.listBounties` |
| POST | `/api/bounties` | Yes | COMPANY | `bounty.service.createBounty` |
| GET | `/api/bounties/[bountyId]` | No | – | `bounty.service.getBounty` |
| PATCH | `/api/bounties/[bountyId]` | Yes | Owner | `bounty.service.updateBounty` |
| DELETE | `/api/bounties/[bountyId]` | Yes | Owner | `bounty.service.deleteDraft` |
| POST | `/api/bounties/[bountyId]/fund` | Yes | Owner | `escrow.service.createFundingCheckoutSession` |
| POST | `/api/bounties/[bountyId]/publish` | Yes | Owner | `bounty.service.publish` |
| POST | `/api/bounties/[bountyId]/cancel` | Yes | Owner | `escrow.service.cancelBountyWithRefund` |
| POST | `/api/bounties/[bountyId]/announce-winners` | Yes | Owner | `winner.service.announceWinners` |
| GET | `/api/bounties/[bountyId]/submissions` | Yes | Owner/Admin | `submission.service.listForBounty` |
| POST | `/api/bounties/[bountyId]/submissions` | Yes | FREELANCER | `submission.service.create` |
| GET/PATCH | `/api/bounties/[bountyId]/submissions/[submissionId]` | Yes | Relevant | `submission.service.getOrUpdate` |
| POST | `/api/bounties/[bountyId]/submissions/[submissionId]/toggle-winner` | Yes | Owner | `submission.service.toggleWinner` |
| PATCH | `/api/bounties/[bountyId]/submissions/[submissionId]/label` | Yes | Owner | `submission.service.setLabel` |
| GET/PATCH | `/api/users/me` | Yes | – | `user.service.getOrUpdateMe` |
| PATCH | `/api/users/me/notification-prefs` | Yes | – | `notification.service.updatePreferences` |
| GET | `/api/skills` | No | – | `skill.service.list` |
| GET | `/api/matching` | Yes | FREELANCER/ADMIN | `matching.service.recommendBounties` |
| GET | `/api/payments` | Yes | – | `payment.service.listForCaller` |
| POST | `/api/webhooks/monime` | HMAC | – | `escrow.service.handleWebhook` |
| GET/PATCH | `/api/notifications` | Yes | – | `notification.service.listForCaller` |
| POST | `/api/push/subscribe` | Yes | – | `notification.service.savePushSubscription` |
| POST | `/api/push/unsubscribe` | Yes | – | `notification.service.deletePushSubscription` |
| POST | `/api/admin/invites` | Yes | ADMIN | `invite.service.createCompanyInvite` |
| GET | `/api/admin/invites` | Yes | ADMIN | `invite.service.listInvites` |
| PATCH | `/api/admin/settings` | Yes | ADMIN | `settings.service.update` |
| GET | `/api/admin/stats` | Yes | ADMIN | `admin.service.stats` |

---

## 12. Pages

### Public

- **Landing** (`/`): Hero, how-it-works, featured bounties, stats.
- **Browse Bounties** (`/bounties`): Grid + filters (type, skills, prize range, compensation type, deadline) + search.
- **Bounty Detail** (`/bounties/[slug]`): Full description (rendered via `RichTextView`), prize tiers, eligibility questions, skills, deadline countdown, compensation type, submit CTA.

### Auth (`(auth)` layout — centered)

- `/login`, `/register`, `/forgot-password`, `/verify-email`, `/accept-invite`.
- `/register` reads `locals.settings.COMPANY_SELF_REGISTER`. When `false`, COMPANY option is hidden.
- `/accept-invite` POSTs new password to Better Auth's reset endpoint, then to `invite.service.completeInvite()` which marks the `CompanyInvite` row ACCEPTED and ensures the `CompanyProfile` exists.

### Company dashboard

- **Overview** — KPI cards (active bounties/projects, submissions received), recent activity.
- **Create Bounty/Project** — multi-step wizard (type → info → skills → compensation & prizes → eligibility questions → timeline → review) with `useLocalDraft.ts` auto-save (debounced 800ms).
- **Fund Bounty** — prize breakdown, total charge, MoMo limit warning if applicable, "Proceed to Payment" → Monime checkout.
- **Review Submissions** — label dropdown, private notes textarea, view submission links.
- **Select Winners** — toggle winners with positions, review before announcement.
- **Announce Winners** — confirm action, triggers payouts + notifications.
- **Project Tranche Payouts** — trigger milestone payouts for project-type listings.

### Freelancer dashboard

- **Overview** — earnings, active submissions, AI recommendations preview.
- **Recommendations** — AI-matched bounties with reasons and skill gaps.
- **Submissions** — track status of all submissions.
- **Earnings** — payout history (amounts, dates, tranches for projects).

### Settings

- **Profile** (`/profile`) — name, headline, bio, skills, MoMo / WhatsApp / bank details, avatar (Cloudinary).
- **Notifications** (`/settings/notifications`) — per-event toggles for email + push.

### Admin

- **Dashboard** — platform-wide stats.
- **Settings** (`/admin/settings`) — toggle `COMPANY_SELF_REGISTER`, future flags.
- **Invites** (`/admin/invites`) — email + optional company name → POST `/api/admin/invites`. Table of pending / accepted / revoked.
- **Users / Bounties / Payments / Disputes / Skills** — table-based management with actions.

---

## 13. Rich Text (ProseKit)

Long-form fields use **ProseKit** (`@prosekit/svelte`) instead of a markdown textarea.

### Fields using rich text

- `Bounty.description`, `Bounty.requirements`, `Bounty.deliverables`
- `Submission.otherInfo`
- `Submission.feedback` (sponsor → freelancer)

### Storage

- Store as **HTML string** (`editor.getHTML()`).
- **Server-side sanitise on write** with `sanitize-html` (allowlist defined in `src/lib/server/sanitize.ts`): headings, lists, bold, italic, code, blockquote, links (`rel="noopener noreferrer"`). **No** inline styles, scripts, iframes, on-handlers, or data URIs.
- On read, render via `RichTextView.svelte` using `{@html sanitized}` — the sanitiser is the trust boundary; never trust client-submitted HTML.

### Editor component (`src/lib/components/editor/RichTextEditor.svelte`)

- Wraps ProseKit's Svelte components (`<ProseKit editor={editor}>` etc.).
- Toolbar: bold, italic, H2/H3, bullet list, ordered list, link, code, blockquote.
- Used inside bounty creation wizard and submission form.
- Auto-save integrates with `useLocalDraft.ts` (debounced 800ms, stores HTML string in localStorage).

### Why ProseKit

- First-class Svelte adapter (Tiptap's Svelte support lags).
- ProseMirror foundation gives stable serialisation and structured undo/redo.
- Tree-shakeable extensions match the "< 200KB initial JS" target — only ship extensions actually used.

---

## 14. SEO (svelte-meta-tags)

All public-facing pages render meta + OpenGraph + Twitter Card + JSON-LD via [`svelte-meta-tags`](https://oekazuma.github.io/svelte-meta-tags/). Configure once at the root, override per page.

### Setup

- Install: `npm i svelte-meta-tags`.
- Root `+layout.svelte` mounts `<MetaTags>` with site-wide defaults (title template, description, canonical, OG image, locale `en_SL`, site name `"FOW — Future of Work"`).
- Per-page `+page.ts` / `+page.server.ts` returns a `pageMetaTags` object that the page merges into the root `<MetaTags>` via SvelteKit's `$page.data`.

### Pages with custom SEO

- **Landing** (`/`) — full OG card, JSON-LD `Organization`.
- **Browse Bounties** (`/bounties`) — title reflects active filters; `noindex` when filters are applied (avoid thin / duplicate pages).
- **Bounty Detail** (`/bounties/[slug]`) — title = bounty title; description = first 160 chars of `bounty.description` stripped of HTML; OG image = company logo if set, otherwise default; JSON-LD `JobPosting` (datePosted, validThrough = `submissionDeadline`, baseSalary from `totalPrizePool`, hiringOrganization = company, employmentType = `CONTRACTOR`).
- **Auth pages** (`/login`, `/register`, etc.) — `robots: noindex, nofollow` (no value in indexing auth flows).
- **Authed/admin routes** — `noindex, nofollow` by default in the `(platform)` and `admin` layouts.

### Helper

`src/lib/server/seo.ts` exports `buildBountyJsonLd(bounty)` and `buildOrgJsonLd()` so JSON-LD construction lives outside `.svelte` files.

### Sitemap & robots

- Use [`super-sitemap`](https://github.com/jasongitmail/super-sitemap) (`npm i -D super-sitemap`). It auto-discovers static routes and lets you plug in dynamic params for parameterised routes.
- `src/routes/sitemap.xml/+server.ts`:
  ```ts
  import * as sitemap from 'super-sitemap';
  import { listActiveBountySlugs } from '$lib/server/repositories/bounty.repo';

  export const GET = async () => {
    return await sitemap.response({
      origin: process.env.PUBLIC_APP_URL!,
      excludeRoutePatterns: [
        '^/admin.*',
        '^/dashboard.*',
        '^/api.*',
        '^/(auth)/.*',
        '^/accept-invite',
        '^/verify-email',
        '^/forgot-password',
        '^/settings.*',
        '^/profile',
        '^/notifications'
      ],
      paramValues: {
        '/bounties/[slug]': await listActiveBountySlugs()
      },
      changefreq: 'daily',
      priority: 0.7
    });
  };
  ```
- `src/routes/robots.txt/+server.ts` — disallows `/admin`, `/dashboard`, `/api`, `/(auth)/*`, points crawlers at `/sitemap.xml`.

---

## 15. Security

- **Service-layer authorisation** — every service method asserts caller permissions explicitly. Never rely on the API layer alone.
- **Layering audit in CI** — grep ensures Prisma is not imported in route handlers and Monime is not fetched outside `monime/client.ts`.
- **Webhook HMAC verification** — `crypto.timingSafeEqual` on Monime webhook signatures.
- **Idempotent webhook processing** — short-circuit when `Payment.status` is already `COMPLETED` for the incoming `monimePaymentId`.
- **Amount verification** — after checkout completes, re-query escrow balance via Monime API and confirm it matches `totalPrizePool`.
- **Payout validation** — total payouts ≤ escrow balance; all winners have payout methods; bonus winners ≤ `maxBonusSpots`.
- **Input validation** — Zod on every API route (URL validation on submission `link` / `tweet`).
- **Rich-text sanitisation** — `sanitize-html` allowlist on every write of bounty description/requirements/deliverables and submission `otherInfo`/`feedback`.
- **CUID IDs** — prevent enumeration attacks.
- **Rate limiting** — `@upstash/ratelimit` (or Postgres-backed alternative if Upstash is out of scope) on auth routes (5/hr register, 10/15min login), invite endpoint (5/min), push subscribe (10/min), general API (60/min).
- **File upload** — Cloudinary for profile images/logos only; max 5MB, `image/*` MIME.
- **CSP headers** — configured via SvelteKit `csp` config + `handle` hook.
- **HTTPS only** — Vercel default.
- **Sponsor notes privacy** — `Submission.notes` and `Submission.label` are filtered out of every freelancer-facing API response. Enforce in repository read paths via dedicated `selectForFreelancer` / `selectForSponsor` shapes.
- **VAPID keys** — private key server-only; public key delivered to client via `+layout.server.ts`.
- **`Setting` reads cached**; writes invalidate the cache immediately. Writes admin-only.
- **Better Auth admin endpoints** — mounted under `/api/auth/admin/*`; protected by the admin plugin itself.

---

## 16. Environment Variables

```
DATABASE_URL=postgresql://...

# Better Auth
BETTER_AUTH_SECRET=<openssl rand -base64 32>
BETTER_AUTH_URL=https://...
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Monime
MONIME_ACCESS_TOKEN=
MONIME_SPACE_ID=spc-...
MONIME_WEBHOOK_SECRET=

# AI
OPENAI_API_KEY=
ANTHROPIC_API_KEY=                 # Optional until Phase 5 (Claude ranking)

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Email
RESEND_API_KEY=
RESEND_FROM="FOW <noreply@fow.sl>"

# Push
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT="mailto:admin@fow.sl"

# Client-exposed (note PUBLIC_ prefix per SvelteKit)
PUBLIC_APP_URL=https://fow.sl
PUBLIC_ADMIN_URL=https://admin.fow.sl   # Used by the platform shell to link ADMINs to the admin host
PUBLIC_VAPID_KEY=                       # Same value as VAPID_PUBLIC_KEY, exposed to client
```

---

## 17. Implementation Phases

Each phase has explicit deliverables. A junior engineer should be able to complete a phase, run its verification checklist, and only then move on to the next.

### Phase 1 — Foundation (Week 1–2)

- `npx sv create fow --template minimal --types ts` → SvelteKit 2 + TS.
- Install Tailwind CSS v4. Configure `@sveltejs/adapter-vercel`.
- Add `shadcn-svelte` (`npx shadcn-svelte@latest init`); add baseline components (`button`, `input`, `textarea`, `label`, `select`, `card`, `dialog`, `dropdown-menu`, `table`, `tabs`, `toast`).
- Install ProseKit (`@prosekit/core`, `@prosekit/extensions`, `@prosekit/svelte`); create `RichTextEditor.svelte` + `RichTextView.svelte` shells.
- Install `svelte-meta-tags` and `super-sitemap`; mount root `<MetaTags>` with site-wide defaults in `+layout.svelte`; add `sitemap.xml/+server.ts` (using `super-sitemap`) and `robots.txt/+server.ts`. Sitemap's `paramValues` for `/bounties/[slug]` resolves from `bounty.repo.listActiveBountySlugs()` (returns `[]` until Phase 2).
- Install Prisma. Write `schema.prisma` covering all original models + `Setting`, `CompanyInvite`, `PushSubscription`, `NotificationPreference`, revised `Notification.eventType`. Initial migration.
- Write `prisma/seed.ts`: skills taxonomy, admin user (env-supplied email), default `Setting` row with `COMPANY_SELF_REGISTER.enabled = true`.
- Install Better Auth + Prisma adapter; generate adapter tables; configure email+password, Google OAuth, email verification, password reset, admin plugin, `additionalFields`. Configure `trustedOrigins` with both production and dev hosts (`fow.sl`, `admin.fow.sl`, `localhost:5173`, `admin.localhost:5173`) and host-only cookie attributes (omit `domain`). Wire `auth.ts` + `auth-cli.ts` + `hooks.server.ts`.
- Add `src/lib/server/host.ts` with `isAdminHost` / `mainHostFor` helpers and host-based routing in `hooks.server.ts` (hard split + redirects + admin auth-page allowlist).
- Update `robots.txt/+server.ts` to serve `Disallow: /` when `isAdminHost(url)`.
- README: document the dev URLs (`http://localhost:5173`, `http://admin.localhost:5173`) and the Firefox `/etc/hosts` entry (`127.0.0.1 admin.localhost`). Add `PUBLIC_ADMIN_URL` to `.env.example`.
- Build repository layer (one `*.repo.ts` per model) — pure Prisma functions.
- Build Phase-1 services: `auth.service`, `settings.service`, `invite.service`. Build helpers: `auth-helpers.ts` (`requireAuth` / `requireRole` / `assertOwner`), `http.ts` (`AppError` / `respondError`), `sanitize.ts`.
- Port `scripts/seed-invite.ts` onto `invite.service`.
- Auth pages: `login`, `register` (conditionally hiding COMPANY), `forgot-password`, `verify-email`, `accept-invite`.
- Admin pages: `/admin/settings` (toggle), `/admin/invites` (UI + table).
- Root layout: header + mobile bottom nav + desktop sidebar.
- Landing page.

**Verify**:
1. Self-register a FREELANCER; verify email; log in; log out.
2. Toggle `COMPANY_SELF_REGISTER` OFF; reload `/register`; confirm COMPANY hidden. Toggle ON; confirm visible.
3. Invite a company via `/admin/invites`; copy the dev email link; complete `/accept-invite`; confirm `CompanyProfile` exists and `CompanyInvite.status = ACCEPTED`.
4. Run `npx tsx scripts/seed-invite.ts foo@example.com COMPANY "Foo Co"`; confirm identical outcome.
5. **Subdomain hard split (main host)**: visit `http://localhost:5173/admin/users` → 302 to `http://admin.localhost:5173/admin/users`. Visit `http://localhost:5173/api/admin/stats` → 302 to `http://admin.localhost:5173/api/admin/stats`.
6. **Subdomain hard split (admin host)**: visit `http://admin.localhost:5173/bounties` → 404. Visit `http://admin.localhost:5173/` → 302 to `/admin`. Visit `http://admin.localhost:5173/login` → renders login (allowlisted).
7. **Independent sessions**: log in as ADMIN on `admin.localhost:5173`; open `localhost:5173` in the same browser → no session. Log in as FREELANCER on `localhost:5173` → still unauthenticated on `admin.localhost:5173`.
8. **Robots**: `curl http://admin.localhost:5173/robots.txt` returns `User-agent: *\nDisallow: /`.
9. Layering audit: `grep -r "prisma\." src/routes` returns nothing.

### Phase 2 — Bounty CRUD (Week 2–3)

- `bounty.repo.ts`, `bounty.service.ts`, `prizeTier.repo.ts`, `skill.repo.ts`.
- Create-bounty wizard: type → info → skills → compensation → prizes → eligibility questions → timeline → review. `RichTextEditor` for description / requirements / deliverables. `useLocalDraft.ts` auto-save.
- API routes: `POST/GET /api/bounties`, `GET/PATCH/DELETE /api/bounties/[bountyId]`.
- Browse page with filters (type, compensation type, skills, prize range, deadline) + search.
- Bounty detail page (eligibility questions, compensation display, deadline countdown, `RichTextView`).
- Per-page SEO: detail page emits `JobPosting` JSON-LD via `buildBountyJsonLd`; browse page sets `noindex` when filters are applied; update sitemap to include ACTIVE bounties.
- Company dashboard listing.

**Verify**:
1. Create a BOUNTY and a PROJECT in DRAFT.
2. Browse page filters by type/skills/prize range.
3. Detail page renders all eligibility questions and prize tiers; rich-text fields render sanitised HTML.

### Phase 3 — Escrow & Payments (Week 3–4)

- `monime/client.ts`, `monime/webhook.ts`, `payment.repo.ts`.
- `escrow.service.ts` with full state machine.
- `POST /api/bounties/[bountyId]/fund` → Monime checkout redirect.
- `POST /api/webhooks/monime` (HMAC verified) → `escrow.service.handleWebhook`.
- `POST /api/bounties/[bountyId]/publish` (FUNDED → ACTIVE; triggers embedding generation in Phase 5, no-op for now).
- `POST /api/bounties/[bountyId]/cancel` with refund.

**Verify** (Monime test mode):
1. Create draft → fund → simulate `checkout_session.completed` → confirm status FUNDED, Payment row COMPLETED.
2. Cancel an ACTIVE bounty → confirm refund payout initiated.
3. Replay `checkout_session.completed` → confirm idempotency (no duplicate Payment).

### Phase 4 — Submissions, Judging, Winners, Emails (Week 4–5)

- `submission.repo.ts`, `submission.service.ts`, `winner.service.ts`.
- Resend client + all submission/bounty/auth email templates from §7.
- `notification.service.ts` orchestrating in-app + email (push wired in Phase 6).
- Submission form: `link` + `tweet` + `otherInfo` (ProseKit) + eligibility answers + `ask`.
- Triage UI (label dropdown, private notes textarea).
- Toggle-winner UI per submission.
- Announce-winners action → `winner.service.announceWinners` → Monime payouts (single for BOUNTY, first tranche for PROJECT) → emails to sponsor + all submitters.
- Project tranche payout flow.
- Payout webhook handling.
- Freelancer dashboard (submissions list, earnings with tranche detail).

**Verify**:
1. Submit on a bounty; sponsor labels submissions + adds notes (confirm notes never appear in freelancer-facing responses).
2. Toggle two winners (positions 1, 2); announce; confirm Monime payouts initiated, winners + non-winners receive emails, Notification rows created.
3. Repeat for a PROJECT with two tranches; confirm `Submission.paymentDetails` has both entries.
4. RANGE bounty: freelancer ask within `[min, max]`. VARIABLE bounty: freelancer proposes ask.
5. Eligibility: define 2 required + 1 optional question; submit; confirm validation rejects missing required answers.

### Phase 5 — AI Matching (Week 5–6)

- OpenAI client; `embeddings.ts` + `matching.service.ts`.
- Embedding triggers in `freelancer.service.updateProfile` and `bounty.service.publish`.
- `GET /api/matching` returns top 50.
- Recommendations page in freelancer dashboard.
- (Claude ranking optional, feature-flag-gated.)

**Verify**: Create a freelancer with `["Mobile Money Integration", "USSD Development"]`; publish a matching bounty + 5 unrelated; recommendations ranks the matching one first.

### Phase 6 — PWA & Push (Week 6)

- Install `@vite-pwa/sveltekit`, write `manifest.webmanifest`, generate icons.
- Service worker with `push` + `notificationclick` handlers + Workbox cache rules.
- Generate VAPID keys (`web-push generate-vapid-keys`), set env.
- `src/lib/client/push.ts`, `PushPrompt.svelte`.
- `web-push` server lib + `push/send.ts`.
- Wire `notification.service.dispatch` to fan out to push for the urgent event set.
- `/api/push/subscribe` + `/api/push/unsubscribe`.
- `/api/users/me/notification-prefs` + `/settings/notifications` page.

**Verify**:
1. Install PWA on Android Chrome and iOS Safari (16.4+); confirm icon, splash, standalone display, offline app-shell load.
2. Enable push; trigger a winner announcement; confirm system notification appears even when tab is backgrounded.
3. Revoke permission; confirm subscription cleaned up on next 410.

### Phase 7 — Admin, Polish, Security (Week 7)

- Admin pages: users, bounties, payments, disputes, skills (CRUD), settings, invites.
- Notification feed page, profile/settings.
- Cancellation/refund flow polish.
- Error boundaries, loading skeletons, empty states.
- Rate limiting on auth + invite + push + general API endpoints.
- CSP / security headers via SvelteKit `csp` config + `handle` hook.
- `sanitize-html` running on all rich-text writes.

**Verify**:
1. Hit `/admin/*` as FREELANCER → expect 403.
2. Replay Monime webhook with bad HMAC → expect 401.
3. Attempt to read sponsor `notes` from freelancer-facing API → expect field absent.
4. Hit `/api/admin/invites` 6 times in a minute → expect 429 on the 6th.
5. Submit malformed inputs → expect Zod 400.

### Phase 8 — Launch (Week 8)

- Final E2E tests (Playwright) on the escrow flow.
- Production Monime webhook configured.
- Switch to live Monime tokens.
- Vercel custom domain + SSL.
- Resend sending domain verified + DKIM/SPF.

**Verify**: Smoke test with a real (low-value) bounty end-to-end.

### Phase 9+ — Deferred (Backlog)

- Vercel Cron + weekly digest email.
- Bounty deadline reminder (24h before).
- Payout-failure retry as scheduled job (currently inline w/ 3 attempts).
- Claude ranking on top of embeddings.
- pgvector migration past ~10k users.
- Offline-first PWA (submission drafting offline, sync on reconnect).
- True Declarative Web Push (drop JS handler) once browser support is broad.

---

## 18. Verification Plan (Cumulative)

Run these in order; each must pass before moving on.

1. **Repo/Service layering audit** — `grep -r "prisma\." src/routes` returns nothing; only repositories touch Prisma. `grep -r "fetch.*monime" src/routes` returns nothing.
2. **Auth flow** — Register FREELANCER; verify email; log in; log out.
3. **Self-register toggle** — As ADMIN, flip `COMPANY_SELF_REGISTER` off; `/register` hides COMPANY; flip on; reappears.
4. **Company invite (UI)** — Invite `acme@example.com`; confirm Resend log shows email; open link; set password; land on `/accept-invite`; confirm `CompanyProfile` exists and `CompanyInvite.status = ACCEPTED`.
5. **Company invite (CLI)** — Run `npx tsx scripts/seed-invite.ts foo@example.com COMPANY "Foo Co"`; identical outcome.
6. **Bounty lifecycle** — Create BOUNTY + PROJECT; fund via Monime test; publish; submit; triage with labels + notes; toggle winners; announce; verify payouts initiated, emails sent, Notification rows created, push delivered for `WINNERS_ANNOUNCED` (Phase 6+).
7. **Compensation modes** — FIXED, RANGE (ask within bounds), VARIABLE (freelancer-proposed).
8. **Eligibility questions** — 2 required + 1 optional; validation rejects missing required.
9. **Bonus winners** — `maxBonusSpots = 3`; assign position 99 to 3 submissions; announce; confirm 3 bonus payouts.
10. **Project tranches** — PROJECT, single winner; tranche 1 on announce; trigger tranche 2; confirm `Submission.paymentDetails` has both.
11. **Escrow integrity** — Query Monime financial account balance at each step; matches expected (totalPrizePool after funding; 0 after all payouts settle).
12. **Webhook reliability** — Replay `checkout_session.completed`; confirm idempotency.
13. **AI matching** — Targeted skills produce a matching bounty ranked first.
14. **Cancellation** — Fund a bounty; cancel; confirm refund payout + emails to sponsor + all submitters.
15. **PWA** — Install on Android Chrome. Confirm icon, splash, standalone, offline app-shell load. Enable push. Trigger an urgent event. Confirm OS-level notification.
16. **Security** — `/admin/*` as FREELANCER → 403; bad-HMAC webhook → 401; sponsor `notes` absent in freelancer-facing API; `/api/admin/invites` 6× in 60s → 429.
17. **Admin subdomain split** — main host `/admin/**` → 302 to `admin.<host>`; admin host non-allowlisted paths → 404; admin host root → 302 to `/admin`. Sessions on `admin.<host>` and main host are independent (login on one ⇒ no session on the other). `admin.<host>/robots.txt` returns `Disallow: /`.

---

## 19. Reference Files

- `seed-invite.ts` (supplied) — canonical pattern for the invite flow: `auth.api.signUpEmail` + `requestPasswordReset` with `redirectTo: '/accept-invite'`. The new `invite.service.ts` and `scripts/seed-invite.ts` must both follow this pattern verbatim.
- Better Auth docs — https://better-auth.com/docs/installation (especially Prisma adapter, admin plugin, email verification, password reset, `additionalFields` with `input: false`).
- shadcn-svelte — https://github.com/huntabyte/shadcn-svelte
- ProseKit — https://github.com/prosekit/prosekit
- `@vite-pwa/sveltekit` — service-worker registration + manifest generation.
- `web-push` — `webpush.sendNotification`, VAPID key generation (`web-push generate-vapid-keys`).
- svelte-meta-tags — https://oekazuma.github.io/svelte-meta-tags/
- super-sitemap — https://github.com/jasongitmail/super-sitemap
- Better Auth advanced cookies — https://better-auth.com/docs/concepts/cookies (host-only scoping by omitting `domain`).
- SvelteKit hooks — https://kit.svelte.dev/docs/hooks (host-based routing in `handle`).
