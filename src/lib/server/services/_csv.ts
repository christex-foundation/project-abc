// Tiny RFC4180-style CSV serializer for the GDPR export bundle.
// Inline rather than a library because the shapes are known and small.

function escapeCell(value: unknown): string {
	if (value === null || value === undefined) return '';
	let s: string;
	if (value instanceof Date) {
		s = value.toISOString();
	} else if (typeof value === 'object') {
		s = JSON.stringify(value);
	} else {
		s = String(value);
	}
	if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
		return `"${s.replace(/"/g, '""')}"`;
	}
	return s;
}

export function toCsv<T extends Record<string, unknown>>(rows: T[], headers?: (keyof T)[]): string {
	const cols = (headers ?? (rows[0] ? (Object.keys(rows[0]) as (keyof T)[]) : [])) as (keyof T)[];
	if (cols.length === 0) return '';
	const head = cols.map((c) => escapeCell(c as string)).join(',');
	const body = rows.map((r) => cols.map((c) => escapeCell(r[c])).join(',')).join('\n');
	return rows.length === 0 ? head + '\n' : `${head}\n${body}\n`;
}
