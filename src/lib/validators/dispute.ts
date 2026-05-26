import { z } from 'zod';

export const DISPUTE_STATUSES = ['OPEN', 'IN_REVIEW', 'RESOLVED'] as const;
export type DisputeStatus = (typeof DISPUTE_STATUSES)[number];

export const raiseDisputeInput = z.object({
	bountyId: z.string().min(1).max(64),
	submissionId: z.string().min(1).max(64).optional(),
	reason: z.string().trim().min(10).max(2000)
});

export const updateDisputeInput = z.object({
	status: z.enum(DISPUTE_STATUSES).optional(),
	resolution: z.string().trim().max(2000).optional()
});

export type RaiseDisputeInput = z.infer<typeof raiseDisputeInput>;
export type UpdateDisputeInput = z.infer<typeof updateDisputeInput>;
