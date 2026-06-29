export type ResetPasswordProps = { name: string; url: string };

export function resetPassword({ name, url }: ResetPasswordProps) {
	return {
		subject: 'Reset your Learn2Earn password',
		text: `Hi ${name},\n\nUse the link below to reset your password:\n${url}\n\nIf you didn't request a reset, you can ignore this email.`,
		html: `<p>Hi ${escapeHtml(name)},</p>
<p>Use the link below to reset your password:</p>
<p><a href="${url}">${url}</a></p>
<p style="color:#666;font-size:12px">If you didn't request a reset, you can ignore this email.</p>`
	};
}

function escapeHtml(s: string) {
	return s.replace(
		/[&<>"']/g,
		(c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
	);
}
