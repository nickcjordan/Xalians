// The shared stage of the home story's small pieces (docs/design/home-story-small-pieces.md): the imaging
// chamber's ground and motes, the camera, cached glow sprites, and small numeric helpers. Every piece draws
// a moment of its loop onto a 2D canvas in the stage's units, W by H, with no state of its own.

export const W = 1000;
export const H = 562;

export type Ctx = CanvasRenderingContext2D;

export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
/** 0 to 1 across [a, b], eased in and out. */
export const smooth = (a: number, b: number, v: number) => {
	const c = clamp((v - a) / (b - a));
	return c * c * (3 - 2 * c);
};
/** 0 to 1 across [a, b], linear. */
export const ramp = (a: number, b: number, v: number) => clamp((v - a) / (b - a));
export const easeOut = (v: number) => 1 - Math.pow(1 - clamp(v), 3);
export const easeIn = (v: number) => Math.pow(clamp(v), 2.2);

/** A seeded random stream (mulberry32), so every piece draws the same moment the same way. */
export function rng(seed: number) {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export type RGB = [number, number, number];
export function hexRGB(h: string): RGB {
	return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
}
export const mixRGB = (a: RGB, b: RGB, t: number): RGB => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
export const scaleRGB = (a: RGB, k: number): RGB => [a[0] * k, a[1] * k, a[2] * k];
export const css = (c: RGB, alpha = 1) => `rgba(${Math.round(clamp(c[0], 0, 255))},${Math.round(clamp(c[1], 0, 255))},${Math.round(clamp(c[2], 0, 255))},${clamp(alpha).toFixed(3)})`;

// ---- The camera: a point in the chamber (x right, y up, z toward the viewer) onto the stage.

export type P3 = { x: number; y: number; z: number };
export type Proj = { x: number; y: number; s: number; z: number };

export type Camera = { cx: number; cy: number; pitch: number; roll: number; dist: number; zoom: number };

export function project(cam: Camera, p: P3): Proj {
	// pitch: tip the chamber toward the viewer about x; roll: turn the frame about the view axis
	const cp = Math.cos(cam.pitch);
	const sp = Math.sin(cam.pitch);
	const y1 = p.y * cp - p.z * sp;
	const z1 = p.y * sp + p.z * cp;
	const cr = Math.cos(cam.roll);
	const sr = Math.sin(cam.roll);
	const x2 = p.x * cr - y1 * sr;
	const y2 = p.x * sr + y1 * cr;
	const s = (cam.dist / (cam.dist - z1)) * cam.zoom;
	return { x: cam.cx + x2 * s, y: cam.cy - y2 * s, s, z: z1 };
}

// ---- Glow sprites: a soft radial falloff in one color, drawn additively. Cached per color and size.

const sprites = new Map<string, HTMLCanvasElement>();

function sprite(color: RGB, falloff: 'soft' | 'core'): HTMLCanvasElement | null {
	const key = `${color.map(Math.round).join(',')}|${falloff}`;
	const hit = sprites.get(key);
	if (hit) return hit;
	if (typeof document === 'undefined') return null;
	const c = document.createElement('canvas');
	const n = falloff === 'soft' ? 256 : 64;
	c.width = c.height = n;
	const g = c.getContext('2d');
	if (!g) return null;
	const grad = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
	if (falloff === 'core') {
		grad.addColorStop(0, css(color, 1));
		grad.addColorStop(0.25, css(color, 0.55));
		grad.addColorStop(1, css(color, 0));
	} else {
		grad.addColorStop(0, css(color, 0.6));
		grad.addColorStop(0.4, css(color, 0.22));
		grad.addColorStop(1, css(color, 0));
	}
	g.fillStyle = grad;
	g.fillRect(0, 0, n, n);
	if (sprites.size > 1500) sprites.clear();
	sprites.set(key, c);
	return c;
}

// Inside `lighter()` every glow is already additive, so the blend mode is not switched per glow: switching
// it breaks the canvas's batching of draws, and a piece draws hundreds of glows a frame.
let batched = false;

/** Draw a run of glows (`fn`) additively, switching the blend mode once. */
export function lighter(ctx: Ctx, fn: () => void) {
	ctx.globalCompositeOperation = 'lighter';
	batched = true;
	try {
		fn();
	} finally {
		batched = false;
		ctx.globalCompositeOperation = 'source-over';
		ctx.globalAlpha = 1;
	}
}

/** A glow of `radius` at (x, y), added to what is there. Colors are quantized so the cache stays small. */
export function glow(ctx: Ctx, x: number, y: number, radius: number, color: RGB, alpha: number, falloff: 'soft' | 'core' = 'soft') {
	if (alpha <= 0.004 || radius <= 0.5) return;
	const q = color.map((v) => Math.min(255, Math.round(clamp(v, 0, 255) / 51) * 51)) as RGB;
	const s = sprite(q, falloff);
	if (!s) return;
	if (!batched) ctx.globalCompositeOperation = 'lighter';
	ctx.globalAlpha = clamp(alpha);
	ctx.drawImage(s, x - radius, y - radius, radius * 2, radius * 2);
	if (!batched) {
		ctx.globalAlpha = 1;
		ctx.globalCompositeOperation = 'source-over';
	}
}

/**
 * A soft dark blot, an ellipse `rx` by `ry` turned `rot` radians, laid over what is there (smoke, haze). Drawn
 * from the cached sprite rather than a stretched gradient, which bands into stripes.
 */
export function blot(ctx: Ctx, x: number, y: number, rx: number, ry: number, rot: number, color: RGB, alpha: number) {
	if (alpha <= 0.004 || rx <= 0.5 || ry <= 0.5) return;
	const q = color.map((v) => Math.min(255, Math.round(clamp(v, 0, 255) / 51) * 51)) as RGB;
	const s = sprite(q, 'soft');
	if (!s) return;
	ctx.save();
	ctx.translate(x, y);
	ctx.rotate(rot);
	ctx.globalCompositeOperation = 'source-over';
	ctx.globalAlpha = clamp(alpha);
	ctx.drawImage(s, -rx, -ry, rx * 2, ry * 2);
	ctx.restore();
}

/** A lit sphere: a base color, a lit upper left, a dark rim. */
export function sphere(ctx: Ctx, x: number, y: number, r: number, color: RGB, alpha: number, light = 1) {
	if (alpha <= 0.004 || r <= 0.2) return;
	const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
	g.addColorStop(0, css(mixRGB(color, [255, 255, 255], 0.55 * light), alpha));
	g.addColorStop(0.45, css(scaleRGB(color, 0.55 + 0.45 * light), alpha));
	g.addColorStop(1, css(scaleRGB(color, 0.18), alpha));
	ctx.fillStyle = g;
	ctx.beginPath();
	ctx.arc(x, y, r, 0, Math.PI * 2);
	ctx.fill();
}

// ---- The chamber: its ground, the pool of light behind the subject, and the motes.

export type Chamber = { tint: RGB; pool: RGB; poolX?: number; poolY?: number; poolR?: number };

export function ground(ctx: Ctx, ch: Chamber) {
	ctx.globalAlpha = 1;
	ctx.globalCompositeOperation = 'source-over';
	ctx.fillStyle = css(ch.tint);
	ctx.fillRect(0, 0, W, H);
	const px = ch.poolX ?? W / 2;
	const py = ch.poolY ?? H / 2;
	const pr = ch.poolR ?? W * 0.55;
	const g = ctx.createRadialGradient(px, py, 0, px, py, pr);
	g.addColorStop(0, css(ch.pool, 0.55));
	g.addColorStop(0.45, css(ch.pool, 0.18));
	g.addColorStop(1, css(ch.pool, 0));
	ctx.fillStyle = g;
	ctx.fillRect(0, 0, W, H);
}

/** Darken the edges, last, over everything. */
export function vignette(ctx: Ctx, strength = 0.75) {
	const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.72);
	g.addColorStop(0, 'rgba(0,0,0,0)');
	g.addColorStop(1, `rgba(0,0,0,${strength})`);
	ctx.fillStyle = g;
	ctx.fillRect(0, 0, W, H);
}

