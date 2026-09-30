// The home story's outbreak figure (docs/design/home-story-figures.md, section 7): beats 05 and 06 as one
// drawing that runs on from one beat into the next.
//
//   05  A spiral galaxy seen at a tilt, turning very slowly, its worlds small warm lights. A crimson haze
//       creeps in from several places at once (no first world, no lanes, no routes) until it covers most of
//       the galaxy; each world it reaches flares crimson and dims to an ember, most of them and not all. One
//       world in the disk (Valleron, never named, not at the core) grows brighter as warm motes drift in to it
//       from its neighbors before they dim: most life gathers there. The haze reaches it and thins around it.
//   06  The view closes in on that world. A Scrambler Token forms there, a hexagon of dark glass and worn
//       metal in white light. The haze draws back from it in a widening soft clear ring. A few glints, tokens
//       carried home, leave it in arcs to nearby dim worlds; each world one reaches lights again around a
//       small Generator glow in the Genesis green. Beyond them the red remains: a beginning, not a cure.
//
// What the lore does not say is not drawn: no world where the plague began, no route it took, Valleron is one
// world (not a cluster, not at the core, never untouched), the plague is not cured, and the token does not
// beam light at the worlds (tokens are carried home by the ones who win them).
//
// Everything is drawn in code from three things built once: the galaxy's disk (a texture in the galaxy's own
// plane), the haze (a low-resolution canvas in that plane, redrawn at film rate) and the deep-space ground.
// Each frame lays them on the stage under one affine turn-and-tilt, so nothing here boils: static textures
// and a slow drift. No state but the figure's clocks.
import { clamp, css, easeOut, glow, grain, H, lighter, mix, mixRGB, ramp, rng, smooth, W, type Ctx, type RGB } from './stage';
import { GROUND, MX, VR, VY0, VY1, drawMachine, machineTinted, offscreen, pics } from './generatorMachine';
import type { Figure } from './figures';

const TAU = Math.PI * 2;
const ease = (v: number) => {
	const c = clamp(v);
	return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
};

// ---- the galaxy's geometry: a disk of radius 1 in its own plane, laid on the stage tilted and turning

const CX = W / 2;
const CY = H / 2;
const RAD = 300; // the disk's radius in stage units at the start
const TILT = 0.5; // the disk's squash toward the viewer
const ROLL = -0.2; // the tilt's own turn, so the disk is not level
const SPIN = 0.03; // radians a second
const EXT = 1.15; // half the plane the textures cover

const WARM: RGB[] = [
	[255, 214, 150],
	[255, 192, 122],
	[255, 228, 192],
	[248, 172, 112],
	[240, 202, 142],
	[255, 238, 214],
];
const CRIMSON: RGB = [226, 52, 76];
const EMBER: RGB = [214, 116, 80];
const GENESIS: RGB = [150, 236, 140];
const WHITE: RGB = [255, 250, 240];
const SICK: RGB = [232, 54, 84];

// ---- the worlds

type World = {
	x: number;
	y: number;
	size: number;
	hue: RGB;
	tw: number;
	twRate: number;
	/** Stays faintly lit through the haze. */
	keep: boolean;
	/** Left out in the compact layout, which keeps fewer, larger worlds. */
	minor: boolean;
	/** When the haze reaches it, in seconds of 05. */
	it: number;
	/** Sends motes to Valleron: from, until, period, phase. */
	mote: { from: number; to: number; per: number; ph: number; bend: number } | null;
};

const rnd = rng(606);
const gauss = () => (rnd() + rnd() + rnd() - 1.5) / 0.75;
const ARMS = [
	{ off: 0, w: 1 },
	{ off: 2.25, w: 1 },
	{ off: 4.1, w: 0.5 },
];
const armAngle = (off: number, r: number) => off + 4.6 * Math.pow(r, 0.82);

const VALLERON = (() => {
	const r = 0.5;
	const a = armAngle(0, r);
	return { x: Math.cos(a) * r, y: Math.sin(a) * r };
})();
const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by);

const WORLDS: World[] = (() => {
	const out: World[] = [];
	const make = (x: number, y: number) => ({
		x,
		y,
		size: 0.7 + rnd() * 0.9,
		hue: WARM[Math.floor(rnd() * WARM.length)],
		tw: rnd() * TAU,
		twRate: 0.5 + rnd() * 0.9,
		keep: false,
		minor: false,
		it: 0,
		mote: null,
	});
	// index 0 is Valleron: mid-disk, on an arm, with nothing crowding it
	out.push(make(VALLERON.x, VALLERON.y));
	out[0].size = 1.3;
	const total = ARMS.reduce((a, b) => a + b.w, 0);
	let guard = 0;
	while (out.length < 168 && guard++ < 4000) {
		let x: number;
		let y: number;
		if (out.length < 30) {
			// the bulge
			const a = rnd() * TAU;
			const r = 0.08 + Math.pow(rnd(), 0.9) * 0.28;
			x = Math.cos(a) * r;
			y = Math.sin(a) * r * 0.9;
		} else {
			let pick = rnd() * total;
			let arm = ARMS[0];
			for (const A of ARMS) {
				if (pick < A.w) {
					arm = A;
					break;
				}
				pick -= A.w;
			}
			const r = 0.12 + 0.88 * Math.pow(rnd(), 0.82);
			const a = armAngle(arm.off, r) + (gauss() * 0.3) / (0.6 + 1.6 * r);
			x = Math.cos(a) * r;
			y = Math.sin(a) * r;
		}
		if (dist(x, y, VALLERON.x, VALLERON.y) < 0.055) continue;
		if (out.some((w) => dist(w.x, w.y, x, y) < 0.03)) continue;
		out.push(make(x, y));
	}
	return out;
})();

// the haze's sources: several places at once, none of them first, none of them near Valleron
type Source = { x: number; y: number; t0: number; speed: number; blobs: { a: number; u: number; k: number; wob: number }[] };
const SOURCES: Source[] = (() => {
	const out: Source[] = [];
	let guard = 0;
	while (out.length < 9 && guard++ < 200) {
		const a = rnd() * TAU;
		const r = 0.18 + rnd() * 0.68;
		const x = Math.cos(a) * r;
		const y = Math.sin(a) * r;
		if (dist(x, y, VALLERON.x, VALLERON.y) < 0.32) continue;
		if (out.some((s) => dist(s.x, s.y, x, y) < 0.34)) continue;
		out.push({
			x,
			y,
			t0: 0.9 + rnd() * 1.2,
			speed: 0.105 + rnd() * 0.03,
			blobs: Array.from({ length: 24 }, () => ({ a: rnd() * TAU, u: Math.sqrt(rnd()) * 0.86, k: 0.6 + rnd() * 0.8, wob: rnd() * TAU })),
		});
	}
	return out;
})();
const front = (s: Source, t: number) => clamp(s.speed * (t - s.t0) * 1.05, 0, 0.78);

// when the haze reaches each world (the nearest front, a little ragged); the ones round Valleron are kept
// back a moment so its life has time to gather
const NEAR_V = 0.42;
for (const w of WORLDS) {
	let best = 99;
	for (const s of SOURCES) best = Math.min(best, s.t0 + dist(w.x, w.y, s.x, s.y) / s.speed);
	w.it = best + rnd() * 0.5;
	const d = dist(w.x, w.y, VALLERON.x, VALLERON.y);
	if (d < NEAR_V) w.it = Math.max(w.it, 2.7 + 6 * d);
}
WORLDS[0].it = Math.max(WORLDS[0].it, 4.6);
// a few worlds on the outer arms are safe: the haze passes them and they stay warm and lit (the sources
// say few worlds are safe, so Valleron is not the only light, only the brightest)
{
	const outer = WORLDS.map((w, i) => ({ i, r: Math.hypot(w.x, w.y), a: Math.atan2(w.y, w.x) }))
		.filter((o) => o.i > 0 && o.r > 0.66 && dist(WORLDS[o.i].x, WORLDS[o.i].y, VALLERON.x, VALLERON.y) > 0.5)
		.sort((a, b) => a.a - b.a);
	for (let k = 0; k < 4 && outer.length; k++) {
		const o = outer[Math.floor(((k + 0.5) / 4) * outer.length)];
		WORLDS[o.i].keep = true;
		WORLDS[o.i].it = 99;
	}
}

// the neighbors that send life to Valleron
const NEIGHBORS: number[] = WORLDS.map((_, i) => i)
	.filter((i) => i > 0 && dist(WORLDS[i].x, WORLDS[i].y, VALLERON.x, VALLERON.y) < 0.5)
	.sort((a, b) => dist(WORLDS[a].x, WORLDS[a].y, VALLERON.x, VALLERON.y) - dist(WORLDS[b].x, WORLDS[b].y, VALLERON.x, VALLERON.y))
	.slice(0, 24);
