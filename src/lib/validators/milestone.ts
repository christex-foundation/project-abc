import { z } from 'zod';

/**
 * Deliverables are LINKS ONLY (house rule: no uploads). Each entry is a labelled
 * URL the contractor pastes (GitHub commit, Drive doc, Postman collection, …).
 */
export const deliverableLinkSchema = z.object({
	label: z.string().min(1).max(120),
	url: z.string().url().max(2000)
});

/**
 * Posting an update IS the milestone approval request — it flips the milestone
 * to IN_REVIEW. So an update must carry at least one deliverable link.
 */
export const postUpdateInput = z.object({
	note: z.string().min(1).max(20_000),
	deliverables: z.array(deliverableLinkSchema).min(1).max(20)
});

export const addCommentInput = z.object({
	body: z.string().min(1).max(10_000)
});

export const requestChangesInput = z.object({
	comment: z.string().max(10_000).optional()
});

export type PostUpdateInput = z.infer<typeof postUpdateInput>;
export type AddCommentInput = z.infer<typeof addCommentInput>;
export type RequestChangesInput = z.infer<typeof requestChangesInput>;
export type DeliverableLink = z.infer<typeof deliverableLinkSchema>;
