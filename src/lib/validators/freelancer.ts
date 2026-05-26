import { z } from 'zod';

const optionalNullableString = (max: number) =>
	z
		.string()
		.max(max)
		.nullish()
		.transform((v) => (v == null ? null : v.trim() === '' ? null : v.trim()));

export const freelancerSkillInput = z.object({
	skillId: z.string().min(1),
	proficiencyLevel: z.number().int().min(1).max(5),
	yearsExperience: z.number().int().min(0).max(60).nullish()
});

export const updateFreelancerProfileInput = z.object({
	displayName: z.string().min(1).max(120).optional(),
	headline: optionalNullableString(200),
	bio: optionalNullableString(5000),
	portfolio: z
		.string()
		.url()
		.max(500)
		.nullish()
		.transform((v) => (v == null || v === '' ? null : v)),
	experienceLevel: optionalNullableString(40),
	momoNumber: optionalNullableString(40),
	whatsappNumber: optionalNullableString(40),
	skills: z.array(freelancerSkillInput).max(50).default([])
});

export type UpdateFreelancerProfileInput = z.infer<typeof updateFreelancerProfileInput>;
export type FreelancerSkillInput = z.infer<typeof freelancerSkillInput>;
