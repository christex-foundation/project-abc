import { BountyStatus, type Prisma } from '@prisma/client';
import { prisma } from '../db';
import { AppError } from '../http';
import { requireRole, type AuthedUser } from '../auth-helpers';
import { sanitizeRichText } from '../sanitize';
import * as bountyRepo from '../repositories/bounty.repo';
import * as prizeTierRepo from '../repositories/prizeTier.repo';
import * as bountySkillRepo from '../repositories/bountySkill.repo';
import * as companyRepo from '../repositories/company.repo';
import * as skillRepo from '../repositories/skill.repo';
import {
	createBountyInput,
	mergedBountyInput,
	bountyListQuery,
	type CreateBountyInput,
	type UpdateBountyInput,
	type BountyListQuery
} from '$lib/validators/bounty';

const SLUG_MAX = 80;

function slugify(input: string): string {
	return input
		.toLowerCase()
		.trim()
		.replace(/[^\p{L}\p{N}\s-]/gu, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.slice(0, SLUG_MAX);
}

async function uniqueSlug(base: string): Promise<string> {
	const seed = slugify(base) || 'bounty';
	if (!(await bountyRepo.slugExists(seed))) return seed;
	// One suffix attempt with a short random token. Collisions on a 6-char
	// alphanumeric tail are vanishingly rare and PrizeTier creates inside
	// the transaction so a second collision would surface as a unique-violation
	// and roll the whole create back.
	const suffix = Math.random().toString(36).slice(2, 8);
	return `${seed.slice(0, SLUG_MAX - suffix.length - 1)}-${suffix}`;
}

function sanitizePayloadFields<
	T extends Pick<CreateBountyInput, 'description' | 'requirements' | 'deliverables'>
>(input: T): T {
	return {
		...input,
		description: sanitizeRichText(input.description),
		requirements: input.requirements != null ? sanitizeRichText(input.requirements) : null,
		deliverables: input.deliverables != null ? sanitizeRichText(input.deliverables) : null
	};
}

async function resolveCompanyProfileId(caller: AuthedUser): Promise<string> {
	const profile = await companyRepo.findByUserId(caller.id);
	if (!profile) {
		throw new AppError(
			'CONFLICT',
			'You must have a company profile to create bounties. Contact an admin.'
		);
	}
	return profile.id;
}

async function ensureSkillsExist(skillIds: string[]): Promise<void> {
	if (skillIds.length === 0) return;
	const found = await skillRepo.findByIds(skillIds);
	if (found.length !== skillIds.length) {
		throw new AppError('BAD_REQUEST', 'One or more skills do not exist.');
	}
}

export async function createBounty(caller: AuthedUser, raw: unknown) {
	requireRole(caller, 'COMPANY');
	const parsed = createBountyInput.parse(raw);
	const companyProfileId = await resolveCompanyProfileId(caller);
	const skillIds = parsed.skills.map((s) => s.skillId);
	await ensureSkillsExist(skillIds);

	const sanitized = sanitizePayloadFields(parsed);
	const slug = await uniqueSlug(sanitized.title);

	const bounty = await prisma.$transaction(async (tx) => {
		const created = await tx.bounty.create({
			data: {
				slug,
				title: sanitized.title,
				description: sanitized.description,
				requirements: sanitized.requirements ?? null,
				deliverables: sanitized.deliverables ?? null,
				type: sanitized.type,
				status: BountyStatus.DRAFT,
				compensationType: sanitized.compensationType,
				currency: sanitized.currency,
				totalPrizePool: sanitized.totalPrizePool,
				rewardAmount: sanitized.rewardAmount ?? null,
				minRewardAsk: sanitized.minRewardAsk ?? null,
				maxRewardAsk: sanitized.maxRewardAsk ?? null,
				numberOfWinners: sanitized.numberOfWinners,
				maxBonusSpots: sanitized.maxBonusSpots,
				eligibility: sanitized.eligibility as unknown as Prisma.InputJsonValue,
				timeToComplete: sanitized.timeToComplete ?? null,
				submissionDeadline: sanitized.submissionDeadline,
				judgingDeadline: sanitized.judgingDeadline ?? null,
				company: { connect: { id: companyProfileId } }
			},
			select: { id: true }
		});

		await prizeTierRepo.replaceAllForBounty(tx, created.id, sanitized.prizeTiers);
		await bountySkillRepo.replaceAllForBounty(tx, created.id, sanitized.skills);
		return created;
	});

	const full = await bountyRepo.findBountyById(bounty.id);
	if (!full) throw new AppError('INTERNAL', 'Failed to load created bounty.');
	return full;
}

export async function updateBounty(caller: AuthedUser, id: string, raw: unknown) {
	requireRole(caller, 'COMPANY', 'ADMIN');
	const existing = await bountyRepo.findBountyById(id);
	if (!existing) throw new AppError('NOT_FOUND', 'Bounty not found.');
	if (caller.role !== 'ADMIN') {
		const profile = await companyRepo.findByUserId(caller.id);
		if (!profile || profile.id !== existing.companyProfileId) {
			throw new AppError('FORBIDDEN', 'You do not own this bounty.');
		}
	}
	if (existing.status !== BountyStatus.DRAFT) {
		throw new AppError('CONFLICT', 'Only DRAFT bounties may be edited.');
	}

	// Merge partial onto existing for cross-field re-validation.
	const merged = {
		title: existing.title,
		description: existing.description,
		requirements: existing.requirements,
		deliverables: existing.deliverables,
		type: existing.type,
		compensationType: existing.compensationType,
		currency: existing.currency,
		totalPrizePool: existing.totalPrizePool,
		rewardAmount: existing.rewardAmount,
		minRewardAsk: existing.minRewardAsk,
		maxRewardAsk: existing.maxRewardAsk,
		numberOfWinners: existing.numberOfWinners,
		maxBonusSpots: existing.maxBonusSpots,
		prizeTiers: existing.prizeTiers.map((t) => ({
			position: t.position,
			amount: t.amount,
			label: t.label
		})),
		skills: existing.skills.map((s) => ({ skillId: s.skill.id, isRequired: s.isRequired })),
		eligibility: (existing.eligibility ?? []) as unknown,
		timeToComplete: existing.timeToComplete,
		submissionDeadline: existing.submissionDeadline,
		judgingDeadline: existing.judgingDeadline,
		...(raw as Record<string, unknown>)
	};
	const validated = mergedBountyInput.parse(merged) as CreateBountyInput;
	await ensureSkillsExist(validated.skills.map((s) => s.skillId));
	const sanitized = sanitizePayloadFields(validated);

	await prisma.$transaction(async (tx) => {
		await tx.bounty.update({
			where: { id },
			data: {
				title: sanitized.title,
				description: sanitized.description,
				requirements: sanitized.requirements ?? null,
				deliverables: sanitized.deliverables ?? null,
				type: sanitized.type,
				compensationType: sanitized.compensationType,
				currency: sanitized.currency,
				totalPrizePool: sanitized.totalPrizePool,
				rewardAmount: sanitized.rewardAmount ?? null,
				minRewardAsk: sanitized.minRewardAsk ?? null,
				maxRewardAsk: sanitized.maxRewardAsk ?? null,
				numberOfWinners: sanitized.numberOfWinners,
				maxBonusSpots: sanitized.maxBonusSpots,
				eligibility: sanitized.eligibility as unknown as Prisma.InputJsonValue,
				timeToComplete: sanitized.timeToComplete ?? null,
				submissionDeadline: sanitized.submissionDeadline,
				judgingDeadline: sanitized.judgingDeadline ?? null
			}
		});
		await prizeTierRepo.replaceAllForBounty(tx, id, sanitized.prizeTiers);
		await bountySkillRepo.replaceAllForBounty(tx, id, sanitized.skills);
	});

	const full = await bountyRepo.findBountyById(id);
	if (!full) throw new AppError('INTERNAL', 'Failed to reload bounty.');
	return full;
}

export async function deleteDraft(caller: AuthedUser, id: string) {
	requireRole(caller, 'COMPANY', 'ADMIN');
	const existing = await bountyRepo.findBountyById(id);
	if (!existing) throw new AppError('NOT_FOUND', 'Bounty not found.');
	if (caller.role !== 'ADMIN') {
		const profile = await companyRepo.findByUserId(caller.id);
		if (!profile || profile.id !== existing.companyProfileId) {
			throw new AppError('FORBIDDEN', 'You do not own this bounty.');
		}
	}
	if (existing.status !== BountyStatus.DRAFT) {
		throw new AppError('CONFLICT', 'Only DRAFT bounties may be deleted.');
	}
	await bountyRepo.deleteBounty(id);
}

export async function listBounties(raw: unknown) {
	const filters = bountyListQuery.parse(raw) as BountyListQuery;
	return bountyRepo.listPublicBounties(filters);
}

/**
 * Get a bounty by id or slug. DRAFT visibility scoped to owner or ADMIN.
 */
export async function getBounty(caller: AuthedUser | null, idOrSlug: string) {
	const isCuid = /^c[a-z0-9]{20,}$/i.test(idOrSlug);
	const bounty = isCuid
		? await bountyRepo.findBountyById(idOrSlug)
		: await bountyRepo.findBountyBySlug(idOrSlug);
	if (!bounty) throw new AppError('NOT_FOUND', 'Bounty not found.');

	if (bounty.status === BountyStatus.DRAFT || bounty.status === BountyStatus.CANCELLED) {
		if (!caller) throw new AppError('NOT_FOUND', 'Bounty not found.');
		if (caller.role === 'ADMIN') return bounty;
		const profile = await companyRepo.findByUserId(caller.id);
		if (!profile || profile.id !== bounty.companyProfileId) {
			throw new AppError('NOT_FOUND', 'Bounty not found.');
		}
		return bounty;
	}
	return bounty;
}

export async function listForCompany(caller: AuthedUser) {
	requireRole(caller, 'COMPANY');
	const profile = await companyRepo.findByUserId(caller.id);
	if (!profile) return [];
	return bountyRepo.listForCompany(profile.id);
}

export type { UpdateBountyInput };
