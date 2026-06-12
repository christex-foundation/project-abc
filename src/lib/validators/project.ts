import { z } from 'zod';
import { PROVINCE_VALUES, DISTRICT_VALUES, districtBelongsToProvince } from '$lib/constants/geo';
import { accessPinSchema } from './bounty';

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
	milestones: z.array(projectMilestoneSchema).min(1).max(20),

	// Access control. `targetProvinces` empty = open nationwide. `targetDistricts`
	// refines the provincial lock; every chosen district must belong to a chosen
	// province (enforced in `refineProject`). `accessPin` is the raw PIN; the
	// service hashes it before storage and never reads it back (on update, omit the
	// key to leave the existing PIN unchanged, or send null / '' to clear it).
	targetProvinces: z.array(z.enum(PROVINCE_VALUES)).max(5).default([]),
	targetDistricts: z.array(z.enum(DISTRICT_VALUES)).max(16).default([]),
	accessPin: accessPinSchema.or(z.literal('')).nullish()
};

const projectBaseObject = z.object(projectBaseShape);

/**
 * Cross-field validation. Applied to the create payload and to the merged-update
 * payload in the service so `PATCH` cannot escape consistency checks.
 */
function refineProject<T extends z.ZodObject<typeof projectBaseShape>>(schema: T) {
	return schema.superRefine((data, ctx) => {
		// Districts refine provinces: every targeted district must belong to a
		// targeted province.
		for (const district of data.targetDistricts) {
			if (!data.targetProvinces.some((p) => districtBelongsToProvince(district, p))) {
				ctx.addIssue({
					code: 'custom',
					path: ['targetDistricts'],
					message: 'District does not belong to a selected province.'
				});
				break;
			}
		}
	});
}

export const createProjectInput = refineProject(projectBaseObject);
export type CreateProjectInput = z.infer<typeof createProjectInput>;

export const updateProjectInput = projectBaseObject.partial();
export type UpdateProjectInput = z.infer<typeof updateProjectInput>;

/**
 * Re-validate the merged state after applying a partial update in the service,
 * so PATCH cannot escape the base constraints.
 */
export const mergedProjectInput = refineProject(projectBaseObject);

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
