// Embedding-based recommendation service. Triggered on bounty publish and
// freelancer profile update; both call sites use a fire-and-forget pattern so
// OpenAI latency or downtime never blocks the primary mutation.

import { AppError } from '../http';
import { requireRole, type AuthedUser } from '../auth-helpers';
import { embedText, cosineSimilarity } from '../ai/embeddings';
import * as freelancerRepo from '../repositories/freelancer.repo';
import * as bountyRepo from '../repositories/bounty.repo';
import type { BountyForMatching } from '../repositories/bounty.repo';

function stripHtml(input: string | null | undefined): string {
	if (!input) return '';
	return input
		.replace(/<[^>]+>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

export type RecommendedBounty = {
	bounty: Omit<BountyForMatching, 'aiEmbedding'>;
	matchScore: number;
};

export async function recomputeFreelancerEmbedding(freelancerProfileId: string): Promise<void> {
	const profile = await freelancerRepo.findByIdWithSkills(freelancerProfileId);
	if (!profile) return;
	const skillNames = profile.skills.map((s) => s.skill.name).join(', ');
	const parts = [
		profile.displayName,
		profile.headline ?? '',
		profile.bio ?? '',
		profile.experienceLevel ? `Experience: ${profile.experienceLevel}` : '',
		skillNames ? `Skills: ${skillNames}` : ''
	].filter((p) => p.trim().length > 0);
	const prompt = parts.join('\n');
	const vec = await embedText(prompt);
	if (!vec) return;
	await freelancerRepo.setAiEmbedding(freelancerProfileId, vec);
}

export async function recomputeBountyEmbedding(bountyId: string): Promise<void> {
	const bounty = await bountyRepo.findForEmbedding(bountyId);
	if (!bounty) return;
	const skillNames = bounty.skills.map((s) => s.skill.name).join(', ');
	const parts = [
		bounty.title,
		stripHtml(bounty.description),
		stripHtml(bounty.requirements),
		stripHtml(bounty.deliverables),
		skillNames ? `Skills: ${skillNames}` : ''
	].filter((p) => p.trim().length > 0);
	const prompt = parts.join('\n');
	const vec = await embedText(prompt);
	if (!vec) return;
	await bountyRepo.setAiEmbedding(bountyId, vec);
}

/**
 * Top-N ACTIVE bounties for the calling freelancer, ranked by cosine
 * similarity. Returns an empty array when the freelancer has no embedding
 * yet (e.g. profile not completed), letting the UI prompt them to fill in
 * skills.
 */
export async function recommendBounties(
	caller: AuthedUser,
	limit = 50
): Promise<RecommendedBounty[]> {
	requireRole(caller, 'FREELANCER');
	const profile = await freelancerRepo.findByUserId(caller.id);
	if (!profile) {
		throw new AppError('CONFLICT', 'Freelancer profile not found for this account.');
	}
	if (!profile.aiEmbedding || profile.aiEmbedding.length === 0) return [];

	const bounties = await bountyRepo.listActiveForMatching();
	const scored: RecommendedBounty[] = [];
	for (const b of bounties) {
		if (!b.aiEmbedding || b.aiEmbedding.length === 0) continue;
		const score = cosineSimilarity(profile.aiEmbedding, b.aiEmbedding);
		// Strip the embedding from the response — no value to the client, just bytes.
		const { aiEmbedding: _drop, ...rest } = b;
		scored.push({ bounty: rest, matchScore: score });
	}
	scored.sort((a, b) => b.matchScore - a.matchScore);
	return scored.slice(0, limit);
}
