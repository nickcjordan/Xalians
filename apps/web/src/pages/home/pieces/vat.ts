// Beats 2 and 3, the Generator's vat (docs/design/home-story-small-pieces.md). A round window in a dark
// riveted housing, filling the frame; green gel behind thick curved glass, lit from below; bubbles rising at
// several depths.
//
// - `forms` (beat 2): a creature condenses out of the glow as a cloud of motes that gathers into its shape, and
//   passes through three forms from three deadly worlds, each in its world's light, which floods the gel: Neph
//   of Saiphus (air), drawn as the glowing filaments it is, Imprit of Magmuth (fire) and Yetimoth of Krystos
//   (ice), lit from below inside the gel; then it settles and opens its eyes, two points of light. The
//   silhouettes are Nick's own (`src/svg/species/token/<key>.svg`), never redrawn.
// - `apex` (beat 3): the same vat and creature, eyes open. A hard line of violet-white light runs round the
//   rim, catching the bolts as it passes, and threads into the glass; the gel is overtaken from the edge
//   inward, near white at the front of the light and violet where it has settled; the bubbles slow and hang;
//   last, the creature's eyes flare violet. The color is an art choice, not canon.
import nephSvg from '@/svg/species/token/neph.svg?raw';
import impritSvg from '@/svg/species/token/imprit.svg?raw';
import yetimothSvg from '@/svg/species/token/yetimoth.svg?raw';
import { type Ctx, type RGB, H, W, clamp, css, easeOut, glow, lighter, loopFade, mix, mixRGB, motes, ramp, rng, smooth, sphere, vignette } from './stage';

export const FORMS_LOOP = 14;
export const APEX_LOOP = 12;

const CX = W / 2;
const CY = H / 2;
const R = 236; // the window's radius
const RIM = 30; // the ring's width

const VIOLET: RGB = [168, 118, 255];
const APEX_WHITE: RGB = [236, 226, 255];

// ---- The creatures, from their 64 unit silhouettes.

type Form = { key: string; d: string; tint: RGB; glowing?: boolean; eyes?: [number, number][] };
const pathOf = (svg: string) => (/\sd="([^"]+)"/.exec(svg) || [])[1] || '';
export const FORMS: Form[] = [
	{ key: 'neph', d: pathOf(nephSvg), tint: [112, 176, 255], glowing: true },
	{ key: 'imprit', d: pathOf(impritSvg), tint: [255, 146, 70] },
	{ key: 'yetimoth', d: pathOf(yetimothSvg), tint: [206, 228, 255], eyes: [[25.2, 12.6], [38.8, 12.6]] },
];
const SIL = 360; // the silhouette's box on the stage
const toStage = (x: number, y: number) => ({ x: CX + (x - 32) * (SIL / 64), y: CY + 6 + (y - 33) * (SIL / 64) });

const paths = new Map<string, Path2D>();
function path(f: Form): Path2D | null {
	if (typeof Path2D === 'undefined') return null;
	let p = paths.get(f.key);
	if (!p) {
		p = new Path2D(f.d);
		paths.set(f.key, p);
	}
	return p;
}

// Points inside each silhouette, for its motes to gather to.
const DOTS = 240;
const inside = new Map<string, { x: number; y: number }[]>();
function dots(f: Form): { x: number; y: number }[] {
	const hit = inside.get(f.key);
	if (hit) return hit;
	const p = path(f);
	const out: { x: number; y: number }[] = [];
	if (p && typeof document !== 'undefined') {
		const c = document.createElement('canvas').getContext('2d');
		const r = rng(f.key.length * 977);
		for (let k = 0; k < 30000 && out.length < DOTS && c; k++) {
			const x = r() * 64;
			const y = r() * 64;
			if (c.isPointInPath(p, x, y, 'evenodd')) out.push(toStage(x, y));
		}
	}
	while (out.length < DOTS) out.push({ x: CX, y: CY });
	inside.set(f.key, out);
	return out;
}

