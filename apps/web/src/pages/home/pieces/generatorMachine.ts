// The Generator machine, shared by the home story's figures (docs/design/home-story-figures.md): the Generators
// figure (beats 02 and 03) and the outbreak figure's 06, which shows the same machine dormant and then woken.
// Everything static (the housing, cabinets, pipes, pad, sensor ring, readout and vat frame) is drawn once
// into offscreen canvases on first use; `drawMachine` composes them and draws what moves.
import { clamp, css, easeOut, glow, lighter, mix, mixRGB, ramp, rng, smooth, type Ctx, type RGB } from './stage';

export const PW = 960;
export const PH = 540;
export const TAU = Math.PI * 2;
export const ease = (v: number) => {
	const c = clamp(v);
	return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
};
export const hash = (a: number, b = 0) => {
	const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
	return v - Math.floor(v);
};
export const WHITE: RGB = [255, 255, 255];
export const BLACK: RGB = [0, 0, 0];
export const VIOLET: RGB = [172, 124, 255];
/** Where the machine stands, in the drawing's own units. */
export const GROUND = 438;
/** Where the worlds' painted layers start, in the drawing's own units. */
export const WX0 = -120;
export type WorldKey = 'storm' | 'lava' | 'ice' | 'sea';

export function offscreen(w: number, h: number): { c: HTMLCanvasElement; g: Ctx } | null {
	if (typeof document === 'undefined') return null;
	const c = document.createElement('canvas');
	c.width = Math.max(1, Math.round(w));
	c.height = Math.max(1, Math.round(h));
	const g = c.getContext('2d');
	return g ? { c, g } : null;
}

/** Bleed a layer a little into itself, so hard vector edges read as brushed. */
export function soften(o: HTMLCanvasElement, a: number) {
	const t = offscreen(o.width / 3, o.height / 3);
	const g = o.getContext('2d');
	if (!t || !g) return;
	t.g.drawImage(o, 0, 0, t.c.width, t.c.height);
	g.save();
	g.setTransform(1, 0, 0, 1, 0, 0);
	g.globalAlpha = a;
	g.drawImage(t.c, 0, 0, o.width, o.height);
	g.restore();
}

export type Pic = { c: HTMLCanvasElement; light: RGB; side: number; amb: RGB; sky: RGB };
/** The paintings the machine has been seen in (set by the Generators figure as they load), and any custom world. */
export const pics: (Pic | null)[] = [null, null, null, null];

/* ------------------------------------------------------------------ the Generator */
// Kept from Floria's Genesis Prototype: the riveted banded housing with its rounded shoulders, the tall capsule
// vat, seeds of life in the glow, the pipes at its side, the side box and its gauge. Changed
// with time: cleaner plating with lit seams, a sensor ring on a mast, an intake grille that glows as it reads,
// a life-signs readout, a standing pad. No chute.

export const MX = 480;
export const VX = 480;
export const VY0 = 196;
export const VY1 = 404;
export const VR = 42;
export const DISH = { x: MX - 20, y: 104 };
export const BODY = { x0: MX - 106, x1: MX + 106, top: 170, bot: GROUND - 2, r: 46 };

export function bodyPath(ctx: Ctx) {
	ctx.beginPath();
	ctx.moveTo(BODY.x0, BODY.bot);
	ctx.lineTo(BODY.x0, BODY.top + BODY.r);
	ctx.arcTo(BODY.x0, BODY.top, BODY.x0 + BODY.r, BODY.top, BODY.r);
	ctx.lineTo(BODY.x1 - BODY.r, BODY.top);
	ctx.arcTo(BODY.x1, BODY.top, BODY.x1, BODY.top + BODY.r, BODY.r);
	ctx.lineTo(BODY.x1, BODY.bot);
	ctx.closePath();
}
export function vatPath(ctx: Ctx) {
	ctx.beginPath();
	ctx.moveTo(VX - VR, VY0 + VR);
	ctx.arc(VX, VY0 + VR, VR, Math.PI, 0);
	ctx.lineTo(VX + VR, VY1 - VR);
	ctx.arc(VX, VY1 - VR, VR, 0, Math.PI);
	ctx.closePath();
}

export const metalCol = (tone: number): RGB => [42 * tone, 51 * tone, 52 * tone];

/** Broken lighter dashes along a plate's lit edges: paint worn off where hands and weather caught it. */
export function wear(g: Ctx, x0: number, y0: number, x1: number, y1: number, seed: number) {
	const r = rng(seed);
	g.strokeStyle = css([200, 206, 196], 0.3);
	g.lineWidth = 1.1;
	g.beginPath();
	const run = (ax: number, ay: number, bx: number, by: number) => {
		const len = Math.hypot(bx - ax, by - ay);
		let d = r() * 6;
		while (d < len) {
			const seg = 2 + r() * 7;
			if (r() > 0.42) {
				const u0 = d / len;
				const u1 = Math.min(1, (d + seg) / len);
				g.moveTo(mix(ax, bx, u0), mix(ay, by, u0));
				g.lineTo(mix(ax, bx, u1), mix(ay, by, u1));
			}
			d += seg + 2 + r() * 9;
		}
	};
	run(x0 + 0.5, y0 + 1, x1, y0 + 1);
	run(x0 + 1, y0, x0 + 1, y1);
	g.stroke();
}

/** A plate of banded steel: toned a little differently from its neighbors, seamed dark, its lit edges worn. */
export function metal(g: Ctx, x0: number, y0: number, x1: number, y1: number, tone: number, seed: number) {
	g.fillStyle = css(metalCol(tone));
	g.fillRect(x0, y0, x1 - x0, y1 - y0);
	const v = g.createLinearGradient(0, y0, 0, y1);
	v.addColorStop(0, css(WHITE, 0.07));
	v.addColorStop(0.5, css(WHITE, 0));
	v.addColorStop(1, css(BLACK, 0.26));
	g.fillStyle = v;
	g.fillRect(x0, y0, x1 - x0, y1 - y0);
	g.strokeStyle = css([5, 7, 8], 0.85);
	g.lineWidth = 1;
	g.strokeRect(x0 + 0.5, y0 + 0.5, x1 - x0 - 1, y1 - y0 - 1);
	wear(g, x0, y0, x1, y1, seed);
}

export function rivetAt(g: Ctx, x: number, y: number, rusty: boolean) {
	g.fillStyle = css([10, 12, 13], 0.9);
	g.beginPath();
	g.arc(x, y, 2.1, 0, TAU);
	g.fill();
	g.fillStyle = css([150, 158, 152], 0.6);
	g.beginPath();
	g.arc(x - 0.6, y - 0.7, 0.95, 0, TAU);
	g.fill();
	if (rusty) {
		// grime running down from it
		const len = 20 + hash(x, y) * 10;
		const st = g.createLinearGradient(0, y, 0, y + len);
		st.addColorStop(0, css([80, 48, 24], 0.3));
		st.addColorStop(1, css([80, 48, 24], 0.05));
		g.fillStyle = st;
		g.fillRect(x - 1, y, 2, len);
	}
}

export function pipe(g: Ctx, pts: [number, number][], w: number) {
	const path = (dx: number, dy: number) => {
		g.beginPath();
		pts.forEach(([x, y], i) => (i ? g.lineTo(x + dx, y + dy) : g.moveTo(x + dx, y + dy)));
		g.stroke();
	};
	g.lineJoin = 'round';
	g.lineCap = 'butt';
	g.strokeStyle = css([12, 14, 15]);
	g.lineWidth = w + 3;
	path(0, 0);
	g.strokeStyle = css([58, 66, 66]);
	g.lineWidth = w;
	path(0, 0);
	g.strokeStyle = css([170, 178, 172], 0.3);
	g.lineWidth = Math.max(1, w * 0.26);
	path(-w * 0.2, -w * 0.2);
	g.strokeStyle = css(BLACK, 0.3);
	path(w * 0.3, w * 0.3);
	// a flange at each bend
	for (const [x, y] of pts.slice(1, -1)) {
		g.fillStyle = css([32, 36, 37]);
		g.fillRect(x - w * 0.8, y - w * 0.8, w * 1.6, w * 1.6);
		g.strokeStyle = css([6, 8, 8], 0.8);
		g.lineWidth = 1;
		g.strokeRect(x - w * 0.8 + 0.5, y - w * 0.8 + 0.5, w * 1.6 - 1, w * 1.6 - 1);
	}
}

// The machine's static drawing, made once at MQ times its size and copied every frame.
export const MQ = 2;
export const MC = { x: MX - 214, y: 70, w: 428, h: GROUND + 46 - 70 };
export let mcache: HTMLCanvasElement | null | undefined;

