import { prisma } from '../db';
import type { User, UserRole } from '@prisma/client';

export async function findById(id: string): Promise<User | null> {
	return prisma.user.findUnique({ where: { id } });
}

export async function findByEmail(email: string): Promise<User | null> {
	return prisma.user.findUnique({ where: { email } });
}

export async function setRole(id: string, role: UserRole): Promise<User> {
	return prisma.user.update({ where: { id }, data: { role } });
}

export async function setActive(id: string, isActive: boolean): Promise<User> {
	return prisma.user.update({ where: { id }, data: { isActive } });
}

export async function findByCompanyProfileId(companyProfileId: string): Promise<User | null> {
	const profile = await prisma.companyProfile.findUnique({
		where: { id: companyProfileId },
		select: { user: true }
	});
	return profile?.user ?? null;
}

export async function findCompanyOwnerByBountyId(bountyId: string): Promise<User | null> {
	const bounty = await prisma.bounty.findUnique({
		where: { id: bountyId },
		select: { company: { select: { user: true } } }
	});
	return bounty?.company?.user ?? null;
}

export async function listActiveAdmins(): Promise<User[]> {
	return prisma.user.findMany({ where: { role: 'ADMIN', isActive: true } });
}
