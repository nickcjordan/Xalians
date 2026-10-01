// The home story's outbreak figure (docs/design/home-story-figures.md, section 7): beats 05 and 06 as one
// drawing that runs on from one beat into the next.
//
//   05  A spiral galaxy seen at a tilt, turning slowly, healthy: bright, golden, many lit worlds, held calm for about 0.8 s.
//       Then an outbreak, like fire over paper. Several sources (none first, none near Valleron, no lanes, no routes) each
//       bloom crimson at their own moment (0.8 to 2.5 s) and spread outward, accelerating, with a hot noise-broken edge
//       (crimson to orange) that leaves charred, dim-red embers where the galaxy's warm light was; fronts merge. A world the
//       edge reaches flares hard with a small shock ring and is snuffed to a faint ember within about 0.4 s; most go out, a
//       few outer ones do not. One world in the disk (Valleron, never named, not at the core) grows brighter as warm motes
//       drift in to it from its neighbors before they go out; the fire reaches it late, closes in round it and stops short,
//       so it stands alone and bright in a dark, smoldering galaxy. About 0.8 to 5.5 s of burning, then a smolder held.
//   06  The view comes down to one of the dark worlds in two motions. ZOOM: one eased zoom to it (it carries a faint crimson
//       glow from the first frame) as its point grows into a lit sphere with an atmosphere. LAND: the camera keeps moving,
//       the sphere's surface turns to red haze that clears from the center outward over the dormant Generator, which stands
//       finished underneath. A Scrambler Token, a printed genome card (a dark data wafer with a scrambled double helix and
//       a row of gold contacts), is carried in from the foreground and slid into a slot low on the Generator's front; the
//       machine reads it, the scrambled marks come into order as they light, a line of light runs up the housing's seams into
//       the vat, which fills with Genesis green and grows seeds of life. A warm band spreads over the ground and the red keeps
//       back from the new life, while beyond the machine the red remains: a beginning, not a cure.
//
// What the lore does not say is not drawn: no world where the plague began, no route it took, Valleron is one
// world (not a cluster, not at the core, never untouched), the plague is not cured, and the token is carried home
// (never beamed or shot in from the sky); nothing leaves the Generator.
//
// Everything is drawn in code from things built once: the galaxy's disk (a texture in the galaxy's own plane), the
// infection (two low-resolution fields in that plane, char and hot edge, painted per pixel at film rate), the deep-space
// ground, the planet's surface and the card. Each frame lays them on the stage under one affine turn-and-tilt, so nothing
// here boils: static textures and a slow drift. No state but the figure's clocks.
import { clamp, css, easeOut, glow, grain, H, lighter, mix, mixRGB, ramp, rng, smooth, W, type Ctx, type RGB } from './stage';
import { GROUND, MX, SLOT_LIP, VR, VY0, VY1, drawMachine, machineTinted, offscreen, pics } from './generatorMachine';
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

// the infection's sources: several places at once, none of them first, none of them near Valleron. Each starts at its own moment
// (0.8 to 2.5 s) as a sudden bloom and spreads outward, accelerating; where fronts meet they merge.
type Source = { x: number; y: number; t0: number; v0: number; acc: number };
const SOURCES: Source[] = (() => {
	const out: Source[] = [];
	let guard = 0;
	while (out.length < 9 && guard++ < 200) {
		const a = rnd() * TAU;
		const r = 0.16 + rnd() * 0.72;
		const x = Math.cos(a) * r;
		const y = Math.sin(a) * r;
		if (dist(x, y, VALLERON.x, VALLERON.y) < 0.34) continue;
		if (out.some((s) => dist(s.x, s.y, x, y) < 0.3)) continue;
		out.push({ x, y, t0: 0, v0: 0.1 + rnd() * 0.04, acc: 0.15 + rnd() * 0.05 });
	}
	// staggered starts, in no order that follows the map
	const starts = [1.7, 0.8, 2.5, 1.2, 2.1, 0.95, 1.5, 2.3, 1.05];
	out.forEach((s, i) => (s.t0 = starts[i % starts.length]));
	return out;
})();
/** How far a source's front has gone (galaxy units) at time t: a sudden small bloom, then it speeds up. */
const frontR = (s: Source, t: number) => (t < s.t0 ? -1 : 0.035 + s.v0 * (t - s.t0) + 0.5 * s.acc * (t - s.t0) * (t - s.t0));
/** When a source's front reaches distance d. */
const arrive = (s: Source, d: number) => (d <= 0.035 ? s.t0 : s.t0 + (-s.v0 + Math.sqrt(s.v0 * s.v0 + 2 * s.acc * (d - 0.035))) / s.acc);