export function paintMachine(g: Ctx) {
	// a dark oil stain on the pad under the intake
	g.save();
	g.translate(MX + 128, GROUND + 8);
	g.scale(1, 0.24);
	const oil = g.createRadialGradient(0, 0, 0, 0, 0, 44);
	oil.addColorStop(0, css([4, 4, 4], 0.7));
	oil.addColorStop(0.6, css([4, 4, 4], 0.4));
	oil.addColorStop(1, css([4, 4, 4], 0));
	g.fillStyle = oil;
	g.fillRect(-46, -46, 92, 92);
	g.restore();
	for (let k = 0; k < 7; k++) {
		g.fillStyle = css([6, 8, 8]);
		g.beginPath();
		g.arc(MX - 132 + k * 44, GROUND + 8, 4.5, 0, TAU);
		g.fill();
	}

	// pipes: over the roof and down into the intake box, and down the left to the side box (the later model has no lattice tower)
	pipe(g, [[MX + 52, 148], [MX + 52, 122], [MX + 80, 116], [MX + 128, 116], [MX + 128, 248]], 7);
	pipe(g, [[MX - 60, 158], [MX - 127, 158], [MX - 127, 300]], 6);

	// the side box and the intake box
	metal(g, MX - 150, 300, MX - 104, GROUND - 2, 0.92, 21);
	g.fillStyle = css([8, 10, 11]);
	g.beginPath();
	g.arc(MX - 127, 330, 15, 0, TAU);
	g.fill();
	g.strokeStyle = css([120, 126, 120], 0.8);
	g.lineWidth = 2;
	g.stroke();
	g.fillStyle = css([20, 24, 25]);
	for (let k = 0; k < 5; k++) g.fillRect(MX - 144, 360 + k * 13, 34, 4);
	rivetAt(g, MX - 144, 306, true);
	rivetAt(g, MX - 110, 306, true);
	metal(g, MX + 104, 250, MX + 152, GROUND - 2, 0.96, 22);
	g.fillStyle = css([5, 9, 9]);
	g.fillRect(MX + 110, 262, 36, 40);
	g.strokeStyle = css([96, 102, 98], 0.8);
	g.lineWidth = 1;
	g.strokeRect(MX + 110.5, 262.5, 35, 39);
	g.fillStyle = css([12, 16, 16]);
	for (let k = 0; k < 9; k++) g.fillRect(MX + 112, 318 + k * 12, 32, 5);
	rivetAt(g, MX + 110, 256, true);
	rivetAt(g, MX + 146, 256, true);
	// grime darkening the bottom 15 percent of each side box
	for (const [x0, x1, y0] of [[MX - 150, MX - 104, 300], [MX + 104, MX + 152, 250]] as const) {
		const hh = (GROUND - 2 - y0) * 0.15;
		const gr = g.createLinearGradient(0, GROUND - 2 - hh, 0, GROUND - 2);
		gr.addColorStop(0, css(BLACK, 0));
		gr.addColorStop(1, css(BLACK, 0.25));
		g.fillStyle = gr;
		g.fillRect(x0, GROUND - 2 - hh, x1 - x0, hh);
	}
	// an oil stain on the pad beside the intake
	g.save();
	g.translate(MX + 170, GROUND + 9);
	g.scale(1, 0.22);
	const oil2 = g.createRadialGradient(0, 0, 0, 0, 0, 42);
	oil2.addColorStop(0, css([4, 4, 4], 0.3));
	oil2.addColorStop(1, css([4, 4, 4], 0));
	g.fillStyle = oil2;
	g.fillRect(-44, -44, 88, 88);
	g.restore();
	// contact shadows where the side boxes meet the ground
	for (const [x0, x1] of [[MX - 152, MX - 102], [MX + 102, MX + 154]] as const) {
		const cs = g.createLinearGradient(0, GROUND - 3, 0, GROUND + 8);
		cs.addColorStop(0, css(BLACK, 0.45));
		cs.addColorStop(1, css(BLACK, 0));
		g.fillStyle = cs;
		g.fillRect(x0, GROUND - 3, x1 - x0, 11);
	}

	// the housing: rounded shoulders, banded in plates that differ a little from one to the next
	g.save();
	bodyPath(g);
	g.clip();
	const bg = g.createLinearGradient(BODY.x0, 0, BODY.x1, 0);
	bg.addColorStop(0, css([26, 32, 33]));
	bg.addColorStop(0.5, css([48, 57, 58]));
	bg.addColorStop(1, css([28, 34, 35]));
	g.fillStyle = bg;
	g.fillRect(BODY.x0, BODY.top, BODY.x1 - BODY.x0, BODY.bot - BODY.top);
	const cols = [MX - 106, MX - 66, MX - 52, MX + 52, MX + 66, MX + 106];
	const rows = [BODY.top, 214, 262, 318, 384, BODY.bot];
	let pk = 0;
	for (let c = 0; c < cols.length - 1; c++) {
		if (c === 2) continue; // the middle is the vat's recess
		for (let rw = 0; rw < rows.length - 1; rw++) metal(g, cols[c], rows[rw], cols[c + 1], rows[rw + 1], 0.92 + hash(pk++, 3) * 0.16, 100 + pk);
	}
	// the recess round the vat: darker, ribbed
	g.fillStyle = css([20, 25, 26]);
	g.fillRect(MX - 52, BODY.top, 104, BODY.bot - BODY.top);
	g.strokeStyle = css([4, 6, 6], 0.7);
	g.lineWidth = 1;
	g.beginPath();
	for (const x of [MX - 52, MX + 52]) {
		g.moveTo(x + 0.5, BODY.top);
		g.lineTo(x + 0.5, BODY.bot);
	}
	g.stroke();
	// two heavy straps across the whole housing
	for (const y of [214, 384]) {
		const st = g.createLinearGradient(0, y, 0, y + 14);
		st.addColorStop(0, css([66, 76, 76]));
		st.addColorStop(1, css([30, 36, 37]));
		g.fillStyle = st;
		g.fillRect(BODY.x0, y, BODY.x1 - BODY.x0, 14);
		g.fillStyle = css(BLACK, 0.4);
		g.fillRect(BODY.x0, y + 14, BODY.x1 - BODY.x0, 3);
		g.fillStyle = css([200, 206, 196], 0.14);
		g.fillRect(BODY.x0, y, BODY.x1 - BODY.x0, 1);
	}
	// rivets, with grime running down from most of them
	const rv: [number, number][] = [];
	for (const y of [220, 391]) for (let x = BODY.x0 + 8; x < BODY.x1; x += 16) rv.push([x, y]);
	for (const y of [178, 268, 324, 424]) for (const x of [MX - 96, MX - 76, MX + 76, MX + 96]) rv.push([x, y]);
	rv.forEach(([x, y], i) => rivetAt(g, x, y, hash(i, 5) > 0.66));
	// weathering: broad soft stains and a fine grit
	const r = rng(88);
	g.globalCompositeOperation = 'multiply';
	for (let k = 0; k < 26; k++) {
		const x = BODY.x0 + r() * 212;
		const y = BODY.top + r() * (BODY.bot - BODY.top);
		const rg = g.createRadialGradient(x, y, 0, x, y, 20 + r() * 34);
		rg.addColorStop(0, css([120, 96, 70], 0.16));
		rg.addColorStop(1, css([120, 96, 70], 0));
		g.fillStyle = rg;
		g.fillRect(x - 60, y - 60, 120, 120);
	}
	g.globalCompositeOperation = 'source-over';
	for (let k = 0; k < 420; k++) {
		g.fillStyle = css(r() < 0.5 ? [220, 226, 216] : BLACK, 0.06 + r() * 0.06);
		g.fillRect(BODY.x0 + r() * 212, BODY.top + r() * (BODY.bot - BODY.top), 1, 1);
	}
	// chipped corners: paint gone from a few plate corners
	g.fillStyle = css([210, 214, 204], 0.3);
	for (const [cx, cy] of [[MX - 106, 262], [MX + 106 - 3, 318], [MX - 66, 384], [MX + 66 - 4, 214], [MX - 106, BODY.bot - 8], [MX + 52, 262]] as const) {
		g.beginPath();
		g.moveTo(cx, cy);
		g.lineTo(cx + 6, cy + 1);
		g.lineTo(cx + 2, cy + 6);
		g.closePath();
		g.fill();
	}
	// the housing is round: dark falling away at both edges, a low light on the top shoulders
	for (const [xa, xb] of [[BODY.x0, BODY.x0 + 30], [BODY.x1, BODY.x1 - 30]] as const) {
		const eg = g.createLinearGradient(xa, 0, xb, 0);
		eg.addColorStop(0, css(BLACK, 0.5));
		eg.addColorStop(1, css(BLACK, 0));
		g.fillStyle = eg;
		g.fillRect(Math.min(xa, xb), BODY.top, 30, BODY.bot - BODY.top);
	}
	const top = g.createLinearGradient(0, BODY.top, 0, BODY.top + 70);
	top.addColorStop(0, css([210, 216, 206], 0.1));
	top.addColorStop(1, css([210, 216, 206], 0));
	g.fillStyle = top;
	g.fillRect(BODY.x0, BODY.top, 212, 70);
	const ao = g.createLinearGradient(0, 176, 0, 190);
	ao.addColorStop(0, css(BLACK, 0.4));
	ao.addColorStop(1, css(BLACK, 0));
	g.fillStyle = ao;
	g.fillRect(BODY.x0, 176, 212, 14);
	const aop = g.createLinearGradient(0, BODY.bot - 12, 0, BODY.bot);
	aop.addColorStop(0, css(BLACK, 0));
	aop.addColorStop(1, css(BLACK, 0.4));
	g.fillStyle = aop;
	g.fillRect(BODY.x0, BODY.bot - 12, 212, 12);
	const foot = g.createLinearGradient(0, BODY.bot - 67, 0, BODY.bot);
	foot.addColorStop(0, css([20, 14, 8], 0));
	foot.addColorStop(1, css([20, 14, 8], 0.4));
	g.fillStyle = foot;
	g.fillRect(BODY.x0, BODY.bot - 67, 212, 67);
	g.restore();
	const bev = g.createLinearGradient(BODY.x0, 0, BODY.x1, 0);
	bev.addColorStop(0, css([8, 10, 10], 0.6));
	bev.addColorStop(0.5, css([10, 12, 12], 0.7));
	bev.addColorStop(1, css([2, 3, 3], 0.98));
	g.strokeStyle = bev;
	g.lineWidth = 2.2;
	bodyPath(g);
	g.stroke();

	// the vat's bezel, riveted round
	g.lineJoin = 'round';
	vatPath(g);
	g.strokeStyle = css([8, 10, 11]);
	g.lineWidth = 20;
	g.stroke();
	g.strokeStyle = css([54, 62, 62]);
	g.lineWidth = 15;
	g.stroke();
	g.strokeStyle = css([170, 178, 172], 0.16);
	g.lineWidth = 1.4;
	g.save();
	g.translate(-1.5, -1.5);
	vatPath(g);
	g.stroke();
	g.restore();
	const rb = VR + 7.5;
	for (let k = 0; k < 9; k++) {
		const th = Math.PI + (k / 8) * Math.PI;
		rivetAt(g, VX + Math.cos(th) * rb, VY0 + VR + Math.sin(th) * rb, k % 2 === 0);
		rivetAt(g, VX + Math.cos(th - Math.PI) * rb, VY1 - VR - Math.sin(th - Math.PI) * rb, k % 2 === 1);
	}
	for (const y of [250, 300, 350]) {
		rivetAt(g, VX - rb, y, false);
		rivetAt(g, VX + rb, y, true);
	}

	// weathering: rust streaks running down from three rivets, one dent in the plating, and the outer edge
	// softened with a darker line just inside it, so the housing does not read as a vector cut-out
	g.save();
	bodyPath(g);
	g.clip();
	for (const [x, y, len] of [[MX - 62, 152, 46], [MX + 76, 178, 62], [MX - 96, 178, 58]] as [number, number, number][]) {
		const st = g.createLinearGradient(0, y, 0, y + len);
		st.addColorStop(0, css([190, 92, 36], 0.34));
		st.addColorStop(1, css([190, 92, 36], 0));
		g.fillStyle = st;
		g.fillRect(x - 2.5, y, 5, len);
	}
	g.fillStyle = css(BLACK, 0.4);
	g.beginPath();
	g.ellipse(MX + 74, 356, 5, 3, 0, 0, TAU);
	g.fill();
	g.strokeStyle = css([214, 220, 210], 0.75);
	g.lineWidth = 1.5;
	g.beginPath();
	g.ellipse(MX + 74, 356, 5.8, 3.8, 0, 0.1 * Math.PI, 0.9 * Math.PI);
	g.stroke();
	g.strokeStyle = css(BLACK, 0.14);
	g.lineWidth = 10;
	bodyPath(g);
	g.stroke();
	g.strokeStyle = css(BLACK, 0.4);
	g.lineWidth = 2;
	bodyPath(g);
	g.stroke();
	g.restore();

	// the neck and roof cap, the mast for the sensor ring
	g.save();
	metal(g, MX - 72, 142, MX + 72, 172, 1.0, 71);
	metal(g, MX - 80, 166, MX + 80, 176, 0.86, 72);
	// light nicks along the cap's front edge
	{
		const nr3 = rng(65);
		g.fillStyle = css([226, 230, 220], 0.6);
		for (let k = 0; k < 12; k++) g.fillRect(MX - 78 + nr3() * 156, 175, 1 + Math.floor(nr3() * 3), 1);
	}
	// light nicks along the cap's top edge
	{
		const nr2 = rng(64);
		g.fillStyle = css([226, 230, 220], 0.55);
		for (let k = 0; k < 14; k++) g.fillRect(MX - 70 + nr2() * 140, 142, 1 + Math.floor(nr2() * 3), 1);
	}
	g.fillStyle = css([10, 12, 13], 0.8);
	for (let k = 0; k < 5; k++) g.fillRect(MX - 40 + k * 14, 150, 8, 3);
	g.restore();
	g.strokeStyle = css([10, 12, 12]);
	g.lineWidth = 8;
	g.beginPath();
	g.moveTo(DISH.x, 142);
	g.lineTo(DISH.x, 112);
	g.stroke();
	g.strokeStyle = css([120, 128, 124], 0.9);
	g.lineWidth = 4;
	g.beginPath();
	g.moveTo(DISH.x, 142);
	g.lineTo(DISH.x, 112);
	g.stroke();
}

