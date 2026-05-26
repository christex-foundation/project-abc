import { BountyStatus, BountyType, CompensationType, SubmissionLabel } from '@prisma/client';
import { AppError } from '../http';
import { requireRole, type AuthedUser } from '../auth-helpers';
import { sanitizeRichText } from '../sanitize';
import * as submissionRepo from '../repositories/submission.repo';
import * as bountyRepo from '../repositories/bounty.repo';
import * as freelancerRepo from '../repositories/freelancer.repo';
import * as companyRepo from '../repositories/company.repo';
import * as paymentRepo from '../repositories/payment.repo';
import * as userRepo from '../repositories/user.repo';
import * as notification from './notification.service';
import {
	createSubmissionInput,
	setLabelInput,
	setNotesInput,
	setFeedbackInput,
	submissionListQuery,
	toggleWinnerInput
} from '$lib/validators/submission';

type EligibilityQuestion = { question: string; optional?: boolean };

function appUrl(): string {
	return process.env.PUBLIC_APP_URL?.trim() || 'http://localhost:5173';
}

async function ownsBounty(caller: AuthedUser, companyProfileId: string): Promise<boolean> {
	if (caller.role === 'ADMIN') return true;
	const profile = await companyRepo.findByUserId(caller.id);
	return !!profile && profile.id === companyProfileId;
}

async function loadOwnedSubmission(caller: AuthedUser, submissionId: string) {
	const submission = await submissionRepo.findByIdForSponsor(submissionId);
	if (!submission) throw new AppError('NOT_FOUND', 'Submission not found.');
	const bounty = await bountyRepo.findBountyById(submission.bountyId);
	if (!bounty) throw new AppError('NOT_FOUND', 'Submission not found.');
	if (!(await ownsBounty(caller, bounty.companyProfileId))) {
		throw new AppError('FORBIDDEN', 'You do not own this submission.');
	}
	return { submission, bounty };
}

function validateAskAgainstBounty(
	ask: number | null | undefined,
	compensationType: CompensationType,
	minRewardAsk: number | null,
	maxRewardAsk: number | null
) {
	if (compensationType === CompensationType.FIXED) {
		if (ask != null) {
			throw new AppError('BAD_REQUEST', '`ask` is not allowed on a FIXED-compensation bounty.');
		}
		return;
	}
	if (ask == null) {
		throw new AppError('BAD_REQUEST', '`ask` is required for this bounty.');
	}
	if (compensationType === CompensationType.RANGE) {
		if (minRewardAsk == null || maxRewardAsk == null) {
			throw new AppError('INTERNAL', 'Bounty range is misconfigured.');
		}
		if (ask < minRewardAsk || ask > maxRewardAsk) {
			throw new AppError(
				'BAD_REQUEST',
				`\`ask\` must be between ${minRewardAsk} and ${maxRewardAsk}.`
			);
		}
	}
}

function validateEligibility(
	answers: Array<{ question: string; answer: string }>,
	eligibility: unknown
) {
	const questions = (Array.isArray(eligibility) ? eligibility : []) as EligibilityQuestion[];
	const required = questions.filter((q) => !q.optional);
	if (required.length === 0) return;
	const map = new Map(answers.map((a) => [a.question, a.answer.trim()]));
	for (const q of required) {
		const v = map.get(q.question);
		if (!v) {
			throw new AppError('BAD_REQUEST', `Missing required answer: "${q.question}"`);
		}
	}
}

