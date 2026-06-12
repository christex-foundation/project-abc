import { ProjectStatus, type FreelancerProfile } from '@prisma/client';
import { prisma } from '../db';
import { AppError } from '../http';
import { requireRole, type AuthedUser } from '../auth-helpers';
import { sanitizeRichText } from '../sanitize';
import { hashPin, verifyPin } from '../access-lock';
import { provincesLabel } from '$lib/constants/geo';
import * as projectRepo from '../repositories/project.repo';
import type { ProjectForCompany } from '../repositories/project.repo';
import * as projectSkillRepo from '../repositories/projectSkill.repo';
import * as milestoneRepo from '../repositories/milestone.repo';
import * as companyRepo from '../repositories/company.repo';
import * as freelancerRepo from '../repositories/freelancer.repo';
import * as skillRepo from '../repositories/skill.repo';
import * as matchingService from './matching.service';
import * as notification from './notification.service';
import {
	createProjectInput,
	mergedProjectInput,
	projectListQuery,
	type CreateProjectInput,
	type UpdateProjectInput,
	type ProjectListQuery
} from '$lib/validators/project';

function appUrl(): string {
	return process.env.PUBLIC_APP_URL?.trim() || 'http://localhost:5173';
}

type Enqueue = <T>(p: Promise<T>) => void;
const inlineEnqueue: Enqueue = (p) => {
	void p.catch((err) => console.error('[project.service] background task failed', err));
};

const SLUG_MAX = 80;

