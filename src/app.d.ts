// See https://svelte.dev/docs/kit/types#app.d.ts for what these interfaces do.

import type { AuthedUser } from '$lib/server/auth-helpers';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: AuthedUser | null;
			session: { id: string; expiresAt: Date } | null;
			isAdminHost: boolean;
			settings: Record<string, unknown>;
		}
		interface PageData {
			user: AuthedUser | null;
			settings: Record<string, unknown>;
			isAdminHost: boolean;
		}
		// interface PageState {}
		interface Platform {
			context?: { waitUntil?: (p: Promise<unknown>) => void };
		}
	}
}

export {};
