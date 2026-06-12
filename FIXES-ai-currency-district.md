# Fix Spec — AI bounty prefill, Leone redenomination, district targeting

Status: **proposed** · Branch: `task/provincial-lock` · Date: 2026-06-12

Three issues to address. Each section below states the symptom, the root cause
(with file:line evidence), the fix, and the acceptance check. Order them
1 → 2 → 3; they are independent and can land as separate commits.

---

## 1. AI-generated bounty does not prefill the create form

### Symptom
When a company uses the AI scoper and picks "Use this draft" for a **project**,
the project create form opens pre-filled. For a **bounty** the form opens blank.

### Root cause — localStorage key version mismatch
Both flows are identical: the decider writes a form-shaped draft to localStorage,
navigates to the create page with `?ai=1`, and the form reads the draft on mount.
The bounty side reads a **different key** than the decider wrote.

- Decider writes the bounty draft to `fow:draft:bounty-create-wizard-v2`
  — `src/routes/(platform)/create/+page.svelte:19-22`
  ```ts
  const STORAGE = {
      bounty: 'fow:draft:bounty-create-wizard-v2',
      project: 'fow:draft:project-create-form'
  } as const;
  ```
- The bounty create page mounts `BountyForm` with `draftKey="bounty-create-wizard-v3"`
  — `src/routes/(platform)/bounties/create/+page.svelte:19` → form reads
  `fow:draft:bounty-create-wizard-**v3**`.
- `useLocalDraft` prefixes every key with `fow:draft:`
  — `src/lib/hooks/useLocalDraft.ts:24`.

On mount, `BountyForm.onMount` calls `draftStore?.load()`, finds nothing under
`...-v3`, returns early (`if (!saved) return;`), so the `?ai=1` prefill branch is
never reached (`BountyForm.svelte:119-133`). Project works because its decider key
(`project-create-form`) matches the project create page's `draftKey`
(`src/routes/(platform)/projects/create/+page.svelte:23`).

### Fix
Primary: change the decider's bounty key to match the form —
`v2` → `v3` at `src/routes/(platform)/create/+page.svelte:20`.

Robustness (recommended, prevents future drift): export the draft-key constants
from a single module (e.g. `src/lib/constants/draft-keys.ts`) and import them in
both the decider and the two create pages, so the key can't silently diverge again.

Secondary (align while here): `buildBountyDraft`
(`src/routes/(platform)/create/+page.svelte:125-150`) omits the newer
`targetProvinces` and `accessPin` fields that `BountyForm`'s `Draft` type now
declares (`BountyForm.svelte:45,47`). Not the cause of the blank form, but once the
key is fixed those keys arrive as `undefined` instead of the `[]`/`''` blanks. Add
them to `buildBountyDraft` for a clean seeded draft.

### Acceptance
AI-scope a bounty → "Use this draft" → bounty create form opens with title,
description, requirements, deliverables, prize tiers, and skills pre-filled.

---

## 2. AI does not know about the Sierra Leone Leone redenomination

### Background
Sierra Leone redenominated on **1 July 2022**: **1,000 old Leones (SLL) = 1 new
Leone (SLE / NLe)**. So Le1,000 old = Le1 new, and Le1,000,000 old = Le1,000 new.
The platform's stored currency is the **new** Leone (`SLE`).

### Symptom
The LLM's training data is dominated by **old-Leone** figures (where everyday
prices run into the hundreds of thousands / millions). When the AI scoper suggests
bounty prizes or project budgets it can emit old-Leone-scale numbers, producing
amounts ~1000× too large for the new Leone.

> Important: this is **separate** from the minor-units (cents) convention. Money is
> stored as `Int` in minor units (×100). The redenomination is about which Leone
> the *major* figure is denominated in. Both must be respected at once: a Le500 new
> Leone prize is stored as `50000` minor units.

### Root cause — no prompt anywhere mentions the redenomination
Repo-wide search for `redenomination`, `old leone`, `SLL`, `new leone` → **zero
matches**. The AI is told only "currency defaults to SLE" and "amounts are minor
units (×100)":
- Shared system preamble (prepended to **every** AI call) —
  `src/lib/server/ai/claude.ts:31-41`.
