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
const ZOOM = 2.5; // how far 06 closes in
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
	/** The Generator glow that lights it in 06, or -1: when the glint arrives (seconds of 06). */
	relit: number;
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
		relit: -1,
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

// the worlds a glint reaches in 06: one nearby dim world in each quarter, arriving one after another
const GLINTS: { to: number; leave: number; fly: number }[] = (() => {
	const out: { to: number; leave: number; fly: number }[] = [];
	for (let q = 0; q < 4; q++) {
		let best = -1;
		let bd = 9;
		WORLDS.forEach((w, i) => {
			if (i === 0 || w.mote) return;
			const dx = w.x - VALLERON.x;
			const dy = w.y - VALLERON.y;
			const d = Math.hypot(dx, dy);
			if (d < 0.17 || d > 0.4) return;
			const a = Math.atan2(dy, dx) + Math.PI;
			if (Math.floor(((a + 0.5) / TAU) * 4) % 4 !== q) return;
			const score = Math.abs(d - 0.27);
			if (score < bd) {
				bd = score;
				best = i;
			}
		});
		if (best >= 0) out.push({ to: best, leave: 3.4 + q * 0.42, fly: 1.35 });
	}
	return out;
})();
for (const g of GLINTS) {
	WORLDS[g.to].keep = false;
	WORLDS[g.to].relit = g.leave + g.fly;
}
// the compact layout drops every other small world that has no part in the story
WORLDS.forEach((w, i) => {
	w.minor = i % 5 === 1 || i % 5 === 3;
	if (i === 0 || w.mote || w.relit >= 0) w.minor = false;
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
let hazeCv: HTMLCanvasElement | null = null;
let hazeKey = -1;
let eraser: HTMLCanvasElement | null = null;
let softEraser: HTMLCanvasElement | null = null;
let edgeMask: HTMLCanvasElement | null = null;
let grainPat: CanvasPattern | null = null;
let clearDark: HTMLCanvasElement | null = null;
let clearEdge: HTMLCanvasElement | null = null;
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
	clearDark = round([[0, 'rgba(3,3,8,0.86)'], [0.9, 'rgba(3,3,8,0.86)'], [1, 'rgba(3,3,8,0)']]);
	// where the haze curls back: a thin crimson edge
	clearEdge = round([[0, 'rgba(176,48,58,0)'], [0.82, 'rgba(176,48,58,0)'], [0.9, 'rgba(176,48,58,0.36)'], [1, 'rgba(176,48,58,0)']]);
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

/** The clear round's radius in the galaxy's plane: a thin thinning round Valleron in 05, then 06's widening ring. */
const thinR = (t0: number) => 0.07 * smooth(WORLDS[0].it - 0.3, WORLDS[0].it + 2, t0);
const ringR = (t1: number) => 0.1 * easeOut(ramp(2.0, 3.5, t1));
const clearR = (t0: number, t1: number) => thinR(t0) + ringR(t1);

/**
 * The haze, in the galaxy's plane: soft grainy smoke from several sources at once, each a cloud of large
 * blobs that grows and drifts, thinned round Valleron and, in 06, drawn back from it in a widening clear ring.
 */
function paintHaze(t0: number, t1: number) {
	if (!hazeCv) hazeCv = canvasOf(HZ, HZ);
	const g = hazeCv?.getContext('2d');
	if (!hazeCv || !g) return null;
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
	// the haze thins round Valleron, softly; 06 then draws it back in a clean-edged ring
	const th = thinR(t0);
	if (softEraser && th > 0.004) {
		g.globalAlpha = 0.85;
		g.drawImage(softEraser, px - th * 1.7 * hk, py - th * 1.7 * hk, th * 3.4 * hk, th * 3.4 * hk);
	}
	const rr = clearR(t0, t1);
	if (eraser && ringR(t1) > 0.004) {
		g.globalAlpha = 1;
		g.drawImage(eraser, px - rr * hk, py - rr * hk, rr * hk * 2, rr * hk * 2);
	}
	g.globalAlpha = 1;
	g.globalCompositeOperation = 'source-over';
	return hazeCv;
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

// ---- the Scrambler Token: a hexagon of smoked glass in a stepped, worn metal bevel, drawn once. (Carried from
// token.ts, cut down to what reads at page size: no pins, which read as a label, and no bright target.)

const CHIP_N = 340;
const CHIP_R = 118;
const CHIP_CENTER = { x: CHIP_N / 2, y: CHIP_N / 2 };
let chipTex: HTMLCanvasElement | null = null;
let chipFace: [number, number][] = [];
let scrambleTile: HTMLCanvasElement | null = null;
function chip() {
	if (chipTex) return chipTex;
	const c = canvasOf(CHIP_N, CHIP_N);
	const g = c?.getContext('2d');
	if (!c || !g) return null;
	const yaw = 0.16;
	const tilt = 0.1;
	const THICK = 22;
	const LIGHT = { x: -0.5, y: 0.6, z: 0.62 };
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
	const litOf = (nx: number, ny: number) => {
		const l = Math.hypot(nx, ny, 0.8) || 1;
		return Math.max(0, (nx * LIGHT.x + ny * LIGHT.y + 0.8 * LIGHT.z) / l);
	};
	const outer = hex(CHIP_R, 0);
	const back = hex(CHIP_R, -THICK);
	const mid = hex(CHIP_R - 12, 4);
	const face = hex(CHIP_R - 26, 2);
	chipFace = face.map((p) => P(p[0], p[1], p[2]));
	// the edge below, in shadow
	for (let k = 0; k < 6; k++) {
		const a = outer[k];
		const b = outer[(k + 1) % 6];
		if ((a[1] + b[1]) / 2 > 0) continue;
		poly([a, b, back[(k + 1) % 6], back[k]]);
		g.fillStyle = css([28, 26, 24]);
		g.fill();
	}
	// the outer bevel: each side lit by how it faces the light, upper left a worn pale metal, lower right shadow
	for (let k = 0; k < 6; k++) {
		const a = outer[k];
		const b = outer[(k + 1) % 6];
		const l = litOf((a[0] + b[0]) / 2 / CHIP_R, (a[1] + b[1]) / 2 / CHIP_R);
		poly([a, b, mid[(k + 1) % 6], mid[k]]);
		g.fillStyle = css(mixRGB([42, 40, 38], [201, 194, 180], clamp(l * 1.15)));
		g.fill();
	}
	// the step down: the inner bevel, lit the other way, so it reads as a step and not a flat rim
	for (let k = 0; k < 6; k++) {
		const a = mid[k];
		const b = mid[(k + 1) % 6];
		const l = litOf(-(a[0] + b[0]) / 2 / CHIP_R, -(a[1] + b[1]) / 2 / CHIP_R);
		poly([a, b, face[(k + 1) % 6], face[k]]);
		g.fillStyle = css(mixRGB([36, 34, 32], [128, 122, 112], clamp(l * 0.9)));
		g.fill();
	}
	// the face: smoked glass, dark at the edge and a little paler toward the light
	poly(face);
	const c0 = P(-20, 30, 2);
	const grad = g.createRadialGradient(c0[0], c0[1], 4, CHIP_N / 2, CHIP_N / 2, CHIP_R);
	grad.addColorStop(0, css([26, 34, 40]));
	grad.addColorStop(1, css([7, 10, 12]));
	g.fillStyle = grad;
	g.fill();
	// the recess for the light, dark, with a thin worn lip
	poly(Array.from({ length: 36 }, (_, k) => [Math.cos((k / 36) * TAU) * 34, Math.sin((k / 36) * TAU) * 34, 3] as V));
	g.fillStyle = css([3, 5, 6]);
	g.fill();
	g.strokeStyle = css([110, 108, 100], 0.75);
	g.lineWidth = 2.6;
	g.stroke();
	// wear: light and dark chips and scratches along the bevel
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
	mark(-96, 34, -78, 62, 'rgba(240,234,220,0.75)', 3);
	mark(-40, 96, -14, 104, 'rgba(240,234,220,0.6)', 3);
	mark(60, -84, 84, -66, 'rgba(20,18,16,0.7)', 3);
	mark(96, 20, 100, 44, 'rgba(20,18,16,0.6)', 3);
	mark(-60, -40, -20, -58, 'rgba(210,214,216,0.18)', 2);
	mark(30, 40, 70, 22, 'rgba(210,214,216,0.14)', 2);
	// the haze's rim light along the lower edge
	g.strokeStyle = 'rgba(176,48,58,0.42)';
	g.lineWidth = 5;
	for (let k = 0; k < 6; k++) {
		const a = outer[k];
		const b = outer[(k + 1) % 6];
		if ((a[1] + b[1]) / 2 > -20) continue;
		const pa = P(a[0], a[1], -THICK * 0.4);
		const pb = P(b[0], b[1], -THICK * 0.4);
		g.beginPath();
		g.moveTo(pa[0], pa[1]);
		g.lineTo(pb[0], pb[1]);
		g.stroke();
	}
	chipTex = c;
	return c;
}
/** The faint scramble under the glass: small cells of pale light, shifting slowly (texture, not a message). */
function scramble() {
	if (scrambleTile) return scrambleTile;
	const c = canvasOf(96, 96);
	const g = c?.getContext('2d');
	if (!c || !g) return null;
	const r = rng(9);
	for (let y = 0; y < 96; y += 6)
		for (let x = 0; x < 96; x += 6) {
			if (r() < 0.55) continue;
			g.fillStyle = css([176, 196, 206], 0.35 + 0.65 * r());
			g.fillRect(x, y, 4 + Math.floor(r() * 2), 4);
		}
	scrambleTile = c;
	return c;
}

// ---- the figure

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
	const zoomAt = () => ease(ramp(0, 2.0, t1));
	// Valleron sits a little below the middle at the close-in, with the token above it
	const VOFF = 24;
	// the anchor is the galaxy's heart, and by the end of 06 the bright world, which the view has centered
	const anchor = () => ({ x: CX, y: CY + VOFF * zoomAt() });

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
			hazeKey = -1;
		},
		settle(s) {
			stage = s;
			present = true;
			vis = 1;
			field = 1;
			t0 = s === 0 ? 8.8 : 9.5;
			t1 = s === 1 ? 9 : 0;
			hazeKey = -1;
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
		// the close-in always plays through, even before its beat is live; so does running back out
		busy: (s, isPresent) => Math.abs((isPresent ? 1 : 0) - vis) > 0.004 || (s === 1 && stage !== 1) || (s === 1 && isPresent && t1 < 2.2) || (s !== 1 && t1 > 0.01),
		anchor,
		light: (): RGB => (stage === 1 ? WHITE : SICK),
		draw(ctx, sec, opts) {
			if (vis <= 0.005) return;
			const compact = !!opts?.compact;
			const e = zoomAt();
			const z = 1 + (ZOOM - 1) * e;
			const zs = Math.pow(z, 0.5) * (compact ? 1.5 : 1);
			// the plane onto the stage: turn, tilt, roll, then the camera closing in on Valleron
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
			const vv = lin(VALLERON.x, VALLERON.y);
			const m = { a: z * ex[0], b: z * ex[1], c: z * ey[0], d: z * ey[1], ox: CX - z * e * vv[0], oy: CY + VOFF * e - z * e * vv[1] };
			WORLDS.forEach((w, i) => {
				sx[i] = m.a * w.x + m.c * w.y + m.ox;
				sy[i] = m.b * w.x + m.d * w.y + m.oy;
			});
			const vx = sx[0];
			const vy = sy[0];

			ctx.save();
			// bloom out of (and pull back into) the anchor
			const an = anchor();
			const bs = 0.12 + 0.88 * easeOut(vis);
			ctx.translate(an.x, an.y);
			ctx.scale(bs, bs);
			ctx.translate(-an.x, -an.y);
			ctx.globalAlpha = 1;
			// everything but the bright world is drawn at A; the bright world's own light at vis
			const A = vis * field;
			const putAt = (k: number) => (s: HTMLCanvasElement | null, x: number, y: number, r: number, a: number) => {
				if (!s || a <= 0.004 || r <= 0.4) return;
				ctx.globalAlpha = clamp(a * k);
				ctx.drawImage(s, x - r, y - r, r * 2, r * 2);
			};
			const put = putAt(A);
			const putV = putAt(vis);

			// deep space, drifting a little against the close-in
			const gr = space();
			if (gr && A > 0.004) {
				const gs = 1.02 + 0.07 * e;
				ctx.globalAlpha = A;
				ctx.drawImage(gr, CX - (W * gs) / 2, CY - (H * gs) / 2, W * gs, H * gs);
			}

			if (!eraser) paintHaze(t0, t1); // builds the clear-ring sprites before the first frame uses them
			const rr = clearR(t0, t1);
			const ringOn = smooth(1.9, 2.6, t1);
			// the disk (dust, arms, core), turned and tilted; its light fades a little as the haze takes it
			const tex = disk();
			const cover = smooth(1.5, 8, t0);
			if (tex && A > 0.004) {
				ctx.save();
				ctx.transform(m.a, m.b, m.c, m.d, m.ox, m.oy);
				ctx.globalAlpha = A * (1 - 0.3 * cover);
				ctx.drawImage(tex, -EXT, -EXT, EXT * 2, EXT * 2);
				// inside the token's ring is the true dark of space
				if (clearDark && ringOn > 0.01) {
					ctx.globalAlpha = A * ringOn;
					ctx.drawImage(clearDark, VALLERON.x - rr, VALLERON.y - rr, rr * 2, rr * 2);
				}
				ctx.restore();
			}

			// the haze, in the plane: grainy crimson smoke, drawn back from Valleron
			ctx.globalCompositeOperation = 'source-over';
			const key = Math.floor(t0 * 12) * 4096 + Math.floor(t1 * 20);
			const hz = key === hazeKey && hazeCv ? hazeCv : paintHaze(t0, t1);
			hazeKey = key;
			if (hz && A > 0.004) {
				ctx.save();
				ctx.transform(m.a, m.b, m.c, m.d, m.ox, m.oy);
				ctx.globalAlpha = A;
				ctx.drawImage(hz, -EXT, -EXT, EXT * 2, EXT * 2);
				if (clearEdge && ringOn > 0.01) {
					ctx.globalAlpha = A * ringOn;
					const er = rr * 1.1;
					ctx.drawImage(clearEdge, VALLERON.x - er, VALLERON.y - er, er * 2, er * 2);
				}
				ctx.restore();
			}

			// the worlds: warm lights that flare crimson when the haze reaches them and dim to small embers
			ctx.globalCompositeOperation = 'lighter';
			const GOLD: RGB = [255, 226, 160];
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
					b = mix(b, 0.3 + 0.12 * e, dim) + 0.9 * flare;
				}
				const size = w.size * (1 + 0.9 * flare);
				let haloR = mix(6 + size * 4.6, 3.4, dim);
				let coreR = mix(1.7 + size * 1.2, 1.2, dim);
				let greenA = 0;
				let pop = 0;
				if (w.relit >= 0) {
					// it lights again in its own warm white-gold, with a small Generator glow inside it
					const ra = t1 - w.relit;
					const lit = smooth(0, 0.6, ra);
					col = mixRGB(col, GOLD, lit);
					b = mix(b, 1.0, lit);
					haloR = mix(haloR, 9, lit);
					coreR = mix(coreR, 3.2, lit);
					greenA = smooth(0.3, 0.8, ra);
					pop = Math.exp(-Math.pow((ra - 0.75) / 0.3, 2));
				}
				put(spr(col), sx[i], sy[i], haloR * zs, 0.4 * b);
				put(spr(mixRGB(col, WHITE, 0.45 * (1 - dim))), sx[i], sy[i], coreR * zs, Math.min(1, 0.95 * b));
				if (greenA > 0.01) {
					put(spr(GENESIS), sx[i], sy[i], 9 * zs * (1 + 0.5 * pop), 0.16 * greenA);
					ctx.globalCompositeOperation = 'source-over';
					put(spr(GENESIS), sx[i], sy[i], 2.6 * zs * (1 + 0.5 * pop), 0.85 * greenA);
					ctx.globalCompositeOperation = 'lighter';
				}
			}

			// life gathering: warm motes drift in to Valleron from the neighbors before they dim
			if (t0 < 8 && t1 < 3) {
				const fade = 1 - smooth(1, 2.5, t1);
				for (const i of NEIGHBORS) {
					const mo = WORLDS[i].mote;
					if (!mo || (compact && WORLDS[i].minor)) continue;
					if (t0 < mo.from || t0 > mo.to) continue;
					const u = ((((t0 - mo.from) / mo.per + mo.ph) % 1) + 1) % 1;
					const k = ease(u);
					const bend = Math.sin(u * Math.PI) * mo.bend * RAD * z;
					const x = mix(sx[i], vx, k) + bend;
					const y = mix(sy[i], vy, k) - bend * 0.6;
					put(spr(WARM[0]), x, y, 5 * zs, Math.sin(u * Math.PI) * fade);
					put(spr(WHITE), x, y, 1.6 * zs, Math.sin(u * Math.PI) * 0.9 * fade);
				}
			}

			// Valleron: a small bright world in a warm corona, brighter as life gathers, unmoved by the haze
			const gather = smooth(1.4, 5.2, t0);
			const vb = 1 + 1.5 * gather + 0.1 * Math.sin(sec * 0.8);
			putV(spr([255, 214, 150]), vx, vy, (30 + 30 * gather) * zs * (1 + 0.04 * Math.sin(sec * 1.3)), 0.3 + 0.3 * gather);
			putV(spr([255, 236, 200]), vx, vy, (9 + 6 * gather) * zs, Math.min(1, 0.55 * vb));
			putV(spr(WHITE), vx, vy, (3.2 + 1.4 * gather) * zs, 0.95);

			// 06: the Scrambler Token grows out of that world's light, just above it
			const S = compact ? 60 : 40;
			const cxp = vx;
			const cyp = vy - (S * 0.85 + 16 * (compact ? 1.4 : 1));
			if (t1 > 1.2 && A > 0.004) {
				// a line of white light rises from the world, then the shape, then the metal
				const rise = easeOut(ramp(1.3, 1.9, t1));
				const lineA = smooth(1.2, 1.5, t1) * (1 - smooth(2.2, 2.7, t1));
				if (lineA > 0.01) {
					ctx.globalAlpha = clamp(0.6 * lineA * A);
					ctx.strokeStyle = css(WHITE);
					ctx.lineWidth = 1.4;
					ctx.beginPath();
					ctx.moveTo(vx, vy);
					ctx.lineTo(vx, mix(vy, cyp, rise));
					ctx.stroke();
				}
				const outline = smooth(1.7, 2.0, t1) * (1 - smooth(2.1, 2.6, t1));
				if (outline > 0.01 && chip() && chipFace.length) {
					ctx.save();
					ctx.translate(cxp, cyp);
					ctx.rotate(ROLL);
					const os = (S / CHIP_R) * 1.12;
					ctx.scale(os, os * 0.8);
					ctx.globalAlpha = clamp(0.7 * outline * A);
					ctx.strokeStyle = css(WHITE);
					ctx.lineWidth = 3;
					ctx.beginPath();
					chipFace.forEach((p, k) => (k ? ctx.lineTo(p[0] - CHIP_CENTER.x, p[1] - CHIP_CENTER.y) : ctx.moveTo(p[0] - CHIP_CENTER.x, p[1] - CHIP_CENTER.y)));
					ctx.closePath();
					ctx.stroke();
					ctx.restore();
				}
				const form = smooth(1.8, 2.6, t1);
				put(spr([255, 252, 246]), cxp, cyp, S * 2.6, 0.22 * form + 0.12 * smooth(1.5, 2.0, t1) * (1 - form));
			}

			// tokens carried home: warm-white glints leave the token in arcs to nearby dim worlds, each with a trail
			for (const gl of GLINTS) {
				const u = (t1 - gl.leave) / gl.fly;
				if (u <= 0 || u >= 1) continue;
				const i = gl.to;
				const dx = sx[i] - cxp;
				const dy = sy[i] - cyp;
				const len = Math.hypot(dx, dy);
				const nx = -dy / (len || 1);
				const ny = dx / (len || 1);
				const bow = len * 0.3 * (i % 2 ? 1 : -1);
				const at = (q: number) => {
					const k = ease(q);
					const bb = Math.sin(k * Math.PI) * bow;
					return [cxp + dx * k + nx * bb, cyp + dy * k + ny * bb] as const;
				};
				const env = smooth(0, 0.06, u) * (1 - smooth(0.94, 1, u));
				for (let s2 = 16; s2 >= 1; s2--) {
					const p = at(Math.max(0, u - s2 * 0.02));
					put(spr([255, 226, 170]), p[0], p[1], (2.6 - s2 * 0.08) * zs, 0.5 * env * (1 - s2 / 17));
				}
				const p = at(u);
				put(spr([255, 232, 180]), p[0], p[1], 8 * zs, 0.5 * env);
				put(spr(WHITE), p[0], p[1], 2.6 * zs, env);
			}
			ctx.globalCompositeOperation = 'source-over';

			// the chip itself: smoked glass in worn metal, tipped to the galaxy's plane, sitting in the scene
			if (t1 > 1.8 && A > 0.004) {
				const form = smooth(1.9, 2.6, t1);
				const tex2 = chip();
				if (tex2 && form > 0.01) {
					const s = (S / CHIP_R) * (0.9 + 0.1 * easeOut(form));
					// a soft contact shadow under it
					put(puff([0, 0, 0]), cxp + S * 0.12, cyp + S * 0.55, S * 1.25, 0.55 * form);
					ctx.save();
					ctx.translate(cxp, cyp);
					ctx.rotate(ROLL);
					ctx.scale(s, s * 0.8);
					ctx.globalAlpha = clamp(form * A);
					ctx.drawImage(tex2, -CHIP_CENTER.x, -CHIP_CENTER.y);
					// the scramble under the glass, faint and slow
					const sc = scramble();
					if (sc && chipFace.length) {
						ctx.beginPath();
						chipFace.forEach((p, k) => (k ? ctx.lineTo(p[0] - CHIP_CENTER.x, p[1] - CHIP_CENTER.y) : ctx.moveTo(p[0] - CHIP_CENTER.x, p[1] - CHIP_CENTER.y)));
						ctx.closePath();
						ctx.clip();
						ctx.globalAlpha = clamp(0.15 * form * A);
						const o = (sec * 4) % 96;
						for (let y = -96 + o; y < CHIP_N; y += 96) for (let x = -96 - o * 0.5; x < CHIP_N; x += 96) ctx.drawImage(sc, x - CHIP_CENTER.x, y - CHIP_CENTER.y);
					}
					ctx.restore();
					// its white light, breathing slowly
					ctx.globalCompositeOperation = 'lighter';
					const br = 0.6 + 0.2 * Math.sin(sec * 1.4);
					put(spr([255, 250, 242]), cxp, cyp, S * 0.62 * (0.92 + 0.12 * br), form * br * 0.7);
					put(spr(WHITE), cxp, cyp, S * 0.2, form * 0.95);
					ctx.globalCompositeOperation = 'source-over';
				}
			}

			// the close-in darkens the edges a little, to hold the eye on the one bright world
			if (e > 0.02 && A > 0.004) {
				const vg = ctx.createRadialGradient(CX, CY, 150, CX, CY, 620);
				vg.addColorStop(0, css([4, 4, 10], 0));
				vg.addColorStop(1, css([4, 4, 10], 0.5 * e * A));
				ctx.globalAlpha = 1;
				ctx.fillStyle = vg;
				ctx.fillRect(-40, -40, W + 80, H + 80);
			}
			// pulled back, only the one light is left to arrive
			if (field < 0.98) {
				ctx.globalCompositeOperation = 'lighter';
				putV(spr([255, 226, 170]), an.x, an.y, 26 * zs, 0.6 * (1 - field));
				putV(spr(WHITE), an.x, an.y, 4 * zs, 0.9 * (1 - field));
				ctx.globalCompositeOperation = 'source-over';
			}
			ctx.globalAlpha = 1;
			ctx.restore();
			grain(ctx, sec, 0.05 * vis * field);
		},
	};
}
