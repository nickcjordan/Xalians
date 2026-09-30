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
import { clamp, css, easeOut, grain, H, mix, mixRGB, ramp, rng, smooth, W, type Ctx, type RGB } from './stage';
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

// ---- 06's world: a dark, hazed world with a dormant Generator on it (the same family as the site's: a tall
// tank with rounded shoulders and vertical riveted bands, a tall oval vat window, a side tower), drawn here from
// scratch, mostly in silhouette against the haze with a little warm edge light. Built once into `sceneBg`;
// the vat, slot, conduits, seeds, haze and the token are drawn over it each frame.

const MX = 500; // the machine's axis
const VAT = { x: MX, y: 232, rx: 38, ry: 80 };
const SLOT = { x: MX, y: 366 };
let sceneBg: HTMLCanvasElement | null = null;
let hazePuffTex: HTMLCanvasElement | null = null;
function hazePuff() {
	if (hazePuffTex) return hazePuffTex;
	const c = canvasOf(128, 128);
	const g = c?.getContext('2d');
	if (!c || !g) return null;
	const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
	grad.addColorStop(0, css([168, 30, 48], 1));
	grad.addColorStop(0.4, css([168, 30, 48], 0.55));
	grad.addColorStop(0.75, css([168, 30, 48], 0.16));
	grad.addColorStop(1, css([168, 30, 48], 0));
	g.fillStyle = grad;
	g.fillRect(0, 0, 128, 128);
	hazePuffTex = c;
	return c;
}
function scene() {
	if (sceneBg) return sceneBg;
	const c = canvasOf(W, H);
	const g = c?.getContext('2d');
	if (!c || !g) return null;
	const r = rng(404);
	// sky: dead, dim, warming to a crimson horizon
	const sky = g.createLinearGradient(0, 0, 0, 400);
	sky.addColorStop(0, css([8, 6, 15]));
	sky.addColorStop(0.55, css([26, 10, 24]));
	sky.addColorStop(1, css([40, 16, 28]));
	g.fillStyle = sky;
	g.fillRect(0, 0, W, H);
	for (let k = 0; k < 90; k++) {
		g.fillStyle = css([210, 200, 225], 0.1 + 0.3 * r() * r());
		g.fillRect(Math.floor(r() * W), Math.floor(r() * 300), 1, 1);
	}
	// the haze behind the machine
	const back = g.createRadialGradient(MX, 260, 10, MX, 260, 300);
	back.addColorStop(0, css([190, 40, 58], 0.14));
	back.addColorStop(1, css([190, 40, 58], 0));
	g.fillStyle = back;
	g.fillRect(0, 0, W, H);
	// two ridges and the ground
	const ridge = (y0: number, amp: number, col: RGB, seed: number) => {
		const rr = rng(seed);
		const ph = [rr() * 6, rr() * 6, rr() * 6];
		g.beginPath();
		g.moveTo(0, H);
		for (let x = 0; x <= W; x += 10) g.lineTo(x, y0 + amp * (0.5 * Math.sin(x * 0.011 + ph[0]) + 0.3 * Math.sin(x * 0.027 + ph[1]) + 0.2 * Math.sin(x * 0.06 + ph[2])));
		g.lineTo(W, H);
		g.closePath();
		g.fillStyle = css(col);
		g.fill();
	};
	ridge(338, 26, [28, 13, 23], 1);
	ridge(378, 20, [19, 10, 18], 2);
	const ground = g.createLinearGradient(0, 392, 0, H);
	ground.addColorStop(0, css([20, 10, 17]));
	ground.addColorStop(1, css([6, 4, 8]));
	g.fillStyle = ground;
	g.fillRect(0, 396, W, H - 396);
	// the plinth and the machine
	g.fillStyle = css([17, 12, 18]);
	g.fillRect(MX - 108, 408, 216, 20);
	g.fillStyle = css([28, 20, 24]);
	g.fillRect(MX - 108, 408, 216, 3);
	// side tower, with two pipes joining the body
	const tw = g.createLinearGradient(MX + 96, 0, MX + 128, 0);
	tw.addColorStop(0, css([34, 24, 28]));
	tw.addColorStop(1, css([12, 9, 13]));
	g.fillStyle = tw;
	g.fillRect(MX + 100, 118, 26, 294);
	g.fillStyle = css([26, 18, 22]);
	g.fillRect(MX + 94, 106, 38, 16);
	g.fillStyle = css([12, 9, 13]);
	for (const py of [170, 300]) g.fillRect(MX + 82, py, 22, 9);
	// the tank: rounded shoulders, a body darker toward its right
	const L = MX - 85;
	const Rr = MX + 85;
	const TOP = 128;
	const SH = 46;
	const body = () => {
		g.beginPath();
		g.moveTo(L, 412);
		g.lineTo(L, TOP + SH);
		g.quadraticCurveTo(L, TOP, L + SH, TOP);
		g.lineTo(Rr - SH, TOP);
		g.quadraticCurveTo(Rr, TOP, Rr, TOP + SH);
		g.lineTo(Rr, 412);
		g.closePath();
	};
	body();
	const bg = g.createLinearGradient(L, 0, Rr, 0);
	bg.addColorStop(0, css([42, 28, 32]));
	bg.addColorStop(0.3, css([26, 19, 25]));
	bg.addColorStop(1, css([11, 8, 12]));
	g.fillStyle = bg;
	g.fill();
	// vertical riveted bands
	g.save();
	body();
	g.clip();
	for (const bx of [-70, -46, 46, 70]) {
		g.fillStyle = css([12, 9, 13], 0.7);
		g.fillRect(MX + bx - 4, TOP, 8, 290);
		g.fillStyle = css([64, 48, 52], 0.55);
		for (let y = TOP + 16; y < 408; y += 20) {
			g.beginPath();
			g.arc(MX + bx - 4, y, 1.3, 0, TAU);
			g.arc(MX + bx + 4, y, 1.3, 0, TAU);
			g.fill();
		}
	}
	// a horizontal seam or two
	g.fillStyle = css([10, 8, 11], 0.7);
	g.fillRect(L, 148, Rr - L, 3);
	g.fillRect(L, 398, Rr - L, 4);
	g.restore();
	// the vat window: a tall oval in a heavy rim, empty and dark
	g.beginPath();
	g.ellipse(VAT.x, VAT.y, VAT.rx + 6, VAT.ry + 6, 0, 0, TAU);
	g.fillStyle = css([40, 31, 35]);
	g.fill();
	g.beginPath();
	g.ellipse(VAT.x, VAT.y, VAT.rx, VAT.ry, 0, 0, TAU);
	const vg = g.createLinearGradient(VAT.x - VAT.rx, 0, VAT.x + VAT.rx, 0);
	vg.addColorStop(0, css([14, 11, 16]));
	vg.addColorStop(1, css([4, 4, 7]));
	g.fillStyle = vg;
	g.fill();
	g.strokeStyle = css([120, 60, 56], 0.18);
	g.lineWidth = 3;
	g.beginPath();
	g.ellipse(VAT.x, VAT.y, VAT.rx - 6, VAT.ry - 6, 0, Math.PI * 1.05, Math.PI * 1.35);
	g.stroke();
	// conduits: two dark grooves up the front from the slot, and a short one into the vat's foot
	g.strokeStyle = css([8, 6, 9]);
	g.lineWidth = 5;
	for (const cx of [MX - 52, MX + 52]) {
		g.beginPath();
		g.moveTo(cx, SLOT.y - 24);
		g.lineTo(cx, 186);
		g.lineTo(cx + (cx < MX ? 12 : -12), 186);
		g.stroke();
	}
	g.beginPath();
	g.moveTo(MX, SLOT.y - 40);
	g.lineTo(MX, VAT.y + VAT.ry + 6);
	g.stroke();
	// the slot: a hexagonal socket on the front, below the vat
	g.beginPath();
	for (let k = 0; k < 6; k++) {
		const an = (Math.PI / 3) * k + Math.PI / 6;
		const px = SLOT.x + Math.cos(an) * 54;
		const py = SLOT.y + Math.sin(an) * 54 * 0.8;
		if (k) g.lineTo(px, py);
		else g.moveTo(px, py);
	}
	g.closePath();
	g.fillStyle = css([6, 5, 8]);
	g.fill();
	g.strokeStyle = css([52, 40, 44]);
	g.lineWidth = 5;
	g.stroke();
	// warm edge light from the haze behind: a little, on the left edges and the shoulder
	g.strokeStyle = css([255, 168, 110], 0.34);
	g.lineWidth = 2;
	g.beginPath();
	g.moveTo(L + 1, 410);
	g.lineTo(L + 1, TOP + SH);
	g.quadraticCurveTo(L + 1, TOP + 1, L + SH, TOP + 1);
	g.lineTo(MX, TOP + 1);
	g.stroke();
	g.beginPath();
	g.moveTo(MX + 101, 410);
	g.lineTo(MX + 101, 120);
	g.stroke();
	g.strokeStyle = css([255, 168, 110], 0.22);
	g.beginPath();
	g.moveTo(MX - 108, 410);
	g.lineTo(MX + 108, 410);
	g.stroke();
	// a grain of low noise so the flat darks are not flat
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
// the low haze on the ground: fixed clouds that drift a little; the life in the vat draws them back
const HAZES = (() => {
	const r = rng(77);
	return Array.from({ length: 34 }, (_, k) => {
		const high = k % 5 === 0;
		return { x: 160 + r() * 680, y: high ? 340 + r() * 40 : 392 + r() * 70, rx: 90 + r() * 170, ry: high ? 22 + r() * 26 : 24 + r() * 34, a: 0.24 + r() * 0.26, ph: r() * TAU, sp: 2 + r() * 4 };
	});
})();
// life: seeds in the vat, soft cells with a small nucleus
const SEEDS = (() => {
	const r = rng(12);
	return Array.from({ length: 8 }, (_, k) => ({ x: (r() - 0.5) * 40, y: (r() - 0.5) * 120, s: 5 + r() * 4, ph: r() * TAU, at: 5.0 + k * 0.22 }));
})();

type PutFn = (s: HTMLCanvasElement | null, x: number, y: number, r: number, a: number) => void;

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
	const zoomAt = () => ease(ramp(0, 1.8, t1));
	// the anchor is the galaxy's heart, and by the end of 06 the machine's vat
	const anchor = () => {
		const k = smooth(1.2, 2.0, t1);
		return { x: mix(CX, VAT.x, k), y: mix(CY, VAT.y, k) };
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
			t1 = s === 1 ? 9 : 0;
			haze.key = -1;
		},
		step(dt, s, isPresent) {
			if (s !== stage && s >= 0) stage = s;
			present = isPresent;
			vis += ((present ? 1 : 0) - vis) * (1 - Math.exp(-dt * (present ? 2.6 : 7)));
			if (vis < 0.002 && !present) vis = 0;
			// pulling back, everything but the one light is gone in about a quarter second
			field += ((present ? 1 : 0) - field) * (1 - Math.exp(-dt * (present ? 8 : 16)));
			t0 += dt;
			t1 = Math.max(0, t1 + dt * (stage === 1 ? 1 : -2.5));
		},
		visible: () => vis > 0.005,
		// the dive always plays through, even before its beat is live; so does running back out
		busy: (s, isPresent) => Math.abs((isPresent ? 1 : 0) - vis) > 0.004 || (s === 1 && stage !== 1) || (s === 1 && isPresent && t1 < 2.0) || (s !== 1 && t1 > 0.01),
		anchor,
		light: (): RGB => (stage === 1 ? [222, 252, 216] : SICK),
		draw(ctx, sec, opts) {
			if (vis <= 0.005) return;
			const compact = !!opts?.compact;
			const e = zoomAt();
			// the dive: exponential, so the world ahead grows steadily
			const z = Math.exp(Math.log(9) * e);
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

			ctx.save();
			// bloom out of (and pull back into) the anchor
			const an = anchor();
			const bs = 0.12 + 0.88 * easeOut(vis);
			ctx.translate(an.x, an.y);
			ctx.scale(bs, bs);
			ctx.translate(-an.x, -an.y);
			ctx.globalAlpha = 1;
			// the galaxy dissolves into the world as the dive ends
			const galA = 1 - smooth(1.2, 1.9, t1);
			const sceneA = smooth(1.0, 1.9, t1);
			// everything of the galaxy is drawn at A; the bright world's own light at vis * galA
			const A = vis * field * galA;
			const As = vis * field * sceneA;
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
				// the haze, in the plane: grainy crimson smoke, thinned round Valleron
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
				// the worlds: warm lights that flare crimson when the haze reaches them and dim to small embers
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
				// life gathering: warm motes drift in to Valleron from the neighbors before they dim
				if (t0 < 8 && t1 < 1) {
					for (const i of NEIGHBORS) {
						const mo = WORLDS[i].mote;
						if (!mo || (compact && WORLDS[i].minor)) continue;
						if (t0 < mo.from || t0 > mo.to) continue;
						const u = ((((t0 - mo.from) / mo.per + mo.ph) % 1) + 1) % 1;
						const k = ease(u);
						const bend = Math.sin(u * Math.PI) * mo.bend * RAD * z;
						const x = mix(sx[i], vx, k) + bend;
						const y = mix(sy[i], vy, k) - bend * 0.6;
						put(spr(WARM[0]), x, y, 5 * zs, Math.sin(u * Math.PI));
						put(spr(WHITE), x, y, 1.6 * zs, Math.sin(u * Math.PI) * 0.9);
					}
				}
				// Valleron: a small bright world in a warm corona, brighter as life gathers, unmoved by the haze
				const gather = smooth(1.4, 5.2, t0);
				const vb = 1 + 1.5 * gather + 0.1 * Math.sin(sec * 0.8);
				putV(spr([255, 214, 150]), vx, vy, (30 + 30 * gather) * zsV * (1 + 0.04 * Math.sin(sec * 1.3)), 0.3 + 0.3 * gather);
				putV(spr([255, 236, 200]), vx, vy, (9 + 6 * gather) * zsV, Math.min(1, 0.55 * vb));
				putV(spr(WHITE), vx, vy, (3.2 + 1.4 * gather) * zsV, 0.95);
				// its own look: a ring of motes gathering round it
				const ringIn = smooth(1.4, 4.2, t0);
				for (let k = 0; k < 12; k++) {
					const a2 = (k / 12) * TAU + sec * 0.22;
					const rx = Math.cos(a2) * (17 + 7 * gather) * zsV;
					const ry = Math.sin(a2) * (17 + 7 * gather) * zsV * 0.6;
					putV(spr([255, 226, 176]), vx + rx * cr - ry * sr, vy + rx * sr + ry * cr, 1.7 * zsV, ringIn * (0.5 + 0.4 * Math.sin(sec * 1.6 + k * 1.9)));
				}
				ctx.globalCompositeOperation = 'source-over';
				// the dive falls into a dark crimson haze
				const wash = smooth(0.7, 1.6, t1);
				if (wash > 0.01) {
					const wg = ctx.createRadialGradient(CX, CY, 20, CX, CY, 420);
					wg.addColorStop(0, css([46, 8, 18], 0.7 * wash));
					wg.addColorStop(1, css([20, 4, 10], 0.5 * wash));
					ctx.globalAlpha = A;
					ctx.fillStyle = wg;
					ctx.fillRect(0, 0, W, H);
				}
			}

			// ---- 06: the dark world, the dormant Generator, the token, and the life it brings
			const bgS = sceneA > 0.01 ? scene() : null;
			if (bgS && As > 0.004) {
				const putS = mk(ctx, As);
				ctx.save();
				// a slight settling in from the dive, and larger in compact
				const sc = mix(1.4, 1, easeOut(sceneA)) * (compact ? 1.25 : 1.16);
				ctx.translate(CX, 300);
				ctx.scale(sc, sc);
				ctx.translate(-CX, -300);
				ctx.globalAlpha = As;
				ctx.drawImage(bgS, 0, 0, W, H);

				// the timeline of the machine's waking
				const slotOn = smooth(3.4, 4.0, t1);
				const conduit = ramp(3.7, 4.8, t1);
				const fill = easeOut(ramp(4.4, 6.4, t1));
				const clearOn = easeOut(ramp(4.2, 7.6, t1));
				const pulse = 0.94 + 0.06 * Math.sin(sec * 1.2);
				const clearPx = 230 * clearOn;

				// the low crimson haze around its feet, drawn back across the ground as the vat lights
				const hp = hazePuff();
				ctx.globalCompositeOperation = 'source-over';
				if (hp) {
					for (const h of HAZES) {
						const x = h.x + Math.sin(sec * 0.05 * h.sp + h.ph) * 14;
						const d = Math.abs(x - MX);
						const f = clearPx < 1 ? 1 : smooth(clearPx * 0.55, clearPx * 1.1, d);
						const a = h.a * f;
						if (a < 0.01) continue;
						ctx.globalAlpha = clamp(a * As);
						ctx.drawImage(hp, x - h.rx, h.y - h.ry, h.rx * 2, h.ry * 2);
					}
				}
				// warm light spreading over the ground round the machine, green near its foot
				ctx.globalCompositeOperation = 'lighter';
				if (clearOn > 0.01) {
					const wsp = spr([236, 190, 130]);
					if (wsp) {
						ctx.globalAlpha = clamp(0.7 * clearOn * As);
						ctx.drawImage(wsp, MX - clearPx * 0.95, 424 - clearPx * 0.17, clearPx * 1.9, clearPx * 0.34);
					}
					const hsp = spr([214, 160, 110]);
					if (hsp) {
						ctx.globalAlpha = clamp(0.34 * clearOn * As);
						ctx.drawImage(hsp, MX - clearPx * 1.2, 385 - clearPx * 0.22, clearPx * 2.4, clearPx * 0.44);
					}
					const gsp = spr(GENESIS);
					if (gsp) {
						ctx.globalAlpha = clamp(0.3 * fill * As);
						ctx.drawImage(gsp, MX - 170, 424 - 34, 340, 68);
					}
				}

				// the vat: empty and dark until the gel rises, green, with seeds of life in it
				if (fill > 0.005) {
					ctx.save();
					ctx.beginPath();
					ctx.ellipse(VAT.x, VAT.y, VAT.rx, VAT.ry, 0, 0, TAU);
					ctx.clip();
					const bottom = VAT.y + VAT.ry;
					const top = bottom - fill * (VAT.ry * 2 + 6);
					const gg = ctx.createLinearGradient(0, bottom, 0, VAT.y - VAT.ry);
					gg.addColorStop(0, css([70, 170, 84], 0.95));
					gg.addColorStop(1, css(GENESIS, 0.9));
					ctx.globalCompositeOperation = 'source-over';
					ctx.globalAlpha = clamp(As * (0.85 + 0.15 * pulse));
					ctx.fillStyle = gg;
					ctx.fillRect(VAT.x - VAT.rx, top, VAT.rx * 2, bottom - top);
					// a bright surface and a soft glow in the gel
					ctx.globalCompositeOperation = 'lighter';
					putS(spr([214, 255, 200]), VAT.x, top + 3, 34, 0.55 * (1 - fill * 0.4));
					putS(spr(GENESIS), VAT.x, VAT.y + 10, 96, 0.55 * fill * pulse);
					ctx.globalCompositeOperation = 'source-over';
					const eg = ctx.createLinearGradient(VAT.x - VAT.rx, 0, VAT.x + VAT.rx, 0);
					eg.addColorStop(0, css([2, 14, 8], 0.55));
					eg.addColorStop(0.3, css([2, 14, 8], 0));
					eg.addColorStop(0.75, css([2, 14, 8], 0));
					eg.addColorStop(1, css([2, 14, 8], 0.6));
					ctx.globalAlpha = clamp(As);
					ctx.fillStyle = eg;
					ctx.fillRect(VAT.x - VAT.rx, VAT.y - VAT.ry, VAT.rx * 2, VAT.ry * 2);
					ctx.globalCompositeOperation = 'lighter';
					// seeds: a bright point, then a soft membrane round a small nucleus, drifting
					for (const sd of SEEDS) {
						const born = ramp(sd.at, sd.at + 0.9, t1);
						if (born <= 0) continue;
						const px = VAT.x + sd.x + Math.sin(sec * 0.4 + sd.ph) * 6;
						const py = VAT.y + sd.y + Math.cos(sec * 0.3 + sd.ph) * 8;
						if (py < top + 6) continue;
						const rad = sd.s * smooth(0.25, 1, born);
						const spark = Math.exp(-Math.pow((born - 0.15) / 0.18, 2));
						putS(spr(WHITE), px, py, 5 + 8 * spark, 0.9 * spark + 0.25);
						ctx.globalCompositeOperation = 'source-over';
						ctx.globalAlpha = clamp(0.2 * born * As);
						ctx.fillStyle = css([200, 255, 190]);
						ctx.beginPath();
						ctx.arc(px, py, rad, 0, TAU);
						ctx.fill();
						ctx.globalAlpha = clamp(0.6 * born * As);
						ctx.strokeStyle = css([236, 255, 226]);
						ctx.lineWidth = 1.1;
						ctx.stroke();
						ctx.globalCompositeOperation = 'lighter';
						putS(spr([255, 255, 214]), px + rad * 0.15, py, 2.6 + rad * 0.25, 0.9 * born);
					}
					ctx.restore();
				}
				// the green in the vat lights the machine's face and the air round it
				if (fill > 0.01) putS(spr(GENESIS), VAT.x, VAT.y + 20, 230, 0.2 * fill * pulse);

				// the slot lights, and light runs up the conduits into the vat
				if (slotOn > 0.01) {
					const toGreen = smooth(4.0, 5.2, t1);
					putS(spr(mixRGB([255, 244, 226], GENESIS, toGreen)), SLOT.x, SLOT.y, 64 * (0.94 + 0.06 * pulse), 0.55 * slotOn);
				}
				if (conduit > 0.01) {
					ctx.lineCap = 'round';
					const lit = ramp(4.6, 5.8, t1);
					for (const cx of [MX - 52, MX + 52]) {
						const y0 = SLOT.y - 24;
						const y1 = 186;
						const head = mix(y0, y1, easeOut(conduit));
						// the channel behind the head stays lit, dimmer
						const cg = ctx.createLinearGradient(0, y0, 0, head);
						cg.addColorStop(0, css(mixRGB(WHITE, GENESIS, 0.5), 0.8));
						cg.addColorStop(1, css(GENESIS, 0.35));
						ctx.globalAlpha = clamp(As * (0.55 + 0.35 * lit));
						ctx.strokeStyle = cg;
						ctx.lineWidth = 2.6;
						ctx.beginPath();
						ctx.moveTo(cx, y0);
						ctx.lineTo(cx, head);
						ctx.stroke();
						if (conduit < 1) putS(spr(WHITE), cx, head, 9, 0.9);
						if (conduit >= 0.98) {
							ctx.globalAlpha = clamp(As * 0.7 * lit);
							ctx.beginPath();
							ctx.moveTo(cx, 186);
							ctx.lineTo(cx + (cx < MX ? 12 : -12), 186);
							ctx.stroke();
						}
					}
					ctx.globalAlpha = clamp(As * 0.85 * conduit);
					ctx.strokeStyle = css(mixRGB(WHITE, GENESIS, 0.5));
					ctx.lineWidth = 2.6;
					ctx.beginPath();
					ctx.moveTo(MX, SLOT.y - 40);
					ctx.lineTo(MX, VAT.y + VAT.ry + 4);
					ctx.stroke();
				}
				ctx.globalCompositeOperation = 'source-over';

				// the token: a warm glint streaks in from the far bright point, resolves into the chip and settles into the slot
				const arrive = ramp(2.0, 3.1, t1);
				const seat = smooth(3.0, 3.6, t1);
				if (t1 > 2.0) {
					let dx = vd[0];
					let dy = Math.min(vd[1], -0.45 * Math.abs(vd[0]) - 40);
					const dl = Math.hypot(dx, dy) || 1;
					dx /= dl;
					dy /= dl;
					const P0 = [MX + dx * 760, 330 + dy * 760] as const;
					const P2 = [MX, 320] as const;
					const P1 = [(P0[0] + P2[0]) / 2 + dy * 90, (P0[1] + P2[1]) / 2 - dx * 90] as const;
					const at = (q: number) => {
						const k = 1 - q;
						return [k * k * P0[0] + 2 * k * q * P1[0] + q * q * P2[0], k * k * P0[1] + 2 * k * q * P1[1] + q * q * P2[1]] as const;
					};
					const q = easeOut(arrive);
					const head = at(q);
					const resolve = smooth(0.62, 1, arrive);
					// the streak: a fading curved trail, then only the glint's head
					if (arrive < 1) {
						let last = at(Math.max(0, q - 0.3));
						ctx.globalCompositeOperation = 'lighter';
						ctx.lineCap = 'butt';
						for (let k = 1; k <= 24; k++) {
							const f = k / 24;
							const p = at(Math.max(0, q - 0.3 * (1 - f)));
							ctx.globalAlpha = clamp(0.85 * f * f * As * (1 - resolve));
							ctx.strokeStyle = css([255, 232, 184]);
							ctx.lineWidth = 1 + 4 * f;
							ctx.beginPath();
							ctx.moveTo(last[0], last[1]);
							ctx.lineTo(p[0], p[1]);
							ctx.stroke();
							last = p;
						}
						putS(spr([255, 232, 180]), head[0], head[1], 20, 0.7);
						putS(spr(WHITE), head[0], head[1], 6, 1);
						ctx.globalCompositeOperation = 'source-over';
					}
					// the token: the glint sharpens into the chip and settles down into the slot
					const tex2 = chip();
					const soft = chipBlur();
					if (tex2 && soft && resolve > 0.01) {
						const px = mix(head[0], SLOT.x, seat);
						const py = mix(head[1], SLOT.y, seat);
						const size = (42 / CHIP_R) * mix(0.55 + 0.45 * resolve, 0.94, seat);
						ctx.save();
						ctx.translate(px, py);
						ctx.scale(size, size * 0.8);
						const sharp = smooth(0.8, 1, arrive);
						ctx.globalAlpha = clamp(resolve * (1 - sharp) * As);
						ctx.drawImage(soft, -CHIP_CENTER.x, -CHIP_CENTER.y, CHIP_N, CHIP_N);
						ctx.globalAlpha = clamp(resolve * sharp * As);
						ctx.drawImage(tex2, -CHIP_CENTER.x, -CHIP_CENTER.y);
						ctx.restore();
						// its own soft white core, breathing
						ctx.globalCompositeOperation = 'lighter';
						const br = 0.62 + 0.16 * Math.sin(sec * 1.4);
						putS(spr([255, 250, 242]), px, py, 30 * (0.92 + 0.12 * br), resolve * br * 0.7);
						putS(spr(WHITE), px, py, 7, resolve * 0.55);
						ctx.globalCompositeOperation = 'source-over';
					}
				}
				ctx.restore();
			}

			// the dive's darkening at the edges
			if (A > 0.004 || As > 0.004) {
				const vg = ctx.createRadialGradient(CX, CY, 170, CX, CY, 640);
				vg.addColorStop(0, css([4, 3, 8], 0));
				vg.addColorStop(1, css([4, 3, 8], 0.4 * Math.max(e * A, 0.5 * As)));
				ctx.globalAlpha = 1;
				ctx.fillStyle = vg;
				ctx.fillRect(-40, -40, W + 80, H + 80);
			}
			// pulled back, only the one light is left to arrive
			if (field < 0.98) {
				const lone = mk(ctx, vis);
				ctx.globalCompositeOperation = 'lighter';
				lone(spr([255, 226, 170]), an.x, an.y, 26 * zsV, 0.6 * (1 - field));
				lone(spr(WHITE), an.x, an.y, 4 * zsV, 0.9 * (1 - field));
				ctx.globalCompositeOperation = 'source-over';
			}
			ctx.globalAlpha = 1;
			ctx.restore();
			grain(ctx, sec, 0.05 * vis * field);
		},
	};
}