// when the haze reaches each world (the nearest front, a little ragged); the ones round Valleron are kept
// back a moment so its life has time to gather
const NEAR_V = 0.42;
for (const w of WORLDS) {
	let best = 99;
	for (const s of SOURCES) best = Math.min(best, arrive(s, dist(w.x, w.y, s.x, s.y)));
	w.it = best + rnd() * 0.3;
	const d = dist(w.x, w.y, VALLERON.x, VALLERON.y);
	if (d < NEAR_V) w.it = Math.max(w.it, 2.7 + 4.5 * d);
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
const TARGET_I = WORLDS.indexOf(TARGET);
// field stars, packed log-distributed about the dark world, so the zoom streams past at every scale (plane coordinates)
const FIELD = (() => {
	const r = rng(2077);
	return Array.from({ length: 900 }, () => {
		const rr = 0.5 * Math.pow(10, -2.5 * r());
		const an = r() * TAU;
		return { x: TARGET.x + Math.cos(an) * rr, y: TARGET.y + Math.sin(an) * rr, b: (0.35 + 0.65 * r()) * (0.2 + 0.8 * smooth(0.004, 0.07, rr)), c: r() < 0.3 ? 1 : 0 };
	});
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

const HZ = 224;
const DL = 512; // the burning disk's resolution
const hk = HZ / (2 * EXT);
/** `cv`: the galaxy's own disk with the burn recoloring it. `cv2`: what is added to it (the hot band, sparks, a faint ember glow). */
type HazeState = { cv: HTMLCanvasElement | null; cv2: HTMLCanvasElement | null; key: number };
let charCv: HTMLCanvasElement | null = null;
let healthyCv: HTMLCanvasElement | null = null;
let hzN1: Float32Array | null = null;
let hzN2: Float32Array | null = null;
let hzArm: Float32Array | null = null;
let hzImg: ImageData | null = null;
let hzImg2: ImageData | null = null;
function makeHazeParts() {
	// two fixed noise fields that break every front and mottle the embers
	const f = noiseField();
	hzN1 = new Float32Array(HZ * HZ);
	hzN2 = new Float32Array(HZ * HZ);
	hzArm = new Float32Array(HZ * HZ);
	for (let j = 0; j < HZ; j++)
		for (let i = 0; i < HZ; i++) {
			const q = j * HZ + i;
			// the fields tile exactly across the grid (whole periods), so that shifting them by a source's offset never leaves a seam
			hzN1[q] = nzAt(f, i * (NZ / HZ), j * (NZ / HZ));
			hzN2[q] = nzAt(f, i * (NZ / HZ) * 3 + 50, j * (NZ / HZ) * 3 + 20);
			// how much of an arm (or the core) this point of the plane is: the burn rides them
			const x = ((i + 0.5) / HZ) * 2 * EXT - EXT;
			const y = ((j + 0.5) / HZ) * 2 * EXT - EXT;
			const r = Math.hypot(x, y);
			const th = Math.atan2(y, x);
			let w = 0.8 * Math.exp(-((r / 0.3) * (r / 0.3)));
			for (const arm of ARMS) {
				const d = ((((th - armAngle(arm.off, Math.max(r, 0.1))) % TAU) + TAU + Math.PI) % TAU) - Math.PI;
				const sg = 0.34 / (0.6 + 1.5 * r);
				w = Math.max(w, arm.w * Math.exp(-0.5 * (d / sg) * (d / sg)));
			}
			hzArm[q] = clamp(w) * (r < 1 ? 1 : Math.exp(-(r - 1) * 12));
		}
}

/**
 * The infection, in the galaxy's plane: it burns IN the galaxy. From each source a front goes out as a feathered, broken, glowing
 * band that rides the arms (brightest where it crosses one, with a few sparks thrown ahead of it); behind it the galaxy's own
 * light is recolored and darkened, still showing its arms and lanes, warm and glowing right behind the band and cooling to dim
 * crimson and brown further back. Fronts merge. Valleron's neighborhood burns late and the fire stops short of it. Painted per
 * pixel at low resolution (everything is soft) at film rate: the burn recolors the disk in place, the heat is added over it.
 */
function paintHaze(st: HazeState, t0: number) {
	if (!st.cv) st.cv = canvasOf(DL, DL);
	if (!st.cv2) st.cv2 = canvasOf(HZ, HZ);
	if (!charCv) charCv = canvasOf(HZ, HZ);
	const g = st.cv?.getContext('2d');
	const g2 = st.cv2?.getContext('2d');
	const gc = charCv?.getContext('2d');
	const tex = disk();
	if (!st.cv || !st.cv2 || !charCv || !g || !g2 || !gc || !tex) return null;
	if (!hzN1) makeHazeParts();
	const n1 = hzN1;
	const n2 = hzN2;
	const arm = hzArm;
	if (!n1 || !n2 || !arm) return null;
	if (!hzImg) hzImg = gc.createImageData(HZ, HZ);
	if (!hzImg2) hzImg2 = g2.createImageData(HZ, HZ);
	const d1 = hzImg.data;
	const d2 = hzImg2.data;
	const act: { x: number; y: number; R: number; boost: number; sh: number }[] = [];
	SOURCES.forEach((sc, si) => {
		const R = frontR(sc, t0);
		if (R > 0) act.push({ x: sc.x, y: sc.y, R, boost: 1 + 2.4 * Math.exp(-(t0 - sc.t0) / 0.3), sh: si * 53 });
	});
	const vx = VALLERON.x;
	const vy = VALLERON.y;
	for (let j = 0; j < HZ; j++) {
		const y = ((j + 0.5) / HZ) * 2 * EXT - EXT;
		for (let i = 0; i < HZ; i++) {
			const x = ((i + 0.5) / HZ) * 2 * EXT - EXT;
			const k = (j * HZ + i) * 4;
			const q = j * HZ + i;
			// nothing beyond the disk
			if (x * x + y * y > 1.25) {
				d1[k + 3] = 0;
				d2[k + 3] = 0;
				continue;
			}
			let bf = -9;
			let bboost = 1;
			for (let a = 0; a < act.length; a++) {
				const sc = act[a];
				const dx = x - sc.x;
				const dy = y - sc.y;
				// each front is broken by the noise differently
				const qi = ((j + sc.sh) % HZ) * HZ + ((i + sc.sh * 2) % HZ);
				const f = sc.R - Math.sqrt(dx * dx + dy * dy) + (n1[qi] - 0.5) * 0.3 + (n2[qi] - 0.5) * 0.13;
				if (f > bf) {
					bf = f;
					bboost = sc.boost;
				}
			}
			// Valleron's neighborhood burns late and the fire stops short of it: the same front, held back
			const dV = Math.hypot(x - vx, y - vy) + (n1[q] - 0.5) * 0.14;
			const gate = mix(smooth(0, 1.1, t0 - (2.7 + 4.5 * Math.min(dV, 0.5))), 1, smooth(0.28, 0.5, dV));
			const shield = smooth(0.03, 0.11, dV);
			bf = bf - 0.5 * (1 - gate) - 0.4 * (1 - shield);
			const aw = arm[q];
			// the burn: feathered, strong on the arms and faint in the gaps; a recoloring of the galaxy's own light
			const inside = smooth(-0.06, 0.24, bf);
			const nn = n1[q] * 0.6 + n2[q] * 0.4;
			const coal = bf > -0.06 ? Math.exp(-Math.max(0, bf) / 0.2) * smooth(-0.06, 0.04, bf) : 0;
			// the char, mottled in value and hue: deep maroon, rust and a dull ochre-brown, slowly stirring
			const slow = 0.5 + 0.5 * Math.sin(t0 * 0.8 + n1[q] * 9);
			const tone = clamp((nn - 0.38) * 2.4) * (0.55 + 0.45 * slow);
			// ember gaps: patches of the char that have burned down to almost nothing between the glowing ones
			const gap = smooth(0.56, 0.78, n2[q] * 0.65 + n1[q] * 0.35);
			const val = (0.58 + 0.62 * n1[q]) * (1 - 0.5 * gap);
			const ochre = clamp((n2[q] - 0.55) * 3);
			const cr0 = mix(mix(38, 92, tone), 80, ochre * 0.5) * val;
			const cg0 = mix(mix(8, 28, tone), 46, ochre * 0.5) * val;
			const cb0 = mix(mix(16, 22, tone), 32, ochre * 0.5) * val;
			const cr = mix(cr0, 238, coal * 0.8);
			const cg = mix(cg0, 118, coal * 0.8);
			const cb = mix(cb0, 78, coal * 0.8);
			d1[k] = cr;
			d1[k + 1] = cg;
			d1[k + 2] = cb;
			d1[k + 3] = inside * (0.9 - 0.1 * aw) * 255;
			// the front: a hot, feathered band, brightest where it crosses an arm, crimson to orange
			const core = Math.exp(-(x * x + y * y) / 0.09);
			const heat = (bf >= 0 ? Math.exp(-bf / 0.07) : Math.exp(bf / 0.05) * 0.9) * (0.45 + 0.55 * n2[q]) * (0.2 + 0.8 * aw) * Math.min(bboost, 2) * (0.4 + 0.6 * shield) * (1 - 0.7 * core);
			const hot = clamp(heat * 1.1 - 0.1);
			let aBand = clamp(heat * 0.9);
			let r2 = mix(214, 255, hot);
			let g3 = mix(38, 150, hot);
			let b3 = mix(60, 70, hot);
			// sparks and embers thrown ahead of it
			if (bf < 0 && bf > -0.18 && n2[q] > 0.9 && Math.sin(t0 * 9 + n1[q] * 60) > 0.15) {
				aBand = Math.max(aBand, 0.9 * (1 - bf / -0.18) * shield);
				r2 = 255;
				g3 = 196;
				b3 = 120;
			}
			// a faint ember glow in what has burned, along the arms
			// a few dull ember specks in the char that pulse slowly
			const speck = n2[q] > 0.88 ? ((n2[q] - 0.88) / 0.12) * (0.5 + 0.5 * Math.sin(t0 * 0.9 + n1[q] * 40)) : 0;
			const aHaze = inside * (0.08 * (0.25 + aw) + 0.07 * Math.pow(aw, 2.4) * smooth(0.52, 0.7, n2[q] * 0.75 + n1[q] * 0.35) + 0.5 * speck * (0.3 + aw)) * (0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t0 * 1.1 + n2[q] * 9)));
			const aT = aBand + aHaze * (1 - aBand);
			const wB = aT > 0.0001 ? aBand / aT : 0;
			d2[k] = mix(204, r2, wB);
			d2[k + 1] = mix(88, g3, wB);
			d2[k + 2] = mix(48, b3, wB);
			d2[k + 3] = clamp(aT) * 255;
		}
	}
	gc.setTransform(1, 0, 0, 1, 0, 0);
	gc.globalCompositeOperation = 'source-over';
	gc.putImageData(hzImg, 0, 0);
	g2.setTransform(1, 0, 0, 1, 0, 0);
	g2.globalCompositeOperation = 'source-over';
	g2.putImageData(hzImg2, 0, 0);
	// the disk, healthy (bright and golden: laid twice, the second time added), then burned into
	g.setTransform(1, 0, 0, 1, 0, 0);
	g.globalCompositeOperation = 'source-over';
	g.clearRect(0, 0, DL, DL);
	g.globalAlpha = 1;
	if (!healthyCv) {
		healthyCv = canvasOf(DL, DL);
		const hg = healthyCv?.getContext('2d');
		if (healthyCv && hg) {
			hg.drawImage(tex, 0, 0, DL, DL);
			hg.globalCompositeOperation = 'lighter';
			hg.globalAlpha = 0.3;
			hg.drawImage(tex, 0, 0, DL, DL);
			// the core is the brightest part of the healthy disk: ease it down so that heat and flares over it cannot reach white
			hg.globalCompositeOperation = 'source-atop';
			hg.globalAlpha = 1;
			const ck0 = hg.createRadialGradient(DL / 2, DL / 2, 0, DL / 2, DL / 2, DL * 0.17);
			ck0.addColorStop(0, css([200, 110, 66], 0.42));
			ck0.addColorStop(1, css([200, 110, 66], 0));
			hg.fillStyle = ck0;
			hg.fillRect(0, 0, DL, DL);
		}
	}
	if (healthyCv) g.drawImage(healthyCv, 0, 0);
	// the heat only where there is galaxy to burn
	g2.globalCompositeOperation = 'destination-in';
	g2.drawImage(tex, 0, 0, HZ, HZ);
	g2.globalCompositeOperation = 'source-over';
	// recolored in place (source-atop: only where the galaxy has light, never beyond it); what is left of its own light is its structure
	g.globalCompositeOperation = 'source-atop';
	g.imageSmoothingEnabled = true;
	g.drawImage(charCv, 0, 0, DL, DL);
	// the hot band recolors the bright disk too (so a bright core goes orange, never white), and is also added over it
	g.globalAlpha = 0.85;
	g.drawImage(st.cv2, 0, 0, DL, DL);
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

// ---- the Scrambler Token: a printed genome card, a thin dark data wafer. Its face is graphite enamel with a double helix
// printed on it in fine marks, deliberately scrambled (segments out of order, offset, broken); a row of gold contacts runs
// along the edge that goes into the machine's slot, and one corner is cut. The body (thickness, face, sheen, border, serial
// marks, contacts, wear) is baked once; the helix is drawn live, because the machine reads it and sets it in order.
// (The sources give the token no look, only "a special chip printed by the Mercurius Machine which possesses a randomly
// generated and encrypted Xalian genome", so this is our design.)

const CARD_W = 74;
const CARD_H = 46;
const CARD_M = 4; // the baked texture's margin, in card units
const CARD_TS = 5; // texels per card unit
let cardTex: HTMLCanvasElement | null = null;

/** The card's outline: square-ish corners, the top right corner cut. */
function cardPath(g: Ctx, dx = 0, dy = 0, inset = 0) {
	const x0 = dx + inset;
	const y0 = dy + inset;
	const x1 = dx + CARD_W - inset;
	const y1 = dy + CARD_H - inset;
	const r = 2.2;
	const cut = 7 - inset;
	g.beginPath();
	g.moveTo(x0 + r, y0);
	g.lineTo(x1 - cut, y0);
	g.lineTo(x1, y0 + cut);
	g.lineTo(x1, y1 - r);
	g.arcTo(x1, y1, x1 - r, y1, r);
	g.lineTo(x0 + r, y1);
	g.arcTo(x0, y1, x0, y1 - r, r);
	g.lineTo(x0, y0 + r);
	g.arcTo(x0, y0, x0 + r, y0, r);
	g.closePath();
}

function card() {
	if (cardTex) return cardTex;
	const c = canvasOf((CARD_W + 2 * CARD_M) * CARD_TS, (CARD_H + 2 * CARD_M) * CARD_TS);
	const g = c?.getContext('2d');
	if (!c || !g) return null;
	g.scale(CARD_TS, CARD_TS);
	g.translate(CARD_M, CARD_M);
	const r = rng(606);
	// the thickness: seen from above and the left, a sliver of the top edge and of the left edge shows behind the face
	const TX = -2.2;
	const TY = -1.7;
	for (let k = 0; k <= 8; k++) {
		const f = k / 8;
		cardPath(g, TX * (1 - f), TY * (1 - f));
		g.fillStyle = css(mixRGB([14, 15, 18], [74, 72, 72], f * f));
		g.fill();
	}
	// the left edge is a little darker than the top edge, which catches the light
	g.save();
	g.beginPath();
	g.moveTo(TX, TY + 2.2);
	g.lineTo(0, 2.2);
	g.lineTo(0, CARD_H - 2.2);
	g.lineTo(TX, CARD_H - 2.2 + TY);
	g.closePath();
	g.fillStyle = css([8, 8, 10], 0.35);
	g.fill();
	g.beginPath();
	g.moveTo(TX + 2.2, TY);
	g.lineTo(CARD_W - 7 + TX, TY);
	g.lineTo(CARD_W - 7, 0);
	g.lineTo(2.2, 0);
	g.closePath();
	g.fillStyle = css([226, 214, 196], 0.22);
	g.fill();
	g.restore();
	// the face: graphite enamel, lighter at the upper left
	cardPath(g);
	const fg = g.createLinearGradient(0, 0, CARD_W * 0.8, CARD_H);
	fg.addColorStop(0, css([46, 48, 54]));
	fg.addColorStop(0.55, css([28, 29, 35]));
	fg.addColorStop(1, css([17, 18, 23]));
	g.fillStyle = fg;
	g.fill();
	g.save();
	cardPath(g);
	g.clip();
	// a faint ink sheen: one soft diagonal band
	const sg = g.createLinearGradient(0, CARD_H * 0.1, CARD_W * 0.7, CARD_H * 0.9);
	sg.addColorStop(0, css([210, 220, 236], 0));
	sg.addColorStop(0.28, css([210, 220, 236], 0));
	sg.addColorStop(0.42, css([210, 220, 236], 0.1));
	sg.addColorStop(0.56, css([210, 220, 236], 0));
	sg.addColorStop(1, css([210, 220, 236], 0));
	g.fillStyle = sg;
	g.fillRect(0, 0, CARD_W, CARD_H);
	// a fine fiber grain in the enamel
	for (let k = 0; k < 520; k++) {
		g.fillStyle = css(r() < 0.5 ? [200, 206, 216] : [0, 0, 0], 0.04 + r() * 0.05);
		g.fillRect(r() * CARD_W, r() * CARD_H, 0.5 + r() * 1.2, 0.2);
	}
	// the printed border, inset
	cardPath(g, 0, 0, 2.6);
	g.strokeStyle = css([150, 160, 176], 0.3);
	g.lineWidth = 0.4;
	g.stroke();
	// the encoded band under the helix: short printed blocks and dashes, dim, in rows
	for (let row = 0; row < 3; row++) {
		let x = 7 + r() * 3;
		const y = 26 + row * 3.6;
		while (x < 66) {
			const w = 1 + r() * 5.5;
			g.fillStyle = css([140, 152, 170], 0.1 + r() * 0.12);
			g.fillRect(x, y, w, 0.9 + (r() < 0.25 ? 0.9 : 0));
			x += w + 1 + r() * 2.4;
		}
	}
	// serial ticks near the contacts
	g.fillStyle = css([170, 180, 196], 0.28);
	for (let k = 0; k < 16; k++) g.fillRect(7 + k * 1.5 + (k > 8 ? 4 : 0), 34, 0.55, 1.6 + (k % 3 === 0 ? 1 : 0));
	g.restore();
	// the contacts: a recessed dark bed along the edge that goes in, with a row of gold pads
	g.fillStyle = css([6, 6, 8]);
	g.fillRect(2.4, 37.6, CARD_W - 4.8, 7.6);
	for (let k = 0; k < 12; k++) {
		const x = 4.2 + k * 5.5;
		const pg = g.createLinearGradient(0, 38.4, 0, 44.6);
		pg.addColorStop(0, css([255, 224, 130]));
		pg.addColorStop(0.5, css([230, 176, 72]));
		pg.addColorStop(1, css([176, 124, 44]));
		g.fillStyle = pg;
		g.fillRect(x, 38.4, 4.4, 6.4);
		g.fillStyle = css([255, 250, 214], 0.7);
		g.fillRect(x, 38.4, 4.4, 0.8);
		g.fillStyle = css([90, 56, 18], 0.5);
		g.fillRect(x, 44, 4.4, 0.8);
	}
	// wear: scuffed corners and a few nicks along the edges
	g.fillStyle = css([210, 208, 200], 0.42);
	for (const [x, y, w, h] of [[0.3, 0.3, 2.6, 0.45], [0.3, 0.3, 0.45, 2.2], [0.3, CARD_H - 0.8, 2.4, 0.45], [CARD_W - 2.8, CARD_H - 0.8, 2.4, 0.45], [CARD_W - 0.8, CARD_H - 3, 0.45, 2.4], [CARD_W - 5.5, 0.3, 2.6, 0.4], [20, 0.3, 3, 0.35], [0.3, 24, 0.4, 3]] as const) g.fillRect(x, y, w, h);
	g.fillStyle = css([4, 4, 6], 0.5);
	g.fillRect(CARD_W - 2.4, 11, 1.6, 0.6);
	cardTex = c;
	return c;
}

// ---- the helix on the card: HN columns, each a pair of strand marks joined by a rung. Printed, the columns are cut into
// segments that sit out of order, offset up and down, some strands swapped and some rungs missing; read, each column lights green
// where it lies, one after another from the left, and the pattern stays scrambled (the encryption is never resolved).
const HN = 28;
const HX0 = 7.5;
const HPITCH = 2.15;
const HCY = 11.4;
const HAMP = 7.8;
const SEG_BOUNDS = [0, 5, 9, 14, 18, 23, 28];
const SEG_ORDER = [2, 0, 4, 1, 5, 3];
const SEG_OY = [-2.4, 2.0, -1.2, 2.8, -3.0, 1.4];
const SEG_AMP = [0.8, 1.15, 0.88, 1.2, 0.74, 1.05];
const SEG_SGN = [1, -1, 1, 1, -1, 1];
const HELIX = (() => {
	const r = rng(66);
	// the scrambled x of each column: the segments laid end to end in a shuffled order, a hair of gap between them
	const scrX: number[] = new Array(HN);
	const segOf: number[] = new Array(HN);
	let x = HX0;
	for (const sIdx of SEG_ORDER) {
		for (let i = SEG_BOUNDS[sIdx]; i < SEG_BOUNDS[sIdx + 1]; i++) {
			scrX[i] = x;
			segOf[i] = sIdx;
			x += HPITCH;
		}
		x += 0.5 + r() * 0.7;
	}
	// squeeze the shuffled run back into the helix's width
	const span = x - 0.6 - HPITCH - HX0;
	const k = ((HN - 1) * HPITCH) / span;
	for (let i = 0; i < HN; i++) scrX[i] = HX0 + (scrX[i] - HX0) * k;
	const rungMiss = Array.from({ length: HN }, () => r() < 0.2);
	const rungLen = Array.from({ length: HN }, () => 0.45 + r() * 0.5);
	const strandMiss = Array.from({ length: HN }, () => r() < 0.18);
	// a few orphan marks, printed where no column is
	const strays = Array.from({ length: 5 }, () => ({ x: HX0 + r() * 58, y: 2.6 + r() * 14, l: 1 + r() * 2.4 }));
	return { scrX, segOf, rungMiss, rungLen, strandMiss, strays };
})();

/**
 * Draw the card's live helix in card units, with the card's transform already set. `lit(i)` is how far column i has been
 * read, 0 to 1 (0 printed and scrambled, 1 in order and lit); `glowK` scales the light on the lit marks.
 */
function drawHelix(g: Ctx, lit: (i: number) => number, glowK: number) {
	const cols = Array.from({ length: HN }, (_, i) => {
		// the genome is random and encrypted: it is never put in order, only lit where it lies
		const s = 0;
		const seg = HELIX.segOf[i];
		const amp = HAMP * mix(SEG_AMP[seg], 1, s);
		const d = amp * mix(SEG_SGN[seg], 1, s) * Math.sin(i * 0.66);
		const oy = mix(SEG_OY[seg], 0, s);
		return { s, seg, x: mix(HELIX.scrX[i], HX0 + i * HPITCH, s), ya: HCY + oy + d, yb: HCY + oy - d };
	});
	const INK: RGB = [200, 152, 88]; // printed in gold-bronze ink
	g.save();
	g.lineCap = 'butt';
	// strands
	for (let i = 0; i < HN; i++) {
		const p = cols[i];
		const q = i + 1 < HN ? cols[i + 1] : null;
		const on = smooth(0, 0.35, lit(i));
		g.strokeStyle = css(mixRGB(INK, GENESIS, on), mix(0.62, 0.95, on));
		g.lineWidth = 1.15;
		g.beginPath();
		if (q && ((q.seg === p.seg && !HELIX.strandMiss[i]) || (p.s > 0.85 && q.s > 0.85))) {
			g.moveTo(p.x, p.ya);
			g.lineTo(q.x, q.ya);
			g.moveTo(p.x, p.yb);
			g.lineTo(q.x, q.yb);
		} else {
			g.moveTo(p.x - 0.5, p.ya);
			g.lineTo(p.x + 0.7, p.ya);
			g.moveTo(p.x - 0.5, p.yb);
			g.lineTo(p.x + 0.7, p.yb);
		}
		g.stroke();
	}
	// rungs, partial and some missing while scrambled
	for (let i = 0; i < HN; i++) {
		const p = cols[i];
		if (HELIX.rungMiss[i] && p.s < 0.5) continue;
		const on = smooth(0, 0.35, lit(i));
		const len = mix(HELIX.rungLen[i], 1, p.s);
		const my = (p.ya + p.yb) / 2;
		g.strokeStyle = css(mixRGB(INK, GENESIS, on), mix(0.55, 0.95, on));
		g.lineWidth = 0.95;
		g.beginPath();
		g.moveTo(p.x, my + (p.ya - my) * len);
		g.lineTo(p.x, my + (p.yb - my) * len);
		g.stroke();
	}
	// fragments printed where nothing belongs, which go as the read passes
	{
		g.fillStyle = css(INK, 0.4);
		for (const s of HELIX.strays) g.fillRect(s.x, s.y, s.l, 0.55);
	}
	// the light: a wide soft stroke over each lit column, brightest as it is read
	g.globalCompositeOperation = 'lighter';
	g.lineWidth = 2.6;
	for (let i = 0; i < HN; i++) {
		const p = cols[i];
		const on = smooth(0.05, 0.4, lit(i));
		if (on < 0.01) continue;
		const flare = 1 - smooth(0.4, 1, lit(i));
		g.strokeStyle = css(mixRGB(GENESIS, [235, 255, 225], flare * 0.35), (0.14 + 0.32 * flare) * on * glowK);
		g.beginPath();
		g.moveTo(p.x, p.ya);
		g.lineTo(p.x, p.yb);
		g.stroke();
	}
	g.restore();
}

// ---- 06's world: a dark, hazed world with a dormant Generator on it. The machine is the Generators figure's own
// (generatorMachine.ts), unlit: its vat dark and empty, its sensor ring and pad lights out, its readout flat,
// lit only by the crimson haze with a cool rim from the sky. The one new part is a socket below the vat for the
// token. The place (sky, a dim red sun through the haze, two ridges, the ground) is built once into `sceneBg`;
// the haze, the machine, the token and the life it brings are drawn over it each frame.

let GY = 410; // where the machine's feet stand, in stage units (a little lower in compact, where the machine is larger)
const HORIZON = 178; // the far edge of the plain, about the height of the machine's roof (a view from above)
let sceneBg: HTMLCanvasElement | null = null;
let dustCv: HTMLCanvasElement | null = null;
/** The lobes the warm ground's irregular edge is made of: centers and reaches as fractions of the front's radius. */
const DUST_LOBES = [{ x: 0, y: 0.05, k: 1 }, { x: -0.3, y: 0.02, k: 0.86 }, { x: 0.32, y: 0.04, k: 0.9 }, { x: -0.12, y: -0.1, k: 0.92 }, { x: 0.15, y: 0.12, k: 0.82 }, { x: -0.42, y: 0.1, k: 0.62 }, { x: 0.46, y: 0.06, k: 0.64 }];
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
		g.fillRect(Math.floor(r() * W), Math.floor(r() * (HORIZON - 20)), 1, 1);
	}
	// a red sun low on the horizon: a soft bloom, its disc veiled and its lower part lost in the horizon haze
	const sunX = 735;
	const sunY = HORIZON - 26;
	{
		const sb = g.createRadialGradient(sunX, sunY, 0, sunX, sunY, 96);
		sb.addColorStop(0, css([255, 140, 96], 0.7));
		sb.addColorStop(0.18, css([232, 100, 72], 0.5));
		sb.addColorStop(0.5, css([176, 56, 56], 0.16));
		sb.addColorStop(1, css([150, 40, 50], 0));
		g.fillStyle = sb;
		g.fillRect(sunX - 100, sunY - 100, 200, 200);
		const sd = g.createRadialGradient(sunX, sunY, 0, sunX, sunY, 22);
		sd.addColorStop(0, css([246, 120, 84], 0.62));
		sd.addColorStop(0.75, css([226, 96, 70], 0.5));
		sd.addColorStop(1, css([226, 96, 70], 0));
		g.fillStyle = sd;
		g.beginPath();
		g.arc(sunX, sunY, 22, 0, TAU);
		g.fill();
		const veil = g.createLinearGradient(0, sunY - 14, 0, sunY + 26);
		veil.addColorStop(0, css([96, 26, 40], 0));
		veil.addColorStop(1, css([70, 20, 34], 0.8));
		g.fillStyle = veil;
		g.fillRect(sunX - 110, sunY - 14, 220, 40);
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
	ridge(HORIZON - 18, 16, [50, 18, 32], 1);
	ridge(HORIZON - 2, 11, [30, 12, 23], 2);
	// a soft haze band lying between them
	const band = g.createLinearGradient(0, HORIZON - 70, 0, HORIZON + 22);
	band.addColorStop(0, css([150, 34, 48], 0));
	band.addColorStop(0.6, css([150, 34, 48], 0.05));
	band.addColorStop(0.88, css([150, 34, 48], 0.22));
	band.addColorStop(1, css([150, 34, 48], 0));
	g.fillStyle = band;
	g.fillRect(0, HORIZON - 70, W, 92);
	// the plain darkens toward the horizon
	const ground = g.createLinearGradient(0, HORIZON, 0, H);
	ground.addColorStop(0, css([24, 10, 18]));
	ground.addColorStop(0.45, css([44, 18, 28]));
	ground.addColorStop(1, css([50, 21, 31]));
	g.fillStyle = ground;
	g.fillRect(0, HORIZON, W, H - HORIZON);
	// the ground's own texture: scattered stones and low ruts, finer and fainter toward the horizon
	for (let k = 0; k < 900; k++) {
		const t = Math.pow(r(), 0.7);
		const y = HORIZON + 4 + t * (H - HORIZON - 4);
		const x = r() * W;
		const sz = 0.6 + t * 4.2 * r();
		g.fillStyle = css([8, 3, 6], 0.25 + 0.2 * r());
		g.beginPath();
		g.ellipse(x + sz * 0.5, y + sz * 0.3, sz * 1.1, sz * 0.5, 0, 0, TAU);
		g.fill();
		g.fillStyle = css([120, 60, 56], 0.1 + 0.12 * r());
		g.beginPath();
		g.ellipse(x, y, sz, sz * 0.55, 0, 0, TAU);
		g.fill();
	}
	for (let k = 0; k < 26; k++) {
		const t = r();
		const y = HORIZON + 14 + t * (H - HORIZON - 20);
		const x = r() * W;
		g.strokeStyle = css([10, 4, 8], 0.22);
		g.lineWidth = 0.6 + t * 2.4;
		g.beginPath();
		g.moveTo(x, y);
		g.lineTo(x + (40 + 160 * t) * (r() < 0.5 ? -1 : 1), y + (r() - 0.5) * 4);
		g.stroke();
	}
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
	return Array.from({ length: 78 }, (_, k) => {
		const sc = 0.5 + r() * 1.0; // scale, a half to one and a half times
		const far = k % 5 === 0; // some lie far off, near the horizon, behind the machine
		const y = far ? HORIZON + 6 + r() * 90 : 210 + Math.pow(r(), 0.8) * 330;
		return { x: -60 + r() * 1120, y, rx: (70 + r() * 150) * sc, ry: (18 + r() * 26) * (0.6 + sc * 0.5), a: (far ? 0.15 : 0.18) + r() * 0.27, ph: r() * TAU, sp: 2 + r() * 4, v: k % 2 };
	});
})();
// ember points on the face of the world the dive falls into: unit-disc positions (below the limb), reach and glow
const EMBERS = [{ u: -0.42, v: -0.5, r: 3, a: 0.85 }, { u: -0.12, v: -0.72, r: 2.4, a: 0.75 }, { u: 0.3, v: -0.55, r: 3.2, a: 0.9 }, { u: 0.55, v: -0.3, r: 2.2, a: 0.7 }, { u: -0.62, v: -0.2, r: 2.6, a: 0.75 }, { u: 0.05, v: -0.3, r: 2, a: 0.65 }];
// stones lying on the lit ground, in polar coordinates about the machine's foot (angle, reach 0..1, size in px), so the light can
// catch them and their shadows can fall away from the machine
const ROCKS = (() => {
	const r = rng(311);
	return Array.from({ length: 70 }, () => ({ a: r() * TAU, rho: 0.12 + 0.88 * Math.sqrt(r()), sz: 1.4 + r() * r() * 7, e: 0.4 + r() * 0.3, v: Array.from({ length: 7 }, (_, i) => [(i / 7) * TAU + (r() - 0.5) * 0.6, 0.7 + r() * 0.5] as [number, number]) }));
})();
// wisps that drift across the front of the machine
const WISPS = (() => {
	const r = rng(91);
	return Array.from({ length: 8 }, (_, k) => ({ x: (k / 7 - 0.5) * 460 + (r() - 0.5) * 40, y: 318 + r() * 86, rx: 90 + r() * 70, ry: 22 + r() * 16, a: 0.16 + r() * 0.08, ph: r() * TAU, sp: 0.8 + r() * 1.2, v: k % 2 }));
})();
// wisps behind the machine, slower, at a different depth
const WISPS_BACK = (() => {
	const r = rng(191);
	return Array.from({ length: 6 }, (_, k) => ({ x: (k / 5 - 0.5) * 520 + (r() - 0.5) * 60, y: HORIZON + 24 + r() * 100, rx: 110 + r() * 80, ry: 24 + r() * 18, a: 0.3 + r() * 0.08, ph: r() * TAU, sp: 0.4 + r() * 0.5, v: (k + 1) % 2 }));
})();
type PutFn = (s: HTMLCanvasElement | null, x: number, y: number, r: number, a: number) => void;

