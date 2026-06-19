// Flow 1 (decider) prompt builders — pure string functions, no dependencies
// beyond the input type. Kept in their own module (not the service) so the eval
// harness (scripts/ai-eval.ts) can import the EXACT production prompts without
// pulling in the service's heavy import graph (which reaches SvelteKit's $env
// virtual modules and can't load under plain tsx/node).

import type { ScopeInput } from '../../validators/ai';

export function buildSystem(skillNames: string[]): string {
	return `You are scoping a piece of work for a company on Future of Work. Decide whether it should be a BOUNTY (one-off competition, prize tiers) or a PROJECT (single contractor, milestone plan), and draft the matching brief.

Rules:
- Set "type" and fill ONLY the matching draft ("bounty" for BOUNTY, "project" for PROJECT). Leave the other null.
- Write title/description/requirements/deliverables as plain text (no HTML, no markdown headings). Be concrete and usable as a brief.
- For BOUNTY: use FIXED compensation with one prize tier per winner (positions 1..numberOfWinners); position 99 is an optional bonus tier. All amounts are minor units (SLE × 100). Use "submissionInDays" (whole days from now) — never a calendar date.
- Amounts must be in the NEW Leone (post-2022 redenomination). Do not use old-Leone-scale figures (hundreds of thousands or millions for everyday work) — they are ~1000x too large; new-Leone amounts for online work are far smaller.
- "Minor units" is an internal storage detail for the numeric amount fields ONLY. NEVER write "minor units", the "× 100" conversion, or raw minor-unit numbers in any text the company reads (title, description, requirements, deliverables, labels). If you mention money in prose, write it as plain Leones (e.g. "Le 500").
- For PROJECT: provide a milestone plan (each a title, minor-unit amount, and optional dueInDays). The budget cap, if given, is the sum of milestone amounts.
- Choose skills ONLY from this exact list, using the names verbatim. If none fit, return an empty skills array:
${skillNames.join(', ')}`;
}

export function buildUserMessage(input: ScopeInput): string {
	const parts = [`What the company needs:\n${input.need}`];
	if (input.budgetMinor != null) {
		parts.push(`Approximate budget: ${input.budgetMinor} (minor units, SLE).`);
	}
	if (input.timeline) parts.push(`Timeline hint: ${input.timeline}`);
	return parts.join('\n\n');
}
