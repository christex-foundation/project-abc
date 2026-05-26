import { prisma } from '../db';
import { InviteStatus, type CompanyInvite } from '@prisma/client';

export async function create(data: {
	email: string;
	companyName?: string | null;
	invitedById: string;
}): Promise<CompanyInvite> {
	return prisma.companyInvite.create({
		data: {
			email: data.email,
			companyName: data.companyName ?? null,
			invitedById: data.invitedById
		}
	});
}

export async function findPendingByEmail(email: string): Promise<CompanyInvite | null> {
	return prisma.companyInvite.findFirst({
		where: { email, status: InviteStatus.PENDING }
	});
}

export async function markAccepted(id: string, acceptedUserId: string): Promise<CompanyInvite> {
	return prisma.companyInvite.update({
		where: { id },
		data: { status: InviteStatus.ACCEPTED, acceptedUserId, acceptedAt: new Date() }
	});
}

export async function listAll(): Promise<CompanyInvite[]> {
	return prisma.companyInvite.findMany({ orderBy: { createdAt: 'desc' } });
}