// The machine seen in a world's light: its cache tinted with that painting's ambient color, its darkest tones lifted
// to sit with the painting's foreground. Built once per world, after the picture is in.
export const scale3 = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k];
export const TINT_LIFT = [0.1, 0.15, 0.1, 0.12, 0.12];
/** How much the housing is darkened for each world, after the lift (the storm's painting is dark, and the plating must sit in it). */
export const TINT_DARK = [0.45, 0, 0, 0, 0];
export const tcache: (HTMLCanvasElement | null | undefined)[] = [];
export function machineTinted(wi: number) {
	const base = machineCache();
	const P = wi >= 0 ? pics[wi] : null;
	if (!base || !P) return base;
	const hit = tcache[wi];
	if (hit) return hit;
	const o = offscreen(base.width, base.height);
	if (!o) return base;
	// multiply by the world's ambient (its hue, kept gentle), only where the machine is
	const m = offscreen(base.width, base.height);
	if (!m) return base;
	const mx = Math.max(P.amb[0], P.amb[1], P.amb[2], 1);
	const hue = mixRGB(WHITE, [(P.amb[0] / mx) * 255, (P.amb[1] / mx) * 255, (P.amb[2] / mx) * 255], 0.75);
	const lum = (P.amb[0] * 0.3 + P.amb[1] * 0.59 + P.amb[2] * 0.11) / 255;
	const br = clamp(0.62 + lum * 1.6, 0.66, 1);
	m.g.fillStyle = css(scale3(hue, br));
	m.g.fillRect(0, 0, base.width, base.height);
	m.g.globalCompositeOperation = 'destination-in';
	m.g.drawImage(base, 0, 0);
	o.g.drawImage(base, 0, 0);
	o.g.globalCompositeOperation = 'multiply';
	o.g.drawImage(m.c, 0, 0);
	// lifted toward a mid gray by an amount per world, so the housing sits a touch above its painting
	o.g.globalCompositeOperation = 'source-atop';
	o.g.fillStyle = css(mixRGB([128, 130, 138], P.amb, 0.25), TINT_LIFT[wi]);
	o.g.fillRect(0, 0, base.width, base.height);
	if (TINT_DARK[wi]) {
		o.g.fillStyle = css(BLACK, TINT_DARK[wi]);
		o.g.fillRect(0, 0, base.width, base.height);
	}
	return (tcache[wi] = o.c);
}
// The machine in deep shadow: the tinted copy darkened, drawn opaque under the lit one while the machine comes out of the dark.
const shcache: (HTMLCanvasElement | null | undefined)[] = [];
export function machineShade(wi: number) {
	const hit = shcache[wi + 1];
	if (hit) return hit;
	const base = machineTinted(wi);
	if (!base) return null;
	const o = offscreen(base.width, base.height);
	if (!o) return base;
	o.g.drawImage(base, 0, 0);
	o.g.globalCompositeOperation = 'source-atop';
	o.g.fillStyle = css(BLACK, 0.78);
	o.g.fillRect(0, 0, base.width, base.height);
	if (wi < 0 || pics[wi]) shcache[wi + 1] = o.c;
	return o.c;
}
// The same machine at a third of the pixels, for the small far ones in 03 (drawing the full size down each frame costs).
export const scache: (HTMLCanvasElement | null | undefined)[] = [];
export function machineSmall(wi: number) {
	const key = wi + 1;
	const hit = scache[key];
	if (hit) return hit;
	const full = machineTinted(wi);
	if (!full) return null;
	const o = offscreen(full.width / 3, full.height / 3);
	if (!o) return full;
	o.g.drawImage(full, 0, 0, o.c.width, o.c.height);
	// only cache once the tinted version is the real one (its picture is in)
	if (wi < 0 || pics[wi]) scache[key] = o.c;
	return o.c;
}
// A strip of the painting's own foreground laid over the pad's lower edge, feathered on top and at its ends.
export const fcache: (HTMLCanvasElement | null | undefined)[] = [];
export const FOOT = { x: MX - 200, y: GROUND + 6, w: 400, h: 24 };
export function footStrip(wi: number) {
	const P = pics[wi];
	if (!P) return null;
	const hit = fcache[wi];
	if (hit) return hit;
	const o = offscreen(FOOT.w, FOOT.h);
	if (!o) return null;
	const g = o.g;
	g.drawImage(P.c, FOOT.x - WX0, FOOT.y, FOOT.w, FOOT.h, 0, 0, FOOT.w, FOOT.h);
	g.fillStyle = css(BLACK, 0.2);
	g.fillRect(0, 0, FOOT.w, FOOT.h);
	g.globalCompositeOperation = 'destination-in';
	const v = g.createLinearGradient(0, 0, 0, FOOT.h);
	v.addColorStop(0, css(WHITE, 0));
	v.addColorStop(0.4, css(WHITE, 1));
	v.addColorStop(1, css(WHITE, 1));
	g.fillStyle = v;
	g.fillRect(0, 0, FOOT.w, FOOT.h);
	const h = g.createLinearGradient(0, 0, FOOT.w, 0);
	h.addColorStop(0, css(WHITE, 0));
	h.addColorStop(0.12, css(WHITE, 1));
	h.addColorStop(0.88, css(WHITE, 1));
	h.addColorStop(1, css(WHITE, 0));
	g.fillStyle = h;
	g.fillRect(0, 0, FOOT.w, FOOT.h);
	return (fcache[wi] = o.c);
}

/** A world's painting has changed: forget the machine copies tinted and footed for it. */
export function resetMachineWorld(wi: number) {
	tcache[wi] = undefined;
	fcache[wi] = undefined;
}

export function machineCache() {
	if (mcache !== undefined) return mcache;
	const o = offscreen(MC.w * MQ, MC.h * MQ);
	if (!o) return (mcache = null);
	o.g.setTransform(MQ, 0, 0, MQ, -MC.x * MQ, -MC.y * MQ);
	paintMachine(o.g);
	soften(o.c, 0.35);
	return (mcache = o.c);
}

export type SeedKind = WorldKey | 'genesis' | 'apex';
// A seed's outline, its radius at angle `th` (y down), for each kind of world. Every one stays a cell: soft,
// closed, with no fins, limbs or points, only different in how it is proportioned.
export function seedR(kind: SeedKind, th: number, fins = true, v = 0) {
	const w = (x: number) => Math.atan2(Math.sin(x), Math.cos(x));
	if (kind === 'storm') {
		// stretched about 2.2 to 1, two swept membranes trailing from the rear
		const a = 1.5;
		const b = 0.68;
		const lens = (a * b) / Math.sqrt(Math.pow(b * Math.cos(th), 2) + Math.pow(a * Math.sin(th), 2));
		const fin = (d: number) => (fins ? 0.5 : 0) * Math.exp(-Math.pow(d / 0.17, 2));
		// a symmetric lens, one fin swept off each tip in turn: no head, no tail
		return lens + fin(w(th - 2.7)) + fin(w(th + 0.44));
	}
	if (kind === 'lava') {
		// six-sided, walled
		// rounded corners, bowed edges: half hexagon, half circle
		const q = ((th % (Math.PI / 3)) + Math.PI / 3) % (Math.PI / 3);
		return mix((1.0 / Math.cos(q - Math.PI / 6)) * 0.9, 0.98, 0.55) * (1 + 0.11 * Math.cos(3 * th - v) + 0.06 * Math.cos(2 * th + 2 * v));
	}
	if (kind === 'ice') return 0.55 + 0.47 * Math.pow((1 + Math.cos(6 * th)) / 2, 5); // six spikes at 1.6 times the body
	if (kind === 'sea') {
		// a bell: a domed top, and a hem with four scallops about 3 px deep cut into its lower edge
		if (Math.sin(th) < 0) return 1;
		const phi = th - Math.PI / 2;
		return Math.min(1.15, 0.45 / Math.max(0.22, Math.abs(Math.sin(th)))) * (1 - 0.23 * (0.5 + 0.5 * Math.cos(8 * phi)) * smooth(0.25, 0.7, Math.sin(th)));
	}
	if (kind === 'apex') return 0.85; // all the same
	return 1 + 0.1 * Math.cos(2 * th) - 0.16 * Math.sin(th); // Genesis: a plain oval seed
}
/** Where the seeds sit: one in each bay between the straps (270 and 340) and the vat's ends. */
export const SEED_Y = [232, 305, 372];
export const SEEDS = Array.from({ length: 3 }, (_, k) => ({ x: (hash(k, 1) - 0.5) * 14, y: SEED_Y[k] + (hash(k, 2) - 0.5) * 3, r: 21.5 * (0.92 + hash(k, 3) * 0.16), ph: hash(k, 4) * TAU, sp: 0.6 + hash(k, 5) * 0.5, tilt: (hash(k, 6) - 0.5) * 0.5, hb: 0.5 + hash(k, 7) * 0.25 }));

export function ecg(ph: number) {
	const p = ((ph % 1) + 1) % 1;
	if (p < 0.08) return Math.sin((p / 0.08) * Math.PI) * 0.12;
	if (p < 0.12) return 0;
	if (p < 0.15) return -((p - 0.12) / 0.03) * 0.25;
	if (p < 0.19) return -0.25 + ((p - 0.15) / 0.04) * 1.25;
	if (p < 0.23) return 1 - ((p - 0.19) / 0.04) * 1.35;
	if (p < 0.27) return -0.35 + ((p - 0.23) / 0.04) * 0.35;
	return 0;
}

