// Beat 6, the Scrambler Token (docs/design/home-story-small-pieces.md): the plague's broken length dims
// away; points of light spiral in from the middle outward, each landing exactly on its place, and build a new
// helix, unlit and blank (a token's genome is generated new, never rebuilt from what the plague left); a band
// of flicker travels along it, scrambling the bases, and behind it each locks into its base with a flash, the
// whole helix brightening as it fills; it winds fast and tight into a ring of light with a white-hot core,
// and the token forms around it: a hexagonal wafer of dark glass and worn metal seen in three-quarter view,
// beveled, contacts seated in recesses, the coiled genome glowing in its round window. A seal flash, a slow
// turn of a few degrees toward the light, and a glint across its face.
import { BACKBONE, BASES, PAIRED, type Helix, type PairLook, drawHelix, strandPoint } from './helix';
import { PLAGUE_HELIX, plagueCam, plagueLook } from './plague';
import { type Camera, type Ctx, type P3, type RGB, H, W, clamp, css, easeIn, easeOut, glow, ground, lighter, loopFade, mix, mixRGB, motes, project, ramp, rng, smooth, vignette } from './stage';

export const TOKEN_LOOP = 13;

const PAIRS = PLAGUE_HELIX.pairs;
const CAM: Camera = { cx: W / 2, cy: H / 2 + 4, pitch: 0.34, roll: -0.06, dist: 1500, zoom: 1 };

const BLANK: RGB = [150, 162, 172];
const CORE: RGB = [196, 255, 240];
const r = rng(606);
const NEW = Array.from({ length: PAIRS }, () => Math.floor(r() * 4));
const JIT = Array.from({ length: PAIRS }, () => r());
const MIDDLE = (PAIRS - 1) / 2;

const T = {
	remnantOut: [0.2, 1.3],
	arrive: [1.0, 3.5],
	band: [3.8, 6.4],
	coil: [7.0, 8.8],
	chip: [8.4, 9.3],
	seal: 9.25,
	turn: [9.3, 12.2],
	glint: [10.2, 11.2],
} as const;

const landAt = (i: number) => T.arrive[0] + (T.arrive[1] - T.arrive[0] - 0.9) * (Math.abs(i - MIDDLE) / MIDDLE) * 0.92 + JIT[i] * 0.12;
const arrival = (i: number, t: number) => ramp(landAt(i), landAt(i) + 0.9, t);
// The scramble's band: its middle, in pairs along the helix, and each pair's lock, just after the band passes.
const bandAt = (t: number) => mix(-4, PAIRS + 4, ramp(T.band[0], T.band[1], t));
const lockAt = (i: number) => T.band[0] + ((i + 4 + 1.5) / (PAIRS + 8)) * (T.band[1] - T.band[0]) + JIT[i] * 0.3;
const lockedShare = (t: number) => Array.from({ length: PAIRS }, (_, i) => (t >= lockAt(i) ? 1 : 0) as number).reduce((a, b) => a + b, 0) / PAIRS;

function tokenLook(i: number, t: number, sec: number): PairLook {
	const q = arrival(i, t);
	const landed = smooth(0.9, 1, q);
	const coil = smooth(T.coil[0], T.coil[1], t);
	const lock = lockAt(i);
	const band = bandAt(t);
	let a: RGB = BLANK;
	let b: RGB = BLANK;
	let glowV = 0.1;
	let flash = 0.3 * (1 - ramp(landAt(i) + 0.85, landAt(i) + 1.15, t)) * landed;
	if (t >= lock) {
		a = BASES[NEW[i]];
		b = BASES[PAIRED[NEW[i]]];
		flash = Math.max(flash, 1 - ramp(lock, lock + 0.35, t));
		glowV = 0.45 + 0.55 * lockedShare(t) + 0.4 * coil;
	} else if (Math.abs(i - band) < 3.5) {
		// in the band: cycling through the bases
		const k = Math.floor(sec * 16 + i * 3) % 4;
		a = mixRGB(BLANK, BASES[k], 0.7);
		b = mixRGB(BLANK, BASES[PAIRED[k]], 0.7);
		glowV = 0.55;
	}
	const lit = smooth(T.band[0], T.coil[0], t);
	return {
		a,
		b,
		glow: glowV,
		bead: mixRGB(BLANK, BACKBONE, lit),
		sheen: 0.4 + 0.6 * lit,
		alpha: landed,
		flash,
	};
}