function slugify(input: string): string {
	return input
		.toLowerCase()
		.trim()
		.replace(/[^\p{L}\p{N}\s-]/gu, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.slice(0, SLUG_MAX);
}

async function uniqueSlug(base: string): Promise<string> {
	const seed = slugify(base) || 'project';
	if (!(await projectRepo.slugExists(seed))) return seed;
	const suffix = Math.random().toString(36).slice(2, 8);
	return `${seed.slice(0, SLUG_MAX - suffix.length - 1)}-${suffix}`;
}

function sanitizePayloadFields<
	T extends Pick<CreateProjectInput, 'description' | 'requirements' | 'deliverables'>
>(input: T): T {
	return {
		...input,
		description: sanitizeRichText(input.description),
		requirements: input.requirements != null ? sanitizeRichText(input.requirements) : null,
		deliverables: input.deliverables != null ? sanitizeRichText(input.deliverables) : null
	};
}

async function resolveCompanyProfileId(caller: AuthedUser): Promise<string> {
	const profile = await companyRepo.findByUserId(caller.id);
	if (!profile) {
		throw new AppError(
			'CONFLICT',
			'You must have a company profile to create projects. Contact an admin.'
		);
	}
	return profile.id;
}

async function ensureSkillsExist(skillIds: string[]): Promise<void> {
	if (skillIds.length === 0) return;
	const found = await skillRepo.findByIds(skillIds);
	if (found.length !== skillIds.length) {
		throw new AppError('BAD_REQUEST', 'One or more skills do not exist.');
	}
}

/** Owner-or-admin guard; returns the loaded project (throws if missing/forbidden). */
async function loadOwnedProject(caller: AuthedUser, id: string) {
	const existing = await projectRepo.findProjectById(id);
	if (!existing) throw new AppError('NOT_FOUND', 'Project not found.');
	if (caller.role !== 'ADMIN') {
		const profile = await companyRepo.findByUserId(caller.id);
		if (!profile || profile.id !== existing.companyProfileId) {
			throw new AppError('FORBIDDEN', 'You do not own this project.');
		}
	}
	return existing;
}

export async function createProject(caller: AuthedUser, raw: unknown) {
	requireRole(caller, 'COMPANY');
	const parsed = createProjectInput.parse(raw);
	const companyProfileId = await resolveCompanyProfileId(caller);
	const skillIds = parsed.skills.map((s) => s.skillId);
	await ensureSkillsExist(skillIds);

	const sanitized = sanitizePayloadFields(parsed);
	const milestones = buildMilestonePlan(parsed.milestones);
	const total = milestones.reduce((s, m) => s + m.amount, 0);
	const slug = await uniqueSlug(sanitized.title);

	const project = await prisma.$transaction(async (tx) => {
		const created = await tx.project.create({
			data: {
				slug,
				title: sanitized.title,
				description: sanitized.description,
				requirements: sanitized.requirements ?? null,
				deliverables: sanitized.deliverables ?? null,
				status: ProjectStatus.DRAFT,
				currency: sanitized.currency,
				budgetCap: total,
				targetProvinces: sanitized.targetProvinces,
				accessPinHash: sanitized.accessPin ? await hashPin(sanitized.accessPin) : null,
				timeToComplete: sanitized.timeToComplete ?? null,
				company: { connect: { id: companyProfileId } }
			},
			select: { id: true }
		});
		await projectSkillRepo.replaceAllForProject(tx, created.id, sanitized.skills);
		await milestoneRepo.createManyForProject(created.id, milestones, tx);
		return created;
	});

	const full = await projectRepo.findProjectById(project.id);
	if (!full) throw new AppError('INTERNAL', 'Failed to load created project.');
	return full;
}

/** Normalise the company's milestone plan: 1-based positions + sanitised descriptions. */
function buildMilestonePlan(
	rows: CreateProjectInput['milestones']
): milestoneRepo.MilestonePlanInput[] {
	return rows.map((m, i) => ({
		position: i + 1,
		title: m.title,
		description: m.description ? sanitizeRichText(m.description) : null,
		amount: m.amount,
		dueInDays: m.dueInDays ?? null
	}));
}

export async function updateProject(caller: AuthedUser, id: string, raw: unknown) {
	requireRole(caller, 'COMPANY', 'ADMIN');
	const existing = await loadOwnedProject(caller, id);
	// Editable while DRAFT, and during the AWARDED-but-unfunded window (so the
	// company can adjust the plan with the chosen contractor before work starts).
	const editable =
		existing.status === ProjectStatus.DRAFT ||
		(existing.status === ProjectStatus.AWARDED && existing.escrowFundedAmount === 0);
	if (!editable) {
		throw new AppError(
			'CONFLICT',
			'Projects can only be edited while in draft or after award before funding.'
		);
	}

	const existingMilestones = await milestoneRepo.listForProject(id);
	const merged = {
		title: existing.title,
		description: existing.description,
		requirements: existing.requirements,
		deliverables: existing.deliverables,
		currency: existing.currency,
		timeToComplete: existing.timeToComplete,
		targetProvinces: existing.targetProvinces,
		skills: existing.skills.map((s) => ({ skillId: s.skill.id, isRequired: s.isRequired })),
		milestones: existingMilestones.map((m) => ({
			title: m.title,
			description: m.description,
			amount: m.amount,
			dueInDays: m.dueInDays
		})),
		...(raw as Record<string, unknown>)
	};
	const validated = mergedProjectInput.parse(merged) as CreateProjectInput;
	await ensureSkillsExist(validated.skills.map((s) => s.skillId));
	const sanitized = sanitizePayloadFields(validated);
	const milestones = buildMilestonePlan(validated.milestones);
	const total = milestones.reduce((s, m) => s + m.amount, 0);

	// PIN directive: omit the `accessPin` key to leave the existing PIN untouched;
	// send a string to set a new one; send null / '' to clear it. The stored hash
	// is never read back into plaintext, so it can't round-trip through the merge.
	const rawObj = (raw ?? {}) as Record<string, unknown>;
	let accessPinHashUpdate: string | null | undefined;
	if ('accessPin' in rawObj) {
		accessPinHashUpdate =
			validated.accessPin == null || validated.accessPin === ''
				? null
				: await hashPin(validated.accessPin);
	}

	await prisma.$transaction(async (tx) => {
		await tx.project.update({
			where: { id },
			data: {
				title: sanitized.title,
				description: sanitized.description,
				requirements: sanitized.requirements ?? null,
				deliverables: sanitized.deliverables ?? null,
				currency: sanitized.currency,
				budgetCap: total,
				targetProvinces: sanitized.targetProvinces,
				...(accessPinHashUpdate !== undefined ? { accessPinHash: accessPinHashUpdate } : {}),
				timeToComplete: sanitized.timeToComplete ?? null
			}
		});
		await projectSkillRepo.replaceAllForProject(tx, id, sanitized.skills);
		await milestoneRepo.replaceAllForProject(id, milestones, tx);
	});

	const full = await projectRepo.findProjectById(id);
	if (!full) throw new AppError('INTERNAL', 'Failed to reload project.');
	return full;
}

export async function deleteDraft(caller: AuthedUser, id: string) {
	requireRole(caller, 'COMPANY', 'ADMIN');
	const existing = await loadOwnedProject(caller, id);
	if (existing.status !== ProjectStatus.DRAFT) {
		throw new AppError('CONFLICT', 'Only DRAFT projects may be deleted.');
	}
	await projectRepo.deleteProject(id);
}

export async function listProjects(raw: unknown) {
	const filters = projectListQuery.parse(raw) as ProjectListQuery;
	return projectRepo.listPublicProjects(filters);
}

/**
 * Public/freelancer-facing view of a project. Strips the raw `accessPinHash`
 * (exposing only the `isPinLocked` boolean) and, when `locked`, blanks the rich
 * content so a PIN-gated project stays a discoverable teaser (title, sponsor,
 * budget, region) without leaking its brief.
 */
export type ProjectView = Omit<ProjectForCompany, 'accessPinHash'> & {
	isPinLocked: boolean;
	locked: boolean;
};

function toView(project: ProjectForCompany, locked: boolean): ProjectView {
	const { accessPinHash, ...rest } = project;
	const isPinLocked = !!accessPinHash;
	if (locked) {
		return {
			...rest,
			description: '',
			requirements: null,
			deliverables: null,
			skills: [],
			milestones: [],
			isPinLocked,
			locked: true
		};
	}
	return { ...rest, isPinLocked, locked: false };
}

/**
 * Get a project by id or slug.
 *  - DRAFT / CANCELLED: visible only to the owner or an ADMIN.
 *  - PIN-locked: non-owners get a blanked "locked" teaser unless the project id
 *    is in `opts.unlockedIds` (resolved from the signed unlock cookie by the route).
 */
export async function getProject(
	caller: AuthedUser | null,
	idOrSlug: string,
	opts: { unlockedIds?: string[] } = {}
): Promise<ProjectView> {
	const isCuid = /^c[a-z0-9]{20,}$/i.test(idOrSlug);
	const project = isCuid
		? await projectRepo.findProjectById(idOrSlug)
		: await projectRepo.findProjectBySlug(idOrSlug);
	if (!project) throw new AppError('NOT_FOUND', 'Project not found.');

	const privileged = await isOwner(caller, project.companyProfileId);

	if (project.status === ProjectStatus.DRAFT || project.status === ProjectStatus.CANCELLED) {
		if (!privileged) throw new AppError('NOT_FOUND', 'Project not found.');
		return toView(project, false);
	}

	// PIN gate (owners/admins bypass).
	if (project.accessPinHash && !privileged) {
		const unlocked = opts.unlockedIds?.includes(project.id) ?? false;
		if (!unlocked) return toView(project, true);
	}
	return toView(project, false);
}

/**
 * Enforce the two access gates a project can carry, at proposal-submission time:
 *  - PIN lock: the visitor must have unlocked the project (proven the PIN). The
 *    `unlocked` flag is resolved by the route from the signed unlock cookie.
 *  - Provincial targeting: when `targetProvinces` is non-empty, the freelancer's
 *    profile province must be set and be one of them.
 */
export function enforceAccessGates(
	project: Pick<ProjectForCompany, 'accessPinHash' | 'targetProvinces'>,
	freelancer: Pick<FreelancerProfile, 'province'>,
	unlocked: boolean
) {
	if (project.accessPinHash && !unlocked) {
		throw new AppError('FORBIDDEN', 'Enter the access PIN to apply to this project.');
	}
	if (project.targetProvinces.length > 0) {
		if (!freelancer.province) {
			throw new AppError(
				'FORBIDDEN',
				`This project is open to ${provincesLabel(project.targetProvinces)} only. Set your province in your profile to apply.`
			);
		}
		if (!project.targetProvinces.includes(freelancer.province)) {
			throw new AppError(
				'FORBIDDEN',
				`This project is open to freelancers in ${provincesLabel(project.targetProvinces)} only.`
			);
		}
	}
}

/**
 * Verify a PIN for a project. Returns the project id on success so the route can
 * record the unlock in the signed cookie. Anyone with the PIN may unlock — no
 * auth required (applying still requires a freelancer account separately).
 */
export async function unlockProject(idOrSlug: string, pin: string): Promise<{ projectId: string }> {
	const isCuid = /^c[a-z0-9]{20,}$/i.test(idOrSlug);
	const project = isCuid
		? await projectRepo.findProjectById(idOrSlug)
		: await projectRepo.findProjectBySlug(idOrSlug);
	if (!project) throw new AppError('NOT_FOUND', 'Project not found.');
	if (!project.accessPinHash) return { projectId: project.id };
	if (!pin || !(await verifyPin(pin, project.accessPinHash))) {
		throw new AppError('FORBIDDEN', 'Incorrect PIN.');
	}
	return { projectId: project.id };
}

/**
 * Whether the caller is the owning company (or an admin) for a project. Used by
 * the public project page to decide if it should surface the owner-only
 * "View proposals" call-to-action. Mirrors the guards in `loadOwnedProject` and
 * `proposal.service.ownsProject`.
 */
export async function isOwner(
	caller: AuthedUser | null,
	companyProfileId: string | null
): Promise<boolean> {
	if (!caller) return false;
	if (caller.role === 'ADMIN') return true;
	if (!companyProfileId) return false;
	const profile = await companyRepo.findByUserId(caller.id);
	return !!profile && profile.id === companyProfileId;
}

export async function listForCompany(caller: AuthedUser) {
	requireRole(caller, 'COMPANY');
	const profile = await companyRepo.findByUserId(caller.id);
	if (!profile) return [];
	return projectRepo.listForCompany(profile.id);
}

export async function listForContractor(caller: AuthedUser) {
	requireRole(caller, 'FREELANCER');
	const profile = await freelancerRepo.findByUserId(caller.id);
	if (!profile) return [];
	return projectRepo.listForContractor(profile.id);
}

export type WorkspaceRole = 'OWNER' | 'CONTRACTOR' | 'ADMIN';

/**
 * The shared milestone workspace, accessible to BOTH the owning company and the
 * awarded contractor (and admins). Returns the project, its milestone threads,
 * and the caller's role so the page can render role-appropriate actions.
 */
export async function getWorkspace(caller: AuthedUser, idOrSlug: string) {
	const isCuid = /^c[a-z0-9]{20,}$/i.test(idOrSlug);
	const project = isCuid
		? await projectRepo.findProjectById(idOrSlug)
		: await projectRepo.findProjectBySlug(idOrSlug);
	if (!project) throw new AppError('NOT_FOUND', 'Project not found.');

	let role: WorkspaceRole | null = null;
	if (caller.role === 'ADMIN') {
		role = 'ADMIN';
	} else if (caller.role === 'COMPANY') {
		const profile = await companyRepo.findByUserId(caller.id);
		if (profile && profile.id === project.companyProfileId) role = 'OWNER';
	} else if (caller.role === 'FREELANCER') {
		const profile = await freelancerRepo.findByUserId(caller.id);
		if (profile && profile.id === project.contractorProfileId) role = 'CONTRACTOR';
	}
	if (!role) throw new AppError('FORBIDDEN', 'You do not have access to this project workspace.');

	const milestones = await milestoneRepo.listForProject(project.id);
	return { project, milestones, role };
}

export async function publish(caller: AuthedUser, id: string, enqueue: Enqueue = inlineEnqueue) {
	requireRole(caller, 'COMPANY', 'ADMIN');
	const existing = await loadOwnedProject(caller, id);
	if (existing.status !== ProjectStatus.DRAFT) {
		throw new AppError('CONFLICT', 'Only DRAFT projects may be published.');
	}
	await projectRepo.markPublished(id);

	// Recompute the embedding, THEN fan out matched-freelancer notifications.
	// Sequential because findMatchesForProject depends on the freshly persisted
	// embedding. Fire-and-forget via waitUntil (Vercel) or inline (Node/dev).
	enqueue(
		matchingService
			.recomputeProjectEmbedding(id)
			.then(() => fanOutProjectPublished(id))
			.catch((e) => console.error('[project.service] publish fan-out failed', e))
	);

	const full = await projectRepo.findProjectById(id);
	if (!full) throw new AppError('INTERNAL', 'Failed to reload project.');
	return full;
}

async function fanOutProjectPublished(projectId: string) {
	const project = await projectRepo.findProjectById(projectId);
	if (!project) return;
	const matches = await matchingService.findMatchesForProject(projectId, 30);
	if (matches.length === 0) return;
	const projectUrl = `${appUrl()}/projects/${project.slug}`;
	await Promise.allSettled(
		matches.map((m) =>
			notification.dispatch(m.userId, 'PROJECT_PUBLISHED', {
				title: 'New project matched to you',
				message: `"${project.title}" is now open for proposals on FOW.`,
				link: `/projects/${project.slug}`,
				email: {
					freelancerName: m.displayName,
					projectTitle: project.title,
					projectUrl
				}
			})
		)
	);
}

export type { UpdateProjectInput };