export type MachineLook = {
	sec: number;
	gel: RGB;
	light: RGB;
	/** Where the brightest part of the world is, left (-1) to right (1). */
	side: number;
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
	/** 0 to 1: how far the housing has built out round the vat, and how far the vat and its seeds have appeared (a bloom builds the vat first). */
	housing: number;
	vat: number;
	/** A small, far machine: drops the fine detail nobody can see at its size. */
	lite: boolean;
	/** Drawn from the smaller copy (it is small on screen). */
	small?: boolean;
	/** Which world's painting it stands in (its tint and ground), or -1; `world2` fades in over it by `wk` while one world gives way to the next. */
	world: number;
	world2: number;
	wk: number;
	/** 0 to 1: how much orange light comes up from below (lava). */
	under: number;
	/** 0 to 1: a lightning flash lifting it. */
	flash: number;
	// The outbreak's 06 shows this machine dormant and then woken; all of these default to the Generators figure's look.
	/** 0 to 1: how lit the vat's gel is; scales the light it throws on the ground, the housing and the seeds (default 1). */
	lit?: number;
	/** 0 to 1: how dead the machine is: the sensor ring and pad lights out, the life-signs line flat (default 0). */
	dormant?: number;
	/** 0 to 1: how full of gel the vat is, from the bottom (default 1); the rest is dark glass. */
	vatFill?: number;
	/** Seconds since the seeds began to grow (once the ring has read and the pulse has landed), or undefined: the seeds then follow `km` (default). */
	growT?: number;
	/** 0 to 1: how far the machine has come out of shadow: the housing is always opaque, only lit more (default 1). */
	emerge?: number;
	/** 0 to 1: how far the edge lights have come up (the rim and wrap strokes), so a machine arriving from the dark gets its fills first (default 1). */
	rimK?: number;
	/** Light the sun-facing side edge only, fading out above the base, instead of tracing the housing's outline (default false). */
	rimEdge?: boolean;
	/** 0 to 1: a pulse of light running from the sensor ring down the mast, through the roof and into the gel, to where the new seed starts. */
	pulse?: number;
	/** False: no shelf of the world's ground (the outbreak's 06 has its own ground); the foundation is always drawn. */
	shelf?: boolean;
	/** Instead of the reading rings, one soft halo round the sensor ring (about 2.5x its size, 0.25, a slow pulse of 0.05). */
	ringHalo?: boolean;
	/** Seeds differ in size, tilt, darkness and drift, so they read as grown and not stamped. */
	seedVary?: boolean;
	/** 0 to 1: a 60 ms flash on the sensor ring just before the pulse drops. */
	ringFlash?: number;
	/** 0 to 1: the readout's single tick as the pulse leaves the ring (decays by itself). */
	tick?: number;
	/** Seeds drawn this much larger (a phone keeps them near the size they have on a wide screen). */
	seedScale?: number;
	/** 0 to 1: how far the seeds have formed, each from a bright point in turn (default: all formed). */
	seedBorn?: number;
	/** False: leave out the painting's foreground strip over the pad (a world with no painting). */
	foot?: boolean;
	/** A cool rim along the housing's upper left edge, from the sky (default none). */
	rim2?: RGB;
};

export const MEMBRANE_N = 48;

// ---- what the machine stands on: a heavy stepped foundation sunk into the ground, and a shelf of that world's own
// ground round and in front of it. Both are drawn once per world into offscreen canvases; only the light on them
// (the vat's glow, a flash, embers, spray) is drawn each frame.

type Pal = { top: RGB; bot: RGB; stone: RGB; lit: RGB };
const GROUND_PAL: Record<number, Pal> = {
	0: { top: [56, 62, 78], bot: [18, 20, 28], stone: [46, 50, 60], lit: [190, 202, 232] }, // storm: dark wet rock
	1: { top: [72, 42, 32], bot: [20, 11, 10], stone: [44, 34, 30], lit: [255, 160, 90] }, // lava: basalt
	2: { top: [190, 208, 222], bot: [112, 130, 148], stone: [74, 82, 92], lit: [236, 246, 255] }, // ice: packed snow
	3: { top: [54, 80, 98], bot: [16, 28, 40], stone: [38, 50, 58], lit: [160, 218, 230] }, // sea: wet rock
	4: { top: [62, 28, 38], bot: [24, 11, 17], stone: [50, 30, 36], lit: [230, 110, 110] }, // the red world of 06
	[-1]: { top: [64, 60, 84], bot: [22, 20, 32], stone: [44, 42, 58], lit: [180, 150, 240] }, // a machine APEX holds
};
const palOf = (wi: number): Pal => GROUND_PAL[wi] ?? GROUND_PAL[-1];

/** The puddles on the storm's shelf, in machine units: x, y, rx, ry. */
const PUDDLES: [number, number, number, number][] = [[MX - 250, GROUND + 58, 34, 6], [MX + 236, GROUND + 66, 44, 7], [MX - 120, GROUND + 84, 40, 7], [MX + 96, GROUND + 94, 30, 5], [MX + 320, GROUND + 50, 26, 5]];
/** Where the lava's cracks run, each a polyline in machine units. */
const CRACKS: [number, number][][] = [
	[[MX - 300, GROUND + 50], [MX - 262, GROUND + 60], [MX - 240, GROUND + 78], [MX - 196, GROUND + 84]],
	[[MX + 210, GROUND + 60], [MX + 250, GROUND + 74], [MX + 300, GROUND + 70], [MX + 330, GROUND + 90]],
	[[MX - 90, GROUND + 78], [MX - 40, GROUND + 92], [MX + 30, GROUND + 90], [MX + 76, GROUND + 104]],
];

const SHELF = { x: MX - 360, y: GROUND - 34, w: 720, h: 170 };
const shelfCache: (HTMLCanvasElement | null | undefined)[] = [];
function shelfFor(wi: number) {
	const key = wi + 1;
	const hit = shelfCache[key];
	if (hit) return hit;
	const o = offscreen(SHELF.w, SHELF.h);
	if (!o) return null;
	const g = o.g;
	const pal = palOf(wi);
	g.translate(-SHELF.x, -SHELF.y);
	const r = rng(900 + wi);
	// the surface: lighter where it recedes toward the horizon, darker toward us
	const base = g.createLinearGradient(0, GROUND - 30, 0, GROUND + 130);
	base.addColorStop(0, css(scale3(pal.top, 1.25)));
	base.addColorStop(1, css(mixRGB(pal.top, pal.bot, 0.5)));
	g.fillStyle = base;
	g.fillRect(SHELF.x, SHELF.y, SHELF.w, SHELF.h);
	// the world's light falls on the ground round the foundation
	g.save();
	g.translate(MX, GROUND + 56);
	g.scale(1, 0.24);
	const lp = g.createRadialGradient(0, 0, 40, 0, 0, 330);
	lp.addColorStop(0, css(pal.lit, 0.34));
	lp.addColorStop(1, css(pal.lit, 0));
	g.fillStyle = lp;
	g.fillRect(-340, -340, 680, 680);
	g.restore();
	// slabs and strata: broad bands across it, each a little different
	for (let k = 0; k < 26; k++) {
		const y = GROUND - 20 + Math.pow(r(), 1.3) * 140;
		const h = 3 + (y - GROUND) * 0.06 + r() * 6;
		g.fillStyle = css(r() < 0.5 ? BLACK : pal.lit, 0.05 + r() * 0.07);
		g.fillRect(SHELF.x + r() * 200, y, 240 + r() * 400, h);
	}
	// rubble: small stones, larger and darker toward us
	for (let k = 0; k < 190; k++) {
		const y = GROUND - 12 + Math.pow(r(), 1.2) * 132;
		const x = SHELF.x + r() * SHELF.w;
		const s = 1.5 + (y - GROUND + 20) * 0.045 * (0.5 + r());
		g.fillStyle = css(r() < 0.6 ? scale3(pal.stone, 0.3 + r() * 0.3) : scale3(pal.stone, 0.9 + r() * 0.3), 0.55 + r() * 0.3);
		g.beginPath();
		g.moveTo(x - s, y + s * 0.4);
		g.lineTo(x - s * 0.4, y - s * 0.6);
		g.lineTo(x + s * 0.7, y - s * 0.4);
		g.lineTo(x + s, y + s * 0.5);
		g.closePath();
		g.fill();
		g.fillStyle = css(pal.lit, 0.12);
		g.fillRect(x - s * 0.4, y - s * 0.6, s, 1);
	}
	if (wi === 0) {
		// wet: dark puddles with a paler rim, catching the sky
		for (const [x, y, rx, ry] of PUDDLES) {
			g.fillStyle = css([6, 8, 12], 0.85);
			g.beginPath();
			g.ellipse(x, y, rx, ry, 0, 0, TAU);
			g.fill();
			g.strokeStyle = css([150, 166, 196], 0.28);
			g.lineWidth = 1;
			g.beginPath();
			g.ellipse(x, y - 0.5, rx, ry, 0, Math.PI * 1.05, Math.PI * 1.95);
			g.stroke();
		}
	}
	if (wi === 1) {
		// a cooled crust with cracks that show what is under it
		for (const pts of CRACKS) {
			g.lineJoin = 'round';
			g.strokeStyle = css([255, 110, 40], 0.18);
			g.lineWidth = 6;
			g.beginPath();
			pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
			g.stroke();
			g.strokeStyle = css([255, 150, 70], 0.7);
			g.lineWidth = 1.4;
			g.stroke();
		}
	}
	if (wi === 2) {
		// packed snow: drifts and pressure ridges, the shadows blue
		for (let k = 0; k < 16; k++) {
			const x = SHELF.x + r() * SHELF.w;
			const y = GROUND + 4 + r() * 110;
			const rx = 40 + r() * 90;
			g.fillStyle = css([236, 244, 250], 0.03);
			g.beginPath();
			g.ellipse(x, y, rx, rx * 0.06, 0, 0, TAU);
			g.fill();
			g.fillStyle = css([70, 100, 140], 0.12);
			g.beginPath();
			g.ellipse(x + rx * 0.1, y + 3, rx * 0.9, rx * 0.08, 0, 0, TAU);
			g.fill();
		}
	}
	if (wi === 3) {
		// a rock outcrop: dark ledges, wet, with white foam along its seaward (right) edge
		for (let k = 0; k < 9; k++) {
			const x = SHELF.x + 120 + r() * 480;
			const y = GROUND + 10 + r() * 100;
			const w = 60 + r() * 100;
			g.fillStyle = css([6, 12, 16], 0.5);
			g.beginPath();
			g.moveTo(x - w, y + 6);
			g.lineTo(x - w * 0.5, y - 6);
			g.lineTo(x + w * 0.6, y - 4);
			g.lineTo(x + w, y + 7);
			g.closePath();
			g.fill();
			g.strokeStyle = css([150, 200, 210], 0.14);
			g.lineWidth = 1;
			g.beginPath();
			g.moveTo(x - w * 0.5, y - 6);
			g.lineTo(x + w * 0.6, y - 4);
			g.stroke();
		}
		for (let k = 0; k < 30; k++) {
			const y = GROUND - 8 + r() * 130;
			const x = MX + 210 + Math.pow(r(), 0.6) * 140 + (y - GROUND) * 0.3;
			g.fillStyle = css([216, 236, 240], 0.1 + r() * 0.18);
			g.beginPath();
			g.ellipse(x, y, 10 + r() * 16, 1.6 + r() * 2, 0, 0, TAU);
			g.fill();
		}
	}
	// the surface reaches back into the painting and out toward us, fading at both ends and at its sides
	g.globalCompositeOperation = 'destination-in';
	const mv = g.createLinearGradient(0, SHELF.y, 0, SHELF.y + SHELF.h);
	mv.addColorStop(0, 'rgba(0,0,0,0)');
	mv.addColorStop(0.16, 'rgba(0,0,0,0.95)');
	mv.addColorStop(0.78, 'rgba(0,0,0,0.9)');
	mv.addColorStop(1, 'rgba(0,0,0,0)');
	g.fillStyle = mv;
	g.fillRect(SHELF.x, SHELF.y, SHELF.w, SHELF.h);
	const mh = g.createLinearGradient(SHELF.x, 0, SHELF.x + SHELF.w, 0);
	mh.addColorStop(0, 'rgba(0,0,0,0)');
	mh.addColorStop(0.2, 'rgba(0,0,0,1)');
	mh.addColorStop(0.8, 'rgba(0,0,0,1)');
	mh.addColorStop(1, 'rgba(0,0,0,0)');
	g.fillStyle = mh;
	g.fillRect(SHELF.x, SHELF.y, SHELF.w, SHELF.h);
	return (shelfCache[key] = o.c);
}