type Mote = { x: number; y: number; drift: number; phase: number; size: number };
const field = (seed: number, n: number, size: [number, number], drift: [number, number]): Mote[] => {
	const r = rng(seed);
	return Array.from({ length: n }, () => ({ x: r() * W, y: r() * H, drift: drift[0] + r() * (drift[1] - drift[0]), phase: r() * Math.PI * 2, size: size[0] + r() * (size[1] - size[0]) }));
};
// Three depths: a dense fine far layer, a middle one, and a few large soft motes near the lens.
const FAR = field(4242, 160, [0.45, 1], [3, 7]);
const MID = field(4343, 34, [1.2, 2.4], [6, 12]);
const NEAR = field(4444, 9, [16, 34], [16, 26]);

function drift(ctx: Ctx, list: Mote[], sec: number, color: RGB, a0: number, soft: boolean) {
	for (const m of list) {
		const x = (((m.x + sec * m.drift + 24 * Math.sin(sec * 0.25 + m.phase)) % (W + 80)) + W + 80) % (W + 80) - 40;
		const y = (((m.y - sec * m.drift * 0.35) % (H + 80)) + H + 80) % (H + 80) - 40;
		const a = a0 * (0.55 + 0.45 * Math.sin(sec * 0.6 + m.phase));
		if (soft) glow(ctx, x, y, m.size, color, a);
		else glow(ctx, x, y, m.size * 1.8, color, a, 'core');
	}
}

/** The chamber's motes, drifting slowly: the far and middle ones behind the subject, the near ones in front. */
export function motes(ctx: Ctx, sec: number, color: RGB, layer: 'back' | 'front', alpha = 1) {
	lighter(ctx, () => {
		if (layer === 'back') {
			drift(ctx, FAR, sec, color, 0.3 * alpha, false);
			drift(ctx, MID, sec, color, 0.4 * alpha, false);
		} else drift(ctx, NEAR, sec, color, 0.12 * alpha, true);
	});
}

/** A loop's fade: in over `inS` seconds at its start, out over `outS` before its end. */
export function loopFade(t: number, period: number, inS = 0.6, outS = 0.8) {
	return Math.min(ramp(0, inS, t), 1 - ramp(period - outS, period, t));
}
