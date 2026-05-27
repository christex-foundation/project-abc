import { z } from 'zod';

export const proofOfWorkInput = z.object({
	title: z
		.string()
		.min(1, 'Title is required')
		.max(120)
		.transform((s) => s.trim()),
	description: z
		.string()
		.min(1, 'Description is required')
		.max(180, 'Description must be 180 characters or less')
		.transform((s) => s.trim()),
	link: z.string().url('Link must be a valid URL').max(500),
	// ≥1 top-level and ≥1 sub-skill is enforced in the service after lookup;
	// the min(2) here is a cheap lower bound.
	skillIds: z.array(z.string().min(1)).min(2).max(20)
});

export type ProofOfWorkInput = z.infer<typeof proofOfWorkInput>;
