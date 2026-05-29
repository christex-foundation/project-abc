import { prisma } from '../db';
import { MilestoneStatus, type UserRole, type Prisma } from '@prisma/client';

const updateSelect = {
	id: true,
	note: true,
	deliverables: true,
	authorUserId: true,
	authorNameSnapshot: true,
	createdAt: true,
	author: { select: { id: true, name: true } }
} satisfies Prisma.MilestoneUpdateSelect;

const commentSelect = {
	id: true,
	body: true,
	authorUserId: true,
	authorRole: true,
	authorNameSnapshot: true,
	createdAt: true,
	author: { select: { id: true, name: true } }
} satisfies Prisma.MilestoneCommentSelect;

/**
 * A milestone with its full activity thread (updates + comments). Both the
 * owning company and the awarded contractor see the same workspace view —
 * milestones carry no party-private fields.
 */
export const selectWithThread = {
	id: true,
	projectId: true,
	position: true,
	title: true,
	description: true,
	amount: true,
	dueInDays: true,
	status: true,
	revisionCount: true,
	approvedAt: true,
	createdAt: true,
	updatedAt: true,
	updates: { select: updateSelect, orderBy: { createdAt: 'asc' as const } },
	comments: { select: commentSelect, orderBy: { createdAt: 'asc' as const } }
} satisfies Prisma.MilestoneSelect;

export type MilestoneWithThread = Prisma.MilestoneGetPayload<{ select: typeof selectWithThread }>;

export type MilestonePlanInput = {
	position: number;
	title: string;
	description: string | null;
	amount: number;
	dueInDays: number | null;
};

/**
 * Create the company-defined milestone plan on a project. All milestones start
 * PENDING; the first is activated (IN_PROGRESS) only when escrow is funded.
 */
export async function createManyForProject(
	projectId: string,
	milestones: MilestonePlanInput[],
	tx: Prisma.TransactionClient = prisma
) {
	for (const m of milestones) {
		await tx.milestone.create({
			data: {
				projectId,
				position: m.position,
				title: m.title,
				description: m.description,
				amount: m.amount,
				dueInDays: m.dueInDays,
				status: MilestoneStatus.PENDING
			}
		});
	}
}

/**
 * Replace a project's milestone plan wholesale. Only valid pre-funding (the
 * service guards on status + no escrow funded), so deleting rows is safe.
 */
export async function replaceAllForProject(
	projectId: string,
	milestones: MilestonePlanInput[],
	tx: Prisma.TransactionClient = prisma
) {
	await tx.milestone.deleteMany({ where: { projectId } });
	await createManyForProject(projectId, milestones, tx);
}

/** Activate the lowest-position PENDING milestone (called at funding). */
export async function activateFirst(
	projectId: string,
	tx: Prisma.TransactionClient = prisma
): Promise<{ id: string; position: number } | null> {
	const first = await tx.milestone.findFirst({
		where: { projectId, status: MilestoneStatus.PENDING },
		orderBy: { position: 'asc' },
		select: { id: true, position: true }
	});
	if (!first) return null;
	await tx.milestone.update({
		where: { id: first.id },
		data: { status: MilestoneStatus.IN_PROGRESS }
	});
	return first;
}

/** The current active milestone (lowest-position non-APPROVED) — for mediation. */
export async function findActiveForProject(
	projectId: string,
	tx: Prisma.TransactionClient = prisma
): Promise<{ id: string; position: number; amount: number; title: string } | null> {
	return tx.milestone.findFirst({
		where: { projectId, status: { not: MilestoneStatus.APPROVED } },
		orderBy: { position: 'asc' },
		select: { id: true, position: true, amount: true, title: true }
	});
}

export async function incrementRevision(id: string, tx: Prisma.TransactionClient = prisma) {
	return tx.milestone.update({
		where: { id },
		data: { revisionCount: { increment: 1 } },
		select: { id: true, revisionCount: true }
	});
}

export async function findById(id: string): Promise<MilestoneWithThread | null> {
	return prisma.milestone.findUnique({ where: { id }, select: selectWithThread });
}

export async function listForProject(projectId: string): Promise<MilestoneWithThread[]> {
	return prisma.milestone.findMany({
		where: { projectId },
		select: selectWithThread,
		orderBy: { position: 'asc' }
	});
}

export async function setStatus(
	id: string,
	status: MilestoneStatus,
	tx: Prisma.TransactionClient = prisma
) {
	return tx.milestone.update({
		where: { id },
		data: { status },
		select: { id: true, status: true }
	});
}

export async function markApproved(id: string, tx: Prisma.TransactionClient = prisma) {
	return tx.milestone.update({
		where: { id },
		data: { status: MilestoneStatus.APPROVED, approvedAt: new Date() },
		select: { id: true, status: true, approvedAt: true }
	});
}

/**
 * Activate the next PENDING milestone after `currentPosition` (lowest position
 * first). Returns the activated milestone, or null when none remain.
 */
export async function activateNext(
	projectId: string,
	currentPosition: number,
	tx: Prisma.TransactionClient = prisma
): Promise<{ id: string; position: number } | null> {
	const next = await tx.milestone.findFirst({
		where: { projectId, position: { gt: currentPosition }, status: MilestoneStatus.PENDING },
		orderBy: { position: 'asc' },
		select: { id: true, position: true }
	});
	if (!next) return null;
	await tx.milestone.update({
		where: { id: next.id },
		data: { status: MilestoneStatus.IN_PROGRESS }
	});
	return next;
}

export async function addUpdate(
	input: {
		milestoneId: string;
		authorUserId: string;
		authorNameSnapshot: string | null;
		note: string;
		deliverables: Prisma.InputJsonValue;
	},
	tx: Prisma.TransactionClient = prisma
) {
	return tx.milestoneUpdate.create({
		data: {
			milestoneId: input.milestoneId,
			authorUserId: input.authorUserId,
			authorNameSnapshot: input.authorNameSnapshot,
			note: input.note,
			deliverables: input.deliverables
		},
		select: { id: true }
	});
}

export async function addComment(
	input: {
		milestoneId: string;
		authorUserId: string;
		authorRole: UserRole;
		authorNameSnapshot: string | null;
		body: string;
	},
	tx: Prisma.TransactionClient = prisma
) {
	return tx.milestoneComment.create({
		data: {
			milestoneId: input.milestoneId,
			authorUserId: input.authorUserId,
			authorRole: input.authorRole,
			authorNameSnapshot: input.authorNameSnapshot,
			body: input.body
		},
		select: { id: true }
	});
}

export async function countRemaining(
	projectId: string,
	tx: Prisma.TransactionClient = prisma
): Promise<number> {
	return tx.milestone.count({
		where: { projectId, status: { not: MilestoneStatus.APPROVED } }
	});
}

export async function sumApprovedAmounts(
	projectId: string,
	tx: Prisma.TransactionClient = prisma
): Promise<number> {
	const res = await tx.milestone.aggregate({
		where: { projectId, status: MilestoneStatus.APPROVED },
		_sum: { amount: true }
	});
	return res._sum.amount ?? 0;
}
