// The home story's figures (docs/design/home-story-figures.md): the small beats, drawn in light on the page
// rather than played back on the archive screen. One figure can carry several beats in a row, running on
// from one into the next instead of cutting; the viewer's figure stage (figureStage.tsx) draws it.
import { createGenerators } from './generators';
import { createOutbreak } from './outbreak';
import type { Ctx, RGB } from './stage';

export interface Figure {
	/** How many beats it carries, in order. */
	readonly stages: number;
	/** Resolves once any pictures it paints from have loaded (it draws a fallback until then). Optional. */
	ready?(): Promise<void>;
	/** Enter afresh at `stage`: nothing shown yet, its clocks at the stage's start. */
	reset(stage: number): void;
	/** Jump to `stage`'s telling moment, fully shown (reduced motion, or no time to play it in). */
	settle(stage: number): void;
	/**
	 * Advance `dt` seconds. `stage`: which of its beats is shown. `present`: whether it is out (blooming in or
	 * shown) or pulling back into its anchor.
	 */
	step(dt: number, stage: number, present: boolean): void;
	/** Whether any of it is on the screen. */
	visible(): boolean;
	/** Whether it is still on its way to what `stage` and `present` ask (blooming, pulling back, running on into a beat). */
	busy(stage: number, present: boolean): boolean;
	/** Where it blooms out of and pulls back into, in stage units (W by H). */
	anchor(): { x: number; y: number };
	/** The color of the light that carries it to the next beat, or brings the last one to it. */
	light(): RGB;
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

export const FIGURES: Record<FigureKey, () => Figure> = {
	generators: createGenerators,
	outbreak: createOutbreak,
};