for (const i of NEIGHBORS) {
	const w = WORLDS[i];
	w.mote = { from: 1.3 + rnd() * 0.9, to: w.it - 0.1, per: 1.5 + rnd() * 0.9, ph: rnd(), bend: (rnd() - 0.5) * 0.08 };
	w.keep = false;
}

// the dark world the token is carried to in 06: on an outer arm, far from Valleron, hazed early
const TARGET = (() => {
	let best = WORLDS[1];
	let bd = -1;
	for (let i = 1; i < WORLDS.length; i++) {
		const w = WORLDS[i];
		const r = Math.hypot(w.x, w.y);
		if (w.keep || w.mote || r < 0.6 || r > 0.88) continue;
		const d = dist(w.x, w.y, VALLERON.x, VALLERON.y);
		if (d > bd) {
			bd = d;
			best = w;
		}
	}
	return best;
})();
// the compact layout drops every other small world that has no part in the story
WORLDS.forEach((w, i) => {
	w.minor = i % 5 === 1 || i % 5 === 3;
	if (i === 0 || w.mote || w === TARGET) w.minor = false;
});

// ---- sprites and textures, built lazily and once (nothing here runs without a document)

const canvasOf = (w: number, h: number) => {
	if (typeof document === 'undefined') return null;
	const c = document.createElement('canvas');
	c.width = w;
	c.height = h;
	return c;
};

const sprites = new Map<string, HTMLCanvasElement>();
/** A soft light in one color: bright center, long falloff. Colors are stepped by 12 so the cache stays small. */
function spr(color: RGB): HTMLCanvasElement | null {
	const q = color.map((v) => Math.min(255, Math.round(clamp(v, 0, 255) / 12) * 12)) as RGB;
	const key = q.join(',');
	const hit = sprites.get(key);
	if (hit) return hit;
	const c = canvasOf(64, 64);
	const g = c?.getContext('2d');
	if (!c || !g) return null;
	const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
	grad.addColorStop(0, css(q, 1));
	grad.addColorStop(0.16, css(q, 0.62));
	grad.addColorStop(0.42, css(q, 0.2));
	grad.addColorStop(0.72, css(q, 0.05));
	grad.addColorStop(1, css(q, 0));
	g.fillStyle = grad;
	g.fillRect(0, 0, 64, 64);
	if (sprites.size > 600) sprites.clear();
	sprites.set(key, c);
	return c;
}
/** A round of solid color that falls off softly: for smoke, which wants a broad body more than a hot center. */
function puff(color: RGB): HTMLCanvasElement | null {
	const key = `p${color.join(',')}`;
	const hit = sprites.get(key);
	if (hit) return hit;
	const c = canvasOf(64, 64);
	const g = c?.getContext('2d');
	if (!c || !g) return null;
	const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
	grad.addColorStop(0, css(color, 1));
	grad.addColorStop(0.35, css(color, 0.62));
	grad.addColorStop(0.7, css(color, 0.18));
	grad.addColorStop(1, css(color, 0));
	g.fillStyle = grad;
	g.fillRect(0, 0, 64, 64);
	sprites.set(key, c);
	return c;
}

const DISK_PX = 1536;
const dpx = DISK_PX / (2 * EXT);
let diskTex: HTMLCanvasElement | null = null;
function disk() {
	if (diskTex) return diskTex;
	const c = canvasOf(DISK_PX, DISK_PX);
	const g = c?.getContext('2d');
	if (!c || !g) return null;
	const r = rng(77);
	const at = (x: number, y: number) => [DISK_PX / 2 + x * dpx, DISK_PX / 2 + y * dpx] as const;
	const put = (s: HTMLCanvasElement | null, x: number, y: number, rad: number, a: number) => {
		if (!s) return;
		const [px, py] = at(x, y);
		g.globalAlpha = a;
		g.drawImage(s, px - rad * dpx, py - rad * dpx, rad * dpx * 2, rad * dpx * 2);
	};
	g.globalCompositeOperation = 'lighter';
	// the body of the disk, faint and cool at its edge
	put(spr([70, 62, 100]), 0, 0, 1.08, 0.2);
	// the arms: broad warm glow along each, a dusty violet further out, then the fine light of its stars
	for (const arm of ARMS) {
		for (let k = 0; k < 190; k++) {
			const rr = 0.1 + 0.9 * (k / 190);
			const a = armAngle(arm.off, rr) + gauss() * 0.05;
			const x = Math.cos(a) * rr;
			const y = Math.sin(a) * rr;
			put(spr([210, 150, 100]), x, y, 0.14 + 0.06 * r(), 0.085 * arm.w * (1 - 0.4 * rr));
			if (rr > 0.5) put(spr([120, 104, 176]), x, y, 0.13, 0.05 * arm.w);
		}
		for (let k = 0; k < 900 * arm.w; k++) {
			const rr = 0.1 + 0.9 * Math.pow(r(), 0.85);
			const a = armAngle(arm.off, rr) + (gauss() * 0.34) / (0.6 + 1.5 * rr);
			put(spr(r() < 0.78 ? [255, 226, 186] : [190, 190, 236]), Math.cos(a) * rr, Math.sin(a) * rr, 0.006 + 0.008 * r(), 0.05 + 0.2 * r());
		}
	}
	for (let k = 0; k < 900; k++) {
		const a = r() * TAU;
		const rr = Math.pow(r(), 1.3) * 0.95;
		put(spr([240, 210, 170]), Math.cos(a) * rr, Math.sin(a) * rr * 0.95, 0.005 + 0.006 * r(), 0.06 + 0.25 * r());
	}
	// dust lanes: dark along the inner edge of every arm
	g.globalCompositeOperation = 'source-over';
	for (const arm of ARMS) {
		for (let k = 0; k < 120; k++) {
			const rr = 0.2 + 0.75 * (k / 120);
			const a = armAngle(arm.off, rr) - 0.2 / (0.5 + rr) + gauss() * 0.03;
			put(puff([6, 4, 10]), Math.cos(a) * rr, Math.sin(a) * rr, 0.05 + 0.06 * r(), 0.2 * arm.w);
		}
	}
	// the core: a warm bulge and a hot heart
	g.globalCompositeOperation = 'lighter';
	put(spr([220, 150, 96]), 0, 0, 0.46, 0.6);
	put(spr([255, 206, 148]), 0, 0, 0.22, 0.72);
	put(spr([255, 240, 214]), 0, 0, 0.08, 0.85);
	g.globalAlpha = 1;
	g.globalCompositeOperation = 'source-over';
	diskTex = c;
	return c;
}

const HZ = 448;
const hk = HZ / (2 * EXT);
type HazeState = { cv: HTMLCanvasElement | null; key: number };
let laneMask: HTMLCanvasElement | null = null;
let eraser: HTMLCanvasElement | null = null;
let softEraser: HTMLCanvasElement | null = null;
let edgeMask: HTMLCanvasElement | null = null;
let grainPat: CanvasPattern | null = null;
function makeHazeParts(g0: CanvasRenderingContext2D) {
	// a clean-edged round: the haze is taken out of it, and true dark is laid in it
	const round = (stops: [number, string][]) => {
		const c = canvasOf(128, 128);
		const cg = c?.getContext('2d');
		if (!c || !cg) return null;
		const grad = cg.createRadialGradient(64, 64, 0, 64, 64, 64);
		for (const [o, col] of stops) grad.addColorStop(o, col);
		cg.fillStyle = grad;
		cg.fillRect(0, 0, 128, 128);
		return c;
	};
	eraser = round([[0, 'rgba(0,0,0,1)'], [0.88, 'rgba(0,0,0,1)'], [1, 'rgba(0,0,0,0)']]);
	softEraser = round([[0, 'rgba(0,0,0,1)'], [0.4, 'rgba(0,0,0,0.75)'], [1, 'rgba(0,0,0,0)']]);
	const m = canvasOf(HZ, HZ);
	const mg = m?.getContext('2d');
	if (m && mg) {
		const grad = mg.createRadialGradient(HZ / 2, HZ / 2, 0, HZ / 2, HZ / 2, HZ / 2);
		const a = (1.0 * hk) / (HZ / 2);
		grad.addColorStop(0, 'rgba(0,0,0,1)');
		grad.addColorStop(clamp(a * 0.85), 'rgba(0,0,0,1)');
		grad.addColorStop(clamp(a * 1.12), 'rgba(0,0,0,0)');
		grad.addColorStop(1, 'rgba(0,0,0,0)');
		mg.fillStyle = grad;
		mg.fillRect(0, 0, HZ, HZ);
		edgeMask = m;
	}
	// between the arms the haze is 40 percent thinner, so the galaxy stays readable as it dies
	const lm = canvasOf(HZ, HZ);
	const lg = lm?.getContext('2d');
	const dot = spr([255, 255, 255]);
	if (lm && lg && dot) {
		lg.fillStyle = 'rgba(0,0,0,0.4)';
		lg.fillRect(0, 0, HZ, HZ);
		lg.globalCompositeOperation = 'destination-out';
		for (const arm of ARMS)
			for (let k = 0; k < 260; k++) {
				const rr = 0.08 + 0.92 * (k / 260);
				const a = armAngle(arm.off, rr);
				const rad = 0.13 * hk;
				lg.globalAlpha = 0.9;
				lg.drawImage(dot, HZ / 2 + Math.cos(a) * rr * hk - rad, HZ / 2 + Math.sin(a) * rr * hk - rad, rad * 2, rad * 2);
			}
		laneMask = lm;
	}
	// a fixed grain the smoke is eaten by, so it reads as wisps and not as flat stickers
	const n = canvasOf(96, 96);
	const ng = n?.getContext('2d');
	if (n && ng) {
		const img = ng.createImageData(96, 96);
		const r = rng(808);
		for (let k = 0; k < img.data.length; k += 4) {
			img.data[k + 3] = Math.floor(Math.pow(r(), 1.6) * 255);
		}
		ng.putImageData(img, 0, 0);
		grainPat = g0.createPattern(n, 'repeat');
	}
}

