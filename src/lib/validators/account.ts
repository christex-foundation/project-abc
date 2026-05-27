import { z } from 'zod';

// Self-serve deletion. The literal `DELETE` confirmation is the canonical
// typed-confirmation pattern; `password` is optional because OAuth-only users
// don't have one to re-enter (skipped server-side in those cases).
export const deleteAccountInput = z.object({
	confirm: z.literal('DELETE'),
	password: z.string().min(1).optional()
});
export type DeleteAccountInput = z.infer<typeof deleteAccountInput>;

// Admin-triggered deletion. Reason is mandatory for the audit log.
export const adminConfirmDeleteInput = z.object({
	confirm: z.literal('DELETE'),
	reason: z.string().min(3).max(500)
});
export type AdminConfirmDeleteInput = z.infer<typeof adminConfirmDeleteInput>;
