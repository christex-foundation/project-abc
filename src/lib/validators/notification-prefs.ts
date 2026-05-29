import { z } from 'zod';

/**
 * Single source of truth for event identifiers. Kept in this validator so the
 * client form and the API both consume the same literal tuple. The service
 * asserts structural equivalence with its `EventType` union (see
 * `notification.service.ts`).
 */
export const EVENT_KEYS = [
	'BOUNTY_FUNDED',
	'BOUNTY_CANCELLED',
	'BOUNTY_PUBLISHED',
	'SUBMISSION_RECEIVED',
	'SUBMISSION_SHORTLISTED',
	'WINNERS_ANNOUNCED',
	'PAYOUT_COMPLETED',
	'PAYOUT_FAILED',
	'DISPUTE_RAISED',
	'DISPUTE_RESOLVED',
	// Project domain
	'PROJECT_PUBLISHED',
	'PROPOSAL_RECEIVED',
	'PROPOSAL_AWARDED',
	'PROPOSAL_REJECTED',
	'PROJECT_FUNDED',
	'MILESTONE_SUBMITTED',
	'MILESTONE_APPROVED',
	'MILESTONE_CHANGES_REQUESTED',
	'MILESTONE_PAYOUT_COMPLETED',
	'MILESTONE_COMMENT_ADDED',
	'PROJECT_COMPLETED',
	'PROJECT_CANCELLED',
	'REVIEW_RECEIVED'
] as const;

export type EventKey = (typeof EVENT_KEYS)[number];

const channelMap = z.record(z.enum(EVENT_KEYS), z.boolean()).optional();

export const notificationPrefsInput = z.object({
	email: channelMap,
	push: channelMap
});

export type NotificationPrefsInput = z.infer<typeof notificationPrefsInput>;