export async function create(caller: AuthedUser, bountyId: string, raw: unknown) {
	requireRole(caller, 'FREELANCER');
	const parsed = createSubmissionInput.parse(raw);

	const freelancer = await freelancerRepo.findByUserId(caller.id);
	if (!freelancer) {
		throw new AppError('CONFLICT', 'Complete your freelancer profile before submitting.');
	}

	const bounty = await bountyRepo.findBountyById(bountyId);
	if (!bounty) throw new AppError('NOT_FOUND', 'Bounty not found.');
	if (bounty.status !== BountyStatus.ACTIVE) {
		throw new AppError('CONFLICT', 'This bounty is not accepting submissions.');
	}
	if (bounty.submissionDeadline.getTime() <= Date.now()) {
		throw new AppError('CONFLICT', 'The submission deadline has passed.');
	}

	validateAskAgainstBounty(
		parsed.ask ?? null,
		bounty.compensationType,
		bounty.minRewardAsk,
		bounty.maxRewardAsk
	);
	validateEligibility(parsed.eligibilityAnswers, bounty.eligibility);

	const existing = await submissionRepo.findByBountyAndFreelancer(bountyId, freelancer.id);
	if (existing) {
		throw new AppError('CONFLICT', 'You have already submitted to this bounty.');
	}

	const sanitizedOther = parsed.otherInfo ? sanitizeRichText(parsed.otherInfo) : null;
	const submission = await submissionRepo.create({
		bountyId,
		freelancerProfileId: freelancer.id,
		link: parsed.link,
		tweet: parsed.tweet ?? null,
		otherInfo: sanitizedOther,
		ask: parsed.ask ?? null,
		eligibilityAnswers: parsed.eligibilityAnswers as unknown as Parameters<
			typeof submissionRepo.create
		>[0]['eligibilityAnswers']
	});

	const owner = await userRepo.findCompanyOwnerByBountyId(bountyId);
	if (owner) {
		const manageUrl = `${appUrl()}/dashboard/company/bounties/${bounty.id}/submissions`;
		await notification.dispatch(owner.id, 'SUBMISSION_RECEIVED', {
			title: 'New submission',
			message: `${freelancer.displayName} submitted to "${bounty.title}".`,
			link: manageUrl,
			email: {
				bountyTitle: bounty.title,
				bountyUrl: `${appUrl()}/bounties/${bounty.slug}`,
				submitterName: freelancer.displayName,
				submitterEmail: caller.email,
				manageUrl
			}
		});
	}

	return submission;
}

export async function getForCaller(caller: AuthedUser, submissionId: string) {
	// Sponsor / admin: ownership-checked sponsor view.
	if (caller.role === 'COMPANY' || caller.role === 'ADMIN') {
		const submission = await submissionRepo.findByIdForSponsor(submissionId);
		if (!submission) throw new AppError('NOT_FOUND', 'Submission not found.');
		const bounty = await bountyRepo.findBountyById(submission.bountyId);
		if (!bounty) throw new AppError('NOT_FOUND', 'Submission not found.');
		if (await ownsBounty(caller, bounty.companyProfileId)) {
			return { view: 'sponsor' as const, data: submission };
		}
	}

	// Freelancer (or non-owning sponsor): the submitter's own view.
	const submission = await submissionRepo.findByIdForFreelancer(submissionId);
	if (!submission) throw new AppError('NOT_FOUND', 'Submission not found.');
	const freelancer = await freelancerRepo.findByUserId(caller.id);
	if (!freelancer || freelancer.id !== submission.freelancerProfileId) {
		throw new AppError('NOT_FOUND', 'Submission not found.');
	}
	return { view: 'freelancer' as const, data: submission };
}

export async function listForBountyAsSponsor(
	caller: AuthedUser,
	bountyId: string,
	rawQuery: unknown
) {
	requireRole(caller, 'COMPANY', 'ADMIN');
	const bounty = await bountyRepo.findBountyById(bountyId);
	if (!bounty) throw new AppError('NOT_FOUND', 'Bounty not found.');
	if (!(await ownsBounty(caller, bounty.companyProfileId))) {
		throw new AppError('FORBIDDEN', 'You do not own this bounty.');
	}
	const query = submissionListQuery.parse(rawQuery);
	return submissionRepo.listForBountySponsor(bountyId, { label: query.label });
}

export async function listForFreelancer(caller: AuthedUser) {
	requireRole(caller, 'FREELANCER');
	const freelancer = await freelancerRepo.findByUserId(caller.id);
	if (!freelancer) return [];
	return submissionRepo.listForFreelancer(freelancer.id);
}

export async function earningsForFreelancer(caller: AuthedUser) {
	requireRole(caller, 'FREELANCER');
	const freelancer = await freelancerRepo.findByUserId(caller.id);
	if (!freelancer) return [];
	return paymentRepo.listEarningsForFreelancer(freelancer.id);
}

export async function setLabel(caller: AuthedUser, submissionId: string, raw: unknown) {
	requireRole(caller, 'COMPANY', 'ADMIN');
	const parsed = setLabelInput.parse(raw);
	const { submission, bounty } = await loadOwnedSubmission(caller, submissionId);
	if (submission.label === parsed.label) return submission;

	const updated = await submissionRepo.setLabel(submission.id, parsed.label);

	if (parsed.label === SubmissionLabel.SHORTLISTED) {
		const bountyUrl = `${appUrl()}/bounties/${bounty.slug}`;
		await notification.dispatch(submission.freelancer.user.id, 'SUBMISSION_SHORTLISTED', {
			title: "You've been shortlisted",
			message: `Your submission to "${bounty.title}" was shortlisted.`,
			link: bountyUrl,
			email: {
				bountyTitle: bounty.title,
				bountyUrl,
				freelancerName: submission.freelancer.displayName
			}
		});
	}

	return updated;
}

