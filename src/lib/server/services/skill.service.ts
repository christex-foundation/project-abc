import * as skillRepo from '../repositories/skill.repo';

export async function listSkills() {
	return skillRepo.listAllWithCategories();
}
