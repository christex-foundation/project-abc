import { prisma } from '../db';
import type { Prisma, PrismaClient, ProofOfWork } from '@prisma/client';

const skillSelect = {
	id: true,
	name: true,
	slug: true,
	categoryId: true,
	parentSkillId: true
} as const;

const includeSkills = {
	skills: {
		include: { skill: { select: skillSelect } }
	}
} as const;

export type ProofOfWorkWithSkills = Prisma.ProofOfWorkGetPayload<{
	include: typeof includeSkills;
}>;

export type ProofOfWorkData = {
	title: string;
	description: string;
	link: string;
};

export async function listByFreelancerProfileId(
	freelancerProfileId: string
): Promise<ProofOfWorkWithSkills[]> {
	return prisma.proofOfWork.findMany({
		where: { freelancerProfileId },
		include: includeSkills,
		orderBy: { createdAt: 'desc' }
	});
}

export async function findByIdWithSkills(id: string): Promise<ProofOfWorkWithSkills | null> {
	return prisma.proofOfWork.findUnique({
		where: { id },
		include: includeSkills
	});
}

export async function findById(id: string): Promise<ProofOfWork | null> {
	return prisma.proofOfWork.findUnique({ where: { id } });
}

export async function create(
	tx: Prisma.TransactionClient | PrismaClient,
	freelancerProfileId: string,
	data: ProofOfWorkData,
	skillIds: string[]
): Promise<ProofOfWork> {
	return tx.proofOfWork.create({
		data: {
			freelancerProfileId,
			title: data.title,
			description: data.description,
			link: data.link,
			skills: {
				createMany: { data: skillIds.map((skillId) => ({ skillId })) }
			}
		}
	});
}

export async function update(
	tx: Prisma.TransactionClient | PrismaClient,
	id: string,
	data: ProofOfWorkData
): Promise<ProofOfWork> {
	return tx.proofOfWork.update({ where: { id }, data });
}

export async function replaceSkills(
	tx: Prisma.TransactionClient | PrismaClient,
	proofOfWorkId: string,
	skillIds: string[]
) {
	await tx.proofOfWorkSkill.deleteMany({ where: { proofOfWorkId } });
	if (skillIds.length === 0) return;
	await tx.proofOfWorkSkill.createMany({
		data: skillIds.map((skillId) => ({ proofOfWorkId, skillId }))
	});
}

export async function remove(id: string): Promise<void> {
	await prisma.proofOfWork.delete({ where: { id } });
}
