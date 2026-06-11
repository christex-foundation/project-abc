import { prisma } from '../db';
import { type Prisma, type UserRole } from '@prisma/client';

export const selectFull = {
	id: true,
	projectId: true,
	raterUserId: true,
	rateeUserId: true,
	raterRole: true,
	rating: true,
	comment: true,
	raterNameSnapshot: true,
	rateeNameSnapshot: true,
	createdAt: true
} satisfies Prisma.ReviewSelect;

export type ReviewRow = Prisma.ReviewGetPayload<{ select: typeof selectFull }>;

export type CreateReviewData = {
	projectId: string;
	raterUserId: string;
	rateeUserId: string | null;
	raterRole: UserRole;
	rating: number;
	comment: string | null;
	raterNameSnapshot: string | null;
	rateeNameSnapshot: string | null;
};

export async function create(data: CreateReviewData): Promise<ReviewRow> {
	return prisma.review.create({ data, select: selectFull });
}

/** The review the given user authored on a project (one per rater per project). */
export async function findOwn(projectId: string, raterUserId: string): Promise<ReviewRow | null> {
	return prisma.review.findUnique({
		where: { projectId_raterUserId: { projectId, raterUserId } },
		select: selectFull
	});
}

export async function findForProject(projectId: string): Promise<ReviewRow[]> {
	return prisma.review.findMany({
		where: { projectId },
		select: selectFull,
		orderBy: { createdAt: 'asc' }
	});
}

/** Aggregate rating for a user (as ratee). Returns avg (1dp) + count. */
export async function aggregateForUser(
	userId: string
): Promise<{ avg: number | null; count: number }> {
	const res = await prisma.review.aggregate({
		where: { rateeUserId: userId },
		_avg: { rating: true },
		_count: { _all: true }
	});
	const avg = res._avg.rating;
	return { avg: avg != null ? Math.round(avg * 10) / 10 : null, count: res._count._all };
}

/**
 * Aggregate ratings for many users (as ratees) in a single query. Returns a map
 * keyed by user id; users with no reviews default to `{ avg: null, count: 0 }`.
 */
export async function aggregateForUsers(
	userIds: string[]
): Promise<Record<string, { avg: number | null; count: number }>> {
	const out: Record<string, { avg: number | null; count: number }> = {};
	for (const id of userIds) out[id] = { avg: null, count: 0 };
	if (userIds.length === 0) return out;
	const rows = await prisma.review.groupBy({
		by: ['rateeUserId'],
		where: { rateeUserId: { in: userIds } },
		_avg: { rating: true },
		_count: { _all: true }
	});
	for (const r of rows) {
		if (!r.rateeUserId) continue;
		const avg = r._avg.rating;
		out[r.rateeUserId] = {
			avg: avg != null ? Math.round(avg * 10) / 10 : null,
			count: r._count._all
		};
	}
	return out;
}
