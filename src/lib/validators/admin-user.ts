import { z } from 'zod';

export const USER_ROLES = ['COMPANY', 'FREELANCER', 'ADMIN'] as const;

export const adminUpdateUserInput = z.object({
	role: z.enum(USER_ROLES).optional(),
	isActive: z.boolean().optional()
});

export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserInput>;
