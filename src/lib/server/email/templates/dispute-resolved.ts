export type DisputeResolvedProps = {
	bountyTitle: string;
	resolution: string;
};

export function disputeResolved({ bountyTitle, resolution }: DisputeResolvedProps) {
	const subject = `Your dispute on "${bountyTitle}" has been resolved`;
	const text = `An admin has resolved your dispute on "${bountyTitle}".

Resolution: ${resolution}`;
	const html = `<p>An admin has resolved your dispute on <strong>${escapeHtml(bountyTitle)}</strong>.</p>
<p><em>Resolution:</em> ${escapeHtml(resolution)}</p>`;
	return { subject, text, html };
}

function escapeHtml(s: string) {
	return s.replace(
		/[&<>"']/g,
		(c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
	);
}
