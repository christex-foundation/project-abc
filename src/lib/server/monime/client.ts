import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '$env/dynamic/private';
import { AppError } from '../http';

type Json = Record<string, unknown>;

type CreateFinancialAccountInput = { name: string; currency?: string };
type CreateCheckoutInput = {
	financialAccountId: string;
	amount: number; // minor units
	currency?: string;
	reference: string;
	successUrl: string;
	cancelUrl: string;
};
type CreatePayoutInput = {
	sourceAccountId: string;
	destination: { type: 'MOMO' | 'BANK'; phoneNumber?: string; bankDetails?: Json };
	amount: number; // minor units
	currency?: string;
	reference: string;
};
type CreateTransferInput = {
	from: string;
	to: string;
	amount: number; // minor units
	currency?: string;
	reference: string;
};

function baseUrl(): string {
	return env.MONIME_BASE_URL?.trim() || 'https://api.monime.io';
}

function requireEnv(name: 'MONIME_ACCESS_TOKEN' | 'MONIME_SPACE_ID'): string {
	const value = env[name];
	if (!value) throw new AppError('INTERNAL', `${name} is not configured.`);
	return value;
}

async function request<T>(path: string, method: 'GET' | 'POST', body?: Json): Promise<T> {
	const url = `${baseUrl()}${path}`;
	const res = await fetch(url, {
		method,
		headers: {
			authorization: `Bearer ${requireEnv('MONIME_ACCESS_TOKEN')}`,
			'monime-space-id': requireEnv('MONIME_SPACE_ID'),
			'content-type': 'application/json',
			accept: 'application/json'
		},
		body: body ? JSON.stringify(body) : undefined
	});
	const text = await res.text();
	const parsed = text ? safeParse(text) : null;
	if (!res.ok) {
		throw new AppError('INTERNAL', `Monime ${method} ${path} failed (${res.status}).`, parsed);
	}
	return (parsed ?? {}) as T;
}

function safeParse(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		return { raw: text };
	}
}

// Money helpers — Monime expects amounts as { currency, value } in minor units
// per their financial-account documentation. We keep all internal arithmetic in
// minor units; the conversion lives at this boundary.
function money(amount: number, currency = 'SLE') {
	return { currency, value: amount };
}

export const monime = {
	financialAccounts: {
		async create(input: CreateFinancialAccountInput) {
			const res = await request<{ result: { id: string } }>('/v1/financial-accounts', 'POST', {
				name: input.name,
				currency: input.currency ?? 'SLE'
			});
			return { id: res.result.id };
		},

		async getBalance(id: string) {
			const res = await request<{ result: { balance: { available: { value: number } } } }>(
				`/v1/financial-accounts/${encodeURIComponent(id)}`,
				'GET'
			);
			return { available: res.result.balance.available.value };
		}
	},

	checkoutSessions: {
		async create(input: CreateCheckoutInput) {
			const res = await request<{ result: { id: string; redirectUrl: string } }>(
				'/v1/checkout-sessions',
				'POST',
				{
					financialAccountId: input.financialAccountId,
					amount: money(input.amount, input.currency),
					reference: input.reference,
					successUrl: input.successUrl,
					cancelUrl: input.cancelUrl
				}
			);
			return { id: res.result.id, url: res.result.redirectUrl };
		}
	},

	payouts: {
		async create(input: CreatePayoutInput) {
			const res = await request<{ result: { id: string; status: string } }>('/v1/payouts', 'POST', {
				sourceAccountId: input.sourceAccountId,
				destination: input.destination,
				amount: money(input.amount, input.currency),
				reference: input.reference
			});
			return { id: res.result.id, status: res.result.status };
		}
	},

	internalTransfers: {
		async create(input: CreateTransferInput) {
			const res = await request<{ result: { id: string; status: string } }>(
				'/v1/internal-transfers',
				'POST',
				{
					sourceAccountId: input.from,
					destinationAccountId: input.to,
					amount: money(input.amount, input.currency),
					reference: input.reference
				}
			);
			return { id: res.result.id, status: res.result.status };
		}
	}
};

/**
 * Constant-time HMAC verification for Monime webhooks. Returns false on any
 * mismatch — never throws — so the caller decides how to respond.
 */
export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
	if (!signatureHeader) return false;
	const secret = env.MONIME_WEBHOOK_SECRET;
	if (!secret) return false;
	const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
	const provided = signatureHeader
		.trim()
		.toLowerCase()
		.replace(/^sha256=/, '');
	const a = Buffer.from(expected, 'hex');
	const b = Buffer.from(provided, 'hex');
	if (a.length !== b.length) return false;
	return timingSafeEqual(a, b);
}
