// The home story's Generators figure (docs/design/home-story-figures.md): beats 02 and 03 as one drawing
// that runs on from one beat into the next.
//
//   02  A later model of the Genesis Prototype from 01 stands still while worlds pass behind it (storm, lava,
//       ice, sea). At each one its sensor ring reads the world, the vat's gel takes the world's light, and the
//       seeds of life floating in the vat take on forms suited to it. Nothing leaves the machine: life
//       spreading out of a Generator belongs to Floria's scene alone (Nick, 2026-09-28).
//   03  APEX. The machine's lights dip, the view pulls back to more Generators, each on its own world with dark
//       space between, and APEX resolves over them as a transmitted image, a signal rather than a thing: torn
//       scan rows, split color, no body and no light falling on anything (Nick, 2026-09-29). Links snap from it
//       to every Generator in view. Where a link lands the machine stops reading its world, and the seeds in
//       its vat line up and pulse on APEX's beat.
//
// The lore dates none of it: the histories only say the galaxy's Generators were built after the prototype.
// Generators sensing their surroundings is theirs (Phantiri, Endessa); QED linking APEX to the Generators is
// Zolton's; the seeds' shapes are art. Two Generators were never linked (Endessa's, Phantiri's); neither is
// shown here.
//
// Drawn in its own units, 960 by 540, scaled onto the stage (W by H). No state but the figure's clocks.
import { blot, clamp, css, easeOut, glow, grain, H, lighter, mix, mixRGB, ramp, rng, smooth, W, type Ctx, type RGB } from './stage';
import type { Figure } from './figures';

const PW = 960;
const PH = 540;
const TAU = Math.PI * 2;
const ease = (v: number) => {
	const c = clamp(v);
	return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
};
const hash = (a: number, b = 0) => {
	const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
	return v - Math.floor(v);
};
const WHITE: RGB = [255, 255, 255];
const BLACK: RGB = [0, 0, 0];
const VIOLET: RGB = [172, 124, 255];
const SPACE: RGB = [8, 7, 13];
/** APEX's beat, in seconds: the pulse the taken machines keep. */
const BEAT = 0.55;

/* ------------------------------------------------------------------ the worlds */

type WorldKey = 'storm' | 'lava' | 'ice' | 'sea';
type World = { key: WorldKey; sky: [RGB, RGB]; land: RGB; gel: RGB; seam: RGB };
const WORLDS: World[] = [
	{ key: 'storm', sky: [[70, 62, 60], [20, 20, 26]], land: [30, 26, 24], gel: [236, 190, 110], seam: [255, 214, 150] },
	{ key: 'lava', sky: [[86, 28, 16], [20, 8, 8]], land: [18, 10, 9], gel: [255, 120, 56], seam: [255, 170, 90] },
	{ key: 'ice', sky: [[140, 170, 190], [44, 64, 82]], land: [96, 128, 150], gel: [140, 214, 255], seam: [220, 240, 255] },
	{ key: 'sea', sky: [[40, 76, 96], [10, 20, 32]], land: [12, 30, 44], gel: [80, 196, 210], seam: [160, 230, 240] },
];
/** The Genesis Prototype's green: the vat's first light, a nod back to Floria. */
const GENESIS: RGB = [150, 236, 140];
/** A world every PER seconds, the first change at FIRST; each crosses into the next over CROSS. */
const PER = 2.7;
const FIRST = 1.6;
const CROSS = 0.5;
const GROUND = 438;

function worldState(t: number) {
	if (t < FIRST) return { cur: 0, prev: -1, k: 1, since: t - 0.6 };
	const i = Math.floor((t - FIRST) / PER);
	const e = t - FIRST - i * PER;
	return { cur: (i + 1) % 4, prev: i % 4, k: ease(e / CROSS), since: e - CROSS * 0.3 };
}

const LAYERS = (() => {
	const r = rng(41);
	return {
		storm: {
			clouds: Array.from({ length: 16 }, () => ({ x: r() * 1100 - 70, y: 40 + r() * 230, rx: 90 + r() * 140, ry: 26 + r() * 40, sp: 6 + r() * 12, dark: r() })),
			islands: Array.from({ length: 5 }, (_, k) => ({ x: 80 + k * 200 + r() * 60, y: 190 + r() * 100, w: 40 + r() * 60 })),
			mesa: Array.from({ length: 12 }, (_, k) => [k * 95 - 60, GROUND - 4 - r() * 26] as [number, number]),
			bolt: Array.from({ length: 9 }, () => [(r() - 0.5) * 40, 30 + r() * 20] as [number, number]),
		},
		lava: {
			cones: Array.from({ length: 5 }, (_, k) => ({ x: 70 + k * 210 + r() * 60, h: 60 + r() * 90, w: 110 + r() * 80 })),
			rivers: Array.from({ length: 6 }, () => {
				const x = r() * 960;
				return Array.from({ length: 6 }, (_, j) => [x + (r() - 0.5) * 60 + j * (r() - 0.5) * 30, GROUND + 6 + j * 16] as [number, number]);
			}),
			ash: Array.from({ length: 50 }, () => ({ x: r() * 1000, sp: 8 + r() * 20, ph: r() * 500, s: r() })),
		},
		ice: {
			peaks: Array.from({ length: 9 }, (_, k) => ({ x: -40 + k * 125 + r() * 50, h: 70 + r() * 110, w: 70 + r() * 60 })),
			shards: Array.from({ length: 12 }, () => ({ x: r() * 980, h: 12 + r() * 34, w: 8 + r() * 14 })),
			snow: Array.from({ length: 70 }, () => ({ x: r() * 1100, sp: 14 + r() * 22, ph: r() * 600, s: 0.5 + r() })),
		},
		sea: {
			bands: Array.from({ length: 6 }, (_, k) => ({ y: GROUND - 56 + k * 22, a: 5 + k * 3, f: 0.018 - k * 0.0018, sp: 0.8 + k * 0.3 })),
			rain: Array.from({ length: 80 }, () => ({ x: r() * 1100, sp: 300 + r() * 160, ph: r() * 600 })),
		},
	};
})();

