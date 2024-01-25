import {
	devotionImageService,
	devotionReactionService,
	devotionService,
	sourceDocumentService
} from '$lib/server/services';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const [devotion, sourceDocs, images, reactionCounts] = await Promise.all([
		devotionService.getDevotion(params.id),
		sourceDocumentService.getDevotionSourceDocuments(params.id),
		devotionImageService.getDevotionImagesByDevotionId(params.id),
		devotionReactionService.getDevotionReactionCounts(params.id)
	]);

	if (!devotion) {
		throw redirect(302, '/devotions');
	}

	return {
		devotion,
		sourceDocs,
		images,
		reactionCounts
	};
};