/** The world the dormant machine stands in: the crimson haze's ambient, no painting behind it. */
function dormantWorld() {
	if (pics[4]) return;
	const o = offscreen(2, 2);
	if (o) pics[4] = { c: o.c, light: [190, 54, 66], side: 0.55, amb: [124, 50, 62], sky: [60, 20, 30] };
}

// ---- a tileable value-noise field (fBm, wrapped), shared by the planet's surface and the cloud the camera falls through
const NZ = 256;
let noiseF: Float32Array | null = null;
function noiseField() {
	if (noiseF) return noiseF;
	const r = rng(4242);
	const out = new Float32Array(NZ * NZ);
	for (const [cells, amp] of [[4, 1], [8, 0.55], [16, 0.3], [32, 0.16]] as const) {
		const lat = Float32Array.from({ length: cells * cells }, () => r());
		for (let y = 0; y < NZ; y++) {
			const fy = (y / NZ) * cells;
			const y0 = Math.floor(fy);
			const ty = fy - y0;
			const sy2 = ty * ty * (3 - 2 * ty);
			for (let x = 0; x < NZ; x++) {
				const fx = (x / NZ) * cells;
				const x0 = Math.floor(fx);
				const tx = fx - x0;
				const sx2 = tx * tx * (3 - 2 * tx);
				const a = lat[(y0 % cells) * cells + (x0 % cells)];
				const b = lat[(y0 % cells) * cells + ((x0 + 1) % cells)];
				const c = lat[((y0 + 1) % cells) * cells + (x0 % cells)];
				const d = lat[((y0 + 1) % cells) * cells + ((x0 + 1) % cells)];
				out[y * NZ + x] += amp * mix(mix(a, b, sx2), mix(c, d, sx2), sy2);
			}
		}
	}
	let lo = 9;
	let hi = -9;
	for (const v of out) {
		lo = Math.min(lo, v);
		hi = Math.max(hi, v);
	}
	for (let i = 0; i < out.length; i++) out[i] = (out[i] - lo) / (hi - lo);
	noiseF = out;
	return out;
}
/** The noise at (u, v) in tile units (wrapping), 0 to 1, bilinear. */
function nzAt(f: Float32Array, u: number, v: number) {
	const x = ((u % NZ) + NZ) % NZ;
	const y = ((v % NZ) + NZ) % NZ;
	const x0 = Math.floor(x);
	const y0 = Math.floor(y);
	const tx = x - x0;
	const ty = y - y0;
	const x1 = (x0 + 1) % NZ;
	const y1 = (y0 + 1) % NZ;
	return mix(mix(f[y0 * NZ + x0], f[y0 * NZ + x1], tx), mix(f[y1 * NZ + x0], f[y1 * NZ + x1], tx), ty);
}

