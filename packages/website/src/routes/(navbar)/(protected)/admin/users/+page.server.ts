import { userService } from '$lib/server/services';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const limit = 7;
	const users = await userService.getUsers({
		limit
	});
	return {
		users,
		limit
	};
};