const FND = { x: MX - 270, y: GROUND - 24, w: 540, h: 150 };
const fndCache: (HTMLCanvasElement | null | undefined)[] = [];
/**
 * The foundation, solid mass all the way down: a top slab (a lit, receding top face and a short front), then a wider
 * lower course directly beneath it with no gap, its foot buried in the ground (soil, rubble and drifts heaped over it),
 * squat buttresses at the ends, and cables that lie against the slab's face and go into the ground in front of it.
 */
function foundationFor(wi: number) {
	const key = wi + 1;
	const hit = fndCache[key];
	if (hit) return hit;
	const o = offscreen(FND.w * 2, FND.h * 2);
	if (!o) return null;
	const g = o.g;
	g.setTransform(2, 0, 0, 2, -FND.x * 2, -FND.y * 2);
	const pal = palOf(wi);
	const st = pal.stone;
	const quad = (pts: [number, number][], fill: string | CanvasGradient) => {
		g.beginPath();
		pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
		g.closePath();
		g.fillStyle = fill;
		g.fill();
	};
	const SLAB_F = GROUND + 34; // where the slab's top face ends and its front begins
	const SLAB_B = GROUND + 48; // the bottom of the slab's front, where the lower course begins
	const FOOT = GROUND + 92; // the buried foot of the lower course
	// ambient occlusion on the ground round its foot
	g.save();
	g.translate(MX, FOOT);
	g.scale(1, 0.1);
	const ao = g.createRadialGradient(0, 0, 100, 0, 0, 270);
	ao.addColorStop(0, css(BLACK, 0.7));
	ao.addColorStop(1, css(BLACK, 0));
	g.fillStyle = ao;
	g.fillRect(-270, -270, 540, 540);
	g.restore();
	// the lower course: wider than the slab, solid, running right down into the ground
	{
		const lg = g.createLinearGradient(0, SLAB_B, 0, FOOT);
		lg.addColorStop(0, css(scale3(st, 0.34)));
		lg.addColorStop(1, css(scale3(st, 0.2)));
		quad([[MX - 202, SLAB_B - 2], [MX + 202, SLAB_B - 2], [MX + 208, FOOT], [MX - 208, FOOT]], lg);
		// the overhang of the slab throws a shadow down its face
		const sg = g.createLinearGradient(0, SLAB_B - 2, 0, SLAB_B + 16);
		sg.addColorStop(0, css(BLACK, 0.5));
		sg.addColorStop(1, css(BLACK, 0));
		g.fillStyle = sg;
		g.fillRect(MX - 202, SLAB_B - 2, 404, 18);
		g.strokeStyle = css(BLACK, 0.35);
		g.lineWidth = 1;
		g.beginPath();
		for (const x of [-150, -74, 4, 82, 156]) {
			g.moveTo(MX + x, SLAB_B);
			g.lineTo(MX + x + 1, FOOT);
		}
		g.stroke();
		g.fillStyle = css(pal.lit, 0.1);
		g.fillRect(MX - 202, SLAB_B - 1, 404, 1);
	}
	// squat buttresses at the ends, standing on the lower course and sloping up to the slab
	for (const sg of [-1, 1]) {
		const xi = MX + sg * 186;
		const xo = MX + sg * 222;
		quad([[xi, GROUND + 6], [xo, GROUND + 22], [xo + sg * 2, FOOT + 2], [xi, FOOT + 2]], css(scale3(st, 0.3)));
		quad([[xi, GROUND + 4], [xo - sg * 6, GROUND + 4], [xo, GROUND + 22], [xi, GROUND + 10]], css(scale3(st, 0.62)));
		g.fillStyle = css(pal.lit, 0.12);
		g.fillRect(Math.min(xi, xo - sg * 6), GROUND + 3.5, Math.abs(xo - sg * 6 - xi), 1);
	}
	// the top slab: the top face lit only by the vat and the key light, a short shadowed front
	{
		const tg = g.createLinearGradient(0, GROUND - 4, 0, SLAB_F);
		tg.addColorStop(0, css(scale3(st, 0.7)));
		tg.addColorStop(1, css(scale3(st, 0.95)));
		quad([[MX - 168, GROUND - 4], [MX + 168, GROUND - 4], [MX + 186, SLAB_F], [MX - 186, SLAB_F]], tg);
		const fg = g.createLinearGradient(0, SLAB_F, 0, SLAB_B);
		fg.addColorStop(0, css(scale3(st, 0.5)));
		fg.addColorStop(1, css(scale3(st, 0.3)));
		quad([[MX - 186, SLAB_F], [MX + 186, SLAB_F], [MX + 188, SLAB_B], [MX - 188, SLAB_B]], fg);
		g.fillStyle = css(pal.lit, 0.16);
		g.fillRect(MX - 186, SLAB_F - 0.5, 372, 1.2);
		g.strokeStyle = css(BLACK, 0.4);
		g.lineWidth = 1;
		g.beginPath();
		for (const x of [-110, -36, 42, 118]) {
			g.moveTo(MX + x, SLAB_F);
			g.lineTo(MX + x + 1, SLAB_B);
		}
		g.stroke();
		for (let k = -5; k <= 5; k++) {
			const bx = MX + k * 33;
			g.fillStyle = css([8, 8, 9], 0.85);
			g.beginPath();
			g.arc(bx, SLAB_F + 7, 2.4, 0, TAU);
			g.fill();
			g.fillStyle = css(pal.lit, 0.16);
			g.beginPath();
			g.arc(bx - 0.6, SLAB_F + 6.4, 0.9, 0, TAU);
			g.fill();
		}
		// wear: streaks down the face, chipped edges
		const wr = rng(31 + wi);
		for (let k = 0; k < 16; k++) {
			const x = MX - 180 + wr() * 360;
			const sg2 = g.createLinearGradient(0, SLAB_F, 0, FOOT);
			sg2.addColorStop(0, css(BLACK, 0.34));
			sg2.addColorStop(1, css(BLACK, 0));
			g.fillStyle = sg2;
			g.fillRect(x, SLAB_F, 1.2 + wr() * 2, 14 + wr() * 40);
		}
		for (let k = 0; k < 18; k++) {
			const x = MX - 184 + wr() * 368;
			g.fillStyle = css(pal.lit, 0.14);
			g.fillRect(x, SLAB_F - 1, 1 + wr() * 3, 1);
			g.fillStyle = css(BLACK, 0.3);
			g.fillRect(x + 1, SLAB_F, 2 + wr() * 4, 1 + wr() * 2);
		}
	}
	// the cables: they run from the machine's base over the top face, lie against the slab's face and the lower course,
	// each throwing a small shadow, and go into the ground in front of the foot
	for (const [x0, dx] of [[MX - 118, -16], [MX + 112, 16], [MX - 34, -4]] as [number, number][]) {
		g.fillStyle = css(BLACK, 0.3);
		g.fillRect(x0 + 4, SLAB_F, 4, FOOT - SLAB_F + 4);
		pipe(g, [[x0, GROUND - 4], [x0, SLAB_F], [x0, FOOT - 4], [x0 + dx, FOOT + 8]], 7);
		// where it enters the ground: a heap of soil over it
		g.fillStyle = css(scale3(palOf(wi).bot, 1.4), 0.9);
		g.beginPath();
		g.ellipse(x0 + dx, FOOT + 9, 15, 5, 0, 0, TAU);
		g.fill();
	}
	// what has drifted or settled against the foot of the lower course
	const r = rng(7 + wi);
	if (wi === 2) {
		// snow banked against it: soft irregular mounds, the snow's own value, lit from the left (the key light side)
		const snow = palOf(2).top;
		for (let k = 0; k < 14; k++) {
			const x = MX - 226 + (k / 13) * 452 + (r() - 0.5) * 16;
			const w = 26 + r() * 52;
			const h = 12 + Math.pow(r(), 1.5) * 38;
			const baseY = FOOT + 2 + r() * 8;
			const grd = g.createLinearGradient(x - w, 0, x + w, 0);
			grd.addColorStop(0, css(scale3(snow, 0.92)));
			grd.addColorStop(0.55, css(scale3(snow, 0.78)));
			grd.addColorStop(1, css(scale3(snow, 0.52)));
			g.fillStyle = grd;
			g.beginPath();
			g.moveTo(x - w, baseY);
			g.bezierCurveTo(x - w * 0.6, baseY - h * (0.7 + r() * 0.5), x - w * 0.1, baseY - h * (1 + r() * 0.3), x + w * 0.3, baseY - h * (0.7 + r() * 0.4));
			g.bezierCurveTo(x + w * 0.7, baseY - h * 0.4, x + w * 0.9, baseY - h * 0.1, x + w, baseY);
			g.closePath();
			g.fill();
		}
	} else {
		// soil, rubble and crust heaped over the foot, so it reads as sunk in
		for (let k = 0; k < 110; k++) {
			const x = MX - 226 + r() * 452;
			g.fillStyle = css(scale3(palOf(wi).bot, 1.1 + r() * 1.8), 0.7 + r() * 0.3);
			g.beginPath();
			g.ellipse(x, FOOT - 5 + r() * 14, 5 + r() * 12, 3 + r() * 4.5, 0, 0, TAU);
			g.fill();
		}
		for (let k = 0; k < 16; k++) {
			const x = MX - 220 + r() * 440;
			const s2 = 2 + r() * 3.5;
			g.fillStyle = css(scale3(st, 0.5 + r() * 0.5), 0.9);
			g.beginPath();
			g.moveTo(x - s2, FOOT + 8);
			g.lineTo(x - s2 * 0.4, FOOT + 8 - s2 * 1.4);
			g.lineTo(x + s2 * 0.7, FOOT + 8 - s2);
			g.lineTo(x + s2, FOOT + 8);
			g.closePath();
			g.fill();
		}
	}
	return (fndCache[key] = o.c);
}

