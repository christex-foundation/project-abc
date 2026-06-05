# FOW Redesign — Implementation Guide

A phased plan to bring the whole public + platform site (not admin) onto one design
system: the **current FOW colors**, the **fonts and motion** from `design-guide/hero.md`
and `design-guide/DESIGN.md`, and a consistent rounded soft-shadow surface language.

> **Scope:** everything under `src/routes/` except `src/routes/admin/**`. Admin keeps its
> own chrome. This is a presentation pass — markup, classes, tokens, and copy only. No
> changes to data models, services, APIs, or auth logic.

---

## 1. Design language

We merge two references and keep our palette:

- **Hero / section headlines** follow `hero.md` (Dayos): a massive **condensed** display
  face set tight (line-height ~0.9, heavy negative tracking), one typographic statement per
  section, an accent emphasis word inside the headline.
- **Everything else** follows `DESIGN.md` (cord.com): a single calm body family, rounded
  cards floating on soft warm shadows, generous whitespace, centered rhythm, one dark CTA
  moment near the page foot.
- **Colors stay FOW's** "Bold African Editorial" palette. We translate the references'
  accents to ours.

### Reference → FOW mapping

| Reference concept                     | Their value           | FOW equivalent                    |
| ------------------------------------- | --------------------- | --------------------------------- |
| Page canvas (Dayos gray / cord white) | `#e5e7eb` / `#ffffff` | `cream #faf7f2`                   |
| Card surface                          | `#ffffff`             | `paper #f2ede3` / white on cream  |
| Border / hairline                     | `#e5e7eb` / `#dde7ee` | `bone #e8e0d0`                    |
| Primary text                          | `#000000` / `#0b3658` | `ink #1a1a1a`                     |
| Secondary text                        | `#979797` / `#486984` | `ink-soft #3f3f46`                |
| Primary accent / CTA (signal-blue)    | `#4e9ad9`             | `terracotta #c2410c`              |
| Emphasis wash (mint)                  | `#d1ffca`             | `terracotta-soft` / `forest-soft` |
| Loud emphasis (yellow)                | `#fff100`             | `ochre #d97706`                   |
| Success / status                      | teal `#42b3b1`        | `forest #14532d`                  |
| Dark CTA banner ground                | `#0b3658`             | `ink #1a1a1a`                     |

### Type system

| Role                             | Font                     | Notes                                                  |
| -------------------------------- | ------------------------ | ------------------------------------------------------ |
| Display / hero / section openers | **Barlow Condensed 700** | line-height ~0.9, tracking ~-0.03em, never below ~40px |
| Body / UI / buttons / forms      | **Figtree 400–800**      | 800 for stamped sub-headings, 400 body, 600 emphasis   |
| Tags / currency / IDs / kickers  | **Geist Mono** (kept)    | 12px micro-voice, tabular-nums for money               |

Fraunces and Geist Sans are retired from new work and removed once migration is complete.

### Surfaces & motion

- **Radii:** cards 20px, feature cards 32px, pills/buttons full-round, inputs 12–16px.
- **Shadow:** soft, warm, ink-tinted (not gray, not navy). Separation = white/paper on
  cream + soft shadow.
- **Motion:** existing `fow-reveal` (staggered entrance), `fow-marquee` (ticker),
  `fow-pulse` (live dot), `fow-card` (hover lift). All gated behind
  `prefers-reduced-motion: reduce`. We extend `fow-card` to the new shadow and add a
  generic `fow-lift` hover.

---

## 2. Token reference (`src/app.css` `@theme`)

Additions/changes (colors unchanged):

```css
/* Fonts */
--font-sans:
	'Figtree Variable', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
--font-display: 'Barlow Condensed', 'Figtree Variable', ui-sans-serif, system-ui, sans-serif;
--font-mono:
	'Geist Mono Variable', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;

/* Surfaces */
--radius-card: 20px;
--radius-card-lg: 32px;
--shadow-card: 0 12px 48px -24px rgba(26, 26, 26, 0.18);
--shadow-card-lift: 0 18px 56px -22px rgba(26, 26, 26, 0.28);
```

Display headline utility (applied via a helper class so we stop repeating inline
`font-variation-settings`):

```css
.fow-display {
	font-family: var(--font-display);
	font-weight: 700;
	line-height: 0.9;
	letter-spacing: -0.03em;
	text-transform: none;
}
```

Condensed display sizes use Tailwind text utilities; target steps ≈ 40 / 48 / 64 / 80 / 112px
(hero) responsively.

---

## 3. Component inventory

Legacy primitives still on zinc/sky/emerald/indigo — migrate to the warm system in Phase 0.

