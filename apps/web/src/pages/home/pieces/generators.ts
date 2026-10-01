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
// Everything static (the worlds' layers, the machine's plating and wear, the painted surface) is drawn once
// into offscreen canvases on first use; a frame only composes them and draws what moves.
import { scaleRGB, blot, clamp, css, easeOut, glow, grain, H, lighter, mix, mixRGB, ramp, rng, smooth, W, type Ctx, type RGB } from './stage';
import { assetUrl, type Figure } from './figures';
import { backdrop, BLACK, BODY, DISH, FOOT, GROUND, MC, MX, PH, PW, TAU, VIOLET, VR, VX, VY0, VY1, WHITE, WX0, drawMachine, ease, hash, machineCache, machineSmall, machineTinted, offscreen, resetMachineWorld, pics, seedR, soften, type MachineLook, type Pic, type SeedKind, type WorldKey } from './generatorMachine';

const vnoise = (x: number, s: number) => {
	const i = Math.floor(x);
	const f = x - i;
	const u = f * f * (3 - 2 * f);
	return mix(hash(i, s), hash(i + 1, s), u);
};
/** Ridge-line noise: broad shapes with a little grit. */
const fbm = (x: number, s: number) => vnoise(x, s) * 0.55 + vnoise(x * 2.1, s + 7) * 0.3 + vnoise(x * 4.3, s + 13) * 0.15;
const SPACE: RGB = [8, 7, 13];
/** APEX's beat, in seconds: the pulse the taken machines keep. */
const BEAT = 0.55;

/* ------------------------------------------------------------------ the worlds */

/** `side` is where the brightest part of the world is, left (-1) to right (1): the machine takes its rim light from there. */
type World = { key: WorldKey; sky: [RGB, RGB]; land: RGB; gel: RGB; seam: RGB; side: number };
const WORLDS: World[] = [
	{ key: 'storm', sky: [[70, 62, 60], [20, 20, 26]], land: [30, 26, 24], gel: [226, 184, 112], seam: [240, 200, 150], side: -0.7 },
	{ key: 'lava', sky: [[86, 28, 16], [20, 8, 8]], land: [18, 10, 9], gel: [244, 118, 60], seam: [255, 160, 90], side: 0.85 },
	{ key: 'ice', sky: [[140, 170, 190], [44, 64, 82]], land: [96, 128, 150], gel: [140, 206, 240], seam: [206, 230, 246], side: -0.6 },
	{ key: 'sea', sky: [[40, 76, 96], [10, 20, 32]], land: [12, 30, 44], gel: [84, 186, 198], seam: [160, 218, 226], side: 0.5 },
];
/** The Genesis Prototype's green: the vat's first light, a nod back to Floria. */
const GENESIS: RGB = [150, 226, 140];
/** A world every PER seconds, the first change at FIRST; each crosses into the next over CROSS. */
const PER = 2.7;
const FIRST = 2.7;
const CROSS = 0.5;

function worldState(t: number) {
	if (t < FIRST) return { cur: 0, prev: -1, k: 1, since: t - 0.6 };
	const i = Math.floor((t - FIRST) / PER);
	const e = t - FIRST - i * PER;
	return { cur: (i + 1) % 4, prev: i % 4, k: smooth(0, 1, e / CROSS), since: e - CROSS * 0.3 };
}

// Each world is three cached layers, far to near, wider than the frame so parallax can slide them: the far
// layer is drawn small and scaled up (soft, lost in haze), the near one at full size.
const WWD = PW + 240;
const WQ = { far: 0.5, mid: 0.7, near: 1 };
type WLayers = { far: HTMLCanvasElement; mid: HTMLCanvasElement; near: HTMLCanvasElement };
const wcache: (WLayers | null | undefined)[] = [];

function skyFill(g: Ctx, top: RGB, hor: RGB, y1 = GROUND) {
	const s = g.createLinearGradient(0, -20, 0, y1);
	s.addColorStop(0, css(top));
	s.addColorStop(1, css(hor));
	g.fillStyle = s;
	g.fillRect(WX0, -20, WWD, y1 + 20);
}
/** A silhouette of broken ground: its top from noise, fading toward `bottom` so its foot dissolves into haze. */
function ridge(g: Ctx, base: number, amp: number, freq: number, seed: number, top: RGB, bottom: RGB, step = 8) {
	const gr = g.createLinearGradient(0, base - amp, 0, base + 60);
	gr.addColorStop(0, css(top));
	gr.addColorStop(1, css(bottom));
	g.fillStyle = gr;
	g.beginPath();
	g.moveTo(WX0, PH + 10);
	for (let x = WX0; x <= WX0 + WWD; x += step) g.lineTo(x, base - fbm((x + 300) * freq, seed) * amp);
	g.lineTo(WX0 + WWD, PH + 10);
	g.closePath();
	g.fill();
}
/** Light from the left: slopes that rise to the right catch it, those that fall away are in shadow. */
function ridgeLight(g: Ctx, base: number, amp: number, freq: number, seed: number, step = 8) {
	let py = base - fbm((WX0 + 300) * freq, seed) * amp;
	for (let x = WX0 + step; x <= WX0 + WWD; x += step) {
		const y = base - fbm((x + 300) * freq, seed) * amp;
		const slope = y - py;
		g.fillStyle = slope < 0 ? css([236, 246, 252], Math.min(0.3, -slope * 0.07)) : css([40, 64, 92], Math.min(0.3, slope * 0.07));
		g.fillRect(x - step, Math.min(y, py), step, 46);
		py = y;
	}
}
function hazeBand(g: Ctx, y0: number, y1: number, col: RGB, a0: number, a1: number) {
	const h = g.createLinearGradient(0, y0, 0, y1);
	h.addColorStop(0, css(col, a0));
	h.addColorStop(1, css(col, a1));
	g.fillStyle = h;
	g.fillRect(WX0, y0, WWD, y1 - y0);
}
/** Loose brush marks: many low-alpha ellipses, so a flat fill reads as paint. */
function mottle(g: Ctx, y0: number, y1: number, n: number, cols: RGB[], a: number, s0: number, s1: number, seed: number, flat = 0.28) {
	const r = rng(seed);
	for (let k = 0; k < n; k++) {
		const x = WX0 + r() * WWD;
		const y = y0 + r() * (y1 - y0);
		const s = s0 + r() * (s1 - s0);
		g.fillStyle = css(cols[Math.floor(r() * cols.length)], a * (0.4 + r()));
		g.save();
		g.translate(x, y);
		g.rotate(-0.25 + (r() - 0.5) * 0.5);
		g.beginPath();
		g.ellipse(0, 0, s, s * flat, 0, 0, TAU);
		g.fill();
		g.restore();
	}
}
/** A glowing crack that tapers to nothing: a dark crust edge, a soft bloom, a body of heat, a hot core. */
function seam(g: Ctx, pts: [number, number][], k = 1) {
	g.save();
	g.lineCap = 'round';
	const n = pts.length - 1;
	const pass = (wf: number, col: RGB, al: number, add: boolean) => {
		g.globalCompositeOperation = add ? 'lighter' : 'source-over';
		for (let j = 0; j < n; j++) {
			const t = j / n;
			g.lineWidth = Math.max(0.5, 4 * k * (1 - t * 0.85)) * wf;
			g.strokeStyle = css(col, al * (1 - t * 0.5));
			g.beginPath();
			g.moveTo(pts[j][0], pts[j][1]);
			g.lineTo(pts[j + 1][0], pts[j + 1][1]);
			g.stroke();
		}
	};
	pass(2.8, [6, 3, 3], 0.45, false);
	pass(4.5, [200, 60, 20], 0.09, true);
	pass(1, [232, 84, 28], 0.5, true);
	pass(0.35, [255, 200, 130], 0.7, true);
	g.restore();
}
function zigzag(r: () => number, x: number, y: number, len: number, seg: number, dy: number): [number, number][] {
	const p: [number, number][] = [[x, y]];
	for (let j = 1; j <= seg; j++) p.push([x + (len / seg) * j, y + (r() - 0.5) * dy + (j % 2 ? dy * 0.2 : -dy * 0.1)]);
	return p;
}
function blades(g: Ctx, xs: number[], col: RGB, seed: number, hmin: number, hmax: number) {
	const r = rng(seed);
	g.lineCap = 'round';
	for (const x of xs) {
		const h = hmin + r() * (hmax - hmin);
		const lean = (r() - 0.5) * 40;
		g.strokeStyle = css(mixRGB(col, WHITE, r() * 0.08));
		g.lineWidth = 2 + r() * 3;
		g.beginPath();
		g.moveTo(x, PH + 6);
		g.quadraticCurveTo(x + lean * 0.3, PH - h * 0.6, x + lean, PH - h);
		g.stroke();
	}
}

// The passing worlds paint from the site's own landscapes of them (no world is named on screen). Each is cropped
// wide, graded down to sit behind the subject, softened, and cached once; the procedural world stays as the
// fallback until its picture has loaded.
const ART = ['zolton', 'magmuth', 'krystos', 'poseidas'];
/** Where in each picture (rows of its 512) the crop starts, so the machine's feet land on the painted ground. */
/** How far each picture is scaled up and how far down it sits (so its near ground lies under the machine and out to both sides, its horizon and distance behind the machine's upper half). */
const PIC_K = [1.3, 1.3, 1.32, 1.14];
const PIC_DY = [0, 0, 0, 0];
/** Sideways, so a picture's own outcrop or shelf lies under the machine. */
const PIC_DX = [180, 0, 0, 200];
const ART_Y0 = [130, 70, -22, 60];
/** Traces of building in the paintings (a derrick, an aqueduct, a gantry) that the story has not earned yet, in picture pixels: x, y, rx, ry. */
const RUINS: [number, number, number, number][][] = [
	[[55, 195, 55, 60], [125, 268, 40, 26], [42, 262, 30, 26], [495, 203, 18, 24], [578, 215, 14, 24]],
	[[655, 322, 55, 40], [735, 235, 36, 52], [700, 330, 25, 20]],
	[[80, 125, 80, 80], [215, 272, 100, 60], [195, 312, 80, 50], [335, 315, 28, 30], [660, 205, 100, 55], [430, 192, 60, 30], [530, 184, 40, 20], [470, 232, 26, 16], [215, 226, 25, 22]],
	[[102, 138, 30, 36], [165, 148, 10, 10], [645, 150, 14, 18]],
];
const worldSeam = (wi: number): RGB => pics[wi]?.light ?? WORLDS[wi].seam;
const worldSide = (wi: number) => pics[wi]?.side ?? WORLDS[wi].side;

