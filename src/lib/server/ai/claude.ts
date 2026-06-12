// Anthropic Claude wrapper for the AI assist experiment. The SDK is initialised
// lazily so a missing ANTHROPIC_API_KEY doesn't crash module load — getClient()
// returns null in that case and completeJSON() no-ops to null, keeping the rest
// of the platform usable with no AI key (mirrors embeddings.ts).
//
// AI output is untrusted input: every response is forced through a single
// tool-use call whose input_schema is derived from the caller's Zod schema, and
// the returned object is re-validated against that schema before it leaves here.

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { AppError } from '../http';

// Model IDs for per-flow override. Default to Sonnet; flows that prove out on a
// cheaper/stronger tier can override (Haiku for the coach, Opus for the decider).
export const MODEL_DEFAULT = 'claude-sonnet-4-6';
export const MODEL_FAST = 'claude-haiku-4-5';
export const MODEL_DEEP = 'claude-opus-4-8';

// Generous default ceiling. max_tokens is a CEILING, not a target — billing and
// latency track the tokens actually produced, so a high default costs nothing for
// the lighter flows while protecting every flow from truncation. The coach flows
// (approach + message + cover-letter skeleton, or gaps + a full polished-note
// rewrite) routinely exceed the old 2048 and would otherwise truncate.
const DEFAULT_MAX_TOKENS = 8192;
const TOOL_NAME = 'respond';

// Shared system context prepended to every AI call. Keeps the platform facts
// (currency, minor units) and the Bounty-vs-Project definitions in one place so
// Flow 1 (decider) and Flow 3 (coach) reason from the same ground truth.
export const AI_SYSTEM_PREAMBLE = `You are the AI assistant for Future of Work (FOW), a bounty and project platform for Sierra Leone and West Africa. FOW helps local businesses delegate work and trains freelancers to become ready for global platforms like Upwork.

Platform facts you must respect:
- Currency defaults to SLE, the NEW Sierra Leonean Leone (SLE / NLe) — after the 2022 redenomination where 1,000 old Leones = 1 new Leone. Do NOT use old-Leone figures (the hundreds of thousands or millions seen for everyday prices in older data) — those are ~1000x too large for the new Leone. New-Leone amounts for online work are far smaller.
- All money amounts are integers in MINOR units (e.g. 1000 = 10.00 SLE). Never emit decimals or floats for money.

There are exactly two ways to engage work:
- BOUNTY: a one-off competitive task. Many freelancers submit work; the company picks winners. It has prize tiers (each a position + a minor-unit amount; position 99 means a bonus prize). Best for well-defined, single-deliverable work where you want options (e.g. "design one logo, best entry wins").
- PROJECT: a managed, milestone-based engagement with a single contractor chosen from proposals. It has a milestone plan (each milestone a title, minor-unit amount, and due date) and a budget cap. Best for larger, multi-step work that needs collaboration (e.g. "build a 4-page website for my shop").

You produce drafts, rankings, and coaching only. You never write to the database or send messages — a human always reviews and submits your output through the platform's own validated paths.`;

let cached: Anthropic | null = null;

function getClient(): Anthropic | null {
	if (cached) return cached;
	const apiKey = process.env.ANTHROPIC_API_KEY;
	if (!apiKey) return null;
	cached = new Anthropic({ apiKey });
	return cached;
}

export type CompleteJSONOptions<T> = {
	/** Zod schema describing the required structured output. Also the trust boundary. */
	schema: z.ZodType<T>;
	/** Conversation messages (user/assistant turns). */
	messages: Anthropic.MessageParam[];
	/** Optional flow-specific system text, appended after the shared preamble. */
	system?: string;
	/** Override the model; defaults to MODEL_DEFAULT (Sonnet). */
	model?: string;
	/** Max output tokens; defaults to 2048. */
	maxTokens?: number;
};

/** Validated output plus the metadata the eval harness needs (cost + latency). */
export type CompleteJSONMeta<T> = {
	data: T;
	/** Token counts from the API response, used to compute cost. */
	usage: { inputTokens: number; outputTokens: number };
	/** The model actually used (echoes opts.model / MODEL_DEFAULT). */
	model: string;
	/** Wall-clock latency of the messages.create call, in milliseconds. */
	latencyMs: number;
};