// the planet's surface: continents and bands in three tones (rust, dark basalt, dusty ochre), mottled, with craters and ridges; the
// lit side shows it and the night side is darkened over it
let surfTex: HTMLCanvasElement | null = null;
/** The texel near the surface's middle where the landing's camera comes down: the busiest patch of continent edge and crater. */
let surfAnchor: [number, number] = [256, 256];
function surface() {
	if (surfTex) return surfTex;
	const c = canvasOf(512, 512);
	const g = c?.getContext('2d');
	if (!c || !g) return null;
	const f = noiseField();
	const img = g.createImageData(512, 512);
	const BAS: RGB = [34, 22, 26];
	const RUST: RGB = [156, 68, 38];
	const OCH: RGB = [200, 150, 90];
	for (let y = 0; y < 512; y++)
		for (let x = 0; x < 512; x++) {
			const n1 = nzAt(f, x * 0.32, y * 0.32);
			const n2 = nzAt(f, x * 0.9 + 90, y * 0.9 + 40);
			const n3 = nzAt(f, x * 2.6 + 11, y * 2.6 + 70);
			// continents, stretched into bands that wander
			const land = n1 + 0.18 * Math.sin(y * 0.045 + n2 * 4.2) + 0.1 * (n2 - 0.5);
			let col: RGB = mixRGB(BAS, RUST, smooth(0.34, 0.5, land));
			col = mixRGB(col, OCH, smooth(0.6, 0.76, land));
			const v = 0.78 + 0.44 * n3 + 0.16 * (n2 - 0.5);
			const k = (y * 512 + x) * 4;
			img.data[k] = col[0] * v;
			img.data[k + 1] = col[1] * v;
			img.data[k + 2] = col[2] * v;
			img.data[k + 3] = 255;
		}
	g.putImageData(img, 0, 0);
	const r = rng(515);
	// ridges: long dark creases with a pale lip
	for (let k = 0; k < 14; k++) {
		let x = r() * 512;
		let y = r() * 512;
		let a = r() * TAU;
		g.beginPath();
		g.moveTo(x, y);
		for (let j = 0; j < 12; j++) {
			a += (r() - 0.5) * 0.7;
			x += Math.cos(a) * 12;
			y += Math.sin(a) * 12;
			g.lineTo(x, y);
		}
		g.strokeStyle = css([20, 10, 12], 0.4);
		g.lineWidth = 2.4;
		g.stroke();
		g.strokeStyle = css([226, 170, 120], 0.12);
		g.lineWidth = 1;
		g.stroke();
	}
	// craters: a soft shaded bowl, no outline: a shadow on the inner wall toward the light, a pale lit wall on the other side
	for (let k = 0; k < 46; k++) {
		const cx = r() * 512;
		const cy = r() * 512;
		const cr = 4 + r() * r() * 22;
		const bowl = g.createRadialGradient(cx + cr * 0.15, cy + cr * 0.15, 0, cx, cy, cr * 1.05);
		bowl.addColorStop(0, css([16, 8, 10], 0.34));
		bowl.addColorStop(0.7, css([16, 8, 10], 0.22));
		bowl.addColorStop(1, css([16, 8, 10], 0));
		g.fillStyle = bowl;
		g.beginPath();
		g.arc(cx, cy, cr * 1.05, 0, TAU);
		g.fill();
		// the inner wall facing the light is in shadow; the far wall catches it
		const lit = g.createRadialGradient(cx + cr * 0.55, cy + cr * 0.55, cr * 0.1, cx + cr * 0.55, cy + cr * 0.55, cr * 0.8);
		lit.addColorStop(0, css([236, 182, 130], 0.3));
		lit.addColorStop(1, css([236, 182, 130], 0));
		g.fillStyle = lit;
		g.beginPath();
		g.arc(cx, cy, cr, 0, TAU);
		g.fill();
		const sh = g.createRadialGradient(cx - cr * 0.55, cy - cr * 0.55, cr * 0.1, cx - cr * 0.55, cy - cr * 0.55, cr * 0.8);
		sh.addColorStop(0, css([8, 4, 6], 0.38));
		sh.addColorStop(1, css([8, 4, 6], 0));
		g.fillStyle = sh;
		g.beginPath();
		g.arc(cx, cy, cr, 0, TAU);
		g.fill();
	}
	{
		const px = g.getImageData(0, 0, 512, 512).data;
		const lum = (x: number, y: number) => px[(y * 512 + x) * 4] * 0.5 + px[(y * 512 + x) * 4 + 1] * 0.3 + px[(y * 512 + x) * 4 + 2] * 0.2;
		let best = -1;
		for (let v = 200; v <= 312; v += 8)
			for (let u = 200; u <= 312; u += 8) {
				let sum = 0;
				let sq = 0;
				let nn = 0;
				for (let y = v - 26; y < v + 26; y += 3)
					for (let x = u - 46; x < u + 46; x += 3) {
						const l = lum(x, y);
						sum += l;
						sq += l * l;
						nn++;
					}
				const sd = Math.sqrt(Math.max(0, sq / nn - (sum / nn) * (sum / nn)));
				if (sd > best) {
					best = sd;
					surfAnchor = [u, v];
				}
			}
	}
	surfTex = c;
	return c;
}

/**
 * The dark world as a lit sphere seen from space (and, as it grows past the frame, its limb): rust and copper surface lit from
 * the side toward Valleron's light and falling away through a wide soft terminator into a deep crimson-brown night side with
 * ember lights; a thin crimson atmosphere hugging the whole limb, brightest on the lit side.
 */
