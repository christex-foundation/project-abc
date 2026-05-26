/**
 * Auto-save form state to localStorage so a flaky connection doesn't lose a
 * freelancer's work-in-progress (plan §1 mobile-first / connectivity rules).
 *
 * Returns helpers for binding to a Svelte 5 form state. Will become the
 * backbone of the Phase 2 bounty-creation wizard.
 *
 * Usage:
 *   const draft = useLocalDraft<MyForm>('bounty-create-wizard', { … });
 *   draft.save(formValue);     // debounced 800ms
 *   draft.load();              // returns previous draft or null
 *   draft.clear();             // after successful submit
 */

const DEBOUNCE_MS = 800;

export type LocalDraft<T> = {
	load: () => T | null;
	save: (value: T) => void;
	clear: () => void;
};

export function useLocalDraft<T>(key: string, _initial?: T): LocalDraft<T> {
	const storageKey = `fow:draft:${key}`;
	let timer: ReturnType<typeof setTimeout> | null = null;

	function safeStorage(): Storage | null {
		if (typeof window === 'undefined') return null;
		try {
			return window.localStorage;
		} catch {
			return null;
		}
	}

	return {
		load() {
			const s = safeStorage();
			if (!s) return null;
			const raw = s.getItem(storageKey);
			if (!raw) return null;
			try {
				return JSON.parse(raw) as T;
			} catch {
				return null;
			}
		},
		save(value) {
			const s = safeStorage();
			if (!s) return;
			if (timer) clearTimeout(timer);
			timer = setTimeout(() => {
				try {
					s.setItem(storageKey, JSON.stringify(value));
				} catch {
					// Quota exceeded or storage disabled — silently drop.
				}
			}, DEBOUNCE_MS);
		},
		clear() {
			const s = safeStorage();
			if (!s) return;
			if (timer) clearTimeout(timer);
			s.removeItem(storageKey);
		}
	};
}
