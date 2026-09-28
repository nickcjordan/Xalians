// Beats 2 and 3, the Generator's vat (docs/design/home-story-small-pieces.md). A round window in a dark
// riveted housing, left of center; green gel behind thick curved glass, lit from below; bubbles rising at
// several depths. Right of it, sunk in the same housing, the vat's readout: a round display showing the world
// the Generator is writing for, the three genomes' codes as they are written, and a life-signs strip. No creature is ever
// drawn (Nick, 2026-09-27: the creature art is still being worked out, so the story shows worlds, objects and
// ideas); the subject is the genome.
//
// - `forms` (beat 2): points of light write a genome helix in the gel, pair by pair from the bottom up, blank.
//   Then the readout tunes to a world, three in turn (Saiphus, a gas giant; Magmuth, volcanic; Krystos,
//   frozen): the gel floods with that world's light and a band runs up the helix, rewriting its bases in the
//   world's colors. After the last world a heartbeat starts on the strip, and the helix pulses with it.
// - `apex` (beat 3): the same vat, Krystos's genome, the heartbeat going. A hard line of violet-white light
//   runs round the rim, catching the bolts, and threads into the glass; the gel is overtaken from the edge
//   inward and the helix's pairs turn violet as the front reaches them; the bubbles slow and hang; a lattice
//   of the same light closes over the world on the display; last, the heartbeat turns violet and falls into
//   an even, machine-regular beat. The color is an art choice, not canon.
import { BACKBONE, type Helix, type PairLook, PAIRED, drawHelix, pairPoint } from './helix';
import { type Camera, type Ctx, type RGB, H, W, blot, clamp, css, glow, grain, lighter, loopFade, mix, mixRGB, motes, ramp, rng, smooth, sphere, vignette } from './stage';

export const FORMS_LOOP = 16;
export const APEX_LOOP = 12;

// The window.
const CX = 392;
const CY = H / 2;
const R = 226;
const RIM = 28;

// The readout: a recessed panel, its round display, the code rows and the strip.
const PANEL = { x: 704, y: 66, w: 258, h: 430 };
const GLOBE = { x: PANEL.x + PANEL.w / 2, y: 180, r: 84 };
const CODE_Y = 288; // the first code row; one row per world under it
const STRIP = { x: PANEL.x + 16, y: 350, w: PANEL.w - 32, h: 118 };

const VIOLET: RGB = [168, 118, 255];
const APEX_WHITE: RGB = [236, 226, 255];
const GREEN: RGB = [70, 190, 96];
const BLANK: RGB = [150, 162, 172];
const LIFE: RGB = [150, 255, 190];
const MACHINE: RGB = [206, 176, 255];

// ---- The worlds.

type World = { key: 'saiphus' | 'magmuth' | 'krystos'; gel: RGB; flood: number; bases: RGB[]; lamp: RGB };
export const WORLDS: World[] = [
	{ key: 'saiphus', gel: [56, 104, 200], flood: 0.9, bases: [[70, 150, 255], [110, 220, 255], [60, 96, 236], [150, 170, 255]], lamp: [120, 180, 255] },
	{ key: 'magmuth', gel: [196, 76, 28], flood: 0.9, bases: [[255, 120, 40], [255, 196, 70], [236, 64, 40], [255, 150, 90]], lamp: [255, 150, 70] },
	{ key: 'krystos', gel: [128, 146, 182], flood: 0.9, bases: [[214, 240, 255], [120, 190, 250], [240, 250, 255], [110, 220, 240]], lamp: [214, 236, 255] },
];
const VIOLETS: RGB[] = [[132, 64, 240], [160, 90, 250], [104, 48, 220], [176, 116, 250]];

// ---- The genome.

const PAIRS = 14;
// Big in the window (it has to read on a phone), and its bases light themselves against the lit gel.
const HELIX: Omit<Helix, 'phase' | 'center'> = { pairs: PAIRS, rise: 29, radius: 100, scale: 1, emissive: 1 };
// Turned upright, a few degrees off, so it hangs in the gel like a specimen; written from the bottom up.
const CAM: Camera = { cx: CX, cy: CY, pitch: 0.3, roll: Math.PI / 2 - 0.14, dist: 1500, zoom: 1 };
const SEQ = WORLDS.map((_, k) => {
	const r = rng(211 + k * 97);
	return Array.from({ length: PAIRS }, () => Math.floor(r() * 4));
});
const JIT = (() => {
	const r = rng(77);
	return Array.from({ length: PAIRS }, () => r());
})();

// Beat 2's clock.
const WRITE: [number, number] = [0.5, 2.3];
const WORLD_AT = [2.4, 5.1, 7.8];
const TUNE = 1.5; // the band's run up the helix
const HEART_AT = 10.6;
const writeAt = (i: number) => WRITE[0] + (i / (PAIRS - 1)) * (WRITE[1] - WRITE[0]);
const tuneAt = (k: number, i: number) => WORLD_AT[k] + 0.65 + ((i + 1.5) / (PAIRS + 3)) * TUNE + JIT[i] * 0.08;
/** The world the readout shows at `t` in beat 2 (-1: none yet). */
const worldAt = (t: number) => (t >= WORLD_AT[2] ? 2 : t >= WORLD_AT[1] ? 1 : t >= WORLD_AT[0] ? 0 : -1);