const thinR = (t0: number) => 0.07 * smooth(WORLDS[0].it - 0.3, WORLDS[0].it + 2, t0);

/**
 * The haze, in the galaxy's plane: soft grainy smoke from several sources at once, each a cloud of large
 * blobs that grows and drifts, thinned round Valleron and, in 06, drawn back from it in a widening clear ring.
 */
function paintHaze(st: HazeState, t0: number, t1: number) {
	if (!st.cv) st.cv = canvasOf(HZ, HZ);
	const g = st.cv?.getContext('2d');
	if (!st.cv || !g) return null;
	if (!eraser) makeHazeParts(g);
	g.setTransform(1, 0, 0, 1, 0, 0);
	g.globalCompositeOperation = 'source-over';
	g.clearRect(0, 0, HZ, HZ);
	const smoke = puff([88, 10, 28]);
	const red = puff([214, 46, 68]);
	for (const s of SOURCES) {
		const R = front(s, t0);
		if (R <= 0.004) continue;
		const born = smooth(0.02, 0.3, R);
		for (const b of s.blobs) {
			const a = b.a + 0.05 * t0 + 0.2 * Math.sin(t0 * 0.3 + b.wob);
			const x = s.x + Math.cos(a) * b.u * R;
			const y = s.y + Math.sin(a) * b.u * R;
			const rad = (0.09 + R * 0.42) * b.k;
			const px = HZ / 2 + x * hk;
			const py = HZ / 2 + y * hk;
			const rp = rad * hk;
			if (smoke) {
				g.globalAlpha = 0.085 * born;
				g.drawImage(smoke, px - rp * 1.3, py - rp * 1.3, rp * 2.6, rp * 2.6);
			}
			if (red) {
				g.globalAlpha = 0.05 * born;
				g.drawImage(red, px - rp, py - rp, rp * 2, rp * 2);
			}
		}
	}
	g.globalAlpha = 1;
	// nothing beyond the disk's edge
	if (edgeMask) {
		g.globalCompositeOperation = 'destination-in';
		g.drawImage(edgeMask, 0, 0);
	}
	if (laneMask) {
		g.globalCompositeOperation = 'destination-out';
		g.drawImage(laneMask, 0, 0);
	}
	// eaten by the grain
	if (grainPat) {
		g.globalCompositeOperation = 'destination-out';
		g.globalAlpha = 0.5;
		g.fillStyle = grainPat;
		g.fillRect(0, 0, HZ, HZ);
		g.globalAlpha = 1;
	}
	const px = HZ / 2 + VALLERON.x * hk;
	const py = HZ / 2 + VALLERON.y * hk;
	g.globalCompositeOperation = 'destination-out';
	// the haze thins round Valleron, softly
	const th = thinR(t0);
	if (softEraser && th > 0.004) {
		g.globalAlpha = 0.85;
		g.drawImage(softEraser, px - th * 1.7 * hk, py - th * 1.7 * hk, th * 3.4 * hk, th * 3.4 * hk);
	}
	g.globalAlpha = 1;
	g.globalCompositeOperation = 'source-over';
	return st.cv;
}

// deep space is never flat black: faint dust, a few far stars and a low grain, built once at low resolution
let ground: HTMLCanvasElement | null = null;
function space() {
	if (ground) return ground;
	const w = 500;
	const h = 281;
	const c = canvasOf(w, h);
	const g = c?.getContext('2d');
	if (!c || !g) return null;
	const r = rng(31);
	const base = g.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, w * 0.62);
	base.addColorStop(0, css([16, 15, 30]));
	base.addColorStop(1, css([6, 6, 14]));
	g.fillStyle = base;
	g.fillRect(0, 0, w, h);
	for (let k = 0; k < 46; k++) {
		const s = puff(k % 3 ? [52, 40, 84] : [40, 50, 78]);
		if (!s) break;
		const rad = 50 + r() * 110;
		g.globalAlpha = 0.05 + 0.06 * r();
		g.drawImage(s, r() * w - rad, r() * h - rad * 0.7, rad * 2, rad * 1.4);
	}
	g.globalAlpha = 1;
	for (let k = 0; k < 170; k++) {
		g.fillStyle = css([200, 200, 230], 0.12 + 0.4 * r() * r());
		g.fillRect(Math.floor(r() * w), Math.floor(r() * h), 1, 1);
	}
	const img = g.getImageData(0, 0, w, h);
	const nr = rng(5);
	for (let k = 0; k < img.data.length; k += 4) {
		const n = (nr() - 0.5) * 7;
		img.data[k] += n;
		img.data[k + 1] += n;
		img.data[k + 2] += n * 1.2;
	}
	g.putImageData(img, 0, 0);
	ground = c;
	return c;
}

// ---- the Scrambler Token: a designed object, drawn once. Six bevel faces each shaded as its own flat value
// (warm toward Valleron's light, cool away from it), a dark inner lip, dark glass with a faint hex grid, a
// glint, worn scratches, one chipped corner and a crimson rim light from the haze on the lower right.
// (The hexagon's look is carried from token.ts; the shape is shorthand, the sources give none.)

