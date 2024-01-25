import { devotionReactions } from '@revelationsai/core/database/schema';
import {
  BadRequestResponse,
  CreatedResponse,
  InternalServerErrorResponse,
  ObjectNotFoundResponse,
  OkResponse,
  UnauthorizedResponse
} from '@revelationsai/server/lib/api-responses';
import { and, eq } from 'drizzle-orm';
import { ApiHandler } from 'sst/node/api';
import { devotionReactionService, devotionService, sessionService } from '../../../../lib/services';

export const handler = ApiHandler(async (event) => {
  const id = event.pathParameters!.id!;
  const data = JSON.parse(event.body ?? '{}');

  const { reaction, comment } = data;
  if (!reaction) {
    return BadRequestResponse('Missing required parameter: reaction');
  }

  if (!devotionReactions.reaction.enumValues.includes(reaction)) {
    return BadRequestResponse(
      `Invalid reaction: ${reaction}. Must be one of ${devotionReactions.reaction.enumValues.join(
        ', '
      )}`
    );
  }

  try {
    const devotion = await devotionService.getDevotion(id);
    if (!devotion) {
      return ObjectNotFoundResponse(id);
    }

    const { isValid, userWithRoles } = await sessionService.validApiHandlerSession();
    if (!isValid) {
      return UnauthorizedResponse('You must be signed in.');
    }

    let devoReaction = (
      await devotionReactionService.getDevotionReactions({
        where: and(
          eq(devotionReactions.devotionId, devotion.id),
          eq(devotionReactions.userId, userWithRoles.id)
        ),
        limit: 1
      })
    ).at(0);

    if (devoReaction) {
      if (devoReaction.reaction === reaction) {
        return BadRequestResponse('You have already reacted with this reaction.');
      } else {
        devoReaction.reaction = reaction;
        devoReaction = await devotionReactionService.updateDevotionReaction(devoReaction.id, {
          reaction,
          comment
        });
        return OkResponse(devoReaction);
      }
    }

    devoReaction = await devotionReactionService.createDevotionReaction({
      devotionId: devotion.id,
      userId: userWithRoles.id,
      reaction,
      comment
    });
    return CreatedResponse(devoReaction);
  } catch (err) {
    console.error(`Error reacting to devotion '${id}':`, err);
    if (err instanceof Error) {
      return InternalServerErrorResponse(`${err.message}\n${err.stack}`);
    } else {
      return InternalServerErrorResponse(JSON.stringify(err));
    }
  }
});
