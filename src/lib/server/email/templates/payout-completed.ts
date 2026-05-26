export type PayoutCompletedProps = {
	bountyTitle: string;
	amount: number; // minor units
	currency: string;
	tranche?: number | null;
	totalTranches?: number | null;
};

function formatMoney(amount: number, currency: string): string {
	return `${currency} ${(amount / 100).toFixed(2)}`;
}

export function payoutCompleted({
	bountyTitle,
	amount,
	currency,
	tranche,
	totalTranches
}: PayoutCompletedProps) {
	const amountStr = formatMoney(amount, currency);
	const trancheBit =
		tranche != null && totalTranches != null ? ` (tranche ${tranche} of ${totalTranches})` : '';
	const subject = `Your prize has been paid — ${amountStr}`;
	return {
		subject,
		text: `Your payout for "${bountyTitle}" has settled${trancheBit}.

Amount: ${amountStr}

Check your MoMo wallet for the transfer.`,
		html: `<p>Your payout for <strong>${escapeHtml(bountyTitle)}</strong> has settled${escapeHtml(trancheBit)}.</p>
<p><strong>Amount:</strong> ${escapeHtml(amountStr)}</p>
<p>Check your MoMo wallet for the transfer.</p>`
	};
}

function escapeHtml(s: string) {
	return s.replace(
		/[&<>"']/g,
		(c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
	);
}
