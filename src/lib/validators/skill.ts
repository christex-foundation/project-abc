import { z } from 'zod';

export const skillListQuery = z.object({
	categoryId: z.string().optional()
});

export type SkillListQuery = z.infer<typeof skillListQuery>;
