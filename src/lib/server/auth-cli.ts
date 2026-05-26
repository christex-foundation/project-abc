/**
 * Node-only Better Auth instance used by scripts (`prisma/seed.ts`,
 * `scripts/seed-invite.ts`). Mirrors `auth.ts` but never imports `$app/*`
 * so it remains executable outside Vite/SvelteKit.
 *
 * Re-exports the same instance as `auth.ts` — they share the Prisma adapter
 * and the same env-driven config, so any sign-up/reset done from the CLI is
 * indistinguishable from one performed via the runtime.
 */

import { auth } from './auth';

export const authCli = auth;
