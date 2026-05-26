import { requireAuth, requireRole } from '$lib/server/auth-helpers';
import * as bountyRepo from '$lib/server/repositories/bounty.repo';
import type { PageServerLoad } from './$types';
import type { BountyStatus, BountyType } from '@prisma/client';

const BOUNTY_STATUSES = ['DRAFT', 'FUNDED', 'ACTIVE', 'JUDGING', 'COMPLETED', 'CANCELLED'];
const BOUNTY_TYPES = ['BOUNTY', 'PROJECT'];

export const load: PageServerLoad = async ({ locals, url }) => {
	const caller = requireAuth(locals);
	requireRole(caller, 'ADMIN');
	const search = url.searchParams.get('q') ?? undefined;
	const statusParam = url.searchParams.get('status');
	const typeParam = url.searchParams.get('type');
	const status: BountyStatus | undefined =
		statusParam && BOUNTY_STATUSES.includes(statusParam)
			? (statusParam as BountyStatus)
			: undefined;
	const type: BountyType | undefined =
		typeParam && BOUNTY_TYPES.includes(typeParam) ? (typeParam as BountyType) : undefined;
	const bounties = await bountyRepo.listForAdmin({ search, status, type });
	return {
		bounties,
		search: search ?? '',
		status: status ?? '',
		type: type ?? ''
	};
};