/** One world, its layers shifted by `shift` (near layers more: parallax as one world gives way to the next). */
function drawWorld(ctx: Ctx, wi: number, shift: number, sec: number, a: number) {
	if (a <= 0.01) return;
	const w = WORLDS[wi];
	const far = shift * 0.35;
	const near = shift;
	ctx.save();
	ctx.globalAlpha = a;
	const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
	sky.addColorStop(0, css(w.sky[1]));
	sky.addColorStop(1, css(w.sky[0]));
	ctx.fillStyle = sky;
	ctx.fillRect(-80, -20, PW + 160, GROUND + 22);
	const land = ctx.createLinearGradient(0, GROUND, 0, PH);
	land.addColorStop(0, css(w.land));
	land.addColorStop(1, css(mixRGB(w.land, BLACK, 0.8)));
	ctx.fillStyle = land;
	ctx.fillRect(-80, GROUND, PW + 160, PH - GROUND + 20);
	if (w.key === 'storm') {
		const L = LAYERS.storm;
		// banks of slate cloud, driven across
		for (const c of L.clouds) {
			const x = ((((c.x + sec * c.sp + far) % 1200) + 1200) % 1200) - 120;
			blot(ctx, x, c.y, c.rx, c.ry, 0, mixRGB([60, 62, 74], [20, 20, 28], c.dark), 0.55 * a);
		}
		// a fork of lightning now and then, and the sky flaring with it
		const cyc = sec % 1.2;
		const fl = cyc < 0.16 ? (cyc < 0.05 || (cyc > 0.09 && cyc < 0.13) ? 1 : 0.3) : 0;
		if (fl > 0) {
			const bx = far + 200 + hash(Math.floor(sec / 1.2)) * 560;
			lighter(ctx, () => glow(ctx, bx, 120, 360, [220, 220, 255], 0.3 * fl * a));
			ctx.strokeStyle = css([235, 238, 255], 0.9 * fl * a);
			ctx.lineWidth = 2;
			ctx.beginPath();
			let x = bx;
			let y = 60;
			ctx.moveTo(x, y);
			for (const [dx, dy] of L.bolt) {
				x += dx;
				y += dy;
				ctx.lineTo(x, y);
			}
			ctx.stroke();
		}
		for (const s of L.islands) {
			const x = far + s.x;
			const y = s.y + Math.sin(sec * 0.6 + s.x) * 4;
			// a floating rock: a flat, lit top and a broken underside
			ctx.fillStyle = css([34, 30, 30], 0.95 * a);
			ctx.beginPath();
			ctx.moveTo(x - s.w / 2, y);
			ctx.lineTo(x + s.w / 2, y + 2);
			ctx.lineTo(x + s.w * 0.38, y + s.w * 0.16);
			ctx.lineTo(x + s.w * 0.16, y + s.w * 0.22);
			ctx.lineTo(x + s.w * 0.05, y + s.w * 0.42);
			ctx.lineTo(x - s.w * 0.12, y + s.w * 0.26);
			ctx.lineTo(x - s.w * 0.36, y + s.w * 0.18);
			ctx.closePath();
			ctx.fill();
			ctx.strokeStyle = css([240, 200, 150], 0.35 * a);
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.moveTo(x - s.w / 2, y);
			ctx.lineTo(x + s.w / 2, y + 2);
			ctx.stroke();
		}
		ctx.fillStyle = css([26, 23, 22]);
		ctx.beginPath();
		ctx.moveTo(near - 80, PH + 20);
		for (const [x, y] of L.mesa) ctx.lineTo(near + x, y);
		ctx.lineTo(near + 1100, PH + 20);
		ctx.closePath();
		ctx.fill();
		ctx.strokeStyle = css([200, 205, 220], 0.3 * a);
		ctx.lineWidth = 1;
		ctx.beginPath();
		for (let k = 0; k < 60; k++) {
			const y = ((sec * (360 + hash(k) * 120) + hash(k, 2) * 600) % 520) - 20;
			const x = near + hash(k, 3) * 1060 - 50 - y * 0.35;
			ctx.moveTo(x, y);
			ctx.lineTo(x - 5, y + 14);
		}
		ctx.stroke();
		ctx.strokeStyle = css([230, 220, 210], 0.14 * a);
		ctx.beginPath();
		for (let k = 0; k < 14; k++) {
			const y = 80 + k * 24;
			const x = ((sec * (190 + k * 20) + k * 137) % 1300) - 200 + near;
			ctx.moveTo(x, y);
			ctx.lineTo(x + 80, y + 4);
		}
		ctx.stroke();
	}
	if (w.key === 'lava') {
		const L = LAYERS.lava;
		for (const c of L.cones) {
			const x = far + c.x;
			ctx.fillStyle = css([24, 11, 9]);
			ctx.beginPath();
			ctx.moveTo(x - c.w, GROUND);
			ctx.lineTo(x - 12, GROUND - c.h);
			ctx.lineTo(x + 12, GROUND - c.h);
			ctx.lineTo(x + c.w, GROUND);
			ctx.closePath();
			ctx.fill();
		}
		lighter(ctx, () => {
			for (const c of L.cones) glow(ctx, far + c.x, GROUND - c.h, 70, [255, 110, 40], 0.55 * a);
		});
		ctx.lineCap = 'round';
		for (const [lw, col, al] of [[14, [150, 40, 10], 0.25], [6, [210, 70, 20], 0.85], [2.5, [255, 205, 120], 0.95]] as const) {
			ctx.lineWidth = lw;
			ctx.strokeStyle = css(col as unknown as RGB, al * a);
			L.rivers.forEach((rv, ri) => {
				ctx.beginPath();
				// broken into seams: every third stretch stays crust
				for (let j = 1; j < rv.length; j++) {
					if ((j + ri) % 3 === 0) continue;
					ctx.moveTo(near + rv[j - 1][0], rv[j - 1][1]);
					ctx.lineTo(near + rv[j][0], rv[j][1]);
				}
				ctx.stroke();
			});
		}
		ctx.lineCap = 'butt';
		lighter(ctx, () => {
			for (const rv of L.rivers) for (const [x, y] of rv) glow(ctx, near + x, y, 22, [255, 110, 40], 0.3 * a);
			for (const p of L.ash) {
				const y = GROUND - ((sec * p.sp + p.ph) % 420);
				glow(ctx, near * 0.8 + p.x + Math.sin(sec + p.ph) * 10, y, 3 + p.s * 2.5, [255, 150, 80], 0.7 * p.s * a, 'core');
			}
		});
	}
	if (w.key === 'ice') {
		const L = LAYERS.ice;
		lighter(ctx, () => glow(ctx, far + 300, 60, 380, [180, 255, 230], (0.12 + 0.05 * Math.sin(sec * 0.5)) * a));
		// peaks with a lit face and a shadowed one
		for (const p of L.peaks) {
			const x = far + p.x;
			ctx.fillStyle = css([200, 225, 240], a);
			ctx.beginPath();
			ctx.moveTo(x - p.w, GROUND);
			ctx.lineTo(x, GROUND - p.h);
			ctx.lineTo(x + p.w * 0.1, GROUND);
			ctx.closePath();
			ctx.fill();
			ctx.fillStyle = css([110, 150, 176], a);
			ctx.beginPath();
			ctx.moveTo(x, GROUND - p.h);
			ctx.lineTo(x + p.w, GROUND);
			ctx.lineTo(x + p.w * 0.1, GROUND);
			ctx.closePath();
			ctx.fill();
		}
		for (const s of L.shards) {
			const x = near + s.x;
			ctx.fillStyle = css([223, 243, 255], a);
			ctx.beginPath();
			ctx.moveTo(x - s.w, GROUND + 2);
			ctx.lineTo(x, GROUND - s.h);
			ctx.lineTo(x, GROUND + 2);
			ctx.closePath();
			ctx.fill();
			ctx.fillStyle = css([122, 166, 194], a);
			ctx.beginPath();
			ctx.moveTo(x, GROUND - s.h);
			ctx.lineTo(x + s.w, GROUND + 2);
			ctx.lineTo(x, GROUND + 2);
			ctx.closePath();
			ctx.fill();
		}
		lighter(ctx, () => {
			for (const f of L.snow) {
				const y = (sec * f.sp + f.ph) % 520;
				glow(ctx, near * 0.9 + f.x - y * 0.15 + Math.sin(sec + f.ph) * 8, y, 1.8 * f.s, [240, 248, 255], 0.55 * a, 'core');
			}
		});
	}
	if (w.key === 'sea') {
		const L = LAYERS.sea;
		lighter(ctx, () => glow(ctx, 480 + far, GROUND - 70, 420, [120, 200, 220], 0.16 * a));
		L.bands.forEach((b, k) => {
			const top = (x: number) => b.y + Math.sin((x - near * b.sp) * b.f + sec * b.sp) * b.a;
			ctx.fillStyle = css(mixRGB([22, 56, 76], [8, 22, 34], k / 5), a);
			ctx.beginPath();
			ctx.moveTo(-80, PH + 20);
			for (let x = -80; x <= PW + 80; x += 10) ctx.lineTo(x, top(x));
			ctx.lineTo(PW + 80, PH + 20);
			ctx.closePath();
			ctx.fill();
			ctx.strokeStyle = css([170, 230, 245], (0.35 - k * 0.04) * a);
			ctx.lineWidth = 1.4;
			ctx.beginPath();
			for (let x = -80; x <= PW + 80; x += 10) (x > -80 ? ctx.lineTo(x, top(x)) : ctx.moveTo(x, top(x)));
			ctx.stroke();
		});
		ctx.strokeStyle = css([190, 220, 240], 0.35 * a);
		ctx.lineWidth = 1;
		ctx.beginPath();
		for (const d of L.rain) {
			const y = ((sec * d.sp + d.ph) % 560) - 20;
			const x = near + d.x - y * 0.18;
			ctx.moveTo(x, y);
			ctx.lineTo(x - 3, y + 14);
		}
		ctx.stroke();
	}
	ctx.restore();
}

