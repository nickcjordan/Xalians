import { ARCADE_AWARDS, verifyArcadeCompletion, type ArcadeCompletion } from '@xalians/rules/arcade';
import { ApiError, withApi } from '../lib/api.ts';
import { ArcadeCompleteBodySchema } from '../lib/schemas.ts';
import * as usersRepo from '../repositories/users.ts';
import * as log from '../lib/log.ts';

export const handler = withApi(
  async ({ subject, body, requestId }) => {
    const ownerId = subject as string;
    const { sessionId, ...completion } = body;
    if (!verifyArcadeCompletion(completion as ArcadeCompletion)) {
      throw new ApiError(400, 'INVALID_COMPLETION', 'The submitted moves do not replay to a win.');
    }

    const day = new Date().toISOString().slice(0, 10);
    const result = await usersRepo.awardArcadeCredits(ownerId, day, sessionId, ARCADE_AWARDS[body.gameId]);
    log.info('completeArcade success', {
      requestId,
      ownerId,
      gameId: body.gameId,
      awardedCredits: result.awardedCredits,
      tokensAwarded: result.tokensAwarded,
      duplicate: result.duplicate,
    });
    return { status: 200, body: result };
  },
  { auth: 'jwt', body: ArcadeCompleteBodySchema }
);