function buildPic(wi: number, img: HTMLImageElement) {
	const o = offscreen(WWD, PH);
	if (!o) return;
	const g = o.g;
	const sc = WWD / img.naturalWidth;
	// ice is not mirrored: its mountain range runs behind the machine and into the left third (the ruins there are painted out below)
	const flip = false;
	if (flip) {
		g.save();
		g.translate(WWD, 0);
		g.scale(-1, 1);
	}
	// (a negative start lowers the horizon: the picture sits down the frame and its top rows are stretched over the gap)
	const dy0 = Math.max(0, -ART_Y0[wi]) * sc;
	g.drawImage(img, 0, Math.max(0, ART_Y0[wi]), img.naturalWidth, (PH - dy0) / sc, 0, dy0, WWD, PH - dy0);
	if (dy0 > 0) g.drawImage(img, 0, 0, img.naturalWidth, 6, 0, 0, WWD, dy0);
	if (flip) g.restore();
	// paint the traces of building out with the ground round them
	try {
		for (const [px, py, rx, ry] of RUINS[wi]) {
			const ux = flip ? WWD - px * sc : px * sc;
			const uy = (py - ART_Y0[wi]) * sc;
			const pts = [[-1.5, 0], [1.5, 0], [0, -1.5], [0, 1.5]].map(([dx, dy]) => g.getImageData(clamp(Math.round(ux + dx * rx * sc), 0, WWD - 1), clamp(Math.round(uy + dy * ry * sc), 0, PH - 1), 1, 1).data);
			const c: RGB = [0, 1, 2].map((k) => pts.reduce((acc, d) => acc + d[k] / 4, 0)) as RGB;
			for (const kk of [1, 0.7]) {
				g.save();
				g.translate(ux, uy);
				g.scale(1, ry / rx);
				const bg = g.createRadialGradient(0, 0, 0, 0, 0, rx * sc * 1.25 * kk);
				bg.addColorStop(0, css(c, 0.97));
				bg.addColorStop(0.7, css(c, 0.85));
				bg.addColorStop(1, css(c, 0));
				g.fillStyle = bg;
				g.fillRect(-rx * sc * 2, -rx * sc * 2, rx * sc * 4, rx * sc * 4);
				g.restore();
			}
		}
	} catch {
		// leave the picture as it is
	}
	// pushed back behind the machine: about 2 px of blur, less contrast, darker, a haze over it, the middle held back
	{
		const t = offscreen(WWD / 2, PH / 2);
		if (t) {
			t.g.drawImage(o.c, 0, 0, t.c.width, t.c.height);
			g.clearRect(0, 0, WWD, PH);
			g.drawImage(t.c, 0, 0, WWD, PH);
		}
	}
	g.save();
	g.globalCompositeOperation = 'source-atop';
	g.fillStyle = css([64, 68, 78], wi === 2 ? 0.05 : 0.2);
	g.fillRect(0, 0, WWD, PH);
	g.fillStyle = css(BLACK, 0.22);
	g.fillRect(0, 0, WWD, PH);
	g.restore();
	const cg = g.createRadialGradient(WWD / 2, 300, 60, WWD / 2, 300, 380);
	cg.addColorStop(0, css([4, 5, 8], 0.3));
	cg.addColorStop(1, css([4, 5, 8], 0));
	g.fillStyle = cg;
	g.fillRect(0, 0, WWD, PH);
	// the picture's own light, sampled once: its brightest color and which side it comes from
	let light = WORLDS[wi].seam;
	let side = WORLDS[wi].side;
	let amb: RGB = mixRGB(WORLDS[wi].sky[0], WORLDS[wi].sky[1], 0.5);
	let sky: RGB = WORLDS[wi].sky[0];
	try {
		const t = offscreen(16, 9);
		if (t) {
			t.g.drawImage(o.c, 0, 0, 16, 9);
			const d = t.g.getImageData(0, 0, 16, 9).data;
			const cells: { l: number; c: RGB; x: number }[] = [];
			for (let i = 0; i < 144; i++) cells.push({ l: d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11, c: [d[i * 4], d[i * 4 + 1], d[i * 4 + 2]], x: i % 16 });
			const top = [...cells].sort((p, q) => q.l - p.l).slice(0, 20);
			const avg = top.reduce((acc, c) => [acc[0] + c.c[0] / 20, acc[1] + c.c[1] / 20, acc[2] + c.c[2] / 20] as RGB, [0, 0, 0] as RGB);
			const lum = (lo: number, hi: number) => cells.filter((c) => c.x >= lo && c.x < hi).reduce((a2, c) => a2 + c.l, 0);
			const lft = lum(2, 8);
			const rgt = lum(8, 14);
			amb = [0, 1, 2].map((k) => cells.reduce((acc, c) => acc + c.c[k] / 144, 0)) as RGB;
			sky = [0, 1, 2].map((k) => cells.slice(0, 32).reduce((acc, c) => acc + c.c[k] / 32, 0)) as RGB;
			light = mixRGB(avg, WHITE, 0.15);
			side = clamp(((rgt - lft) / (rgt + lft + 1)) * 4, -0.9, 0.9);
			if (Math.abs(side) < 0.3) side = side < 0 ? -0.3 : 0.3;
		}
	} catch {
		// keep the world's own light
	}
	// the haze of the world's own sky between the painting and the machine
	g.save();
	g.globalCompositeOperation = 'source-atop';
	g.fillStyle = css(sky, wi === 2 ? 0.08 : 0.15);
	g.fillRect(0, 0, WWD, PH);
	g.restore();
	pics[wi] = { c: o.c, light, side, amb, sky };
	resetMachineWorld(wi);
	pcache[wi] = undefined;
}

let artPromise: Promise<void> | null = null;
function loadArt(): Promise<void> {
	if (artPromise) return artPromise;
	if (typeof Image === 'undefined') return (artPromise = Promise.resolve());
	artPromise = Promise.all(
		ART.map(
			(name, wi) =>
				new Promise<void>((done) => {
					const img = new Image();
					img.onload = () => {
						try {
							buildPic(wi, img);
						} catch {
							// stay procedural
						}
						done();
					};
					img.onerror = () => done();
					img.src = assetUrl(`/assets/img/planets/art/${name}-landscape-768.webp`);
				})
		)
	).then(() => undefined);
	return artPromise;
}

/** Weather in front of the machine: rain and spray streak across it, embers and snow drift past. */
function frontWeather(ctx: Ctx, wi: number, sec: number, a: number) {
	if (a <= 0.01) return;
	const key = WORLDS[wi].key;
	if (key === 'storm') {
		ctx.strokeStyle = css([200, 210, 230], 0.35 * a);
		ctx.lineWidth = 1.2;
		ctx.beginPath();
		for (let k = 0; k < 22; k++) {
			const y = ((sec * (520 + hash(k, 1) * 200) + hash(k, 2) * 600) % 600) - 30;
			const x = hash(k, 3) * 1000 - 20 - y * 0.2;
			ctx.moveTo(x, y);
			ctx.lineTo(x - 5, y + 24);
		}
		ctx.stroke();
	}
	if (key === 'lava') {
		lighter(ctx, () => {
			for (let k = 0; k < 14; k++) {
				const u = ((sec * (30 + hash(k) * 30) + hash(k, 2) * 500) % 500) / 500;
				glow(ctx, hash(k, 3) * 960 + Math.sin(sec + k) * 14, GROUND + 80 - u * 520, 3 + hash(k, 4) * 3, [255, 150, 80], 0.8 * (1 - u) * a, 'core');
			}
		});
	}
	if (key === 'ice') {
		lighter(ctx, () => {
			for (let k = 0; k < 22; k++) {
				const y = (sec * (30 + hash(k) * 40) + hash(k, 2) * 600) % 560;
				glow(ctx, hash(k, 3) * 1000 - y * 0.12 + Math.sin(sec * 0.8 + k) * 12, y, 2.4 + hash(k, 4) * 2, [240, 248, 255], 0.4 * a, 'core');
			}
		});
	}
	if (key === 'sea') {
		// spray thrown up along the ledge, some of it reaching the pad
		ctx.fillStyle = css([226, 240, 242]);
		for (let k = 0; k < 40; k++) {
			const u = (sec * (0.6 + hash(k) * 0.6) + hash(k, 2) * 4) % 1.5;
			if (u > 1) continue;
			ctx.globalAlpha = 0.3 * Math.sin(u * Math.PI) * a;
			ctx.fillRect(280 + hash(k, 3) * 400 + u * 10, GROUND + 22 - Math.sin(u * Math.PI) * (16 + hash(k, 4) * 26), 1.8, 1.8);
		}
		ctx.globalAlpha = 1;
	}
}