/* ------------------------------------------------------------------ the Generator */
// Kept from Floria's Genesis Prototype: the riveted steel housing, the tall capsule vat with its straps, seeds
// of life dark against the glow, the side box and its gauge, the roof pipe. Changed with time: cleaner
// plating with lit seams, a sensor ring on a mast in place of the open lattice tower, an intake grille that
// glows as it reads, a life-signs readout, a standing pad. No chute.

const MX = 480;
const VX = 480;
const VY0 = 196;
const VY1 = 404;
const VR = 42;
const DISH = { x: MX - 20, y: 104 };

/** A steel plate: lit from above and from the vat side, a dark edge and a thin highlight on its top and left. */
function plate(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, light: RGB, a: number) {
	const g = ctx.createLinearGradient(x0, 0, x1, 0);
	g.addColorStop(0, css([26, 30, 32], a));
	g.addColorStop(0.55, css([48, 54, 56], a));
	g.addColorStop(1, css(mixRGB([34, 38, 40], light, 0.14), a));
	ctx.fillStyle = g;
	ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
	const v = ctx.createLinearGradient(0, y0, 0, y1);
	v.addColorStop(0, css(WHITE, 0.07 * a));
	v.addColorStop(0.5, css(WHITE, 0));
	v.addColorStop(1, css(BLACK, 0.3 * a));
	ctx.fillStyle = v;
	ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
	ctx.strokeStyle = css([6, 8, 9], 0.9 * a);
	ctx.lineWidth = 1;
	ctx.strokeRect(x0 + 0.5, y0 + 0.5, x1 - x0 - 1, y1 - y0 - 1);
	ctx.strokeStyle = css(mixRGB([200, 206, 200], light, 0.3), 0.18 * a);
	ctx.beginPath();
	ctx.moveTo(x0 + 1.5, y1 - 2);
	ctx.lineTo(x0 + 1.5, y0 + 1.5);
	ctx.lineTo(x1 - 2, y0 + 1.5);
	ctx.stroke();
}

function rivets(ctx: Ctx, pts: [number, number][], light: RGB, a: number) {
	for (const [x, y] of pts) {
		ctx.fillStyle = css([12, 14, 16], a);
		ctx.beginPath();
		ctx.arc(x, y, 2, 0, TAU);
		ctx.fill();
		ctx.fillStyle = css(mixRGB([150, 156, 152], light, 0.3), 0.7 * a);
		ctx.beginPath();
		ctx.arc(x - 0.6, y - 0.7, 0.9, 0, TAU);
		ctx.fill();
	}
}

function vatPath(ctx: Ctx) {
	ctx.beginPath();
	ctx.moveTo(VX - VR, VY0 + VR);
	ctx.arc(VX, VY0 + VR, VR, Math.PI, 0);
	ctx.lineTo(VX + VR, VY1 - VR);
	ctx.arc(VX, VY1 - VR, VR, 0, Math.PI);
	ctx.closePath();
}

type SeedKind = WorldKey | 'genesis' | 'apex';
// A seed's outline, its radius at angle `th` (y down), for each kind of world: silhouettes that read apart.
function seedR(kind: SeedKind, th: number) {
	const up = Math.sin(th) < 0; // the upper half
	if (kind === 'storm') {
		// winged: a narrow lens with two thin fins swept back
		const a = 1.3;
		const b = 0.42;
		const lens = (a * b) / Math.sqrt(Math.pow(b * Math.cos(th), 2) + Math.pow(a * Math.sin(th), 2));
		const fin = (d: number) => 0.75 * Math.exp(-Math.pow(d / 0.1, 2));
		const w = (x: number) => Math.atan2(Math.sin(x), Math.cos(x));
		return lens + fin(w(th - 2.55)) + fin(w(th - 3.73));
	}
	if (kind === 'lava') {
		// armored: a hexagon of plates
		const s = ((th % (Math.PI / 3)) + Math.PI / 3) % (Math.PI / 3);
		return 0.95 / Math.cos(s - Math.PI / 6);
	}
	if (kind === 'ice') return 0.45 + 0.75 * Math.pow(Math.abs(Math.cos(3 * th)), 6); // spiked: six sharp points
	if (kind === 'sea') return up ? 1 : Math.min(1.12, 0.42 / Math.max(0.2, Math.abs(Math.sin(th)))) * (1 + 0.1 * Math.abs(Math.sin(8 * th))); // a bell: a dome with a scalloped hem
	if (kind === 'apex') return 0.8; // all the same
	return 1 + 0.12 * Math.cos(2 * th) - 0.22 * Math.sin(th); // Genesis: the acorn-like seed
}
const SEEDS = Array.from({ length: 7 }, (_, k) => ({ x: (hash(k, 1) - 0.5) * 34, y: VY0 + 40 + k * 26 + (hash(k, 2) - 0.5) * 8, r: 11 + hash(k, 3) * 3, ph: hash(k, 4) * TAU, sp: 0.6 + hash(k, 5) * 0.5, tilt: (hash(k, 6) - 0.5) * 0.5 }));