const CHIP_N = 340;
const CHIP_R = 118;
const CHIP_CENTER = { x: CHIP_N / 2, y: CHIP_N / 2 };
let chipTex: HTMLCanvasElement | null = null;
let chipSoft: HTMLCanvasElement | null = null;
function chip() {
	if (chipTex) return chipTex;
	const c = canvasOf(CHIP_N, CHIP_N);
	const g = c?.getContext('2d');
	if (!c || !g) return null;
	const yaw = 0.12;
	const tilt = 0.08;
	const THICK = 24;
	const LIGHT_A = (150 * Math.PI) / 180; // toward Valleron: up and to the left
	const orient = (x: number, y: number, z: number) => {
		const x1 = x * Math.cos(yaw) + z * Math.sin(yaw);
		const z1 = -x * Math.sin(yaw) + z * Math.cos(yaw);
		return { x: x1, y: y * Math.cos(tilt) - z1 * Math.sin(tilt), z: y * Math.sin(tilt) + z1 * Math.cos(tilt) };
	};
	const P = (x: number, y: number, z: number): [number, number] => {
		const o = orient(x, y, z);
		return [CHIP_N / 2 + o.x, CHIP_N / 2 - o.y];
	};
	type V = [number, number, number];
	const hex = (R: number, z: number): V[] => Array.from({ length: 6 }, (_, k) => [Math.cos((Math.PI / 3) * k + Math.PI / 6) * R, Math.sin((Math.PI / 3) * k + Math.PI / 6) * R, z] as V);
	const poly = (pts: V[]) => {
		g.beginPath();
		pts.forEach((p, k) => {
			const q = P(p[0], p[1], p[2]);
			if (k) g.lineTo(q[0], q[1]);
			else g.moveTo(q[0], q[1]);
		});
		g.closePath();
	};
	const lit = (a: V, b: V) => clamp(0.42 + 0.85 * Math.cos(Math.atan2((a[1] + b[1]) / 2, (a[0] + b[0]) / 2) - LIGHT_A));
	const outer = hex(CHIP_R, 0);
	const back = hex(CHIP_R, -THICK);
	const mid = hex(CHIP_R - 20, 5);
	const face = hex(CHIP_R - 38, 2);
	// the thickness below, in shadow
	for (let k = 0; k < 6; k++) {
		const a = outer[k];
		const b = outer[(k + 1) % 6];
		if ((a[1] + b[1]) / 2 > 0) continue;
		poly([a, b, back[(k + 1) % 6], back[k]]);
		g.fillStyle = css([26, 24, 24]);
		g.fill();
	}
	// the outer bevel: each face one flat value, warm (#e0b884) toward the light, cool (#5a5f66) away
	for (let k = 0; k < 6; k++) {
		const a = outer[k];
		const b = outer[(k + 1) % 6];
		poly([a, b, mid[(k + 1) % 6], mid[k]]);
		g.fillStyle = css(mixRGB([90, 95, 102], [224, 184, 132], Math.pow(lit(a, b), 1.5)), 0.96);
		g.fill();
	}
	// the step down: darker, a little warm where it faces the light
	for (let k = 0; k < 6; k++) {
		const a = mid[k];
		const b = mid[(k + 1) % 6];
		poly([a, b, face[(k + 1) % 6], face[k]]);
		g.fillStyle = css(mixRGB([20, 22, 26], [92, 78, 64], lit(a, b) * 0.55));
		g.fill();
	}
	// the dark glass
	poly(face);
	const c0 = P(-30, 40, 2);
	const grad = g.createRadialGradient(c0[0], c0[1], 4, CHIP_N / 2, CHIP_N / 2, CHIP_R);
	grad.addColorStop(0, css([24, 32, 38]));
	grad.addColorStop(1, css([6, 9, 11]));
	g.fillStyle = grad;
	g.fill();
	// a faint micro hex grid under the glass, and one short curved glint in a corner
	g.save();
	poly(face);
	g.clip();
	g.strokeStyle = 'rgba(196,216,226,0.08)';
	g.lineWidth = 1.2;
	const cs = 11;
	for (let j = -12; j <= 12; j++)
		for (let i = -12; i <= 12; i++) {
			const cx = cs * Math.sqrt(3) * (i + j / 2);
			const cy = cs * 1.5 * j;
			if (Math.hypot(cx, cy) > CHIP_R) continue;
			g.beginPath();
			for (let k = 0; k < 6; k++) {
				const an = (Math.PI / 3) * k + Math.PI / 6;
				const q = P(cx + Math.cos(an) * cs, cy + Math.sin(an) * cs, 3);
				if (k) g.lineTo(q[0], q[1]);
				else g.moveTo(q[0], q[1]);
			}
			g.closePath();
			g.stroke();
		}
	g.restore();
	const gs = P(-76, 22, 3);
	const gc = P(-70, 58, 3);
	const ge = P(-42, 74, 3);
	g.strokeStyle = 'rgba(255,255,255,0.2)';
	g.lineWidth = 4;
	g.lineCap = 'round';
	g.beginPath();
	g.moveTo(gs[0], gs[1]);
	g.quadraticCurveTo(gc[0], gc[1], ge[0], ge[1]);
	g.stroke();
	// a 1 px dark inner lip where the glass meets the metal
	poly(face);
	g.strokeStyle = 'rgba(0,0,0,0.85)';
	g.lineWidth = 2;
	g.stroke();
	// wear: three scratches on the bevel
	const mark = (x0: number, y0: number, x1: number, y1: number, col: string, w: number) => {
		const a = P(x0, y0, 4);
		const b = P(x1, y1, 4);
		g.strokeStyle = col;
		g.lineWidth = w;
		g.beginPath();
		g.moveTo(a[0], a[1]);
		g.lineTo(b[0], b[1]);
		g.stroke();
	};
	mark(-100, 30, -84, 58, 'rgba(244,236,220,0.75)', 2.4);
	mark(-38, 100, -14, 108, 'rgba(244,236,220,0.6)', 2.4);
	mark(62, -88, 88, -70, 'rgba(18,16,14,0.7)', 2.4);
	// the haze's rim light along the lower right
	g.strokeStyle = 'rgba(176,48,58,0.5)';
	g.lineWidth = 5;
	g.lineCap = 'butt';
	for (let k = 0; k < 6; k++) {
		const a = outer[k];
		const b = outer[(k + 1) % 6];
		if (Math.cos(Math.atan2((a[1] + b[1]) / 2, (a[0] + b[0]) / 2) + 0.95) < 0.55) continue;
		const pa = P(a[0], a[1], -THICK * 0.4);
		const pb = P(b[0], b[1], -THICK * 0.4);
		g.beginPath();
		g.moveTo(pa[0], pa[1]);
		g.lineTo(pb[0], pb[1]);
		g.stroke();
	}
	// one chipped corner
	g.globalCompositeOperation = 'destination-out';
	{
		const t = (a: V, b: V, f: number): V => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2]];
		poly([outer[4], t(outer[4], outer[3], 0.17), t(outer[4], outer[5], 0.15)]);
		g.fill();
	}
	g.globalCompositeOperation = 'source-over';
	chipTex = c;
	return c;
}
/** A soft copy of the chip (drawn small, blown up), which sharpens into the real one as the token forms. */
function chipBlur() {
	if (chipSoft) return chipSoft;
	const t = chip();
	const c = canvasOf(70, 70);
	const g = c?.getContext('2d');
	if (!t || !c || !g) return null;
	g.drawImage(t, 0, 0, 70, 70);
	chipSoft = c;
	return c;
}

// ---- 06's world: a dark, hazed world with a dormant Generator on it. The machine is the Generators figure's own
// (generatorMachine.ts), unlit: its vat dark and empty, its sensor ring and pad lights out, its readout flat,
// lit only by the crimson haze with a cool rim from the sky. The one new part is a socket below the vat for the
// token. The place (sky, a dim red sun through the haze, two ridges, the ground) is built once into `sceneBg`;
// the haze, the machine, the token and the life it brings are drawn over it each frame.

let GY = 410; // where the machine's feet stand, in stage units (a little lower in compact, where the machine is larger)
const HORIZON = 396; // where the limb of the world flattens to
let sceneBg: HTMLCanvasElement | null = null;
const hazeTex: (HTMLCanvasElement | null)[] = [];
function hazePuff(v: number) {
	const hit = hazeTex[v];
	if (hit) return hit;
	const c = canvasOf(128, 128);
	const g = c?.getContext('2d');
	if (!c || !g) return null;
	const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
	grad.addColorStop(0, css([214, 46, 68], 1));
	grad.addColorStop(0.4, css([214, 46, 68], 0.5));
	grad.addColorStop(0.75, css([214, 46, 68], 0.14));
	grad.addColorStop(1, css([214, 46, 68], 0));
	g.fillStyle = grad;
	g.fillRect(0, 0, 128, 128);
	// grainy: the smoke is eaten by a fixed noise, so it reads as wisps and not as flat clouds
	const img = g.getImageData(0, 0, 128, 128);
	const r = rng(500 + v);
	for (let k = 3; k < img.data.length; k += 4) img.data[k] = Math.round(img.data[k] * (0.45 + 0.55 * Math.pow(r(), 0.7)));
	g.putImageData(img, 0, 0);
	return (hazeTex[v] = c);
}
function scene() {
	if (sceneBg) return sceneBg;
	const c = canvasOf(W, H);
	const g = c?.getContext('2d');
	if (!c || !g) return null;
	const r = rng(404);
	// sky: dead and dim, warming to a crimson horizon
	const sky = g.createLinearGradient(0, 0, 0, HORIZON);
	sky.addColorStop(0, css([8, 6, 15]));
	sky.addColorStop(0.5, css([26, 10, 24]));
	sky.addColorStop(1, css([76, 22, 34]));
	g.fillStyle = sky;
	g.fillRect(0, 0, W, H);
	for (let k = 0; k < 80; k++) {
		g.fillStyle = css([210, 200, 225], 0.1 + 0.3 * r() * r());
		g.fillRect(Math.floor(r() * W), Math.floor(r() * 250), 1, 1);
	}
	// a faint red sun, low toward the horizon: a firmer disc under a veil of haze
	const sunX = 735;
	const sunY = 338;
	const sd = g.createRadialGradient(sunX, sunY, 0, sunX, sunY, 24);
	sd.addColorStop(0, css([204, 78, 62], 0.5));
	sd.addColorStop(0.86, css([190, 64, 54], 0.42));
	sd.addColorStop(1, css([196, 66, 56], 0));
	g.fillStyle = sd;
	g.beginPath();
	g.arc(sunX, sunY, 24, 0, TAU);
	g.fill();
	const sun = puff([196, 62, 54]);
	if (sun) {
		g.globalAlpha = 0.5;
		g.drawImage(sun, sunX - 63, sunY - 63, 126, 126);
		g.globalAlpha = 1;
	}
	// two value layers of low ridges, the far one paler in the haze
	const ridge = (y0: number, amp: number, col: RGB, seed: number) => {
		const rr = rng(seed);
		const ph = [rr() * 6, rr() * 6, rr() * 6];
		g.beginPath();
		g.moveTo(0, H);
		for (let x = 0; x <= W; x += 8) g.lineTo(x, y0 + amp * (0.5 * Math.sin(x * 0.011 + ph[0]) + 0.3 * Math.sin(x * 0.027 + ph[1]) + 0.2 * Math.sin(x * 0.06 + ph[2])));
		g.lineTo(W, H);
		g.closePath();
		g.fillStyle = css(col);
		g.fill();
	};
	ridge(352, 26, [50, 18, 32], 1);
	ridge(378, 18, [26, 11, 21], 2);
	// a soft haze band lying between them
	const band = g.createLinearGradient(0, 340, 0, 396);
	band.addColorStop(0, css([150, 34, 48], 0));
	band.addColorStop(0.7, css([150, 34, 48], 0.22));
	band.addColorStop(1, css([150, 34, 48], 0));
	g.fillStyle = band;
	g.fillRect(0, 340, W, 56);
	const ground = g.createLinearGradient(0, 394, 0, H);
	ground.addColorStop(0, css([34, 15, 24]));
	ground.addColorStop(1, css([28, 13, 21]));
	g.fillStyle = ground;
	g.fillRect(0, 394, W, H - 394);
	// low noise so the flat darks are not flat
	const img = g.getImageData(0, 0, W, H);
	const nr = rng(3);
	for (let k = 0; k < img.data.length; k += 4) {
		const n = (nr() - 0.5) * 6;
		img.data[k] += n;
		img.data[k + 1] += n * 0.8;
		img.data[k + 2] += n;
	}
	g.putImageData(img, 0, 0);
	sceneBg = c;
	return c;
}
// the low haze on the ground and at the horizon: layered wisps that drift a little; the life in the vat draws them back
const HAZES = (() => {
	const r = rng(77);
	return Array.from({ length: 40 }, (_, k) => {
		const layer = k % 4; // 0 high and faint, 1 to 3 on the ground, nearer the viewer lower and larger
		return { x: 60 + r() * 880, y: layer === 0 ? 352 + r() * 40 : 396 + layer * 22 + r() * 26, rx: 80 + r() * 150 + layer * 30, ry: layer === 0 ? 20 + r() * 22 : 20 + r() * 26 + layer * 6, a: layer === 0 ? 0.24 + r() * 0.12 : 0.42 + r() * 0.16, ph: r() * TAU, sp: 2 + r() * 4, v: k % 2 };
	});
})();
// wisps that drift across the front of the machine
const WISPS = (() => {
	const r = rng(91);
	return Array.from({ length: 8 }, (_, k) => ({ x: (k / 7 - 0.5) * 460 + (r() - 0.5) * 40, y: 318 + r() * 86, rx: 90 + r() * 70, ry: 22 + r() * 16, a: 0.16 + r() * 0.08, ph: r() * TAU, sp: 0.8 + r() * 1.2, v: k % 2 }));
})();
// wisps behind the machine, slower, at a different depth
const WISPS_BACK = (() => {
	const r = rng(191);
	return Array.from({ length: 6 }, (_, k) => ({ x: (k / 5 - 0.5) * 520 + (r() - 0.5) * 60, y: 300 + r() * 80, rx: 110 + r() * 80, ry: 24 + r() * 18, a: 0.3 + r() * 0.08, ph: r() * TAU, sp: 0.4 + r() * 0.5, v: (k + 1) % 2 }));
})();
// the curl at the dome's edge: haze piled where it was pushed back
const CURL = Array.from({ length: 12 }, (_, k) => ({ side: k % 2 ? 1 : -1, dy: (Math.floor(k / 2) - 2.5) * 6, r: 46 + ((k * 37) % 26), v: k % 2 }));

