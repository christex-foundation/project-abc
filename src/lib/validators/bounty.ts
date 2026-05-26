import { z } from 'zod';

export const BountyType = z.enum(['BOUNTY', 'PROJECT']);
export const CompensationType = z.enum(['FIXED', 'RANGE', 'VARIABLE']);

const prizeTierSchema = z.object({
	position: z.number().int().min(1).max(99),
	amount: z.number().int().min(1),
	label: z.string().max(120).nullish()
});

const bountySkillSchema = z.object({
	skillId: z.string().min(1),
	isRequired: z.boolean().default(false)
});

const eligibilityQuestionSchema = z.object({
	question: z.string().min(1).max(500),
	optional: z.boolean().default(false)
});

const dateLike = z.coerce.date();

const bountyBaseShape = {
	title: z.string().min(5).max(200),
	description: z.string().min(1).max(50_000),
	requirements: z.string().max(50_000).nullish(),
	deliverables: z.string().max(50_000).nullish(),

	type: BountyType,
	compensationType: CompensationType,
	currency: z.string().length(3).default('SLE'),

	totalPrizePool: z.number().int().min(0),
	rewardAmount: z.number().int().min(0).nullish(),
	minRewardAsk: z.number().int().min(0).nullish(),
	maxRewardAsk: z.number().int().min(0).nullish(),

	numberOfWinners: z.number().int().min(1).default(1),
	maxBonusSpots: z.number().int().min(0).default(0),

	prizeTiers: z.array(prizeTierSchema).default([]),
	skills: z.array(bountySkillSchema).default([]),
	eligibility: z.array(eligibilityQuestionSchema).default([]),

	timeToComplete: z.string().max(120).nullish(),
	submissionDeadline: dateLike,
	judgingDeadline: dateLike.nullish()
};

const bountyBaseObject = z.object(bountyBaseShape);

/**
 * Cross-field validation lives here. The same refiner is applied both to
 * the create payload and to the merged-update payload in the service so
 * `PATCH` cannot escape consistency checks.
 */
function refineBounty<T extends z.ZodObject<typeof bountyBaseShape>>(schema: T) {
	return schema.superRefine((data, ctx) => {
		if (data.submissionDeadline.getTime() <= Date.now()) {
			ctx.addIssue({
				code: 'custom',
				path: ['submissionDeadline'],
				message: 'Submission deadline must be in the future.'
			});
		}
		if (data.judgingDeadline && data.judgingDeadline <= data.submissionDeadline) {
			ctx.addIssue({
				code: 'custom',
				path: ['judgingDeadline'],
				message: 'Judging deadline must be after the submission deadline.'
			});
		}

		const positions = data.prizeTiers.map((t) => t.position);
		if (new Set(positions).size !== positions.length) {
			ctx.addIssue({
				code: 'custom',
				path: ['prizeTiers'],
				message: 'Prize tier positions must be unique.'
			});
		}

		const regularTiers = data.prizeTiers.filter((t) => t.position !== 99);
		const bonusTiers = data.prizeTiers.filter((t) => t.position === 99);

		if (data.type === 'PROJECT') {
			if (data.numberOfWinners !== 1) {
				ctx.addIssue({
					code: 'custom',
					path: ['numberOfWinners'],
					message: 'Projects must have exactly one winner.'
				});
			}
			if (regularTiers.some((t) => t.position !== 1) || bonusTiers.length > 0) {
				ctx.addIssue({
					code: 'custom',
					path: ['prizeTiers'],
					message: 'Projects only allow a single prize tier at position 1.'
				});
			}
			if (!data.timeToComplete || data.timeToComplete.trim() === '') {
				ctx.addIssue({
					code: 'custom',
					path: ['timeToComplete'],
					message: 'Projects require a time-to-complete estimate.'
				});
			}
		}

		if (data.type === 'BOUNTY') {
			const expectedRegular = Array.from({ length: data.numberOfWinners }, (_, i) => i + 1);
			const regularPositions = regularTiers.map((t) => t.position).sort((a, b) => a - b);
			if (
				regularPositions.length !== expectedRegular.length ||
				!expectedRegular.every((p, i) => regularPositions[i] === p)
			) {
				ctx.addIssue({
					code: 'custom',
					path: ['prizeTiers'],
					message: `Bounty must define tiers for positions 1..${data.numberOfWinners}.`
				});
			}
			if (bonusTiers.length > data.maxBonusSpots) {
				ctx.addIssue({
					code: 'custom',
					path: ['prizeTiers'],
					message: `Bonus tiers (${bonusTiers.length}) exceed maxBonusSpots (${data.maxBonusSpots}).`
				});
			}
		}

		if (data.compensationType === 'FIXED') {
			const regularSum = regularTiers.reduce((s, t) => s + t.amount, 0);
			// Each bonus tier amount is paid up to `maxBonusSpots` times.
			const bonusSum = bonusTiers.reduce((s, t) => s + t.amount * data.maxBonusSpots, 0);
			if (regularSum + bonusSum !== data.totalPrizePool) {
				ctx.addIssue({
					code: 'custom',
					path: ['totalPrizePool'],
					message: `totalPrizePool (${data.totalPrizePool}) must equal regular tiers (${regularSum}) plus bonus capacity (${bonusSum}).`
				});
			}
		}

		if (data.compensationType === 'RANGE') {
			if (data.minRewardAsk == null || data.maxRewardAsk == null) {
				ctx.addIssue({
					code: 'custom',
					path: ['minRewardAsk'],
					message: 'Range compensation requires both minRewardAsk and maxRewardAsk.'
				});
			} else if (data.minRewardAsk > data.maxRewardAsk) {
				ctx.addIssue({
					code: 'custom',
					path: ['minRewardAsk'],
					message: 'minRewardAsk must be ≤ maxRewardAsk.'
				});
			}
		}
	});
}

export const createBountyInput = refineBounty(bountyBaseObject);
export type CreateBountyInput = z.infer<typeof createBountyInput>;

export const updateBountyInput = bountyBaseObject.partial();
export type UpdateBountyInput = z.infer<typeof updateBountyInput>;

/**
 * Used inside the service after merging the partial update onto the
 * existing bounty — re-runs cross-field validation on the merged state.
 */
export const mergedBountyInput = refineBounty(bountyBaseObject);

export const bountyListQuery = z.object({
	type: BountyType.optional(),
	compensationType: CompensationType.optional(),
	skillIds: z
		.union([z.string(), z.array(z.string())])
		.transform((v) => (Array.isArray(v) ? v : v.split(',').filter(Boolean)))
		.optional(),
	minPrize: z.coerce.number().int().min(0).optional(),
	maxPrize: z.coerce.number().int().min(0).optional(),
	beforeDeadline: z.coerce.date().optional(),
	search: z.string().max(200).optional(),
	page: z.coerce.number().int().min(1).default(1),
	pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

export type BountyListQuery = z.infer<typeof bountyListQuery>;
