// Flow 2 — Company proposal ranking ("AI shortlist") for the AI assist experiment.
//
// For a Project that has received proposals, the owner gets a ranked shortlist
// of applicants with reasoning (strengths / risks / suggested questions). It
// FUSES two signals: the existing embedding cosine pre-filter
// (matching.findMatchesForProject) and Claude's reasoning over each cover letter.
//
// SUGGEST-ONLY and SPONSOR-FACING: nothing here writes the DB, and the endpoint
// is owner/admin-guarded (a freelancer gets FORBIDDEN via listForProject).
//
// Unlike Flow 1, this DEGRADES instead of failing: with AI off (or no key) it
// returns the raw embedding order flagged `rankedBy: 'embedding'`; with no
// embeddings either, `rankedBy: 'none'`. The platform stays usable with no keys.
//
// Privacy: only public-safe applicant fields reach the prompt (displayName,
// headline, experienceLevel, stripped cover letter, proposed timeline). Private
// fields (whatsappNumber, monime ids, email) are never sent.

import type { AuthedUser } from '../auth-helpers';
import { isAiEnabled } from '../ai/ai-flag';
import { checkRateLimit } from '../ai/rate-limit';
import { completeJSON, MODEL_DEFAULT } from '../ai/claude';
import {
	proposalRankOutput,
	type ProposalRankResult,
	type ProposalRankedItem
} from '$lib/validators/ai';
import * as proposalService from './proposal.service';
import * as projectRepo from '../repositories/project.repo';
import { findMatchesForProject } from './matching.service';
import type { ProposalForCompany } from '../repositories/proposal.repo';

