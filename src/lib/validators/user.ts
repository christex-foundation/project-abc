import { z } from 'zod';

export const registerFreelancerSchema = z.object({
	email: z.string().email(),
	password: z.string().min(8).regex(/\d/, 'Must contain a digit.'),
	name: z.string().min(1).max(120),
	// Optional referral code captured from `?ref=` on the signup URL. We accept
	// any non-empty string here and let referral.service validate the format —
	// a bad code must not block signup.
	referralCode: z
		.string()
		.trim()
		.max(64)
		.optional()
		.transform((v) => (v && v.length > 0 ? v : undefined))
});

export const registerCompanySchema = z.object({
	email: z.string().email(),
	password: z.string().min(8).regex(/\d/, 'Must contain a digit.'),
	name: z.string().min(1).max(120),
	companyName: z.string().min(1).max(120)
});

export type RegisterFreelancerInput = z.infer<typeof registerFreelancerSchema>;
export type RegisterCompanyInput = z.infer<typeof registerCompanySchema>;
