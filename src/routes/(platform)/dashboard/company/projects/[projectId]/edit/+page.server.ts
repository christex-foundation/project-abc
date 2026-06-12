import { error, redirect } from '@sveltejs/kit';
import { requireAuth, requireRole } from '$lib/server/auth-helpers';
import { AppError } from '$lib/server/http';
import * as projectService from '$lib/server/services/project.service';
import * as skillService from '$lib/server/services/skill.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, parent }) => {
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

	const editable =
		project.status === 'DRAFT' ||
		(project.status === 'AWARDED' && project.escrowFundedAmount === 0);
	if (!editable) {
		throw redirect(303, '/dashboard/company/projects');
	}

	const categories = await skillService.listSkills();

	return {
		project,
		categories,
		initial: {
			title: project.title,
			description: project.description,
			requirements: project.requirements ?? '',
			deliverables: project.deliverables ?? '',
			currency: project.currency,
			timeToComplete: project.timeToComplete ?? '',
			skills: project.skills.map((s) => ({ skillId: s.skill.id, isRequired: s.isRequired })),
			milestones: project.milestones.map((m) => ({
				title: m.title,
				amount: m.amount as number | '',
				description: m.description ?? '',
				dueInDays: (m.dueInDays ?? '') as number | ''
			})),
			targetProvinces: project.targetProvinces,
			// Never prefilled — the stored PIN hash is never read back.
			accessPin: ''
		}
	};
};
