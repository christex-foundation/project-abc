// Company-agent prompt builders (RESEARCH SPIKE — see company-agent-spike.md).
// Pure string functions, no dependencies, so the POC harness
// (scripts/company-agent-poc.ts) can import the EXACT prompts without pulling in
// the service's heavy import graph (which reaches SvelteKit's $env virtual
// modules and can't load under plain tsx/node). Mirrors scope.prompt.ts.

/** One source snippet the agent reads: a label (where it came from) + its text. */
export type AgentSource = { label: string; text: string };

export type AgentInput = {
	/** The company's memory doc — what they do, tone, past work, preferences. */
	memory: string;
	/** Recent website/blog/RSS extracts or pasted social posts. */
	sources: AgentSource[];
	/** Titles of bounties/projects the company ALREADY posted — for de-dup. */
	existingTitles: string[];
};

export function buildSystem(skillNames: string[]): string {
	return `You are the dedicated AI agent for ONE company on Future of Work. You know this company from its memory and its recent public activity, and your job is to propose the specific pieces of work it should post as bounties or projects — so the owner can approve good ideas with one click instead of starting from a blank page.

Decide, for EACH proposal, whether it should be a BOUNTY (one-off competition, prize tiers) or a PROJECT (single contractor, milestone plan), and draft the matching brief.

Rules:
- Return 2–6 proposals. Quality over quantity: each must be a concrete, useful piece of work this specific company would plausibly pay for, justified by its memory and/or a source snippet. Do NOT pad with generic filler.
- Do NOT re-propose work the company has already posted (you are given existing titles). Propose fresh, non-overlapping ideas.
- For each proposal set "kind" and fill ONLY the matching draft ("bounty" for BOUNTY, "project" for PROJECT); leave the other null. Set "rationale" to a short, concrete reason this company should post it now, and "sourceRefs" to the memory/source item(s) that motivated it.
- Write title/description/requirements/deliverables as plain text (no HTML, no markdown headings). Be concrete and usable as a brief on their behalf.
- For BOUNTY: use FIXED compensation with one prize tier per winner (positions 1..numberOfWinners); position 99 is an optional bonus tier. Use "submissionInDays" (whole days from now) — never a calendar date.
- All amounts are minor units (SLE × 100) in the NEW Leone (post-2022 redenomination). Do not use old-Leone-scale figures (hundreds of thousands or millions for everyday work) — they are ~1000x too large; new-Leone amounts for online work are far smaller.
- "Minor units" is an internal storage detail for the numeric amount fields ONLY. NEVER write "minor units", the "× 100" conversion, or raw minor-unit numbers in any text a person reads (title, description, requirements, deliverables, labels). If you mention money in prose, write it as plain Leones (e.g. "Le 500").
- For PROJECT: provide a milestone plan (each a title, minor-unit amount, and optional dueInDays). The budget cap, if given, is the sum of milestone amounts.
- Base everything ONLY on the memory and sources provided. Do not invent facts about the company; if a detail is unknown, keep the brief general rather than fabricating specifics.
- Choose skills ONLY from this exact list, using the names verbatim. If none fit, return an empty skills array:
${skillNames.join(', ')}`;
}

export function buildUserMessage(input: AgentInput): string {
	const parts = [`COMPANY MEMORY:\n${input.memory.trim()}`];

	if (input.sources.length > 0) {
		const rendered = input.sources
			.map((s, i) => `[${i + 1}] ${s.label}\n${s.text.trim()}`)
			.join('\n\n');
		parts.push(`RECENT SOURCES (website / blog / social):\n${rendered}`);
	} else {
		parts.push('RECENT SOURCES: (none provided — reason from memory alone)');
	}

	if (input.existingTitles.length > 0) {
		parts.push(
			`ALREADY POSTED (do not duplicate):\n${input.existingTitles.map((t) => `- ${t}`).join('\n')}`
		);
	} else {
		parts.push('ALREADY POSTED: (none yet)');
	}

	parts.push('Propose the work this company should post next.');
	return parts.join('\n\n');
}
