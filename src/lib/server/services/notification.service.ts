import * as notificationRepo from '../repositories/notification.repo';
import * as userRepo from '../repositories/user.repo';
import * as pushRepo from '../repositories/pushSubscription.repo';
import { sendEmail, type Templates } from '../email/send';
import { sendPush } from '../push/send';
import { AppError } from '../http';
import type { AuthedUser } from '../auth-helpers';
import {
	notificationPrefsInput,
	EVENT_KEYS,
	type EventKey,
	type NotificationPrefsInput
} from '$lib/validators/notification-prefs';
import { pushSubscribeInput, pushUnsubscribeInput } from '$lib/validators/push';

export type EventType = EventKey;

// Structural assertion: keep the service's union in lockstep with the
// validator's tuple. If anyone adds a new event, both must change.
const _checkEventKeys: readonly EventType[] = EVENT_KEYS;
void _checkEventKeys;

/**
 * Events that route to push notifications. Per plan §8: urgent / time-sensitive
 * only. BOUNTY_DEADLINE_IMMINENT is deferred (no cron until Phase 9+).
 */
export const URGENT_PUSH_SET: ReadonlySet<EventType> = new Set([
	'SUBMISSION_SHORTLISTED',
	'WINNERS_ANNOUNCED',
	'PAYOUT_COMPLETED',
	'PAYOUT_FAILED'
]);

/**
 * Mapping from semantic event → email template name. Events without a
 * template entry are in-app only.
 */
const EMAIL_TEMPLATE_BY_EVENT: Partial<Record<EventType, keyof Templates>> = {
	SUBMISSION_RECEIVED: 'submission-received',
	SUBMISSION_SHORTLISTED: 'submission-shortlisted',
	WINNERS_ANNOUNCED: 'winners-announced',
	PAYOUT_COMPLETED: 'payout-completed',
	BOUNTY_CANCELLED: 'bounty-cancelled',
	BOUNTY_PUBLISHED: 'bounty-published',
	BOUNTY_FUNDED: 'bounty-funded',
	DISPUTE_RAISED: 'dispute-raised',
	DISPUTE_RESOLVED: 'dispute-resolved'
};

type DispatchPayload = {
	title: string;
	message?: string;
	link?: string;
	/**
	 * Template props. When present and the event has a mapping, the email is
	 * rendered + sent to the user's address. If absent (or no mapping exists),
	 * only the in-app row is created.
	 */
	email?: Record<string, unknown>;
};

function emailDefaultFor(event: EventType): boolean {
	return EMAIL_TEMPLATE_BY_EVENT[event] !== undefined;
}

function pushDefaultFor(event: EventType): boolean {
	return URGENT_PUSH_SET.has(event);
}

/**
 * Phase 6: writes a Notification row, sends a transactional email (Resend),
 * and fires a Web Push (web-push) for urgent events — all gated by the user's
 * NotificationPreference and the per-event template/channel registry.
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
		console.error('[notification.dispatch] in-app write failed', { userId, eventType, err });
	}

	let prefs: notificationRepo.NotificationChannelPrefs | null = null;
	try {
		prefs = await notificationRepo.getPreference(userId);
	} catch (err) {
		console.error('[notification.dispatch] prefs load failed — using defaults', {
			userId,
			eventType,
			err
		});
	}

	// Email branch.
	if (payload.email) {
		const template = EMAIL_TEMPLATE_BY_EVENT[eventType];
		if (template) {
			try {
				const emailOptIn = prefs?.email?.[eventType] ?? emailDefaultFor(eventType);
				if (emailOptIn) {
					const user = await userRepo.findById(userId);
					if (user?.email) {
						await sendEmail({
							to: user.email,
							template,
							props: payload.email as Templates[typeof template]
						});
					}
				}
			} catch (err) {
				console.error('[notification.dispatch] email failed', { userId, eventType, err });
			}
		}
	}

	// Push branch — urgent events only.
	if (URGENT_PUSH_SET.has(eventType)) {
		try {
			const pushOptIn = prefs?.push?.[eventType] ?? pushDefaultFor(eventType);
			if (pushOptIn) {
				await sendPush(userId, {
					title: payload.title,
					body: payload.message,
					url: payload.link ?? '/',
					tag: eventType
				});
			}
		} catch (err) {
			console.error('[notification.dispatch] push failed', { userId, eventType, err });
		}
	}
}

// ---------------------------------------------------------------------------
// Caller-scoped helpers used by API routes and the settings page.
// ---------------------------------------------------------------------------

export async function listForCaller(
	caller: AuthedUser,
	opts: { limit?: number; unreadOnly?: boolean } = {}
) {
	return notificationRepo.listForUser(caller.id, opts);
}

export async function markRead(caller: AuthedUser, id: string): Promise<void> {
	if (!id) throw new AppError('BAD_REQUEST', 'Notification id is required.');
	await notificationRepo.markRead(id, caller.id);
}

export async function updatePreferences(
	caller: AuthedUser,
	raw: unknown
): Promise<NotificationPrefsInput> {
	const parsed = notificationPrefsInput.parse(raw);
	const next: notificationRepo.NotificationChannelPrefs = {
		email: parsed.email ?? {},
		push: parsed.push ?? {}
	};
	const saved = await notificationRepo.upsertPreference(caller.id, next);
	return { email: saved.email ?? {}, push: saved.push ?? {} };
}

export async function savePushSubscription(caller: AuthedUser, raw: unknown): Promise<void> {
	const parsed = pushSubscribeInput.parse(raw);
	await pushRepo.upsertForUser({
		userId: caller.id,
		endpoint: parsed.endpoint,
		p256dh: parsed.keys.p256dh,
		auth: parsed.keys.auth,
		userAgent: parsed.userAgent ?? null
	});
}

export async function deletePushSubscription(caller: AuthedUser, raw: unknown): Promise<void> {
	const parsed = pushUnsubscribeInput.parse(raw);
	await pushRepo.deleteForUserAndEndpoint(caller.id, parsed.endpoint);
}

export async function listPushSubscriptionsForCaller(caller: AuthedUser) {
	return pushRepo.listForUser(caller.id);
}
