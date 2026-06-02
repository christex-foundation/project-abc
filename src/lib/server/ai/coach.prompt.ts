// Flow 3 (coach) prompt builders — pure string functions, no dependencies.
// Kept in their own module (not the service) so the eval harness
// (scripts/ai-eval.ts) can import the EXACT production prompts without pulling
// in the service's heavy import graph (which reaches SvelteKit's $env virtual
// modules and can't load under plain tsx/node).

export function buildUserMessage(brief: string, profileSummary: string): string {
	return `${brief}\n\nABOUT THE FREELANCER:\n${profileSummary}`;
}

export function buildSystem(kind: 'BOUNTY' | 'PROJECT'): string {
	const target =
		kind === 'BOUNTY'
			? 'a BOUNTY (a one-off competition — the freelancer submits work and the company picks winners)'
			: 'a PROJECT (a single contractor is chosen from proposals, then delivers a milestone plan)';
	const coverLetterRule =
		kind === 'PROJECT'
			? 'Fill "communication.coverLetter" with a short, editable proposal skeleton the freelancer can adapt and submit.'
			: 'Set "communication.coverLetter" to null — a bounty submission has no cover letter.';
	return `You are coaching a freelancer on Future of Work who is about to take on ${target}.

Your job is to help them (a) APPROACH the work well and (b) COMMUNICATE professionally with the company. Coach with BALANCE: help them win THIS piece of work now, and also teach the transferable habit that makes them ready for global platforms like Upwork.

Rules:
- "approach": 2–6 concrete points — how to break the work down, what the brief is really asking for, what to prioritise, and the common pitfalls to avoid. For each point, "whyUpwork" is one short sentence on why the same habit pays off on Upwork too.
- "communication.message": a short, professional draft note the freelancer could send the company (warm, specific, no fluff).
- "communication.clarifyingQuestions": 0–6 sharp questions that de-risk the work before starting.
- ${coverLetterRule}
- Plain text only — no HTML, no markdown headings. Base everything only on the brief and the freelancer profile provided; do not invent facts.`;
}
