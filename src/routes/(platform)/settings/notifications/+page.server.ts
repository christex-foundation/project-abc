import { requireAuth } from '$lib/server/auth-helpers';
import * as notificationRepo from '$lib/server/repositories/notification.repo';
import * as pushRepo from '$lib/server/repositories/pushSubscription.repo';
import { URGENT_PUSH_SET } from '$lib/server/services/notification.service';
import { EVENT_KEYS } from '$lib/validators/notification-prefs';
import type { PageServerLoad } from './$types';

// Events surfaced in the UI as email-toggleable (these are the ones with
// templates wired in notification.service). Single source: the EVENT_KEYS
// tuple from the validator.
const EMAIL_EVENTS = [
	'SUBMISSION_RECEIVED',
	'SUBMISSION_SHORTLISTED',
	'WINNERS_ANNOUNCED',
	'PAYOUT_COMPLETED',
	'BOUNTY_CANCELLED',
	'BOUNTY_PUBLISHED',
	'BOUNTY_FUNDED'
] as const;

export const load: PageServerLoad = async ({ locals }) => {
	const caller = requireAuth(locals);
	const [prefs, subs] = await Promise.all([
		notificationRepo.getPreference(caller.id),
		pushRepo.listForUser(caller.id)
	]);
	return {
		prefs: prefs ?? { email: {}, push: {} },
		hasPush: subs.length > 0,
		deviceCount: subs.length,
		emailEvents: [...EMAIL_EVENTS],
		pushEvents: [...URGENT_PUSH_SET].filter((e) =>
			(EVENT_KEYS as readonly string[]).includes(e)
		)
	};
};