type Painter = (f: Ctx, m: Ctx, n: Ctx) => void;
const PAINT: Record<WorldKey, Painter> = {
	storm(f, m, n) {
		const haze: RGB = [110, 98, 86];
		skyFill(f, [22, 24, 32], [138, 114, 92]);
		glow(f, 230, GROUND - 130, 460, [220, 160, 100], 0.4);
		// banks of cloud: dark bellies, their tops caught by the light low on the left
		const rc = rng(5);
		for (let k = 0; k < 70; k++) {
			const y = 20 + Math.pow(rc(), 1.3) * (GROUND - 90);
			const x = WX0 + rc() * WWD;
			const rx = 70 + rc() * 170;
			const ry = 10 + rc() * 22;
			const near = 1 - Math.abs(x - 230) / 700;
			f.fillStyle = css([18, 19, 26], 0.3 + rc() * 0.25);
			f.beginPath();
			f.ellipse(x, y, rx, ry, 0, 0, TAU);
			f.fill();
			f.fillStyle = css([226, 176, 120], Math.max(0, near) * (0.05 + (y / GROUND) * 0.16));
			f.beginPath();
			f.ellipse(x - rx * 0.05, y - ry * 0.55, rx * 0.85, ry * 0.5, 0, 0, TAU);
			f.fill();
		}
		mottle(f, 0, GROUND, 200, [[190, 170, 145], [10, 10, 14]], 0.05, 30, 110, 5);
		// rock islands adrift far off, lost in the murk: a broken top edge that catches the light, a ragged belly
		const r = rng(19);
		for (let k = 0; k < 5; k++) {
			const x = 40 + k * 200 + r() * 80;
			const y = 170 + r() * 110;
			const w = 60 + r() * 90;
			f.fillStyle = css(mixRGB([44, 40, 42], haze, 0.5));
			f.beginPath();
			f.moveTo(x - w / 2, y + 2);
			for (let j = 0; j <= 6; j++) f.lineTo(x - w / 2 + (j / 6) * w, y - 3 * hash(j, k));
			f.lineTo(x + w * 0.4, y + w * 0.1);
			f.lineTo(x + w * 0.2, y + w * 0.16);
			f.lineTo(x + w * 0.06, y + w * 0.34);
			f.lineTo(x - w * 0.1, y + w * 0.18);
			f.lineTo(x - w * 0.36, y + w * 0.12);
			f.closePath();
			f.fill();
			f.strokeStyle = css([236, 190, 140], 0.35);
			f.lineWidth = 2;
			f.beginPath();
			f.moveTo(x - w / 2, y + 1);
			f.lineTo(x + w / 2, y + 1);
			f.stroke();
		}
		ridge(f, GROUND - 56, 46, 0.006, 11, mixRGB([70, 64, 62], haze, 0.55), haze);
		hazeBand(f, GROUND - 150, GROUND + 6, haze, 0, 0.6);
		ridge(m, GROUND - 12, 56, 0.011, 23, [36, 32, 32], mixRGB([50, 44, 42], haze, 0.35));
		ridge(m, GROUND + 6, 30, 0.02, 29, [24, 22, 22], [30, 27, 26]);
		mottle(m, GROUND - 60, GROUND + 10, 120, [[90, 76, 64], [8, 8, 10]], 0.06, 8, 40, 7);
		// the near ground: wet earth, puddles holding the sky, reeds at the edges
		const gr = n.createLinearGradient(0, GROUND - 4, 0, PH);
		gr.addColorStop(0, css([34, 29, 27]));
		gr.addColorStop(1, css([9, 8, 8]));
		n.fillStyle = gr;
		n.fillRect(WX0, GROUND - 3, WWD, PH - GROUND + 6);
		const rr = rng(31);
		for (let k = 0; k < 9; k++) {
			const x = rr() * PW;
			const y = GROUND + 30 + rr() * 60;
			const rx = 50 + rr() * 90;
			n.fillStyle = css([170, 140, 110], 0.16);
			n.beginPath();
			n.ellipse(x, y, rx, 4 + rr() * 5, 0, 0, TAU);
			n.fill();
		}
		mottle(n, GROUND, PH, 220, [[80, 68, 58], [4, 4, 5]], 0.07, 10, 60, 9);
		const xs: number[] = [];
		for (let x = WX0; x < 210; x += 7) xs.push(x + hash(x) * 6);
		for (let x = 760; x < WX0 + WWD; x += 7) xs.push(x + hash(x) * 6);
		blades(n, xs, [10, 11, 11], 3, 26, 88);
	},
	lava(f, m, n) {
		const haze: RGB = [140, 62, 34];
		skyFill(f, [14, 6, 8], [160, 66, 32]);
		glow(f, 690, GROUND - 70, 620, [240, 100, 44], 0.5);
		glow(f, 300, GROUND - 40, 420, [220, 84, 36], 0.25);
		mottle(f, 0, GROUND, 200, [[70, 34, 26], [12, 6, 6]], 0.07, 40, 130, 4, 0.2);
		ridge(f, GROUND - 46, 54, 0.005, 12, mixRGB([34, 16, 14], haze, 0.3), mixRGB([90, 40, 24], haze, 0.5));
		// three far cones, their throats lit
		const cones = [{ x: 150, h: 130, w: 160 }, { x: 520, h: 170, w: 190 }, { x: 830, h: 120, w: 150 }];
		for (const c of cones) {
			f.fillStyle = css(mixRGB([26, 12, 12], haze, 0.16));
			f.beginPath();
			f.moveTo(c.x - c.w, GROUND);
			for (let j = 1; j < 8; j++) f.lineTo(c.x - c.w + (c.w - 14) * (j / 8), GROUND - c.h * Math.pow(j / 8, 0.8) - fbm(j * 1.3 + c.x, 3) * 14);
			f.lineTo(c.x - 8, GROUND - c.h);
			f.lineTo(c.x + 4, GROUND - c.h + 5);
			f.lineTo(c.x + 14, GROUND - c.h);
			for (let j = 1; j < 8; j++) f.lineTo(c.x + 14 + (c.w - 14) * (j / 8), GROUND - c.h * Math.pow(1 - j / 8, 0.9) - fbm(j * 1.7 + c.x, 5) * 14);
			f.lineTo(c.x + c.w, GROUND);
			f.closePath();
			f.fill();
			glow(f, c.x, GROUND - c.h, 100, WORLDS[1].seam, 0.55);
			// a faint plume standing off the throat
			for (let j = 0; j < 5; j++) {
				f.fillStyle = css([70, 40, 34], 0.12);
				f.beginPath();
				f.ellipse(c.x + j * 6, GROUND - c.h - 20 - j * 34, 14 + j * 12, 18 + j * 8, 0, 0, TAU);
				f.fill();
			}
		}
		hazeBand(f, GROUND - 70, GROUND + 6, haze, 0, 0.5);
		ridge(m, GROUND - 8, 52, 0.01, 31, [22, 11, 10], [58, 26, 18]);
		const r = rng(77);
		for (let k = 0; k < 9; k++) {
			const x = 40 + k * 100 + r() * 60;
			const y = GROUND - 30 + r() * 20;
			seam(m, zigzag(r, x, y, 60 + r() * 50, 6, 8), 0.7);
		}
		mottle(m, GROUND - 70, GROUND + 10, 100, [[70, 30, 20], [6, 4, 4]], 0.07, 8, 34, 8);
		const gr = n.createLinearGradient(0, GROUND - 4, 0, PH);
		gr.addColorStop(0, css([30, 16, 13]));
		gr.addColorStop(1, css([7, 4, 4]));
		n.fillStyle = gr;
		n.fillRect(WX0, GROUND - 3, WWD, PH - GROUND + 6);
		mottle(n, GROUND, PH, 240, [[64, 30, 20], [3, 2, 2]], 0.08, 10, 60, 10);
		for (let k = 0; k < 8; k++) seam(n, zigzag(r, r() * 700 - 60, GROUND + 14 + k * 12 + r() * 8, 160 + r() * 200, 10, 9), 0.9 + k * 0.1);
	},
	ice(f, m, n) {
		const haze: RGB = [172, 190, 200];
		skyFill(f, [58, 78, 96], [152, 172, 184]);
		glow(f, 300, GROUND - 160, 440, [222, 236, 240], 0.22);
		mottle(f, 0, GROUND, 200, [[220, 232, 238], [30, 50, 68]], 0.05, 40, 130, 6, 0.2);
		ridge(f, GROUND - 62, 100, 0.005, 41, mixRGB([150, 170, 186], haze, 0.4), haze);
		ridgeLight(f, GROUND - 62, 100, 0.005, 41);
		const rr = rng(47);
		for (let k = 0; k < 7; k++) {
			const x = -60 + k * 170 + rr() * 60;
			const h = 90 + rr() * 90;
			const w = 80 + rr() * 60;
			f.fillStyle = css(mixRGB([150, 176, 194], haze, 0.35));
			f.beginPath();
			f.moveTo(x - w, GROUND);
			f.lineTo(x, GROUND - h);
			f.lineTo(x + w * 0.1, GROUND);
			f.closePath();
			f.fill();
			f.fillStyle = css(mixRGB([104, 130, 152], haze, 0.35));
			f.beginPath();
			f.moveTo(x, GROUND - h);
			f.lineTo(x + w, GROUND);
			f.lineTo(x + w * 0.1, GROUND);
			f.closePath();
			f.fill();
		}
		hazeBand(f, GROUND - 170, GROUND + 6, haze, 0, 0.6);
		const rm = rng(53);
		for (let k = 0; k < 6; k++) {
			const x = -20 + k * 190 + rm() * 70;
			const h = 60 + rm() * 70;
			const w = 60 + rm() * 40;
			const lit = m.createLinearGradient(0, GROUND - h, 0, GROUND);
			lit.addColorStop(0, css([232, 244, 250]));
			lit.addColorStop(1, css([170, 194, 210]));
			m.fillStyle = lit;
			m.beginPath();
			m.moveTo(x - w, GROUND);
			m.lineTo(x - w * 0.15, GROUND - h * 0.7);
			m.lineTo(x, GROUND - h);
			m.lineTo(x + w * 0.1, GROUND);
			m.closePath();
			m.fill();
			const shd = m.createLinearGradient(0, GROUND - h, 0, GROUND);
			shd.addColorStop(0, css([106, 134, 160]));
			shd.addColorStop(1, css([140, 166, 184]));
			m.fillStyle = shd;
			m.beginPath();
			m.moveTo(x, GROUND - h);
			m.lineTo(x + w, GROUND);
			m.lineTo(x + w * 0.1, GROUND);
			m.closePath();
			m.fill();
		}
		mottle(m, GROUND - 120, GROUND, 140, [[240, 248, 252], [70, 96, 122]], 0.07, 6, 30, 57, 0.4);
		hazeBand(m, GROUND - 130, GROUND, haze, 0, 0.38);
		ridge(m, GROUND - 2, 22, 0.015, 59, [176, 196, 210], [150, 172, 190]);
		ridgeLight(m, GROUND - 2, 22, 0.015, 59);
		const gr = n.createLinearGradient(0, GROUND - 4, 0, PH);
		gr.addColorStop(0, css([176, 196, 208]));
		gr.addColorStop(1, css([88, 112, 132]));
		n.fillStyle = gr;
		n.fillRect(WX0, GROUND - 3, WWD, PH - GROUND + 6);
		hazeBand(n, GROUND - 6, GROUND + 60, haze, 0.3, 0);
		// a frozen sheet under where the machine stands
		n.fillStyle = css([220, 238, 246], 0.22);
		n.beginPath();
		n.ellipse(480, GROUND + 40, 260, 20, 0, 0, TAU);
		n.fill();
		mottle(n, GROUND, PH, 220, [[230, 242, 248], [60, 84, 106]], 0.07, 12, 70, 12);
		for (let k = 0; k < 14; k++) {
			const x = k < 7 ? -60 + rr() * 260 : 760 + rr() * 300;
			const h = 14 + rr() * 40;
			const w = 8 + rr() * 14;
			n.fillStyle = css([222, 240, 250]);
			n.beginPath();
			n.moveTo(x - w, GROUND + 6);
			n.lineTo(x, GROUND - h);
			n.lineTo(x, GROUND + 6);
			n.closePath();
			n.fill();
			n.fillStyle = css([112, 148, 176]);
			n.beginPath();
			n.moveTo(x, GROUND - h);
			n.lineTo(x + w, GROUND + 6);
			n.lineTo(x, GROUND + 6);
			n.closePath();
			n.fill();
		}
	},
	sea(f, m, n) {
		const hz = SEA_HZ;
		const haze: RGB = [110, 140, 148];
		skyFill(f, [24, 42, 58], [128, 158, 164], hz);
		mottle(f, 0, hz, 180, [[150, 172, 178], [12, 24, 34]], 0.06, 50, 190, 14, 0.14);
		glow(f, 640, hz - 30, 460, [206, 226, 222], 0.4);
		const sw = f.createLinearGradient(0, hz, 0, PH);
		sw.addColorStop(0, css([120, 152, 158]));
		sw.addColorStop(0.3, css([56, 96, 112]));
		sw.addColorStop(1, css([10, 30, 42]));
		f.fillStyle = sw;
		f.fillRect(WX0, hz, WWD, PH - hz);
		// far stacks standing in the murk
		const r = rng(61);
		for (let k = 0; k < 4; k++) {
			const x = -40 + k * 300 + r() * 120;
			const h = 14 + r() * 30;
			const w = 30 + r() * 40;
			f.fillStyle = css(mixRGB([60, 88, 100], haze, 0.5));
			f.beginPath();
			f.moveTo(x - w, hz + 1);
			f.lineTo(x - w * 0.3, hz - h);
			f.lineTo(x + w * 0.2, hz - h * 0.8);
			f.lineTo(x + w, hz + 1);
			f.closePath();
			f.fill();
		}
		hazeBand(f, hz - 40, hz + 26, haze, 0, 0.55);
		// nearer stacks with the light along their right edge
		for (const [x, h, w] of [[90, 90, 46], [800, 70, 40], [910, 100, 36]] as const) {
			const gr = m.createLinearGradient(0, hz + 34 - h, 0, hz + 40);
			gr.addColorStop(0, css([20, 34, 42]));
			gr.addColorStop(1, css([44, 66, 76]));
			m.fillStyle = gr;
			m.beginPath();
			m.moveTo(x - w, hz + 40);
			for (let j = 0; j <= 8; j++) m.lineTo(x - w + (j / 8) * w * 1.7, hz + 34 - h * (0.55 + 0.45 * Math.sin((j / 8) * Math.PI)) * (0.85 + 0.3 * hash(j, x)));
			m.lineTo(x + w * 0.7, hz + 40);
			m.closePath();
			m.fill();
			m.strokeStyle = css([190, 226, 228], 0.5);
			m.lineWidth = 2.6;
			m.beginPath();
			m.moveTo(x + w * 0.68, hz + 38);
			m.lineTo(x + w * 0.52, hz + 34 - h * 0.62);
			m.lineTo(x + w * 0.2, hz + 34 - h * 0.98);
			m.stroke();
		}
		mottle(m, hz - 60, hz + 40, 60, [[70, 100, 110], [6, 14, 20]], 0.06, 8, 30, 15);
		// the ledge the machine stands on, wet rock with the water breaking at its edges
		const gl = n.createLinearGradient(0, GROUND - 4, 0, PH);
		gl.addColorStop(0, css([26, 40, 46]));
		gl.addColorStop(1, css([5, 10, 13]));
		n.fillStyle = gl;
		n.beginPath();
		n.moveTo(WX0, PH + 10);
		for (let x = WX0; x <= WX0 + WWD; x += 8) {
			const e = smooth(210, 420, Math.abs(x - 480));
			n.lineTo(x, GROUND - 3 + e * 70 + (fbm(x * 0.03, 8) - 0.5) * 8);
		}
		n.lineTo(WX0 + WWD, PH + 10);
		n.closePath();
		n.fill();
		n.strokeStyle = css([190, 225, 230], 0.16);
		n.lineWidth = 2;
		n.beginPath();
		for (let x = WX0; x <= WX0 + WWD; x += 8) {
			const e = smooth(210, 420, Math.abs(x - 480));
			const y = GROUND - 3 + e * 70 + (fbm(x * 0.03, 8) - 0.5) * 8;
			if (x > WX0) n.lineTo(x, y);
			else n.moveTo(x, y);
		}
		n.stroke();
		n.fillStyle = css([150, 190, 196], 0.12);
		for (let k = 0; k < 9; k++) {
			n.beginPath();
			n.ellipse(r() * PW, GROUND + 20 + r() * 70, 40 + r() * 60, 3 + r() * 3, 0, 0, TAU);
			n.fill();
		}
		mottle(n, GROUND, PH, 200, [[60, 90, 100], [2, 5, 7]], 0.08, 10, 60, 16);
	},
};
const SEA_HZ = GROUND - 118;
const WKEYS: WorldKey[] = ['storm', 'lava', 'ice', 'sea'];

