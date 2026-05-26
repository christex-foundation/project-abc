export type InviteCompanyProps = { email: string; companyName?: string | null; url: string };

export function inviteCompany({ email, companyName, url }: InviteCompanyProps) {
	const subject = "You've been invited to FOW";
	const greeting = companyName
		? `Hi from FOW — your company "${companyName}" has been invited.`
		: 'Hi from FOW — you have been invited.';
	return {
		subject,
		text: `${greeting}\n\nSet your password and complete onboarding here:\n${url}\n\nIf you weren't expecting this email, you can ignore it.`,
		html: `<p>${escapeHtml(greeting)}</p>
<p>You've been invited to join FOW as a company at <strong>${escapeHtml(email)}</strong>.</p>
<p>Set your password and complete onboarding by clicking the link below:</p>
<p><a href="${url}">${url}</a></p>
<p style="color:#666;font-size:12px">If you weren't expecting this email, you can ignore it.</p>`
	};
}

function escapeHtml(s: string) {
	return s.replace(
		/[&<>"']/g,
		(c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
	);
}
