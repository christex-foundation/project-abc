import { z } from 'zod';

export const freelancerCreditSystemValue = z.object({
	enabled: z.boolean(),
	monthlyAllocation: z.number().int().min(0).max(100)
});
export type FreelancerCreditSystemValue = z.infer<typeof freelancerCreditSystemValue>;

export const creditAdjustInput = z.object({
	delta: z
		.number()
		.int()
		.refine((n) => n !== 0, 'delta must be non-zero'),
	notes: z.string().trim().min(1, 'A reason is required').max(500)
});
export type CreditAdjustInput = z.infer<typeof creditAdjustInput>;

export const creditListQuery = z.object({
	limit: z.coerce.number().int().min(1).max(100).default(20),
	cursor: z.string().optional()
});
export type CreditListQuery = z.infer<typeof creditListQuery>;
