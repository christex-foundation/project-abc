import { prisma } from '../db';
import type { PushSubscription } from '@prisma/client';

export type UpsertInput = {
	userId: string;
	endpoint: string;
	p256dh: string;
	auth: string;
	userAgent?: string | null;
};

export async function listForUser(userId: string): Promise<PushSubscription[]> {
	return prisma.pushSubscription.findMany({
		where: { userId },
		orderBy: { createdAt: 'desc' }
	});
}

/**
 * Upsert by endpoint. The browser hands us one endpoint per device per origin;
 * if it reassigns ownership (e.g. a shared device), last writer wins on userId.
 */
export async function upsertForUser(input: UpsertInput): Promise<PushSubscription> {
	return prisma.pushSubscription.upsert({
		where: { endpoint: input.endpoint },
		create: {
			userId: input.userId,
			endpoint: input.endpoint,
			p256dh: input.p256dh,
			auth: input.auth,
			userAgent: input.userAgent ?? null
		},
		update: {
			userId: input.userId,
			p256dh: input.p256dh,
			auth: input.auth,
			userAgent: input.userAgent ?? null
		}
	});
}

/**
 * Used when the push gateway returns 404/410 — the subscription is dead and
 * no longer routable. deleteMany so a concurrent unsubscribe doesn't surface
 * a P2025 (record-not-found).
 */
export async function deleteByEndpoint(endpoint: string): Promise<void> {
	await prisma.pushSubscription.deleteMany({ where: { endpoint } });
}

/**
 * Caller-initiated unsubscribe. Scoped to the caller's userId so a request
 * can't clear another user's endpoint.
 */
export async function deleteForUserAndEndpoint(userId: string, endpoint: string): Promise<void> {
	await prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
}
