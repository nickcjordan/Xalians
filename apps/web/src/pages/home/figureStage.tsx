// Tier: featured component. The story viewer's figure stage (docs/design/home-story-figures.md): one canvas
// laid over the viewer's box that draws the small beats as figures on the page, and the light that carries
// the story between a figure and a recording.
//
//   recording to figure  the recording has already collapsed to a point on its screen (the viewer's
//                        `collapse`); that point flies to where the figure stands, and the figure blooms out of it.
//   figure to figure     one figure carrying both beats runs straight on into the next (no cut); two different
//                        figures: the first pulls into a point, which flies to the second and blooms it.
//   figure to recording  the figure pulls into a point, which flies to the recording's screen; the viewer
//                        switches the screen on as it lands (FIGURE_TO_SCREEN_MS).
//
// A figure only moves while its beat is live (the viewer resting on it, on screen, in a visible tab) or while
// the light is travelling; otherwise its last frame holds. At the plates' film rate when it only plays, at the
// screen's rate while something travels. Under reduced motion there is no travel: each figure shows its beat's
// telling moment.
import * as React from 'react';
import { FILM_FPS } from '@/components/plates/livePlate';
import { FIGURES, type Figure, type FigureKey } from './pieces/figures';
import { clamp, glow, H, lighter, mixRGB, ovalFade, W, type RGB } from './pieces/stage';

export type StageBeat = { key: string; figure?: { key: FigureKey; stage: number } };

/** When the light that leaves a figure reaches the next recording's screen; the viewer tunes the screen in then. */
export const FIGURE_TO_SCREEN_MS = 900;

type Box = { x: number; y: number; w: number; h: number };
type Flight = { t0: number; from: { x: number; y: number }; to: { x: number; y: number }; c0: RGB; c1: RGB; appear: number; fly: [number, number]; land: number; end: number; bloom?: FigureKey };

const WHITE: RGB = [255, 255, 255];
const ease = (v: number) => {
	const c = clamp(v);
	return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
};

function reduced() {
	return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function FigureStage({ beats, index, boxRef, live, motion }: { beats: StageBeat[]; index: number; boxRef: React.RefObject<HTMLDivElement | null>; live: boolean; motion: boolean }) {
	const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
	const figs = React.useRef(new Map<FigureKey, { fig: Figure; stage: number; present: boolean; slot: Box | null }>());
	const flight = React.useRef<Flight | null>(null);
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
	const anchorIn = (slot: Box, fig: Figure) => {
		const a = fig.anchor();
		return { x: slot.x + (a.x * slot.w) / W, y: slot.y + (a.y * slot.h) / H };
	};
	const centerOf = (r: Box) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

	// A new beat: start whatever carries the story to it.
	React.useLayoutEffect(() => {
		const from = prevIndex.current;
		prevIndex.current = index;
		const A = beats[from]?.figure;
		const B = beats[index]?.figure;
		const now = performance.now() / 1000;
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
			kick.current();
			return;
		}
		if (A && B && A.key === B.key) {
			// one figure, two beats: it runs straight on
			figureOf(B.key).stage = B.stage;
		} else if (A && B) {
			const a = figureOf(A.key);
			const b = figureOf(B.key);
			a.present = false;
			b.fig.reset(B.stage);
			b.stage = B.stage;
			b.present = !motion;
			if (motion && a.slot && b.slot) flight.current = { t0: now, from: anchorIn(a.slot, a.fig), to: anchorIn(b.slot, b.fig), c0: a.fig.light(), c1: b.fig.light(), appear: 0.1, fly: [0.3, 0.9], land: 0.9, end: 1.3, bloom: B.key };
		} else if (B) {
			// from a recording: its screen has collapsed to a point; the point flies here and the figure blooms from it
			const b = figureOf(B.key);
			b.fig.reset(B.stage);
			b.stage = B.stage;
			const screen = rectOf(from);
			b.present = !motion || !screen || !b.slot;
			if (!b.present && screen && b.slot) flight.current = { t0: now, from: centerOf(screen), to: anchorIn(b.slot, b.fig), c0: WHITE, c1: b.fig.light(), appear: 0, fly: [0.1, 0.7], land: 0.7, end: 1.05, bloom: B.key };
		} else if (A) {
			// to a recording: the figure pulls into its point, which flies to the screen
			const a = figureOf(A.key);
			a.present = false;
			const to = rectOf(index);
			if (motion && a.slot && to) flight.current = { t0: now, from: anchorIn(a.slot, a.fig), to: centerOf(to), c0: a.fig.light(), c1: WHITE, appear: 0.1, fly: [0.35, FIGURE_TO_SCREEN_MS / 1000], land: FIGURE_TO_SCREEN_MS / 1000, end: FIGURE_TO_SCREEN_MS / 1000 + 0.15 };
			if (!motion) a.fig.reset(A.stage);
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

	// Drawing: every figure that is out, then the light in flight.
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
		const fl = flight.current;
		if (fl) {
			const e = sec - fl.t0;
			const k = ease((e - fl.fly[0]) / (fl.fly[1] - fl.fly[0]));
			const lift = 40 + Math.abs(fl.to.x - fl.from.x) * 0.15;
			const mx = (fl.from.x + fl.to.x) / 2;
			const my = Math.min(fl.from.y, fl.to.y) - lift;
			const x = (1 - k) * (1 - k) * fl.from.x + 2 * (1 - k) * k * mx + k * k * fl.to.x;
			const y = (1 - k) * (1 - k) * fl.from.y + 2 * (1 - k) * k * my + k * k * fl.to.y;
			const a = clamp((e - fl.appear) / 0.2) * (1 - clamp((e - fl.land) / Math.max(0.05, fl.end - fl.land)));
			if (a > 0.01) {
				const c = mixRGB(fl.c0, fl.c1, k);
				ctx.setTransform(p, 0, 0, p, 0, 0);
				lighter(ctx, () => {
					glow(ctx, x, y, 44, c, 0.6 * a);
					glow(ctx, x, y, 10, WHITE, a, 'core');
				});
			}
		}
	}, []);

	// The loop: runs while something travels or blooms, or while the shown figure is live; otherwise it stops
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
			const fl = flight.current;
			if (fl && sec - fl.t0 >= fl.land && fl.bloom) {
				const b = figs.current.get(fl.bloom);
				if (b) b.present = true;
				fl.bloom = undefined;
			}
			if (fl && sec - fl.t0 > fl.end) flight.current = null;
			const cur = beats[index]?.figure;
			let moving = !!flight.current;
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
