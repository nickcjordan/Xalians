// The home story's small pieces on the archive screen, by name (beats 2 and 3 are a figure now: figures.ts): each one's loop, in seconds, and its drawing of a moment
// (`t` seconds into its loop; `sec` the piece's own running clock, which only turns and drifts things).
import { drawPlague, PLAGUE_LOOP } from './plague';
import type { Ctx } from './stage';
import { drawToken, TOKEN_LOOP } from './token';

export type PieceKey = 'plague' | 'token';

/** `rest`: the moment that tells the piece when it is shown still (reduced motion, or stacked in the page). */
export const PIECES: Record<PieceKey, { loop: number; rest: number; draw: (ctx: Ctx, t: number, sec: number) => void }> = {
	plague: { loop: PLAGUE_LOOP, rest: 9.6, draw: drawPlague },
	token: { loop: TOKEN_LOOP, rest: 11, draw: drawToken },
};
