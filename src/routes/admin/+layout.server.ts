import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { prisma } from '$lib/server/db';
import { getSetting } from '$lib/server/settings';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		throw redirect(303, `/login?redirect=${encodeURIComponent(url.pathname)}`);
	}
	if (locals.user.role !== 'ADMIN') {
		throw redirect(303, '/');
	}

	const [openDisputes, pendingInvites, failedPayments, featureFlags] = await Promise.all([
		prisma.dispute.count({ where: { status: 'OPEN' } }),
		prisma.companyInvite.count({ where: { status: 'PENDING' } }),
		prisma.payment.count({ where: { status: 'FAILED' } }),
		getSetting<{
			maintenanceMode?: boolean;
			maintenanceMessage?: string;
			signupDisabled?: boolean;
			bountyCreationDisabled?: boolean;
			paymentsPaused?: boolean;
		}>('FEATURE_FLAGS')
	]);

	return {
		badges: { openDisputes, pendingInvites, failedPayments },
		featureFlags: featureFlags ?? {}
	};
};