- Scoper (bounty/project generator) system + user prompt —
  `src/lib/server/ai/scope.prompt.ts:9-28` (e.g. line 15 "All amounts are minor
  units (SLE × 100)", line 24 echoes `budgetMinor`).

Display utils already assume new-Leone + cents and divide by 100
(`src/lib/utils.ts:24-31` `formatMoney`, `:39-51` `formatMooneyCompact`) — they are
correct and need no change.

### Fix
Add an explicit redenomination + realistic-range note to the **shared preamble**
(`claude.ts:31-41`) so it covers all four flows, with reinforcement in the scoper
prompt (`scope.prompt.ts`). Suggested wording (tune the example ranges with the
team — these are placeholders, confirm before shipping):

```
Currency is the NEW Sierra Leonean Leone (SLE / NLe), after the 2022
redenomination where 1,000 old Leones = 1 new Leone. Do NOT use old-Leone
figures (hundreds of thousands or millions for everyday work) — those are ~1000x
too large. Realistic new-Leone amounts for online work are roughly:
  - small task / bounty prize: Le 200 – Le 2,000  (20,000 – 200,000 minor)
  - substantial bounty or project milestone: Le 2,000 – Le 30,000
Always emit money as integer MINOR units (new-Leone major × 100).
```

> ⚠️ The amount ranges above are illustrative and must be reviewed against real
> platform data before merge — do not ship guessed numbers as authoritative.

### Acceptance
AI-scope a typical task → suggested prizes/budget are in the new-Leone range
(hundreds–tens-of-thousands of Leones), stored correctly as minor units. Spot-check
a few briefs; none should propose six/seven-figure new-Leone amounts.

---

## 3. Region targeting should also allow specifying a District

### Goal
Today the region lock targets **provinces** only. Companies should also be able to
narrow a bounty/project to specific **districts** within the targeted provinces.

### Current state (good news — District is already modeled)
- `Province` enum (`prisma/schema.prisma:43-49`) and `District` enum (`:51-73`,
  16 districts grouped by province) both exist.
- `FreelancerProfile` already carries `province` and `district`
  (`schema.prisma:306-307`); the freelancer profile page already has a working
  cascading province→district selector to copy
  (`src/routes/(platform)/dashboard/freelancer/profile/+page.svelte:48-53, 275-280`).
- `Bounty` (`schema.prisma:457-463`) and `Project` (`:610-616`) have
  `targetProvinces Province[]` + `accessPinHash` but **no district field**.
- Client-safe geo helpers already exist in `src/lib/constants/geo.ts`:
  `DISTRICT_VALUES`, `DISTRICT_LABEL`, `DISTRICT_PROVINCE`, `districtsForProvince()`,
  `districtBelongsToProvince()`, `provincesLabel()`.

The work is **purely additive** — mirror `targetProvinces` with `targetDistricts`.

### Design decision to confirm before building
Semantics of district + province together. Recommended rule:
**districts refine provinces.** If `targetDistricts` is non-empty, a freelancer
must be in one of those districts (province check becomes implied). If only
`targetProvinces` is set, behave as today. Every targeted district must belong to a
targeted province (enforced by validator). Confirm this with the team.

### Fix — where each change lands
1. **Schema** — add `targetDistricts District[] @default([])` to `Bounty` (after
   `schema.prisma:463`) and `Project` (after `:616`); new migration
   `ADD COLUMN "targetDistricts" "District"[] DEFAULT ARRAY[]::"District"[]` on both.
2. **geo.ts** — add a `districtsLabel()` helper (analogue of `provincesLabel`) for
   gate error messages.
3. **Validators** — `src/lib/validators/bounty.ts` and `project.ts`: add
   `targetDistricts: z.array(z.enum(DISTRICT_VALUES)).default([])` and a
   `superRefine` asserting each chosen district belongs to a chosen province
   (copy the pattern in `src/lib/validators/freelancer.ts:51-69`). `bounty.ts`
   already has `refineBounty` (`:72-176`); `project.ts` needs a refine added.
4. **Repos** — add `targetDistricts: true` to selects (e.g. next to
   `targetProvinces` at `project.repo.ts:21` and the bounty repo). Freelancer repo
   already selects `district` (`freelancer.repo.ts:19-20`).
5. **Services** — extend both `enforceAccessGates` with a `targetDistricts` block
   comparing `freelancer.district`, and widen the `Pick<FreelancerProfile, ...>` to
   include `'district'`:
   - `src/lib/server/services/submission.service.ts:107-129` (bounty)
   - `src/lib/server/services/project.service.ts:307-329` (project, exported; also
     used by `proposal.service.ts`)
   Write `targetDistricts` in create/update paths (`bounty.service.ts:126`,
   `project.service.ts:120, 211`).
6. **UI** — add a cascading **district multi-select** to the "Region & access" card,
   driven by the union of `districtsForProvince(p)` over the checked provinces, with
   a `toggleDistrict()` and a `$effect` that prunes districts when their province is
   unchecked:
   - `src/lib/components/projects/ProjectForm.svelte:347-395`
   - `src/lib/components/bounties/BountyForm.svelte` (~`:624-667`, Region step)
   Reference cascade: freelancer profile page (`:48-53, 275-280`).

### Acceptance
- Create/edit a bounty and a project: select provinces, then districts within them;
  districts outside selected provinces can't be chosen (validator rejects).
- A freelancer whose district is not in `targetDistricts` is blocked at
  submit/apply with a clear message; one inside is allowed.
- Empty `targetDistricts` preserves today's province-only behavior.

---

## Suggested sequencing
1. **Issue 1** — one/two-line key fix, ship first (unblocks AI bounty UX).
2. **Issue 2** — prompt copy, after confirming the example Leone ranges with the team.
3. **Issue 3** — schema + migration + validators + services + UI; largest change,
   confirm the province↔district semantics first.
