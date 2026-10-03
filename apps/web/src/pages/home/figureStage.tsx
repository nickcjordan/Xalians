// Tier: featured component. The story viewer's figure stage (docs/design/home-story-figures.md): one canvas
// laid over the viewer's box that draws the small beats as figures on the page.
//
//   recording to figure  the recording's picture collapses to a line and goes (the viewer's `collapse`); the
//                        figure blooms in where it stands.
//   figure to figure     one figure carrying both beats runs straight on into the next (no cut); two different
//                        figures: the first fades back while the second blooms in.
//   figure to recording  the figure fades back where it stands; the viewer switches the next screen on as it
//                        goes (FIGURE_TO_SCREEN_MS), its first static tinted with the figure's light (--arrival).
//
// Nothing travels between the two (Nick, 2026-09-30: the point of light that flew from one to the other was not
// needed). A figure only moves while its beat is live (the viewer resting on it, on screen, in a visible tab) or
// while it is blooming in or pulling back; otherwise its last frame holds. At the plates' film rate when it only
// plays, at the screen's rate while it blooms in or fades back. Under reduced motion each figure shows its beat's
// telling moment.
import * as React from 'react';
import { FILM_FPS } from '@/components/plates/livePlate';
import { FIGURES, type Figure, type FigureKey } from './pieces/figures';
import { H, ovalFade, W } from './pieces/stage';

export type StageBeat = { key: string; figure?: { key: FigureKey; stage: number } };

/** How long after leaving a figure the next recording's screen starts tuning in: as the figure finishes pulling back. */
export const FIGURE_TO_SCREEN_MS = 380;

type Box = { x: number; y: number; w: number; h: number };