function worldLayers(wi: number): WLayers | null {
	const hit = wcache[wi];
	if (hit !== undefined) return hit;
	const f = offscreen(WWD * WQ.far, PH * WQ.far);
	const m = offscreen(WWD * WQ.mid, PH * WQ.mid);
	const n = offscreen(WWD * WQ.near, PH * WQ.near);
	if (!f || !m || !n) return (wcache[wi] = null);
	f.g.setTransform(WQ.far, 0, 0, WQ.far, -WX0 * WQ.far, 0);
	m.g.setTransform(WQ.mid, 0, 0, WQ.mid, -WX0 * WQ.mid, 0);
	n.g.setTransform(WQ.near, 0, 0, WQ.near, -WX0 * WQ.near, 0);
	PAINT[WKEYS[wi]](f.g, m.g, n.g);
	soften(m.c, 0.5);
	soften(n.c, 0.3);
	return (wcache[wi] = { far: f.c, mid: m.c, near: n.c });
}

/** A strike of lightning: guaranteed twice in each storm pass, on the world's own clock. */
function lightning(lt: number, k: number) {
	const dt = lt - k;
	if (dt < 0 || dt > 0.8) return 0;
	if (dt < 0.07) return 1;
	if (dt < 0.12) return 0.3;
	if (dt < 0.2) return 0.95;
	return Math.exp(-(dt - 0.2) * 6) * 0.6;
}
function bolt(ctx: Ctx, x: number, y0: number, y1: number, seed: number, fl: number, a: number) {
	const r = rng(seed);
	const pts: [number, number][] = [[x, y0]];
	let px = x;
	for (let y = y0; y < y1; ) {
		y += 18 + r() * 26;
		px += (r() - 0.5) * 46;
		pts.push([px, Math.min(y, y1)]);
	}
	const path = (p: [number, number][]) => {
		ctx.beginPath();
		p.forEach(([bx, by], i) => (i ? ctx.lineTo(bx, by) : ctx.moveTo(bx, by)));
		ctx.stroke();
	};
	ctx.lineJoin = 'round';
	ctx.lineCap = 'round';
	ctx.strokeStyle = css([190, 200, 255], 0.22 * fl * a);
	ctx.lineWidth = 12;
	path(pts);
	ctx.strokeStyle = css([240, 244, 255], 0.95 * fl * a);
	ctx.lineWidth = 3;
	path(pts);
	// two forks off it
	for (const i of [2, 4]) {
		if (!pts[i]) continue;
		const fork: [number, number][] = [pts[i]];
		let fx = pts[i][0];
		let fy = pts[i][1];
		for (let j = 0; j < 3; j++) {
			fx += (r() < 0.5 ? -1 : 1) * (10 + r() * 22);
			fy += 14 + r() * 18;
			fork.push([fx, fy]);
		}
		ctx.strokeStyle = css([230, 236, 255], 0.7 * fl * a);
		ctx.lineWidth = 1.2;
		path(fork);
	}
}

