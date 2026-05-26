import { AppError } from '../http';
import { requireRole, type AuthedUser } from '../auth-helpers';
import * as userRepo from '../repositories/user.repo';
import { adminUpdateUserInput } from '$lib/validators/admin-user';

export async function listUsers(
	caller: AuthedUser,
	filter: Parameters<typeof userRepo.listForAdmin>[0] = {}
) {
	requireRole(caller, 'ADMIN');
	return userRepo.listForAdmin(filter);
}

export async function updateUser(caller: AuthedUser, userId: string, raw: unknown) {
	requireRole(caller, 'ADMIN');
	const parsed = adminUpdateUserInput.parse(raw);
	const target = await userRepo.findById(userId);
	if (!target) throw new AppError('NOT_FOUND', 'User not found.');

	if (parsed.role !== undefined && parsed.role !== target.role) {
		if (target.id === caller.id) {
			throw new AppError('CONFLICT', 'You cannot change your own role.');
		}
		await userRepo.setRole(userId, parsed.role);
	}
	if (parsed.isActive !== undefined && parsed.isActive !== target.isActive) {
		if (target.id === caller.id) {
			throw new AppError('CONFLICT', 'You cannot deactivate your own account.');
		}
		await userRepo.setActive(userId, parsed.isActive);
	}

	return userRepo.findById(userId);
}
