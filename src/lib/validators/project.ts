import { z } from 'zod';

/**
 * Project = an ongoing one-company-one-contractor engagement. Unlike a bounty,
 * a project has no prize tiers or compensation mode at creation — the company
 * posts scope + a budget ceiling, and applicants propose their own milestone
 * breakdown (see `proposal.ts`). The winning proposal's total must be ≤ budgetCap.
 */

const projectSkillSchema = z.object({
	skillId: z.string().min(1),
	isRequired: z.boolean().default(false)
});

/**
 * Company-defined milestone plan. Position = array order (1-based). The sum of
 * `amount`s becomes the project's total budget and the escrow amount.
 */
export const projectMilestoneSchema = z.object({
	title: z.string().min(3).max(200),
	description: z.string().max(20_000).nullish(),
	amount: z.number().int().min(1), // minor units, > 0
	dueInDays: z.number().int().min(1).max(3650).nullish()
});

const projectBaseShape = {
	title: z.string().min(5).max(200),
	description: z.string().min(1).max(50_000),
	requirements: z.string().max(50_000).nullish(),
	deliverables: z.string().max(50_000).nullish(),

	currency: z.string().length(3).default('SLE'),

	timeToComplete: z.string().max(120).nullish(),

	skills: z.array(projectSkillSchema).default([]),
	milestones: z.array(projectMilestoneSchema).min(1).max(20)
};

const projectBaseObject = z.object(projectBaseShape);

export const createProjectInput = projectBaseObject;
export type CreateProjectInput = z.infer<typeof createProjectInput>;

export const updateProjectInput = projectBaseObject.partial();
export type UpdateProjectInput = z.infer<typeof updateProjectInput>;

/**
 * Re-validate the merged state after applying a partial update in the service,
 * so PATCH cannot escape the base constraints.
 */
export const mergedProjectInput = projectBaseObject;

export const projectListQuery = z.object({
	skillIds: z
		.union([z.string(), z.array(z.string())])
		.transform((v) => (Array.isArray(v) ? v : v.split(',').filter(Boolean)))
		.optional(),
	minBudget: z.coerce.number().int().min(0).optional(),
	maxBudget: z.coerce.number().int().min(0).optional(),
	search: z.string().max(200).optional(),
	page: z.coerce.number().int().min(1).default(1),
	pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

export type ProjectListQuery = z.infer<typeof projectListQuery>;
