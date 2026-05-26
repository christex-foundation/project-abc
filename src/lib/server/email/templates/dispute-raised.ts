export type DisputeRaisedProps = {
	bountyTitle: string;
	raisedByName: string;
	raisedByEmail: string;
	reasonExcerpt: string;
	disputeUrl: string;
};

export function disputeRaised({
	bountyTitle,
	raisedByName,
	raisedByEmail,
	reasonExcerpt,
	disputeUrl
}: DisputeRaisedProps) {
	const subject = `Dispute raised on "${bountyTitle}"`;
	const text = `${raisedByName} (${raisedByEmail}) raised a dispute on "${bountyTitle}".

Reason: ${reasonExcerpt}

Review: ${disputeUrl}`;
	const html = `<p><strong>${escapeHtml(raisedByName)}</strong> (${escapeHtml(raisedByEmail)}) raised a dispute on <strong>${escapeHtml(bountyTitle)}</strong>.</p>
<p><em>Reason:</em> ${escapeHtml(reasonExcerpt)}</p>
<p><a href="${escapeHtml(disputeUrl)}">Open in admin</a></p>`;
	return { subject, text, html };
}

function escapeHtml(s: string) {
	return s.replace(
		/[&<>"']/g,
		(c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
	);
}