function ecg(ph: number) {
	const p = ((ph % 1) + 1) % 1;
	if (p < 0.08) return Math.sin((p / 0.08) * Math.PI) * 0.12;
	if (p < 0.12) return 0;
	if (p < 0.15) return -((p - 0.12) / 0.03) * 0.25;
	if (p < 0.19) return -0.25 + ((p - 0.15) / 0.04) * 1.25;
	if (p < 0.23) return 1 - ((p - 0.19) / 0.04) * 1.35;
	if (p < 0.27) return -0.35 + ((p - 0.23) / 0.04) * 0.35;
	return 0;
}

type MachineLook = {
	sec: number;
	gel: RGB;
	light: RGB;
	a: number;
	kindA: SeedKind;
	kindB: SeedKind;
	km: number;
	/** 0 to 1: how far APEX holds it. */
	apex: number;
	beatPulse: number;
	reading: number;
	dishCol: RGB;
	needle: number;
};

function drawMachine(ctx: Ctx, S: MachineLook) {
	const { sec, gel, light, a, apex, beatPulse, reading, dishCol } = S;
	ctx.save();
	// its shadow on the ground, and the pad with its lamps
	ctx.fillStyle = css(BLACK, 0.6 * a);
	ctx.beginPath();
	ctx.ellipse(MX, GROUND + 14, 200, 16, 0, 0, TAU);
	ctx.fill();
	ctx.fillStyle = css([18, 20, 22], a);
	ctx.beginPath();
	ctx.moveTo(MX - 176, GROUND + 18);
	ctx.lineTo(MX - 150, GROUND - 2);
	ctx.lineTo(MX + 150, GROUND - 2);
	ctx.lineTo(MX + 176, GROUND + 18);
	ctx.closePath();
	ctx.fill();
	ctx.strokeStyle = css(mixRGB([120, 126, 124], light, 0.3), 0.5 * a);
	ctx.lineWidth = 1.2;
	ctx.beginPath();
	ctx.moveTo(MX - 150, GROUND - 2);
	ctx.lineTo(MX + 150, GROUND - 2);
	ctx.stroke();
	lighter(ctx, () => {
		for (let k = 0; k < 7; k++) glow(ctx, MX - 132 + k * 44, GROUND + 8, 7, mixRGB(gel, WHITE, 0.3), 0.8 * a * (0.6 + 0.4 * Math.sin(sec * 2 + k)), 'core');
	});
	// the side box and its gauge
	plate(ctx, MX - 150, 300, MX - 104, GROUND - 2, light, a);
	ctx.fillStyle = css([10, 12, 13], a);
	ctx.beginPath();
	ctx.arc(MX - 127, 330, 14, 0, TAU);
	ctx.fill();
	ctx.strokeStyle = css([160, 164, 158], 0.7 * a);
	ctx.lineWidth = 1.5;
	ctx.stroke();
	ctx.strokeStyle = css(mixRGB(gel, WHITE, 0.4), 0.95 * a);
	ctx.beginPath();
	ctx.moveTo(MX - 127, 330);
	ctx.lineTo(MX - 127 + Math.cos(S.needle) * 11, 330 + Math.sin(S.needle) * 11);
	ctx.stroke();
	ctx.fillStyle = css([60, 66, 66], a);
	for (let k = 0; k < 5; k++) ctx.fillRect(MX - 144, 360 + k * 13, 34, 3);
	// the intake, glowing with the world it reads, and the life-signs readout above it
	plate(ctx, MX + 104, 250, MX + 152, GROUND - 2, light, a);
	for (let k = 0; k < 9; k++) {
		const y = 318 + k * 12;
		const rd = reading * (0.5 + 0.5 * Math.sin(sec * 6 - k * 0.7));
		ctx.fillStyle = css(mixRGB([22, 26, 26], dishCol, 0.7 * rd), a);
		ctx.fillRect(MX + 112, y, 32, 5);
	}
	if (reading > 0.05) lighter(ctx, () => glow(ctx, MX + 128, 366, 56, dishCol, 0.35 * reading * a));
	ctx.fillStyle = css([6, 10, 10], a);
	ctx.fillRect(MX + 110, 262, 36, 40);
	ctx.strokeStyle = css([110, 116, 112], 0.7 * a);
	ctx.lineWidth = 1;
	ctx.strokeRect(MX + 110.5, 262.5, 35, 39);
	ctx.strokeStyle = css(mixRGB(gel, VIOLET, apex), 0.9 * a);
	ctx.lineWidth = 1.2;
	ctx.beginPath();
	for (let q = 0; q <= 32; q++) {
		const ph = sec * 1.1 - (1 - q / 32) * 1.1;
		const square = ((ph % 0.5) + 0.5) % 0.5 < 0.1 ? 1 : 0;
		const v = mix(ecg(ph), square * 0.8, apex);
		if (q) ctx.lineTo(MX + 112 + q, 286 - v * 13);
		else ctx.moveTo(MX + 112 + q, 286 - v * 13);
	}
	ctx.stroke();
	// the housing, its seams and rivets
	plate(ctx, MX - 104, 170, MX + 104, GROUND - 2, light, a);
	ctx.strokeStyle = css([8, 10, 11], 0.85 * a);
	ctx.beginPath();
	for (const x of [MX - 64, MX + 64]) {
		ctx.moveTo(x, 172);
		ctx.lineTo(x, GROUND - 4);
	}
	for (const y of [214, 392]) {
		ctx.moveTo(MX - 102, y);
		ctx.lineTo(MX - 60, y);
		ctx.moveTo(MX + 60, y);
		ctx.lineTo(MX + 102, y);
	}
	ctx.stroke();
	rivets(ctx, [...[178, 206, 222, 384, 400, 428].flatMap((y) => [[MX - 96, y], [MX + 96, y]] as [number, number][]), ...[-86, -76, 76, 86].flatMap((dx) => [[MX + dx, 178], [MX + dx, 428]] as [number, number][])], light, a);
	// the vat's light falling on the plates round it
	ctx.save();
	ctx.beginPath();
	ctx.rect(MX - 104, 170, 208, GROUND - 172);
	ctx.clip();
	const spill = ctx.createRadialGradient(VX, 300, 20, VX, 300, 170);
	spill.addColorStop(0, css(gel, 0.3 * a));
	spill.addColorStop(1, css(gel, 0));
	ctx.fillStyle = spill;
	ctx.fillRect(MX - 104, 170, 208, GROUND - 172);
	ctx.restore();
	// the roof, its pipe and the sensor mast
	plate(ctx, MX - 70, 140, MX + 70, 170, light, a);
	ctx.strokeStyle = css([100, 106, 104], 0.8 * a);
	ctx.lineWidth = 5;
	ctx.beginPath();
	ctx.moveTo(MX + 50, 140);
	ctx.lineTo(MX + 50, 124);
	ctx.quadraticCurveTo(MX + 50, 114, MX + 62, 114);
	ctx.lineTo(MX + 74, 114);
	ctx.stroke();
	ctx.lineWidth = 3;
	ctx.strokeStyle = css([120, 126, 124], 0.9 * a);
	ctx.beginPath();
	ctx.moveTo(DISH.x, 140);
	ctx.lineTo(DISH.x, 112);
	ctx.stroke();
	// the sensor ring: it reads the world (and, taken, answers to APEX)
	ctx.strokeStyle = css(mixRGB([170, 176, 170], dishCol, 0.6), 0.95 * a);
	ctx.lineWidth = 2.4;
	ctx.beginPath();
	ctx.ellipse(DISH.x, DISH.y, 18, 7, 0, 0, TAU);
	ctx.stroke();
	lighter(ctx, () => {
		glow(ctx, DISH.x, DISH.y, 30, dishCol, 0.6 * a * (0.4 + 0.6 * reading));
		glow(ctx, DISH.x, DISH.y, 6, WHITE, a, 'core');
	});
	if (reading > 0.02) {
		ctx.lineWidth = 1.4;
		for (let k = 0; k < 3; k++) {
			const u = (sec * 0.9 + k / 3) % 1;
			const rr = 18 + u * 150;
			ctx.strokeStyle = css(dishCol, 0.45 * (1 - u) * reading * a);
			ctx.beginPath();
			ctx.ellipse(DISH.x, DISH.y, rr, rr * 0.38, 0, 0, TAU);
			ctx.stroke();
		}
	}
	// the vat
	ctx.save();
	vatPath(ctx);
	ctx.clip();
	const vg = ctx.createLinearGradient(0, VY0, 0, VY1);
	vg.addColorStop(0, css(mixRGB(gel, WHITE, 0.25), 0.95 * a));
	vg.addColorStop(0.6, css(gel, 0.9 * a));
	vg.addColorStop(1, css(mixRGB(gel, BLACK, 0.45), 0.95 * a));
	ctx.fillStyle = vg;
	ctx.fillRect(VX - VR, VY0, VR * 2, VY1 - VY0);
	ctx.strokeStyle = css(WHITE, 0.35 * a);
	ctx.lineWidth = 1;
	for (let b = 0; b < 12; b++) {
		const by = VY1 - ((sec * (18 + hash(b) * 20) * (1 - 0.9 * apex) + hash(b, 2) * 300) % (VY1 - VY0));
		ctx.beginPath();
		ctx.arc(VX + (hash(b, 3) - 0.5) * 60, by, 1.4 + hash(b, 4) * 2, 0, TAU);
		ctx.stroke();
	}
	// the seeds of life, dark against the glow: drifting and shaped for the world, or lined up under APEX
	SEEDS.forEach((s, k) => {
		const free = 1 - apex;
		const bx = s.x + Math.sin(sec * s.sp + s.ph) * 5 * free;
		const by = s.y + Math.cos(sec * s.sp * 0.8 + s.ph) * 4 * free;
		const x = mix(VX + bx, VX, apex);
		const y = mix(by, VY0 + 38 + k * 26, apex);
		const rot = mix(s.tilt + Math.sin(sec * 0.4 * s.sp + s.ph) * 0.25, 0, apex);
		const r = mix(s.r, 8, apex) * (1 + 0.14 * beatPulse * apex);
		const fill = css(mixRGB(mixRGB(gel, BLACK, 0.78), [46, 22, 88], apex * 0.6), 0.95 * a);
		ctx.beginPath();
		for (let q = 0; q <= 40; q++) {
			const th = (q / 40) * TAU;
			// from one form to the next through a plain round, never a stretched blend of the two
			const through = S.km < 0.5 ? mix(seedR(S.kindA, th), 0.85, S.km * 2) : mix(0.85, seedR(S.kindB, th), S.km * 2 - 1);
			const rr = r * mix(through, seedR('apex', th), apex);
			const px = x + Math.cos(th + rot) * rr;
			const py = y + Math.sin(th + rot) * rr * 0.9;
			if (q) ctx.lineTo(px, py);
			else ctx.moveTo(px, py);
		}
		ctx.closePath();
		ctx.fillStyle = fill;
		ctx.fill();
		ctx.strokeStyle = css(mixRGB(mixRGB(gel, WHITE, 0.55), VIOLET, apex), 0.7 * a);
		ctx.lineWidth = 1;
		ctx.stroke();
	});
	// the glass's own sheen
	ctx.fillStyle = css(WHITE, 0.2 * a);
	ctx.fillRect(VX - VR + 7, VY0 + 26, 6, VY1 - VY0 - 52);
	ctx.restore();
	lighter(ctx, () => glow(ctx, VX, (VY0 + VY1) / 2, 170, gel, 0.3 * a));
	// the glass rim and its straps
	ctx.strokeStyle = css([60, 64, 62], 0.95 * a);
	ctx.lineWidth = 7;
	vatPath(ctx);
	ctx.stroke();
	ctx.strokeStyle = css([160, 168, 164], 0.8 * a);
	ctx.lineWidth = 2;
	vatPath(ctx);
	ctx.stroke();
	ctx.strokeStyle = css(mixRGB(gel, WHITE, 0.6), 0.5 * a);
	ctx.lineWidth = 1;
	vatPath(ctx);
	ctx.stroke();
	ctx.strokeStyle = css([90, 96, 94], 0.95 * a);
	ctx.lineWidth = 3;
	for (const y of [270, 340]) {
		ctx.beginPath();
		ctx.moveTo(VX - VR - 4, y);
		ctx.lineTo(VX + VR + 4, y);
		ctx.stroke();
	}
	ctx.restore();
}