// ---- The Scrambler Token, in 3D: a hexagonal wafer, seen in three-quarter view.

const TR = 182; // the hexagon's radius
const THICK = 32;
const BEVEL = 18;
const WIN_R = 78;
const LIGHT = { x: -0.45, y: 0.6, z: 0.66 }; // from the upper left, toward the viewer

type V3 = { x: number; y: number; z: number };
function orient(p: V3, yaw: number, tilt: number): V3 {
	// turn about the vertical, then tip back about the horizontal
	const cy = Math.cos(yaw);
	const sy = Math.sin(yaw);
	const x1 = p.x * cy + p.z * sy;
	const z1 = -p.x * sy + p.z * cy;
	const ct = Math.cos(tilt);
	const st = Math.sin(tilt);
	return { x: x1, y: p.y * ct - z1 * st, z: p.y * st + z1 * ct };
}
const CHIP_CAM: Camera = { cx: W / 2, cy: H / 2 + 8, pitch: 0, roll: 0, dist: 1600, zoom: 1.3 };
const hex = (R: number, z: number): V3[] => Array.from({ length: 6 }, (_, k) => ({ x: Math.cos((Math.PI / 3) * k) * R, y: Math.sin((Math.PI / 3) * k) * R * 0.94, z }));
const dot = (a: V3, b: V3) => a.x * b.x + a.y * b.y + a.z * b.z;
const norm = (a: V3): V3 => {
	const l = Math.hypot(a.x, a.y, a.z) || 1;
	return { x: a.x / l, y: a.y / l, z: a.z / l };
};

