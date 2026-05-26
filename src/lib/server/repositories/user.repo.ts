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
