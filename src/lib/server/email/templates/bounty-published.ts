export type BountyPublishedProps = {
	freelancerName: string;
	bountyTitle: string;
	bountyUrl: string;
	matchHint?: string | null;
};

export function bountyPublished({
	freelancerName,
	bountyTitle,
	bountyUrl,
	matchHint
}: BountyPublishedProps) {
	const subject = `New bounty matched to you: "${bountyTitle}"`;
	const hintLine = matchHint ? `Matches your skills: ${matchHint}.` : null;
	return {
		subject,
		text: `Hi ${freelancerName},

A new bounty is live on Learn2Earn that looks like a good fit:

${bountyTitle}
${bountyUrl}${hintLine ? `\n\n${hintLine}` : ''}

Open the bounty to review the brief and submit before the deadline.`,
		html: `<p>Hi ${escapeHtml(freelancerName)},</p>
<p>A new bounty is live on Learn2Earn that looks like a good fit:</p>
<p><strong>${escapeHtml(bountyTitle)}</strong><br />
<a href="${escapeHtml(bountyUrl)}" rel="noopener noreferrer">${escapeHtml(bountyUrl)}</a></p>
${hintLine ? `<p>${escapeHtml(hintLine)}</p>` : ''}
<p>Open the bounty to review the brief and submit before the deadline.</p>`
	};
}

function escapeHtml(s: string) {
	return s.replace(
		/[&<>"']/g,
		(c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
	);
}