function chip(ctx: Ctx, t: number, yaw: number, tilt: number, grow: number, alpha: number, drawCore: (clip: () => void) => void) {
	const P = (p: V3) => project(CHIP_CAM, orient({ x: p.x * grow, y: p.y * grow, z: p.z * grow }, yaw, tilt));
	const face = hex(TR, 0);
	const back = hex(TR, -THICK);
	const inset = hex(TR - BEVEL, 2);
	const poly = (pts: V3[]) => {
		ctx.beginPath();
		pts.forEach((p, k) => {
			const q = P(p);
			if (k) ctx.lineTo(q.x, q.y);
			else ctx.moveTo(q.x, q.y);
		});
		ctx.closePath();
	};
	ctx.globalAlpha = alpha;
	// the edges that face the viewer
	for (let k = 0; k < 6; k++) {
		const a = face[k];
		const b = face[(k + 1) % 6];
		const n = orient(norm({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: 0 }), yaw, tilt);
		if (n.z <= 0) continue;
		const lit = clamp(0.25 + 0.75 * Math.max(0, dot(n, LIGHT)));
		poly([a, b, back[(k + 1) % 6], back[k]]);
		ctx.fillStyle = css(mixRGB([22, 24, 28], [150, 156, 160], lit * 0.7));
		ctx.fill();
	}
	// the face: dark glass reflecting a soft gradient
	poly(face);
	const f0 = P({ x: -TR, y: TR, z: 0 });
	const f1 = P({ x: TR, y: -TR, z: 0 });
	const g = ctx.createLinearGradient(f0.x, f0.y, f1.x, f1.y);
	g.addColorStop(0, css([52, 62, 70]));
	g.addColorStop(0.42, css([18, 23, 28]));
	g.addColorStop(1, css([8, 10, 13]));
	ctx.fillStyle = g;
	ctx.fill();
	// the bevel: each side lit by how it faces the light
	for (let k = 0; k < 6; k++) {
		const a = face[k];
		const b = face[(k + 1) % 6];
		const up = norm({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: TR * 0.9 });
		const n = orient(up, yaw, tilt);
		const lit = clamp(0.15 + 0.85 * Math.max(0, dot(n, LIGHT)));
		poly([a, b, inset[(k + 1) % 6], inset[k]]);
		ctx.fillStyle = css(mixRGB([30, 32, 36], [176, 182, 186], lit));
		ctx.fill();
	}
	// wear: a few fine scratches catching the light
	ctx.strokeStyle = 'rgba(210,220,226,0.12)';
	ctx.lineWidth = 0.8;
	for (const [x0, y0, x1, y1] of [
		[-120, -60, -60, -84],
		[40, -110, 110, -70],
		[-30, 90, 60, 70],
		[-140, 30, -100, 60],
		[90, 20, 140, -10],
	]) {
		const a = P({ x: x0, y: y0, z: 2 });
		const b = P({ x: x1, y: y1, z: 2 });
		ctx.beginPath();
		ctx.moveTo(a.x, a.y);
		ctx.lineTo(b.x, b.y);
		ctx.stroke();
	}
	// engraving along the top: short marks, and a registration notch
	ctx.strokeStyle = 'rgba(150,164,172,0.5)';
	ctx.lineWidth = 1.2;
	for (let k = 0; k < 13; k++) {
		const x = (k - 6) * 12;
		const a = P({ x, y: 118, z: 2 });
		const b = P({ x, y: 118 + (k % 3 === 0 ? 12 : 7), z: 2 });
		ctx.beginPath();
		ctx.moveTo(a.x, a.y);
		ctx.lineTo(b.x, b.y);
		ctx.stroke();
	}
	// contacts, each sunk in a slot just above the lower bevel, a lit lip along the slot's top
	for (let k = 0; k < 7; k++) {
		const x = (k - 3) * 24;
		poly([
			{ x: x - 9, y: -118, z: 0 },
			{ x: x + 9, y: -118, z: 0 },
			{ x: x + 9, y: -148, z: 0 },
			{ x: x - 9, y: -148, z: 0 },
		]);
		ctx.fillStyle = css([4, 5, 7]);
		ctx.fill();
		poly([
			{ x: x - 6, y: -124, z: -3 },
			{ x: x + 6, y: -124, z: -3 },
			{ x: x + 6, y: -146, z: -3 },
			{ x: x - 6, y: -146, z: -3 },
		]);
		const c0 = P({ x, y: -124, z: -3 });
		const c1 = P({ x, y: -146, z: -3 });
		const cg = ctx.createLinearGradient(c0.x, c0.y, c1.x, c1.y);
		cg.addColorStop(0, css([150, 120, 64]));
		cg.addColorStop(1, css([214, 178, 100]));
		ctx.fillStyle = cg;
		ctx.fill();
		const l0 = P({ x: x - 9, y: -118, z: 0 });
		const l1 = P({ x: x + 9, y: -118, z: 0 });
		ctx.strokeStyle = 'rgba(200,210,214,0.45)';
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(l0.x, l0.y);
		ctx.lineTo(l1.x, l1.y);
		ctx.stroke();
	}
	// wear: fine speckle over the face, and edges darkened with handling
	const speck = rng(4040);
	for (let k = 0; k < 160; k++) {
		const a = speck() * Math.PI * 2;
		const d = Math.sqrt(speck()) * (TR - BEVEL - 6);
		const q = P({ x: Math.cos(a) * d, y: Math.sin(a) * d * 0.94, z: 1 });
		ctx.fillStyle = speck() < 0.5 ? 'rgba(220,228,232,0.07)' : 'rgba(0,0,0,0.18)';
		ctx.fillRect(q.x, q.y, 1.4, 1.4);
	}
	poly(inset);
	ctx.strokeStyle = 'rgba(0,0,0,0.35)';
	ctx.lineWidth = 7;
	ctx.stroke();
	// the window: its ring, then what is inside, then its glass
	const circle = (R: number, z: number) => {
		ctx.beginPath();
		for (let k = 0; k <= 48; k++) {
			const a = (k / 48) * Math.PI * 2;
			const q = P({ x: Math.cos(a) * R, y: Math.sin(a) * R + 8, z });
			if (k) ctx.lineTo(q.x, q.y);
			else ctx.moveTo(q.x, q.y);
		}
		ctx.closePath();
	};
	circle(WIN_R + 12, 1);
	const w0 = P({ x: -WIN_R, y: WIN_R, z: 0 });
	const w1 = P({ x: WIN_R, y: -WIN_R, z: 0 });
	const wg = ctx.createLinearGradient(w0.x, w0.y, w1.x, w1.y);
	wg.addColorStop(0, css([24, 26, 30]));
	wg.addColorStop(1, css([186, 192, 196]));
	ctx.fillStyle = wg;
	ctx.fill();
	circle(WIN_R, -4);
	ctx.fillStyle = css([4, 8, 10]);
	ctx.fill();
	ctx.globalAlpha = 1;
	drawCore(() => {
		circle(WIN_R, -4);
		ctx.clip();
	});
	ctx.globalAlpha = alpha;
	ctx.save();
	circle(WIN_R, -4);
	ctx.clip();
	const s0 = P({ x: 0, y: WIN_R, z: 0 });
	const s1 = P({ x: 0, y: -WIN_R, z: 0 });
	const sg = ctx.createLinearGradient(s0.x, s0.y, s1.x, s1.y);
	sg.addColorStop(0, 'rgba(255,255,255,0.18)');
	sg.addColorStop(0.4, 'rgba(255,255,255,0)');
	ctx.fillStyle = sg;
	ctx.fillRect(0, 0, W, H);
	ctx.restore();
	// the glint crossing the face
	const gl = ramp(T.glint[0], T.glint[1], t);
	if (gl > 0 && gl < 1) {
		ctx.save();
		poly(face);
		ctx.clip();
		const c = P({ x: 0, y: 0, z: 0 });
		const x = mix(c.x - 300, c.x + 300, gl);
		const lg = ctx.createLinearGradient(x - 26, c.y - 50, x + 26, c.y + 50);
		lg.addColorStop(0, 'rgba(255,255,255,0)');
		lg.addColorStop(0.5, 'rgba(255,255,255,0.34)');
		lg.addColorStop(1, 'rgba(255,255,255,0)');
		ctx.fillStyle = lg;
		ctx.fillRect(0, 0, W, H);
		ctx.restore();
	}
	ctx.globalAlpha = 1;
}

