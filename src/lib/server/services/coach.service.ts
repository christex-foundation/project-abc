// Flow 3 — Freelancer coach: how to APPROACH the work and how to COMMUNICATE
// with the company (AI assist experiment).
//
// A freelancer on a bounty/project detail clicks "Coach me"; Claude returns
// approach points and a communication draft, each with a short "why this
// matters on Upwork too" note (the locked "balance" coaching style). This is
// SUGGEST-ONLY: nothing here writes the DB. The freelancer edits the draft and
// submits through the unchanged sanitized proposal/submission paths.
//
// Privacy: only public-safe context reaches the prompt. `bountyService.getBounty`
// / `projectService.getProject` return the sponsor shapes (escrow/checkout
// fields included), so we DON'T pass the loaded object through — `buildBountyBrief`
// / `buildProjectBrief` copy out only an explicit public-safe allowlist (brief
// text, skills, prize tiers / milestones, deadline / budget). Sponsor `notes`/
// `label`/`score` live on submissions/proposals, which the coach never loads.

import { requireRole, type AuthedUser } from '../auth-helpers';
import { AppError } from '../http';
import { isAiEnabled } from '../ai/ai-flag';
import { checkRateLimit } from '../ai/rate-limit';
import { completeJSON, MODEL_DEFAULT } from '../ai/claude';
import { coachInput, coachOutput, type CoachResult } from '$lib/validators/ai';
import * as bountyService from './bounty.service';
import * as projectService from './project.service';
import * as freelancerRepo from '../repositories/freelancer.repo';

function stripHtml(input: string | null | undefined): string {
	if (!input) return '';
	return input
		.replace(/<[^>]+>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

export async function coachWork(caller: AuthedUser, raw: unknown): Promise<CoachResult> {
	// Guard order mirrors scoping.service: role → flag → rate-limit → input.
	requireRole(caller, 'FREELANCER');
	if (!(await isAiEnabled())) {
		throw new AppError('FORBIDDEN', 'AI assist is currently unavailable.');
	}
	checkRateLimit(caller.id, { flow: 'coach' });

	const input = coachInput.parse(raw);

	// Ground in the freelancer's own profile so coaching is personalised.
	const profile = await freelancerRepo.findByUserIdWithSkills(caller.id);
	const profileSummary = buildProfileSummary(profile);

	const kind: 'BOUNTY' | 'PROJECT' = input.bountyId ? 'BOUNTY' : 'PROJECT';

	// Load public-safe context (throws NOT_FOUND if missing / not visible).
	let title: string;
	let brief: string;
	if (input.bountyId) {
		const b = await bountyService.getBounty(caller, input.bountyId);
		title = b.title;
		brief = buildBountyBrief(b);
	} else {
		const p = await projectService.getProject(caller, input.projectId!);
		title = p.title;
		brief = buildProjectBrief(p);
	}

	const out = await completeJSON({
		schema: coachOutput,
		model: MODEL_DEFAULT,
		system: buildSystem(kind),
		messages: [{ role: 'user', content: `${brief}\n\nABOUT THE FREELANCER:\n${profileSummary}` }]
	});

	// Null = key removed mid-request; surface the same clean unavailable error.
	if (!out) throw new AppError('FORBIDDEN', 'AI assist is currently unavailable.');

	return {
		kind,
		title,
		approach: out.approach.map((a) => ({ point: a.point, whyUpwork: a.whyUpwork })),
		communication: {
			message: out.communication.message,
			clarifyingQuestions: out.communication.clarifyingQuestions,
			// A cover letter only makes sense for projects; drop any stray bounty one.
			coverLetter: kind === 'PROJECT' ? (out.communication.coverLetter ?? null) : null
		}
	};
}

// --- prompt building --------------------------------------------------------

function buildSystem(kind: 'BOUNTY' | 'PROJECT'): string {
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

function buildBountyBrief(b: Awaited<ReturnType<typeof bountyService.getBounty>>): string {
	const skills = b.skills.map((s) => s.skill.name).join(', ');
	const tiers = b.prizeTiers
		.map(
			(t) =>
				`  ${t.position === 99 ? 'Bonus' : `#${t.position}`}: ${t.amount} (minor units, ${b.currency})${t.label ? ` — ${t.label}` : ''}`
		)
		.join('\n');
	return [
		`BOUNTY BRIEF`,
		`Title: ${b.title}`,
		`Description: ${stripHtml(b.description)}`,
		b.requirements ? `Requirements: ${stripHtml(b.requirements)}` : '',
		b.deliverables ? `Deliverables: ${stripHtml(b.deliverables)}` : '',
		skills ? `Skills: ${skills}` : '',
		`Compensation: ${b.compensationType}, ${b.numberOfWinners} winner(s)`,
		tiers ? `Prize tiers:\n${tiers}` : '',
		`Submission deadline: ${new Date(b.submissionDeadline).toISOString()}`
	]
		.filter(Boolean)
		.join('\n');
}

function buildProjectBrief(p: Awaited<ReturnType<typeof projectService.getProject>>): string {
	const skills = p.skills.map((s) => s.skill.name).join(', ');
	const milestones = p.milestones
		.map(
			(m) =>
				`  ${m.position}. ${m.title}${m.dueInDays ? ` (due in ${m.dueInDays}d)` : ''} — ${m.amount} (minor units, ${p.currency})`
		)
		.join('\n');
	return [
		`PROJECT BRIEF`,
		`Title: ${p.title}`,
		`Description: ${stripHtml(p.description)}`,
		p.requirements ? `Requirements: ${stripHtml(p.requirements)}` : '',
		p.deliverables ? `Deliverables: ${stripHtml(p.deliverables)}` : '',
		skills ? `Skills: ${skills}` : '',
		`Budget cap: ${p.budgetCap} (minor units, ${p.currency})`,
		p.timeToComplete ? `Expected duration: ${p.timeToComplete}` : '',
		milestones ? `Milestone plan:\n${milestones}` : ''
	]
		.filter(Boolean)
		.join('\n');
}

function buildProfileSummary(profile: freelancerRepo.FreelancerProfileWithSkills | null): string {
	if (!profile) return '(no profile details available)';
	const skills = profile.skills.map((s) => s.skill.name).join(', ');
	return (
		[
			profile.headline ? `Headline: ${profile.headline}` : '',
			profile.experienceLevel ? `Experience level: ${profile.experienceLevel}` : '',
			skills ? `Skills: ${skills}` : '',
			profile.bio ? `Bio: ${stripHtml(profile.bio)}` : ''
		]
			.filter(Boolean)
			.join('\n') || '(no profile details available)'
	);
}
