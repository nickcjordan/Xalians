// POST /db/xalian. The keep flow (audit F2 / D1): the body is the exact { xalian,
// signature } envelope GET /xalian returned. This verifies the signature (so the stats
// are provably the ones the server generated, not ones the client edited), requires the
// record to be fresh (so a signature cannot be replayed indefinitely), persists it, then
// appends the id to the caller's user record -- all in one call. The old two-call flow
// (POST /db/xalian trusting the body, then a separate PATCH /db/user ADD_XALIAN_ID) is
// gone; ADD_XALIAN_ID is now rejected everywhere else (see updateUser.ts).
import { ApiError, withApi } from '../lib/api.ts';
import { KeepXalianBodySchema } from '../lib/schemas.ts';
import { verifyRecord } from '../lib/signing.ts';
import * as xaliansRepo from '../repositories/xalians.ts';
import * as usersRepo from '../repositories/users.ts';
import * as log from '../lib/log.ts';

const SIGNATURE_TTL_MS = 24 * 60 * 60 * 1000;

export const handler = withApi(
  async ({ subject, body, requestId }) => {
    const userId = subject as string;
    const { xalian, signature } = body;

    if (!verifyRecord(xalian, signature)) {
      throw new ApiError(400, 'INVALID_SIGNATURE', 'Xalian signature does not verify');
    }

    const age = Date.now() - xalian.createTimestamp;
    if (age > SIGNATURE_TTL_MS || age < 0) {
      throw new ApiError(400, 'SIGNATURE_EXPIRED', 'Xalian signature is more than 24 hours old');
    }

    try {
      await xaliansRepo.createXalian(xalian);
    } catch (err) {
      if (err instanceof xaliansRepo.XalianAlreadyExistsError) {
        throw new ApiError(409, 'ALREADY_KEPT', err.message);
      }
      throw err;
    }

    await usersRepo.addXalianId(userId, xalian.xalianId);

    log.info('createXalian success', { requestId, userId, xalianId: xalian.xalianId });
    return { status: 200, body: { message: 'ok', xalianId: xalian.xalianId } };
  },
  { auth: 'jwt', body: KeepXalianBodySchema }
);