export function drawToken(ctx: Ctx, t: number, sec: number) {
	ground(ctx, { tint: [7, 9, 12], pool: mixRGB([24, 56, 72], [34, 70, 80], smooth(T.coil[0], T.chip[1], t)), poolR: W * 0.62 });
	motes(ctx, sec, [150, 186, 204], 'back', 0.8);

	// The plague's broken length, dimming away.
	const remnant = 1 - smooth(T.remnantOut[0], T.remnantOut[1], t);
	if (remnant > 0.01) {
		const h: Helix = { ...PLAGUE_HELIX, phase: 0.33 * (sec + 7), center: { x: 0, y: 0, z: 0 }, scale: 1 };
		drawHelix(ctx, plagueCam(11), h, (i) => {
			const L = plagueLook(i, 10.5, sec);
			return { ...L, alpha: L.alpha * remnant, fell: 0, ember: 0 };
		});
	}

	const coil = smooth(T.coil[0], T.coil[1], t);
	const chipIn = smooth(T.chip[0], T.chip[1], t);
	const turnP = smooth(T.turn[0], T.turn[1], t);
	const yaw = mix(-0.46, -0.27, turnP);
	const tilt = 0.36;
	const spin = 9 * easeIn(ramp(T.coil[0], T.coil[1], t)) + 1.2 * Math.max(0, t - T.coil[1]);
	const h: Helix = {
		pairs: PAIRS,
		rise: mix(29, 9, coil),
		radius: mix(100, 26, coil),
		phase: 0.33 * sec + spin,
		center: { x: 0, y: 0, z: 0 },
		scale: 1,
		curl: smooth(T.coil[0] + 0.2, T.coil[1], t),
		haze: [12, 18, 22],
		thin: coil,
	};
	const cam: Camera = { ...CAM, pitch: mix(CAM.pitch, 0, coil), roll: mix(CAM.roll, 0, coil) };

	// The coiled genome and its core, drawn where the window is once the chip is there.
	const drawGenome = () => {
		drawHelix(ctx, cam, h, (i) => tokenLook(i, t, sec));
		const core = smooth(T.coil[0] + 0.8, T.coil[1] + 0.3, t);
		if (core > 0.01) {
			glow(ctx, cam.cx, cam.cy, 180, CORE, 0.55 * core);
			glow(ctx, cam.cx, cam.cy, 95, [255, 255, 255], 0.85 * core * (0.85 + 0.15 * Math.sin(sec * 5)), 'core');
		}
	};

	// Points of light spiraling in, each onto its own place, each trailing a curved, fading streak.
	if (t > T.arrive[0] && t < T.arrive[1] + 1) lighter(ctx, () => {
		ctx.lineCap = 'round';
		for (let i = 0; i < PAIRS; i++) {
			const q = arrival(i, t);
			if (q <= 0 || q >= 1) continue;
			for (const strand of [0, 1] as const) {
				let prev: { x: number; y: number; s: number } | null = null;
				for (let k = 0; k < 10; k++) {
					const qq = q - k * 0.022;
					if (qq <= 0) break;
					const away = 1 - easeOut(qq);
					const pr = project(cam, strandPoint({ ...h, phase: h.phase + away * 5 }, i, strand, 1 + 2.8 * away));
					if (prev) {
						const fadeK = 1 - k / 10;
						ctx.strokeStyle = css([190, 232, 255], 0.55 * fadeK);
						ctx.lineWidth = 4.5 * pr.s * fadeK + 0.5;
						ctx.beginPath();
						ctx.moveTo(prev.x, prev.y);
						ctx.lineTo(pr.x, pr.y);
						ctx.stroke();
					} else {
						glow(ctx, pr.x, pr.y, 24 * pr.s, [190, 232, 255], 0.55);
						glow(ctx, pr.x, pr.y, 6 * pr.s, [255, 255, 255], 1, 'core');
					}
					prev = pr;
				}
			}
		}
	});

	if (chipIn > 0.01) {
		chip(ctx, t, yaw, tilt, mix(1.15, 1, easeOut(chipIn)), chipIn, (clip) => {
			ctx.save();
			if (chipIn > 0.5) clip();
			// seen through the window, the ring turns with the chip
			const c = project(CHIP_CAM, orient({ x: 0, y: 8, z: 0 }, yaw, tilt));
			ctx.translate(c.x, c.y);
			ctx.transform(Math.cos(yaw) * CHIP_CAM.zoom, 0, 0, Math.cos(tilt) * CHIP_CAM.zoom, 0, 0);
			ctx.translate(-cam.cx, -cam.cy);
			drawGenome();
			ctx.restore();
		});
		const seal = Math.exp(-Math.pow((t - T.seal) / 0.16, 2));
		if (seal > 0.02) {
			glow(ctx, W / 2, H / 2, 240, [230, 255, 248], 0.7 * seal, 'core');
			glow(ctx, W / 2, H / 2, 420, CORE, 0.35 * seal);
		}
	} else if (t > T.arrive[0]) drawGenome();

	motes(ctx, sec, [170, 196, 210], 'front', 0.7);
	vignette(ctx, 0.8);
	const fade = loopFade(t, TOKEN_LOOP);
	if (fade < 1) {
		ctx.globalCompositeOperation = 'source-over';
		ctx.fillStyle = `rgba(0,0,0,${(1 - fade).toFixed(3)})`;
		ctx.fillRect(0, 0, W, H);
	}
}