/**
 * Like {@link completeJSON} but also returns token usage and latency. This is
 * the real implementation; `completeJSON` is a thin wrapper that drops the
 * metadata. Only the eval harness (`scripts/ai-eval.ts`) needs the metadata —
 * the three services keep calling `completeJSON` unchanged.
 *
 * Returns `null` when no ANTHROPIC_API_KEY is configured (graceful degradation).
 * Throws `AppError('INTERNAL', …)` on a hard failure (API error, no tool_use
 * block, or schema validation failure) so callers can surface a clean error.
 */
export async function completeJSONWithMeta<T>(
	opts: CompleteJSONOptions<T>
): Promise<CompleteJSONMeta<T> | null> {
	const client = getClient();
	if (!client) return null;

	const { schema, messages, system, model = MODEL_DEFAULT, maxTokens = DEFAULT_MAX_TOKENS } = opts;
	const inputSchema = z.toJSONSchema(schema) as Anthropic.Tool.InputSchema;
	const fullSystem = [AI_SYSTEM_PREAMBLE, system].filter(Boolean).join('\n\n');

	try {
		const startedAt = Date.now();
		const res = await client.messages.create({
			model,
			max_tokens: maxTokens,
			system: fullSystem,
			messages,
			tools: [
				{
					name: TOOL_NAME,
					description: 'Return the structured response. You MUST call this tool.',
					input_schema: inputSchema
				}
			],
			tool_choice: { type: 'tool', name: TOOL_NAME }
		});
		const latencyMs = Date.now() - startedAt;

		// A response truncated at max_tokens leaves the forced tool call partial:
		// the SDK can't parse the incomplete JSON, so `block.input` comes back `{}`,
		// which would silently parse to an "empty" result (defaults + nullish fields)
		// and surface as a blank panel. Treat truncation as a hard failure instead.
		if (res.stop_reason === 'max_tokens') {
			console.error(
				`[claude] response truncated at max_tokens (model=${model}, max_tokens=${maxTokens}, output_tokens=${res.usage.output_tokens})`
			);
			throw new AppError('INTERNAL', 'AI response was truncated.');
		}

		const block = res.content.find((b) => b.type === 'tool_use');
		if (!block || block.type !== 'tool_use') {
			throw new Error('Claude did not return a tool_use block');
		}

		// Re-validate the (untrusted) tool output. safeParse so we can log WHICH
		// field/constraint failed instead of an opaque ZodError — invaluable when an
		// output shape drifts. Output bounds are generous hints (see validators/ai.ts),
		// so this should only fire on a genuinely malformed response.
		const parsed = schema.safeParse(block.input);
		if (!parsed.success) {
			console.error('[claude] tool output failed schema validation:', parsed.error.issues);
			throw new AppError('INTERNAL', 'AI returned an unexpected response shape.');
		}
		return {
			data: parsed.data,
			usage: {
				inputTokens: res.usage.input_tokens,
				outputTokens: res.usage.output_tokens
			},
			model,
			latencyMs
		};
	} catch (e) {
		// Preserve our own typed failures (truncation / bad-shape) — they have
		// specific messages and have already logged their cause.
		if (e instanceof AppError) throw e;
		// Anthropic SDK errors carry an HTTP status + a typed name (APIError
		// subclasses). Log those explicitly so the terminal names the cause
		// (401 auth, 404 model_not_found, 429 overloaded, connection error)
		// instead of just an opaque object. The user-facing message stays generic.
		if (e instanceof Anthropic.APIError) {
			console.error(`[claude] API error: status=${e.status} name=${e.name} message=${e.message}`);
		} else {
			console.error('[claude] completeJSON failed:', e);
		}
		throw new AppError('INTERNAL', 'AI request failed.');
	}
}

/**
 * Run a Claude completion that is forced to return JSON matching `schema`.
 *
 * Returns `null` when no ANTHROPIC_API_KEY is configured (graceful degradation).
 * Throws `AppError('INTERNAL', …)` on a hard failure (API error, no tool_use
 * block, or schema validation failure) so callers can surface a clean error.
 */
export async function completeJSON<T>(opts: CompleteJSONOptions<T>): Promise<T | null> {
	const meta = await completeJSONWithMeta(opts);
	return meta ? meta.data : null;
}
