import { z } from 'zod';

// Self-serve deletion. The literal `DELETE` confirmation is the canonical
// typed-confirmation pattern; `password` is optional because OAuth-only users
// don't have one to re-enter (skipped server-side in those cases).
export const deleteAccountInput = z.object({
	confirm: z.literal('DELETE'),
	password: z.string().min(1).optional()
});
export type DeleteAccountInput = z.infer<typeof deleteAccountInput>;

// Self-serve password change for logged-in users. Mirrors the registration
// password rule (>=8 chars, >=1 digit — also enforced server-side by the
// Better Auth `before` hook on the /change-password path). `confirmPassword`
// guards against typos before the network call.
export const changePasswordInput = z
	.object({
		currentPassword: z.string().min(1, 'Enter your current password.'),
		newPassword: z.string().min(8).regex(/\d/, 'Must contain a digit.'),
		confirmPassword: z.string()
	})
	.refine((d) => d.newPassword === d.confirmPassword, {
		message: "Passwords don't match.",
		path: ['confirmPassword']
	});
export type ChangePasswordInput = z.infer<typeof changePasswordInput>;

// Admin-triggered deletion. Reason is mandatory for the audit log.
export const adminConfirmDeleteInput = z.object({
	confirm: z.literal('DELETE'),
	reason: z.string().min(3).max(500)
});
export type AdminConfirmDeleteInput = z.infer<typeof adminConfirmDeleteInput>;
