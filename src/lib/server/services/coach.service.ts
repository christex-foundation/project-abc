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
import { completeJSON, MODEL_FAST } from '../ai/claude';
import { buildSystem, buildUserMessage } from '../ai/coach.prompt';
import {
	buildSystem as buildWorkspaceSystem,
	buildUserMessage as buildWorkspaceUserMessage
} from '../ai/workspace-coach.prompt';
import {
	coachInput,
	coachOutput,
	type CoachResult,
	workspaceCoachInput,
	workspaceCoachOutput,
	type WorkspaceCoachResult
} from '$lib/validators/ai';
import * as bountyService from './bounty.service';
import * as projectService from './project.service';
import * as freelancerRepo from '../repositories/freelancer.repo';
import * as milestoneRepo from '../repositories/milestone.repo';
import * as projectRepo from '../repositories/project.repo';

function stripHtml(input: string | null | undefined): string {
	if (!input) return '';
	return input
		.replace(/<[^>]+>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

export async function coachWork(
	caller: AuthedUser,
	raw: unknown,
	opts: { unlockedIds?: string[] } = {}
): Promise<CoachResult> {
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
		// Pass through the visitor's unlocks so coaching works on a PIN-locked
		// bounty the freelancer has legitimately unlocked (still NOT_FOUND / blanked
		// otherwise — no content leaks without the PIN).
		const b = await bountyService.getBounty(caller, input.bountyId, {
			unlockedIds: opts.unlockedIds
		});
		title = b.title;
		brief = buildBountyBrief(b);
	} else {
		const p = await projectService.getProject(caller, input.projectId!, {
			unlockedIds: opts.unlockedIds
		});
		title = p.title;
		brief = buildProjectBrief(p);
	}

	const out = await completeJSON({
		// Haiku chosen via scripts/ai-eval.ts (Phase 4): 100% structural pass at ~1/3
		// the cost of Sonnet with comparable latency. See ai-integration.md Results.
		schema: coachOutput,
		model: MODEL_FAST,
		system: buildSystem(kind),
		messages: [{ role: 'user', content: buildUserMessage(brief, profileSummary) }]
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

// Flow 4 — Workspace coach: help the awarded CONTRACTOR deliver a milestone the
// client will approve. SUGGEST-ONLY (never writes the DB). Contractor-only, and
// every input it reads is data the contractor already sees on the workspace
// page, so there's no new privacy surface (sponsor-private notes/label/score
// live on bounty submissions, not milestones).
export async function coachWorkspace(
	caller: AuthedUser,
	raw: unknown
): Promise<WorkspaceCoachResult> {
	// Guard order mirrors coachWork: role → flag → rate-limit → input.
	requireRole(caller, 'FREELANCER');
	if (!(await isAiEnabled())) {
		throw new AppError('FORBIDDEN', 'AI assist is currently unavailable.');
	}
	checkRateLimit(caller.id, { flow: 'workspace-coach' });

	const input = workspaceCoachInput.parse(raw);

	// Load the milestone + its project, then authorise the caller as THIS
	// project's awarded contractor (same check as milestone.service loadParties,
	// which isn't exported — we only need the contractor branch here).
	const milestone = await milestoneRepo.findById(input.milestoneId);
	if (!milestone) throw new AppError('NOT_FOUND', 'Milestone not found.');
	const project = await projectRepo.findProjectById(milestone.projectId);
	if (!project) throw new AppError('NOT_FOUND', 'Milestone not found.');

	const profile = await freelancerRepo.findByUserId(caller.id);
	if (!profile || profile.id !== project.contractorProfileId) {
		throw new AppError('FORBIDDEN', 'You do not have access to this milestone.');
	}

	const brief = buildMilestoneBrief(project, milestone);
	const thread = buildThreadSummary(milestone);
	const draft = {
		note: input.draftNote ?? '',
		deliverables: input.draftDeliverables.map((d) => ({ label: d.label, url: d.url })),
		comment: input.draftComment ?? ''
	};

	const out = await completeJSON({
		// Haiku — same tier and rationale as Flow 3 (coach); see ai-eval.ts.
		// Token ceiling comes from completeJSON's default (8192) — this flow's output
		// (gaps + selfCheck + a full polishedNote rewrite) needs the headroom.
		schema: workspaceCoachOutput,
		model: MODEL_FAST,
		system: buildWorkspaceSystem(),
		messages: [{ role: 'user', content: buildWorkspaceUserMessage(brief, thread, draft) }]
	});

	// Null = key removed mid-request; surface the same clean unavailable error.
	if (!out) throw new AppError('FORBIDDEN', 'AI assist is currently unavailable.');

	return { ...out, milestoneTitle: milestone.title };
}

// --- prompt building --------------------------------------------------------
// buildSystem / buildUserMessage live in ../ai/coach.prompt (imported above) so
// the eval harness can reuse them without the service's import graph. The brief
// builders below stay here — they depend on the loaded bounty/project shapes.

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

// Flow 4 brief: the project context + the specific milestone the contractor is
// delivering. Public-safe allowlist only — no escrow/checkout fields reach the
// prompt, matching buildProjectBrief's discipline above.
function buildMilestoneBrief(
	project: projectRepo.ProjectForCompany,
	milestone: milestoneRepo.MilestoneWithThread
): string {
	const skills = project.skills.map((s) => s.skill.name).join(', ');
	return [
		`PROJECT BRIEF`,
		`Title: ${project.title}`,
		`Description: ${stripHtml(project.description)}`,
		project.requirements ? `Requirements: ${stripHtml(project.requirements)}` : '',
		project.deliverables ? `Deliverables: ${stripHtml(project.deliverables)}` : '',
		skills ? `Skills: ${skills}` : '',
		``,
		`THE MILESTONE BEING DELIVERED`,
		`#${milestone.position}: ${milestone.title}`,
		milestone.description ? `Details: ${stripHtml(milestone.description)}` : '',
		`Reward on approval: ${milestone.amount} (minor units, ${project.currency})`,
		`Current status: ${milestone.status}`,
		milestone.revisionCount > 0 ? `Revision round: #${milestone.revisionCount}` : ''
	]
		.filter(Boolean)
		.join('\n');
}

// The update/comment thread, oldest-first, role-labelled. Both parties already
// see this in the workspace; we strip HTML to plain text for the prompt.
function buildThreadSummary(milestone: milestoneRepo.MilestoneWithThread): string {
	type Entry = { at: number; line: string };
	const entries: Entry[] = [];
	for (const u of milestone.updates) {
		const links = Array.isArray(u.deliverables)
			? (u.deliverables as { label?: string; url?: string }[])
					.map((d) => d.url)
					.filter(Boolean)
					.join(', ')
			: '';
		entries.push({
			at: new Date(u.createdAt).getTime(),
			line: `[contractor update] ${stripHtml(u.note)}${links ? ` (links: ${links})` : ''}`
		});
	}
	for (const c of milestone.comments) {
		const who = c.authorRole === 'COMPANY' ? 'client' : 'contractor';
		entries.push({
			at: new Date(c.createdAt).getTime(),
			line: `[${who} comment] ${stripHtml(c.body)}`
		});
	}
	if (entries.length === 0) return '(no updates or comments yet)';
	return entries
		.sort((a, b) => a.at - b.at)
		.map((e) => e.line)
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