/* ------------------------------------------------------------------ APEX */

const ORB = (() => {
	const n = 110;
	const p: [number, number, number][] = [];
	for (let k = 0; k < n; k++) {
		const y = 1 - (k / (n - 1)) * 2;
		const rr = Math.sqrt(1 - y * y);
		const th = k * 2.399963;
		p.push([Math.cos(th) * rr, y, Math.sin(th) * rr]);
	}
	const e: [number, number][] = [];
	p.forEach((a, i) =>
		p
			.map((b, j) => [j, Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])] as [number, number])
			.filter(([j]) => j > i)
			.sort((u, v) => u[1] - v[1])
			.slice(0, 3)
			.forEach(([j]) => e.push([i, j]))
	);
	return { p, e };
})();

// The lattice is drawn once per frame into three small canvases (its violet image and two color-split
// copies), then copied onto the figure a row at a time, torn and jittered: a transmitted image of a mind.
const lattice: { c: HTMLCanvasElement | null; m: HTMLCanvasElement | null; y: HTMLCanvasElement | null } = { c: null, m: null, y: null };
function latticeCanvas(which: 'c' | 'm' | 'y', w: number, h: number) {
	if (typeof document === 'undefined') return null;
	let c = lattice[which];
	if (!c) {
		c = document.createElement('canvas');
		lattice[which] = c;
	}
	if (c.width !== w || c.height !== h) {
		c.width = w;
		c.height = h;
	}
	return c;
}

