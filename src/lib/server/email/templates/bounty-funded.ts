export type BountyFundedProps = {
	bountyTitle: string;
	bountyUrl: string;
	totalPrizePool: number; // minor units
	currency: string;
};

function formatMoney(amount: number, currency: string): string {
	return `${currency} ${(amount / 100).toFixed(2)}`;
}

export function bountyFunded({
	bountyTitle,
	bountyUrl,
	totalPrizePool,
	currency
}: BountyFundedProps) {
	const amountStr = formatMoney(totalPrizePool, currency);
	const subject = `Escrow funded for "${bountyTitle}"`;
	return {
		subject,
		text: `Escrow for "${bountyTitle}" is now locked.

Amount in escrow: ${amountStr}

You can now publish the bounty to open it for submissions:
${bountyUrl}`,
		html: `<p>Escrow for <strong>${escapeHtml(bountyTitle)}</strong> is now locked.</p>
<p><strong>Amount in escrow:</strong> ${escapeHtml(amountStr)}</p>
<p>You can now publish the bounty to open it for submissions: <a href="${escapeHtml(bountyUrl)}" rel="noopener noreferrer">${escapeHtml(bountyUrl)}</a></p>`
	};
}

function escapeHtml(s: string) {
	return s.replace(
		/[&<>"']/g,
		(c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
	);
}