function drawPlanet(ctx: Ctx, cx: number, cy: number, R: number, L: readonly [number, number], a: number, o?: { sc: number; ax: number; ay: number; night: number; detail: number; foot: number; shift: number; fy: number; rim: number }) {
	if (a < 0.004 || R < 1.5) return;
	const Re = Math.min(R, 340);
	// the frame of the visible cap: a planet of radius Re whose top is the limb
	const ex = cx;
	const ey = R > Re ? cy - R + Re : cy;
	ctx.save();
	// the atmosphere's halo, hugging the limb
	const th = Math.min(R * 0.09, 44) + 3;
	ctx.globalCompositeOperation = 'lighter';
	const hg = ctx.createRadialGradient(cx, cy, R * 0.985, cx, cy, R + th);
	hg.addColorStop(0, css([214, 54, 68], 0.5));
	hg.addColorStop(0.3, css([180, 42, 58], 0.2));
	hg.addColorStop(1, css([180, 42, 58], 0));
	const rk = o ? o.rim : 1;
	ctx.globalAlpha = a * rk;
	ctx.fillStyle = hg;
	ctx.fillRect(cx - R - th, cy - R - th, (R + th) * 2, (R + th) * 2);
	ctx.globalAlpha = a;
	ctx.globalCompositeOperation = 'source-over';
	// the body
	ctx.save();
	ctx.beginPath();
	ctx.arc(cx, cy, R, 0, TAU);
	ctx.clip();
	ctx.fillStyle = css([44, 16, 24]);
	ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
	const tex = R > 12 ? surface() : null;
	if (tex && o) {
		// the camera closing in: the surface keeps scaling about one fixed point of the frame, so the same continents and
		// craters only grow; a second, finer copy lays mottle over it as the magnification climbs
		const S = o.sc * 512;
		const tu = mix(256, surfAnchor[0], o.shift);
		const tv = mix(256, surfAnchor[1], o.shift);
		let bx = o.ax - tu * o.sc;
		let by = o.ay - tv * o.sc;
		// the sheet always covers the frame below the limb
		if (S > W + 40) {
			bx = Math.min(0, Math.max(W - S, bx));
			by = Math.min(cy - R + 2, Math.max(H - S, by));
		}
		ctx.drawImage(tex, bx, by, S, S);
		if (o.detail > 0.01) {
			// a second, coarser-grained copy shifted off the first, one draw (no tile seams), laid over it as mottle
			const S2 = Math.max(S * 0.45, 1250);
			ctx.save();
			ctx.globalCompositeOperation = 'soft-light';
			ctx.globalAlpha = o.detail;
			ctx.drawImage(tex, Math.min(0, Math.max(W - S2, bx + S * 0.5 - S2 * 0.62)), Math.min(cy - R + 2, Math.max(H - S2, by + S * 0.5 - S2 * 0.4)), S2, S2);
			ctx.restore();
		}
	} else if (tex) {
		const S = Math.min(2 * R, 1500);
		const ty0 = R > 780 ? cy - R + S * 0.42 : cy;
		ctx.drawImage(tex, cx - S / 2, ty0 - S / 2, S, S);
	}
	const nk = o ? o.night : 1;
	// the light: the surface falls away from the lit limb through a wide soft terminator into the night
	const p0 = [ex + L[0] * Re, ey + L[1] * Re] as const;
	const p1 = [ex - L[0] * Re * 0.5, ey - L[1] * Re * 0.5] as const;
	const dg = ctx.createLinearGradient(p0[0], p0[1], p1[0], p1[1]);
	dg.addColorStop(0, css([34, 10, 18], 0));
	dg.addColorStop(0.2, css([34, 10, 18], 0.18 * nk));
	dg.addColorStop(0.45, css([34, 10, 18], 0.72 * nk));
	dg.addColorStop(0.7, css([30, 8, 16], 0.94 * nk));
	dg.addColorStop(1, css([26, 7, 14], 0.97 * nk));
	ctx.fillStyle = dg;
	ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
	// while the disc is still wider than the figure's oval, its lower edge goes down into the night side, so the oval never cuts
	// the lit surface off in a straight line
	if (o && o.foot > 0.01) {
		const fg = ctx.createLinearGradient(0, o.fy, 0, o.fy + 140);
		fg.addColorStop(0, css([26, 7, 14], 0));
		fg.addColorStop(0.3, css([26, 7, 14], 0.1 * o.foot));
		fg.addColorStop(0.65, css([26, 7, 14], 0.45 * o.foot));
		fg.addColorStop(1, css([26, 7, 14], 0.92 * o.foot));
		ctx.fillStyle = fg;
		ctx.fillRect(0, o.fy, W, H - o.fy);
	}
	// a crimson atmosphere haze lying over the night side
	const hg2 = ctx.createLinearGradient(p0[0], p0[1], p1[0], p1[1]);
	hg2.addColorStop(0, css([170, 40, 56], 0));
	hg2.addColorStop(0.5, css([170, 40, 56], 0.04));
	hg2.addColorStop(0.8, css([170, 40, 56], 0.2));
	hg2.addColorStop(1, css([170, 40, 56], 0.3));
	ctx.fillStyle = hg2;
	ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
	// a warm bloom of the light on the lit side
	ctx.globalCompositeOperation = 'lighter';
	const bg = ctx.createRadialGradient(p0[0], p0[1], 0, p0[0], p0[1], Re * 1.15);
	bg.addColorStop(0, css([236, 138, 92], 0.34));
	bg.addColorStop(0.5, css([200, 80, 66], 0.12));
	bg.addColorStop(1, css([200, 80, 66], 0));
	ctx.fillStyle = bg;
	ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
	ctx.globalCompositeOperation = 'source-over';
	// a thin atmosphere inside the limb all round
	const wd = Math.min(R * 0.12, 60);
	const ag = ctx.createRadialGradient(cx, cy, R - wd, cx, cy, R);
	ag.addColorStop(0, css([200, 50, 66], 0));
	ag.addColorStop(1, css([200, 50, 66], 0.4 * (0.25 + 0.75 * rk)));
	ctx.fillStyle = ag;
	ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
	ctx.restore();
	// the rim: crimson all round, hot on the lit side (stacked arcs thinning to nothing)
	const al = Math.atan2(L[1], L[0]);
	ctx.save();
	ctx.globalAlpha = rk;
	ctx.lineWidth = Math.max(1, R * 0.008);
	ctx.strokeStyle = css([210, 56, 70], 0.4);
	ctx.beginPath();
	ctx.arc(cx, cy, R, 0, TAU);
	ctx.stroke();
	ctx.globalCompositeOperation = 'lighter';
	for (const [span, al2, wk] of [[1.5, 0.08, 1], [1.1, 0.12, 1], [0.75, 0.16, 1], [0.45, 0.2, 1], [0.2, 0.24, 1]] as const) {
		ctx.strokeStyle = css([255, 150, 112], al2);
		ctx.lineWidth = Math.max(1.4, R * 0.012) * wk;
		ctx.beginPath();
		ctx.arc(cx, cy, R, al - span, al + span);
		ctx.stroke();
	}
	ctx.globalCompositeOperation = 'source-over';
	ctx.restore();
	// ember lights on the night side
	if (R > 24) {
		ctx.globalCompositeOperation = 'lighter';
		const es = spr(EMBER);
		if (es)
			for (const em of EMBERS) {
				if (em.u * L[0] + em.v * L[1] > 0.1) continue;
				const x = cx + em.u * Re * 1.2;
				const limb = cy - Math.sqrt(Math.max(0, R * R - (x - cx) * (x - cx)));
				const y = limb + Math.min(1, -em.v + 0.1) * Re * 0.8;
				ctx.globalAlpha = a * em.a * smooth(24, 80, R);
				const rr = em.r * 3 * Math.min(2.2, 0.6 + R / 200);
				ctx.drawImage(es, x - rr, y - rr, rr * 2, rr * 2);
			}
	}
	ctx.restore();
}

// ---- the low cloud the camera falls through, and the line that parts it: two low-resolution fields drawn over the whole stage.
// `cloud` is the haze (rgba, billows lit on top and dark below, drifting) and `mask` is 1 above the descending front: where the
// planet's surface is already the plain. The cloud is dense under the front and thin over the revealed plain, so the plain is
// uncovered from the horizon down and the surface is never seen through it.
let cloudCv: HTMLCanvasElement | null = null;
let cloudImg: ImageData | null = null;
let maskCv: HTMLCanvasElement | null = null;
let maskImg: ImageData | null = null;
let layCv: HTMLCanvasElement | null = null;
const CLW = 320;
const CLH = 180;
type LandPar = { top: number; front: number; dens: number; thin: number };
function landFields(sec: number, P: LandPar) {
	const f = noiseField();
	if (!cloudCv) {
		cloudCv = canvasOf(CLW, CLH);
		const g0 = cloudCv?.getContext('2d');
		if (cloudCv && g0) cloudImg = g0.createImageData(CLW, CLH);
		maskCv = canvasOf(CLW, CLH);
		const g1 = maskCv?.getContext('2d');
		if (maskCv && g1) maskImg = g1.createImageData(CLW, CLH);
	}
	const gc = cloudCv?.getContext('2d');
	const gm = maskCv?.getContext('2d');
	if (!cloudCv || !maskCv || !gc || !gm || !cloudImg || !maskImg) return null;
	const d = cloudImg.data;
	const dm = maskImg.data;
	const dx = sec * 4.5;
	const dy = sec * 1.9;
	for (let y = 0; y < CLH; y++) {
		const fy = y / CLH;
		const sy = fy * H;
		for (let x = 0; x < CLW; x++) {
			const n = nzAt(f, x * 0.675 + dx, y * 0.675 + dy);
			const n2 = nzAt(f, x * 1.575 - dx * 1.7 + 70, y * 1.575 + dy * 0.6 + 30);
			const k = (y * CLW + x) * 4;
			const wob = (n - 0.5) * 90 + (n2 - 0.5) * 30;
			// 1 above the front (revealed), 0 under it; the front's edge is broken by the noise
			const M = P.front < -50 ? 0 : 1 - smooth(P.front - 50, P.front + 50, sy + wob);
			// the bank's top: the cloud lies in the lower part and builds up from the horizon
			const bank = smooth(P.top - 12 + wob * 0.6, P.top + 74 + wob * 0.6, sy);
			const dense = (1 - M) * 0.64;
			const thin = M * P.thin * (0.35 + 0.65 * n2);
			const al = clamp(P.dens * bank * (dense + thin));
			// billows lit from above: bright tops against a dark underside, more contrast than a flat fog
			const lit = clamp(0.06 + 0.78 * n2 + 0.34 * n - 0.32 * fy + 0.3 * (1 - bank) + 0.12 * Math.sin(x * 0.14 + n * 6));
			const col = mixRGB(mixRGB([44, 8, 20], [158, 40, 58], clamp(lit * 1.5)), [232, 104, 92], Math.max(0, lit - 0.62) * 1.6);
			d[k] = col[0];
			d[k + 1] = col[1];
			d[k + 2] = col[2];
			d[k + 3] = al * 255;
			dm[k] = dm[k + 1] = dm[k + 2] = 0;
			dm[k + 3] = M * 255;
		}
	}
	gc.putImageData(cloudImg, 0, 0);
	gm.putImageData(maskImg, 0, 0);
	return { cloud: cloudCv, mask: maskCv };
}

