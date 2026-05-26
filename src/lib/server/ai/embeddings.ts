// OpenAI text-embedding-3-small wrapper. The SDK is initialised lazily so a
// missing OPENAI_API_KEY doesn't crash module load — embedText() returns null
// in that case and callers no-op rather than throw, which keeps the rest of
// the platform usable in dev without an OpenAI key.

import OpenAI from 'openai';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMS = 1536;

let cached: OpenAI | null = null;

function getClient(): OpenAI | null {
	if (cached) return cached;
	const apiKey = process.env.OPENAI_API_KEY;
	if (!apiKey) return null;
	cached = new OpenAI({ apiKey });
	return cached;
}

export async function embedText(text: string): Promise<number[] | null> {
	const client = getClient();
	if (!client) return null;
	const cleaned = text.trim();
	if (cleaned.length === 0) return null;
	try {
		const res = await client.embeddings.create({ model: EMBEDDING_MODEL, input: cleaned });
		const vec = res.data[0]?.embedding;
		if (!Array.isArray(vec) || vec.length !== EMBEDDING_DIMS) return null;
		return vec;
	} catch (e) {
		console.error('[embeddings] embedText failed:', e);
		return null;
	}
}

export function cosineSimilarity(a: number[], b: number[]): number {
	if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
	let dot = 0;
	let na = 0;
	let nb = 0;
	for (let i = 0; i < a.length; i++) {
		dot += a[i] * b[i];
		na += a[i] * a[i];
		nb += b[i] * b[i];
	}
	if (na === 0 || nb === 0) return 0;
	return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