/** Rain in three depths: far short and faint, near long and bright, all leaning into the wind. */
function rain(ctx: Ctx, sec: number, near: number, a: number, dens: number, col: RGB) {
	const layers = [{ n: 34, len: 8, sp: 260, al: 0.12, w: 0.8, px: 0.3 }, { n: 26, len: 13, sp: 380, al: 0.2, w: 1, px: 0.65 }, { n: 16, len: 22, sp: 560, al: 0.3, w: 1.4, px: 1 }];
	layers.forEach((L, li) => {
		ctx.strokeStyle = css(col, L.al * a);
		ctx.lineWidth = L.w;
		ctx.beginPath();
		const n = Math.round(L.n * dens);
		for (let k = 0; k < n; k++) {
			const y = ((sec * L.sp * (0.9 + hash(k, li) * 0.2) + hash(k, li + 5) * 600) % 580) - 30;
			const x = near * L.px + hash(k, li + 9) * 1100 - 60 - y * 0.2;
			ctx.moveTo(x, y);
			ctx.lineTo(x - L.len * 0.2, y + L.len);
		}
		ctx.stroke();
	});
}

const LAYERS = (() => {
	const r = rng(41);
	return {
		clouds: Array.from({ length: 16 }, (_, k) => ({ x: r() * 1100 - 70, y: 30 + r() * 220, rx: 100 + r() * 150, ry: 26 + r() * 40, sp: 5 + r() * 12, front: k % 2 === 0, dark: r() })),
		plumes: Array.from({ length: 5 }, (_, k) => ({ x: 70 + k * 210 + r() * 60, y: GROUND - 60 - r() * 60, ph: r(), sp: 0.05 + r() * 0.03 })),
		embers: Array.from({ length: 46 }, () => ({ x: r() * 1000, sp: 10 + r() * 26, ph: r() * 500, s: r() })),
		snow: Array.from({ length: 80 }, () => ({ x: r() * 1100, sp: 10 + r() * 30, ph: r() * 600, s: 0.4 + r() * 1.1, d: r() })),
		sprayAt: Array.from({ length: 22 }, () => ({ x: r() * 960, ph: r() * 10, sp: 0.5 + r() * 0.7 })),
	};
})();

/**
 * One world, its layers shifted by `shift` (near layers more: parallax as one world gives way to the next).
 * `lt` is the world's own clock: seconds since it came into view, so a storm's lightning always lands.
 */
function drawWorld(ctx: Ctx, wi: number, shift: number, sec: number, a: number, lt: number) {
	if (a <= 0.01) return;
	const w = WORLDS[wi];
	const far = shift * 0.3;
	const mid = shift * 0.6;
	const near = shift;
	const P = pics[wi];
	if (P) {
		// the painted world: one picture, drifting slowly across its pass, with only weather laid over it
		ctx.save();
		ctx.globalAlpha = a;
		const pk = PIC_K[wi];
		const pcx = WX0 + shift * 0.7 + 30 - clamp(lt, -0.5, 6) * 14 + WWD / 2 + PIC_DX[wi];
		ctx.drawImage(P.c, pcx - (WWD * pk) / 2, PH - PH * pk + PIC_DY[wi], WWD * pk, PH * pk);
		if (wi === 3) {
			// the machine's sea is this same picture drawn again over the rock's lower third: it needs the rect and transform used here
			backdrop[3] = { x: pcx - (WWD * pk) / 2, y: PH - PH * pk + PIC_DY[wi], w: WWD * pk, h: PH * pk, t: ctx.getTransform() };
		}
		ctx.globalAlpha = 1;
		if (w.key === 'storm') {
			rain(ctx, sec, near, a, 0.6, [190, 200, 220]);
			for (const [k, sx] of [[0.7, 0], [1.9, 1]] as const) {
				const fl = lightning(lt, k);
				if (fl <= 0) continue;
				const lx = 300 + hash(Math.floor(sec - lt), sx + 3) * 400;
				lighter(ctx, () => glow(ctx, lx, 120, 460, [200, 205, 255], 0.4 * fl * a));
				// a strike lifts the backdrop: a pale gradient from the bolt's side
				const lg = ctx.createLinearGradient(lx, 0, lx + (lx < 480 ? 520 : -520), 0);
				lg.addColorStop(0, css([236, 240, 255], 0.15 * fl * a));
				lg.addColorStop(1, css([236, 240, 255], 0));
				ctx.save();
				ctx.globalCompositeOperation = 'screen';
				ctx.fillStyle = lg;
				ctx.fillRect(-20, -20, PW + 40, GROUND + 20);
				ctx.restore();
			}
		}
		if (w.key === 'lava') {
			lighter(ctx, () => {
				for (const p of LAYERS.embers) {
					const u = ((sec * p.sp + p.ph) % 420) / 420;
					glow(ctx, near * 0.8 + p.x + Math.sin(sec + p.ph) * 12, GROUND + 60 - u * 480, 2 + p.s * 2, [255, 150, 80], 0.7 * p.s * (1 - u) * a, 'core');
				}
			});
		}
		if (w.key === 'ice') {
			lighter(ctx, () => {
				for (const f of LAYERS.snow.slice(0, 40)) {
					const y = (sec * f.sp + f.ph) % 540;
					glow(ctx, near * (0.4 + f.d * 0.6) + f.x - y * 0.15 + Math.sin(sec * 0.8 + f.ph) * 8, y, 1.3 * f.s * (0.6 + f.d), [236, 246, 252], (0.25 + f.d * 0.3) * a, 'core');
				}
			});
		}
		ctx.restore();
		return;
	}
	const L = worldLayers(wi);
	ctx.save();
	if (!L) {
		const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
		sky.addColorStop(0, css(w.sky[1]));
		sky.addColorStop(1, css(w.sky[0]));
		ctx.globalAlpha = a;
		ctx.fillStyle = sky;
		ctx.fillRect(-80, -20, PW + 160, PH + 40);
		ctx.restore();
		return;
	}
	const layer = (c: HTMLCanvasElement, dx: number) => {
		ctx.globalAlpha = a;
		ctx.drawImage(c, WX0 + dx, 0, WWD, PH);
	};
	layer(L.far, far);
	if (w.key === 'storm') {
		// two banks of cloud, the back ones pale and slow, the front ones dark and driven
		for (const c of LAYERS.clouds) {
			const x = ((((c.x + sec * c.sp * (c.front ? 1 : 0.5) + far) % 1200) + 1200) % 1200) - 120;
			blot(ctx, x, c.front ? c.y : c.y + 30, c.rx, c.ry, 0, c.front ? mixRGB([56, 56, 66], [18, 18, 26], c.dark) : [104, 94, 86], (c.front ? 0.45 : 0.26) * a);
		}
		for (const [k, sx] of [[0.7, 0], [1.9, 1]] as const) {
			const fl = lightning(lt, k);
			if (fl <= 0) continue;
			const bx = 230 + far + hash(Math.floor(sec - lt), sx + 3) * 500;
			lighter(ctx, () => {
				glow(ctx, bx, 110, 460, [200, 205, 255], 0.5 * fl * a);
				glow(ctx, bx, 300, 220, [190, 200, 255], 0.4 * fl * a);
			});
			ctx.fillStyle = css([200, 206, 240], 0.1 * fl * a);
			ctx.fillRect(-20, -20, PW + 40, GROUND + 20);
			bolt(ctx, bx, 50, GROUND - 40, Math.floor(sec - lt) * 7 + sx, fl, a);
		}
	}
	if (w.key === 'ice') {
		lighter(ctx, () => glow(ctx, far + 300, 70, 400, [170, 240, 220], (0.09 + 0.04 * Math.sin(sec * 0.5)) * a));
		for (let k = 0; k < 4; k++) blot(ctx, ((sec * (6 + k * 3) + k * 300 + far) % 1300) - 150, 250 + k * 40, 180, 30, 0, [190, 206, 216], 0.1 * a);
	}
	if (w.key === 'lava') {
		// smoke plumes lifting off the far cones, lit from below
		for (const p of LAYERS.plumes) {
			for (let j = 0; j < 6; j++) {
				const u = (sec * p.sp + p.ph + j / 6) % 1;
				const x = far + p.x + Math.sin(u * 4 + p.ph * 9) * 26 + u * 40;
				const y = p.y - u * 250;
				blot(ctx, x, y, 22 + u * 74, 16 + u * 50, 0, mixRGB([120, 52, 30], [34, 26, 26], Math.min(1, u * 1.6)), 0.3 * Math.sin(u * Math.PI) * a);
			}
		}
	}
	layer(L.mid, mid);
	if (w.key === 'lava') {
		lighter(ctx, () => {
			for (let k = 0; k < 9; k++) glow(ctx, mid + 60 + k * 100, GROUND - 22, 34, [255, 110, 40], (0.16 + 0.1 * Math.sin(sec * 1.4 + k * 1.7)) * a);
		});
	}
	if (w.key === 'sea') {
		const hz = SEA_HZ;
		for (let k = 0; k < 7; k++) {
			const y0 = hz + 6 + k * ((GROUND + 40 - hz) / 6.4);
			const amp = 0.8 + k * 1.5;
			const f = 0.032 - k * 0.0034;
			const sp = 0.7 + k * 0.25;
			const top = (x: number) => y0 + Math.sin((x - mid * (0.6 + k * 0.12)) * f + sec * sp + k) * amp + Math.sin((x + k * 90) * f * 2.3 - sec * sp * 1.3) * amp * 0.35;
			ctx.globalAlpha = 0.86 * a;
			ctx.fillStyle = css(mixRGB([84, 122, 134], [16, 44, 58], k / 6.5));
			ctx.beginPath();
			ctx.moveTo(-90, PH + 20);
			for (let x = -90; x <= PW + 90; x += 12) ctx.lineTo(x, top(x));
			ctx.lineTo(PW + 90, PH + 20);
			ctx.closePath();
			ctx.fill();
			ctx.strokeStyle = css([200, 234, 238], (0.36 - k * 0.04) * a);
			ctx.lineWidth = 1 + k * 0.2;
			ctx.beginPath();
			for (let x = -90; x <= PW + 90; x += 12) (x > -90 ? ctx.lineTo(x, top(x)) : ctx.moveTo(x, top(x)));
			ctx.stroke();
			// glints where the light lies on the water
			ctx.fillStyle = css([220, 240, 240], a);
			for (let j = 0; j < 7; j++) {
				const x = 640 + (hash(j, k) - 0.5) * 300 * (0.5 + k * 0.15);
				const g = Math.max(0, Math.sin(sec * (1.6 + hash(j, k + 3)) + hash(j, k + 6) * 9));
				ctx.globalAlpha = 0.6 * g * a * (0.4 + k * 0.1);
				ctx.fillRect(x, top(x) - 0.5, 6 + k * 2.5, 1.2);
			}
		}
		ctx.globalAlpha = 1;
		// a column of light on the water beneath the bright part of the sky
		lighter(ctx, () => {
			for (let k = 0; k < 22; k++) {
				const y = hz + 6 + k * 9.5;
				const wdt = 8 + k * 5;
				const tw = 0.5 + 0.5 * Math.sin(sec * (1.3 + hash(k) * 1.5) + k * 2.1);
				const x = 640 + mid * 0.5 + (hash(k, 4) - 0.5) * (6 + k * 2);
				ctx.globalAlpha = 1;
				glow(ctx, x, y, wdt, [210, 234, 232], (0.13 + 0.2 * tw) * a * (1 - k / 30), 'core');
			}
		});
	}
	layer(L.near, near);
	if (w.key === 'sea') {
		// spray thrown up where the water breaks on the ledge
		ctx.fillStyle = css([220, 238, 240]);
		for (const s of LAYERS.sprayAt) {
			const u = (sec * s.sp + s.ph) % 1.6;
			if (u > 1) continue;
			const x = near + s.x + u * 14;
			const y = GROUND + 24 + (s.x % 30) - Math.sin(u * Math.PI) * 26;
			ctx.globalAlpha = 0.5 * Math.sin(u * Math.PI) * a;
			ctx.fillRect(x, y, 1.6, 1.6);
		}
		ctx.globalAlpha = 1;
	}
	// weather in front: rain with depth, embers, snow
	ctx.globalAlpha = 1;
	if (w.key === 'storm') rain(ctx, sec, near, a, 1, [190, 200, 220]);
	if (w.key === 'sea') rain(ctx, sec, near, a, 0.5, [180, 210, 226]);
	if (w.key === 'lava') {
		lighter(ctx, () => {
			for (const p of LAYERS.embers) {
				const u = ((sec * p.sp + p.ph) % 420) / 420;
				glow(ctx, near * 0.8 + p.x + Math.sin(sec + p.ph) * 12, GROUND + 60 - u * 480, 2.4 + p.s * 2.4, [255, 150, 80], 0.8 * p.s * (1 - u) * a, 'core');
			}
		});
	}
	if (w.key === 'ice') {
		lighter(ctx, () => {
			for (const f of LAYERS.snow) {
				const y = (sec * f.sp + f.ph) % 540;
				glow(ctx, near * (0.4 + f.d * 0.6) + f.x - y * 0.15 + Math.sin(sec * 0.8 + f.ph) * 8, y, 1.4 * f.s * (0.6 + f.d), [236, 246, 252], (0.3 + f.d * 0.35) * a, 'core');
			}
		});
	}
	ctx.restore();
}

