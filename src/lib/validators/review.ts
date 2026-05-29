import { z } from 'zod';

export const createReviewInput = z.object({
	rating: z.number().int().min(1).max(5),
	comment: z.string().max(5000).nullish()
});

export type CreateReviewInput = z.infer<typeof createReviewInput>;
