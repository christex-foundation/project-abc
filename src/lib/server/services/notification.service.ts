import * as notificationRepo from '../repositories/notification.repo';

export type EventType = 'BOUNTY_FUNDED' | 'BOUNTY_CANCELLED' | 'PAYOUT_COMPLETED' | 'PAYOUT_FAILED';

type DispatchPayload = {
	title: string;
	message?: string;
	link?: string;
};

/**
 * Phase 3 stub: writes a Notification row for the in-app feed only.
 * Email + push fan-out lands in Phase 4/6.
 *
 * Never throws — notifications are advisory; a downstream failure must not
 * roll back the business transaction that triggered the dispatch.
 */
export async function dispatch(
	userId: string,
	eventType: EventType,
	payload: DispatchPayload
): Promise<void> {
	try {
		await notificationRepo.create({
			userId,
			eventType,
			title: payload.title,
			message: payload.message ?? null,
			link: payload.link ?? null
		});
	} catch (err) {
		console.error('[notification.dispatch] failed', { userId, eventType, err });
	}
}
