// zod schemas for every request body, query string and path parameter this API accepts.
// Response shapes come from @xalians/content/schema (XalianRecordSchema, UserRecordSchema,
// PublicProfileSchema) rather than being redeclared here, per the "one source per data
// kind" rule.
import { z } from 'zod';

// GET /db/user
export const RetrieveUserQuerySchema = z.object({
  userId: z.string().min(1).optional(),
  // Accepted and ignored. It selected the legacy XalianTable batch load, which was
  // retired with issue #180; the account page lists registry records through
  // GET /xalians instead. Kept in the schema so a stale client still gets its user
  // record rather than a 400 BAD_REQUEST on an unknown query parameter.
  populateXalians: z.string().optional(),
});
export type RetrieveUserQuery = z.infer<typeof RetrieveUserQuerySchema>;

// PATCH /db/user. Every action is now rejected (see updateUser.ts): the two xalian-id
// actions belonged to the legacy XalianTable keep flow, and token accounting was already
// server-only. The body shape still parses so the handler can answer a stale client with
// a consistent 403 FORBIDDEN_ACTION rather than a 400 BAD_REQUEST.
export const UpdateUserBodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('REMOVE_XALIAN_ID'), value: z.string().min(1) }),
  z.object({ action: z.literal('ADD_XALIAN_ID'), value: z.string().min(1) }),
  // z.coerce accepts the numeric-string values the client has always sent as well as a
  // real number, and rejects anything that is not a non-negative integer once coerced.
  z.object({ action: z.literal('REMOVE_TOKENS'), value: z.coerce.number().int().nonnegative() }),
  z.object({ action: z.literal('ADD_TOKENS'), value: z.unknown().optional() }),
]);
export type UpdateUserBody = z.infer<typeof UpdateUserBodySchema>;

// POST /xalians (the registry). species is optional; when given it must be a ratified
// species key (checked against @xalians/rules's getSpeciesTemplates() in the handler, not
// here, since that is a runtime lookup against the bundled templates, not a static shape
// check). Omitted, the handler draws one uniformly.
export const GenerateRegistryXalianBodySchema = z.object({
  species: z.string().min(1).optional(),
});
export type GenerateRegistryXalianBody = z.infer<typeof GenerateRegistryXalianBodySchema>;

// GET /xalians. Without ownerId, lists the caller's own records; with ownerId, lists that
// owner's (registry records are public). limit is coerced from the query string and capped
// the same way the repository caps it.
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

// DELETE /xalians/{xalianId}
export const ReleaseRegistryXalianParamsSchema = z.object({
  xalianId: z.string().min(1),
});
export type ReleaseRegistryXalianParams = z.infer<typeof ReleaseRegistryXalianParamsSchema>;