export function createOutbreak(): Figure {
	let stage = 0;
	let present = false;
	/** While the figure is drawn into its fade layer: the real visibility (the layer is laid at it; inside, everything is at 1). */
	let inLayer = false;
	let visReal = 1;
	let figLayer: HTMLCanvasElement | null = null;
	let vis = 0;
	/** How much of the field (all but the one bright world) is drawn: it leaves fast when the figure pulls back. */
	let field = 1;
	/** 05's clock: the haze's, and it keeps running so the galaxy goes on living. */
	let t0 = 0;
	/** 06's clock, from the moment it is entered; it winds back when Back runs 06 in reverse. */
	let t1 = 0;
	const haze: HazeState = { cv: null, cv2: null, key: -1 };
	const zoomAt = () => smooth(0, 1.1, t1);
	// the anchor is the galaxy's heart, and at 06 the figure's own center (it pulls into a neutral point there)
	const anchor = () => {
		const k = smooth(0.8, 1.6, t1);
		return { x: CX, y: mix(CY, 262, k) };
	};

	// per-frame scratch
	const sx = new Float32Array(WORLDS.length);
	const sy = new Float32Array(WORLDS.length);

	const self: Figure = {
		stages: 2,
		// 06 stands on ground: the oval holds its lower half longer so the ground recedes rather than ends
		groundHold: 0.72,
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
		draw(ctx, sec, opts) {
			if (vis <= 0.005) return;
			// fading in or out: everything (the vat, the seeds, every added glow, the card's light) is drawn at full visibility into a
			// layer, and the layer is laid at the visibility, so all of it goes on one curve and nothing is left brighter than the rest
			if (vis < 0.995 && !inLayer) {
				const LS = 1.5;
				if (!figLayer) figLayer = canvasOf(Math.round(W * LS), Math.round(H * LS));
				const lg = figLayer?.getContext('2d');
				if (figLayer && lg) {
					lg.setTransform(LS, 0, 0, LS, 0, 0);
					lg.globalAlpha = 1;
					lg.globalCompositeOperation = 'source-over';
					lg.clearRect(0, 0, W, H);
					const v0 = vis;
					visReal = v0;
					inLayer = true;
					vis = 1;
					self.draw(lg, sec, opts);
					vis = v0;
					inLayer = false;
					ctx.save();
					// a steeper curve than the plain visibility, so even the brightest point goes with the rest and nothing is left to read as a dot
					ctx.globalAlpha = clamp(v0 * v0);
					ctx.globalCompositeOperation = 'source-over';
					ctx.drawImage(figLayer, 0, 0, W, H);
					ctx.restore();
				}
				return;
			}
			const compact = !!opts?.compact;
			GY = compact ? 384 : 380;
			// 06's pieces are built one at a time while 05 plays, so none of them costs a frame when the dive needs it
			if (stage === 0 && t1 === 0) {
				if (t0 > 3 && !cardTex) card();
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
			const z = Math.exp(Math.log(52) * e);
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
			// the camera zooms about the dark world and pans it to the center in one line (a straight path on the screen)
			const pan = smooth(0, 1.0, t1);
			const ptx = mix(CX + tt[0], CX, pan);
			const pty = mix(CY + tt[1], CY, pan);
			const m = { a: z * ex[0], b: z * ex[1], c: z * ey[0], d: z * ey[1], ox: ptx - z * tt[0], oy: pty - z * tt[1] };
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
			// bloom out of (and pull back toward) the anchor: a short settle in scale under the fade, never down to a point
			const an = anchor();
			const bs = 0.86 + 0.14 * easeOut(inLayer ? visReal : vis);
			ctx.translate(an.x, an.y);
			ctx.scale(bs, bs);
			ctx.translate(-an.x, -an.y);
			ctx.globalAlpha = 1;
			// the galaxy dissolves as the world ahead grows into a limb and flattens to a horizon
			const galA = 1 - smooth(0.8, 1.12, t1);
			// the disk and haze textures are soft and would smear at this zoom: they go first, the worlds stream on
			const texA = 1 - smooth(0.4, 0.9, t1);
			// the place is built under the haze, opaque, and the haze draws back to show it
			const sceneA = smooth(1.12, 1.34, t1);
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
			// Valleron's point is the brightest thing in 05: while the figure fades it goes a little sooner still, so it is never the last point left
			const vK = inLayer ? visReal * visReal : 1;
			const putV = mk(ctx, vis * galA * vK);
			const putS0 = mk(ctx, 1);
			if (!hzN1) paintHaze(haze, t0); // builds the fields before the first frame uses them

			// ---- the galaxy: deep space, the disk, the haze and every world's light
			if (A > 0.004) {
				const gr = space();
				if (gr) {
					ctx.globalAlpha = A;
					ctx.drawImage(gr, 0, 0, W, H);
				}
				const key = Math.floor(t0 * (t0 < 6.5 ? 16 : 5)) * 4096;
				const hz = key === haze.key && haze.cv ? haze.cv : paintHaze(haze, t0);
				haze.key = key;
				if (hz && haze.cv2) {
					ctx.save();
					ctx.transform(m.a, m.b, m.c, m.d, m.ox, m.oy);
					ctx.imageSmoothingEnabled = true;
					ctx.globalAlpha = A * texA;
					ctx.drawImage(hz, -EXT, -EXT, EXT * 2, EXT * 2);
					ctx.globalCompositeOperation = 'lighter';
					ctx.globalAlpha = A * texA * 0.32;
					ctx.drawImage(haze.cv2, -EXT, -EXT, EXT * 2, EXT * 2);
					ctx.restore();
				}
				ctx.globalCompositeOperation = 'lighter';
				{
					const fa = smooth(0, 0.3, t1) * (1 - smooth(0.8, 1.12, t1));
					const st0 = spr([236, 196, 150]);
					const st1 = spr([210, 120, 110]);
					if (fa > 0.01 && st0 && st1)
						for (const f of FIELD) {
							const x = m.a * f.x + m.c * f.y + m.ox;
							const y = m.b * f.x + m.d * f.y + m.oy;
							if (x < -8 || x > W + 8 || y < -8 || y > H + 8) continue;
							const rad = (1.2 + f.b * 1.3) * (compact ? 1.4 : 1);
							ctx.globalAlpha = clamp(fa * f.b * 0.4 * A);
							ctx.drawImage(f.c ? st1 : st0, x - rad * 2, y - rad * 2, rad * 4, rad * 4);
						}
				}
				for (let i = 1; i < WORLDS.length; i++) {
					const w = WORLDS[i];
					if (compact && w.minor) continue;
					const age = t0 - w.it;
					let col: RGB = w.hue;
					let b = 0.7 + 0.15 * Math.sin(sec * w.twRate + w.tw);
					let flare = 0;
					let dim = 0;
					// struck: a hard crimson pop with a shock ring, then snuffed to a faint ember within about 0.4 s
					if (age > 0) {
						// round the bright core the flares are held lower, so a crowd of them cannot add up to white
						flare = smooth(0, 0.07, age) * (1 - smooth(0.1, 0.42, age)) * (1 - (compact ? 0.9 : 0.8) * Math.exp(-(w.x * w.x + w.y * w.y) / 0.1)) * (1 - 0.55 * Math.exp(-((w.x - VALLERON.x) ** 2 + (w.y - VALLERON.y) ** 2) / 0.06));
						dim = smooth(0.1, 0.5, age);
						col = mixRGB(mixRGB(w.hue, CRIMSON, smooth(0, 0.08, age)), EMBER, dim);
						b = mix(b, 0.22, dim) + 0.55 * flare;
						if (age < 0.4) {
							const rt = ramp(0, 0.3, age);
							if (i % 2 === 0 && rt < 1) {
								ctx.globalAlpha = clamp(0.5 * (1 - rt) * A);
								ctx.strokeStyle = css(mixRGB([255, 150, 90], CRIMSON, rt));
								ctx.lineWidth = 0.8;
								ctx.beginPath();
								ctx.arc(sx[i], sy[i], (2 + 8 * easeOut(rt)) * zs, 0, TAU);
								ctx.stroke();
							}
							put(spr([255, 112, 92]), sx[i], sy[i], (8 + 15 * flare) * zs * (compact ? 0.7 : 0.85), 0.4 * flare * (compact ? 0.8 : 0.9));
						}
					}
					const size = w.size * (1 + 1.3 * flare);
					put(spr(col), sx[i], sy[i], mix(8 + size * 5.6, 3.2, dim) * zs, Math.min(0.55, 0.5 * b) * (compact ? 0.45 : 1) * (1 - 0.4 * Math.exp(-(w.x * w.x + w.y * w.y) / 0.12)));
					put(spr(mixRGB(mixRGB(col, WHITE, 0.3 * (1 - dim) * (1 - flare)), [255, 126, 100], Math.min(1, flare * 1.6))), sx[i], sy[i], mix(1.9 + size * 1.3, 1.1, dim) * zs, Math.min(0.85, 0.95 * b) * (compact ? 0.5 : 1) * (1 - 0.4 * Math.exp(-(w.x * w.x + w.y * w.y) / 0.12)));
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
						put(spr([255, 232, 196]), mix(sx[i], vx, k) + bend, mix(sy[i], vy, k) - bend * 0.6, 1.6 * zs, Math.sin(u * Math.PI) * (compact ? 0.6 : 0.8));
					}
				}
				// Valleron: a small bright world in a warm corona with a ring of motes gathering round it (its look in 05)
				const gather = smooth(1.4, 5.2, t0);
				const vb = 1 + 1.5 * gather + 0.1 * Math.sin(sec * 0.8);
				putV(spr([255, 206, 142]), vx, vy, (38 + 38 * gather) * zsV * (compact ? 0.85 : 1) * (1 + 0.04 * Math.sin(sec * 1.3)), 0.3 + 0.38 * gather);
				putV(spr([255, 226, 178]), vx, vy, (11 + 8 * gather) * zsV * (compact ? 0.85 : 1), Math.min(compact ? 0.7 : 0.88, 0.55 * vb));
				putV(spr(WHITE), vx, vy, (3.2 + 1.4 * gather) * zsV * (compact ? 0.8 : 1), 0.95);
				const ringIn = smooth(1.4, 4.2, t0);
				for (let k = 0; k < 12; k++) {
					const a2 = (k / 12) * TAU + sec * 0.22;
					const rx = Math.cos(a2) * (17 + 7 * gather) * zsV;
					const ry = Math.sin(a2) * (17 + 7 * gather) * zsV * 0.6;
					putV(spr([255, 226, 176]), vx + rx * cr - ry * sr, vy + rx * sr + ry * cr, 1.7 * zsV, ringIn * (0.5 + 0.4 * Math.sin(sec * 1.6 + k * 1.9)));
				}
				ctx.globalCompositeOperation = 'source-over';
			}

			// ---- the dive, in two motions. ZOOM (0 to 1.1 s): one eased zoom to the dark world, which carries a faint crimson glow
			// from the first frame; its point grows into a lit sphere that fills most of the oval. LAND (1.0 to 1.6 s): the camera
			// keeps moving forward, the sphere's red surface is the haze over the plain, and it clears from the center outward
			// (a soft, noise-edged hole) over the finished place, which settles from a slight 1.06 scale to 1.0.
			// the camera keeps closing in: the sphere grows past the frame while its top limb settles onto the horizon line, so the
			// curve flattens into the horizon (one image: surface below, sky above). The surface keeps scaling about the frame's center.
			const kk = smooth(1.03, 1.38, t1);
			const Rp0 = 3.2 * z * (compact ? 0.7 : 1);
			const Rp = Rp0 * Math.pow(2800 / Math.max(Rp0, 1), kk);
			const limbTop = mix(pty - Rp0, HORIZON, kk);
			const pcy = limbTop + Rp;
			// the low cloud: it builds over the surface from the limb up to just above the horizon, then its front descends and the
			// plain stands revealed above it, from the horizon down
			const cTop = mix(limbTop, 98, smooth(1.12, 1.3, t1));
			const front = t1 < 1.25 ? -100 : mix(98, 720, Math.pow(smooth(1.25, 1.72, t1), 0.7));
			const dens = smooth(1.14, 1.32, t1);
			const thinC = 0.3 * (1 - smooth(1.5, 1.8, t1));
			// the scene (sky, horizon, plain) exists above the cloud's top and, once it descends, above its front
			const sceneY = t1 < 1.25 ? Math.max(limbTop, 0) : front + 55;
			const planetA = As * smooth(5, 16, Rp);
			if (As > 0.004 && t1 < 1.1 && sx[TARGET_I] > -50) {
				const zc = compact ? 1.4 : 1;
				ctx.globalCompositeOperation = 'lighter';
				putS0(spr([150, 28, 44]), sx[TARGET_I], sy[TARGET_I], 30 * zc, 0.42 * smooth(0, 0.12, t1) * As * (1 - smooth(5, 16, Rp)));
				ctx.globalCompositeOperation = 'source-over';
			}
			const drawLandPlanet = () => {
				if (planetA < 0.004 || t1 > 1.95) return;
				if (!layCv) layCv = canvasOf(W, H);
				const lg = layCv?.getContext('2d');
				if (!layCv || !lg) return;
				lg.setTransform(1, 0, 0, 1, 0, 0);
				lg.globalCompositeOperation = 'source-over';
				lg.globalAlpha = 1;
				lg.clearRect(0, 0, W, H);
				const lx0 = vd[0];
				const ly0 = Math.min(vd[1], -0.3 * Math.abs(vd[0]) - 30);
				const ll = Math.hypot(lx0, ly0) || 1;
				const fields = kk > 0.01 ? landFields(sec, { top: cTop, front, dens, thin: thinC }) : null;
				const surfO = t1 >= 1.0 ? { sc: (2 * Rp) / 512, ax: ptx, ay: pty, night: 1 - 0.85 * smooth(0.2, 0.8, kk), detail: 0.8 * smooth(0.1, 0.6, kk), shift: smooth(0.42, 0.9, kk), fy: compact ? 280 : 330, rim: 1 - smooth(1.14, 1.3, t1), foot: 0.7 * smooth(0.02, 0.18, kk) * (1 - smooth(0.45, 0.8, kk)) } : undefined;
				drawPlanet(lg, ptx, pcy, Rp, [lx0 / ll, ly0 / ll], 1, surfO);
				if (fields) {
					// where the surface has become the plain it is gone
					if (front > -50) {
						lg.globalCompositeOperation = 'destination-out';
						lg.imageSmoothingEnabled = true;
						lg.drawImage(fields.mask, 0, 0, W, H);
					}
					lg.globalCompositeOperation = 'source-over';
					lg.imageSmoothingEnabled = true;
					lg.drawImage(fields.cloud, 0, 0, W, H);
				}
				ctx.globalAlpha = planetA;
				ctx.drawImage(layCv, 0, 0);
				ctx.globalAlpha = 1;
			};

			// ---- 06: the dark world, the dormant Generator, the token, and the life it brings
			const bgS = sceneA > 0.01 ? scene() : null;
			if (bgS && As > 0.004) {
				const sA = As * sceneA;
				ctx.save();
				// the sky, horizon and plain exist only above the cloud's top, and then above its descending front
				if (t1 < 1.95) {
					ctx.beginPath();
					ctx.rect(0, 0, W, Math.max(sceneY, 0));
					ctx.clip();
				}
				const settle = 1 + 0.06 * (1 - smooth(1.1, 1.85, t1));
				ctx.translate(CX, 300);
				ctx.scale(settle, settle);
				ctx.translate(-CX, -300);
				const putS = mk(ctx, sA);
				ctx.globalAlpha = sA;
				ctx.drawImage(bgS, 0, 0, W, H);

				// the timeline of the machine's waking
				const rise = 1;
				const meetAt = 2.95; // the card begins to slide in, after a short hold
				const seatAt = 3.2; // it is home: the jolt, the flash
				const readAt = 3.2; // the machine reads it, column by column, to 3.75
				const slotOn = smooth(seatAt, seatAt + 0.3, t1);
				const link = ramp(3.35, 3.65, t1); // the line of light up the seam into the vat
				const fill = easeOut(ramp(3.55, 5.25, t1));
				const awake = smooth(3.7, 4.8, t1);
				// the light (dawn): from about 5.8 s, as the seeds finish, it spreads over the ground over about 1.5 s, easing out
				const domeOn = easeOut(ramp(5.8, 7.3, t1));
				const breathe = 1 + 0.02 * Math.sin(sec * 0.7) * smooth(7.3, 8.3, t1);
				const pulse = 0.94 + 0.06 * Math.sin(sec * 1.2);
				const s = compact ? 0.92 : 0.88;
				const ck = compact ? 1.3 : 1; // the card and its slot, larger on a phone
				const slotW = 78 * ck + 2; // the slot's mouth, in machine units
				const slotRead = smooth(readAt, readAt + 0.2, t1);
				const slotFlash = t1 < seatAt ? 0 : Math.exp(-(t1 - seatAt) / 0.16);
				const MH = 370 * s; // the machine's height on the stage
				const rx = 250;
				const ry = 1.2 * MH;
				// stage position of a point in the machine's own units
				const px = (x: number) => CX + (x - MX) * s;
				const py = (y: number) => GY + (y - GROUND) * s;
				const lightBoost = mixRGB([190, 54, 66], [236, 170, 120], domeOn);
				// the front on the ground: an edge with its radius varied about 10 percent, so it breaks
				const Rf = rx * domeOn * breathe;
				const frontY = py(GROUND + 34);
				const fry = Rf * 0.3 + 30;
				// the sky behind the machine lifts toward a dusky rose and amber as the new light spreads: less crimson, never violet
				if (domeOn > 0.01) {
					const vg2 = ctx.createRadialGradient(CX, 300, 20, CX, 300, 430);
					vg2.addColorStop(0, css([234, 164, 110], 0.3 * domeOn));
					vg2.addColorStop(0.5, css([204, 112, 98], 0.18 * domeOn));
					vg2.addColorStop(1, css([204, 112, 98], 0));
					ctx.globalAlpha = sA;
					ctx.fillStyle = vg2;
					ctx.fillRect(0, 0, W, HORIZON + 30);
				}
				// the cleared ground: warm dust (about #5a4636 near the pad), lit by the chip's pool. Its edge is several feathered
				// lobes of different reach (no straight or unbroken line), and its upper 35 percent thins into the distant red
				if (Rf > 2) {
					const dh = 300;
					const dy0 = Math.round(frontY - fry * 1.25);
					if (!dustCv) dustCv = canvasOf(W, dh);
					const dgx = dustCv?.getContext('2d');
					if (dustCv && dgx) {
						dgx.setTransform(1, 0, 0, 1, 0, 0);
						dgx.globalCompositeOperation = 'source-over';
						dgx.globalAlpha = 1;
						dgx.clearRect(0, 0, W, dh);
						for (const lb of DUST_LOBES) {
							dgx.save();
							dgx.translate(CX + lb.x * Rf, frontY - dy0 + lb.y * fry);
							dgx.scale(1, (fry * lb.k) / (Rf * lb.k));
							const rr3 = Rf * lb.k;
							const dg = dgx.createRadialGradient(0, 0, 0, 0, 0, rr3);
							dg.addColorStop(0, css([90, 70, 54], 0.4));
							dg.addColorStop(0.55, css([86, 66, 52], 0.32));
							dg.addColorStop(0.85, css([80, 60, 48], 0.13));
							dg.addColorStop(1, css([80, 60, 48], 0));
							dgx.fillStyle = dg;
							dgx.fillRect(-rr3, -rr3, rr3 * 2, rr3 * 2);
							dgx.restore();
						}
						// its upper 35 percent fades out into the far red
						dgx.globalCompositeOperation = 'destination-in';
						const top = frontY - fry - dy0;
						const vg4 = dgx.createLinearGradient(0, top, 0, top + fry * 2 * 0.35 + 1);
						vg4.addColorStop(0, 'rgba(0,0,0,0)');
						vg4.addColorStop(1, 'rgba(0,0,0,1)');
						dgx.fillStyle = vg4;
						dgx.fillRect(0, 0, W, dh);
						ctx.globalAlpha = clamp(sA * domeOn * 0.62);
						ctx.drawImage(dustCv, 0, dy0);
					}
				}

				const hp0 = hazePuff(0);
				const hp1 = hazePuff(1);
				const vatCy = py((VY0 + VY1) / 2);
				const drawHazes = (behind: boolean) => {
					for (const h of HAZES) {
						const hp = h.v ? hp1 : hp0;
						if (!hp) continue;
						const x = h.x + Math.sin(sec * 0.05 * h.sp + h.ph) * 14;
						const y = h.y + Math.sin(sec * 0.04 * h.sp + h.ph * 2) * 4;
						// anything lying above the machine's feet is behind it; the rest is in front
						if ((y < GY - 10) !== behind) continue;
						let a = h.a;
						if (!behind) {
							if (Math.abs(x - CX) < 230 && y > GY - 20 && y < GY + 130) a = Math.min(a, 0.3);
							if (Math.abs(x - CX) < 90 && y > GY + 40) a = Math.min(a, 0.18);
						}
						// round the vat's glass the haze thins and parts
						const dv = Math.hypot((x - CX) / (VR * s + 70), (y - vatCy) / (130 * s));
						a *= 1 - 0.8 * (1 - smooth(0.7, 1.4, dv)) * domeOn;
						if (a < 0.01) continue;
						ctx.globalAlpha = clamp(a * smooth(1.6, 2.4, t1) * sA);
						ctx.drawImage(hp, x - h.rx, y - h.ry, h.rx * 2, h.ry * 2);
					}
				};
				drawHazes(true);
				// wisps behind the machine, at their own pace
				{
					const bp0 = hazePuff(0);
					const bp1 = hazePuff(1);
					if (bp0 && bp1)
						for (const w of WISPS_BACK) {
							const x = CX + w.x - Math.sin(sec * 0.09 * w.sp + w.ph) * 60;
							const y = w.y + Math.sin(sec * 0.05 * w.sp + w.ph * 2) * 6;
							ctx.globalAlpha = clamp(w.a * smooth(1.6, 2.4, t1) * sA);
							ctx.drawImage(w.v ? bp1 : bp0, x - w.rx, y - w.ry, w.rx * 2, w.ry * 2);
						}
				}
				dormantWorld();
				ctx.save();
				// it rises out of the dark ground
				ctx.beginPath();
				ctx.rect(0, 0, W, t1 < 1.25 ? 0 : Math.min(GY + 130, front + 55));
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
						a: As * smooth(235, 290, front),
						emerge: 1,
						rimK: 0.1,
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
						lit: fill * pulse * (1 + 0.3 * smooth(5.6, 6.8, t1)),
						dormant: 1 - awake,
						vatFill: fill,
						seedBorn: ramp(4.5, 6.0, t1),
						foot: false,
						shelf: false,
						vatLight: 1,
						seedScale: compact ? 0.78 : 0.7,
						ringHalo: true,
						seedVary: true,
						rim2: [120, 150, 196],
						lamps: ramp(3.6, 4.6, t1),
						ringSpin: smooth(3.8, 4.4, t1),
						patchDent: true,
						slot: { w: slotW, glow: clamp(0.03 + 0.62 * slotRead + slotFlash), col: mixRGB([150, 142, 134], GENESIS, slotRead) },
					});
					// the conduit: a thin cable inside the housing, a dark casing with a lit core, from the slot's end straight up beside the
					// card and into the base of the vat. The core lights while the card is read (0.3 s), a pulse runs up it, then it dims to a faint glow.
					if (slotOn > 0.01) {
						const cxm = MX + slotW / 2 - 1.5;
						const pts: [number, number][] = [[cxm, SLOT_LIP - 3], [cxm, 392], [MX + 33, 384]];
						const lens = [0];
						for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
						const total = lens[lens.length - 1];
						const trace = (upto: number) => {
							ctx.beginPath();
							ctx.moveTo(pts[0][0], pts[0][1]);
							let hx = pts[0][0];
							let hy = pts[0][1];
							for (let i = 1; i < pts.length; i++) {
								const f = clamp((upto - lens[i - 1]) / (lens[i] - lens[i - 1]));
								hx = mix(pts[i - 1][0], pts[i][0], f);
								hy = mix(pts[i - 1][1], pts[i][1], f);
								ctx.lineTo(hx, hy);
								if (f < 1) break;
							}
							return [hx, hy] as const;
						};
						ctx.lineCap = 'round';
						ctx.lineJoin = 'round';
						ctx.globalAlpha = clamp(sA * slotOn);
						ctx.strokeStyle = css([10, 11, 12]);
						ctx.lineWidth = 4.4;
						trace(total);
						ctx.stroke();
						ctx.strokeStyle = css([60, 66, 64], 0.7);
						ctx.lineWidth = 3.2;
						trace(total);
						ctx.stroke();
						if (link > 0.005) {
							const hold = mix(1, 0.22, smooth(0, 1.4, t1 - 3.75));
							ctx.globalCompositeOperation = 'lighter';
							const col = mixRGB([255, 244, 226], GENESIS, link);
							const head = trace(easeOut(link) * total);
							ctx.strokeStyle = css(col, 0.28 * hold * As * sceneA);
							ctx.lineWidth = 5;
							ctx.stroke();
							trace(easeOut(link) * total);
							ctx.strokeStyle = css(mixRGB(col, WHITE, 0.35), 0.95 * hold * As * sceneA);
							ctx.lineWidth = 2.1;
							ctx.stroke();
							glow(ctx, head[0], head[1], 9, col, 0.8 * As * sceneA * hold * (1 - smooth(0.95, 1, link)), 'core');
							// a pulse running up it, again and again while it holds
							if (link >= 1) {
								const u = ((t1 - 3.65) * 0.8) % 1;
								const d = u * total;
								let px0 = pts[0][0];
								let py0 = pts[0][1];
								for (let i = 1; i < pts.length; i++)
									if (d <= lens[i]) {
										const f = (d - lens[i - 1]) / (lens[i] - lens[i - 1]);
										px0 = mix(pts[i - 1][0], pts[i][0], f);
										py0 = mix(pts[i - 1][1], pts[i][1], f);
										break;
									}
								glow(ctx, px0, py0, 6, [220, 255, 215], (0.25 + 0.55 * hold) * As * sceneA, 'core');
							}
							ctx.globalCompositeOperation = 'source-over';
						}
					}
				}
				ctx.restore();

				// the foundation meets the ground: a contact shadow along its foot (about 0.4)
				{
					const fy = py(GROUND + 62);
					ctx.globalAlpha = 0.4 * sA * smooth(1.9, 2.6, t1);
					ctx.fillStyle = css([0, 0, 0]);
					ctx.beginPath();
					ctx.ellipse(CX, fy + 4, 214 * s, 6, 0, 0, TAU);
					ctx.fill();
				}

				// the red haze on the plain, in front of the machine's feet (the new life is not an area that is protected: it drifts on
				// through the new light, parting only right at the vat's glass)
				ctx.globalCompositeOperation = 'source-over';
				drawHazes(false);
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
						const x = CX + w.x + Math.sin(sec * 0.12 * w.sp + w.ph) * 46;
						const y = w.y + Math.sin(sec * 0.07 * w.sp + w.ph * 2) * 8;
						const a = w.a * smooth(1.9, 2.8, t1);
						if (a < 0.01) continue;
						ctx.globalAlpha = clamp(a * sA);
						ctx.drawImage(w.v ? hp1 : hp0, x - w.rx, y - w.ry, w.rx * 2, w.ry * 2);
					}
					ctx.restore();
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
				// the dawn: light spreading over the ground plane from the machine's foot, a soft wide ellipse (warm white at its heart,
				// faint Genesis green at its reach), no outline and no front; it only illuminates
				if (domeOn > 0.01) {
					const wRx = 330 * domeOn * breathe;
					const wY = py(GROUND + 78);
					ctx.save();
					// not over the foundation's front faces (they stand up out of the light); only what lies flat is lit
					ctx.beginPath();
					ctx.rect(0, 0, W, H);
					ctx.rect(CX - 270 * s, py(GROUND + 26), 540 * s, py(GROUND + 62) - py(GROUND + 26));
					ctx.clip('evenodd');
					// several overlapping lobes of different reach, so it fades unevenly: warm white at its heart, faint Genesis green at its reach
					for (const lb of [{ x: 0, y: 0, k: 1, a: 1 }, { x: -0.34, y: 0.06, k: 0.7, a: 0.55 }, { x: 0.4, y: -0.05, k: 0.78, a: 0.55 }, { x: 0.12, y: 0.14, k: 0.6, a: 0.5 }, { x: -0.18, y: -0.1, k: 0.86, a: 0.45 }]) {
						ctx.save();
						ctx.translate(CX + lb.x * wRx, wY + lb.y * wRx * 0.27);
						ctx.scale(1, 0.27);
						const rr4 = wRx * lb.k;
						const wg = ctx.createRadialGradient(0, 0, 0, 0, 0, rr4);
						wg.addColorStop(0, css([176, 240, 168], 0.24 * lb.a));
						wg.addColorStop(0.33, css([208, 230, 150], 0.15 * lb.a));
						wg.addColorStop(0.66, css([240, 192, 112], 0.08 * lb.a));
						wg.addColorStop(0.88, css([232, 170, 100], 0.025 * lb.a));
						wg.addColorStop(1, css([232, 170, 100], 0));
						ctx.globalAlpha = clamp(sA * Math.min(1, domeOn * 1.6));
						ctx.fillStyle = wg;
						ctx.fillRect(-rr4, -rr4, rr4 * 2, rr4 * 2);
						ctx.restore();
					}
					ctx.restore();
					// the foundation's top face (lying flat, facing the sky) takes the light
					{
						const tg2 = ctx.createRadialGradient(CX, py(GROUND + 12), 0, CX, py(GROUND + 12), 196 * s);
						tg2.addColorStop(0, css([210, 236, 156], 0.36));
						tg2.addColorStop(0.45, css([222, 222, 148], 0.3));
						tg2.addColorStop(0.8, css([226, 204, 138], 0.17));
						tg2.addColorStop(0.97, css([226, 204, 138], 0.04));
						tg2.addColorStop(1, css([226, 204, 138], 0));
						ctx.globalAlpha = clamp(sA * Math.min(1, domeOn * 1.6));
						ctx.fillStyle = tg2;
						ctx.beginPath();
						ctx.moveTo(CX - 186 * s, py(GROUND + 26));
						ctx.lineTo(CX - 150 * s, py(GROUND - 4));
						ctx.lineTo(CX + 150 * s, py(GROUND - 4));
						ctx.lineTo(CX + 186 * s, py(GROUND + 26));
						ctx.closePath();
						ctx.fill();
					}
					// its edge is broken by the red haze drifting over it
					if (hp0 && hp1) {
						ctx.globalCompositeOperation = 'source-over';
						for (let k = 0; k < 18; k++) {
							const an = (k / 18) * TAU + Math.sin(sec * 0.05 + k) * 0.08;
							const rho = 0.78 + 0.3 * (0.5 + 0.5 * Math.sin(k * 2.7));
							const hx = CX + Math.cos(an) * rho * wRx;
							const hy = wY + Math.sin(an) * rho * wRx * 0.27;
							const sz = (46 + 36 * (0.5 + 0.5 * Math.sin(k * 1.9 + 1))) * (0.7 + 0.6 * (k % 3) / 2);
							ctx.globalAlpha = clamp(0.3 * domeOn * sA);
							ctx.drawImage(k % 2 ? hp1 : hp0, hx - sz * 1.8, hy - sz * 0.5, sz * 3.6, sz);
						}
						ctx.globalCompositeOperation = 'lighter';
					}
					// the ground's stones catch the light on the side toward the machine and throw their shadows away from it
					const rA = clamp(sA * Math.min(1, domeOn * 1.6));
					for (const rk of ROCKS) {
						const rx0 = CX + Math.cos(rk.a) * rk.rho * wRx;
						const ry0 = wY + Math.sin(rk.a) * rk.rho * wRx * 0.27;
						if (Math.abs(rx0 - CX) < 205 && ry0 < py(GROUND + 66)) continue;
						const L = Math.pow(Math.max(0, 1 - rk.rho), 1.2) * 0.9 + 0.1;
						const dxn = Math.cos(rk.a);
						const dyn = Math.sin(rk.a) * 0.3;
						const dl = Math.hypot(dxn, dyn) || 1;
						const z0 = rk.sz * (0.6 + ry0 / H);
						// a soft contact shadow on the unlit side, away from the machine
						ctx.globalCompositeOperation = 'source-over';
						{
							const shx = rx0 + (dxn / dl) * z0 * 0.9;
							const shy = ry0 + z0 * 0.2;
							ctx.save();
							ctx.translate(shx, shy);
							ctx.scale(1, 0.34);
							const sgd = ctx.createRadialGradient(0, 0, 0, 0, 0, z0 * 2);
							sgd.addColorStop(0, css([6, 3, 6], 0.5 * L));
							sgd.addColorStop(1, css([6, 3, 6], 0));
							ctx.globalAlpha = rA;
							ctx.fillStyle = sgd;
							ctx.fillRect(-z0 * 2, -z0 * 2, z0 * 4, z0 * 4);
							ctx.restore();
						}
						// the stone: an irregular polygon, warm where it faces the light and dark on the far side
						ctx.beginPath();
						rk.v.forEach(([an2, rd], i) => {
							const vx = rx0 + Math.cos(an2) * rd * z0;
							const vy = ry0 + Math.sin(an2) * rd * z0 * rk.e * 1.6;
							if (i) ctx.lineTo(vx, vy);
							else ctx.moveTo(vx, vy);
						});
						ctx.closePath();
						const rg3 = ctx.createLinearGradient(rx0 - (dxn / dl) * z0, ry0 - z0 * 0.5, rx0 + (dxn / dl) * z0, ry0 + z0 * 0.4);
						rg3.addColorStop(0, css([186, 128, 98], 0.9));
						rg3.addColorStop(1, css([36, 20, 22], 0.9));
						ctx.globalAlpha = rA * (0.5 + 0.5 * L);
						ctx.fillStyle = rg3;
						ctx.fill();
					}
				}
				ctx.globalCompositeOperation = 'source-over';

				// the token: a printed genome card. It is carried in from below, near the camera and small and bright against the dark (a
				// warm gold rim, a face that catches light, glinting contacts), at about 1.5 times its seated size, over about 0.8 s (2.0 to
				// 2.8), held a moment above the slot (to 2.95), then slid in contacts first until about 0.4 of it is inside. Seated, a flash
				// at the mouth and a jolt; the machine then reads it: the printed helix lights rung by rung where it lies, still scrambled.
				{
					const tex2 = t1 > 1.95 ? card() : null;
					if (tex2) {
						const sc = s * ck;
						const lipY = py(SLOT_LIP);
						const u = ramp(2.0, 2.8, t1);
						const q = smooth(0, 1, u);
						// held tipped back a little (foreshortened) just above the slot's mouth, below the vat's glass, then it stands up as it
						// goes in; it reaches its seated size during the flight
						const ysq = u < 1 ? mix(1, 0.55, q) : mix(0.55, 1, smooth(meetAt, meetAt + 0.22, t1));
						const slide = smooth(meetAt, seatAt, t1);
						const jolt = 1.6 * Math.sin(Math.PI * ramp(seatAt - 0.02, seatAt + 0.24, t1));
						const bottomHover = lipY - 4 * sc;
						const hoverC = bottomHover - (CARD_H / 2) * sc * 0.55;
						const startC = [CX - 110, H - 40] as const;
						const ctrlC = [CX - 190, hoverC + 150] as const;
						const kq = 1 - q;
						const flyX = kq * kq * startC[0] + 2 * kq * q * ctrlC[0] + q * q * CX;
						const flyY = kq * kq * startC[1] + 2 * kq * q * ctrlC[1] + q * q * hoverC;
						const bottomY = bottomHover + (slide * (CARD_H * 0.4 + 4) + jolt) * sc;
						const cy2 = u < 1 ? flyY : bottomY - (CARD_H / 2) * sc * ysq;
						const cx2 = u < 1 ? flyX : CX;
						const f = mix(1.9, 1, q);
						const carry = 1 - smooth(readAt + 0.2, readAt + 0.7, t1);
						ctx.save();
						// inside the slot, the lip hides what has gone in
						if (u >= 1) {
							ctx.beginPath();
							ctx.rect(0, 0, W, lipY);
							ctx.clip();
						}
						ctx.translate(cx2, cy2);
						ctx.rotate(mix(-0.3, 0, q));
						ctx.scale(sc * f * mix(0.85, 1, q), sc * f * ysq);
						ctx.translate(-CARD_W / 2, -CARD_H / 2);
						const vis2 = clamp(smooth(0, 0.1, u) * sA);
						ctx.globalAlpha = vis2;
						ctx.drawImage(tex2, -CARD_M, -CARD_M, CARD_W + 2 * CARD_M, CARD_H + 2 * CARD_M);
						// carried, it is a small bright thing on the dark: a warm halo, a gold rim along every edge, a face that catches light
						// and gold contacts that glint
						if (carry > 0.01) {
							ctx.globalCompositeOperation = 'lighter';
							glow(ctx, CARD_W / 2, CARD_H / 2, 66, [255, 190, 110], 0.3 * carry * vis2);
							cardPath(ctx);
							ctx.save();
							ctx.clip();
							const fg2 = ctx.createLinearGradient(0, 0, CARD_W, CARD_H * 0.9);
							fg2.addColorStop(0, css([255, 214, 150], 0.36 * carry));
							fg2.addColorStop(0.45, css([255, 200, 130], 0.08 * carry));
							fg2.addColorStop(1, css([255, 190, 120], 0.02));
							ctx.globalAlpha = vis2;
							ctx.fillStyle = fg2;
							ctx.fillRect(0, 0, CARD_W, CARD_H);
							ctx.restore();
							cardPath(ctx);
							ctx.globalAlpha = vis2;
							ctx.strokeStyle = css([255, 214, 140], 0.95 * carry);
							ctx.lineWidth = 1.5;
							ctx.stroke();
							const gx = 4 + ((sec * 0.8) % 1) * (CARD_W - 8);
							glow(ctx, gx, 41.6, 9, [255, 240, 190], 0.95 * carry * vis2);
							ctx.globalCompositeOperation = 'source-over';
						}
						ctx.globalAlpha = vis2;
						// lit from the left, one column after another, in the order they lie on the card
						const lit = (i: number) => {
							const d0 = readAt + ((HELIX.scrX[i] - HX0) / ((HN - 1) * HPITCH)) * 0.35;
							return ramp(d0, d0 + 0.2, t1);
						};
						const standing = 0.55 + 0.1 * Math.sin(sec * 1.3);
						drawHelix(ctx, lit, 1);
						// the rim and the ink keep their 2.8 s level while it goes in, until the first rung lights
						const hold = smooth(2.85, 3.0, t1) * (1 - smooth(readAt - 0.02, readAt + 0.1, t1));
						if (hold > 0.01) {
							ctx.globalCompositeOperation = 'lighter';
							cardPath(ctx);
							ctx.globalAlpha = vis2 * hold;
							ctx.strokeStyle = css([255, 206, 128], 0.7);
							ctx.lineWidth = 1.3;
							ctx.stroke();
							ctx.globalAlpha = vis2 * hold * 0.7;
							drawHelix(ctx, () => 0, 1);
							ctx.globalAlpha = vis2;
							ctx.globalCompositeOperation = 'source-over';
						}
						// seated, the helix's light stands softly on the card
						if (slotRead > 0.01) {
							ctx.globalCompositeOperation = 'lighter';
							glow(ctx, CARD_W / 2, HCY, 44, GENESIS, 0.2 * slotRead * standing * sA);
						}
						ctx.restore();
						ctx.globalCompositeOperation = 'source-over';
					}
					// the flash at the slot's mouth as it seats, and the light the slot throws on the ground
					if (t1 >= seatAt - 0.02) {
						ctx.globalCompositeOperation = 'lighter';
						putS(spr([255, 240, 214]), CX, py(SLOT_LIP - 4), 140 * s * ck, 0.85 * slotFlash);
						putS(spr(mixRGB([255, 214, 150], GENESIS, slotRead)), CX, py(GROUND + 22), 150 * s, 0.3 * slotOn);
						ctx.globalCompositeOperation = 'source-over';
					}
				}
				ctx.restore();
			}
			drawLandPlanet();

			// Valleron, a small bright point in the sky, with the ring of motes it has in 05
			{
				const sk = mk(ctx, vis * field * smooth(1.8, 2.3, t1) * vK);
				if (t1 > 1.8) {
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
			grain(ctx, sec, 0.05 * vis * field);
		},
	};
	return self;
}
