import { prisma } from '../db';
import type { Dispute, Prisma } from '@prisma/client';

const selectFull = {
	id: true,
	bountyId: true,
	projectId: true,
	raisedById: true,
	reason: true,
	status: true,
	resolution: true,
	createdAt: true,
	updatedAt: true,
	bounty: {
		select: { id: true, slug: true, title: true, status: true }
	},
	project: {
		select: { id: true, slug: true, title: true, status: true }
	},
	raisedBy: {
		select: { id: true, email: true, name: true, role: true }
	}
} satisfies Prisma.DisputeSelect;

export type DisputeWithContext = Prisma.DisputeGetPayload<{ select: typeof selectFull }>;

export async function create(input: {
	bountyId?: string;
	projectId?: string;
	raisedById: string;
	reason: string;
}): Promise<Dispute> {
	return prisma.dispute.create({
		data: {
			bountyId: input.bountyId ?? null,
			projectId: input.projectId ?? null,
			raisedById: input.raisedById,
			reason: input.reason
		}
	});
}

export async function findById(id: string): Promise<DisputeWithContext | null> {
	return prisma.dispute.findUnique({ where: { id }, select: selectFull });
}

export async function listForAdmin(opts: { status?: string } = {}): Promise<DisputeWithContext[]> {
	return prisma.dispute.findMany({
		where: opts.status ? { status: opts.status } : undefined,
		select: selectFull,
		orderBy: [{ status: 'asc' }, { createdAt: 'desc' }]
	});
}

export async function updateStatus(id: string, status: string): Promise<Dispute> {
	return prisma.dispute.update({ where: { id }, data: { status } });
}

export async function setResolution(
	id: string,
	resolution: string,
	status: string
): Promise<Dispute> {
	return prisma.dispute.update({
		where: { id },
		data: { resolution, status }
	});
}
