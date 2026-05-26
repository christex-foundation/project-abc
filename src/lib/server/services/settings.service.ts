import * as settingsRepo from '../repositories/settings.repo';
import { getAllSettings, invalidate } from '../settings';
import { AppError } from '../http';
import { requireRole, type AuthedUser } from '../auth-helpers';

export async function getAll(): Promise<Record<string, unknown>> {
	return getAllSettings();
}

export async function update(caller: AuthedUser, key: string, value: unknown) {
	requireRole(caller, 'ADMIN');
	if (!key || typeof key !== 'string') {
		throw new AppError('BAD_REQUEST', 'Setting key is required.');
	}
	const row = await settingsRepo.upsert(key, value, caller.id);
	invalidate(key);
	return row;
}