/** When APEX's image is built, row by row behind a sweeping line, in seconds into 03. */
const BUILD: [number, number] = [2.0, 2.5];

function drawNet(ctx: Ctx, cx: number, cy: number, R: number, t3: number, a0: number, sec: number, beatPulse: number, labelPx: number) {
	const a = a0 * smooth(BUILD[0], BUILD[0] + 0.1, t3);
	if (a <= 0.01) return;
	const tf = ctx.getTransform();
	const f = clamp(Math.hypot(tf.a, tf.b), 0.5, 3);
	const pad = 12;
	const size = 2 * R + pad * 2;
	const px = Math.max(8, Math.round(size * f));
	const ry = sec * 0.18;
	const tx = 0.35;
	const P = ORB.p.map(([x, y, z]) => {
		const x1 = x * Math.cos(ry) + z * Math.sin(ry);
		const z1 = -x * Math.sin(ry) + z * Math.cos(ry);
		const y1 = y * Math.cos(tx) - z1 * Math.sin(tx);
		const z2 = y * Math.sin(tx) + z1 * Math.cos(tx);
		return [pad + R + x1 * R, pad + R + y1 * R, z2] as [number, number, number];
	});
	const paint = (which: 'c' | 'm' | 'y', col: RGB) => {
		const c = latticeCanvas(which, px, px);
		const g = c?.getContext('2d');
		if (!c || !g) return null;
		g.setTransform(1, 0, 0, 1, 0, 0);
		g.clearRect(0, 0, px, px);
		g.setTransform(f, 0, 0, f, 0, 0);
		g.lineWidth = 1.1;
		ORB.e.forEach(([i, j], k) => {
			const d = (P[i][2] + P[j][2]) / 2;
			const fl = Math.exp(-Math.pow(((sec * 1.3 + hash(k) * 11) % 3.1) - 0.1, 2) * 50) + beatPulse * 0.4;
			g.strokeStyle = css(mixRGB(col, WHITE, fl * 0.5), 0.35 + 0.4 * ((d + 1) / 2) + 0.3 * fl);
			g.beginPath();
			g.moveTo(P[i][0], P[i][1]);
			g.lineTo(P[j][0], P[j][1]);
			g.stroke();
		});
		g.fillStyle = css(mixRGB(col, WHITE, 0.45));
		for (const [x, y, z] of P) {
			const s = 1.6 + (z + 1) * 0.8;
			g.fillRect(x - s / 2, y - s / 2, s, s);
		}
		return c;
	};
	const main = paint('c', VIOLET);
	const mag = paint('m', [255, 80, 200]);
	const cyan = paint('y', [80, 220, 255]);
	if (!main) return;
	// the image arrives behind a sweeping line, row by row, then holds: torn rows, jitter, a split in its color
	const build = ramp(BUILD[0], BUILD[1], t3);
	const x0 = cx - R - pad;
	const y0 = cy - R - pad;
	const reveal = y0 + size * build;
	const rowH = 2;
	const jitterStep = Math.floor(sec / 0.08);
	const tearAt = Math.floor(sec / 1.2);
	const tearing = sec % 1.2 < 0.12;
	const tearRow = Math.floor(hash(tearAt, 5) * (size / rowH));
	// now and then the whole image rolls, as a picture held by a weak signal does
	const roll = sec % 2 < 0.1 ? 8 : 0;
	const copy = (img: HTMLCanvasElement, alpha: number, dx: number) => {
		ctx.globalAlpha = alpha;
		for (let r = 0, y = y0; y < y0 + size; r++, y += rowH) {
			if (r % 3 === 2 || y > reveal) continue;
			const edge = Math.abs(y - cy) / (R + pad);
			const keep = hash(r, jitterStep * 3 + 1) > 0.55 * Math.pow(edge, 2);
			if (!keep) continue;
			let off = (hash(r, jitterStep) - 0.5) * 6 * (1 - build * 0.5);
			if (tearing && r >= tearRow && r < tearRow + 5) off += 20;
			ctx.drawImage(img, 0, Math.round((y - y0) * f), img.width, Math.max(1, Math.round(rowH * f)), x0 + off + dx, y + roll, size, rowH);
		}
	};
	ctx.save();
	ctx.globalCompositeOperation = 'lighter';
	if (mag) copy(mag, 0.3 * a, -2.5);
	if (cyan) copy(cyan, 0.3 * a, 2.5);
	copy(main, 0.45 * a, 0);
	// the lattice itself, clean over its torn copy, once it has been built down to here
	ctx.save();
	ctx.beginPath();
	ctx.rect(x0 - 30, y0, size + 60, Math.max(0, reveal - y0));
	ctx.clip();
	ctx.globalAlpha = 0.7 * a;
	ctx.drawImage(main, x0, y0 + roll, size, size);
	ctx.restore();
	ctx.restore();
	// the sweeping line, and one flash over everything as the image completes
	if (build > 0 && build < 1) {
		ctx.save();
		ctx.fillStyle = css([201, 166, 255], 0.9 * a0);
		ctx.shadowColor = css([201, 166, 255], 1);
		ctx.shadowBlur = 12;
		ctx.fillRect(-40, reveal - 1, PW + 80, 2);
		ctx.restore();
	}
	const flash = Math.exp(-Math.pow((t3 - BUILD[1] - 0.04) / 0.05, 2));
	if (flash > 0.02) {
		ctx.fillStyle = css(VIOLET, 0.15 * flash * a0);
		ctx.fillRect(-40, -40, PW + 80, PH + 80);
	}
	// its name, once, small, the way an instrument carries its label
	const na = a0 * smooth(2.9, 3.4, t3);
	if (na > 0.01) {
		ctx.save();
		ctx.globalAlpha = na * 0.85;
		ctx.fillStyle = css(mixRGB(VIOLET, WHITE, 0.35));
		ctx.font = `600 ${labelPx}px "Martian Mono", ui-monospace, monospace`;
		ctx.textAlign = 'left';
		ctx.textBaseline = 'middle';
		if ('letterSpacing' in ctx) (ctx as Ctx & { letterSpacing: string }).letterSpacing = `${Math.round(labelPx * 0.3)}px`;
		ctx.fillText('APEX', cx + R + 18, cy);
		ctx.restore();
	}
}

