import { z } from 'zod';
import {
	PROVINCE_VALUES,
	DISTRICT_VALUES,
	districtBelongsToProvince,
	type District
} from '$lib/constants/geo';

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

// Treat '' as "cleared" so the profile form can submit empty selects as null.
const provinceField = z
	.enum(PROVINCE_VALUES)
	.or(z.literal(''))
	.nullish()
	.transform((v) => (v == null || v === '' ? null : v));
const districtField = z
	.enum(DISTRICT_VALUES)
	.or(z.literal(''))
	.nullish()
	.transform((v) => (v == null || v === '' ? null : v));

export const updateFreelancerProfileInput = z
	.object({
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
		whatsappNumber: optionalNullableString(40),
		province: provinceField,
		district: districtField,
		skills: z.array(freelancerSkillInput).max(50).default([])
	})
	.superRefine((data, ctx) => {
		// A district is meaningless without its province, and must belong to it.
		if (data.district && !data.province) {
			ctx.addIssue({
				code: 'custom',
				path: ['district'],
				message: 'Select a province before choosing a district.'
			});
		} else if (
			data.district &&
			data.province &&
			!districtBelongsToProvince(data.district as District, data.province)
		) {
			ctx.addIssue({
				code: 'custom',
				path: ['district'],
				message: 'District does not belong to the selected province.'
			});
		}
	});

export type UpdateFreelancerProfileInput = z.infer<typeof updateFreelancerProfileInput>;
export type FreelancerSkillInput = z.infer<typeof freelancerSkillInput>;
