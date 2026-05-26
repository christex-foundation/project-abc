import { pushEnabled, webpush, type PushPayload } from './client';
import * as pushRepo from '../repositories/pushSubscription.repo';

/**
 * Fan out a push payload to every device the user has subscribed. Advisory —
 * never throws to the caller; per-device failures are logged. On a 404/410
 * (subscription is gone), prune the row so we don't keep retrying.
 */
export async function sendPush(userId: string, payload: PushPayload): Promise<void> {
	if (!pushEnabled) return;
	let subs;
	try {
		subs = await pushRepo.listForUser(userId);
	} catch (err) {
		console.error('[push.send] list subscriptions failed', { userId, err });
		return;
	}
	if (subs.length === 0) return;

	const body = JSON.stringify(payload);
	await Promise.allSettled(
		subs.map(async (s) => {
			try {
				await webpush.sendNotification(
					{ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
					body
				);
			} catch (err: unknown) {
				const status = (err as { statusCode?: number })?.statusCode;
				if (status === 404 || status === 410) {
					await pushRepo.deleteByEndpoint(s.endpoint).catch(() => {});
					return;
				}
				console.error('[push.send] failed', {
					endpoint: s.endpoint.slice(0, 60),
					status,
					err
				});
			}
		})
	);
}