/** The creature in the gel: lit from below by `light`, hazed by the gel in front of it. */
function drawCreature(ctx: Ctx, f: Form, alpha: number, light: RGB, gelColor: RGB, lift: number) {
	const p = path(f);
	if (!p || alpha <= 0.004) return;
	ctx.save();
	ctx.translate(CX - 32 * (SIL / 64), CY + 6 - 33 * (SIL / 64) - lift);
	ctx.scale(SIL / 64, SIL / 64);
	ctx.globalAlpha = alpha;
	if (f.glowing) {
		// a creature of light: its own paths, glowing
		ctx.globalCompositeOperation = 'lighter';
		ctx.shadowColor = css(light, 1);
		ctx.shadowBlur = 14;
		ctx.fillStyle = css(light, 0.8);
		ctx.fill(p, 'evenodd');
		ctx.shadowBlur = 0;
		ctx.fillStyle = css(mixRGB(light, [255, 255, 255], 0.35), 0.3);
		ctx.fill(p, 'evenodd');
		ctx.globalCompositeOperation = 'source-over';
	} else {
		// its body: lit from below, bright at its base where the light meets it and dark toward its head
		const body = ctx.createLinearGradient(0, 62, 0, 6);
		body.addColorStop(0, css(mixRGB(light, [10, 16, 16], 0.25)));
		body.addColorStop(0.35, css(mixRGB(light, [10, 16, 16], 0.62)));
		body.addColorStop(1, css(mixRGB(light, [4, 8, 8], 0.9)));
		ctx.fillStyle = body;
		ctx.fill(p, 'evenodd');
		// its edge caught by the light below and at the sides, gone at the top
		const rim = ctx.createLinearGradient(0, 64, 0, 0);
		rim.addColorStop(0, css(light, 1));
		rim.addColorStop(0.55, css(light, 0.35));
		rim.addColorStop(1, css(light, 0));
		ctx.shadowColor = css(light, 0.8);
		ctx.shadowBlur = 10;
		ctx.strokeStyle = rim;
		ctx.lineWidth = 0.45;
		ctx.stroke(p);
		ctx.shadowBlur = 0;
		// the gel in front of it
		ctx.fillStyle = css(gelColor, 0.14);
		ctx.fill(p, 'evenodd');
	}
	ctx.restore();
	ctx.globalAlpha = 1;
}

// ---- The vat.

type Bubble = { x: number; y0: number; speed: number; r: number; depth: number; wob: number };
const BUBBLES: Bubble[] = (() => {
	const r = rng(31);
	return Array.from({ length: 54 }, () => ({ x: (r() * 2 - 1) * R * 0.9, y0: r(), speed: 30 + r() * 60, r: 2 + r() * 7, depth: r(), wob: r() * Math.PI * 2 }));
})();

type Mote = { x: number; y: number; ph: number };
const MOTES: Mote[] = (() => {
	const r = rng(8);
	return Array.from({ length: DOTS }, () => {
		const a = r() * Math.PI * 2;
		const d = Math.sqrt(r()) * R * 0.95;
		return { x: CX + Math.cos(a) * d, y: CY + Math.sin(a) * d, ph: r() * Math.PI * 2 };
	});
})();

const GREEN: RGB = [70, 190, 96];

/** The gel behind the glass, lit from below, its light leaning toward `light`. */
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
		ctx.globalAlpha = 0.3 + 0.5 * near;
		ctx.strokeStyle = css(mixRGB(color, [255, 255, 255], 0.5));
		ctx.lineWidth = 1.1;
		ctx.beginPath();
		ctx.arc(x, y, r, 0, Math.PI * 2);
		ctx.stroke();
		ctx.globalAlpha = 1;
		glow(ctx, x - r * 0.35, y - r * 0.35, r * 0.7, [255, 255, 255], 0.55 * near, 'core');
	}
}

