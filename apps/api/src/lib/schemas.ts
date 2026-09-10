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

// PATCH /db/user. Reduced to REMOVE_XALIAN_ID (D1 / decision 6 in
// docs/design/backend-modernization-plan.md): keeping is now the server-side effect of
// POST /db/xalian (see createXalian.ts), so ADD_XALIAN_ID is no longer a client action,
// and token accounting (ADD_TOKENS, REMOVE_TOKENS) is server-only. All three still parse
// here (so the handler can return a consistent 403 FORBIDDEN_ACTION rather than a 400
// BAD_REQUEST for a client still sending the old shape) but only REMOVE_XALIAN_ID is
// permitted past the handler's guard.
export const UpdateUserBodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('REMOVE_XALIAN_ID'), value: z.string().min(1) }),
  z.object({ action: z.literal('ADD_XALIAN_ID'), value: z.string().min(1) }),
  // z.coerce accepts the numeric-string values the client has always sent
  // (JSON.stringify({ value: '1000000' }) in the existing test suite) as well as a real
  // number, and rejects anything that is not a non-negative integer once coerced.
  z.object({ action: z.literal('REMOVE_TOKENS'), value: z.coerce.number().int().nonnegative() }),
  z.object({ action: z.literal('ADD_TOKENS'), value: z.unknown().optional() }),
]);
export type UpdateUserBody = z.infer<typeof UpdateUserBodySchema>;

// POST /db/xalian (the "keep" flow, D1 / audit F2). The body is the exact envelope
// GET /xalian returned: the legacy translated shape plus the HMAC signature over it. The
// handler verifies the signature and the createTimestamp freshness before persisting, so
// a client can no longer keep a record it fabricated or tampered with. `xalian` is only
// pinned down on the two fields the repository's key design depends on (xalianId,
// speciesId) plus createTimestamp (needed for the freshness check); everything else
// passes through untouched, same as the legacy body did.
export const KeepXalianBodySchema = z.object({
  xalian: z
    .object({
      xalianId: z.string().min(1),
      speciesId: z.string().min(1),
      createTimestamp: z.number(),
    })
    .passthrough(),
  signature: z.string().min(1),
});
export type KeepXalianBody = z.infer<typeof KeepXalianBodySchema>;

// GET /db/xalian and GET /db/xalians both take a comma-separated xalianId query param.
export const RetrieveXalianQuerySchema = z.object({
  xalianId: z.string().min(1),
});
export type RetrieveXalianQuery = z.infer<typeof RetrieveXalianQuerySchema>;

// POST /xalians (D1, the registry). species is optional; when given it must be a
// ratified species key (checked against @xalians/rules's getSpeciesTemplates() in the
// handler, not here, since that is a runtime lookup against the bundled templates, not a
// static shape check). Omitted, the handler draws one uniformly.
export const GenerateRegistryXalianBodySchema = z.object({
  species: z.string().min(1).optional(),
});
export type GenerateRegistryXalianBody = z.infer<typeof GenerateRegistryXalianBodySchema>;

// GET /xalians. Without ownerId, lists the caller's own records; with ownerId, lists that
// owner's (registry records are public, like the legacy collection view). limit is
// coerced from the query string and capped the same way the repository caps it.
export const ListRegistryXaliansQuerySchema = z.object({
  ownerId: z.string().min(1).optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
  cursor: z.string().min(1).optional(),
});
export type ListRegistryXaliansQuery = z.infer<typeof ListRegistryXaliansQuerySchema>;

// GET /xalians/{xalianId}
export const RetrieveRegistryXalianParamsSchema = z.object({
  xalianId: z.string().min(1),
});
export type RetrieveRegistryXalianParams = z.infer<typeof RetrieveRegistryXalianParamsSchema>;
