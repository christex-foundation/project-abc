export type SubmissionShortlistedProps = {
	bountyTitle: string;
	bountyUrl: string;
	freelancerName: string;
};

export function submissionShortlisted({
	bountyTitle,
	bountyUrl,
	freelancerName
}: SubmissionShortlistedProps) {
	const subject = `You're shortlisted on "${bountyTitle}"`;
	return {
		subject,
		text: `Hi ${freelancerName},

Your submission to "${bountyTitle}" was shortlisted by the sponsor. Winners are announced once judging completes.

Bounty: ${bountyUrl}`,
		html: `<p>Hi ${escapeHtml(freelancerName)},</p>
<p>Your submission to <a href="${bountyUrl}">${escapeHtml(bountyTitle)}</a> was shortlisted by the sponsor. Winners are announced once judging completes.</p>`
	};
}

function escapeHtml(s: string) {
	return s.replace(
		/[&<>"']/g,
		(c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
	);
}
