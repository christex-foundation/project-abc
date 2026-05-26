import * as notificationRepo from '../repositories/notification.repo';
import * as userRepo from '../repositories/user.repo';
import { sendEmail, type Templates } from '../email/send';

export type EventType =
	| 'BOUNTY_FUNDED'
	| 'BOUNTY_CANCELLED'
	| 'BOUNTY_PUBLISHED'
	| 'SUBMISSION_RECEIVED'
	| 'SUBMISSION_SHORTLISTED'
	| 'WINNERS_ANNOUNCED'
	| 'PAYOUT_COMPLETED'
	| 'PAYOUT_FAILED';

/**
 * Mapping from semantic event → email template name. Events without a
 * template entry are in-app only.
 */
const EMAIL_TEMPLATE_BY_EVENT: Partial<Record<EventType, keyof Templates>> = {
	SUBMISSION_RECEIVED: 'submission-received',
	SUBMISSION_SHORTLISTED: 'submission-shortlisted',
	WINNERS_ANNOUNCED: 'winners-announced',
	PAYOUT_COMPLETED: 'payout-completed',
	BOUNTY_CANCELLED: 'bounty-cancelled'
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

/**
 * Per-channel preference defaults. Emails default ON for everything that has a
 * template mapping; push defaults OFF (Phase 6 wires it).
 */
function emailDefaultFor(event: EventType): boolean {
	return EMAIL_TEMPLATE_BY_EVENT[event] !== undefined;
}

/**
 * Phase 4: writes a Notification row and (when the event has an email
 * template + the user opted in) sends a transactional email via Resend.
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

	if (!payload.email) return;
	const template = EMAIL_TEMPLATE_BY_EVENT[eventType];
	if (!template) return;

	try {
		const prefs = await notificationRepo.getPreference(userId);
		const emailOptIn = prefs?.email?.[eventType] ?? emailDefaultFor(eventType);
		if (!emailOptIn) return;

		const user = await userRepo.findById(userId);
		if (!user?.email) return;

		await sendEmail({
			to: user.email,
			template,
			// Caller-supplied props; render is type-checked at the template boundary.
			props: payload.email as Templates[typeof template]
		});
	} catch (err) {
		console.error('[notification.dispatch] email failed', { userId, eventType, err });
	}
}
