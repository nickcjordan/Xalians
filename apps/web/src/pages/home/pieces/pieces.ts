// The home story's small pieces by name: each one's loop, in seconds, and its drawing of a moment
// (`t` seconds into its loop; `sec` the piece's own running clock, which only turns and drifts things).
import { drawPlague, PLAGUE_LOOP } from './plague';
import type { Ctx } from './stage';
import { drawToken, TOKEN_LOOP } from './token';
import { APEX_LOOP, drawVat, FORMS_LOOP } from './vat';

export type PieceKey = 'forms' | 'apex' | 'plague' | 'token';

/** `rest`: the moment that tells the piece when it is shown still (reduced motion, or stacked in the page). */
export const PIECES: Record<PieceKey, { loop: number; rest: number; draw: (ctx: Ctx, t: number, sec: number) => void }> = {
	forms: { loop: FORMS_LOOP, rest: 11.5, draw: (ctx, t, sec) => drawVat(ctx, 'forms', t, sec) },
	apex: { loop: APEX_LOOP, rest: 10, draw: (ctx, t, sec) => drawVat(ctx, 'apex', t, sec) },
	plague: { loop: PLAGUE_LOOP, rest: 9.6, draw: drawPlague },
	token: { loop: TOKEN_LOOP, rest: 11, draw: drawToken },
};