// What each far Generator stands in in 03: a low strip of its world's horizon (silhouettes and a band of ground,
// lit low), fading out at its sides and underfoot into the dark. Built once per world.
const PATCH = { w: 720, h: 150, y0: GROUND - 104 };
const pcache: (HTMLCanvasElement | null | undefined)[] = [];
function worldPatch(wi: number): HTMLCanvasElement | null {
	const hit = pcache[wi];
	if (hit !== undefined) return hit;
	const L = worldLayers(wi);
	const o = offscreen(PATCH.w, PATCH.h);
	if (!L || !o) return (pcache[wi] = null);
	const g = o.g;
	const sx = 480 - PATCH.w / 2 - WX0;
	const P = pics[wi];
	if (P) {
		// a low strip of the painting round the machine's feet, faded at the sides and underfoot
		g.drawImage(P.c, sx, PATCH.y0 - 20, PATCH.w, PATCH.h + 20, 0, 0, PATCH.w, PATCH.h);
		g.globalCompositeOperation = 'destination-in';
		const hm2 = g.createLinearGradient(0, 0, PATCH.w, 0);
		hm2.addColorStop(0, css(WHITE, 0));
		hm2.addColorStop(0.3, css(WHITE, 1));
		hm2.addColorStop(0.7, css(WHITE, 1));
		hm2.addColorStop(1, css(WHITE, 0));
		g.fillStyle = hm2;
		g.fillRect(0, 0, PATCH.w, PATCH.h);
		const vm2 = g.createLinearGradient(0, 0, 0, PATCH.h);
		vm2.addColorStop(0, css(WHITE, 0));
		vm2.addColorStop(0.25, css(WHITE, 1));
		vm2.addColorStop(0.68, css(WHITE, 1));
		vm2.addColorStop(1, css(WHITE, 0));
		g.fillStyle = vm2;
		g.fillRect(0, 0, PATCH.w, PATCH.h);
		return (pcache[wi] = o.c);
	}
	// the low light behind the silhouettes
	const hg = g.createLinearGradient(0, 0, 0, PATCH.h - 44);
	hg.addColorStop(0, css(WORLDS[wi].seam, 0));
	hg.addColorStop(1, css(WORLDS[wi].seam, 0.34));
	g.fillStyle = hg;
	g.fillRect(0, 0, PATCH.w, PATCH.h - 44);
	g.drawImage(L.mid, sx * WQ.mid, PATCH.y0 * WQ.mid, PATCH.w * WQ.mid, (PATCH.h - 44) * WQ.mid, 0, 0, PATCH.w, PATCH.h - 44);
	g.drawImage(L.near, sx, GROUND - 6, PATCH.w, 50, 0, PATCH.h - 50, PATCH.w, 50);
	g.globalCompositeOperation = 'destination-in';
	const hm = g.createLinearGradient(0, 0, PATCH.w, 0);
	hm.addColorStop(0, css(WHITE, 0));
	hm.addColorStop(0.28, css(WHITE, 1));
	hm.addColorStop(0.72, css(WHITE, 1));
	hm.addColorStop(1, css(WHITE, 0));
	g.fillStyle = hm;
	g.fillRect(0, 0, PATCH.w, PATCH.h);
	const vm = g.createLinearGradient(0, 0, 0, PATCH.h);
	vm.addColorStop(0, css(WHITE, 1));
	vm.addColorStop(0.72, css(WHITE, 1));
	vm.addColorStop(1, css(WHITE, 0));
	g.fillStyle = vm;
	g.fillRect(0, 0, PATCH.w, PATCH.h);
	return (pcache[wi] = o.c);
}
function drawPatch(ctx: Ctx, wi: number, sec: number, a: number, lk: number) {
	const p = worldPatch(wi);
	if (!p) return;
	ctx.save();
	ctx.globalAlpha = a * 0.5 * (1 - 0.75 * lk);
	ctx.drawImage(p, 480 - PATCH.w / 2, PATCH.y0, PATCH.w, PATCH.h);
	ctx.translate(480, GROUND + 6);
	ctx.scale(1, 0.14);
	lighter(ctx, () => {
		glow(ctx, 0, 0, 280, worldSeam(wi), (0.05 + 0.02 * Math.sin(sec * 0.9 + wi)) * a);
		if (lk > 0.01) glow(ctx, 0, 0, 240, VIOLET, 0.16 * lk * a);
	});
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
const lattice: { c: HTMLCanvasElement | null; m: HTMLCanvasElement | null; y: HTMLCanvasElement | null; step: number; px: number } = { c: null, m: null, y: null, step: -1, px: 0 };
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

function drawNet(ctx: Ctx, cx: number, cy: number, R: number, t3: number, a0: number, sec: number, beatPulse: number, labelPx: number, compact: boolean) {
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
	// a signal, not a solid: nodes that come and go, a bright band sweeping down through it, a dark one after,
	// and now and then a stretch of it dropped altogether
	const nodeB = P.map((_, i) => (0.3 + 0.7 * hash(i, 9)) * (0.65 + 0.35 * Math.sin(sec * (0.7 + hash(i, 2) * 2.2) + i)));
	const band1 = ((sec % 6) / 6) * 1.5 - 0.25;
	const band2 = ((sec * 0.2 + 0.6) % 1.5) - 0.25;
	const gapStep = Math.floor(sec * 0.8);
	const rr0 = (i: number, j: number) => Math.hypot((P[i][0] + P[j][0]) / 2 - pad - R, (P[i][1] + P[j][1]) / 2 - pad - R) / R;
	const paint = (which: 'c' | 'm' | 'y', col: RGB) => {
		const c = latticeCanvas(which, px, px);
		const g = c?.getContext('2d');
		if (!c || !g) return null;
		g.setTransform(1, 0, 0, 1, 0, 0);
		g.clearRect(0, 0, px, px);
		g.setTransform(f, 0, 0, f, 0, 0);
		g.lineWidth = Math.max(1.4, 1.5 / f);
		ORB.e.forEach(([i, j], k) => {
			if (hash(k, gapStep + 40) < 0.13) return;
			if (compact && (hash(k, 77) < 0.4 || (rr0(i, j) > 0.78 && hash(k, 78) < 0.5))) return;
			const d = (P[i][2] + P[j][2]) / 2;
			const yn = ((P[i][1] + P[j][1]) / 2 - pad) / (2 * R);
			const b1 = Math.exp(-Math.pow((yn - band1) / 0.07, 2));
			const b2 = Math.exp(-Math.pow((yn - band2) / 0.1, 2));
			const rr = Math.hypot((P[i][0] + P[j][0]) / 2 - pad - R, (P[i][1] + P[j][1]) / 2 - pad - R) / R;
			const feather = 1 - 0.9 * smooth(0.88, 1, rr);
			const fl = Math.exp(-Math.pow(((sec * 1.3 + hash(k) * 11) % 3.1) - 0.1, 2) * 50) + beatPulse * 0.3;
			const nb = (nodeB[i] + nodeB[j]) / 2;
			let al = (0.45 + 0.6 * ((d + 1) / 2)) * (0.55 + 0.8 * nb) * (1 - 0.45 * b2) + 0.6 * b1 + 0.3 * fl;
			if (compact) al = Math.max(al, 0.7 * feather);
			g.strokeStyle = css(mixRGB(col, WHITE, Math.min(1, fl * 0.5 + b1 * 0.6)), Math.min(1, al * feather));
			g.beginPath();
			g.moveTo(P[i][0], P[i][1]);
			g.lineTo(P[j][0], P[j][1]);
			g.stroke();
		});
		P.forEach(([x, y, z], i) => {
			const yn = (y - pad) / (2 * R);
			const b1 = Math.exp(-Math.pow((yn - band1) / 0.07, 2));
			const s = (1 + (z + 1) * 0.9) * (0.5 + nodeB[i] * 0.9) + b1 * 1.6;
			g.fillStyle = css(mixRGB(col, WHITE, 0.35 + 0.4 * nodeB[i] + 0.4 * b1), Math.min(1, 0.25 + 0.75 * nodeB[i] + b1));
			g.fillRect(x - s / 2, y - s / 2, s, s);
		});
		return c;
	};
	// the lattice itself is redrawn at 12 a second, not every frame: the rows torn and jittered from it move faster
	const step = Math.floor(sec * 2);
	const fresh = lattice.step !== step || lattice.px !== px;
	lattice.step = step;
	lattice.px = px;
	const main = fresh ? paint('c', VIOLET) : latticeCanvas('c', px, px);
	const mag = fresh ? paint('m', [255, 80, 200]) : latticeCanvas('m', px, px);
	const cyan = fresh ? paint('y', [80, 220, 255]) : latticeCanvas('y', px, px);
	if (!main) return;
	// the image arrives behind a sweeping line, row by row, then holds: torn rows, jitter, a split in its color
	const build = ramp(BUILD[0], BUILD[1], t3);
	const x0 = cx - R - pad;
	const y0 = cy - R - pad;
	const reveal = y0 + size * build;
	const rowH = 2;
	// on a phone the image is sparser still: most rows are gaps, wide enough for the stars behind to show
	const jitterStep = Math.floor(sec * 2);
	// a tear in the image holds with everything else, and comes on at most one hold in three
	const tearHold = Math.floor(t3 * 2);
	const tearing = tearHold % 3 === 1;
	const tearRow = Math.floor(hash(tearHold, 5) * (size / rowH));
	// now and then the whole image rolls, as a picture held by a weak signal does
	const roll = 8 * Math.exp(-Math.pow((sec % 2.6 - 0.2) / 0.22, 2));
	// at most two bright rows at a time, travelling down the image
	const rowsN = Math.floor(size / rowH);
	const c1 = (((sec * 0.25) % 1) * 1.3 - 0.15) * rowsN;
	const c2 = ((((sec * 0.25) + 0.5) % 1) * 1.3 - 0.15) * rowsN;
	const copy = (img: HTMLCanvasElement, alpha: number, dx: number, seedOff: number) => {
		for (let r = 0, y = y0; y < y0 + size; r++, y += rowH) {
			if (seedOff && r % 2) continue;
			if (compact ? r % 4 !== 0 : r % 5 === 2) continue;
			if (y > reveal) continue;
			const edge = Math.abs(y - cy) / (R + pad);
			const keep = hash(r, jitterStep * 3 + 1 + seedOff) > 0.55 * Math.pow(edge, 2);
			if (!keep) continue;
			// interference: the rows brighten and dim in bands that travel down the image
			ctx.globalAlpha = alpha * (0.42 + 0.58 * Math.max(Math.exp(-Math.pow((r - c1) / 2.2, 2)), Math.exp(-Math.pow((r - c2) / 2.2, 2))));
			let off = (hash(r, jitterStep + seedOff) - 0.5) * 7 * (1 - build * 0.5);
			if (tearing && r >= tearRow && r < tearRow + 7) off += 26 * (seedOff ? 1.3 : 1);
			// a quarter of the rows run out past the edge of the image, some left, some right
			const over = hash(r, Math.floor(sec * 2) + 60);
			if (over < 0.15) off += (hash(r, 61) < 0.5 ? -1 : 1) * (8 + hash(r, Math.floor(sec * 2) + 62) * 12);
			ctx.drawImage(img, 0, Math.round((y - y0) * f), img.width, Math.max(1, Math.round(rowH * f)), x0 + off + dx, y + roll, size, rowH);
		}
	};
	ctx.save();
	ctx.globalCompositeOperation = 'lighter';
	// its glow: a volume of light, faint, so the network reads as an image and not a solid
	if (mag) copy(mag, (compact ? 0.5 : 0.8) * 1.4 * a, -4.5, 3);
	if (cyan) copy(cyan, 0.8 * 1.4 * a, 4.5, 7);
	copy(main, 1 * a, 0, 0);
	// a few blocks of the image displaced sideways, as a bad frame does
	if (tearing) {
		for (let k = 0; k < 3; k++) {
			const sy = Math.floor(hash(jitterStep, k + 20) * (px * 0.8));
			const sh = Math.max(3, Math.round(px * (0.03 + hash(jitterStep, k + 30) * 0.05)));
			const sx = Math.floor(hash(jitterStep, k + 40) * px * 0.4);
			if (y0 + sy / f > reveal) continue;
			ctx.globalAlpha = 0.5 * a;
			ctx.drawImage(main, sx, sy, Math.floor(px * 0.5), sh, x0 + sx / f + (hash(jitterStep, k + 50) - 0.5) * 60, y0 + sy / f + roll, (px * 0.5) / f, sh / f);
		}
	}
	// the lattice itself, faint, once it has been built down to here
	ctx.save();
	ctx.beginPath();
	ctx.rect(x0 - 30, y0, size + 60, Math.max(0, reveal - y0));
	ctx.clip();
	ctx.globalAlpha = 0.28 * a;
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
		ctx.globalAlpha = na * 0.5;
		ctx.fillStyle = css(mixRGB(VIOLET, WHITE, 0.1));
		ctx.font = `600 ${labelPx}px "Martian Mono", ui-monospace, monospace`;
		ctx.textAlign = 'left';
		ctx.textBaseline = 'middle';
		if ('letterSpacing' in ctx) (ctx as Ctx & { letterSpacing: string }).letterSpacing = `${Math.round(labelPx * 0.3)}px`;
		ctx.fillText('APEX', cx + R + 18, cy);
		ctx.restore();
	}
}

