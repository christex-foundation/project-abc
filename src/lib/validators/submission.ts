import { z } from 'zod';
import { SubmissionLabel } from '@prisma/client';

const ALLOWED_LABELS = [
	SubmissionLabel.UNREVIEWED,
	SubmissionLabel.REVIEWED,
	SubmissionLabel.SHORTLISTED,
	SubmissionLabel.SPAM,
	SubmissionLabel.LOW_QUALITY,
	SubmissionLabel.MID_QUALITY,
	SubmissionLabel.HIGH_QUALITY
] as const;

export const submissionLabel = z.enum(ALLOWED_LABELS);

const eligibilityAnswer = z.object({
	question: z.string().min(1).max(500),
	answer: z.string().max(5_000)
});

export const createSubmissionInput = z.object({
	link: z.string().url().max(2_000),
	tweet: z.string().url().max(2_000).nullish(),
	otherInfo: z.string().max(50_000).nullish(),
	ask: z.number().int().min(1).nullish(),
	eligibilityAnswers: z.array(eligibilityAnswer).default([])
});
export type CreateSubmissionInput = z.infer<typeof createSubmissionInput>;

export const setLabelInput = z.object({ label: submissionLabel });
export type SetLabelInput = z.infer<typeof setLabelInput>;

export const setNotesInput = z.object({ notes: z.string().max(10_000) });
export type SetNotesInput = z.infer<typeof setNotesInput>;

export const setFeedbackInput = z.object({ feedback: z.string().max(50_000) });
export type SetFeedbackInput = z.infer<typeof setFeedbackInput>;

export const toggleWinnerInput = z.object({
	isWinner: z.boolean(),
	position: z.number().int().min(1).max(99).nullish()
});
export type ToggleWinnerInput = z.infer<typeof toggleWinnerInput>;

export const payTrancheInput = z.object({
	amount: z.number().int().min(1),
	final: z.boolean().default(false)
});
export type PayTrancheInput = z.infer<typeof payTrancheInput>;

export const submissionListQuery = z.object({
	label: submissionLabel.optional()
});
export type SubmissionListQuery = z.infer<typeof submissionListQuery>;
