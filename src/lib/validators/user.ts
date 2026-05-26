import { z } from 'zod';

export const registerFreelancerSchema = z.object({
	email: z.string().email(),
	password: z.string().min(8).regex(/\d/, 'Must contain a digit.'),
	name: z.string().min(1).max(120)
});

export const registerCompanySchema = z.object({
	email: z.string().email(),
	password: z.string().min(8).regex(/\d/, 'Must contain a digit.'),
	name: z.string().min(1).max(120),
	companyName: z.string().min(1).max(120)
});

export type RegisterFreelancerInput = z.infer<typeof registerFreelancerSchema>;
export type RegisterCompanyInput = z.infer<typeof registerCompanySchema>;
