import { aiResponseReactionService } from '$lib/server/services';
import type { AiResponseReactionInfo } from '@revelationsai/core/model/ai-response/reaction';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const limit = 10;
	const reactionInfos = await aiResponseReactionService
		.getAiResponseReactionsWithInfo({
			limit
		})
		.then((response) =>
			response.map(
				(reaction) =>
					({
						...reaction.ai_response_reactions,
						user: reaction.users,
						response: reaction.ai_responses
					}) satisfies AiResponseReactionInfo
			)
		);
	return {
		reactionInfos,
		limit
	};
};