/* ------------------------------------------------------------------ the figure */

/** When the links land (seconds into 03); each machine's seeds line up just after. */
const LINK = 2.7;
/** Our machine and more, each on its own world, once the view has pulled back: five, or three when small. */
const WIDE = { hub: { x: 480, y: 140, r: 96 }, label: 18, machines: [
	{ x: 480, g: 448, s: 0.4, wOff: 0, order: 0 },
	{ x: 290, g: 412, s: 0.3, wOff: 1, order: 1 },
	{ x: 670, g: 412, s: 0.3, wOff: 2, order: 2 },
	{ x: 150, g: 384, s: 0.22, wOff: 3, order: 3 },
	{ x: 810, g: 384, s: 0.22, wOff: 1, order: 4 },
] };
const COMPACT = { hub: { x: 480, y: 132, r: 104 }, label: 34, machines: [
	{ x: 480, g: 468, s: 0.56, wOff: 0, order: 0 },
	{ x: 190, g: 430, s: 0.44, wOff: 1, order: 1 },
	{ x: 770, g: 430, s: 0.44, wOff: 2, order: 2 },
] };
const STARS = (() => {
	const r = rng(3);
	return Array.from({ length: 90 }, (_, k) => ({ x: r() * PW, y: r() * PH * 0.8, k }));
})();

type Frozen = { kindA: SeedKind; kindB: SeedKind; km: number; gel: RGB };

