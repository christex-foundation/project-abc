import { clsx, type ClassValue } from 'clsx';

/**
 * Class-name combiner. Matches the helper shadcn-svelte's generated components
 * import from `$lib/utils` — defined now so future shadcn `add` calls drop in
 * without modification.
 */
export function cn(...inputs: ClassValue[]) {
	return clsx(inputs);
}

// Money is stored in minor units (CLAUDE.md hard rule). Format for display.
export function formatMoney(minor: number, currency = 'SLE'): string {
	const major = minor / 100;
	const formatted = major.toLocaleString(undefined, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});
	return `${currency} ${formatted}`;
}

export function formatDate(
	date: Date | string | null | undefined,
	opts?: Intl.DateTimeFormatOptions
): string {
	if (!date) return '—';
	const d = typeof date === 'string' ? new Date(date) : date;
	return d.toLocaleDateString(
		undefined,
		opts ?? { year: 'numeric', month: 'short', day: 'numeric' }
	);
}

export function formatDateTime(date: Date | string | null | undefined): string {
	if (!date) return '—';
	const d = typeof date === 'string' ? new Date(date) : date;
	return d.toLocaleString(undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});
}
