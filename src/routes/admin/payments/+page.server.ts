import { requireAuth, requireRole } from '$lib/server/auth-helpers';
import * as paymentService from '$lib/server/services/payment.service';
import type { PageServerLoad } from './$types';
import type { PaymentStatus, PaymentType } from '@prisma/client';

const STATUSES = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'];
const TYPES = ['ESCROW_DEPOSIT', 'PRIZE_PAYOUT', 'REFUND'];

export const load: PageServerLoad = async ({ locals, url }) => {
	const caller = requireAuth(locals);
	requireRole(caller, 'ADMIN');
	const statusParam = url.searchParams.get('status');
	const typeParam = url.searchParams.get('type');
	const status: PaymentStatus | undefined =
		statusParam && STATUSES.includes(statusParam) ? (statusParam as PaymentStatus) : undefined;
	const type: PaymentType | undefined =
		typeParam && TYPES.includes(typeParam) ? (typeParam as PaymentType) : undefined;
	const { items, total } = await paymentService.listForAdmin(caller, { status, type });
	return { payments: items, total, status: status ?? '', type: type ?? '' };
};
