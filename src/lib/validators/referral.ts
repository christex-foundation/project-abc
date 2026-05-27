import { z } from 'zod';

/**
 * Setting block: `FREELANCER_REFERRAL_SYSTEM`. Disabled by default — the entire
 * referral loop is a no-op until an admin flips this on, and the underlying
 * credit system must also be enabled (referrals award credits).
 */
export const freelancerReferralSystemValue = z.object({
	enabled: z.boolean(),
	maxReferrals: z.number().int().min(0).max(1000),
	creditsPerFirstSubmission: z.number().int().min(0).max(100),
	creditsPerWin: z.number().int().min(0).max(100)
});
export type FreelancerReferralSystemValue = z.infer<typeof freelancerReferralSystemValue>;

/**
 * Code format we hand to referrers: 8-char uppercase alphanumeric, ambiguous
 * characters removed. Used on the signup form (`?ref=` query param).
 */
export const referralCodeSchema = z
	.string()
	.trim()
	.transform((s) => s.toUpperCase())
	.pipe(z.string().regex(/^[A-HJ-NP-Z2-9]{8}$/, 'Invalid referral code.'));
