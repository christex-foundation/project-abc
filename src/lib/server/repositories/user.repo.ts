import { prisma } from '../db';
import type { Prisma, User, UserRole } from '@prisma/client';

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

export async function findByFreelancerProfileId(freelancerProfileId: string): Promise<User | null> {
	const profile = await prisma.freelancerProfile.findUnique({
		where: { id: freelancerProfileId },
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

export type AdminUserListFilter = {
	search?: string;
	role?: UserRole;
	isActive?: boolean;
	take?: number;
	skip?: number;
};

export type AdminUserRow = {
	id: string;
	email: string;
	name: string | null;
	role: UserRole;
	isActive: boolean;
	emailVerified: boolean;
	createdAt: Date;
	freelancerProfileId: string | null;
};

export async function listForAdmin(
	filter: AdminUserListFilter = {}
): Promise<{ items: AdminUserRow[]; total: number }> {
	const where: Prisma.UserWhereInput = {};
	if (filter.role) where.role = filter.role;
	if (filter.isActive !== undefined) where.isActive = filter.isActive;
	if (filter.search) {
		where.OR = [
			{ email: { contains: filter.search, mode: 'insensitive' } },
			{ name: { contains: filter.search, mode: 'insensitive' } }
		];
	}
	const take = filter.take ?? 50;
	const skip = filter.skip ?? 0;
	const [items, total] = await Promise.all([
		prisma.user.findMany({
			where,
			select: {
				id: true,
				email: true,
				name: true,
				role: true,
				isActive: true,
				emailVerified: true,
				createdAt: true,
				freelancerProfile: { select: { id: true } }
			},
			orderBy: { createdAt: 'desc' },
			take,
			skip
		}),
		prisma.user.count({ where })
	]);
	return {
		items: items.map((u) => ({
			id: u.id,
			email: u.email,
			name: u.name,
			role: u.role,
			isActive: u.isActive,
			emailVerified: u.emailVerified,
			createdAt: u.createdAt,
			freelancerProfileId: u.freelancerProfile?.id ?? null
		})),
		total
	};
}
