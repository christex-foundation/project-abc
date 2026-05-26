export type SubmissionReceivedProps = {
	bountyTitle: string;
	bountyUrl: string;
	submitterName: string;
	submitterEmail: string;
	manageUrl: string;
};

export function submissionReceived({
	bountyTitle,
	bountyUrl,
	submitterName,
	submitterEmail,
	manageUrl
}: SubmissionReceivedProps) {
	const subject = `New submission on "${bountyTitle}"`;
	return {
		subject,
		text: `${submitterName} (${submitterEmail}) submitted to your bounty "${bountyTitle}".

Bounty: ${bountyUrl}
Review submissions: ${manageUrl}`,
		html: `<p><strong>${escapeHtml(submitterName)}</strong> (${escapeHtml(submitterEmail)}) submitted to your bounty <a href="${bountyUrl}">${escapeHtml(bountyTitle)}</a>.</p>
<p><a href="${manageUrl}">Review submissions</a></p>`
	};
}

function escapeHtml(s: string) {
	return s.replace(
		/[&<>"']/g,
		(c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
	);
}
