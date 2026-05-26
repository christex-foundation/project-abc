export type BountyCancelledProps = {
	bountyTitle: string;
	refundedAmount?: number | null; // minor units (only set for sponsor variant)
	currency?: string;
	isSubmitter: boolean;
};

function formatMoney(amount: number, currency: string): string {
	return `${currency} ${(amount / 100).toFixed(2)}`;
}

export function bountyCancelled({
	bountyTitle,
	refundedAmount,
	currency,
	isSubmitter
}: BountyCancelledProps) {
	const subject = `"${bountyTitle}" has been cancelled`;

	if (isSubmitter) {
		return {
			subject,
			text: `The bounty "${bountyTitle}" was cancelled by the sponsor. Your submission will not be reviewed.

Thank you for participating — we'll keep matching you to new bounties as they're posted.`,
			html: `<p>The bounty <strong>${escapeHtml(bountyTitle)}</strong> was cancelled by the sponsor. Your submission will not be reviewed.</p>
<p>Thank you for participating — we'll keep matching you to new bounties as they're posted.</p>`
		};
	}

	const refundStr =
		refundedAmount != null && currency ? formatMoney(refundedAmount, currency) : null;
	return {
		subject,
		text: `Your bounty "${bountyTitle}" has been cancelled.${
			refundStr ? `\n\nRefund of ${refundStr} is on its way to your MoMo.` : ''
		}`,
		html: `<p>Your bounty <strong>${escapeHtml(bountyTitle)}</strong> has been cancelled.</p>
${refundStr ? `<p>Refund of <strong>${escapeHtml(refundStr)}</strong> is on its way to your MoMo.</p>` : ''}`
	};
}

function escapeHtml(s: string) {
	return s.replace(
		/[&<>"']/g,
		(c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
	);
}