// Beat 3's clock.
const RIM_RUN: [number, number] = [1.0, 2.6];
const THREAD: [number, number] = [2.4, 3.6];
const TAKE: [number, number] = [3.0, 6.8];
const LATTICE: [number, number] = [5.4, 6.9];
const MACHINE_AT = 7.2;
const MACHINE_BEAT = 0.5;

// ---- The heartbeat.

/** The organic beats from `from`: a little uneven, as a living one is. */
function beatsFrom(from: number, until: number) {
	const r = rng(Math.round(from * 100) + 5);
	const out: number[] = [];
	for (let b = from; b < until; b += 0.74 + r() * 0.18) out.push(b);
	return out;
}
const HEART_2 = beatsFrom(HEART_AT, FORMS_LOOP + 1);
const HEART_3 = beatsFrom(-4.2, APEX_LOOP + 1);

const bump = (p: number, at: number, w: number) => Math.exp(-Math.pow((p - at) / w, 2));
/** One organic beat's trace, `p` seconds after it. */
const ecg = (p: number) => (p < 0 || p > 0.7 ? 0 : 0.12 * bump(p, 0.07, 0.03) - 0.1 * bump(p, 0.16, 0.016) + bump(p, 0.195, 0.02) - 0.26 * bump(p, 0.23, 0.018) + 0.24 * bump(p, 0.42, 0.055));
const lastBefore = (beats: number[], s: number) => {
	let b = -Infinity;
	for (const x of beats) if (x <= s) b = x;
	return b;
};

type Signal = { v: number; machine: boolean; alive: boolean };
/** The life-signs trace at moment `s`. */
function signal(mode: 'forms' | 'apex', s: number): Signal {
	if (mode === 'forms') {
		if (s < HEART_AT) return { v: 0, machine: false, alive: false };
		return { v: ecg(s - lastBefore(HEART_2, s)), machine: false, alive: true };
	}
	if (s < MACHINE_AT) return { v: ecg(s - lastBefore(HEART_3, s)), machine: false, alive: true };
	const p = (s - MACHINE_AT) % MACHINE_BEAT;
	return { v: p < 0.06 ? 0.78 : p < 0.1 ? -0.08 : 0, machine: true, alive: true };
}
/** The helix's pulse with the heartbeat, 0 to 1. */
function pulse(mode: 'forms' | 'apex', t: number) {
	if (mode === 'forms') return t < HEART_AT ? 0 : bump(t - lastBefore(HEART_2, t), 0.2, 0.12);
	if (t < MACHINE_AT) return bump(t - lastBefore(HEART_3, t), 0.2, 0.12);
	return (t - MACHINE_AT) % MACHINE_BEAT < 0.08 ? 1 : 0;
}

// ---- The helix's look.

function formsLook(i: number, t: number, sec: number, tint: RGB): PairLook {
	const w = writeAt(i);
	// the whole helix is there faintly from the start, a scaffold the writing fills
	const alpha = Math.max(0.3 * smooth(0.15, 0.6, t), smooth(w, w + 0.18, t));
	let a = BLANK;
	let b = BLANK;
	let glowV = 0.12;
	let flash = 1 - ramp(w, w + 0.4, t);
	let tuned = -1;
	for (let k = 0; k < 3; k++) if (t >= tuneAt(k, i)) tuned = k;
	const k = worldAt(t);
	const inBand = k >= 0 && t >= WORLD_AT[k] + 0.2 && t < tuneAt(k, i) && t > tuneAt(k, i) - 0.35;
	if (inBand) {
		// the band passing: cycling through the world's bases
		const c = Math.floor(sec * 16 + i * 3) % 4;
		a = mixRGB(BLANK, WORLDS[k].bases[c], 0.7);
		b = mixRGB(BLANK, WORLDS[k].bases[PAIRED[c]], 0.7);
		glowV = 0.8;
	} else if (tuned >= 0) {
		const s = SEQ[tuned][i];
		a = WORLDS[tuned].bases[s];
		b = WORLDS[tuned].bases[PAIRED[s]];
		glowV = 0.8;
		flash = Math.max(flash, 1 - ramp(tuneAt(tuned, i), tuneAt(tuned, i) + 0.35, t));
	}
	const beat = pulse('forms', t);
	return { a, b, glow: (glowV + 0.45 * beat) * smooth(w, w + 0.18, t), bead: mixRGB(mixRGB(BLANK, BACKBONE, smooth(WORLD_AT[0], WORLD_AT[0] + 1, t)), tint, 0.4), sheen: 0.6, alpha, flash: flash * alpha };
}

function apexLook(i: number, t: number, turned: number, tint: RGB): PairLook {
	const s = SEQ[2][i];
	const own = WORLDS[2].bases;
	const beat = pulse('apex', t);
	return {
		a: mixRGB(own[s], VIOLETS[s], turned),
		b: mixRGB(own[PAIRED[s]], VIOLETS[PAIRED[s]], turned),
		glow: 0.8 + 0.4 * turned + 0.45 * beat,
		bead: mixRGB(mixRGB(BACKBONE, tint, 0.4), [150, 110, 220], turned),
		sheen: 0.6,
		alpha: 1,
		flash: 0.8 * bump(turned, 0.5, 0.25),
	};
}

// ---- The vat.

type Bubble = { x: number; y0: number; speed: number; r: number; depth: number; wob: number };
const BUBBLES: Bubble[] = (() => {
	const r = rng(31);
	return Array.from({ length: 54 }, () => ({ x: (r() * 2 - 1) * R * 0.9, y0: r(), speed: 30 + r() * 60, r: 2 + r() * 7, depth: r(), wob: r() * Math.PI * 2 }));
})();