export async function setNotes(caller: AuthedUser, submissionId: string, raw: unknown) {
	requireRole(caller, 'COMPANY', 'ADMIN');
	const parsed = setNotesInput.parse(raw);
	const { submission } = await loadOwnedSubmission(caller, submissionId);
	return submissionRepo.setNotes(submission.id, parsed.notes);
}

export async function setFeedback(caller: AuthedUser, submissionId: string, raw: unknown) {
	requireRole(caller, 'COMPANY', 'ADMIN');
	const parsed = setFeedbackInput.parse(raw);
	const { submission } = await loadOwnedSubmission(caller, submissionId);
	const sanitized = sanitizeRichText(parsed.feedback);
	return submissionRepo.setFeedback(submission.id, sanitized);
}

function resolvePrizeAmount(
	bounty: Awaited<ReturnType<typeof bountyRepo.findBountyById>>,
	submission: { ask: number | null },
	position: number
): number {
	if (!bounty) throw new AppError('INTERNAL', 'Bounty disappeared during prize resolution.');
	if (bounty.compensationType === CompensationType.FIXED) {
		const tier = bounty.prizeTiers.find((t) => t.position === position);
		if (!tier) {
			throw new AppError('BAD_REQUEST', `No prize tier defined for position ${position}.`);
		}
		return tier.amount;
	}
	// RANGE / VARIABLE: the freelancer's ask is the prize.
	if (submission.ask == null) {
		throw new AppError('CONFLICT', 'Submission has no `ask` set — cannot pick it as a winner.');
	}
	return submission.ask;
}

export async function toggleWinner(caller: AuthedUser, submissionId: string, raw: unknown) {
	requireRole(caller, 'COMPANY', 'ADMIN');
	const parsed = toggleWinnerInput.parse(raw);
	const { submission, bounty } = await loadOwnedSubmission(caller, submissionId);

	if (bounty.isWinnersAnnounced) {
		throw new AppError('CONFLICT', 'Winners have already been announced for this bounty.');
	}
	if (bounty.status !== BountyStatus.ACTIVE && bounty.status !== BountyStatus.JUDGING) {
		throw new AppError(
			'CONFLICT',
			'Winners can only be marked while the bounty is ACTIVE or JUDGING.'
		);
	}

	if (!parsed.isWinner) {
		return submissionRepo.toggleWinner(submission.id, { isWinner: false });
	}

	if (parsed.position == null) {
		throw new AppError('BAD_REQUEST', '`position` is required when marking a winner.');
	}
	const position = parsed.position;

	// Position policy by bounty type.
	if (bounty.type === BountyType.PROJECT) {
		if (position !== 1) {
			throw new AppError('BAD_REQUEST', 'Projects only allow a single winner at position 1.');
		}
	} else {
		const isRegular = position >= 1 && position <= bounty.numberOfWinners;
		const isBonus = position === 99;
		if (!isRegular && !isBonus) {
			throw new AppError(
				'BAD_REQUEST',
				`Position must be 1..${bounty.numberOfWinners} or 99 (bonus).`
			);
		}
	}

	// Uniqueness + bonus-cap check against the existing winner set.
	const winners = await submissionRepo.listWinners(bounty.id);
	const others = winners.filter((w) => w.id !== submission.id);

	if (position !== 99) {
		if (others.some((w) => w.winnerPosition === position)) {
			throw new AppError('CONFLICT', `Position ${position} is already taken.`);
		}
	} else {
		const bonusCount = others.filter((w) => w.winnerPosition === 99).length;
		if (bonusCount >= bounty.maxBonusSpots) {
			throw new AppError('CONFLICT', `Bonus slots are full (max ${bounty.maxBonusSpots}).`);
		}
	}

	const prizeAmount = resolvePrizeAmount(bounty, submission, position);
	return submissionRepo.toggleWinner(submission.id, {
		isWinner: true,
		winnerPosition: position,
		prizeAmount
	});
}
