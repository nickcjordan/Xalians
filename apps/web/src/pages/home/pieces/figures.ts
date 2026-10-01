// The home story's figures (docs/design/home-story-figures.md): the small beats, drawn in light on the page
// rather than played back on the archive screen. One figure can carry several beats in a row, running on
// from one into the next instead of cutting; the viewer's figure stage (figureStage.tsx) draws it.
import { createGenerators } from './generators';
import { createOutbreak } from './outbreak';
import type { Ctx } from './stage';

export interface Figure {
	/** How many beats it carries, in order. */
	readonly stages: number;
	/** Resolves once any pictures it paints from have loaded (it draws a fallback until then). Optional. */
	ready?(): Promise<void>;
	/** How long the lower half of the oval stays solid before it fades (see `ovalFade`); 0.55 when absent. */
	readonly groundHold?: number;
	/** Enter afresh at `stage`: nothing shown yet, its clocks at the stage's start. */
	reset(stage: number): void;
	/** Jump to `stage`'s telling moment, fully shown (reduced motion, or no time to play it in). */
	settle(stage: number): void;
	/**
	 * Advance `dt` seconds. `stage`: which of its beats is shown. `present`: whether it is out (blooming in or
	 * shown) or fading back.
	 */
	step(dt: number, stage: number, present: boolean): void;
	/** Whether any of it is on the screen. */
	visible(): boolean;
	/** Whether it is still on its way to what `stage` and `present` ask (blooming, pulling back, running on into a beat). */
	busy(stage: number, present: boolean): boolean;
	/** The center its bloom settles about, in stage units (W by H). */
	anchor(): { x: number; y: number };
	/** Draw it in stage units; `sec` only turns and drifts things. `compact`: its place is small (a phone), so it keeps fewer, larger things. */
	draw(ctx: Ctx, sec: number, opts?: { compact?: boolean }): void;
}

/**
 * Where a figure loads a picture from: the site path, unless a study page has handed it the picture inline
 * (scripts/design/export-figure-study.cjs puts `window.__FIGURE_ASSETS__` there).
 */
export function assetUrl(path: string) {
	const inline = typeof window !== 'undefined' ? (window as unknown as { __FIGURE_ASSETS__?: Record<string, string> }).__FIGURE_ASSETS__ : undefined;
	return inline?.[path] ?? path;
}

export type FigureKey = 'generators' | 'outbreak';

/**
 * Each figure's light at each of its beats, which tints the first moments of the next recording's screen tuning
 * in (the viewer's --arrival): Genesis green, APEX violet, the plague's crimson, the token's warm white.
 */
export const FIGURE_LIGHT: Record<FigureKey, string[]> = {
	generators: ['rgb(150 236 140)', 'rgb(172 124 255)'],
	outbreak: ['rgb(232 54 84)', 'rgb(255 240 222)'],
};

export const FIGURES: Record<FigureKey, () => Figure> = {
	generators: createGenerators,
	outbreak: createOutbreak,
};
