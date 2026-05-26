import { AppError } from '../http';
import { requireRole, type AuthedUser } from '../auth-helpers';
import * as skillRepo from '../repositories/skill.repo';

function slugify(s: string): string {
	return s
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80);
}

export async function listSkills() {
	return skillRepo.listAllWithCategories();
}

export async function createCategory(caller: AuthedUser, input: { name: string }) {
	requireRole(caller, 'ADMIN');
	const name = input.name?.trim();
	if (!name || name.length > 80) {
		throw new AppError('BAD_REQUEST', 'Category name is required (≤80 chars).');
	}
	const slug = slugify(name);
	if (!slug) throw new AppError('BAD_REQUEST', 'Category name must contain letters or digits.');
	const existing = await skillRepo.findCategoryBySlug(slug);
	if (existing) throw new AppError('CONFLICT', 'A category with this name already exists.');
	return skillRepo.createCategory({ name, slug });
}

export async function createSkill(caller: AuthedUser, input: { name: string; categoryId: string }) {
	requireRole(caller, 'ADMIN');
	const name = input.name?.trim();
	if (!name || name.length > 80) {
		throw new AppError('BAD_REQUEST', 'Skill name is required (≤80 chars).');
	}
	if (!input.categoryId) {
		throw new AppError('BAD_REQUEST', 'categoryId is required.');
	}
	const cat = await skillRepo.findCategoryById(input.categoryId);
	if (!cat) throw new AppError('NOT_FOUND', 'Category not found.');
	const slug = slugify(name);
	if (!slug) throw new AppError('BAD_REQUEST', 'Skill name must contain letters or digits.');
	const existing = await skillRepo.findBySlug(slug);
	if (existing) throw new AppError('CONFLICT', 'A skill with this name already exists.');
	return skillRepo.createSkill({ name, slug, categoryId: cat.id });
}

export async function renameSkill(
	caller: AuthedUser,
	id: string,
	input: { name?: string; categoryId?: string }
) {
	requireRole(caller, 'ADMIN');
	const skill = await skillRepo.findById(id);
	if (!skill) throw new AppError('NOT_FOUND', 'Skill not found.');

	const data: { name?: string; slug?: string; categoryId?: string } = {};
	if (input.name !== undefined) {
		const name = input.name.trim();
		if (!name || name.length > 80) {
			throw new AppError('BAD_REQUEST', 'Skill name is required (≤80 chars).');
		}
		const slug = slugify(name);
		if (!slug) throw new AppError('BAD_REQUEST', 'Skill name must contain letters or digits.');
		if (slug !== skill.slug) {
			const clash = await skillRepo.findBySlug(slug);
			if (clash) throw new AppError('CONFLICT', 'A skill with this name already exists.');
		}
		data.name = name;
		data.slug = slug;
	}
	if (input.categoryId !== undefined) {
		const cat = await skillRepo.findCategoryById(input.categoryId);
		if (!cat) throw new AppError('NOT_FOUND', 'Category not found.');
		data.categoryId = cat.id;
	}
	if (Object.keys(data).length === 0) {
		throw new AppError('BAD_REQUEST', 'Provide a name or categoryId to update.');
	}
	return skillRepo.updateSkill(id, data);
}

export async function deleteSkill(caller: AuthedUser, id: string) {
	requireRole(caller, 'ADMIN');
	const skill = await skillRepo.findById(id);
	if (!skill) throw new AppError('NOT_FOUND', 'Skill not found.');
	const refs = await skillRepo.countSkillReferences(id);
	if (refs > 0) {
		throw new AppError('CONFLICT', `Cannot delete: ${refs} freelancer/bounty references exist.`);
	}
	await skillRepo.deleteSkill(id);
}