/* ------------------------------------------------------------------ the painted surface */
// One texture over the whole figure, made once: broad soft mottling, loose brush strokes all leaning the same
// way (one hand), and a fine grit. It sits still, so nothing boils; only the film grain moves.

let finishTex: HTMLCanvasElement | null | undefined;
function finishTexture() {
	if (finishTex !== undefined) return finishTex;
	const o = offscreen(W, H);
	if (!o) return (finishTex = null);
	const g = o.g;
	const r = rng(2024);
	for (let k = 0; k < 110; k++) {
		const x = r() * W;
		const y = r() * H;
		const rad = 30 + r() * 110;
		const light = r() < 0.5;
		const gr = g.createRadialGradient(x, y, 0, x, y, rad);
		gr.addColorStop(0, css(light ? [214, 208, 196] : [4, 4, 8], 0.07 + r() * 0.05));
		gr.addColorStop(1, css(light ? [214, 208, 196] : [4, 4, 8], 0));
		g.fillStyle = gr;
		g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
	}
	g.lineCap = 'round';
	for (let k = 0; k < 1100; k++) {
		const x = r() * W;
		const y = r() * H;
		const len = 10 + r() * 34;
		const ang = -0.35 + (r() - 0.5) * 0.5;
		g.strokeStyle = css(r() < 0.5 ? [226, 220, 208] : [4, 5, 9], 0.03 + r() * 0.05);
		g.lineWidth = 1.2 + r() * 3.2;
		g.beginPath();
		g.moveTo(x, y);
		g.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
		g.stroke();
	}
	for (let k = 0; k < 9000; k++) {
		g.fillStyle = css(r() < 0.5 ? [230, 226, 214] : [0, 0, 0], 0.05 + r() * 0.08);
		g.fillRect(r() * W, r() * H, 1 + (r() < 0.2 ? 1 : 0), 1);
	}
	return (finishTex = o.c);
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
	void loadArt();
	let stage = 0;
	let present = false;
	let vis = 0;
	/** Whether the bloom has finished, so a pull-back does not run it backwards. */
	let built = false;
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
		// it stands on ground: the oval holds its lower half longer so the ground recedes rather than ends
		groundHold: 0.76,
		ready: loadArt,
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
			if (vis > 0.9) built = true;
			if (vis < 0.002 && !present) built = false;
			if (vis < 0.002 && !present) vis = 0;
			// the worlds stop where they stand when APEX comes, so the dip falls on the world it found
			if (stage !== 1) t2 += dt;
			else t3 += dt;
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
		draw(ctx, sec, opts) {
			if (vis <= 0.005) return;
			const L = opts?.compact ? COMPACT : WIDE;
			ctx.save();
			// bloom out of (and pull back toward) the anchor: a short settle in scale under the fade, never down to a point
			const an = anchor();
			const bs = 0.86 + 0.14 * easeOut(vis);
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
					drawWorld(ctx, ws.prev, -70 * ws.k, sec, wa, ws.since + PER + (stage === 1 ? 4 : 0));
					drawWorld(ctx, ws.cur, 70 * (1 - ws.k), sec, wa * ws.k, ws.since + (stage === 1 ? 4 : 0));
				} else drawWorld(ctx, ws.cur, 0, sec, wa, ws.since + (stage === 1 ? 4 : 0));
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
			// each world's 2.7 s: the ring reads and the old form comes apart with the gel's cross-fade (0 to 0.5 s), a pulse of
			// light runs down the mast into the gel (0.5 to 0.8), the four seeds grow, staggered 0.1 s (0.8 to 1.5), and the
			// formed seeds hold for the rest
			const eT = readT + CROSS * 0.3;
			const reading = (1 - v3) * smooth(-0.1, 0.1, readT) * (1 - smooth(0.25, 0.45, readT));
			const PULSE0 = 0.5;
			const PULSE_LEN = 0.3;
			const adapt = smooth(0, 0.5, eT) * 0.4 + smooth(PULSE0 + PULSE_LEN, 1.5, eT) * 0.6;
			const growT = eT - (PULSE0 + PULSE_LEN);
			const pulseU = stage !== 1 ? ramp(PULSE0, PULSE0 + PULSE_LEN, eT) : 0;
			const tickV = stage !== 1 && eT > PULSE0 ? Math.exp(-(eT - PULSE0) / 0.12) : 0;
			let kindA: SeedKind = ws.prev >= 0 ? WORLDS[ws.prev].key : 'genesis';
			let kindB: SeedKind = WORLDS[ws.cur].key;
			let km = adapt;
			// the gel does not cross-fade through gray: it dims in its old color while the old seeds come apart, the
			// machine goes quiet and reads the world, and the pulse lights the new life in the new color
			const oldGel: RGB = ws.prev >= 0 ? WORLDS[ws.prev].gel : GENESIS;
			const newGel: RGB = WORLDS[ws.cur].gel;
			const gelLevel = eT < 0.8 ? mix(1, 0.45, smooth(0, 0.4, eT)) : mix(0.45, 1, smooth(0.8, 1.1, eT));
			let gel: RGB = scaleRGB(eT < 0.8 ? oldGel : newGel, gelLevel);
			if (v3 > 0.5 && stage === 1) {
				// 03 began between worlds: the change in the gel finishes inside the power dip, so it never holds the old world's color
				kindA = WORLDS[ws.cur].key;
				kindB = kindA;
				km = 1;
				gel = newGel;
				if (!frozen) frozen = { kindA, kindB, km, gel };
				({ kindA, kindB, km, gel } = frozen);
			}
			const sideOf = (k: SeedKind) => (k === 'genesis' ? -0.4 : k === 'apex' ? 0 : worldSide(WKEYS.indexOf(k)));
				// all the machine's lighting crosses over inside the backdrop's own CROSS
				const xfade = stage !== 1 && ws.prev >= 0 && ws.k < 1;
				const sideNow = xfade ? mix(worldSide(ws.prev), worldSide(ws.cur), ws.k) : ws.prev < 0 && stage !== 1 ? mix(sideOf('genesis'), worldSide(ws.cur), smooth(0.2, 0.7, t)) : worldSide(ws.cur);
				const lightNow = xfade ? mixRGB(worldSeam(ws.prev), worldSeam(ws.cur), ws.k) : worldSeam(w3);
				const underNow = xfade ? mix(ws.prev === 1 ? 1 : 0, ws.cur === 1 ? 1 : 0, ws.k) : w3 === 1 ? 1 : 0;
				// the machines, each on its own world: ours first, the others coming into view as the view pulls back
			const sensors: { x: number; y: number; at: number; a: number }[] = [];
			L.machines.forEach((m, i) => {
				const first = i === 0;
				const lk = v3 * smooth(LINK + m.order * 0.14 + 0.25, LINK + m.order * 0.14 + 0.7, t3);
				const app = first ? 1 : v3 * smooth(0.8 + i * 0.12, 1.6 + i * 0.12, t3);
				if (app <= 0.01) return;
				const z = first ? mix(L === COMPACT ? 0.9 : 0.86, m.s, arrive) : m.s;
				const gy = first ? mix(GROUND - (L === COMPACT ? 70 : 80), m.g, arrive) : m.g;
				const wi = first ? w3 : (w3 + m.wOff) % 4;
				ctx.save();
				ctx.translate(m.x, gy);
				ctx.scale(z, z);
				ctx.translate(-480, -GROUND);
				const pa = (first ? arrive : app) * vis;
				if (pa > 0.01) {
					// a low patch of its world's ground under it, lit by that world, fading upward into the dark between worlds
						drawPatch(ctx, wi, sec + i * 1.7, pa, lk);
					}
					const own = first ? gel : WORLDS[wi].gel;
					// the far machines keep a little light of their own, so none is lost in the dark
					if (!first) lighter(ctx, () => glow(ctx, 480, 330, 300, mixRGB(own, VIOLET, lk * 0.7), 0.14 * app * vis));
				const kind: SeedKind | null = first ? null : WORLDS[wi].key;
				const tintWorld = first ? (xfade ? ws.prev : w3) : wi;
				const lavaW = first ? underNow : wi === 1 ? 1 : 0;
				const fl = first && stage === 0 && WORLDS[ws.cur].key === 'storm' ? Math.max(lightning(ws.since, 0.7), lightning(ws.since, 1.9)) : 0;
				drawMachine(ctx, {
					lite: !first,
					small: first && arrive > 0.9,
					housing: first && !built ? smooth(0.3, 0.8, vis) : 1,
					vat: first && !built ? smooth(0, 0.4, vis) : 1,
					world: !first && lk > 0.5 ? -1 : tintWorld,
					world2: first && xfade ? ws.cur : -1,
					wk: first && xfade ? ws.k : 0,
					under: lavaW * (1 - lk * 0.6),
					flash: fl,
					pulse: first && pulseU > 0 && pulseU < 1 ? pulseU : undefined,
					growT: first && stage !== 1 && v3 < 0.5 ? growT : undefined,
					tick: first ? tickV : 0,
					ringFlash: first && stage !== 1 && eT > PULSE0 - 0.06 && eT < PULSE0 + 0.02 ? 1 : 0,
					seedScale: L === COMPACT ? 1.15 : 1,
					seaLive: first ? 1 - arrive : 0,
					sec: sec + i * 1.7,
					gel: mixRGB(own, mixRGB(own, [128, 104, 190], 0.78), lk),
					light: mixRGB(first ? lightNow : worldSeam(wi), VIOLET, lk * 0.5),
						side: first ? sideNow : worldSide(wi) * 0.7,
					a: Math.max(first ? 1 : 0.6 * app, app) * (1 - dip) * smooth(0, 0.6, vis),
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
			// weather crosses in front of the machine too
			if (arrive < 0.6) {
				ctx.save();
				ctx.translate(480, 270);
				ctx.scale(mix(1, 0.7, arrive), mix(1, 0.7, arrive));
				ctx.translate(-480, -270);
				const fa = worldIn * (1 - arrive / 0.6) * vis;
				if (ws.prev >= 0 && ws.k < 1) {
					frontWeather(ctx, ws.prev, sec, fa * (1 - ws.k));
					frontWeather(ctx, ws.cur, sec, fa * ws.k);
				} else frontWeather(ctx, ws.cur, sec, fa);
				ctx.restore();
			}
			if (dip > 0.01) {
				ctx.fillStyle = css(BLACK, dip);
				ctx.fillRect(-40, -40, PW + 80, PH + 80);
				ctx.fillStyle = css(VIOLET, 0.12 * dip);
				for (let k = 0; k < 5; k++) ctx.fillRect(-40, hash(Math.floor(t3 * 24), k) * PH, PW + 80, 2 + hash(k, Math.floor(t3 * 24)) * 5);
			}
			// the view closes in on them
			const grade = v3 * smooth(0.3, 1.8, t3);
			if (grade > 0.01) {
				const vg = ctx.createRadialGradient(480, 280, 340, 480, 280, 680);
				vg.addColorStop(0, css([8, 4, 16], 0));
				vg.addColorStop(1, css([8, 4, 16], 0.4 * grade * vis));
				ctx.fillStyle = vg;
				ctx.fillRect(-40, -40, PW + 80, PH + 80);
			}
			// APEX: a network, not a thing. Links snap from it to every Generator in view at once (QED linked APEX
			// to the Generators it controlled: Zolton's history).
			if (v3 > 0.01) {
				const hub = L.hub;
				drawNet(ctx, hub.x, hub.y, hub.r, t3, v3 * vis, sec, beatPulse, L.label, !!opts?.compact);
				ctx.save();
				sensors.forEach((g, k) => {
					const on = v3 * vis * smooth(g.at, g.at + 0.08, t3) * g.a;
					if (on <= 0.01) return;
					const flash = Math.exp(-Math.pow((t3 - g.at - 0.05) / 0.12, 2));
					// while the links settle they pulse on APEX's beat; once the last machine is taken they hold
					const pz = smooth(4, 4.2, t3) * (1 - smooth(6, 6.3, t3));
					ctx.setLineDash([6, 6]);
					ctx.lineDashOffset = (present ? -1 : 1) * sec * 40;
					ctx.strokeStyle = css(VIOLET, (0.65 - 0.3 * pz * (1 - beatPulse)) * on + 0.35 * flash);
					ctx.lineWidth = 1.5 + 1.4 * pz * beatPulse;
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
			// the painted surface, then the grain: only onto what has been drawn
			const tex = finishTexture();
			if (tex) {
				ctx.save();
				ctx.globalCompositeOperation = 'source-atop';
				ctx.globalAlpha = (0.55 - 0.3 * arrive) * vis;
				ctx.drawImage(tex, 0, 0, W, H);
				ctx.globalAlpha = 0.07 * vis;
				ctx.fillStyle = css([44, 50, 60]);
				ctx.fillRect(0, 0, W, H);
				ctx.restore();
			}
			grain(ctx, sec, 0.05 * vis);
		},
	};
}
