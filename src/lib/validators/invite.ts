import { z } from 'zod';

export const createCompanyInviteSchema = z.object({
	email: z.string().email(),
	companyName: z.string().min(1).max(120).optional(),
	name: z.string().min(1).max(120).optional()
});

export type CreateCompanyInviteInput = z.infer<typeof createCompanyInviteSchema>;

export const createAdminInviteSchema = z.object({
	email: z.string().email(),
	name: z.string().min(1).max(120).optional()
});

export type CreateAdminInviteInput = z.infer<typeof createAdminInviteSchema>;
