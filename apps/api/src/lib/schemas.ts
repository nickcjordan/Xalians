// zod schemas for every request body and query string this API accepts. Response shapes
// for the user routes come from @xalians/content/schema (UserRecordSchema,
// PublicProfileSchema) rather than being redeclared here, per the "one source per data
// kind" rule; there is no ratified schema yet for a bare xalian or the legacy generated
// shape, so those routes are left unvalidated on the way out (they were unvalidated
// before this rewrite too).
import { z } from 'zod';

// GET /db/user
export const RetrieveUserQuerySchema = z.object({
  userId: z.string().min(1).optional(),
  // Accepted as a raw string and compared to the literal 'true' in the handler, matching
  // the legacy behavior (any other value, including absent, means false) rather than
  // rejecting values the frontend never sends.
  populateXalians: z.string().optional(),
});
export type RetrieveUserQuery = z.infer<typeof RetrieveUserQuerySchema>;

// PATCH /db/user
export const UpdateUserBodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('ADD_XALIAN_ID'), value: z.string().min(1) }),
  z.object({ action: z.literal('REMOVE_XALIAN_ID'), value: z.string().min(1) }),
  // z.coerce accepts the numeric-string values the client has always sent
  // (JSON.stringify({ value: '1000000' }) in the existing test suite) as well as a real
  // number, and rejects anything that is not a non-negative integer once coerced.
  z.object({ action: z.literal('REMOVE_TOKENS'), value: z.coerce.number().int().nonnegative() }),
  // ADD_TOKENS is rejected unconditionally in the handler before the delegate is ever
  // reached (token issuance is server-only); its value is intentionally unvalidated here.
  z.object({ action: z.literal('ADD_TOKENS'), value: z.unknown().optional() }),
]);
export type UpdateUserBody = z.infer<typeof UpdateUserBodySchema>;

// POST /db/xalian. Server-side generation lands in Wave D (D1, api/registry); until then
// the client still posts a full generated record, and this only pins down the two fields
// the repository's key design depends on. Everything else passes through untouched.
export const CreateXalianBodySchema = z
  .object({
    xalianId: z.string().min(1),
    speciesId: z.string().min(1),
  })
  .passthrough();
export type CreateXalianBody = z.infer<typeof CreateXalianBodySchema>;

// GET /db/xalian and GET /db/xalians both take a comma-separated xalianId query param.
export const RetrieveXalianQuerySchema = z.object({
  xalianId: z.string().min(1),
});
export type RetrieveXalianQuery = z.infer<typeof RetrieveXalianQuerySchema>;
