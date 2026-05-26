# Future of Work (FOW)

Bounty platform for Sierra Leone / West Africa. SvelteKit 2 + Svelte 5 (runes), Prisma + Postgres, Better Auth, deployed on Vercel. See `Future of Work (FOW) - Technical Implementation Plan.md` for the full design.

## First run

1. Install deps:
   ```sh
   npm install
   ```
2. Configure env. Copy `.env.example` to `.env` and fill in at minimum:
   - `DATABASE_URL` (and `DATABASE_URL_DIRECT` for migrations) — Neon, Supabase, local Postgres, etc.
   - `BETTER_AUTH_SECRET` — generate with `openssl rand -base64 32`.
   - `BETTER_AUTH_URL` — `http://localhost:5173` in dev.
   - `ADMIN_EMAIL` — the email of the first admin user the seed will create.

   Other Resend / Monime / Google / Cloudinary keys are optional until the phase that uses them.

3. Create the schema and seed:
   ```sh
   npm run db:migrate     # applies prisma/migrations
   npm run db:seed        # skills taxonomy, default Setting row, admin user
   ```
   The admin user's throwaway password is printed to stdout. Sign in once at `/login` and immediately rotate via `/forgot-password`.
4. Run the dev server:
   ```sh
   npm run dev
   ```
5. Open both hosts:
   - http://localhost:5173 — public + freelancer + company platform.
   - http://admin.localhost:5173 — admin panel.

## Dev hosts (Firefox note)

Chromium and Safari resolve any `*.localhost` to `127.0.0.1` natively. **Firefox does not.** If you use Firefox, add this line to `/etc/hosts`:

```
127.0.0.1 admin.localhost
```

## Commands

```sh
npm run dev              # vite dev server
npm run build            # production build (adapter-vercel)
npm run preview          # preview built output
npm run check            # svelte-kit sync + svelte-check
npm run check:watch      # typecheck in watch mode
npm run lint             # prettier --check .
npm run format           # prettier --write .

npm run db:generate      # prisma generate
npm run db:migrate       # prisma migrate dev
npm run db:seed          # seed skills + admin + Setting
npm run db:studio        # prisma studio
npm run seed:invite      # CLI fallback for company invites:
                         #   npm run seed:invite -- founder@example.com "Acme Co"
```

## Email in development

`RESEND_API_KEY` is optional. When unset, `src/lib/server/email/send.ts` prints rendered emails to the dev-server console — including the verification and password-reset links you need to test the auth flows. Watch the terminal running `npm run dev` after `/register` and `/admin/invites`.

## Project layout

See §1 of the Implementation Plan. The server-side code follows a strict **Repository → Service → API** layering (plan §2):

- `src/lib/server/repositories/*.repo.ts` — pure Prisma I/O.
- `src/lib/server/services/*.service.ts` — business rules, authorisation, external API calls.
- `src/routes/api/**/+server.ts` — thin HTTP adapters that parse Zod input, call a service, map errors via `respondError`.

CI greps for `prisma\.` and `fetch.*monime` in `src/routes/` to enforce the layering.
