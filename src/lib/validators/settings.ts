import { z } from 'zod';

export const updateSettingSchema = z.object({
	key: z.string().min(1).max(120),
	value: z.unknown()
});

export const companySelfRegisterValue = z.object({ enabled: z.boolean() });

export type UpdateSettingInput = z.infer<typeof updateSettingSchema>;
export type CompanySelfRegisterValue = z.infer<typeof companySelfRegisterValue>;