/** The gel behind the glass, lit from below, its light leaning toward `base`. */
function gel(ctx: Ctx, sec: number, base: RGB) {
	const g = ctx.createRadialGradient(CX, CY + R * 0.6, 10, CX, CY + R * 0.1, R * 1.25);
	g.addColorStop(0, css(mixRGB(base, [255, 255, 220], 0.28)));
	g.addColorStop(0.45, css(mixRGB(base, [0, 0, 0], 0.45)));
	g.addColorStop(1, css(mixRGB(base, [0, 0, 0], 0.88)));
	ctx.fillStyle = g;
	ctx.fillRect(CX - R, CY - R, R * 2, R * 2);
	// slow caustic light moving through it
	lighter(ctx, () => {
		for (let k = 0; k < 5; k++) {
			const x = CX + Math.sin(sec * 0.23 + k * 1.7) * R * 0.6;
			const y = CY + R * 0.2 + Math.cos(sec * 0.17 + k * 2.3) * R * 0.5;
			glow(ctx, x, y, 120 + 40 * Math.sin(sec * 0.3 + k), mixRGB(base, [255, 255, 230], 0.4), 0.1);
		}
	});
}

function bubbles(ctx: Ctx, sec: number, hang: number, color: RGB) {
	for (const b of BUBBLES) {
		// A bubble slows to a stop where it is as the light takes the gel.
		const travel = sec * b.speed * (1 - hang) + hang * b.speed * 4;
		const y = CY + R - ((b.y0 * R * 2 + travel) % (R * 2.2));
		const x = CX + b.x + Math.sin(sec * 1.3 * (1 - hang) + b.wob) * 5;
		const near = b.depth;
		const r = b.r * (0.5 + 0.5 * near);
		if (near < 0.4) {
			// far: soft and dim
			glow(ctx, x, y, r * 2.2, mixRGB(color, [255, 255, 255], 0.3), 0.18);
			continue;
		}
		glow(ctx, x, y, r * 1.5, mixRGB(color, [255, 255, 255], 0.2), 0.16 * near);
		ctx.globalAlpha = 0.14 + 0.3 * near;
		ctx.strokeStyle = css(mixRGB(color, [255, 255, 255], 0.5));
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.arc(x, y, r, 0, Math.PI * 2);
		ctx.stroke();
		ctx.globalAlpha = 1;
		glow(ctx, x - r * 0.35, y - r * 0.35, r * 0.7, [255, 255, 255], 0.55 * near, 'core');
	}
}

