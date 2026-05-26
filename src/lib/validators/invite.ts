import { z } from 'zod';

export const createCompanyInviteSchema = z.object({
	email: z.string().email(),
	companyName: z.string().min(1).max(120).optional(),
	name: z.string().min(1).max(120).optional()
});

export type CreateCompanyInviteInput = z.infer<typeof createCompanyInviteSchema>;
