import { error, fail, redirect } from '@sveltejs/kit';
import { requireAuth, requireRole } from '$lib/server/auth-helpers';
import { AppError } from '$lib/server/http';
import * as projectService from '$lib/server/services/project.service';
import * as projectEscrowService from '$lib/server/services/project-escrow.service';
import { getAccountInfo } from '$lib/server/services/financial-account.service';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, url, parent }) => {
	await parent();
	const caller = requireAuth(locals);
	requireRole(caller, 'COMPANY', 'ADMIN');

	let project;
	try {
		project = await projectService.getProject(caller, params.projectId);
	} catch (e) {
		if (e instanceof AppError) throw error(e.httpStatus, e.message);
		throw e;
	}
	if (project.status !== 'AWARDED') {
		throw redirect(303, '/dashboard/company/projects');
	}

	const account = await getAccountInfo(caller).catch(() => ({
		accountId: null,
		uvan: null,
		balance: null
	}));

	return {
		project,
		amount: project.budgetCap,
		milestones: project.milestones,
		contractorName: project.contractorNameSnapshot ?? '—',
		cancelled: url.searchParams.has('cancelled'),
		account
	};
};

export const actions: Actions = {
	fundCheckout: async ({ params, locals }) => {
		const caller = requireAuth(locals);
		let checkoutUrl: string;
		try {
			const result = await projectEscrowService.createFundingCheckoutSession(
				caller,
				params.projectId
			);
			checkoutUrl = result.url;
		} catch (e) {
			if (e instanceof AppError) return fail(e.httpStatus, { message: e.message });
			console.error('[project:fundCheckout]', e);
			return fail(500, { message: 'Could not start checkout.' });
		}
		throw redirect(303, checkoutUrl);
	},

	fundInternal: async ({ params, locals }) => {
		const caller = requireAuth(locals);
		try {
			await projectEscrowService.fundFromFinancialAccount(caller, params.projectId);
		} catch (e) {
			if (e instanceof AppError) return fail(e.httpStatus, { message: e.message });
			console.error('[project:fundInternal]', e);
			return fail(500, { message: 'Transfer failed. Please try again.' });
		}
		throw redirect(303, `/dashboard/company/projects?funded=${params.projectId}`);
	}
};
