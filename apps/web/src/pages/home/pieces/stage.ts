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

export type Camera = { cx: number; cy: number; pitch: number; roll: number; dist: number; zoom: number; /** Turn about the vertical first, so one end comes toward the viewer. */ yaw?: number };

export function project(cam: Camera, p: P3): Proj {
	// yaw: turn about the vertical; pitch: tip the chamber toward the viewer about x; roll: turn the frame about the view axis
	const cy = Math.cos(cam.yaw ?? 0);
	const sy = Math.sin(cam.yaw ?? 0);
	const x0 = p.x * cy - p.z * sy;
	const z0 = p.x * sy + p.z * cy;
	const cp = Math.cos(cam.pitch);
	const sp = Math.sin(cam.pitch);
	const y1 = p.y * cp - z0 * sp;
	const z1 = p.y * sp + z0 * cp;
	const cr = Math.cos(cam.roll);
	const sr = Math.sin(cam.roll);
	const x2 = x0 * cr - y1 * sr;
	const y2 = x0 * sr + y1 * cr;
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

// Film grain: one tile of noise, laid over the whole frame at a new offset each step, so the pieces share the
// painted plates' grain rather than reading as clean renders.
let grainTile: HTMLCanvasElement | null = null;
export function grain(ctx: Ctx, sec: number, alpha = 0.07) {
	if (!grainTile) {
		if (typeof document === 'undefined') return;
		const c = document.createElement('canvas');
		c.width = c.height = 256;
		const g = c.getContext('2d');
		if (!g) return;
		const img = g.createImageData(256, 256);
		const r = rng(1234);
		for (let k = 0; k < img.data.length; k += 4) {
			const v = Math.floor(r() * 255);
			img.data[k] = img.data[k + 1] = img.data[k + 2] = v;
			img.data[k + 3] = 255;
		}
		g.putImageData(img, 0, 0);
		grainTile = c;
	}
	const step = Math.floor(sec * 20);
	const ox = -((step * 97) % 256);
	const oy = -((step * 57) % 256);
	ctx.globalCompositeOperation = 'source-over';
	ctx.globalAlpha = alpha;
	for (let y = oy; y < H; y += 256) for (let x = ox; x < W; x += 256) ctx.drawImage(grainTile, x, y);
	ctx.globalAlpha = 1;
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

/**
 * Fade what is drawn to the oval every figure is suspended in (docs/design/home-story-figures.md, ruling 11):
 * nothing shows a box. `hold` is how far out, as a share of the radius, the lower half stays solid before it
 * fades; a figure standing on ground holds its lower half longer, so the ground recedes into the dark instead of
 * ending under the thing standing on it. The upper half holds to 0.55, and the hold eases between the two so the
 * oval has no seam. The mask is built once per canvas size and hold, then laid over with destination-in.
 */
const MASKS = new Map<string, HTMLCanvasElement>();
function ovalMask(w: number, h: number, hold: number) {
	const key = `${w}x${h}@${hold}`;
	let m = MASKS.get(key);
	if (m) return m;
	if (MASKS.size > 8) MASKS.clear();
	m = document.createElement('canvas');
	m.width = w;
	m.height = h;
	const mc = m.getContext('2d')!;
	const img = mc.createImageData(w, h);
	const rx = 0.48 * w;
	const ry = (0.46 * H * h) / H;
	for (let y = 0; y < h; y++) {
		const dy = (y + 0.5 - h / 2) / ry;
		// 0.55 above the middle, easing to `hold` by halfway down
		const k = dy <= 0 ? 0 : Math.min(1, dy / 0.5);
		const inner = 0.55 + (hold - 0.55) * (k * k * (3 - 2 * k));
		for (let x = 0; x < w; x++) {
			const dx = (x + 0.5 - w / 2) / rx;
			const r = Math.sqrt(dx * dx + dy * dy);
			const a = r <= inner ? 1 : r >= 1 ? 0 : 1 - (r - inner) / (1 - inner);
			img.data[(y * w + x) * 4 + 3] = Math.round(a * 255);
		}
	}
	mc.putImageData(img, 0, 0);
	MASKS.set(key, m);
	return m;
}

export function ovalFade(ctx: Ctx, hold = 0.55) {
	const { width, height } = ctx.canvas;
	ctx.save();
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.globalCompositeOperation = 'destination-in';
	ctx.globalAlpha = 1;
	ctx.drawImage(ovalMask(width, height, hold), 0, 0);
	ctx.restore();
	ctx.globalCompositeOperation = 'source-over';
}
