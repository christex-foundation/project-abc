import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => {
	return {
		user: locals.user,
		settings: locals.settings,
		isAdminHost: locals.isAdminHost
	};
};
