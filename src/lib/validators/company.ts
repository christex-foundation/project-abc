import { z } from 'zod';

const optionalNullableString = (max: number) =>
	z
		.string()
		.max(max)
		.nullish()
		.transform((v) => (v == null ? null : v.trim() === '' ? null : v.trim()));

const optionalUrl = (max: number) =>
	z
		.string()
		.url()
		.max(max)
		.nullish()
		.transform((v) => (v == null || v === '' ? null : v));

export const updateCompanyProfileInput = z.object({
	companyName: z.string().min(1).max(120),
	description: optionalNullableString(5000),
	website: optionalUrl(500),
	logo: optionalUrl(500),
	industry: optionalNullableString(120),
	country: optionalNullableString(8)
});

export type UpdateCompanyProfileInput = z.infer<typeof updateCompanyProfileInput>;
