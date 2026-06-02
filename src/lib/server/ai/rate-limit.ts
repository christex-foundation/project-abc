// Lightweight rate limiter for user-initiated AI calls (drafting is synchronous
// and costs money/latency, so callers must guard each entry point).
//
// LIMITATION: this is an in-memory, per-instance fixed-window counter. On a
// serverless/multi-instance deploy (Vercel) each cold instance keeps its own
// window, so the effective limit is per-instance, not global. That's acceptable
// at MVP — a durable (Redis/DB) limiter is deferred, consistent with the
// Phase 7 push-subscribe rate-limit TODOs.

import { AppError } from '../http';

const DEFAULT_LIMIT = 10;
const DEFAULT_WINDOW_MS = 60_000;

type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();

export type RateLimitOptions = {
	/** Distinguishes counters per flow (e.g. 'scope', 'coach'). */
	flow?: string;
	/** Max calls allowed per window. Defaults to 10. */
	limit?: number;
	/** Window length in ms. Defaults to 60_000 (1 minute). */
	windowMs?: number;
};

/**
 * Increment the caller's counter and throw `AppError('RATE_LIMITED')` if they
 * exceed `limit` calls within `windowMs`. Call once per user-initiated AI request.
 */
export function checkRateLimit(userId: string, opts: RateLimitOptions = {}): void {
	const { flow = 'ai', limit = DEFAULT_LIMIT, windowMs = DEFAULT_WINDOW_MS } = opts;
	const key = `${flow}:${userId}`;
	const now = Date.now();
	const existing = windows.get(key);

	if (!existing || existing.resetAt <= now) {
		windows.set(key, { count: 1, resetAt: now + windowMs });
		return;
	}

	if (existing.count >= limit) {
		throw new AppError('RATE_LIMITED', 'Too many AI requests. Please try again shortly.');
	}
	existing.count += 1;
}
