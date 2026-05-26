import { fromAddress, resend } from './client';
import { verifyEmail, type VerifyEmailProps } from './templates/verify-email';
import { resetPassword, type ResetPasswordProps } from './templates/reset-password';
import { inviteCompany, type InviteCompanyProps } from './templates/invite-company';
import { submissionReceived, type SubmissionReceivedProps } from './templates/submission-received';
import {
	submissionShortlisted,
	type SubmissionShortlistedProps
} from './templates/submission-shortlisted';
import { winnersAnnounced, type WinnersAnnouncedProps } from './templates/winners-announced';
import { payoutCompleted, type PayoutCompletedProps } from './templates/payout-completed';
import { bountyCancelled, type BountyCancelledProps } from './templates/bounty-cancelled';

export type Templates = {
	'verify-email': VerifyEmailProps;
	'reset-password': ResetPasswordProps;
	'invite-company': InviteCompanyProps;
	'submission-received': SubmissionReceivedProps;
	'submission-shortlisted': SubmissionShortlistedProps;
	'winners-announced': WinnersAnnouncedProps;
	'payout-completed': PayoutCompletedProps;
	'bounty-cancelled': BountyCancelledProps;
};

type SendInput<T extends keyof Templates> = {
	to: string;
	template: T;
	props: Templates[T];
};

const RENDERERS = {
	'verify-email': verifyEmail,
	'reset-password': resetPassword,
	'invite-company': inviteCompany,
	'submission-received': submissionReceived,
	'submission-shortlisted': submissionShortlisted,
	'winners-announced': winnersAnnounced,
	'payout-completed': payoutCompleted,
	'bounty-cancelled': bountyCancelled
} as const;

/**
 * Advisory email send. Never throws — failures are logged but do not block
 * the originating request (plan §7).
 *
 * If `RESEND_API_KEY` is unset (typical local dev), the rendered email is
 * logged to the console with its URL inside, which is what the Phase 1
 * verification checklist relies on for the verify-email and accept-invite
 * flows.
 */
export async function sendEmail<T extends keyof Templates>(input: SendInput<T>) {
	const render = RENDERERS[input.template] as (p: Templates[T]) => {
		subject: string;
		html: string;
		text: string;
	};
	const { subject, html, text } = render(input.props);

	if (!resend) {
		console.log('\n[email:dev-mode] (RESEND_API_KEY unset — not sending)');
		console.log(`  to:       ${input.to}`);
		console.log(`  template: ${input.template}`);
		console.log(`  subject:  ${subject}`);
		console.log(`  text:\n${text.replace(/^/gm, '    ')}\n`);
		return { ok: true, devMode: true } as const;
	}

	try {
		await resend.emails.send({ from: fromAddress, to: input.to, subject, html, text });
		return { ok: true, devMode: false } as const;
	} catch (err) {
		console.error('[email:send] resend failed:', err);
		return { ok: false, devMode: false, error: err } as const;
	}
}
