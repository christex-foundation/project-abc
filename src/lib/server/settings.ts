import { findByKey, listAll } from './repositories/settings.repo';

/**
 * In-memory cache for the Setting table.
 *
 *   - 60s TTL per entry (`getSetting`).
 *   - `getAllSettings()` is what `hooks.server.ts` stamps onto `event.locals.settings`.
 *   - `invalidate(key)` is called by `settings.service.update` so the next read
 *     bypasses the cache.
 */

type CacheEntry = { value: unknown; expiresAt: number };

const TTL_MS = 60_000;
const cache = new Map<string, CacheEntry>();

export async function getSetting<T = unknown>(key: string): Promise<T | null> {
	const hit = cache.get(key);
	if (hit && hit.expiresAt > Date.now()) {
		return hit.value as T;
	}
	const row = await findByKey(key);
	const value = (row?.value as T) ?? null;
	cache.set(key, { value, expiresAt: Date.now() + TTL_MS });
	return value;
}

export async function getAllSettings(): Promise<Record<string, unknown>> {
	const rows = await listAll();
	const map: Record<string, unknown> = {};
	for (const row of rows) {
		map[row.key] = row.value;
		cache.set(row.key, { value: row.value, expiresAt: Date.now() + TTL_MS });
	}
	return map;
}

export function invalidate(key: string) {
	cache.delete(key);
}

export function invalidateAll() {
	cache.clear();
}
