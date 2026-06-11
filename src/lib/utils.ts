import { clsx, type ClassValue } from 'clsx';

/**
 * Class-name combiner. Matches the helper shadcn-svelte's generated components
 * import from `$lib/utils` — defined now so future shadcn `add` calls drop in
 * without modification.
 */
export function cn(...inputs: ClassValue[]) {
	return clsx(inputs);
}

/**
 * Return a small, auto-format/quality thumbnail variant of a Cloudinary image
 * URL (for logos/avatars) so mobile clients fetch a tiny, well-compressed image.
 * Non-Cloudinary URLs (or already-transformed ones we can't safely touch) are
 * returned unchanged.
 */
export function cloudinaryThumb(url: string | null | undefined, size = 64): string {
	if (!url || !url.includes('res.cloudinary.com/') || !url.includes('/upload/')) return url ?? '';
	return url.replace('/upload/', `/upload/c_fill,f_auto,q_auto,dpr_auto,w_${size},h_${size}/`);
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

/**
 * Compact money formatter for navigation chips, tickers, and stat counters
 * where horizontal space is scarce: `Le 1.25M`, `Le 820k`, `Le 450`.
 * `currency` defaults to "Le" (display) rather than the canonical "SLE" code
 * since this is for at-a-glance UI, not amounts in forms.
 */
export function formatMoneyCompact(minor: number, currency = 'Le'): string {
	const major = minor / 100;
	const abs = Math.abs(major);
	let body: string;
	if (abs >= 1_000_000) {
		body = `${(major / 1_000_000).toFixed(major % 1_000_000 === 0 ? 0 : 2).replace(/\.?0+$/, '')}M`;
	} else if (abs >= 1_000) {
		body = `${(major / 1_000).toFixed(major % 1_000 === 0 ? 0 : 1).replace(/\.?0+$/, '')}k`;
	} else {
		body = major.toLocaleString(undefined, { maximumFractionDigits: 0 });
	}
	return `${currency} ${body}`;
}

/**
 * "2h ago", "just now", "3d ago". Falls back to a date string after 30 days.
 */
export function formatRelative(d: Date | string): string {
	const ms = Date.now() - new Date(d).getTime();
	const mins = Math.floor(ms / 60_000);
	if (mins < 1) return 'just now';
	if (mins < 60) return `${mins}m ago`;
	const hrs = Math.floor(mins / 60);
	if (hrs < 24) return `${hrs}h ago`;
	const days = Math.floor(hrs / 24);
	if (days < 30) return `${days}d ago`;
	return new Date(d).toLocaleDateString();
}

/**
 * Mask a display name to "First L." for public surfaces (recent earners ticker,
 * leaderboards). Trims, splits on whitespace, falls back to "A freelancer" when
 * the input has no usable token.
 */
export function maskDisplayName(name: string | null | undefined): string {
	if (!name) return 'A freelancer';
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return 'A freelancer';
	const first = parts[0];
	if (parts.length === 1) return first;
	const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
	return `${first} ${lastInitial}.`;
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
