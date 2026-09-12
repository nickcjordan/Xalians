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

// The showroom lever (issue #197, docs/design/xalians-platform-vision-and-economy.md
// section 3): 'full' is the unconstrained generator, 'showroom' pins finish to standard,
// drops rare trait outcomes and never rolls a secondary affinity. Shared by both routes
// below so the two default differently on purpose (see each schema's comment).
const GeneratorProfileSchema = z.enum(['full', 'showroom']);

// POST /xalians (the registry). species is optional; when given it must be a ratified
// species key (checked against @xalians/rules's getSpeciesTemplates() in the handler, not
// here, since that is a runtime lookup against the bundled templates, not a static shape
// check). Omitted, the handler draws one uniformly. profile is optional and defaults to
// 'full': a signed-in caller gets the unrestricted generator unless the site's visible
// toggle asks for the showroom preview instead.
export const GenerateRegistryXalianBodySchema = z.object({
  species: z.string().min(1).optional(),
  profile: GeneratorProfileSchema.optional(),
});
export type GenerateRegistryXalianBody = z.infer<typeof GenerateRegistryXalianBodySchema>;

// GET /xalians/showroom. profile is optional and defaults to 'showroom': this route is
// anonymous, so the query parameter is client-supplied and is deliberately not a gate
// while the toggle exists (see showroomXalian.ts's handler comment) -- it just lets the
// same visible toggle flip the anonymous branch too.
export const ShowroomXalianQuerySchema = z.object({
  profile: GeneratorProfileSchema.optional(),
});
export type ShowroomXalianQuery = z.infer<typeof ShowroomXalianQuerySchema>;

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

// Public binder route: explicit owner in the path, with the same bounded pagination
// controls as the authenticated collection route.
export const PublicRegistryOwnerParamsSchema = z.object({
  ownerId: z.string().min(1),
});
export type PublicRegistryOwnerParams = z.infer<typeof PublicRegistryOwnerParamsSchema>;

export const PublicRegistryListQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).optional(),
  cursor: z.string().min(1).optional(),
});
export type PublicRegistryListQuery = z.infer<typeof PublicRegistryListQuerySchema>;

// DELETE /xalians/{xalianId}
export const ReleaseRegistryXalianParamsSchema = z.object({
  xalianId: z.string().min(1),
});
export type ReleaseRegistryXalianParams = z.infer<typeof ReleaseRegistryXalianParamsSchema>;

const TradeXalianIdsSchema = z
  .array(z.string().regex(/^xal_/, 'xalian id must start with "xal_"'))
  .min(1)
  .max(6)
  .refine((ids) => new Set(ids).size === ids.length, 'a trade side cannot repeat a Xalian');

// POST /trades. Both sides are required: trades are direct swaps, not gifts, listings,
// auctions, or price-bearing marketplace offers.
export const CreateTradeBodySchema = z
  .object({
    recipientId: z.string().min(1),
    offeredXalianIds: TradeXalianIdsSchema,
    requestedXalianIds: TradeXalianIdsSchema,
    counterTo: z.string().regex(/^trd_/, 'counter trade id must start with "trd_"').optional(),
  })
  .refine(
    (trade) => trade.offeredXalianIds.every((id) => !trade.requestedXalianIds.includes(id)),
    { message: 'the same Xalian cannot appear on both sides', path: ['requestedXalianIds'] }
  );
export type CreateTradeBody = z.infer<typeof CreateTradeBodySchema>;

export const TradeParamsSchema = z.object({
  tradeId: z.string().regex(/^trd_/, 'trade id must start with "trd_"'),
});
export type TradeParams = z.infer<typeof TradeParamsSchema>;