function housing(ctx: Ctx, spill: RGB, rimLight: number, runAt: number) {
	// the plate around the window and the readout
	const g = ctx.createLinearGradient(0, 0, W, H);
	g.addColorStop(0, css([34, 38, 40]));
	g.addColorStop(1, css([12, 14, 16]));
	ctx.fillStyle = g;
	ctx.beginPath();
	ctx.rect(0, 0, W, H);
	ctx.arc(CX, CY, R + RIM, 0, Math.PI * 2, true);
	ctx.fill('evenodd');
	// panel seams
	ctx.strokeStyle = 'rgba(0,0,0,0.5)';
	ctx.lineWidth = 2;
	for (const x of [96, 670]) {
		ctx.beginPath();
		ctx.moveTo(x, 0);
		ctx.lineTo(x, H);
		ctx.stroke();
	}
	// the conduit from the ring to the readout
	for (const y of [CY - 34, CY + 34]) {
		const c = ctx.createLinearGradient(0, y - 7, 0, y + 7);
		c.addColorStop(0, css([70, 76, 78]));
		c.addColorStop(0.4, css([36, 40, 42]));
		c.addColorStop(1, css([10, 12, 13]));
		ctx.fillStyle = c;
		ctx.fillRect(CX + R + RIM - 4, y - 7, PANEL.x - (CX + R + RIM) + 8, 14);
	}
	// the ring
	const ring = ctx.createLinearGradient(CX - R, CY - R, CX + R, CY + R);
	ring.addColorStop(0, css([150, 158, 160]));
	ring.addColorStop(0.5, css([62, 68, 70]));
	ring.addColorStop(1, css([22, 24, 26]));
	ctx.strokeStyle = ring;
	ctx.lineWidth = RIM;
	ctx.beginPath();
	ctx.arc(CX, CY, R + RIM / 2, 0, Math.PI * 2);
	ctx.stroke();
	// the gel's light spilling onto the ring's inner edge
	ctx.strokeStyle = css(spill, 0.35);
	ctx.lineWidth = 3;
	ctx.beginPath();
	ctx.arc(CX, CY, R + 2, Math.PI * 0.1, Math.PI * 0.9);
	ctx.stroke();
	ctx.strokeStyle = 'rgba(0,0,0,0.7)';
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.arc(CX, CY, R, 0, Math.PI * 2);
	ctx.stroke();
	// bolts, each catching the running light as it passes
	for (let k = 0; k < 16; k++) {
		const a = (k / 16) * Math.PI * 2 - Math.PI / 2 + 0.1;
		const bx = CX + Math.cos(a) * (R + RIM / 2);
		const by = CY + Math.sin(a) * (R + RIM / 2);
		sphere(ctx, bx, by, 5, [120, 126, 128], 1, 0.8);
		if (rimLight > 0) {
			const since = ((a + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2);
			const hit = Math.exp(-Math.pow((runAt - since) * 14, 2));
			if (hit > 0.02) glow(ctx, bx, by, 18, APEX_WHITE, 0.9 * hit * rimLight, 'core');
		}
	}
}

function glass(ctx: Ctx, sec: number) {
	// the curve of the glass: darker toward the rim, a long highlight up and to the left that drifts a little
	const g = ctx.createRadialGradient(CX, CY, R * 0.6, CX, CY, R);
	g.addColorStop(0, 'rgba(0,0,0,0)');
	g.addColorStop(1, 'rgba(0,0,0,0.55)');
	ctx.fillStyle = g;
	ctx.fillRect(CX - R, CY - R, R * 2, R * 2);
	const drift = Math.sin(sec * 0.25) * 0.05;
	ctx.lineCap = 'round';
	ctx.strokeStyle = 'rgba(255,255,255,0.15)';
	ctx.lineWidth = 16;
	ctx.beginPath();
	ctx.arc(CX, CY, R * 0.86, Math.PI * (1.08 + drift), Math.PI * (1.42 + drift));
	ctx.stroke();
	ctx.strokeStyle = 'rgba(255,255,255,0.08)';
	ctx.lineWidth = 6;
	ctx.beginPath();
	ctx.arc(CX, CY, R * 0.78, Math.PI * (1.12 + drift * 1.4), Math.PI * (1.3 + drift * 1.4));
	ctx.stroke();
	ctx.strokeStyle = 'rgba(255,255,255,0.05)';
	ctx.lineWidth = 10;
	ctx.beginPath();
	ctx.arc(CX, CY, R * 0.9, Math.PI * (0.12 - drift), Math.PI * (0.26 - drift));
	ctx.stroke();
}

// ---- The readout's worlds: small globes lit from the upper left, turning slowly.

type Feature = { lon: number; lat: number; size: number; kind: number };
const FEATURES: Record<World['key'], Feature[]> = (() => {
	const make = (seed: number, n: number): Feature[] => {
		const r = rng(seed);
		return Array.from({ length: n }, () => ({ lon: r() * Math.PI * 2, lat: Math.asin(r() * 2 - 1) * 0.9, size: 0.08 + r() * 0.22, kind: r() }));
	};
	return { saiphus: make(3, 10), magmuth: make(5, 26), krystos: make(7, 18) };
})();
/** Channels over a world's face, as walks in longitude and latitude. */
const channels = (seed: number, n: number, steps: number, stride: number): [number, number][][] => {
	const r = rng(seed);
	return Array.from({ length: n }, () => {
		let lon = r() * Math.PI * 2;
		let lat = (r() * 2 - 1) * 1.1;
		let dir = r() * Math.PI * 2;
		const out: [number, number][] = [];
		for (let s = 0; s < steps; s++) {
			out.push([lon, lat]);
			dir += (r() - 0.5) * 1.3;
			lon += Math.cos(dir) * stride;
			lat = clamp(lat + Math.sin(dir) * stride * 0.7, -1.3, 1.3);
		}
		return out;
	});
};
const LAVA = channels(15, 11, 12, 0.13);
const CREVASSES = channels(17, 12, 9, 0.1);

/** Draw walks `lines` over the globe's facing side. */
function trace(ctx: Ctx, lines: [number, number][][], spin: number) {
	ctx.beginPath();
	for (const line of lines) {
		let on = false;
		for (const [lon, lat] of line) {
			const p = onGlobe(lon, lat, spin);
			if (p.facing <= 0.05) {
				on = false;
				continue;
			}
			if (on) ctx.lineTo(p.x, p.y);
			else ctx.moveTo(p.x, p.y);
			on = true;
		}
	}
}

/** A point on the globe: its place on the display and how squarely it faces the viewer (under 0: behind). */
function onGlobe(lon: number, lat: number, spin: number, rk = 1) {
	const l = lon + spin;
	const facing = Math.cos(lat) * Math.cos(l);
	return { x: GLOBE.x + Math.cos(lat) * Math.sin(l) * GLOBE.r * rk, y: GLOBE.y - Math.sin(lat) * GLOBE.r * rk, facing };
}

function globe(ctx: Ctx, w: World, sec: number, alpha: number) {
	if (alpha <= 0.01) return;
	const { x, y, r } = GLOBE;
	const spin = sec * 0.12;
	ctx.save();
	ctx.globalAlpha = alpha;
	ctx.beginPath();
	ctx.arc(x, y, r, 0, Math.PI * 2);
	ctx.clip();
	if (w.key === 'saiphus') {
		// a gas giant: soft bands in blues and teal, their edges drifting
		ctx.fillStyle = css([60, 104, 170]);
		ctx.fillRect(x - r, y - r, r * 2, r * 2);
		const band: RGB[] = [[120, 180, 240], [70, 120, 200], [150, 214, 236], [52, 90, 170], [110, 160, 226], [170, 206, 246], [64, 110, 190]];
		for (let k = 0; k < 14; k++) {
			const by = y - r + (k + 0.5) * ((r * 2) / 14);
			const wob = Math.sin(k * 1.9 + sec * 0.3) * 4;
			blot(ctx, x + wob, by, r * 1.3, r * 0.1, 0.02 * Math.sin(k), band[k % band.length], 0.9);
		}
		for (const f of FEATURES.saiphus) {
			const p = onGlobe(f.lon, f.lat * 0.5, spin);
			if (p.facing > 0.1) blot(ctx, p.x, p.y, r * f.size * 0.7 * p.facing, r * f.size * 0.22, 0, [200, 230, 255], 0.35 * p.facing);
		}
	} else if (w.key === 'magmuth') {
		// basalt, split by glowing channels and dotted with vents
		ctx.fillStyle = css([46, 32, 30]);
		ctx.fillRect(x - r, y - r, r * 2, r * 2);
		for (const f of FEATURES.magmuth) {
			const p = onGlobe(f.lon, f.lat, spin);
			if (p.facing > 0) blot(ctx, p.x, p.y, r * f.size * p.facing, r * f.size, 0, f.kind > 0.5 ? [20, 14, 14] : [80, 56, 48], 0.6);
		}
		lighter(ctx, () => {
			trace(ctx, LAVA, spin);
			ctx.lineJoin = 'round';
			ctx.strokeStyle = css([255, 80, 30], 0.35);
			ctx.lineWidth = 7;
			ctx.stroke();
			ctx.strokeStyle = css([255, 150, 50], 0.95);
			ctx.lineWidth = 1.8;
			ctx.stroke();
			for (const f of FEATURES.magmuth.slice(0, 10)) {
				const p = onGlobe(f.lon, f.lat, spin);
				if (p.facing > 0.1) glow(ctx, p.x, p.y, 12 * p.facing, [255, 140, 50], 0.85 * p.facing, 'core');
			}
		});
	} else {
		// ice: white and pale blue, with gray-blue ground where the ice is thin, split by crevasses
		ctx.fillStyle = css([222, 234, 246]);
		ctx.fillRect(x - r, y - r, r * 2, r * 2);
		for (const f of FEATURES.krystos) {
			const p = onGlobe(f.lon, f.lat, spin);
			if (p.facing > 0) blot(ctx, p.x, p.y, r * f.size * p.facing, r * f.size * 0.8, f.kind, f.kind > 0.6 ? [104, 128, 164] : [150, 180, 222], 0.6);
		}
		trace(ctx, CREVASSES, spin);
		ctx.lineJoin = 'round';
		ctx.strokeStyle = css([90, 130, 190], 0.7);
		ctx.lineWidth = 1.4;
		ctx.stroke();
		blot(ctx, x, y - r * 0.95, r * 0.9, r * 0.3, 0, [255, 255, 255], 0.9);
		blot(ctx, x, y + r * 0.95, r * 0.8, r * 0.25, 0, [255, 255, 255], 0.8);
	}
	// light from the upper left, night toward the lower right
	const shade = ctx.createRadialGradient(x - r * 0.4, y - r * 0.45, r * 0.1, x - r * 0.1, y - r * 0.1, r * 1.35);
	shade.addColorStop(0, 'rgba(255,255,255,0.18)');
	shade.addColorStop(0.45, 'rgba(0,0,0,0)');
	shade.addColorStop(0.8, 'rgba(0,0,0,0.6)');
	shade.addColorStop(1, 'rgba(0,0,0,0.92)');
	ctx.fillStyle = shade;
	ctx.fillRect(x - r, y - r, r * 2, r * 2);
	ctx.restore();
	// the air at its edge
	ctx.globalAlpha = alpha;
	ctx.strokeStyle = css(mixRGB(w.lamp, [255, 255, 255], 0.3), 0.45);
	ctx.lineWidth = 2.5;
	ctx.beginPath();
	ctx.arc(x, y, r, Math.PI * 0.85, Math.PI * 1.75);
	ctx.stroke();
	ctx.globalAlpha = 1;
}

/** APEX's lattice closing over the world on the display: meridians and parallels drawn in its light. */
function lattice(ctx: Ctx, amt: number, sec: number) {
	if (amt <= 0.01) return;
	const spin = sec * 0.12;
	// the world takes on the light under the net
	ctx.save();
	ctx.beginPath();
	ctx.arc(GLOBE.x, GLOBE.y, GLOBE.r, 0, Math.PI * 2);
	ctx.clip();
	ctx.fillStyle = css([70, 30, 150], 0.28 * amt);
	ctx.fillRect(GLOBE.x - GLOBE.r, GLOBE.y - GLOBE.r, GLOBE.r * 2, GLOBE.r * 2);
	ctx.restore();
	lighter(ctx, () => {
		// a net, a shell a little larger than the world, its strands wound both ways from the south pole
		// and climbing until it closes over the top
		ctx.lineWidth = 1.5;
		ctx.lineJoin = 'round';
		const reach = clamp(amt * 1.15);
		for (let m = 0; m < 8; m++)
			for (const way of [1, -1]) {
				ctx.beginPath();
				let on = false;
				for (let s = 0; s <= 28; s++) {
					const lat = -Math.PI / 2 + (s / 28) * Math.PI * reach;
					const p = onGlobe((m / 8) * Math.PI * 2 + way * (lat + Math.PI / 2) * 1.1, lat, spin, 1.07);
					if (p.facing <= 0) {
						on = false;
						continue;
					}
					if (on) ctx.lineTo(p.x, p.y);
					else ctx.moveTo(p.x, p.y);
					on = true;
				}
				ctx.strokeStyle = css(way > 0 ? MACHINE : VIOLET, 0.8);
				ctx.stroke();
			}
		glow(ctx, GLOBE.x, GLOBE.y, GLOBE.r * 1.3, VIOLET, 0.35 * amt);
	});
}

/** Static across the display while it retunes, `amt` 0 to 1. */
function retune(ctx: Ctx, amt: number, sec: number) {
	if (amt <= 0.01) return;
	const r = rng(Math.floor(sec * 20) * 13 + 1);
	ctx.save();
	ctx.beginPath();
	ctx.arc(GLOBE.x, GLOBE.y, GLOBE.r, 0, Math.PI * 2);
	ctx.clip();
	for (let k = 0; k < 40; k++) {
		const y = GLOBE.y - GLOBE.r + r() * GLOBE.r * 2;
		const v = 120 + r() * 135;
		ctx.fillStyle = `rgba(${v | 0},${v | 0},${v | 0},${(amt * (0.25 + r() * 0.5)).toFixed(3)})`;
		ctx.fillRect(GLOBE.x - GLOBE.r, y, GLOBE.r * 2, 1 + r() * 4);
	}
	ctx.restore();
}

function readout(ctx: Ctx, mode: 'forms' | 'apex', t: number, sec: number, take: number) {
	const { x, y, w, h } = PANEL;
	// the recess
	ctx.fillStyle = css([6, 9, 10]);
	ctx.fillRect(x, y, w, h);
	ctx.strokeStyle = 'rgba(0,0,0,0.8)';
	ctx.lineWidth = 3;
	ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
	ctx.strokeStyle = 'rgba(255,255,255,0.08)';
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(x, y + h + 1);
	ctx.lineTo(x + w + 1, y + h + 1);
	ctx.lineTo(x + w + 1, y);
	ctx.stroke();
	for (const [sx, sy] of [[x + 10, y + 10], [x + w - 10, y + 10], [x + 10, y + h - 10], [x + w - 10, y + h - 10]]) sphere(ctx, sx, sy, 3.2, [110, 116, 118], 1, 0.8);

	// the display's bezel and dark glass
	ctx.fillStyle = css([2, 5, 6]);
	ctx.beginPath();
	ctx.arc(GLOBE.x, GLOBE.y, GLOBE.r + 10, 0, Math.PI * 2);
	ctx.fill();
	ctx.strokeStyle = css([60, 66, 68]);
	ctx.lineWidth = 4;
	ctx.stroke();

	// which world, and how it arrives
	const k = mode === 'apex' ? 2 : worldAt(t);
	if (k >= 0) {
		const since = mode === 'apex' ? 9 : t - WORLD_AT[k];
		globe(ctx, WORLDS[k], sec, smooth(0.15, 0.5, since));
		retune(ctx, mode === 'apex' ? 0 : 1 - ramp(0.1, 0.5, since), sec);
	} else {
		// searching: a faint sweep
		lighter(ctx, () => {
			const a = sec * 2.4;
			glow(ctx, GLOBE.x + Math.cos(a) * GLOBE.r * 0.55, GLOBE.y + Math.sin(a) * GLOBE.r * 0.55, 20, LIFE, 0.22);
		});
	}
	if (mode === 'apex') lattice(ctx, smooth(LATTICE[0], LATTICE[1], t), sec);
	// the display's glass
	ctx.strokeStyle = 'rgba(255,255,255,0.12)';
	ctx.lineWidth = 5;
	ctx.lineCap = 'round';
	ctx.beginPath();
	ctx.arc(GLOBE.x, GLOBE.y, GLOBE.r * 0.86, Math.PI * 1.12, Math.PI * 1.38);
	ctx.stroke();

	// the codes: a row per world, each rung's pair as a tick, written as the band passes it; kept, so by the
	// heartbeat three different genomes stand one above the other
	const TICK = 11;
	const GAP = 3;
	const x0 = GLOBE.x - (PAIRS * (TICK + GAP) - GAP) / 2;
	for (let n = 0; n < 3; n++) {
		const y = CODE_Y + n * 16;
		const now = mode === 'apex' ? n === 2 : n === k;
		for (let i = 0; i < PAIRS; i++) {
			const x = x0 + i * (TICK + GAP);
			const written = mode === 'apex' || t >= tuneAt(n, i);
			const c = WORLDS[n].bases[SEQ[n][i]];
			const color = written ? mixRGB(mixRGB(c, [30, 34, 36], now ? 0 : 0.45), VIOLET, take * 0.85) : [30, 34, 36];
			ctx.fillStyle = css(color as RGB);
			ctx.fillRect(x, y, TICK, 11);
		}
		if (now && (mode === 'apex' || t >= tuneAt(n, 0)))
			lighter(ctx, () => glow(ctx, GLOBE.x, y + 5, 110, mixRGB(WORLDS[n].lamp, VIOLET, take), 0.12));
	}

	// the life-signs strip: the newest moment at its right edge, three seconds across
	const S = STRIP;
	ctx.fillStyle = css([4, 12, 10]);
	ctx.fillRect(S.x, S.y, S.w, S.h);
	ctx.strokeStyle = css([60, 66, 68]);
	ctx.lineWidth = 2;
	ctx.strokeRect(S.x, S.y, S.w, S.h);
	ctx.strokeStyle = 'rgba(120,200,160,0.08)';
	ctx.lineWidth = 1;
	for (let g = 1; g < 6; g++) {
		ctx.beginPath();
		ctx.moveTo(S.x + (g * S.w) / 6, S.y);
		ctx.lineTo(S.x + (g * S.w) / 6, S.y + S.h);
		ctx.stroke();
	}
	const base = S.y + S.h * 0.62;
	const amp = S.h * 0.5;
	const SPAN = 3;
	const N = 180;
	lighter(ctx, () => {
		ctx.lineJoin = 'round';
		let px = 0;
		let py = 0;
		let pm = false;
		for (let n = 0; n <= N; n++) {
			const s = t - (1 - n / N) * SPAN;
			const sig = signal(mode, s);
			const xx = S.x + (n / N) * S.w;
			const yy = base - sig.v * amp;
			if (n) {
				const color = sig.machine ? MACHINE : sig.alive ? LIFE : [90, 130, 110];
				const fresh = 0.35 + 0.65 * (n / N);
				ctx.strokeStyle = css(color as RGB, sig.machine ? 0.5 + 0.5 * fresh : fresh);
				ctx.lineWidth = sig.machine ? 2.6 : 2;
				ctx.beginPath();
				ctx.moveTo(px, py);
				ctx.lineTo(xx, yy);
				ctx.stroke();
				if (sig.machine !== pm && sig.machine) glow(ctx, xx, yy, 16, APEX_WHITE, 0.6 * fresh, 'core');
			}
			px = xx;
			py = yy;
			pm = sig.machine;
		}
		const now = signal(mode, t);
		glow(ctx, px, py, 12, now.machine ? APEX_WHITE : now.alive ? [220, 255, 230] : [140, 180, 160], 0.9, 'core');
	});
}

// ---- A moment of either piece.

export function drawVat(ctx: Ctx, mode: 'forms' | 'apex', t: number, sec: number) {
	ctx.fillStyle = '#000';
	ctx.fillRect(0, 0, W, H);
	// the takeover (apex only)
	const take = mode === 'apex' ? smooth(TAKE[0], TAKE[1], t) : 0;
	const rimRun = mode === 'apex' ? ramp(RIM_RUN[0], RIM_RUN[1], t) : 0;
	const thread = mode === 'apex' ? smooth(THREAD[0], THREAD[1], t) : 0;

	// the gel: green until a world's light floods it; in beat 3 it holds Krystos's light until APEX's takes it
	let gelBase: RGB = GREEN;
	if (mode === 'forms') {
		for (let k = 0; k < 3; k++) gelBase = mixRGB(gelBase, mixRGB(GREEN, WORLDS[k].gel, WORLDS[k].flood), smooth(WORLD_AT[k], WORLD_AT[k] + 1.2, t));
	} else gelBase = mixRGB(GREEN, WORLDS[2].gel, WORLDS[2].flood);
	const taken: RGB = mixRGB(VIOLET, [16, 6, 40], 0.6);
	// the light the gel gives everything in it
	const tint = mixRGB(gelBase, taken, take);

	const helix: Helix = { ...HELIX, phase: sec * 0.5, center: { x: 0, y: Math.sin(sec * 0.7) * 3, z: 0 }, haze: mixRGB(tint, [0, 0, 0], 0.45) };

	ctx.save();
	ctx.beginPath();
	ctx.arc(CX, CY, R, 0, Math.PI * 2);
	ctx.clip();
	gel(ctx, sec, gelBase);
	// APEX's light: violet gel outside a front closing in from the rim, a hard bright edge at the front
	const front = R * (1 - take) * 1.04;
	if (take > 0) {
		ctx.save();
		ctx.beginPath();
		ctx.arc(CX, CY, R + 2, 0, Math.PI * 2);
		ctx.arc(CX, CY, Math.max(0.1, front), 0, Math.PI * 2);
		ctx.clip('evenodd');
		gel(ctx, sec, taken);
		ctx.restore();
		lighter(ctx, () => {
			const edge = 1 - smooth(0.85, 1, take);
			const g = ctx.createRadialGradient(CX, CY, Math.max(0, front - 30), CX, CY, front + 30);
			g.addColorStop(0, css(APEX_WHITE, 0));
			g.addColorStop(0.5, css(APEX_WHITE, 0.4 * edge));
			g.addColorStop(1, css(VIOLET, 0));
			ctx.fillStyle = g;
			ctx.fillRect(CX - R, CY - R, R * 2, R * 2);
			ctx.strokeStyle = css(APEX_WHITE, 0.9 * edge);
			ctx.lineWidth = 2.5;
			ctx.beginPath();
			ctx.arc(CX, CY, Math.max(0.1, front), 0, Math.PI * 2);
			ctx.stroke();
			glow(ctx, CX, CY, R * 1.2, VIOLET, 0.18 * take);
		});
	}
	lighter(ctx, () => bubbles(ctx, sec, take, mixRGB([150, 240, 170], APEX_WHITE, take)));

	// the light round the helix, which swells with each heartbeat
	const beat = pulse(mode, t);
	const lightOf = mode === 'apex' ? mixRGB(WORLDS[2].lamp, VIOLET, take) : worldAt(t) >= 0 ? WORLDS[worldAt(t)].lamp : [200, 240, 220];
	const written = mode === 'apex' ? 1 : smooth(WRITE[0], WRITE[1], t);
	lighter(ctx, () => glow(ctx, CX, CY, R * 0.8, lightOf as RGB, (0.14 + 0.16 * beat) * written));

	if (mode === 'forms') {
		drawHelix(ctx, CAM, helix, (i) => formsLook(i, t, sec, tint));
		// the writing head, climbing as it writes
		if (t > WRITE[0] - 0.2 && t < WRITE[1] + 0.4) {
			const u = clamp(ramp(WRITE[0], WRITE[1], t) * (PAIRS - 1), 0, PAIRS - 1);
			const p = pairPoint(CAM, helix, u);
			const on = smooth(WRITE[0] - 0.2, WRITE[0], t) * (1 - smooth(WRITE[1], WRITE[1] + 0.4, t));
			lighter(ctx, () => {
				glow(ctx, p.x, p.y, 70, [220, 255, 236], 0.45 * on);
				glow(ctx, p.x, p.y, 16, [255, 255, 255], on, 'core');
			});
		}
		// the rewrite: a bright plane climbing the helix, the bases changing behind it
		const k = worldAt(t);
		if (k >= 0) {
			const u = ((t - WORLD_AT[k] - 0.65) / TUNE) * (PAIRS + 3) - 1.5;
			const on = smooth(-1.5, 0, u) * (1 - smooth(PAIRS - 1, PAIRS + 1, u));
			if (on > 0.01) {
				const c = pairPoint(CAM, helix, u);
				const a = pairPoint(CAM, helix, u - 0.5);
				const b = pairPoint(CAM, helix, u + 0.5);
				// across the axis
				let nx = -(b.y - a.y);
				let ny = b.x - a.x;
				const l = Math.hypot(nx, ny) || 1;
				nx /= l;
				ny /= l;
				const half = 110;
				const color = mixRGB(WORLDS[k].lamp, [255, 255, 255], 0.35);
				const ang = Math.atan2(ny, nx);
				lighter(ctx, () => {
					ctx.save();
					ctx.translate(c.x, c.y);
					ctx.rotate(ang);
					ctx.scale(1, 0.16);
					glow(ctx, 0, 0, half, color, 0.75 * on);
					glow(ctx, 0, 0, half * 0.6, [255, 255, 255], 0.4 * on);
					ctx.restore();
				});
			}
		}
	} else {
		// each pair turns as the front reaches it, the outer ends first
		const turned = Array.from({ length: PAIRS }, (_, i) => {
			const p = pairPoint(CAM, helix, i);
			return take > 0 ? smooth(0, 1, (Math.hypot(p.x - CX, p.y - CY) - front + 30 + JIT[i] * 20) / 60) : 0;
		});
		drawHelix(ctx, CAM, helix, (i) => apexLook(i, t, turned[i], tint));
		// the threads, in from the glass's edge toward the helix
		if (thread > 0)
			lighter(ctx, () => {
				const fade = 1 - smooth(0.2, 0.6, take);
				for (let k = 0; k < 5; k++) {
					const a0 = -Math.PI / 2 + (k / 5) * Math.PI * 2 + 0.3;
					ctx.beginPath();
					let hx = 0;
					let hy = 0;
					for (let s = 0; s <= 24; s++) {
						const fr = (s / 24) * thread;
						const a = a0 + fr * 0.9 + Math.sin(fr * 9 + k) * 0.05;
						const rr = mix(R, R * 0.55, fr);
						hx = CX + Math.cos(a) * rr;
						hy = CY + Math.sin(a) * rr;
						if (s) ctx.lineTo(hx, hy);
						else ctx.moveTo(hx, hy);
					}
					ctx.strokeStyle = css(VIOLET, 0.4 * fade);
					ctx.lineWidth = 7;
					ctx.stroke();
					ctx.strokeStyle = css(APEX_WHITE, 0.85 * fade);
					ctx.lineWidth = 2.4;
					ctx.stroke();
					glow(ctx, hx, hy, 20, APEX_WHITE, 0.8 * thread * fade, 'core');
				}
			});
	}
	glass(ctx, sec);
	ctx.restore();

	housing(ctx, mixRGB(tint, [255, 255, 255], 0.3), rimRun > 0 ? 1 - take * 0.5 : 0, rimRun);
	// the gel's light on the housing round the window
	lighter(ctx, () => glow(ctx, CX, CY, R * 1.7, tint, 0.1));
	readout(ctx, mode, t, sec, mode === 'apex' ? smooth(MACHINE_AT - 0.6, MACHINE_AT, t) : 0);
	if (mode === 'apex' && rimRun > 0)
		lighter(ctx, () => {
			// the light running round the rim
			const a0 = -Math.PI / 2;
			const a1 = a0 + rimRun * Math.PI * 2;
			ctx.strokeStyle = css(APEX_WHITE, 0.85);
			ctx.lineWidth = 3;
			ctx.beginPath();
			ctx.arc(CX, CY, R + RIM + 2, a0, a1);
			ctx.stroke();
			ctx.strokeStyle = css(VIOLET, 0.35);
			ctx.lineWidth = 9;
			ctx.beginPath();
			ctx.arc(CX, CY, R + RIM + 2, a0, a1);
			ctx.stroke();
			if (rimRun < 1) glow(ctx, CX + Math.cos(a1) * (R + RIM + 2), CY + Math.sin(a1) * (R + RIM + 2), 34, APEX_WHITE, 0.9, 'core');
		});
	motes(ctx, sec, mixRGB([170, 220, 190], VIOLET, take), 'front', 0.8);
	grain(ctx, sec);
	vignette(ctx, 0.62);
	const fade = loopFade(t, mode === 'apex' ? APEX_LOOP : FORMS_LOOP);
	if (fade < 1) {
		ctx.fillStyle = `rgba(0,0,0,${(1 - fade).toFixed(3)})`;
		ctx.fillRect(0, 0, W, H);
	}
}