export function createGenerators(): Figure {
	let stage = 0;
	let present = false;
	let vis = 0;
	/** 02's clock: the worlds' cycle. */
	let t2 = 0;
	/** 03's clock, from the moment it is entered. */
	let t3 = 0;
	/** How far into 03 it is drawn: eases in and back out, so Back runs 03 in reverse. */
	let v3 = 0;
	let frozen: Frozen | null = null;
	let world3: number | null = null;

	const arriveAt = () => v3 * ease(ramp(0.4, 2.0, t3));
	const anchor = () => ({ x: (480 * W) / PW, y: (mix(300, 350, arriveAt()) * H) / PH });

	return {
		stages: 2,
		reset(s) {
			stage = s;
			vis = 0;
			t2 = s === 0 ? 0 : FIRST + PER + 1.6;
			t3 = 0;
			v3 = 0;
			frozen = null;
			world3 = null;
		},
		settle(s) {
			stage = s;
			present = true;
			vis = 1;
			t2 = FIRST + PER + 1.6;
			t3 = s === 1 ? 9 : 0;
			v3 = s === 1 ? 1 : 0;
			frozen = null;
			world3 = null;
		},
		step(dt, s, isPresent) {
			if (s !== stage && s >= 0) {
				if (s === 1 && stage === 0) t3 = 0;
				stage = s;
			}
			present = isPresent;
			vis += ((present ? 1 : 0) - vis) * (1 - Math.exp(-dt * (present ? 2.6 : 7)));
			if (vis < 0.002 && !present) vis = 0;
			t2 += dt;
			if (stage === 1) t3 += dt;
			v3 += ((stage === 1 ? 1 : 0) - v3) * (1 - Math.exp(-dt * (stage === 1 ? 6 : 2.2)));
			if (v3 < 0.02 && stage !== 1) {
				frozen = null;
				world3 = null;
			}
		},
		visible: () => vis > 0.005,
		// APEX's arrival always plays through, even before its beat is live
		busy: (s, isPresent) => Math.abs((isPresent ? 1 : 0) - vis) > 0.004 || Math.abs((s === 1 ? 1 : 0) - v3) > 0.004 || (s === 1 && stage !== 1) || (s === 1 && isPresent && t3 < 4.5),
		anchor,
		light(): RGB {
			if (stage === 1) return VIOLET;
			const ws = worldState(t2);
			return t2 < FIRST ? GENESIS : WORLDS[ws.cur].gel;
		},
		draw(ctx, sec, opts) {
			if (vis <= 0.005) return;
			const L = opts?.compact ? COMPACT : WIDE;
			ctx.save();
			// bloom out of (and pull back into) the anchor
			const an = anchor();
			const bs = 0.12 + 0.88 * easeOut(vis);
			ctx.translate(an.x, an.y);
			ctx.scale(bs, bs);
			ctx.translate(-an.x, -an.y);
			ctx.scale(W / PW, H / PH);
			ctx.globalAlpha = 1;
			const t = t2;
			const beatPh = (((t3 / BEAT) % 1) + 1) % 1;
			const beatPulse = Math.exp(-beatPh * 5);
			const arrive = arriveAt();
			// the power dip as APEX comes: the machine's lights fall and flicker
			const dip = stage === 1 && t3 < 0.8 ? v3 * (0.55 + 0.25 * (hash(Math.floor(t3 * 24), 3) > 0.5 ? 1 : 0)) * (1 - ramp(0.45, 0.8, t3)) : 0;
			const ws = worldState(t);
			const worldIn = smooth(0, 0.8, t);
			if (stage === 1 && world3 == null) world3 = ws.cur;
			const w3 = world3 ?? ws.cur;
			// 02's worlds, one giving way to the next; they fade as the view pulls back into dark space
			if (arrive < 0.99) {
				const zw = mix(1, 0.7, arrive);
				const wa = worldIn * (1 - arrive) * vis;
				ctx.save();
				ctx.translate(480, 270);
				ctx.scale(zw, zw);
				ctx.translate(-480, -270);
				if (ws.prev >= 0 && ws.k < 1) {
					drawWorld(ctx, ws.prev, -70 * ws.k, sec, wa);
					drawWorld(ctx, ws.cur, 70 * (1 - ws.k), sec, wa * ws.k);
				} else drawWorld(ctx, ws.cur, 0, sec, wa);
				ctx.restore();
			}
			if (arrive > 0.01) {
				ctx.fillStyle = css(SPACE, 0.92 * arrive * vis);
				ctx.fillRect(-40, -40, PW + 80, PH + 80);
				lighter(ctx, () => {
					for (const s of STARS) glow(ctx, s.x, s.y, 2.2, [200, 205, 230], 0.5 * arrive * vis * (0.6 + 0.4 * Math.sin(sec + s.k)), 'core');
				});
			}
			// what the machine has read: a world arrives, the ring reads it, then the life inside takes its form
			const readT = ws.since;
			const reading = (1 - v3) * smooth(-0.1, 0.1, readT) * (1 - smooth(1.2, 1.7, readT));
			const adapt = t < FIRST ? smooth(0.3, 0.9, t) : smooth(0, 0.55, readT);
			let kindA: SeedKind = ws.prev >= 0 ? WORLDS[ws.prev].key : 'genesis';
			let kindB: SeedKind = WORLDS[ws.cur].key;
			let km = adapt;
			let gel: RGB = ws.prev >= 0 ? mixRGB(WORLDS[ws.prev].gel, WORLDS[ws.cur].gel, adapt) : mixRGB(GENESIS, WORLDS[0].gel, adapt);
			if (v3 > 0.5 && stage === 1) {
				if (!frozen) frozen = { kindA, kindB, km, gel };
				({ kindA, kindB, km, gel } = frozen);
			}
			// the machines, each on its own world: ours first, the others coming into view as the view pulls back
			const sensors: { x: number; y: number; at: number; a: number }[] = [];
			L.machines.forEach((m, i) => {
				const first = i === 0;
				const lk = v3 * smooth(LINK + m.order * 0.14 + 0.25, LINK + m.order * 0.14 + 0.7, t3);
				const app = first ? 1 : v3 * smooth(0.8 + i * 0.12, 1.6 + i * 0.12, t3);
				if (app <= 0.01) return;
				const z = first ? mix(1, m.s, arrive) : m.s;
				const gy = first ? mix(GROUND, m.g, arrive) : m.g;
				const wi = first ? w3 : (w3 + m.wOff) % 4;
				ctx.save();
				ctx.translate(m.x, gy);
				ctx.scale(z, z);
				ctx.translate(-480, -GROUND);
				const pa = (first ? arrive : app) * vis;
				if (pa > 0.01) {
					// a patch of its world round it, fading into the dark between worlds
					ctx.save();
					ctx.beginPath();
					ctx.ellipse(480, 320, 360, 270, 0, 0, TAU);
					ctx.clip();
					drawWorld(ctx, wi, 0, sec + i * 1.7, pa);
					ctx.save();
					ctx.translate(480, 320);
					ctx.scale(1, 270 / 360);
					const rim = ctx.createRadialGradient(0, 0, 150, 0, 0, 320);
					rim.addColorStop(0, css(SPACE, 0));
					rim.addColorStop(1, css(SPACE, pa));
					ctx.fillStyle = rim;
					ctx.fillRect(-360, -360, 720, 720);
					ctx.restore();
					ctx.fillStyle = css([10, 6, 20], 0.2 * lk);
					ctx.fillRect(0, 0, PW, PH);
					ctx.restore();
				}
				const own = first ? gel : WORLDS[wi].gel;
				const kind: SeedKind | null = first ? null : WORLDS[wi].key;
				drawMachine(ctx, {
					sec: sec + i * 1.7,
					gel: mixRGB(own, mixRGB(own, [128, 104, 190], 0.78), lk),
					light: WORLDS[wi].seam,
					a: Math.max(first ? 1 : 0.6 * app, app) * (1 - dip),
					kindA: kind ?? kindA,
					kindB: kind ?? kindB,
					km: kind ? 1 : km,
					apex: lk,
					beatPulse,
					reading: first ? reading : 0,
					dishCol: mixRGB(WORLDS[wi].gel, VIOLET, lk),
					needle: mix(-2.4 + wi * 0.9, -2.4 + (Math.floor(t3 / BEAT) % 2 ? 0.4 : -0.2), lk),
				});
				ctx.restore();
				sensors.push({ x: m.x + (DISH.x - 480) * z, y: gy + (DISH.y - 4 - GROUND) * z, at: LINK + m.order * 0.14, a: app });
			});
			if (dip > 0.01) {
				ctx.fillStyle = css(BLACK, dip);
				ctx.fillRect(-40, -40, PW + 80, PH + 80);
				ctx.fillStyle = css(VIOLET, 0.12 * dip);
				for (let k = 0; k < 5; k++) ctx.fillRect(-40, hash(Math.floor(t3 * 24), k) * PH, PW + 80, 2 + hash(k, Math.floor(t3 * 24)) * 5);
			}
			// the view closes in on them
			const grade = v3 * smooth(0.3, 1.8, t3);
			if (grade > 0.01) {
				const vg = ctx.createRadialGradient(480, 280, 190, 480, 280, 600);
				vg.addColorStop(0, css([8, 4, 16], 0));
				vg.addColorStop(1, css([8, 4, 16], 0.75 * grade * vis));
				ctx.fillStyle = vg;
				ctx.fillRect(-40, -40, PW + 80, PH + 80);
			}
			// APEX: a network, not a thing. Links snap from it to every Generator in view at once (QED linked APEX
			// to the Generators it controlled: Zolton's history).
			if (v3 > 0.01) {
				const hub = L.hub;
				drawNet(ctx, hub.x, hub.y, hub.r, t3, v3 * vis, sec, beatPulse, L.label);
				ctx.save();
				sensors.forEach((g, k) => {
					const on = v3 * vis * smooth(g.at, g.at + 0.08, t3) * g.a;
					if (on <= 0.01) return;
					const flash = Math.exp(-Math.pow((t3 - g.at - 0.05) / 0.12, 2));
					ctx.setLineDash([6, 6]);
					ctx.lineDashOffset = -sec * 40;
					ctx.strokeStyle = css(VIOLET, 0.65 * on + 0.35 * flash);
					ctx.lineWidth = 1.5;
					ctx.beginPath();
					ctx.moveTo(hub.x, hub.y + hub.r * 0.6);
					ctx.lineTo(g.x, g.y);
					ctx.stroke();
					const u = (beatPh + k * 0.11) % 1;
					lighter(ctx, () => {
						glow(ctx, g.x, g.y, 14 + 36 * flash, VIOLET, (0.5 + 0.5 * beatPulse) * on + 0.7 * flash);
						glow(ctx, g.x, g.y, 4, WHITE, on, 'core');
						glow(ctx, mix(hub.x, g.x, u), mix(hub.y + hub.r * 0.6, g.y, u), 7, [210, 190, 255], on, 'core');
					});
				});
				ctx.restore();
			}
			ctx.restore();
			grain(ctx, sec, 0.05 * vis);
		},
	};
}