function reduced() {
	return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function FigureStage({ beats, index, boxRef, live, motion }: { beats: StageBeat[]; index: number; boxRef: React.RefObject<HTMLDivElement | null>; live: boolean; motion: boolean }) {
	const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
	const figs = React.useRef(new Map<FigureKey, { fig: Figure; stage: number; present: boolean; slot: Box | null }>());
	const prevIndex = React.useRef(index);
	const pr = React.useRef(1);
	const off = React.useRef<HTMLCanvasElement | null>(null);
	const kick = React.useRef<() => void>(() => {});

	const figureOf = (key: FigureKey) => {
		let f = figs.current.get(key);
		if (!f) {
			f = { fig: FIGURES[key](), stage: 0, present: false, slot: null };
			figs.current.set(key, f);
		}
		return f;
	};

	// Where a beat's picture stands in the box: its figure's place, or its recording's screen.
	const rectOf = React.useCallback(
		(i: number): Box | null => {
			const box = boxRef.current;
			const b = beats[i];
			if (!box || !b) return null;
			const el = box.querySelector<HTMLElement>(`.story-scene[data-beat="${b.key}"] [data-figure-slot], .story-scene[data-beat="${b.key}"] .frame`);
			if (!el) return null;
			const r = el.getBoundingClientRect();
			const o = box.getBoundingClientRect();
			return { x: r.left - o.left, y: r.top - o.top, w: r.width, h: r.height };
		},
		[beats, boxRef]
	);
	// A new beat: start whatever carries the story to it.
	React.useLayoutEffect(() => {
		const from = prevIndex.current;
		prevIndex.current = index;
		const A = beats[from]?.figure;
		const B = beats[index]?.figure;
		if (B) {
			const f = figureOf(B.key);
			f.slot = rectOf(index);
			if (reduced()) {
				f.fig.settle(B.stage);
				f.present = true;
				f.stage = B.stage;
			}
		}
		if (from === index || reduced()) {
			// under reduced motion a figure left for another beat goes at once; without this the last figure stayed drawn over the
			// next beat's screen (06's Generator over the 07 plate)
			if (from !== index && A && (!B || A.key !== B.key)) {
				const a = figureOf(A.key);
				a.present = false;
				a.fig.reset(A.stage);
			}
			kick.current();
			return;
		}
		if (A && B && A.key === B.key) {
			// one figure, two beats: it runs straight on
			figureOf(B.key).stage = B.stage;
		} else {
			// leaving a figure: it fades back where it stands (at once when the change is a cut)
			if (A) {
				const a = figureOf(A.key);
				a.present = false;
				if (!motion) a.fig.reset(A.stage);
			}
			// arriving at one: it blooms in where it stands
			if (B) {
				const b = figureOf(B.key);
				b.fig.reset(B.stage);
				b.stage = B.stage;
				b.present = true;
			}
		}
		kick.current();
	}, [index]);
	// The canvas covers the box at a modest resolution; slots are measured again whenever the box changes.
	React.useLayoutEffect(() => {
		const box = boxRef.current;
		const canvas = canvasRef.current;
		if (!box || !canvas) return undefined;
		const fit = () => {
			const r = box.getBoundingClientRect();
			pr.current = Math.min(1.25, window.devicePixelRatio || 1, 1800 / Math.max(1, r.width));
			const w = Math.max(1, Math.round(r.width * pr.current));
			const h = Math.max(1, Math.round(r.height * pr.current));
			if (canvas.width !== w || canvas.height !== h) {
				canvas.width = w;
				canvas.height = h;
			}
			const B = beats[index]?.figure;
			if (B) figureOf(B.key).slot = rectOf(index);
			kick.current();
		};
		fit();
		const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
		ro?.observe(box);
		return () => ro?.disconnect();
	}, [boxRef, index, rectOf]);

	// Drawing: every figure that is out.
	const draw = React.useCallback((sec: number) => {
		const canvas = canvasRef.current;
		const ctx = canvas?.getContext?.('2d');
		if (!canvas || !ctx) return;
		const p = pr.current;
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		for (const f of figs.current.values()) {
			if (!f.fig.visible() || !f.slot) continue;
			const s = f.slot;
			const ow = Math.max(1, Math.round(s.w * p));
			const oh = Math.max(1, Math.round(s.h * p));
			if (!off.current) off.current = document.createElement('canvas');
			const o = off.current;
			if (o.width !== ow || o.height !== oh) {
				o.width = ow;
				o.height = oh;
			}
			const oc = o.getContext('2d');
			if (!oc) continue;
			oc.setTransform(1, 0, 0, 1, 0, 0);
			oc.globalCompositeOperation = 'source-over';
			oc.globalAlpha = 1;
			oc.clearRect(0, 0, ow, oh);
			oc.setTransform(ow / W, 0, 0, oh / H, 0, 0);
			f.fig.draw(oc, sec, { compact: s.w < 520 });
			// suspended on the page: an oval that fades out well before the edges of its place, never a box
			ovalFade(oc, f.fig.groundHold);
			ctx.drawImage(o, Math.round(s.x * p), Math.round(s.y * p));
		}
	}, []);

	// The loop: runs while a figure blooms in or fades back, or while the shown figure is live; otherwise it stops
	// on its last frame.
	const liveRef = React.useRef(live);
	liveRef.current = live;
	React.useEffect(() => {
		let frame = 0;
		let last = -1;
		let lastDraw = -1;
		const step = 1 / FILM_FPS;
		const tick = (ms: number) => {
			frame = 0;
			const sec = ms / 1000;
			const dt = last < 0 ? 0 : Math.min(0.1, sec - last);
			last = sec;
			const cur = beats[index]?.figure;
			let moving = false;
			for (const [key, f] of figs.current) {
				const isCur = cur?.key === key;
				if (isCur) f.stage = cur.stage;
				const present = isCur && f.present;
				// a figure plays while it is live; it always finishes blooming in, pulling back, or running on into its next beat
				const busy = f.fig.busy(f.stage, present);
				// under reduced motion a figure holds its beat's telling moment and never moves
				if (!reduced() && ((isCur && liveRef.current) || busy)) f.fig.step(dt, f.stage, present);
				else if (reduced()) continue;
				if (busy && !reduced()) moving = true;
			}
			const playing = liveRef.current && !!cur;
			if (moving || !playing || sec - lastDraw >= step - 0.001) {
				draw(sec);
				lastDraw = sec;
			}
			if (moving || playing) frame = window.requestAnimationFrame(tick);
			else last = -1;
		};
		kick.current = () => {
			if (!frame) frame = window.requestAnimationFrame(tick);
		};
		kick.current();
		return () => {
			if (frame) window.cancelAnimationFrame(frame);
			kick.current = () => {};
		};
	}, [beats, index, draw]);

	React.useEffect(() => {
		kick.current();
	}, [live]);

	return <canvas ref={canvasRef} aria-hidden="true" className="figure-stage pointer-events-none absolute inset-0 z-[2] block h-full w-full" data-figure-live={String(live)} />;
}