/** Draw the ground under a machine: the shelf, then the foundation. `a` is the machine's alpha. */
function drawGround(ctx: Ctx, wi: number, a: number, S: MachineLook, shelf: boolean) {
	if (shelf) {
		const sh = shelfFor(wi);
		if (sh) {
			ctx.globalAlpha = a * 0.5;
			ctx.drawImage(sh, SHELF.x, SHELF.y, SHELF.w, SHELF.h);
			ctx.globalAlpha = 1;
		}
	}
	const fd = foundationFor(wi);
	if (fd) {
		ctx.globalAlpha = a;
		ctx.drawImage(fd, FND.x, FND.y, FND.w, FND.h);
		ctx.globalAlpha = 1;
	}
}
/** The light that plays on the ground: the vat's glow, a strike on the puddles, embers, spray. */
function groundLight(ctx: Ctx, wi: number, a: number, S: MachineLook, lit: number) {
	const { sec, gel } = S;
	ctx.save();
	// the vat lights the shelf in front of the machine
	ctx.translate(VX, GROUND + 58);
	ctx.scale(1, 0.16);
	lighter(ctx, () => glow(ctx, 0, 0, 250, gel, 0.34 * a * lit));
	ctx.restore();
	ctx.save();
	ctx.translate(VX, GROUND + 16);
	ctx.scale(1, 0.12);
	lighter(ctx, () => glow(ctx, 0, 0, 170, gel, 0.4 * a * lit));
	ctx.restore();
	if (wi === 0 && S.flash > 0.01)
		lighter(ctx, () => {
			for (const [x, y, rx] of PUDDLES) glow(ctx, x, y, rx * 1.4, [214, 222, 255], 0.55 * S.flash * a);
		});
	if (wi === 1)
		lighter(ctx, () => {
			for (const pts of CRACKS) {
				const p = pts[1];
				glow(ctx, p[0], p[1], 40, [255, 120, 50], (0.16 + 0.06 * Math.sin(sec * 1.3 + p[0])) * a);
			}
			for (let k = 0; k < 7; k++) {
				const u = (sec * (0.05 + hash(k, 40) * 0.04) + hash(k, 41)) % 1;
				glow(ctx, MX - 300 + hash(k, 42) * 600 + Math.sin(sec + k) * 6, GROUND + 90 - u * 110, 2.4, [255, 170, 90], 0.9 * (1 - u) * a, 'core');
			}
		});
	if (wi === 3)
		lighter(ctx, () => {
			for (let k = 0; k < 8; k++) {
				const u = (sec * (0.35 + hash(k, 50) * 0.3) + hash(k, 51)) % 1;
				glow(ctx, MX + 240 + hash(k, 52) * 120 + u * 30, GROUND + 30 + hash(k, 53) * 70 - u * 44, 7 + u * 9, [216, 236, 240], 0.32 * (1 - u) * a);
			}
		});
}

