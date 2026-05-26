import { UserRole } from '@prisma/client';
import { auth } from '../auth';
import { prisma } from '../db';
import { AppError } from '../http';
import { getSetting } from '../settings';
import * as companyRepo from '../repositories/company.repo';
import * as freelancerRepo from '../repositories/freelancer.repo';

type CompanySelfRegister = { enabled?: boolean } | null;

export async function registerFreelancer(input: { email: string; password: string; name: string }) {
	const result = await auth.api.signUpEmail({
		body: { email: input.email, password: input.password, name: input.name }
	});
	if (!result?.user?.id) {
		throw new AppError('BAD_REQUEST', 'Sign-up failed.');
	}
	await prisma.user.update({
		where: { id: result.user.id },
		data: { role: UserRole.FREELANCER, isActive: true }
	});
	await freelancerRepo.createEmpty(result.user.id, input.name);
	return { userId: result.user.id };
}

export async function registerCompany(input: {
	email: string;
	password: string;
	name: string;
	companyName: string;
}) {
	const flag = (await getSetting<CompanySelfRegister>('COMPANY_SELF_REGISTER')) ?? null;
	if (!flag?.enabled) {
		throw new AppError('FORBIDDEN', 'Companies join FOW by invitation only. Contact your admin.');
	}

	const result = await auth.api.signUpEmail({
		body: { email: input.email, password: input.password, name: input.name }
	});
	if (!result?.user?.id) {
		throw new AppError('BAD_REQUEST', 'Sign-up failed.');
	}
	await prisma.user.update({
		where: { id: result.user.id },
		data: { role: UserRole.COMPANY, isActive: true }
	});
	await companyRepo.createEmpty(result.user.id, input.companyName);
	return { userId: result.user.id };
}
