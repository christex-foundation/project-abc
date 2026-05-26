import { prisma } from '../db';
import type { Notification, Prisma } from '@prisma/client';

type CreateInput = {
	userId: string;
	eventType: string;
	title: string;
	message?: string | null;
	link?: string | null;
};

export async function create(
	input: CreateInput,
	tx: Prisma.TransactionClient = prisma
): Promise<Notification> {
	return tx.notification.create({
		data: {
			userId: input.userId,
			eventType: input.eventType,
			title: input.title,
			message: input.message ?? null,
			link: input.link ?? null
		}
	});
}

export async function listForUser(
	userId: string,
	opts: { limit?: number; unreadOnly?: boolean } = {}
): Promise<Notification[]> {
	return prisma.notification.findMany({
		where: { userId, ...(opts.unreadOnly && { isRead: false }) },
		orderBy: { createdAt: 'desc' },
		take: opts.limit ?? 50
	});
}

export async function markRead(id: string, userId: string): Promise<void> {
	await prisma.notification.updateMany({
		where: { id, userId },
		data: { isRead: true }
	});
}

export type NotificationChannelPrefs = {
	email?: Record<string, boolean>;
	push?: Record<string, boolean>;
};

export async function getPreference(userId: string): Promise<NotificationChannelPrefs | null> {
	const row = await prisma.notificationPreference.findUnique({
		where: { userId },
		select: { prefs: true }
	});
	if (!row) return null;
	const p = row.prefs as unknown;
	if (p && typeof p === 'object') return p as NotificationChannelPrefs;
	return null;
}

export async function upsertPreference(
	userId: string,
	prefs: NotificationChannelPrefs
): Promise<NotificationChannelPrefs> {
	const json = prefs as unknown as Prisma.InputJsonValue;
	const row = await prisma.notificationPreference.upsert({
		where: { userId },
		create: { userId, prefs: json },
		update: { prefs: json },
		select: { prefs: true }
	});
	return row.prefs as unknown as NotificationChannelPrefs;
}
