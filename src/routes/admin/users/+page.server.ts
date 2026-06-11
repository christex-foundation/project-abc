import { requireAuth, requireRole } from '$lib/server/auth-helpers';
import * as admin from '$lib/server/services/admin.service';
import type { PageServerLoad } from './$types';
import type { UserRole } from '@prisma/client';

export const load: PageServerLoad = async ({ locals, url }) => {
	const caller = requireAuth(locals);
	requireRole(caller, 'ADMIN');
	const search = url.searchParams.get('q') ?? undefined;
	const roleParam = url.searchParams.get('role');
	const activeParam = url.searchParams.get('active');
	const role: UserRole | undefined =
		roleParam && ['COMPANY', 'FREELANCER', 'ADMIN'].includes(roleParam)
			? (roleParam as UserRole)
			: undefined;
	const isActive = activeParam === 'true' ? true : activeParam === 'false' ? false : undefined;
	const pageSize = 50;
	const page = Math.max(1, Number(url.searchParams.get('page') ?? 1) || 1);
	const { items, total } = await admin.listUsers(caller, {
		search,
		role,
		isActive,
		take: pageSize,
		skip: (page - 1) * pageSize
	});
	return {
		users: items,
		total,
		page,
		pageSize,
		search: search ?? '',
		role: role ?? '',
		isActive: activeParam ?? ''
	};
};
