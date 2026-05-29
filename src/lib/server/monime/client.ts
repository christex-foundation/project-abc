import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import { env } from '$env/dynamic/private';
import { AppError } from '../http';

type Json = Record<string, unknown>;

type CreateFinancialAccountInput = {
	name: string;
	currency?: string;
	/** Optional idempotency reference — used to recover an account that was already created. */
	reference?: string;
};
type CreateCheckoutInput = {
	name: string;
	financialAccountId: string;
	amount: number; // minor units
	currency?: string;
	reference: string;
	successUrl: string;
	cancelUrl: string;
	description?: string;
	metadata?: Json;
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
	description?: string;
	metadata?: Json;
};

interface FinancialAccountResult {
	id: string;
	uvan?: string;
	name: string;
	currency: string;
	reference?: string;
}

interface ProviderKycResult {
	account: {
		id: string;
		name: string;
		holderName: string;
		metadata?: Json;
	};
	provider: {
		id: string;
		type: 'momo' | 'bank' | 'wallet';
		name: string;
	};
}

function baseUrl(): string {
	return env.MONIME_BASE_URL?.trim() || 'https://api.monime.io';
}

function requireEnv(name: 'MONIME_ACCESS_TOKEN' | 'MONIME_SPACE_ID' | 'MONIME_VERSION'): string {
	const value = env[name];
	if (!value) throw new AppError('INTERNAL', `${name} is not configured.`);
	return value;
}

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request<T>(path: string, method: 'GET' | 'POST', body?: Json): Promise<T> {
	const url = `${baseUrl()}${path}`;
	// Same key is reused across retries so Monime collapses them into one logical write.
	const idempotencyKey = randomUUID();
	const headers: Record<string, string> = {
		authorization: `Bearer ${requireEnv('MONIME_ACCESS_TOKEN')}`,
		'monime-space-id': requireEnv('MONIME_SPACE_ID'),
		'monime-version': requireEnv('MONIME_VERSION'),
		'idempotency-key': idempotencyKey,
		'content-type': 'application/json',
		accept: 'application/json'
	};

	const retries = 2;
	for (let attempt = 0; attempt <= retries; attempt++) {
		let res: Response;
		try {
			res = await fetch(url, {
				method,
				headers,
				body: body ? JSON.stringify(body) : undefined
			});
		} catch (err) {
			if (attempt < retries) {
				await delay(1000 * (attempt + 1));
				continue;
			}
			throw new AppError('INTERNAL', `Monime ${method} ${path} network error.`, {
				cause: err instanceof Error ? err.message : String(err)
			});
		}

		const text = await res.text();
		const parsed = text ? safeParse(text) : null;

		if (!res.ok) {
			if (res.status >= 500 && attempt < retries) {
				await delay(1000 * (attempt + 1));
				continue;
			}
			throw new AppError('INTERNAL', `Monime ${method} ${path} failed (${res.status}).`, parsed);
		}

		// Unwrap Monime envelope: { success, data: {...} } or { success, result: {...} }
		if (parsed !== null && typeof parsed === 'object') {
			const obj = parsed as Record<string, unknown>;
			if ('data' in obj) return obj.data as T;
			if ('result' in obj) return obj.result as T;
		}
		return (parsed ?? {}) as T;
	}

	throw new AppError('INTERNAL', `Monime ${method} ${path} failed after retries.`);
}

function safeParse(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		return { raw: text };
	}
}

// Money helpers — Monime expects amounts as { currency, value } in minor units
function money(amount: number, currency = 'SLE') {
	return { currency, value: amount };
}

export const monime = {
	financialAccounts: {
		async create(input: CreateFinancialAccountInput): Promise<{ id: string; uvan?: string }> {
			const body: Json = {
				name: input.name,
				currency: input.currency ?? 'SLE'
			};
			if (input.reference) body['reference'] = input.reference;
			const res = await request<FinancialAccountResult>('/v1/financial-accounts', 'POST', body);
			return { id: res.id, uvan: res.uvan };
		},

		async getById(id: string): Promise<{ id: string; uvan?: string }> {
			const res = await request<FinancialAccountResult>(
				`/v1/financial-accounts/${encodeURIComponent(id)}`,
				'GET'
			);
			return { id: res.id, uvan: res.uvan };
		},

		/** Find the first account matching a reference — used for idempotency recovery. */
		async findByReference(reference: string): Promise<{ id: string; uvan?: string } | null> {
			const res = await request<FinancialAccountResult[] | { items: FinancialAccountResult[] }>(
				`/v1/financial-accounts?reference=${encodeURIComponent(reference)}`,
				'GET'
			);
			const list: FinancialAccountResult[] = Array.isArray(res)
				? res
				: 'items' in res
					? res.items
					: [];
			const match = list.find((a) => a.reference === reference);
			if (!match) return null;
			return { id: match.id, uvan: match.uvan };
		},

		async getBalance(id: string) {
			const res = await request<{
				balance: { available: { value: number } };
			}>(`/v1/financial-accounts/${encodeURIComponent(id)}?withBalance=true`, 'GET');
			return { available: res.balance.available.value };
		}
	},

	checkoutSessions: {
		async create(input: CreateCheckoutInput) {
			const body: Json = {
				name: input.name,
				financialAccountId: input.financialAccountId,
				reference: input.reference,
				successUrl: input.successUrl,
				cancelUrl: input.cancelUrl,
				lineItems: [
					{
						type: 'custom',
						name: input.name,
						price: money(input.amount, input.currency),
						quantity: 1,
						description: input.description ?? input.name,
						reference: input.reference
					}
				]
			};
			if (input.metadata) body['metadata'] = input.metadata;
			const res = await request<{ id: string; redirectUrl: string }>(
				'/v1/checkout-sessions',
				'POST',
				body
			);
			return { id: res.id, url: res.redirectUrl };
		}
	},

	payouts: {
		async create(input: CreatePayoutInput) {
			const res = await request<{ id: string; status: string }>('/v1/payouts', 'POST', {
				sourceAccountId: input.sourceAccountId,
				destination: input.destination,
				amount: money(input.amount, input.currency),
				reference: input.reference
			});
			return { id: res.id, status: res.status };
		}
	},

	internalTransfers: {
		async create(input: CreateTransferInput) {
			const body: Json = {
				sourceFinancialAccount: { id: input.from },
				destinationFinancialAccount: { id: input.to },
				amount: money(input.amount, input.currency),
				reference: input.reference
			};
			if (input.description) body['description'] = input.description;
			if (input.metadata) body['metadata'] = input.metadata;
			const res = await request<{ id: string; status: string }>(
				'/v1/internal-transfers',
				'POST',
				body
			);
			return { id: res.id, status: res.status };
		}
	},

	providerKyc: {
		async get(
			providerId: string,
			phoneNumber: string
		): Promise<{ holderName: string; providerName: string }> {
			const res = await request<ProviderKycResult>(
				`/v1/provider-kyc/${encodeURIComponent(providerId)}?accountId=${encodeURIComponent(phoneNumber)}`,
				'GET'
			);
			return {
				holderName: res.account.holderName,
				providerName: res.provider.name
			};
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
