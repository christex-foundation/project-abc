import { prisma } from '../db';
import type { FreelancerProfile } from '@prisma/client';

export async function createEmpty(userId: string, displayName: string): Promise<FreelancerProfile> {
	return prisma.freelancerProfile.create({
		data: { userId, displayName }
	});
}

export async function findByUserId(userId: string): Promise<FreelancerProfile | null> {
	return prisma.freelancerProfile.findUnique({ where: { userId } });
}
