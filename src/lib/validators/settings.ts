import { z } from 'zod';

export const updateSettingSchema = z.object({
	key: z.string().min(1).max(120),
	value: z.unknown()
});

export const companySelfRegisterValue = z.object({ enabled: z.boolean() });

const optionalUrl = z
	.string()
	.trim()
	.url('Must be a valid URL.')
	.max(500)
	.or(z.literal(''))
	.optional();

export const socialLinksValue = z.object({
	twitter: optionalUrl,
	linkedin: optionalUrl,
	facebook: optionalUrl,
	instagram: optionalUrl,
	youtube: optionalUrl,
	discord: optionalUrl,
	whatsapp: optionalUrl
});

export const legalLinksValue = z.object({
	termsUrl: optionalUrl,
	privacyUrl: optionalUrl,
	refundUrl: optionalUrl,
	aboutUrl: optionalUrl
});

export const featureFlagsValue = z.object({
	maintenanceMode: z.boolean().default(false),
	maintenanceMessage: z.string().max(300).default(''),
	signupDisabled: z.boolean().default(false),
	bountyCreationDisabled: z.boolean().default(false),
	paymentsPaused: z.boolean().default(false)
});

// Toggles the AI assist experiment (see src/lib/server/ai/ai-flag.ts). Off by
// default; also requires ANTHROPIC_API_KEY to be set for AI to actually run.
export const aiAssistEnabledValue = z.object({ enabled: z.boolean().default(false) });

export type UpdateSettingInput = z.infer<typeof updateSettingSchema>;
export type CompanySelfRegisterValue = z.infer<typeof companySelfRegisterValue>;
export type SocialLinksValue = z.infer<typeof socialLinksValue>;
export type LegalLinksValue = z.infer<typeof legalLinksValue>;
export type FeatureFlagsValue = z.infer<typeof featureFlagsValue>;
export type AiAssistEnabledValue = z.infer<typeof aiAssistEnabledValue>;
