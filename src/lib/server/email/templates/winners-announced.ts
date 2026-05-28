export type WinnersAnnouncedProps = {
	bountyTitle: string;
	bountyUrl: string;
	freelancerName: string;
	isWinner: boolean;
	position?: number | null;
	amount?: number | null; // minor units
	currency?: string;
};

function formatMoney(amount: number, currency: string): string {
	// Minor → major units. SLE has 2 decimals like most fiat currencies.
	return `${currency} ${(amount / 100).toFixed(2)}`;
}

function positionLabel(position: number | null | undefined): string {
	if (position == null) return '';
	if (position === 99) return 'bonus prize';
	if (position === 1) return '1st place';
	if (position === 2) return '2nd place';
	if (position === 3) return '3rd place';
	return `position ${position}`;
}

export function winnersAnnounced({
	bountyTitle,
	bountyUrl,
	freelancerName,
	isWinner,
	position,
	amount,
	currency
}: WinnersAnnouncedProps) {
	if (isWinner) {
		const amountStr = amount != null && currency ? formatMoney(amount, currency) : '';
		const subject = `You won on "${bountyTitle}"!`;
		const place = positionLabel(position);
		return {
			subject,
			text: `Congratulations ${freelancerName} — you won ${place ? `${place} ` : ''}on "${bountyTitle}".${
				amountStr ? `\n\nPrize: ${amountStr}` : ''
			}\nPayout is being deposited to your wallet.\n\nBounty: ${bountyUrl}`,
			html: `<p>Congratulations ${escapeHtml(freelancerName)} — you won${place ? ` <strong>${escapeHtml(place)}</strong>` : ''} on <a href="${bountyUrl}">${escapeHtml(bountyTitle)}</a>.</p>
${amountStr ? `<p><strong>Prize:</strong> ${escapeHtml(amountStr)}</p>` : ''}
<p>Payout is being deposited to your wallet.</p>`
		};
	}

	const subject = `Winners announced for "${bountyTitle}"`;
	return {
		subject,
		text: `Hi ${freelancerName},

The sponsor has announced winners for "${bountyTitle}" and your submission was not selected this time. Thank you for taking the time to submit — keep an eye on the platform for new bounties that match your skills.

Bounty: ${bountyUrl}`,
		html: `<p>Hi ${escapeHtml(freelancerName)},</p>
<p>The sponsor has announced winners for <a href="${bountyUrl}">${escapeHtml(bountyTitle)}</a> and your submission was not selected this time. Thank you for taking the time to submit — keep an eye on the platform for new bounties that match your skills.</p>`
	};
}

function escapeHtml(s: string) {
	return s.replace(
		/[&<>"']/g,
		(c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
	);
}
