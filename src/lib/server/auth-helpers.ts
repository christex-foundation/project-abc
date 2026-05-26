import { AppError } from './http';
import type { UserRole } from '@prisma/client';

export type AuthedUser = {
	id: string;
	email: string;
	name: string | null;
	role: UserRole;
	isActive: boolean;
	emailVerified: boolean;
};

export function requireAuth(locals: App.Locals): AuthedUser {
	if (!locals.user) {
		throw new AppError('UNAUTHENTICATED', 'You must be signed in.');
	}
	if (!locals.user.isActive) {
		throw new AppError('FORBIDDEN', 'This account is deactivated.');
	}
	return locals.user;
}

export function requireRole(user: AuthedUser, ...roles: UserRole[]): AuthedUser {
	if (!roles.includes(user.role)) {
		throw new AppError('FORBIDDEN', `Requires one of: ${roles.join(', ')}.`);
	}
	return user;
}

export function assertOwner<T extends { companyProfile?: { userId: string } | null }>(
	user: AuthedUser,
	resource: T | null
): asserts resource is T {
	if (!resource) {
		throw new AppError('NOT_FOUND', 'Resource not found.');
	}
	if (user.role === 'ADMIN') return;
	if (resource.companyProfile?.userId !== user.id) {
		throw new AppError('FORBIDDEN', 'You do not own this resource.');
	}
}