function stripHtml(input: string | null | undefined): string {
	if (!input) return '';
	return input
		.replace(/<[^>]+>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

/**
 * Rank a project's SUBMITTED proposals for its owner. Reuses
 * `proposalService.listForProject` for the role + ownership guard (throws
 * NOT_FOUND / FORBIDDEN), so this function takes no extra auth checks.
 */
export async function rankProposals(
	caller: AuthedUser,
	projectId: string
): Promise<ProposalRankResult> {
	// Guard + load in one step: enforces requireRole('COMPANY','ADMIN') + ownership.
	const all = await proposalService.listForProject(caller, projectId);
	const proposals = all.filter((p) => p.status === 'SUBMITTED');
	if (proposals.length === 0) return { rankedBy: 'none', items: [] };

	// Embedding signal: cosine score per freelancer profile. Empty when the
	// project or freelancers have no embedding (e.g. no OPENAI_API_KEY).
	const matches = await findMatchesForProject(projectId, 200);
	const cosineByProfile = new Map(matches.map((m) => [m.freelancerProfileId, m.matchScore]));
	const hasEmbeddingSignal = cosineByProfile.size > 0;

	const similarityOf = (p: ProposalForCompany): number | null => {
		if (!p.freelancerProfileId) return null;
		return cosineByProfile.get(p.freelancerProfileId) ?? null;
	};

	// Embedding-ordered proposals (missing cosine sorts last). Used directly as
	// the fallback ranking and to seed the AI prompt order.
	const byEmbedding = [...proposals].sort(
		(a, b) => (similarityOf(b) ?? -1) - (similarityOf(a) ?? -1)
	);

	const fallback = (): ProposalRankResult => ({
		rankedBy: hasEmbeddingSignal ? 'embedding' : 'none',
		items: byEmbedding.map((p, i) => ({
			proposalId: p.id,
			freelancerProfileId: p.freelancerProfileId,
			displayName: p.freelancer?.displayName ?? p.freelancerNameSnapshot ?? 'Applicant',
			rank: i + 1,
			matchScore: null,
			similarity: similarityOf(p),
			strengths: [],
			risks: [],
			suggestedQuestions: []
		}))
	});

	// Only spend a Claude call when the flow is actually enabled; otherwise the
	// embedding fallback is the answer. Rate-limit only the eligible AI path.
	if (!(await isAiEnabled())) return fallback();
	checkRateLimit(caller.id, { flow: 'rank' });

	const project = await projectRepo.findProjectById(projectId);
	if (!project) return fallback();

	const out = await completeJSON({
		schema: proposalRankOutput,
		model: MODEL_DEFAULT,
		system: buildSystem(),
		messages: [{ role: 'user', content: buildUserMessage(project, byEmbedding, similarityOf) }]
	});

	// null only when the key was removed mid-request (already gated by isAiEnabled).
	// Degrade to the embedding order rather than erroring the panel.
	if (!out) return fallback();

	// Reconcile the model's ranking against the real candidate set (AI is
	// untrusted): keep only known profile ids, dedupe, then append any candidate
	// the model omitted (in embedding order) so every proposal appears once.
	const byProfile = new Map<string, ProposalForCompany>();
	for (const p of proposals) {
		if (p.freelancerProfileId) byProfile.set(p.freelancerProfileId, p);
	}

	const seen = new Set<string>();
	const ordered: { proposal: ProposalForCompany; ai: (typeof out.rankings)[number] | null }[] = [];
	for (const r of [...out.rankings].sort((a, b) => a.rank - b.rank)) {
		const proposal = byProfile.get(r.freelancerProfileId);
		if (!proposal || seen.has(r.freelancerProfileId)) continue;
		seen.add(r.freelancerProfileId);
		ordered.push({ proposal, ai: r });
	}
	for (const p of byEmbedding) {
		if (!p.freelancerProfileId || !seen.has(p.freelancerProfileId)) {
			ordered.push({ proposal: p, ai: null });
			if (p.freelancerProfileId) seen.add(p.freelancerProfileId);
		}
	}

	const items: ProposalRankedItem[] = ordered.map(({ proposal, ai }, i) => ({
		proposalId: proposal.id,
		freelancerProfileId: proposal.freelancerProfileId,
		displayName: proposal.freelancer?.displayName ?? proposal.freelancerNameSnapshot ?? 'Applicant',
		rank: i + 1,
		matchScore: ai?.matchScore ?? null,
		similarity: similarityOf(proposal),
		strengths: ai?.strengths ?? [],
		risks: ai?.risks ?? [],
		suggestedQuestions: ai?.suggestedQuestions ?? []
	}));

	return { rankedBy: 'ai', items };
}

function buildSystem(): string {
	return `You are helping a company choose the best freelancer for a PROJECT (a single contractor delivers a milestone plan). You are given the project brief and a list of applicants with their cover letters.

Rank the applicants from best to worst fit for THIS project's milestones and requirements.

Rules:
- Return one entry per applicant in "rankings", using each applicant's exact "freelancerProfileId" from the input. Do not invent ids.
- "rank" is 1 for the best fit, increasing for weaker fits; do not repeat a rank.
- "matchScore" is your holistic fit assessment from 0 to 100.
- "strengths" and "risks": short, concrete, specific to this project (not generic praise). 1–5 each.
- "suggestedQuestions": questions the company should ask this applicant before awarding, to de-risk the decision. 1–5.
- Base your judgement only on the provided brief and cover letters. Do not assume facts not given.`;
}

function buildUserMessage(
	project: projectRepo.ProjectForCompany,
	proposals: ProposalForCompany[],
	similarityOf: (p: ProposalForCompany) => number | null
): string {
	const skills = project.skills.map((s) => s.skill.name).join(', ');
	const milestones = project.milestones
		.map((m) => `  ${m.position}. ${m.title}${m.dueInDays ? ` (due in ${m.dueInDays}d)` : ''}`)
		.join('\n');

	const brief = [
		`PROJECT BRIEF`,
		`Title: ${project.title}`,
		`Description: ${stripHtml(project.description)}`,
		project.requirements ? `Requirements: ${stripHtml(project.requirements)}` : '',
		project.deliverables ? `Deliverables: ${stripHtml(project.deliverables)}` : '',
		skills ? `Skills: ${skills}` : '',
		milestones ? `Milestone plan:\n${milestones}` : ''
	]
		.filter(Boolean)
		.join('\n');

	const applicants = proposals
		.map((p, i) => {
			const f = p.freelancer;
			const sim = similarityOf(p);
			const skills = (f?.skills ?? [])
				.map((s) => {
					const yrs = s.yearsExperience != null ? `, ${s.yearsExperience}y` : '';
					return `${s.skill.name} (lvl ${s.proficiencyLevel}/5${yrs})`;
				})
				.join(', ');
			const lines = [
				`Applicant ${i + 1}`,
				`freelancerProfileId: ${p.freelancerProfileId ?? '(none)'}`,
				`name: ${f?.displayName ?? p.freelancerNameSnapshot ?? 'Applicant'}`,
				f?.headline ? `headline: ${f.headline}` : '',
				f?.experienceLevel ? `experienceLevel: ${f.experienceLevel}` : '',
				skills ? `skills: ${skills}` : '',
				p.proposedTimeline ? `proposedTimeline: ${p.proposedTimeline}` : '',
				sim != null ? `similarityHint: ${sim.toFixed(3)} (0–1 cosine, higher = closer)` : '',
				`coverLetter: ${stripHtml(p.coverLetter) || '(empty)'}`
			];
			return lines.filter(Boolean).join('\n');
		})
		.join('\n\n');

	return `${brief}\n\nAPPLICANTS (${proposals.length}):\n\n${applicants}`;
}
