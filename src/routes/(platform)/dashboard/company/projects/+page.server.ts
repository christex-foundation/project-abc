import { fail } from '@sveltejs/kit';
import { requireAuth, requireRole } from '$lib/server/auth-helpers';
import { AppError } from '$lib/server/http';
import * as projectService from '$lib/server/services/project.service';
import * as projectEscrowService from '$lib/server/services/project-escrow.service';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent }) => {
	await parent();
	const caller = requireAuth(locals);
	requireRole(caller, 'COMPANY', 'ADMIN');
	const projects = await projectService.listForCompany(caller);
	return { projects };
};

function failureFor(action: 'publish' | 'delete' | 'cancel', projectId: string, e: unknown) {
	if (e instanceof AppError) {
		return fail(e.httpStatus, { action, projectId, message: e.message });
	}
	console.error(`[dashboard:project:${action}]`, e);
	return fail(500, { action, projectId, message: 'Something went wrong.' });
}

export const actions: Actions = {
	publish: async ({ request, locals, platform }) => {
		const caller = requireAuth(locals);
		const form = await request.formData();
		const projectId = String(form.get('projectId') ?? '');
		try {
			const waitUntil = platform?.context?.waitUntil;
			const enqueue = waitUntil
				? <T>(p: Promise<T>) => waitUntil(p as Promise<unknown>)
				: undefined;
			await projectService.publish(caller, projectId, enqueue);
			return { action: 'publish', projectId, success: true };
		} catch (e) {
			return failureFor('publish', projectId, e);
		}
	},
	delete: async ({ request, locals }) => {
		const caller = requireAuth(locals);
		const form = await request.formData();
		const projectId = String(form.get('projectId') ?? '');
		try {
			await projectService.deleteDraft(caller, projectId);
			return { action: 'delete', projectId, success: true };
		} catch (e) {
			return failureFor('delete', projectId, e);
		}
	},
	cancel: async ({ request, locals }) => {
		const caller = requireAuth(locals);
		const form = await request.formData();
		const projectId = String(form.get('projectId') ?? '');
		try {
			await projectEscrowService.cancelProjectWithRefund(caller, projectId);
			return { action: 'cancel', projectId, success: true };
		} catch (e) {
			return failureFor('cancel', projectId, e);
		}
	}
};
