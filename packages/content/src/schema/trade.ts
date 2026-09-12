import { z } from 'zod';

const XalianIdSchema = z.string().regex(/^xal_/, 'xalian id must start with "xal_"');
const TradeSideSchema = z
  .array(XalianIdSchema)
  .min(1)
  .max(6)
  .refine((ids) => new Set(ids).size === ids.length, 'a trade side cannot repeat a Xalian');

export const TradeStatusSchema = z.enum(['open', 'accepted', 'cancelled', 'countered']);
export type TradeStatus = z.infer<typeof TradeStatusSchema>;

// A trade is a direct, creature-for-creature proposal between two owners. It carries
// record ids rather than prices or game stats: Xalian records are immutable and games
// remain responsible for interpreting them.
export const TradeOfferSchema = z
  .object({
    id: z.string().regex(/^trd_/, 'trade id must start with "trd_"'),
    proposerId: z.string().min(1),
    recipientId: z.string().min(1),
    offeredXalianIds: TradeSideSchema,
    requestedXalianIds: TradeSideSchema,
    status: TradeStatusSchema,
    createdAt: z.string().datetime({ offset: true }),
    respondedAt: z.string().datetime({ offset: true }).optional(),
    counterTo: z.string().regex(/^trd_/, 'counter trade id must start with "trd_"').optional(),
  })
  .refine((trade) => trade.proposerId !== trade.recipientId, {
    message: 'a trade must involve two different owners',
    path: ['recipientId'],
  })
  .refine(
    (trade) => trade.offeredXalianIds.every((id) => !trade.requestedXalianIds.includes(id)),
    { message: 'the same Xalian cannot appear on both sides', path: ['requestedXalianIds'] }
  );

export type TradeOffer = z.infer<typeof TradeOfferSchema>;