type PutFn = (s: HTMLCanvasElement | null, x: number, y: number, r: number, a: number) => void;

/** The world the dormant machine stands in: the crimson haze's ambient, no painting behind it. */
function dormantWorld() {
	if (pics[4]) return;
	const o = offscreen(2, 2);
	if (o) pics[4] = { c: o.c, light: [190, 54, 66], side: 0.55, amb: [124, 50, 62], sky: [60, 20, 30] };
}

export function createOutbreak(): Figure {
	let stage = 0;
	let present = false;
	let vis = 0;
	/** How much of the field (all but the one bright world) is drawn: it leaves fast when the figure pulls back. */
	let field = 1;
	/** 05's clock: the haze's, and it keeps running so the galaxy goes on living. */
	let t0 = 0;
	/** 06's clock, from the moment it is entered; it winds back when Back runs 06 in reverse. */
	let t1 = 0;
	const haze: HazeState = { cv: null, key: -1 };
	const zoomAt = () => ease(ramp(0, 1.3, t1));
	// the anchor is the galaxy's heart, and at 06 the figure's own center (it pulls into a neutral point there)
	const anchor = () => {
		const k = smooth(0.8, 1.6, t1);
		return { x: CX, y: mix(CY, 262, k) };
	};

	// per-frame scratch
	const sx = new Float32Array(WORLDS.length);
	const sy = new Float32Array(WORLDS.length);

	return {
		stages: 2,
		reset(s) {
			stage = s;
			vis = 0;
			field = 1;
			t0 = s === 0 ? 0 : 9.5;
			t1 = 0;
			haze.key = -1;
		},
		settle(s) {
			stage = s;
			present = true;
			vis = 1;
			field = 1;
			t0 = s === 0 ? 8.8 : 9.5;
			t1 = s === 1 ? 10 : 0;
			haze.key = -1;
		},
		step(dt, s, isPresent) {
			if (s !== stage && s >= 0) stage = s;
			present = isPresent;
			vis += ((present ? 1 : 0) - vis) * (1 - Math.exp(-dt * (present ? 2.6 : 7)));
			if (vis < 0.002 && !present) vis = 0;
			// pulling back, everything is folded into one point in about a quarter second
			field += ((present ? 1 : 0) - field) * (1 - Math.exp(-dt * (present ? 8 : 16)));
			t0 += dt;
			t1 = Math.max(0, t1 + dt * (stage === 1 ? 1 : -2.5));
		},
		visible: () => vis > 0.005,
		// the dive always plays through, even before its beat is live; so does running back out
		busy: (s, isPresent) => Math.abs((isPresent ? 1 : 0) - vis) > 0.004 || (s === 1 && stage !== 1) || (s === 1 && isPresent && t1 < 2.4) || (s !== 1 && t1 > 0.01),
		anchor,
		// 05 pulls out in crimson; 06 leaves in a neutral warm white (nothing leaves a Generator, so nothing green)
		light: (): RGB => (stage === 1 ? [255, 240, 222] : SICK),
		draw(ctx, sec, opts) {
			if (vis <= 0.005) return;
			const compact = !!opts?.compact;
			GY = compact ? 426 : 410;
			// 06's pieces are built one at a time while 05 plays, so none of them costs a frame when the dive needs it
			if (stage === 0 && t1 === 0) {
				if (t0 > 3 && !chipTex) chip();
				else if (t0 > 3.6 && !hazeTex[1]) {
					hazePuff(0);
					hazePuff(1);
				} else if (t0 > 4.2 && !sceneBg) scene();
				else if (t0 > 5 && !pics[4]) {
					dormantWorld();
					machineTinted(4);
				}
			}
			const e = zoomAt();
			// the dive: exponential, so the world ahead grows steadily
			const z = Math.exp(Math.log(40) * e);
			const zsV = Math.pow(Math.min(z, 1.5), 0.5) * (compact ? 1.5 : 1);
			const zs = Math.pow(Math.min(z, 3), 0.5) * (compact ? 1.5 : 1);
			// the plane onto the stage: turn, tilt, roll, then the camera diving to the dark world
			const th = sec * SPIN + 0.6;
			const ct = Math.cos(th);
			const st = Math.sin(th);
			const cr = Math.cos(ROLL);
			const sr = Math.sin(ROLL);
			const lin = (px: number, py: number) => {
				const a = (px * ct - py * st) * RAD;
				const b = (px * st + py * ct) * RAD * TILT;
				return [a * cr - b * sr, a * sr + b * cr] as const;
			};
			const ex = lin(1, 0);
			const ey = lin(0, 1);
			const tt = lin(TARGET.x, TARGET.y);
			const m = { a: z * ex[0], b: z * ex[1], c: z * ey[0], d: z * ey[1], ox: CX - z * e * tt[0], oy: CY - z * e * tt[1] };
			WORLDS.forEach((w, i) => {
				sx[i] = m.a * w.x + m.c * w.y + m.ox;
				sy[i] = m.b * w.x + m.d * w.y + m.oy;
			});
			const vx = sx[0];
			const vy = sy[0];
			// the direction the far bright point lies from the dark world (where the token comes from)
			const vd = lin(VALLERON.x - TARGET.x, VALLERON.y - TARGET.y);
			// Valleron stays in the sky of the dark world, in the direction it lies from it: the token falls from there
			const vdl = Math.hypot(vd[0], vd[1]) || 1;
			const nxv = vd[0] / vdl;
			const nyv = vd[1] / vdl;
			const starX = CX + (nxv < 0 ? -1 : 1) * Math.max(Math.abs(nxv) * 330, 230);
			const starY = Math.min(CY + nyv * 200, 176);

			ctx.save();
			// bloom out of (and pull back into) the anchor
			const an = anchor();
			const bs = 0.12 + 0.88 * easeOut(vis);
			ctx.translate(an.x, an.y);
			ctx.scale(bs, bs);
			ctx.translate(-an.x, -an.y);
			ctx.globalAlpha = 1;
			// the galaxy dissolves as the world ahead grows into a limb and flattens to a horizon
			const galA = 1 - smooth(0.5, 1.2, t1);
			const dive = ramp(0.5, 1.9, t1);
			const sceneA = smooth(1.5, 2.3, t1);
			// everything of the galaxy is drawn at A; the bright world's own light at vis * galA
			const A = vis * field * galA;
			const As = vis * field;
			const mk =
				(c: Ctx, k: number): PutFn =>
				(s, x, y, r, a) => {
					if (!s || a <= 0.004 || r <= 0.4) return;
					c.globalAlpha = clamp(a * k);
					c.drawImage(s, x - r, y - r, r * 2, r * 2);
				};
			const put = mk(ctx, A);
			const putV = mk(ctx, vis * galA);
			if (!eraser) paintHaze(haze, t0, t1); // builds the sprites before the first frame uses them

			// ---- the galaxy: deep space, the disk, the haze and every world's light
			if (A > 0.004) {
				const gr = space();
				if (gr) {
					ctx.globalAlpha = A;
					ctx.drawImage(gr, 0, 0, W, H);
				}
				const tex = disk();
				const cover = smooth(1.5, 8, t0);
				if (tex) {
					ctx.save();
					ctx.transform(m.a, m.b, m.c, m.d, m.ox, m.oy);
					ctx.globalAlpha = A * (1 - 0.3 * cover);
					ctx.drawImage(tex, -EXT, -EXT, EXT * 2, EXT * 2);
					ctx.restore();
				}
				const key = Math.floor(t0 * 12) * 4096;
				const hz = key === haze.key && haze.cv ? haze.cv : paintHaze(haze, t0, t1);
				haze.key = key;
				if (hz) {
					ctx.save();
					ctx.transform(m.a, m.b, m.c, m.d, m.ox, m.oy);
					ctx.globalAlpha = A;
					ctx.drawImage(hz, -EXT, -EXT, EXT * 2, EXT * 2);
					ctx.restore();
				}
				ctx.globalCompositeOperation = 'lighter';
				for (let i = 1; i < WORLDS.length; i++) {
					const w = WORLDS[i];
					if (compact && w.minor) continue;
					const age = t0 - w.it;
					let col: RGB = w.hue;
					let b = 0.7 + 0.15 * Math.sin(sec * w.twRate + w.tw);
					let flare = 0;
					let dim = 0;
					if (age > 0) {
						flare = smooth(0, 0.2, age) * (1 - smooth(0.2, 1.1, age));
						dim = smooth(0.25, 1.4, age);
						col = mixRGB(mixRGB(w.hue, CRIMSON, smooth(0, 0.25, age)), EMBER, dim);
						b = mix(b, 0.3, dim) + 0.9 * flare;
					}
					const size = w.size * (1 + 0.9 * flare);
					put(spr(col), sx[i], sy[i], mix(6 + size * 4.6, 3.4, dim) * zs, 0.4 * b);
					put(spr(mixRGB(col, WHITE, 0.45 * (1 - dim))), sx[i], sy[i], mix(1.7 + size * 1.2, 1.2, dim) * zs, Math.min(1, 0.95 * b));
				}
				if (t0 < 8 && t1 < 0.6) {
					for (const i of NEIGHBORS) {
						const mo = WORLDS[i].mote;
						if (!mo || (compact && WORLDS[i].minor)) continue;
						if (t0 < mo.from || t0 > mo.to) continue;
						const u = ((((t0 - mo.from) / mo.per + mo.ph) % 1) + 1) % 1;
						const k = ease(u);
						const bend = Math.sin(u * Math.PI) * mo.bend * RAD * z;
						put(spr(WARM[0]), mix(sx[i], vx, k) + bend, mix(sy[i], vy, k) - bend * 0.6, 5 * zs, Math.sin(u * Math.PI));
						put(spr(WHITE), mix(sx[i], vx, k) + bend, mix(sy[i], vy, k) - bend * 0.6, 1.6 * zs, Math.sin(u * Math.PI) * 0.9);
					}
				}
				// Valleron: a small bright world in a warm corona with a ring of motes gathering round it (its look in 05)
				const gather = smooth(1.4, 5.2, t0);
				const vb = 1 + 1.5 * gather + 0.1 * Math.sin(sec * 0.8);
				putV(spr([255, 214, 150]), vx, vy, (30 + 30 * gather) * zsV * (1 + 0.04 * Math.sin(sec * 1.3)), 0.3 + 0.3 * gather);
				putV(spr([255, 236, 200]), vx, vy, (9 + 6 * gather) * zsV, Math.min(1, 0.55 * vb));
				putV(spr(WHITE), vx, vy, (3.2 + 1.4 * gather) * zsV, 0.95);
				const ringIn = smooth(1.4, 4.2, t0);
				for (let k = 0; k < 12; k++) {
					const a2 = (k / 12) * TAU + sec * 0.22;
					const rx = Math.cos(a2) * (17 + 7 * gather) * zsV;
					const ry = Math.sin(a2) * (17 + 7 * gather) * zsV * 0.6;
					putV(spr([255, 226, 176]), vx + rx * cr - ry * sr, vy + rx * sr + ry * cr, 1.7 * zsV, ringIn * (0.5 + 0.4 * Math.sin(sec * 1.6 + k * 1.9)));
				}
				ctx.globalCompositeOperation = 'source-over';
			}

			// ---- the dive's end: the dark world grows into a limb and flattens into the horizon
			if (dive > 0 && dive < 1.001 && As > 0.004) {
				const pa = smooth(0.4, 0.9, t1) * (1 - smooth(1.8, 2.3, t1)) * As;
				if (pa > 0.004) {
					const d = ease(dive);
					const Rp = 40 * Math.pow(120, d);
					const hy = mix(CY - 6, HORIZON, d);
					ctx.globalAlpha = pa;
					// the glow of haze above the limb, as wide as the limb is
					const hw = Math.min(760, 2.6 * Rp + 80);
					const hzp = hazePuff(0);
					if (hzp) ctx.drawImage(hzp, CX - hw, hy - 70, hw * 2, 130);
					ctx.beginPath();
					ctx.arc(CX, hy + Rp, Rp, 0, TAU);
					ctx.fillStyle = css([18, 8, 15]);
					ctx.fill();
					ctx.strokeStyle = css([190, 54, 66], 0.8);
					ctx.lineWidth = 2;
					ctx.beginPath();
					ctx.arc(CX, hy + Rp, Rp, Math.PI * 1.15, Math.PI * 1.85);
					ctx.stroke();
				}
			}

			// ---- 06: the dark world, the dormant Generator, the token, and the life it brings
			const bgS = sceneA > 0.01 ? scene() : null;
			if (bgS && As > 0.004) {
				const sA = As * sceneA;
				const putS = mk(ctx, sA);
				ctx.globalAlpha = sA;
				ctx.drawImage(bgS, 0, 0, W, H);

				// the timeline of the machine's waking
				const rise = easeOut(ramp(1.8, 2.9, t1));
				const seatAt = 3.2; // the token seats
				const slotOn = smooth(seatAt, seatAt + 0.3, t1);
				const link = ramp(seatAt, seatAt + 0.35, t1);
				const fill = easeOut(ramp(3.55, 5.25, t1));
				const awake = smooth(3.9, 5.1, t1);
				const domeOn = easeOut(ramp(6.0, 7.5, t1));
				const pulse = 0.94 + 0.06 * Math.sin(sec * 1.2);
				const s = compact ? 1.08 : 0.88;
				const MH = 370 * s; // the machine's height on the stage
				const rx = 250;
				const ry = 1.2 * MH;
				// stage position of a point in the machine's own units
				const px = (x: number) => CX + (x - MX) * s;
				const py = (y: number) => GY + (y - GROUND) * s;
				const lightBoost = mixRGB([190, 54, 66], [236, 170, 120], domeOn);

				// the sky behind the machine turns from red toward a dim violet-blue as the dome grows
				if (domeOn > 0.01) {
					const vg2 = ctx.createRadialGradient(CX, 300, 20, CX, 300, 430);
					vg2.addColorStop(0, css([84, 80, 150], 0.34 * domeOn));
					vg2.addColorStop(1, css([84, 80, 150], 0));
					ctx.globalAlpha = sA;
					ctx.fillStyle = vg2;
					ctx.fillRect(0, 0, W, HORIZON + 30);
				}
				// wisps behind the machine, at their own pace
				{
					const bp0 = hazePuff(0);
					const bp1 = hazePuff(1);
					if (bp0 && bp1)
						for (const w of WISPS_BACK) {
							const x = CX + mix(w.x, Math.sign(w.x) * rx * 0.96, 0.92 * domeOn) - Math.sin(sec * 0.09 * w.sp + w.ph) * 60 * (1 - domeOn);
							const y = w.y + Math.sin(sec * 0.05 * w.sp + w.ph * 2) * 6;
							ctx.globalAlpha = clamp(w.a * (1 - 0.7 * smooth(0, 0.9, domeOn)) * smooth(1.6, 2.4, t1) * sA);
							ctx.drawImage(w.v ? bp1 : bp0, x - w.rx, y - w.ry, w.rx * 2, w.ry * 2);
						}
				}
				dormantWorld();
				ctx.save();
				// it rises out of the dark ground
				ctx.beginPath();
				ctx.rect(0, 0, W, GY + 16);
				ctx.clip();
				ctx.translate(CX, GY + (1 - rise) * 110);
				ctx.scale(s, s);
				ctx.translate(-MX, -GROUND);
				if (rise > 0.005) {
					drawMachine(ctx, {
						sec,
						gel: GENESIS,
						light: lightBoost,
						side: 0.55,
						a: As * sceneA,
						emerge: smooth(1.8, 2.7, t1),
						rimK: smooth(2.6, 3.3, t1),
						rimEdge: true,
						kindA: 'genesis',
						kindB: 'genesis',
						km: 1,
						apex: 0,
						beatPulse: 0,
						reading: 0.5 * awake,
						dishCol: mixRGB([70, 44, 52], GENESIS, awake),
						needle: -2.4,
						housing: 1,
						vat: 1,
						lite: false,
						world: 4,
						world2: -1,
						wk: 0,
						under: 0,
						flash: 0,
						lit: fill * pulse,
						dormant: 1 - awake,
						vatFill: fill,
						seedBorn: ramp(4.5, 6.0, t1),
						foot: false,
						rim2: [120, 150, 196],
					});
					// the link: a bright line from the chip up into the base of the vat over 0.35 s (a 3 px core, an 8 px glow),
					// warm white turning green as it climbs; it then holds lit at 0.5, and the green rises from where it enters
					if (link > 0.005) {
						const y0 = GROUND + 14;
						const yh = mix(y0, VY1, easeOut(link));
						const hold = mix(1, 0.5, smooth(0.9, 1, link));
						const lg = ctx.createLinearGradient(0, y0, 0, VY1);
						lg.addColorStop(0, css([255, 244, 226]));
						lg.addColorStop(1, css(GENESIS));
						ctx.globalCompositeOperation = 'lighter';
						ctx.lineCap = 'round';
						ctx.strokeStyle = lg;
						ctx.lineWidth = 3;
						ctx.globalAlpha = clamp(As * sceneA * hold);
						ctx.beginPath();
						ctx.moveTo(MX, y0);
						ctx.lineTo(MX, yh);
						ctx.stroke();
						glow(ctx, MX, yh, 8, mixRGB([255, 244, 226], GENESIS, link), 0.9 * As * sceneA * hold, 'core');
						ctx.globalCompositeOperation = 'source-over';
					}
				}
				ctx.restore();

				// the intake console in front of the pad, with a hexagonal socket in its top: where the token is set
				const consoleA = sA * smooth(1.9, 2.6, t1);
				{
					const cy = (g: number) => py(GROUND + g);
					ctx.globalAlpha = consoleA;
					ctx.beginPath();
					ctx.moveTo(CX - 52 * s, cy(8));
					ctx.lineTo(CX + 52 * s, cy(8));
					ctx.lineTo(CX + 64 * s, cy(28));
					ctx.lineTo(CX - 64 * s, cy(28));
					ctx.closePath();
					const tg = ctx.createLinearGradient(0, cy(8), 0, cy(28));
					tg.addColorStop(0, css([46, 38, 42]));
					tg.addColorStop(1, css([70, 60, 62]));
					ctx.fillStyle = tg;
					ctx.fill();
					const fg = ctx.createLinearGradient(0, cy(28), 0, cy(54));
					fg.addColorStop(0, css([34, 28, 32]));
					fg.addColorStop(1, css([10, 8, 11]));
					ctx.fillStyle = fg;
					ctx.fillRect(CX - 64 * s, cy(28), 128 * s, 26 * s);
					ctx.fillStyle = css([190, 176, 160], 0.35);
					ctx.fillRect(CX - 64 * s, cy(28), 128 * s, 1.2);
					ctx.fillStyle = css([6, 5, 8], 0.9);
					for (const bx of [-56, 56]) {
						ctx.beginPath();
						ctx.arc(CX + bx * s, cy(42), 2 * s, 0, TAU);
						ctx.fill();
					}
					// the socket: a hexagonal recess, dark, with a worn lip
					ctx.beginPath();
					for (let k = 0; k < 6; k++) {
						const an2 = (Math.PI / 3) * k;
						const hx = CX + Math.cos(an2) * 38 * s;
						const hy = cy(18) + Math.sin(an2) * 38 * s * 0.42;
						if (k) ctx.lineTo(hx, hy);
						else ctx.moveTo(hx, hy);
					}
					ctx.closePath();
					ctx.fillStyle = css([4, 3, 6]);
					ctx.fill();
					ctx.strokeStyle = css([104, 90, 90], 0.8);
					ctx.lineWidth = 2;
					ctx.stroke();
					if (slotOn > 0.01) {
						ctx.globalCompositeOperation = 'lighter';
						putS(spr(mixRGB([255, 244, 226], GENESIS, awake)), CX, cy(18), 60 * s, 0.5 * slotOn);
						ctx.globalCompositeOperation = 'source-over';
					}
				}

				// the low crimson haze around its feet, and the dome the life in the vat pushes it out of
				const hp0 = hazePuff(0);
				const hp1 = hazePuff(1);
				ctx.globalCompositeOperation = 'source-over';
				// the front: an ellipse on the ground centered on the chip; the red ground band is outside it, warm dust inside
				const Rf = rx * domeOn;
				const frontY = py(GROUND + 18);
				const drawHazes = (only: 'out' | 'in') => {
					for (const h of HAZES) {
						const hp = h.v ? hp1 : hp0;
						if (!hp) continue;
						const x = h.x + Math.sin(sec * 0.05 * h.sp + h.ph) * 14;
						let a = only === 'in' ? h.a * 0.05 : h.a;
						// nearer the machine's own face the haze lies thinner, so the console stays in view
						if (Math.abs(x - CX) < 110 && h.y < 440) a *= 0.8;
						if (a < 0.01) continue;
						ctx.globalAlpha = clamp(a * sA);
						ctx.drawImage(hp, x - h.rx, h.y - h.ry, h.rx * 2, h.ry * 2);
					}
				};
				if (Rf < 2) drawHazes('out');
				else {
					const fry = Rf * 0.3 + 30;
					ctx.save();
					ctx.beginPath();
					ctx.rect(0, 0, W, H);
					ctx.ellipse(CX, frontY, Rf, fry, 0, 0, TAU);
					ctx.clip('evenodd');
					drawHazes('out');
					ctx.restore();
					ctx.save();
					ctx.beginPath();
					ctx.ellipse(CX, frontY, Rf, fry, 0, 0, TAU);
					ctx.clip();
					drawHazes('in');
					// the ground behind the front turns to warm dust
					ctx.globalCompositeOperation = 'lighter';
					const dust = spr([206, 146, 100]);
					if (dust) {
						ctx.globalAlpha = clamp(0.7 * domeOn * sA);
						ctx.drawImage(dust, CX - Rf, frontY - fry, Rf * 2, fry * 2);
					}
					ctx.globalCompositeOperation = 'source-over';
					ctx.restore();
					// the ripple of light that leads the front out from the chip along the ground
					ctx.globalCompositeOperation = 'lighter';
					ctx.strokeStyle = css([255, 226, 170]);
					ctx.lineWidth = 3;
					ctx.globalAlpha = clamp(0.55 * (1 - smooth(0.55, 1, domeOn)) * sA);
					ctx.beginPath();
					ctx.ellipse(CX, frontY, Rf * 1.02, fry * 1.02, 0, 0, TAU);
					ctx.stroke();
					ctx.globalCompositeOperation = 'source-over';
				}
				// wisps drifting across the front of the machine: it stands in the red, until the dome pushes them out
				if (hp0 && hp1) {
					ctx.save();
					// never over the vat's glass: the clip is the whole stage minus the vat
					{
						const vl = CX - VR * s;
						const vr = CX + VR * s;
						const vt = py(VY0);
						const vb = py(VY1);
						const rr2 = VR * s;
						ctx.beginPath();
						ctx.rect(0, 0, W, H);
						ctx.moveTo(vl, vt + rr2);
						ctx.arc(CX, vt + rr2, rr2, Math.PI, 0);
						ctx.lineTo(vr, vb - rr2);
						ctx.arc(CX, vb - rr2, rr2, 0, Math.PI);
						ctx.closePath();
						ctx.clip('evenodd');
					}
					for (const w of WISPS) {
						const x = CX + mix(w.x, Math.sign(w.x) * rx * 0.96, 0.92 * domeOn) + Math.sin(sec * 0.12 * w.sp + w.ph) * 46 * (1 - domeOn);
						const y = w.y + Math.sin(sec * 0.07 * w.sp + w.ph * 2) * 8;
						const a = w.a * (1 - 0.6 * smooth(0, 0.9, domeOn)) * smooth(1.9, 2.8, t1);
						if (a < 0.01) continue;
						ctx.globalAlpha = clamp(a * sA);
						ctx.drawImage(w.v ? hp1 : hp0, x - w.rx, y - w.ry, w.rx * 2, w.ry * 2);
					}
					ctx.restore();
				}
				// the curl: haze piled on the ground where the front stops
				if (domeOn > 0.02 && hp0 && hp1) {
					for (const c of CURL) {
						const cx = CX + c.side * Rf;
						const cy = frontY + c.dy * (0.4 + Rf * 0.1);
						ctx.globalAlpha = clamp(0.4 * sA * Math.min(1, domeOn * 2));
						ctx.drawImage(c.v ? hp1 : hp0, cx - c.r, cy - c.r * 0.45, c.r * 2, c.r * 0.9);
					}
				}
				// warm light on the ground under the machine and through the cleared haze
				ctx.globalCompositeOperation = 'lighter';
				const pool = spr([236, 190, 130]);
				if (pool && slotOn > 0.01) {
					ctx.globalAlpha = clamp((0.18 * slotOn + 0.5 * domeOn) * sA);
					const pw = 120 + 260 * domeOn;
					ctx.drawImage(pool, CX - pw, GY - pw * 0.09 + 6, pw * 2, pw * 0.36);
				}
				const gsp = spr(GENESIS);
				if (gsp && fill > 0.01) {
					ctx.globalAlpha = clamp(0.26 * fill * sA);
					ctx.drawImage(gsp, CX - 150, GY - 30, 300, 60);
				}
				const hsp = spr([214, 160, 110]);
				if (hsp && domeOn > 0.01) {
					ctx.globalAlpha = clamp(0.3 * domeOn * sA);
					ctx.drawImage(hsp, CX - rx * domeOn, GY - 40 - 30 * domeOn, rx * 2 * domeOn, 70 * domeOn + 10);
				}
				ctx.globalCompositeOperation = 'source-over';

				// the token: a small hexagonal glint falls in a shallow arc from the far bright point, slows, and in its
				// last 0.4 s turns face-on; it seats in the socket with a flash three times the socket's width
				const arrive = ramp(2.2, seatAt, t1);
				if (t1 > 2.2) {
					let dx = vd[0];
					const dy = Math.min(vd[1], -0.3 * Math.abs(vd[0]) - 30);
					const dl = Math.hypot(dx, dy) || 1;
					dx /= dl;
					const dyn = dy / dl;
					const P2 = [CX, py(GROUND + 18)] as const;
					const P0 = [starX, starY] as const;
					const P1 = [(P0[0] + P2[0]) / 2, Math.min(P0[1], P2[1]) - 20] as const;
					const at = (q: number) => {
						const k = 1 - q;
						return [k * k * P0[0] + 2 * k * q * P1[0] + q * q * P2[0], k * k * P0[1] + 2 * k * q * P1[1] + q * q * P2[1]] as const;
					};
					const q = easeOut(arrive);
					const head = at(q);
					const facing = smooth(0, 0.35, arrive);
					const seated = smooth(seatAt, seatAt + 0.15, t1);
					const tex2 = chip();
					const soft = chipBlur();
					if (tex2 && soft) {
						// a short bright trail behind it, about 30 px
						if (arrive < 0.98) {
							ctx.globalCompositeOperation = 'lighter';
							for (let k = 1; k <= 10; k++) {
								const p = at(Math.max(0, q - k * 0.0064));
								putS(spr([255, 232, 180]), p[0], p[1], 8 - k * 0.6, 0.4 * (1 - k / 11));
							}
							ctx.globalCompositeOperation = 'source-over';
						}
						const size = (64 * s) / (CHIP_R * 1.732);
						ctx.globalCompositeOperation = 'lighter';
						const flB = Math.pow(Math.max(0, 1 - (t1 - seatAt) / 0.55), 0.7);
						if (t1 >= seatAt && flB > 0) putS(spr(WHITE), P2[0], P2[1], 1.5 * 72 * s, 0.8 * flB);
						const pulseSeat0 = mix(0.5, 0.8, Math.exp(-Math.max(0, t1 - seatAt) / 0.5));
						putS(spr([255, 244, 226]), head[0], head[1] + 5 * seated * s, 48 * s, (arrive < 1 ? smooth(0.3, 0.9, arrive) * 0.55 : pulseSeat0));
						ctx.globalCompositeOperation = 'source-over';
						ctx.save();
						ctx.translate(head[0], head[1] + 5 * seated * s);
						ctx.rotate((1 - facing) * 0.25);
						ctx.scale(size * (0.9 + 0.1 * facing), size * mix(0.5, 0.72, facing) * mix(1, 0.8, seated));
						const sharp = smooth(0.05, 0.35, arrive);
						ctx.globalAlpha = clamp(smooth(0, 0.1, arrive) * (1 - sharp) * sA);
						ctx.drawImage(soft, -CHIP_CENTER.x, -CHIP_CENTER.y, CHIP_N, CHIP_N);
						ctx.globalAlpha = clamp(sharp * sA);
						ctx.drawImage(tex2, -CHIP_CENTER.x, -CHIP_CENTER.y);
						ctx.restore();
						ctx.globalCompositeOperation = 'lighter';
						const br = 0.62 + 0.16 * Math.sin(sec * 1.4);
						// a warm-white glint on it while it falls, then its own white core
						putS(spr([255, 240, 214]), head[0], head[1], 24 * s, 0.9 * (1 - seated) * smooth(0, 0.2, arrive));
						putS(spr([255, 250, 240]), head[0], head[1] + 5 * seated * s, 16 * s, 0.6 * smooth(0.3, 0.9, arrive) * (0.85 + 0.15 * br));
						// the light it pools on the ground round the console
						putS(spr([255, 214, 150]), CX, py(GROUND + 30), 150 * s, 0.32 * seated);
						ctx.globalCompositeOperation = 'source-over';
					}
				}
			}

			// Valleron, a small bright point in the sky, with the ring of motes it has in 05
			{
				const sk = mk(ctx, vis * field * smooth(0.5, 1.1, t1));
				if (t1 > 0.5) {
					ctx.globalCompositeOperation = 'lighter';
					const zsK = compact ? 1.5 : 1;
					sk(spr([255, 214, 150]), starX, starY, 48 * zsK, 0.6);
					sk(spr([255, 236, 200]), starX, starY, 14 * zsK, 0.9);
					sk(spr(WHITE), starX, starY, 3.6 * zsK, 0.95);
					for (let k = 0; k < 12; k++) {
						const a2 = (k / 12) * TAU + sec * 0.22;
						const rx = Math.cos(a2) * 22 * zsK;
						const ry = Math.sin(a2) * 22 * zsK * 0.6;
						sk(spr([255, 226, 176]), starX + rx * cr - ry * sr, starY + rx * sr + ry * cr, 1.7 * zsK, 0.5 + 0.4 * Math.sin(sec * 1.6 + k * 1.9));
					}
					ctx.globalCompositeOperation = 'source-over';
				}
			}
			// the dive's darkening at the edges
			if (A > 0.004 || As > 0.004) {
				const vg = ctx.createRadialGradient(CX, CY, 170, CX, CY, 640);
				vg.addColorStop(0, css([4, 3, 8], 0));
				vg.addColorStop(1, css([4, 3, 8], 0.4 * Math.max(e * A, 0.5 * As * sceneA)));
				ctx.globalAlpha = 1;
				ctx.fillStyle = vg;
				ctx.fillRect(-40, -40, W + 80, H + 80);
			}
			ctx.globalAlpha = 1;
			ctx.restore();
			// pulled back, the whole figure is one neutral warm-white point at its anchor (nothing green leaves a Generator)
			if (field < 0.98) {
				const lone = mk(ctx, vis);
				ctx.globalCompositeOperation = 'lighter';
				lone(spr([255, 236, 214]), an.x, an.y, 26 * zsV, 0.6 * (1 - field));
				lone(spr(WHITE), an.x, an.y, 4 * zsV, 0.9 * (1 - field));
				ctx.globalCompositeOperation = 'source-over';
				ctx.globalAlpha = 1;
			}
			grain(ctx, sec, 0.05 * vis * field);
		},
	};
}
