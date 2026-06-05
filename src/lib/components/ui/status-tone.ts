export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'accent';

const STATUS_TONE: Record<string, StatusTone> = {
	// BountyStatus
	DRAFT: 'neutral',
	FUNDED: 'info',
	ACTIVE: 'accent',
	JUDGING: 'warning',
	COMPLETED: 'success',
	CANCELLED: 'danger',
	// PaymentStatus
	PENDING: 'warning',
	PROCESSING: 'info',
	FAILED: 'danger',
	// DisputeStatus
	OPEN: 'warning',
	IN_REVIEW: 'info',
	RESOLVED: 'success',
	// SubmissionStatus / SubmissionLabel
	APPROVED: 'success',
	REJECTED: 'danger',
	UNREVIEWED: 'neutral',
	REVIEWED: 'info',
	SHORTLISTED: 'accent',
	SPAM: 'danger',
	LOW_QUALITY: 'warning',
	MID_QUALITY: 'info',
	HIGH_QUALITY: 'success',
	// InviteStatus
	ACCEPTED: 'success',
	REVOKED: 'danger',
	// UserRole
	ADMIN: 'accent',
	COMPANY: 'info',
	FREELANCER: 'neutral',
	// BountyType
	BOUNTY: 'accent',
	PROJECT: 'info',
	// Boolean-ish
	Active: 'success',
	Deactivated: 'danger'
};

export function toneFor(value: string): StatusTone {
	return STATUS_TONE[value] ?? 'neutral';
}

export const TONE_CLASSES: Record<StatusTone, string> = {
	neutral: 'bg-paper text-ink-soft ring-bone',
	info: 'bg-bone text-ink ring-ink/15',
	success: 'bg-forest-soft text-forest ring-forest/20',
	warning: 'bg-ochre-soft text-clay ring-ochre/30',
	danger: 'bg-red-50 text-red-700 ring-red-200',
	accent: 'bg-terracotta-soft text-terracotta ring-terracotta/30'
};
