import { indexOperationService } from '$lib/server/services';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const limit = 50;
	const indexOperations = await indexOperationService.getIndexOperations({
		limit
	});
	return {
		indexOperations,
		limit
	};
};
