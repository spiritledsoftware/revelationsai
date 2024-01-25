import { devotionService } from '$lib/server/services';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async () => {
	const devotions = await devotionService.getDevotions({
		limit: 7
	});
	return {
		devotions
	};
};
