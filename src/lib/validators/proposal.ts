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
