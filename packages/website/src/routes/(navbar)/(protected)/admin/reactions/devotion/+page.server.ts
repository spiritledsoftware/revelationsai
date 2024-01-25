import { devotionReactionService } from '$lib/server/services';
import type { DevotionReactionInfo } from '@revelationsai/core/model/devotion/reaction';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const limit = 10;
	const reactionInfos = await devotionReactionService
		.getDevotionReactionsWithInfo({
			limit
		})
		.then((response) =>
			response.map(
				(reaction) =>
					({
						...reaction.devotion_reactions,
						user: reaction.users,
						devotion: reaction.devotions
					}) satisfies DevotionReactionInfo
			)
		);
	return {
		reactionInfos,
		limit
	};
};
