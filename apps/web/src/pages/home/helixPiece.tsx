// Tier: featured component. The home story's two helix pieces (docs/design/
// home-story-content-plan.md, beats 5 and 6): small looping animations with no
// landscape, one genome helix drawn on the dark ground.
//
// - `plague`: the Nemesis Plague reaches the helix from one end. Its rungs
//   darken and fall away, its strands fray and drop, and a short broken length
//   is left turning.
// - `token`: the broken length fades, and a new helix gathers out of the dark
//   from scattered blanks (a token's genome is generated new, not rebuilt from
//   what the plague left); its rungs shuffle into a random order and light as
//   each one locks, and it folds down into a small chip, the Scrambler Token,
//   sealed inside it.
//
// The token piece starts where the plague piece ends, so the two read as one
// object down the page. Each plays on its own clock and loops, never driven by
// the scroll (Nick, 2026-09-24: tying the two was buggy). Every loop holds its
// last frame, fades out and fades back in at its first before it repeats.
//
// In the story's viewer a piece is live only while it is the shown beat, has
// settled, and the viewer is on the screen; until then it holds its first
// frame. Under reduced motion it rests on its last frame.
import * as React from 'react';

const W = 640;
const H = 360;
const CY = 180;
const AMP = 46;
const K = (Math.PI * 2) / 210; // one turn every 210 units
const X0 = 60;
const X1 = 580;
const SEG = 8; // strand segment length
const RUNGS = Array.from({ length: 26 }, (_, i) => 70 + i * 20);
const SEGS = Array.from({ length: (X1 - X0) / SEG }, (_, i) => X0 + i * SEG);
const TURN = 0.55; // radians a second, while the piece is live

// One loop of each piece, in seconds: rest at the start, play, hold the end, fade out, fade in.
const LOOP = {
	plague: { rest: 1.2, play: 6.4, hold: 1.8, out: 0.7, in: 0.6 },
	token: { rest: 0.4, play: 7.6, hold: 2.2, out: 0.7, in: 0.6 },
} as const;

/** Where a loop is at `sec`: the animation's own 0 to 1, and the piece's opacity. */
export function loopAt(mode: 'plague' | 'token', sec: number) {
	const L = LOOP[mode];
	const period = L.rest + L.play + L.hold + L.out + L.in;
	let s = sec % period;
	if (s < L.in) return { t: 0, fade: s / L.in };
	s -= L.in;
	if (s < L.rest) return { t: 0, fade: 1 };
	s -= L.rest;
	if (s < L.play) return { t: s / L.play, fade: 1 };
	s -= L.play;
	if (s < L.hold) return { t: 1, fade: 1 };
	s -= L.hold;
	return { t: 1, fade: 1 - s / L.out };
}

// The four bases and their pairs, as art colors (lore art keeps its own palette).
const BASE = ['#5fbfae', '#d6a95a', '#8196e2', '#d0708e'];
const PAIR = [1, 0, 3, 2];
const STRAND = '#b8cad2';
const SICK = '#7a2c42'; // the plague's stain: dull, but still seen on the dark ground
const ASH = '#5b4a50';
const BLANK = '#8a969c';