| Component                                                                                              | Current                                      | Target                                                             |
| ------------------------------------------------------------------------------------------------------ | -------------------------------------------- | ------------------------------------------------------------------ |
| `ui/Button.svelte`                                                                                     | `bg-zinc-900`, `rounded-md`, zinc focus ring | terracotta/ink/forest variants, pill radius, terracotta focus ring |
| `ui/Card.svelte`                                                                                       | `border-zinc-200 bg-white shadow-sm`         | `border-bone`, paper/white, `--radius-card`, `--shadow-card`       |
| `ui/Input.svelte` / `Textarea` / `Select`                                                              | zinc border, zinc ring                       | bone border, cream fill, terracotta ring, `rounded-xl`             |
| `ui/Badge.svelte`                                                                                      | zinc/red/emerald                             | warm tones (terracotta/forest/ochre soft)                          |
| `ui/Checkbox.svelte`                                                                                   | zinc                                         | terracotta checked state                                           |
| `ui/status-tone.ts` `TONE_CLASSES`                                                                     | zinc/sky/emerald/amber/red/indigo            | bone/forest/ochre/terracotta warm tones (keep tone names)          |
| `ui/StatCard`, `StatusBadge`, `Table*`, `Modal`, `Drawer`, `PageHeader`, `Separator`, `dropdown-menu/` | mixed zinc                                   | warm system + rounded soft-shadow                                  |

Feature components already warm (refine only): `layout/TopNav`, `Header`, `BottomNav`,
`marketing/*`, `feed/BountyCard`.

---

## 4. Phases

### P0 — Foundation

Fonts, `@theme` tokens, motion, and all `ui/` primitives + `status-tone.ts`.
**Done when:** every primitive renders in the warm system with new fonts, no zinc visible;
`npm run check` + `npm run lint` clean.

### P1 — Landing + hero (`src/routes/+page.svelte`)

Asymmetric hero: condensed headline with an accent emphasis word + mono kicker + Figtree
body + two CTAs on the left; **live product visual** (real `StatPanel` + floating
`BountyCard`) on the right, stacking on mobile. Restyle `KenteRule`, `EarnersTicker`,
`CategoryChips`, `FeedSwitch`, feed grid, and the logged-out feature trio. Keep `fow-reveal`
ordering.
**Done when:** matches the `hero.md` composition in FOW colors; legible + CTA-clear at 360px;
reduced-motion safe.

### P2 — Auth (`src/routes/(auth)/**`)

login, register, forgot/reset password, verify-email, accept-invite + `(auth)/+layout.svelte`.
Centered rounded soft-shadow card on cream, condensed title, Figtree fields. Forms: inline
validation on blur, error beside field, required `*`, 44px+ targets, logical order.

### P3 — Public browse + detail + submit/apply

`bounties/`, `bounties/[slug]/`, `bounties/[slug]/submit/`, `projects/`, `projects/[slug]/`,
`projects/[slug]/apply/`, `projects/[slug]/workspace/`. Restyle cards, filter sidebars,
detail headers, prize tiers, `CoachPanel`, rich-text views, multi-step forms. Keep
localStorage draft auto-save.

### P4 — Dashboards (`src/routes/(platform)/dashboard/**`)

Company + freelancer dashboards, profiles, earnings, submissions, proposals,
recommendations, and per-bounty/project management pages. Mostly class swaps onto P0
primitives; apply data-table UX guidance.

### P5 — Creation flows

`create/` (AI assistant), `bounties/create/` (7-step wizard), `projects/create/` +
`ProjectForm`. Restyle steppers with clear progress; keep draft auto-save. AI surfaces:
label AI output, stop control, human override, undo.

### P6 — Settings, notifications, utility + final pass

`settings/account/`, `settings/notifications/`, `notifications/`, `legal/referrals/`,
`goodbye/`, `offline/`, `+error.svelte`. Push-permission requested in context, per-channel
control. Final polish: empty states, loading/skeleton states, focus rings, contrast.

---

## 5. Content / voice pass (humanizer)

After each phase's markup settles, run visible copy (headlines, subheads, button labels,
empty states, error/microcopy) through the `humanizer` skill: cut rule-of-three, em-dash
overuse, inflated/promotional phrasing, vague attributions. Keep a plain, direct,
Salone-grounded voice. Edit in place. Do not alter sanitized rich-text stored content or the
meaning of legal copy — voice only.

---

## 6. Verification

Run after every phase:

- `npm run check` and `npm run lint` clean.
- `npm run dev`; walk redesigned routes at **360px** and desktop. Confirm: Barlow Condensed
  headlines + Figtree body load; warm palette only (no zinc); rounded soft-shadow cards;
  hero live visual renders from real data; CTAs in the thumb zone; reduced-motion disables
  decorative animation (toggle OS setting).
- A11y spot-check: keyboard nav, visible focus, 44px+ targets, 4.5:1 text contrast, color not
  the sole signal.
- `src/routes/admin/**` visually unchanged.
- Mobile JS budget (< 200KB initial): load only needed font weights; remove Fraunces + Geist
  Sans imports once migration completes.
