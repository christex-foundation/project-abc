import * as settingsService from '$lib/server/services/settings.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return { settings: await settingsService.getAll() };
};
