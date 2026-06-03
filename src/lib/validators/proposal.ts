import { z } from 'zod';

/**
 * A proposal is a freelancer's application to a project. Milestones are defined
 * by the COMPANY on the project (fixed price), so a proposal is just a pitch:
 * a cover letter + an optional timeline note.
 */
export const createProposalInput = z.object({
	coverLetter: z.string().min(1).max(20_000),
	proposedTimeline: z.string().max(200).nullish()
});

export type CreateProposalInput = z.infer<typeof createProposalInput>;

/**
 * Coach-drafted cover letters are skeletons with bracketed placeholders the
 * freelancer must personalise ([YOUR NAME], [PLATFORM], [DATE — …], …). The apply
 * form uses this to block submission until they're all replaced. Returns the
 * unique placeholders still present (empty = ready to send).
 */
const PLACEHOLDER_RE = /\[[^\]\n]+\]/g;
export function findCoverLetterPlaceholders(html: string): string[] {
	const text = html.replace(/<[^>]+>/g, ' '); // brackets aren't HTML-escaped; drop tags first
	return [...new Set((text.match(PLACEHOLDER_RE) ?? []).map((s) => s.trim()))];
}
