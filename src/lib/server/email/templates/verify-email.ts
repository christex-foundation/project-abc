export type VerifyEmailProps = { name: string; url: string };

export function verifyEmail({ name, url }: VerifyEmailProps) {
	return {
		subject: 'Verify your Learn2Earn account',
		text: `Hi ${name},\n\nClick the link below to verify your email:\n${url}\n\nIf you didn't sign up for Learn2Earn, you can ignore this email.`,
		html: `<p>Hi ${escapeHtml(name)},</p>
<p>Click the link below to verify your email:</p>
<p><a href="${url}">${url}</a></p>
<p style="color:#666;font-size:12px">If you didn't sign up for Learn2Earn, you can ignore this email.</p>`
	};
}

function escapeHtml(s: string) {
	return s.replace(
		/[&<>"']/g,
		(c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
	);
}