function rng(seed: number) {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const r = rng(606);
// What each rung carried before, what it carries after the scramble, and when it locks.
const OLD = RUNGS.map(() => Math.floor(r() * 4));
const NEW = RUNGS.map((_, i) => (OLD[i] + 1 + Math.floor(r() * 3)) % 4);
const ORDER = RUNGS.map((_, i) => i).sort(() => r() - 0.5);
const LOCK = RUNGS.map((_, i) => 0.36 + 0.28 * (ORDER.indexOf(i) / (RUNGS.length - 1)));
// Each falling piece's own drift and tumble.
const DRIFT = [...RUNGS, ...SEGS, ...SEGS].map(() => [r() * 2 - 1, r() * 2 - 1, 0.7 + r() * 0.6]);

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (v: number) => {
	const c = clamp(v);
	return c * c * (3 - 2 * c);
};

// A color as '#rrggbb' or as the 'rgb(r,g,b)' that mixColor returns, so mixes can be mixed again.
function hex(c: string) {
	if (c[0] === '#') return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
	return c.slice(4, -1).split(',').map(Number);
}
function mixColor(a: string, b: string, t: number) {
	const A = hex(a);
	const B = hex(b);
	return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * clamp(t))).join(',')})`;
}

/** The plague's reach at `t`: how sick (0 to 1) and how far fallen (0 to 1) a piece at `x` is. */
function plagueAt(x: number, t: number) {
	const front = 20 + 480 * t;
	const a = clamp((front - x) / 90);
	return { sick: clamp(a / 0.4), fall: clamp((a - 0.4) / 0.6) };
}

type Mode = 'plague' | 'token';

type Frame = {
	rung: (i: number) => { a: string; b: string; fall: number; glow: number; op: number; scatter?: number };
	strand: (x: number) => { color: string; fall: number; op?: number; scatter?: number };
	squeeze: number; // 0: the helix at full length; 1: folded into the chip
};

export function frameAt(mode: Mode, t: number): Frame {
	if (mode === 'plague') {
		return {
			rung: (i) => {
				const { sick, fall } = plagueAt(RUNGS[i], t);
				const c = BASE[OLD[i]];
				const p = BASE[PAIR[OLD[i]]];
				return { a: mixColor(c, SICK, sick), b: mixColor(p, SICK, sick), fall, glow: 0, op: 1 };
			},
			strand: (x) => {
				const { sick, fall } = plagueAt(x, t);
				return { color: mixColor(STRAND, ASH, sick), fall };
			},
			squeeze: 0,
		};
	}
	// The last of the broken helix fades first. A Scrambler Token's genome is generated new, not rebuilt from
	// what the plague left, so the new helix gathers out of the dark from scattered blanks, not from the fallen pieces.
	const fade = 1 - smooth(t / 0.12);
	const arrive = 1 - smooth((t - 0.12) / 0.22); // 1: still scattered; 0: in place
	return {
		rung: (i) => {
			if (t < 0.12) {
				const end = plagueAt(RUNGS[i], 1);
				return { a: mixColor(BASE[OLD[i]], SICK, end.sick), b: mixColor(BASE[PAIR[OLD[i]]], SICK, end.sick), fall: end.fall, glow: 0, op: fade };
			}
			const lock = LOCK[i];
			// Before its lock a rung is a blank, flickering dimly through the bases as the order shuffles.
			if (t < lock) {
				const flick = t > 0.34 ? Math.floor(t * 60 + i * 7) % 4 : -1;
				const a = flick >= 0 ? mixColor(BLANK, BASE[flick], 0.35) : BLANK;
				const b = flick >= 0 ? mixColor(BLANK, BASE[PAIR[flick]], 0.35) : BLANK;
				return { a, b, fall: 0, glow: 0, op: 1, scatter: arrive };
			}
			// Locked: a flash, then its new pair.
			const since = clamp((t - lock) / 0.05);
			return {
				a: mixColor('#ffffff', BASE[NEW[i]], since),
				b: mixColor('#ffffff', BASE[PAIR[NEW[i]]], since),
				fall: 0,
				glow: 1 - since,
				op: 1,
			};
		},
		strand: (x) => {
			if (t < 0.12) {
				const end = plagueAt(x, 1);
				return { color: mixColor(STRAND, ASH, end.sick), fall: end.fall, op: fade };
			}
			return { color: STRAND, fall: 0, scatter: arrive };
		},
		squeeze: smooth((t - 0.68) / 0.32),
	};
}

type Move = { dx: number; dy: number; rot: number; opacity: number };

/** A piece still on its way in: out along its own direction, faded, turned. */
function scattered(k: number, sc: number): Move {
	const [dx, rot, sp] = DRIFT[k];
	const ang = rot * Math.PI;
	const d = (90 + 110 * sp) * sc;
	return { dx: Math.cos(ang) * d, dy: Math.sin(ang) * d * 0.8, rot: dx * 90 * sc, opacity: 1 - sc };
}

/** A falling piece's move and fade: it drops, drifts, tumbles and goes. */
function fallen(k: number, fall: number): Move {
	const [dx, rot, sp] = DRIFT[k];
	const o = fall * fall;
	return { dx: dx * 26 * fall, dy: o * 170 * sp, rot: rot * 50 * fall, opacity: 1 - Math.pow(fall, 1.6) };
}

function reduced() {
	return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** `live`: it plays; false: it holds its place; undefined: it rests on its last frame. */
// The helix is drawn on a canvas: some two hundred short strokes a frame are
// nothing to a canvas, where the same strokes as SVG attributes cost more main
// thread than a whole living plate (measured 2026-09-26). The chip, which only
// fades and grows, stays SVG beneath it. The loop draws at most thirty times a
// second: the turn is slow and the story's pieces never need more.
const FRAME_MS = 1000 / 30;

export function HelixPiece({ mode, live, label }: { mode: Mode; live: boolean | undefined; label: string }) {
	const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
	const chip = React.useRef<SVGGElement | null>(null);
	const whole = React.useRef<HTMLDivElement | null>(null);
	// Stacked, or before its clock starts, a piece shows its last frame; on the stage it starts at its first.
	const state = React.useRef({ t: live === undefined ? 1 : 0, fade: 1, phase: 0.4, sec: 0 });

	const draw = React.useCallback(() => {
		const { t, phase, fade } = state.current;
		if (whole.current) whole.current.style.opacity = fade.toFixed(3);
		const fr = frameAt(mode, t);
		const sq = fr.squeeze;
		// The chip rises around the folded helix.
		if (chip.current) {
			chip.current.setAttribute('opacity', Math.pow(sq, 0.7).toFixed(3));
			chip.current.setAttribute('transform', `translate(${W / 2} ${CY}) scale(${(0.9 + 0.4 * sq).toFixed(3)})`);
		}
		const canvas = canvasRef.current;
		const ctx = canvas?.getContext?.('2d');
		if (!canvas || !ctx) return;
		const k = canvas.width / W;
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.lineCap = 'round';
		const sx = (x: number) => W / 2 + (x - W / 2) * (1 - 0.72 * sq);
		const amp = AMP * (1 - 0.56 * sq);
		const width = 1 - 0.45 * sq;
		const stroke = (x0: number, y0: number, x1: number, y1: number, m: Move, color: string, lw: number, alpha: number) => {
			if (alpha <= 0.002) return;
			const cx = (x0 + x1) / 2;
			const cy = (y0 + y1) / 2;
			ctx.setTransform(k, 0, 0, k, 0, 0);
			if (m.dx || m.dy || m.rot) {
				ctx.translate(m.dx + cx, m.dy + cy);
				ctx.rotate((m.rot * Math.PI) / 180);
				ctx.translate(-cx, -cy);
			}
			ctx.globalAlpha = alpha;
			ctx.strokeStyle = color;
			ctx.lineWidth = lw;
			ctx.beginPath();
			ctx.moveTo(x0, y0);
			ctx.lineTo(x1, y1);
			ctx.stroke();
		};
		// The two strands, one short segment at a time, brighter and wider where they turn toward the viewer.
		SEGS.forEach((x, j) => {
			const { color, fall, op = 1, scatter = 0 } = fr.strand(x + SEG / 2);
			const ph = phase * (1 - fall) + 0.4 * fall; // a piece that has let go stops turning
			for (const side of [0, 1]) {
				const sgn = side ? -1 : 1;
				const y0 = CY + sgn * amp * Math.sin(K * x + ph);
				const y1 = CY + sgn * amp * Math.sin(K * (x + SEG) + ph);
				const z = sgn * Math.cos(K * (x + SEG / 2) + ph);
				const idx = RUNGS.length + side * SEGS.length + j;
				const m = scatter > 0 ? scattered(idx, scatter) : fallen(idx, fall);
				stroke(sx(x), y0, sx(x + SEG), y1, m, color, (2.2 + (1.8 * (z + 1)) / 2) * width, m.opacity * op * (0.35 + (0.65 * (z + 1)) / 2));
			}
		});
		// The rungs: two halves, one base each, meeting between the strands.
		RUNGS.forEach((x, i) => {
			const rg = fr.rung(i);
			const ph = phase * (1 - rg.fall) + 0.4 * rg.fall;
			const y0 = CY + amp * Math.sin(K * x + ph);
			const y1 = CY - amp * Math.sin(K * x + ph);
			const my = (y0 + y1) / 2;
			const m = rg.scatter ? scattered(i, rg.scatter) : fallen(i, rg.fall);
			const lw = (3.2 + 3 * rg.glow) * width;
			const alpha = m.opacity * rg.op * 0.92;
			stroke(sx(x), y0, sx(x), my, m, rg.a, lw, alpha);
			stroke(sx(x), y1, sx(x), my, m, rg.b, lw, alpha);
		});
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.globalAlpha = 1;
	}, [mode]);

	// The canvas matches its box on the screen at the screen's pixel density.
	React.useLayoutEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return undefined;
		const fit = () => {
			const dpr = Math.min(2, window.devicePixelRatio || 1);
			const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
			const h = Math.max(1, Math.round((w * H) / W));
			if (canvas.width !== w || canvas.height !== h) {
				canvas.width = w;
				canvas.height = h;
			}
			draw();
		};
		fit();
		const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
		ro?.observe(canvas);
		return () => ro?.disconnect();
	}, [draw]);

	// The first frame to show: the last one when stacked or under reduced motion.
	React.useLayoutEffect(() => {
		if (live === undefined || reduced()) {
			state.current.t = 1;
			state.current.fade = 1;
		}
		draw();
	}, [live, draw]);

	// The loop and the slow turn, only while this is the shown piece, on the screen, and motion is allowed.
	// Paused, it keeps its place; shown again, it carries on from there.
	React.useEffect(() => {
		if (!live || reduced()) return undefined;
		let frame = 0;
		let last = performance.now();
		const tick = (now: number) => {
			frame = window.requestAnimationFrame(tick);
			if (now - last < FRAME_MS - 1) return;
			const dt = Math.min(100, now - last) / 1000;
			last = now;
			const st = state.current;
			st.sec += dt;
			st.phase += TURN * dt;
			const at = loopAt(mode, st.sec);
			st.t = at.t;
			st.fade = at.fade;
			draw();
		};
		frame = window.requestAnimationFrame(tick);
		return () => window.cancelAnimationFrame(frame);
	}, [live, mode, draw]);

	return (
		<div ref={whole} role="img" aria-label={label} data-piece-live={String(!!live && !reduced())} className="relative w-full" style={{ aspectRatio: `${W} / ${H}` }}>
			{mode === 'token' ? (
				// The Scrambler Token: a small chip, contacts along its edges, the new genome sealed in its face.
				<svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true" className="absolute inset-0 block h-full w-full overflow-visible">
					<defs>
						<linearGradient id={`${mode}-chip`} x1="0" y1="0" x2="0" y2="1">
							<stop offset="0" stopColor="#27323a" />
							<stop offset=".5" stopColor="#151c22" />
							<stop offset="1" stopColor="#0c1115" />
						</linearGradient>
						<radialGradient id={`${mode}-halo`}>
							<stop offset="0" stopColor="#9fd9cf" stopOpacity=".16" />
							<stop offset="1" stopColor="#9fd9cf" stopOpacity="0" />
						</radialGradient>
					</defs>
					<g ref={chip} opacity="0">
						<ellipse cx="0" cy="0" rx="190" ry="120" fill={`url(#${mode}-halo)`} />
						{Array.from({ length: 9 }, (_, i) => (
							<g key={i} fill="#8d9aa2">
								<rect x={-72 + i * 18 - 3} y={-86} width="6" height="12" rx="1" />
								<rect x={-72 + i * 18 - 3} y={74} width="6" height="12" rx="1" />
							</g>
						))}
						<rect x="-104" y="-76" width="208" height="152" rx="12" fill={`url(#${mode}-chip)`} stroke="#71838d" strokeWidth="2" />
						<rect x="-88" y="-60" width="176" height="120" rx="6" fill="#0a0f12" stroke="#3a4850" strokeWidth="1.5" />
					</g>
				</svg>
			) : null}
			<canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 block h-full w-full" />
		</div>
	);
}
