import { ProjectStatus } from '@prisma/client';
import { AppError } from '../http';
import { requireRole, type AuthedUser } from '../auth-helpers';
import { sanitizeRichText } from '../sanitize';
import * as reviewRepo from '../repositories/review.repo';
import * as projectRepo from '../repositories/project.repo';
import * as companyRepo from '../repositories/company.repo';
import * as freelancerRepo from '../repositories/freelancer.repo';
import * as userRepo from '../repositories/user.repo';
import * as notification from './notification.service';
import { createReviewInput } from '$lib/validators/review';

function appUrl(): string {
	return process.env.PUBLIC_APP_URL?.trim() || 'http://localhost:5173';
}

type Party = 'OWNER' | 'CONTRACTOR';

async function resolveParty(
	caller: AuthedUser,
	project: { companyProfileId: string | null; contractorProfileId: string | null }
): Promise<Party | null> {
	if (caller.role === 'COMPANY') {
		const profile = await companyRepo.findByUserId(caller.id);
		if (profile && profile.id === project.companyProfileId) return 'OWNER';
	} else if (caller.role === 'FREELANCER') {
		const profile = await freelancerRepo.findByUserId(caller.id);
		if (profile && profile.id === project.contractorProfileId) return 'CONTRACTOR';
	}
	return null;
}

export async function submit(caller: AuthedUser, projectId: string, raw: unknown) {
	requireRole(caller, 'COMPANY', 'FREELANCER');
	const parsed = createReviewInput.parse(raw);

	const project = await projectRepo.findProjectById(projectId);
	if (!project) throw new AppError('NOT_FOUND', 'Project not found.');
	if (project.status !== ProjectStatus.COMPLETED) {
		throw new AppError('CONFLICT', 'You can only review a completed project.');
	}

	const party = await resolveParty(caller, project);
	if (!party) throw new AppError('FORBIDDEN', 'Only the two parties on a project can review it.');

	const existing = await reviewRepo.findOwn(projectId, caller.id);
	if (existing) throw new AppError('CONFLICT', 'You have already reviewed this project.');

	// Resolve the counterparty (ratee).
	let rateeUser;
	let rateeName: string | null;
	if (party === 'OWNER') {
		rateeUser = project.contractorProfileId
			? await userRepo.findByFreelancerProfileId(project.contractorProfileId)
			: null;
		rateeName = project.contractorNameSnapshot;
	} else {
		rateeUser = project.companyProfileId
			? await userRepo.findByCompanyProfileId(project.companyProfileId)
			: null;
		rateeName = project.company?.companyName ?? project.companyNameSnapshot ?? null;
	}

	const comment = parsed.comment?.trim() ? sanitizeRichText(parsed.comment) : null;
	const review = await reviewRepo.create({
		projectId,
		raterUserId: caller.id,
		rateeUserId: rateeUser?.id ?? null,
		raterRole: caller.role,
		rating: parsed.rating,
		comment,
		raterNameSnapshot: caller.name ?? null,
		rateeNameSnapshot: rateeName
	});

	if (rateeUser) {
		await notification.dispatch(rateeUser.id, 'REVIEW_RECEIVED', {
			title: 'You received a review',
			message: `You got a ${parsed.rating}★ review on "${project.title}".`,
			link: `${appUrl()}/projects/${project.slug}/workspace`
		});
	}

	return review;
}

export async function getAggregate(userId: string) {
	return reviewRepo.aggregateForUser(userId);
}

/** Batched variant of {@link getAggregate} — one query for many users. */
export async function getAggregates(userIds: string[]) {
	return reviewRepo.aggregateForUsers(userIds);
}

/** Reviews on a project (both directions) for the workspace. */
export async function listForProject(projectId: string) {
	return reviewRepo.findForProject(projectId);
}

export async function findOwn(caller: AuthedUser, projectId: string) {
	return reviewRepo.findOwn(projectId, caller.id);
}