function housing(ctx: Ctx, spill: RGB, rimLight: number, runAt: number) {
	// the plate around the window
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
	for (const x of [150, W - 150]) {
		ctx.beginPath();
		ctx.moveTo(x, 0);
		ctx.lineTo(x, H);
		ctx.stroke();
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
		sphere(ctx, bx, by, 5.2, [120, 126, 128], 1, 0.8);
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

/** Where the forms stand at `t`: which form, how gathered and solid it is, and its eyes. */
function formsAt(t: number) {
	const S = [0.8, 4.0, 7.2]; // each form begins to gather
	const GATHER = 1.6;
	const HOLD = 1.1;
	let which = 0;
	for (let k = 0; k < 3; k++) if (t >= S[k]) which = k;
	const t0 = S[which];
	const gather = smooth(t0, t0 + GATHER, t);
	const loosen = which < 2 ? smooth(t0 + GATHER + HOLD, t0 + GATHER + HOLD + 0.5, t) : 0;
	// the motes draw the outline first; the body fills in after
	const solid = smooth(t0 + GATHER * 0.8, t0 + GATHER + 0.3, t) * (1 - loosen);
	return { which, gather, loosen, solid, eyes: ramp(10.0, 10.6, t) };
}

export function drawVat(ctx: Ctx, mode: 'forms' | 'apex', t: number, sec: number) {
	ctx.fillStyle = '#000';
	ctx.fillRect(0, 0, W, H);
	// the takeover (apex only)
	const take = mode === 'apex' ? smooth(3.2, 8.0, t) : 0;
	const rimRun = mode === 'apex' ? ramp(1.0, 2.6, t) : 0;
	const thread = mode === 'apex' ? smooth(2.4, 3.6, t) : 0;
	const eyeTurn = mode === 'apex' ? smooth(8.3, 8.9, t) : 0;

	const f = mode === 'apex' ? { which: 2, gather: 1, loosen: 0, solid: 1, eyes: 1 } : formsAt(t);
	const form = FORMS[f.which];
	const light = mixRGB(form.tint, VIOLET, take * 0.7);
	// each world's light floods the gel while its form holds; the ice world's cold light stays in the creature
	const flood = form.key === 'yetimoth' ? 0.12 : 0.42;
	const gelBase = mixRGB(mixRGB(GREEN, form.tint, flood * f.solid), mixRGB(VIOLET, [40, 20, 90], 0.4), take * 0.85);

	ctx.save();
	ctx.beginPath();
	ctx.arc(CX, CY, R, 0, Math.PI * 2);
	ctx.clip();
	gel(ctx, sec, gelBase);
	if (take > 0) {
		// the front of the light: a near-white band closing in from the rim
		const front = R * (1 - take) * 1.02;
		lighter(ctx, () => {
			const g = ctx.createRadialGradient(CX, CY, Math.max(0, front - 26), CX, CY, front + 40);
			g.addColorStop(0, css(APEX_WHITE, 0));
			g.addColorStop(0.5, css(APEX_WHITE, 0.35 * (1 - take * 0.6)));
			g.addColorStop(1, css(VIOLET, 0.12));
			ctx.fillStyle = g;
			ctx.fillRect(CX - R, CY - R, R * 2, R * 2);
			glow(ctx, CX, CY, R * 1.2, VIOLET, 0.28 * take);
		});
	}
	lighter(ctx, () => bubbles(ctx, sec, take, mixRGB([150, 240, 170], APEX_WHITE, take)));

	// the motes the creature gathers from, and loosens back into
	const pts = dots(form);
	const moteAmt = mode === 'apex' ? 0 : (f.gather < 1 ? 1 : 0) * (1 - f.solid * 0.8) + f.loosen;
	if (moteAmt > 0.01)
		lighter(ctx, () => {
			for (let k = 0; k < DOTS; k++) {
				const m = MOTES[k];
				const p = pts[k];
				const g = easeOut(f.gather);
				let x = mix(m.x, p.x, g);
				let y = mix(m.y, p.y, g);
				if (f.loosen > 0) {
					x += Math.cos(m.ph) * 40 * f.loosen;
					y += Math.sin(m.ph) * 40 * f.loosen - 20 * f.loosen;
				}
				x += Math.sin(sec * 1.1 + m.ph) * 3;
				const a = clamp(moteAmt) * (0.55 + 0.45 * Math.sin(sec * 3 + m.ph));
				glow(ctx, x, y, 9, form.tint, 0.4 * a);
				glow(ctx, x, y, 2.6, [255, 255, 255], 0.9 * a, 'core');
			}
		});
	const breathe = Math.sin(sec * 1.2) * 3;
	drawCreature(ctx, form, f.solid, light, gelBase, breathe);
	// the eyes: two points of light that open, flare and settle; in the takeover they flare violet, last
	if (form.eyes && f.eyes > 0.001 && f.solid > 0.5) {
		const flare = mode === 'apex' ? Math.exp(-Math.pow((t - 8.6) / 0.35, 2)) : Math.exp(-Math.pow((t - 10.4) / 0.3, 2));
		const eyeColor = mixRGB([226, 255, 236], VIOLET, eyeTurn);
		lighter(ctx, () => {
			for (const [ex, ey] of form.eyes!) {
				const p = toStage(ex, ey);
				const open = f.eyes * (0.9 + 0.1 * Math.sin(sec * 2.1));
				glow(ctx, p.x, p.y - breathe, (26 + 40 * flare) * open, eyeColor, (0.55 + 0.35 * flare) * open);
				glow(ctx, p.x, p.y - breathe, (7 + 5 * flare) * open, mixRGB([255, 255, 255], eyeColor, eyeTurn * 0.5), 1, 'core');
			}
		});
	}
	glass(ctx, sec);
	ctx.restore();

	housing(ctx, mixRGB(gelBase, [255, 255, 255], 0.3), rimRun > 0 ? 1 - take * 0.5 : 0, rimRun);
	if (mode === 'apex')
		lighter(ctx, () => {
			// the light running round the rim, then threading in across the glass
			if (rimRun > 0) {
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
			}
			if (thread > 0) {
				for (let k = 0; k < 5; k++) {
					const a0 = -Math.PI / 2 + (k / 5) * Math.PI * 2 + 0.3;
					ctx.beginPath();
					let hx = 0;
					let hy = 0;
					for (let s = 0; s <= 24; s++) {
						const fr = (s / 24) * thread;
						const a = a0 + fr * 0.9 + Math.sin(fr * 9 + k) * 0.05;
						const rr = mix(R + RIM, R * 0.6, fr);
						hx = CX + Math.cos(a) * rr;
						hy = CY + Math.sin(a) * rr;
						if (s) ctx.lineTo(hx, hy);
						else ctx.moveTo(hx, hy);
					}
					ctx.strokeStyle = css(VIOLET, 0.4 * (1 - take));
					ctx.lineWidth = 7;
					ctx.stroke();
					ctx.strokeStyle = css(APEX_WHITE, 0.85 * (1 - take));
					ctx.lineWidth = 2.4;
					ctx.stroke();
					glow(ctx, hx, hy, 20, APEX_WHITE, 0.8 * thread * (1 - take), 'core');
				}
			}
		});
	motes(ctx, sec, mixRGB([170, 220, 190], VIOLET, take), 'front', 0.8);
	vignette(ctx, 0.7);
	const fade = loopFade(t, mode === 'apex' ? APEX_LOOP : FORMS_LOOP);
	if (fade < 1) {
		ctx.fillStyle = `rgba(0,0,0,${(1 - fade).toFixed(3)})`;
		ctx.fillRect(0, 0, W, H);
	}
}