export function drawMachine(ctx: Ctx, S: MachineLook) {
	const { sec, gel, light, apex, beatPulse, reading, dishCol, side } = S;
	const lit = S.lit ?? 1;
	const dorm = S.dormant ?? 0;
	const fill = S.vatFill ?? 1;
	const a = S.a * S.housing;
	ctx.save();
	// the ground it stands on: a shelf of the world's own ground, and the foundation sunk into it
	drawGround(ctx, S.world, a, S, S.shelf !== false);
	if (S.wk > 0.01 && S.world2 >= 0 && !S.lite) drawGround(ctx, S.world2, a * S.wk, S, S.shelf !== false);
	if (S.shelf !== false && !S.lite) groundLight(ctx, S.world, a, S, lit);
	// the vat's glow on the ground in front of it
	ctx.save();
	ctx.translate(VX, GROUND + 12);
	ctx.scale(1, 0.13);
	lighter(ctx, () => {
		glow(ctx, 0, 0, 200, gel, 0.4 * a * lit);
		glow(ctx, side * 60, 0, 260, light, 0.16 * a);
	});
	ctx.restore();
	const mc = S.lite || S.small ? machineSmall(S.world) : machineTinted(S.world);
	if (mc) {
		const em = S.emerge ?? 1;
		if (em < 0.999) {
			const shade = machineShade(S.world);
			if (shade) {
				ctx.globalAlpha = a;
				ctx.drawImage(shade, MC.x, MC.y, MC.w, MC.h);
			}
		}
		ctx.globalAlpha = a * (S.emerge ?? 1);
		ctx.drawImage(mc, MC.x, MC.y, MC.w, MC.h);
		ctx.globalAlpha = a;
		const mc2 = !S.lite && S.wk > 0.01 && S.world2 >= 0 ? machineTinted(S.world2) : null;
		if (mc2) {
			ctx.globalAlpha = a * S.wk;
			ctx.drawImage(mc2, MC.x, MC.y, MC.w, MC.h);
			ctx.globalAlpha = a;
		}
		const fw = S.wk > 0.5 && S.world2 >= 0 ? S.world2 : S.world;
		const fs2 = fw >= 0 && S.foot === true ? footStrip(fw) : null;
		if (fs2) ctx.drawImage(fs2, FOOT.x, FOOT.y, FOOT.w, FOOT.h);
		ctx.globalAlpha = 1;
	}
	lighter(ctx, () => {
		for (let k = 0; k < 7; k++) glow(ctx, MX - 132 + k * 44, GROUND + 8, 7, mixRGB(gel, WHITE, 0.3), 0.8 * a * (1 - dorm) * (0.6 + 0.4 * Math.sin(sec * 2 + k)), 'core');
	});
	// the world's light on the housing: a wash across the face on the bright side, a rim along its edge, the
	// vat's own glow falling on the plates round the window
	ctx.save();
	bodyPath(ctx);
	ctx.clip();
	ctx.globalCompositeOperation = 'lighter';
	const bx = side < 0 ? BODY.x0 : BODY.x1;
	const wash = ctx.createLinearGradient(bx, 0, bx + (side < 0 ? 120 : -120), 0);
	wash.addColorStop(0, css(light, 0.16 * Math.abs(side) * a));
	wash.addColorStop(1, css(light, 0));
	ctx.fillStyle = wash;
	ctx.fillRect(BODY.x0, BODY.top, BODY.x1 - BODY.x0, BODY.bot - BODY.top);
	if (S.under > 0.01) {
		const ug = ctx.createLinearGradient(0, BODY.bot, 0, BODY.bot - 110);
		ug.addColorStop(0, css([255, 120, 50], 0.38 * S.under * a));
		ug.addColorStop(1, css([255, 120, 50], 0));
		ctx.fillStyle = ug;
		ctx.fillRect(BODY.x0, BODY.bot - 110, BODY.x1 - BODY.x0, 110);
	}
	if (S.flash > 0.01) {
		// a strike lifts the machine only along its lit left edge, not the whole face
		const fg2 = ctx.createLinearGradient(BODY.x0, 0, BODY.x0 + 60, 0);
		fg2.addColorStop(0, css([200, 208, 255], 0.22 * S.flash * a));
		fg2.addColorStop(1, css([200, 208, 255], 0));
		ctx.fillStyle = fg2;
		ctx.fillRect(BODY.x0, BODY.top, 60, BODY.bot - BODY.top);
	}
	const spill = ctx.createRadialGradient(VX, 300, 20, VX, 300, 150);
	spill.addColorStop(0, css(gel, 0.25 * a * lit));
	spill.addColorStop(1, css(gel, 0));
	ctx.fillStyle = spill;
	ctx.fillRect(BODY.x0, BODY.top, BODY.x1 - BODY.x0, BODY.bot - BODY.top);
	// the lowest panels sit darker where they meet the ground
	const low = ctx.createLinearGradient(0, BODY.bot - 80, 0, BODY.bot);
	low.addColorStop(0, css(BLACK, 0));
	low.addColorStop(1, css(BLACK, 0.4 * a));
	ctx.globalCompositeOperation = 'source-over';
	ctx.fillStyle = low;
	ctx.fillRect(BODY.x0, BODY.bot - 80, BODY.x1 - BODY.x0, 80);
	ctx.restore();
	// the housing is a cylinder: dark down the shadow side, fading out well before the lit side, a soft strip of shine near it
	if (!S.lite) {
		const xs = side < 0 ? BODY.x1 : BODY.x0;
		
		const k = 0.5 + 0.5 * Math.min(1, Math.abs(side) / 0.6);
		ctx.save();
		bodyPath(ctx);
		ctx.clip();
		const sg = ctx.createLinearGradient(xs, 0, xs + (bx - xs) * 0.65, 0);
		sg.addColorStop(0, css(BLACK, 0.45 * k * a));
		sg.addColorStop(1, css(BLACK, 0));
		ctx.fillStyle = sg;
		ctx.fillRect(BODY.x0, BODY.top, 212, BODY.bot - BODY.top);
		const sx2 = bx + (side < 0 ? 1 : -1) * 212 * 0.25;
		const spg = ctx.createLinearGradient(sx2 - 9, 0, sx2 + 9, 0);
		spg.addColorStop(0, css(light, 0));
		spg.addColorStop(0.5, css(mixRGB(light, WHITE, 0.4), 0.12 * a));
		spg.addColorStop(1, css(light, 0));
		ctx.globalCompositeOperation = 'lighter';
		ctx.fillStyle = spg;
		ctx.fillRect(sx2 - 9, BODY.top + 10, 18, BODY.bot - BODY.top - 20);
		ctx.restore();
		// the vat's rim, shaded the same way
		const vs = VX - (side < 0 ? 1 : -1) * (VR + 8);
		const vl = VX + (side < 0 ? 1 : -1) * (VR + 8);
		const vgd = ctx.createLinearGradient(vs, 0, vl, 0);
		vgd.addColorStop(0, css(BLACK, 0.45 * k * a));
		vgd.addColorStop(0.65, css(BLACK, 0));
		ctx.strokeStyle = vgd;
		ctx.lineWidth = 15;
		vatPath(ctx);
		ctx.stroke();
	}
	ctx.save();
	ctx.globalCompositeOperation = 'lighter';
	const rim = ctx.createLinearGradient(bx, 0, bx + (side < 0 ? 90 : -90), 0);
	const rk = S.rimK ?? 1;
	rim.addColorStop(0, css(mixRGB(light, WHITE, 0.25), 0.75 * Math.abs(side) * a * rk));
	rim.addColorStop(1, css(light, 0));
	ctx.strokeStyle = rim;
	ctx.lineWidth = 2.2;
	// a lit edge on the side facing the light and a dark base: the edge runs down the side and stops above the ground
	const edgePath = () => {
		ctx.beginPath();
		ctx.moveTo(bx, BODY.top + BODY.r * 0.7);
		ctx.lineTo(bx, BODY.bot - 70);
	};
	if (S.rimEdge) edgePath();
	else bodyPath(ctx);
	ctx.stroke();
	// a wrap of the backdrop's brightness a few pixels deep on the lit edge
	const wrap = ctx.createLinearGradient(bx, 0, bx + (side < 0 ? 24 : -24), 0);
	wrap.addColorStop(0, css(light, 0.25 * Math.abs(side) * a * rk));
	wrap.addColorStop(1, css(light, 0));
	ctx.strokeStyle = wrap;
	ctx.lineWidth = 7;
	ctx.save();
	bodyPath(ctx);
	ctx.clip();
	if (S.rimEdge) edgePath();
	else bodyPath(ctx);
	ctx.stroke();
	ctx.restore();
	ctx.restore();
	// a cool rim from the sky along the top edges (the shoulders and the roof), fading down the sides
	{
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		const skyRim = S.rim2 ?? mixRGB(light, [170, 190, 220], 0.6);
		const cg = ctx.createLinearGradient(0, BODY.top, 0, BODY.top + 90);
		cg.addColorStop(0, css(skyRim, (S.rim2 ? 0.4 : 0.28) * a * (S.rimK ?? 1)));
		cg.addColorStop(1, css(skyRim, 0));
		ctx.strokeStyle = cg;
		ctx.lineWidth = 2;
		bodyPath(ctx);
		ctx.stroke();
		ctx.restore();
	}

	// the gauge needle and the intake's readout, which glow with what the machine reads
	ctx.strokeStyle = css(mixRGB(gel, WHITE, 0.4), 0.95 * a);
	ctx.lineWidth = 1.5;
	ctx.beginPath();
	ctx.moveTo(MX - 127, 330);
	ctx.lineTo(MX - 127 + Math.cos(S.needle) * 11, 330 + Math.sin(S.needle) * 11);
	ctx.stroke();
	for (let k = 0; k < 9; k++) {
		const y = 318 + k * 12;
		const rd = clamp(reading * (0.5 + 0.5 * Math.sin(sec * 6 - k * 0.7)) + (S.tick ?? 0) * (k % 2 ? 0.9 : 0.5));
		ctx.fillStyle = css(mixRGB([22, 26, 26], dishCol, 0.7 * rd), rd * 0.9 * a);
		ctx.fillRect(MX + 112, y, 32, 5);
	}
	if (reading > 0.05) lighter(ctx, () => glow(ctx, MX + 128, 366, 56, dishCol, 0.32 * reading * a));
	ctx.strokeStyle = css(mixRGB(gel, VIOLET, apex), 0.9 * a * (1 - 0.7 * dorm));
	ctx.lineWidth = 1.2;
	ctx.beginPath();
	for (let q = 0; q <= 32; q++) {
		const ph = sec * 1.1 - (1 - q / 32) * 1.1;
		const square = ((ph % 0.5) + 0.5) % 0.5 < 0.1 ? 1 : 0;
		const v = mix(ecg(ph), square * 0.8, apex) * (1 - dorm);
		if (q) ctx.lineTo(MX + 112 + q, 286 - v * 13);
		else ctx.moveTo(MX + 112 + q, 286 - v * 13);
	}
	ctx.stroke();

	// the sensor ring: it reads the world (and, taken, answers to APEX)
	ctx.strokeStyle = css(mixRGB([170, 176, 170], dishCol, 0.6), 0.95 * a);
	ctx.lineWidth = 3.2;
	ctx.beginPath();
	ctx.ellipse(DISH.x, DISH.y, 25, 10, 0, 0, TAU);
	ctx.stroke();
	lighter(ctx, () => {
		glow(ctx, DISH.x, DISH.y, 40, dishCol, 0.6 * a * (1 - dorm) * (0.4 + 0.6 * reading));
		glow(ctx, DISH.x, DISH.y, 8, WHITE, a * (1 - dorm), 'core');
		if ((S.ringFlash ?? 0) > 0.01) glow(ctx, DISH.x, DISH.y, 30, mixRGB(gel, WHITE, 0.5), 0.9 * S.ringFlash! * a);
	});
	if (S.ringHalo) lighter(ctx, () => glow(ctx, DISH.x, DISH.y, 62, dishCol, (0.25 + 0.05 * Math.sin(sec * 1.1)) * a * (1 - dorm)));
	if (reading > 0.02 && !S.ringHalo) {
		ctx.lineWidth = 1.4;
		for (let k = 0; k < 3; k++) {
			const u = (sec * 0.9 + k / 3) % 1;
			const rr = 25 + u * 150;
			ctx.strokeStyle = css(dishCol, 0.45 * (1 - u) * reading * a);
			ctx.beginPath();
			ctx.ellipse(DISH.x, DISH.y, rr, rr * 0.38, 0, 0, TAU);
			ctx.stroke();
		}
	}

	// the vat (and what is in it) comes first when the machine blooms in
	{
	const a = S.a * S.vat;
	ctx.save();
	vatPath(ctx);
	ctx.clip();
	const vg = ctx.createLinearGradient(0, VY0, 0, VY1);
	vg.addColorStop(0, css(mixRGB(gel, WHITE, 0.12), 0.97 * a));
	vg.addColorStop(0.6, css(gel, 0.94 * a));
	vg.addColorStop(1, css(mixRGB(gel, BLACK, 0.45), 0.97 * a));
	if (fill < 1) {
		// unlit glass: dark, with the gel rising in it from the bottom
		const dg = ctx.createLinearGradient(0, VY0, 0, VY1);
		dg.addColorStop(0, css([26, 34, 36], 0.97 * a));
		dg.addColorStop(1, css([16, 22, 24], 0.97 * a));
		ctx.fillStyle = dg;
		ctx.fillRect(VX - VR, VY0, VR * 2, VY1 - VY0);
	}
	const gelTop = VY0 + (1 - fill) * (VY1 - VY0);
	ctx.fillStyle = vg;
	ctx.fillRect(VX - VR, gelTop, VR * 2, VY1 - gelTop);
	if (fill < 0.999 && fill > 0.005) {
		ctx.fillStyle = css(mixRGB(gel, WHITE, 0.6), 0.7 * a);
		ctx.fillRect(VX - VR, gelTop - 1, VR * 2, 2.5);
	}
	ctx.strokeStyle = css(WHITE, 0.3 * a * lit);
	ctx.lineWidth = 1;
	for (let b = 0; b < 12; b++) {
		const by = VY1 - ((sec * (18 + hash(b) * 20) * (1 - 0.9 * apex) + hash(b, 2) * 300) % (VY1 - VY0));
		ctx.beginPath();
		ctx.arc(VX + (hash(b, 3) - 0.5) * 60, by, 1.4 + hash(b, 4) * 2, 0, TAU);
		ctx.stroke();
	}
	// the seeds of life: cells, each with a membrane, a nucleus and a heartbeat of its own, drifting and shaped
	// for the world; under APEX they line up and all beat together, brighter, in its violet
	const halos: [number, number, number, number][] = [];
	const sparks: [number, number, number][] = [];
	const flashes: [number, number, number, number][] = [];
	const dissolves: [number, number, number, number, number][] = [];
	SEEDS.forEach((s, k) => {
		const free = 1 - apex;
		const vary = S.seedVary === true;
		const dx = Math.sin(sec * s.sp + s.ph) * (vary ? 1.5 : 5) * free;
		const dy = Math.cos(sec * s.sp * 0.8 + s.ph) * (vary ? 1.5 : 4) * free;
		const x = mix(VX + s.x + dx, VX, apex);
		const y = mix(s.y + dy, SEED_Y[k], apex);
		// a slow drift of about 6 degrees, and a breath of 4 percent every 1.8 s, out of step from one seed to the next
		const rot = mix(s.tilt + Math.sin(sec * 0.5 + s.ph) * 0.105 + (vary ? [-0.2, 0.16, 0.04][k] : 0), 0, apex);
		const own = ((sec * s.hb + s.ph / TAU) % 1 + 1) % 1;
		const pulse = mix(Math.exp(-own * 5) * (own < 0.6 ? 1 : 0), beatPulse, apex);
		// a new seed forms: the old one is gone, a bright point swells into the new shape
		const kmk = S.growT === undefined ? clamp(S.km * 1.25 - k * 0.06) : S.growT >= 0 ? 0.5 + 0.5 * ramp(k * 0.1, k * 0.1 + 0.4, S.growT) : clamp(S.km * 1.25);
		const born = S.seedBorn === undefined ? 1 : clamp(S.seedBorn * 1.3 - k * 0.14);
		if (born <= 0.001) return;
		const form = born * mix(kmk < 0.5 ? mix(1, 0, smooth(0, 0.5, kmk)) : mix(0.2, 1, smooth(0.5, 1, kmk)), 1, apex);
		const r = mix(s.r, 15, apex) * form * (vary ? [0.8, 1, 1.15][k] : 1) * (S.seedScale ?? 1) * (1 + 0.05 * Math.sin((sec * TAU) / 1.6 + s.ph) + 0.06 * pulse);
		const kindNow: SeedKind = kmk < 0.5 ? S.kindA : S.kindB;
		const stormW = kindNow === 'storm' ? 1 - apex : 0;
		const wall = kindNow === 'lava' ? 1 - apex : 0;
		const shape = (fins: boolean) => {
			const pts: [number, number][] = [];
			for (let q = 0; q < MEMBRANE_N; q++) {
				const th = (q / MEMBRANE_N) * TAU;
				const rr = r * mix(seedR(kindNow, th, fins, s.ph), seedR('apex', th), apex) * (1 + 0.02 * Math.sin(3 * th + sec * 1.1 + s.ph));
				pts.push([x + Math.cos(th + rot) * rr, y + Math.sin(th + rot) * rr * 0.9]);
			}
			return () => {
				ctx.beginPath();
				pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
				ctx.closePath();
			};
		};
		const tint = mixRGB(gel, VIOLET, apex * 0.7);
		const fillC = css(mixRGB(tint, BLACK, (0.62 - 0.27 * apex) * (vary ? [0.9, 1.1, 1][k] : 1)), (0.8 + 0.12 * apex) * a);
		if (r > 0.6) {
			// the membrane: the gel's own color darkened, so the seed sits dark in the glow; a storm's fins trail see-through
			if (stormW > 0) {
				// each fin a tapered crescent swept from a lens tip, 0.6 of the lens's length, faint at the root and gone at the tip
				const lens = 1.5 * 2 * r;
				const fl = 0.6 * lens;
				for (const sg of [1, -1]) {
					const cx0 = Math.cos(rot);
					const cy0 = Math.sin(rot);
					const loc = (u: number, v: number): [number, number] => [x + (cx0 * u - cy0 * v) * sg, y + (cy0 * u + cx0 * v) * sg * 0.9];
					const root = 1.42 * r;
					const b0 = loc(root, -0.2 * r);
					const b1 = loc(root, 0.2 * r);
					const tip = loc(root + fl * 0.85, -fl * 0.5);
					const c0 = loc(root + fl * 0.5, -fl * 0.42);
					const c1 = loc(root + fl * 0.4, -0.02 * fl);
					const fg = ctx.createLinearGradient(b0[0], b0[1], tip[0], tip[1]);
					fg.addColorStop(0, css(mixRGB(tint, BLACK, 0.55), 0.35 * a));
					fg.addColorStop(1, css(mixRGB(tint, BLACK, 0.55), 0));
					ctx.beginPath();
					ctx.moveTo(b0[0], b0[1]);
					ctx.quadraticCurveTo(c0[0], c0[1], tip[0], tip[1]);
					ctx.quadraticCurveTo(c1[0], c1[1], b1[0], b1[1]);
					ctx.closePath();
					ctx.fillStyle = fg;
					ctx.fill();
				}
			}
			const path = shape(stormW === 0);
			path();
			ctx.fillStyle = fillC;
			ctx.fill();
			// a lighter rim just inside it
			ctx.save();
			path();
			ctx.clip();
			ctx.strokeStyle = css(mixRGB(tint, WHITE, 0.65), (0.35 + 0.35 * apex) * a);
			ctx.lineWidth = 3 + 3.5 * wall;
			ctx.stroke();
			ctx.restore();
			if (!S.lite) {
			// the nucleus: a small dark body well off center (at a storm's head end), never a dot in a ring; it swells with each beat
			const nr = r * 0.2 * (0.8 + 0.4 * hash(k, 11)) * (1 + 0.15 * pulse);
			const away = s.ph + rot;
			const off = r * 0.25;
			const nx = x + Math.cos(away) * off + Math.cos(s.ph + sec * 0.3) * r * 0.03;
			const ny = y + Math.sin(away) * off * 0.9 + Math.sin(s.ph + sec * 0.3) * r * 0.03;
			const ng = ctx.createRadialGradient(nx, ny, 0, nx, ny, nr * 1.5);
			const nb = 1 + 0.15 * Math.sin(sec * 2.4 + s.ph * 3);
			ng.addColorStop(0, css(mixRGB(tint, BLACK, 0.85 - 0.3 * apex), clamp(0.9 * a * nb)));
			ng.addColorStop(0.65, css(mixRGB(tint, BLACK, 0.8 - 0.3 * apex), clamp(0.7 * a * nb)));
			ng.addColorStop(1, css(mixRGB(tint, BLACK, 0.8), 0));
			ctx.fillStyle = ng;
			ctx.beginPath();
			ctx.arc(nx, ny, nr * 1.5, 0, TAU);
			ctx.fill();
			// and a lighter fleck on the far side
			ctx.fillStyle = css(mixRGB(tint, WHITE, 0.6), 0.45 * a);
			ctx.beginPath();
			ctx.arc(x - (nx - x) * 0.9 + r * 0.05, y - (ny - y) * 0.9, r * 0.07, 0, TAU);
			ctx.fill();
			}
		}
		halos.push([x, y, r, pulse]);
		if (form < 0.5 && kmk >= 0.5) sparks.push([x, y, 1 - form]);
		if (kmk > 0.02 && kmk < 0.5 && apex < 0.05) dissolves.push([x, y, s.r, kmk / 0.5, k]);
		// a short bright flash where the new seed catches
		const fl2 = Math.exp(-Math.pow((kmk - 0.52) / 0.17, 2)) * (1 - apex);
		if (fl2 > 0.05) flashes.push([x, y, fl2, r]);
	});
	// a feed line: tiny bright motes rising from the vat's base into the gel, and gathering into a seed that is forming
	if (!S.lite) lighter(ctx, () => {
		const mote = mixRGB(gel, WHITE, 0.45);
		for (let m = 0; m < 14; m++) {
			const u = (sec * (0.1 + hash(m) * 0.08) + hash(m, 2)) % 1;
			glow(ctx, VX + (hash(m, 3) - 0.5) * 50 + Math.sin(sec + m) * 3, VY1 - 10 - u * (VY1 - VY0 - 40), 3.6, mote, 1 * (1 - u * 0.6) * (1 - apex * 0.9) * a * lit, 'core');
			glow(ctx, VX + (hash(m, 3) - 0.5) * 50 + Math.sin(sec + m) * 3, VY1 - 10 - u * (VY1 - VY0 - 40), 9, mote, 0.25 * (1 - u) * (1 - apex * 0.9) * a * lit);
		}
		for (const [sx2, sy2, f] of sparks) {
			for (let j = 0; j < 7; j++) {
				const u = (sec * 1.1 + j / 7 + sx2 * 0.01) % 1;
				const mxp = mix(VX + Math.sin(j * 2 + sec) * 16, sx2, easeOut(u));
				const myp = mix(VY1 - 8, sy2, u);
				glow(ctx, mxp, myp, 3.6, mote, 0.7 * f * (1 - u * 0.3) * a * lit, 'core');
			}
		}
	});
	// the old seed comes apart into motes that rise from where it was
	if (dissolves.length)
		lighter(ctx, () => {
			const mote = mixRGB(gel, WHITE, 0.6);
			for (const [x, y, rd, u, k] of dissolves)
				for (let j = 0; j < 9; j++) {
					const ph = hash(j, k + 20);
					const up = clamp(u * 1.3 - ph * 0.3);
					if (up <= 0) continue;
					glow(ctx, x + (hash(j, k + 30) - 0.5) * rd * 1.4, y - up * (28 + ph * 34) - (hash(j, 7) - 0.5) * rd * 0.6, 3.4, mote, 0.95 * (1 - up) * a, 'core');
				}
		});
	// a faint glow of life round each, and the bright point a new seed starts as
	lighter(ctx, () => {
		for (const [x, y, r, p] of halos) glow(ctx, x, y, r * 2.2 + 3, apex > 0.05 ? mixRGB(gel, VIOLET, apex) : gel, (0.14 + 0.1 * p + 0.3 * apex) * a * lit);
		// the birth flash: about 150 ms, kept to 1.2 seed radii and 0.6 at its peak, in the gel's own light, so nothing clips to white
		for (const [x, y, f, rn] of flashes) glow(ctx, x, y, rn * 1.2, mixRGB(gel, WHITE, 0.4), 0.6 * f * a, 'core');
	});
	// the glass's own sheen
	ctx.fillStyle = css(WHITE, mix(0.13, 0.25, 1 - fill) * a);
	ctx.fillRect(VX - VR + 7, VY0 + 26, 5, VY1 - VY0 - 52);
	ctx.restore();
	lighter(ctx, () => glow(ctx, VX, (VY0 + VY1) / 2, 170, gel, 0.14 * a * lit));
	// the glass's own rim, and the straps across it
	// a dark outer lip, and the rim lit from inside by the gel
	ctx.strokeStyle = css([4, 6, 6], 0.6 * a);
	ctx.lineWidth = 4;
	vatPath(ctx);
	ctx.stroke();
	ctx.save();
	vatPath(ctx);
	ctx.clip();
	ctx.globalCompositeOperation = 'lighter';
	ctx.strokeStyle = css(mixRGB(gel, WHITE, 0.3), 0.5 * a * lit * fill);
	ctx.lineWidth = 5;
	vatPath(ctx);
	ctx.stroke();
	ctx.restore();
	if (fill < 1) {
		// unlit glass shows a lit rim
		ctx.strokeStyle = css([176, 196, 204], 0.4 * (1 - fill) * a);
		ctx.lineWidth = 1.6;
		vatPath(ctx);
		ctx.stroke();
	}
	// the straps: raised bands standing a few pixels proud of the glass, a lit top edge, bolts at the ends
	for (const y of [270, 340]) {
		const x0 = VX - VR - 7;
		const w = VR * 2 + 14;
		ctx.fillStyle = css(BLACK, 0.4 * a);
		ctx.fillRect(VX - VR, y + 4, VR * 2, 3);
		const sg = ctx.createLinearGradient(0, y - 4, 0, y + 4);
		sg.addColorStop(0, css([120, 128, 124], 0.95 * a));
		sg.addColorStop(0.3, css([56, 63, 63], 0.95 * a));
		sg.addColorStop(1, css([20, 24, 24], 0.95 * a));
		ctx.fillStyle = sg;
		ctx.fillRect(x0, y - 4, w, 8);
		ctx.fillStyle = css([214, 220, 212], 0.55 * a);
		ctx.fillRect(x0, y - 4, w, 1);
		ctx.strokeStyle = css([6, 8, 8], 0.8 * a);
		ctx.lineWidth = 1;
		ctx.strokeRect(x0 + 0.5, y - 3.5, w - 1, 7);
		for (const bx of [x0 + 5, x0 + w - 5, VX]) {
			ctx.fillStyle = css([10, 12, 13], 0.9 * a);
			ctx.beginPath();
			ctx.arc(bx, y, 2, 0, TAU);
			ctx.fill();
			ctx.fillStyle = css([160, 168, 162], 0.7 * a);
			ctx.beginPath();
			ctx.arc(bx - 0.5, y - 0.6, 0.9, 0, TAU);
			ctx.fill();
		}
	}
	}
	// the making: a pulse of light down the mast, through the roof and into the gel, landing where the new seed starts
	if (S.pulse !== undefined && S.pulse > 0.001 && S.pulse < 1) {
		const tgt = SEEDS[0];
		const pts: [number, number][] = [[DISH.x, DISH.y + 4], [DISH.x, 142], [DISH.x, 172], [VX, VY0 + 6], [VX + tgt.x, tgt.y]];
		const lens: number[] = [0];
		for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
		const at = (u: number): [number, number] => {
			const d = clamp(u) * lens[lens.length - 1];
			for (let i = 1; i < pts.length; i++)
				if (d <= lens[i]) {
					const f = (d - lens[i - 1]) / (lens[i] - lens[i - 1] || 1);
					return [mix(pts[i - 1][0], pts[i][0], f), mix(pts[i - 1][1], pts[i][1], f)];
				}
			return pts[pts.length - 1];
		};
		const total = lens[lens.length - 1];
		const head = at(S.pulse);
		const tail = at(S.pulse - 16 / total);
		// it fades as it enters the gel
		const fade = smooth(0, 0.08, S.pulse) * (1 - smooth(VY0 - 6, VY0 + 30, head[1]));
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		ctx.lineCap = 'butt';
		ctx.strokeStyle = css(mixRGB(gel, WHITE, 0.6), 0.9 * fade * a);
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.moveTo(tail[0], tail[1]);
		ctx.lineTo(head[0], head[1]);
		ctx.stroke();
		ctx.restore();
	}
	ctx.restore();
}
