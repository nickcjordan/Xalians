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

/**
 * The viewpoint, the paintings' own: looking down on the machine (about 22 degrees) and turned a little (about 12), so its
 * roof and its left-hand side show. DEP is the housing's depth as it falls in the picture: back is up and to the right.
 * The front faces keep their flat layout (every animated position is on them); the depth is added round them.
 */
export const DEP = { x: -20, y: -32 };
/** The right-hand side face of the housing, for the world's light to play on. */
/** The x of the housing's front edge on the side that shows. */
export const SX = DEP.x < 0 ? BODY.x0 : BODY.x1;
export const SIDE_FACE: [number, number][] = [[SX, BODY.top + BODY.r], [SX + DEP.x, BODY.top + BODY.r + DEP.y], [SX + DEP.x, BODY.bot + DEP.y], [SX, BODY.bot]];

export function bodyPath(ctx: Ctx, ox = 0, oy = 0) {
	ctx.beginPath();
	ctx.moveTo(BODY.x0 + ox, BODY.bot + oy);
	ctx.lineTo(BODY.x0 + ox, BODY.top + BODY.r + oy);
	ctx.arcTo(BODY.x0 + ox, BODY.top + oy, BODY.x0 + BODY.r + ox, BODY.top + oy, BODY.r);
	ctx.lineTo(BODY.x1 - BODY.r + ox, BODY.top + oy);
	ctx.arcTo(BODY.x1 + ox, BODY.top + oy, BODY.x1 + ox, BODY.top + BODY.r + oy, BODY.r);
	ctx.lineTo(BODY.x1 + ox, BODY.bot + oy);
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
	// a flange at each bend: a front, a lit top and a dark side, seen from above
	for (const [x, y] of pts.slice(1, -1)) {
		const f = w * 0.8;
		const ex = -3;
		const ey = -6;
		g.fillStyle = css([18, 22, 23]);
		g.beginPath();
		g.moveTo(x - f, y - f);
		g.lineTo(x - f + ex, y - f + ey);
		g.lineTo(x - f + ex, y + f + ey);
		g.lineTo(x - f, y + f);
		g.closePath();
		g.fill();
		g.fillStyle = css([92, 102, 102]);
		g.beginPath();
		g.moveTo(x - f, y - f);
		g.lineTo(x + f, y - f);
		g.lineTo(x + f + ex, y - f + ey);
		g.lineTo(x - f + ex, y - f + ey);
		g.closePath();
		g.fill();
		g.fillStyle = css([32, 36, 37]);
		g.fillRect(x - f, y - f, f * 2, f * 2);
		g.strokeStyle = css([6, 8, 8], 0.8);
		g.lineWidth = 1;
		g.strokeRect(x - f + 0.5, y - f + 0.5, f * 2 - 1, f * 2 - 1);
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

	// ---- the depth round the front faces: the roof and the side, seen from above ----
	const dx = DEP.x;
	const dy = DEP.y;
	const poly = (pts: [number, number][], fill: string | CanvasGradient) => {
		g.beginPath();
		pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
		g.closePath();
		g.fillStyle = fill;
		g.fill();
	};
	const { x0: hx0, x1: hx1, top: ht, bot: hb, r: hr } = BODY;
	// the housing swept back: the roof catches the sky, the rounded shoulders turn from light to dark, the side is the darkest
	{
		const hg = g.createLinearGradient(0, ht + dy, 0, ht + hr * 0.9);
		// opaque steel: the roof 12 percent lighter than the front plating, the side 25 percent darker, the shoulders turning between
		hg.addColorStop(0, css([52, 62, 63]));
		hg.addColorStop(0.5, css([52, 62, 63]));
		hg.addColorStop(0.85, css([34, 40, 41]));
		hg.addColorStop(1, css([32, 38, 39]));
		g.fillStyle = hg;
		for (let i = 30; i >= 0; i--) {
			bodyPath(g, (dx * i) / 30, (dy * i) / 30);
			g.fill();
		}
	}
	// the roof plane: lighter toward the back, plates seamed in perspective, rivets
	{
		const lg = g.createLinearGradient(0, ht + dy, 0, ht);
		lg.addColorStop(0, css([56, 66, 67]));
		lg.addColorStop(1, css([52, 62, 63]));
		const lid: [number, number][] = [[hx0 + hr, ht], [hx1 - hr, ht], [hx1 - hr + dx, ht + dy], [hx0 + hr + dx, ht + dy]];
		poly(lid, lg);
		g.save();
		g.beginPath();
		lid.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
		g.closePath();
		g.clip();
		g.strokeStyle = css([8, 10, 10], 0.55);
		g.lineWidth = 1;
		g.beginPath();
		for (const xx of [-34, 0, 34]) {
			g.moveTo(MX + xx, ht);
			g.lineTo(MX + xx + dx, ht + dy);
		}
		g.moveTo(hx0 + hr + dx * 0.5, ht + dy * 0.5);
		g.lineTo(hx1 - hr + dx * 0.5, ht + dy * 0.5);
		g.stroke();
		g.strokeStyle = css([226, 232, 222], 0.22);
		g.beginPath();
		g.moveTo(hx0 + hr, ht + 0.5);
		g.lineTo(hx1 - hr, ht + 0.5);
		g.stroke();
		const rr = rng(404);
		for (let k = 0; k < 30; k++) {
			const u = rr();
			const v = 0.1 + rr() * 0.8;
			g.fillStyle = css(rr() < 0.5 ? [226, 232, 222] : BLACK, 0.12 + rr() * 0.12);
			g.fillRect(hx0 + hr + u * (hx1 - hr - hx0 - hr) + dx * v, ht + dy * v, 1.2, 1);
		}
		g.restore();
		// the plating rivets along the roof's front edge, as ellipses (round heads seen from above)
		for (let x = hx0 + hr + 6; x < hx1 - hr; x += 14) {
			g.fillStyle = css([12, 14, 15], 0.8);
			g.beginPath();
			g.ellipse(x, ht - 3, 1.9, 1, 0, 0, TAU);
			g.fill();
			g.fillStyle = css([190, 198, 190], 0.45);
			g.beginPath();
			g.ellipse(x - 0.4, ht - 3.4, 0.9, 0.5, 0, 0, TAU);
			g.fill();
		}
	}
	// the side: a flat plate seamed along the same rows as the front, its two straps carried round
	{
		const sg = g.createLinearGradient(SX, 0, SX + dx, 0);
		sg.addColorStop(0, css([34, 40, 41]));
		sg.addColorStop(1, css([30, 36, 37]));
		poly(SIDE_FACE, sg);
		const sp = (u: number, y: number): [number, number] => [SX + dx * u, y + dy * u];
		for (const y of [214, 384]) {
			const sb = g.createLinearGradient(0, y, 0, y + 14);
			sb.addColorStop(0, css([64, 74, 74]));
			sb.addColorStop(1, css([28, 33, 34]));
			poly([sp(0, y), sp(1, y), sp(1, y + 14), sp(0, y + 14)], sb);
			g.fillStyle = css([210, 216, 206], 0.18);
			g.beginPath();
			g.moveTo(...sp(0, y));
			g.lineTo(...sp(1, y));
			g.lineTo(...sp(1, y + 1));
			g.lineTo(...sp(0, y + 1));
			g.closePath();
			g.fill();
		}
		g.strokeStyle = css([4, 6, 6], 0.7);
		g.lineWidth = 1;
		g.beginPath();
		for (const y of [262, 318]) {
			g.moveTo(...sp(0, y));
			g.lineTo(...sp(1, y));
		}
		g.moveTo(...sp(0.55, ht + hr));
		g.lineTo(...sp(0.55, hb));
		g.stroke();
		for (const y of [220, 391]) for (const u of [0.12, 0.34, 0.56, 0.78]) rivetAt(g, ...sp(u, y), false);
		// dark toward the back, and where it meets the ground
		const dk = g.createLinearGradient(SX, 0, SX + dx, 0);
		dk.addColorStop(0, css(BLACK, 0));
		dk.addColorStop(1, css(BLACK, 0.14));
		poly(SIDE_FACE, dk);
		const ft = g.createLinearGradient(0, hb - 60, 0, hb);
		ft.addColorStop(0, css(BLACK, 0));
		ft.addColorStop(1, css(BLACK, 0.4));
		poly(SIDE_FACE, ft);
	}
	// the side boxes' tops and the right one's side
	{
		const kx = dx * 0.35;
		const ky = dy * 0.35;
		const top = (xa: number, xb: number, y: number) => {
			const tg = g.createLinearGradient(0, y + ky, 0, y);
			tg.addColorStop(0, css([56, 66, 67]));
			tg.addColorStop(1, css([52, 62, 63]));
			poly([[xa, y], [xb, y], [xb + kx, y + ky], [xa + kx, y + ky]], tg);
			g.fillStyle = css([210, 216, 206], 0.3);
			g.fillRect(xa, y - 0.5, xb - xa, 1);
		};
		top(MX - 150, MX - 104, 300);
		top(MX + 104, MX + 152, 250);
		// the right box's left face (mostly behind the housing), then the left box's, the one that shows
		poly([[MX + 104, 250], [MX + 104 + kx, 250 + ky], [MX + 104 + kx, GROUND - 2 + ky], [MX + 104, GROUND - 2]], css([30, 36, 37]));
		const lx = MX - 150;
		const rg = g.createLinearGradient(lx, 0, lx + kx, 0);
		rg.addColorStop(0, css([32, 38, 39]));
		rg.addColorStop(1, css([16, 19, 20]));
		poly([[lx, 300], [lx + kx, 300 + ky], [lx + kx, GROUND - 2 + ky], [lx, GROUND - 2]], rg);
		poly([[lx, GROUND - 40], [lx + kx, GROUND - 40 + ky], [lx + kx, GROUND - 2 + ky], [lx, GROUND - 2]], css(BLACK, 0.25));
		g.strokeStyle = css([4, 6, 6], 0.6);
		g.lineWidth = 1;
		g.beginPath();
		for (const y of [340, 380]) {
			g.moveTo(lx, y);
			g.lineTo(lx + kx, y + ky);
		}
		g.stroke();
	}

	// pipes: over the roof and down into the intake box, and down the left to the side box (the later model has no lattice tower)
	pipe(g, [[MX + 60, 150], [MX + 60, 124], [MX + 84, 118], [MX + 125, 118], [MX + 125, 242]], 7);
	pipe(g, [[MX - 60, 150], [MX - 135, 150], [MX - 135, 294]], 6);

	// the cap and the neck on the roof: each a front, a lit top and a dark left side
	{
		const blk = (xa: number, xb: number, ya: number, yb: number, k: number, lt: RGB, sd: RGB) => {
			const ex = dx * k;
			const ey = dy * k;
			const tg = g.createLinearGradient(0, ya + ey, 0, ya);
			tg.addColorStop(0, css(scale3(lt, 1.04)));
			tg.addColorStop(1, css(scale3(lt, 0.97)));
			poly([[xa, ya], [xb, ya], [xb + ex, ya + ey], [xa + ex, ya + ey]], tg);
			const sg = g.createLinearGradient(xa, 0, xa + ex, 0);
			sg.addColorStop(0, css(sd));
			sg.addColorStop(1, css(scale3(sd, 0.6)));
			poly([[xa, ya], [xa + ex, ya + ey], [xa + ex, yb + ey], [xa, yb]], sg);
		};
		blk(MX - 52, MX + 52, 161, 170, 0.34, [52, 62, 63], [34, 40, 41]);
		blk(MX - 44, MX + 44, 138, 168, 0.4, [52, 62, 63], [34, 40, 41]);
	}

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
	metal(g, MX - 52, 161, MX + 52, 170, 0.86, 72);
	metal(g, MX - 44, 138, MX + 44, 168, 1.0, 71);
	// light nicks along the neck's top edge and the cap's front edge
	{
		const nr3 = rng(65);
		g.fillStyle = css([226, 230, 220], 0.6);
		for (let k = 0; k < 9; k++) g.fillRect(MX - 50 + nr3() * 100, 169, 1 + Math.floor(nr3() * 3), 1);
		const nr2 = rng(64);
		g.fillStyle = css([226, 230, 220], 0.55);
		for (let k = 0; k < 9; k++) g.fillRect(MX - 42 + nr2() * 84, 138, 1 + Math.floor(nr2() * 3), 1);
	}
	g.fillStyle = css([10, 12, 13], 0.8);
	for (let k = 0; k < 5; k++) g.fillRect(MX - 32 + k * 14, 148, 8, 3);
	g.restore();
	// the mast stands on the neck's top: a dark collar, then the post up to the ring
	{
		const mx = DISH.x;
		const my = 130;
		g.fillStyle = css([8, 10, 11]);
		g.beginPath();
		g.ellipse(mx, my, 10, 3.6, 0, 0, TAU);
		g.fill();
		g.fillStyle = css([70, 80, 80]);
		g.beginPath();
		g.ellipse(mx, my - 1.2, 8, 2.8, 0, 0, TAU);
		g.fill();
		g.strokeStyle = css([10, 12, 12]);
		g.lineWidth = 8;
		g.beginPath();
		g.moveTo(mx, my);
		g.lineTo(mx, 108);
		g.stroke();
		g.strokeStyle = css([120, 128, 124], 0.9);
		g.lineWidth = 4;
		g.beginPath();
		g.moveTo(mx, my);
		g.lineTo(mx, 108);
		g.stroke();
	}
}

/** The roofs the sky lights: the housing's, the cap's and neck's, the side boxes'. */
export function roofWash(g: Ctx, col: RGB, a: number) {
	const { x0, x1, top, r } = BODY;
	const k = (xa: number, xb: number, y: number, kk: number): [number, number][] => [[xa, y], [xb, y], [xb + DEP.x * kk, y + DEP.y * kk], [xa + DEP.x * kk, y + DEP.y * kk]];
	const polys = [k(x0 + r, x1 - r, top, 1), k(MX - 52, MX + 52, 161, 0.34), k(MX - 44, MX + 44, 138, 0.4), k(MX - 150, MX - 104, 300, 0.35), k(MX + 104, MX + 152, 250, 0.35)];
	g.fillStyle = css(col, a);
	for (const p of polys) {
		g.beginPath();
		p.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
		g.closePath();
		g.fill();
	}
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
	// its roofs catch the sky: the painting's own sky color, brightened
	o.g.save();
	o.g.setTransform(MQ, 0, 0, MQ, -MC.x * MQ, -MC.y * MQ);
	roofWash(o.g, mixRGB(P.sky, [210, 220, 236], 0.45), 0.1);
	o.g.restore();
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
		return mix((1.0 / Math.cos(q - Math.PI / 6)) * 0.9, 0.98, 0.4) * (1 + 0.11 * Math.cos(3 * th - v) + 0.06 * Math.cos(2 * th + 2 * v));
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
export const SEED_Y = [238, 305, 369];
export const SEEDS = Array.from({ length: 3 }, (_, k) => ({ x: (hash(k, 1) - 0.5) * 14, y: SEED_Y[k] + (hash(k, 2) - 0.5) * 3, r: 26 * (0.94 + hash(k, 3) * 0.12), ph: hash(k, 4) * TAU, sp: 0.6 + hash(k, 5) * 0.5, tilt: (hash(k, 6) - 0.5) * 0.5, hb: 0.5 + hash(k, 7) * 0.25 }));

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
	/** 0 to 1: how much of the sea's painting is behind the machine to be drawn again over the rock (default 1); less, and the water is a plain dark band. */
	seaLive?: number;
	/** 0 to 1: the lit vat throws light on the plating round its window and on the foundation's top below it, scaled to the fill (default none). */
	vatLight?: number;
	/** A cool rim along the housing's upper left edge, from the sky (default none). */
	rim2?: RGB;
	/** Paint over the small crescent dent in the plating right of the vat (06 only; default false: it stays in 02 and 03). */
	patchDent?: boolean;
	/** 0 to 1: indicator lights on the two cabinets, coming on one after another as it grows (06 only; default none). */
	lamps?: number;
	/** 0 to 1: a bright bead circling the sensor ring, and the ring's light pulsing (06 only; default none). */
	ringSpin?: number;
	/** A card slot low on the housing's front (the outbreak's 06 only; default none): `w` the mouth's width in machine units, `glow` 0 to 1 how lit its mouth is, `col` the light's color. */
	slot?: { w: number; glow: number; col: RGB };
};

/** Where the card slot's lip lies, in machine units: the card is clipped above this line while it goes in. */
export const SLOT_LIP = 443;

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
const PUDDLES: [number, number, number, number][] = [[MX - 250, GROUND + 58, 34, 6], [MX - 120, GROUND + 84, 40, 7], [MX + 96, GROUND + 94, 30, 5]];
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
	// rubble: stones of very different sizes (about threefold), rotated and some soft, in clumps with gaps, larger toward us; on ice
	// few and clustered near the foundation, each with a light top; on lava low rounded lumps with a lit orange top edge
	const nRub = wi === 2 ? 46 : 170;
	for (let k = 0; k < nRub; k++) {
		const y = GROUND - 12 + Math.pow(r(), 1.2) * 132;
		const x = wi === 2 ? MX + (r() + r() - 1) * 250 : SHELF.x + r() * SHELF.w;
		if (wi !== 2 && Math.sin(x * 0.045 + y * 0.03) > 0.55) continue;
		const s = (1.2 + (y - GROUND + 20) * 0.03 * (0.4 + r())) * (0.6 + 2.6 * Math.pow(r(), 2.2));
		g.save();
		g.translate(x, y);
		g.rotate((r() - 0.5) * 1.2);
		g.fillStyle = css(r() < 0.6 ? scale3(pal.stone, 0.3 + r() * 0.3) : scale3(pal.stone, 0.9 + r() * 0.3), 0.3 + r() * 0.5);
		g.beginPath();
		if (wi === 1) g.ellipse(0, 0, s * 1.1, s * 0.55, 0, 0, TAU);
		else {
			g.moveTo(-s, s * 0.4);
			g.lineTo(-s * 0.4, -s * 0.6);
			g.lineTo(s * 0.7, -s * 0.4);
			g.lineTo(s, s * 0.5);
			g.closePath();
		}
		g.fill();
		if (wi === 1) {
			g.fillStyle = css([255, 130, 60], 0.38);
			g.fillRect(-s * 0.6, -s * 0.5, s * 1.2, 1);
		} else if (wi === 2) {
			g.fillStyle = css([226, 234, 244], 0.5);
			g.fillRect(-s * 0.5, -s * 0.6, s, 1.4);
		} else {
			g.fillStyle = css(pal.lit, 0.1);
			g.fillRect(-s * 0.4, -s * 0.6, s, 1);
		}
		g.restore();
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

const FND = { x: MX - 300, y: GROUND - 80, w: 600, h: 224 };
const fndCache: (HTMLCanvasElement | null | undefined)[] = [];
/** Where the foundation's parts sit, in machine units: the slab's front (top face ends) and its foot (its front face ends), and the buried foot. */
const SLAB_F = GROUND + 26;
const SLAB_B = GROUND + 40;
const GFOOT = GROUND + 62;
/** The slab runs back along FD (up and to the left, the machine's own direction, but deeper); its left-hand side shows. */
const FD = { x: -40, y: -64 };
const SLAB_X = 190;
const LOW_X = 204;
const LOW_K = 0.8;
/** The slab's top face, which the machine stands on, set well back from its front edge. */
const TOPF: [number, number][] = [[MX - SLAB_X, SLAB_F], [MX + SLAB_X, SLAB_F], [MX + SLAB_X + FD.x, SLAB_F + FD.y], [MX - SLAB_X + FD.x, SLAB_F + FD.y]];
/** Where each world's light comes from when its painting has not been sampled: left (-1) to right (1). */
const DEFAULT_SIDE: Record<number, number> = { 0: -0.7, 1: 0.85, 2: -0.6, 3: 0.5, 4: 0.55, [-1]: -0.3 };
const sideOf = (wi: number) => pics[wi]?.side ?? DEFAULT_SIDE[wi] ?? -0.3;

/** A face running back along (ex, ey): in its frame u runs along the depth (0 to 1) and v down from its top edge, in real units. */
function onFace(g: Ctx, ox: number, oy: number, ex: number, ey: number, fn: () => void) {
	g.save();
	g.transform(ex, ey, 0, 1, ox, oy);
	fn();
	g.restore();
}
function polyPath(g: Ctx, pts: [number, number][]) {
	g.beginPath();
	pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
	g.closePath();
}

/** The painting's own sea, as the backdrop last drew it (set by the Generators figure each time it draws the sea): its rect, and the transform it was drawn under. */
export const backdrop: ({ x: number; y: number; w: number; h: number; t: DOMMatrix } | null)[] = [null, null, null, null];

/**
 * The sea's footing, a rock that rises out of the water. Two layers: `under` (the rock: a lit top, a band of face 18 units tall
 * between the water and the foundation with crags, the faces under the overhang near black) and `over` (white crest strokes
 * hugging the waterline, one small spray burst). The water itself is the painting's sea drawn again over the rock's lower third
 * (seaWater); this makes the rock stand in the sea and not on it.
 */
const SR = { cx: MX + 2, cy: GROUND + 20, rx: 262, ryB: 66, ryF: 70, h: 19 };
let rockCache: { under: HTMLCanvasElement; over: HTMLCanvasElement; land: [number, number][] } | null | undefined;
function seaRockFor() {
	if (rockCache !== undefined) return rockCache;
	const u = offscreen(FND.w * 2, FND.h * 2);
	const v = offscreen(FND.w * 2, FND.h * 2);
	if (!u || !v) return (rockCache = null);
	const g = u.g;
	const f = v.g;
	g.setTransform(2, 0, 0, 2, -FND.x * 2, -FND.y * 2);
	f.setTransform(2, 0, 0, 2, -FND.x * 2, -FND.y * 2);
	const wr = rng(4401);
	const { cx, cy, rx, ryB, ryF, h } = SR;
	const ph = [wr() * 6, wr() * 6, wr() * 6, wr() * 6];
	const nz = (th: number) => 0.55 * Math.sin(3 * th + ph[0]) + 0.3 * Math.sin(5 * th + ph[1]) + 0.22 * Math.sin(9 * th + ph[2]) + 0.12 * Math.sin(17 * th + ph[3]);
	// the waterline across the front (theta 0 to pi, y down) is jagged; behind, the outline is lumpy
	const jag = (x: number) => (((x * 0.083 + ph[0]) % 1) - 0.5) * 7 + Math.sin(x * 0.21 + ph[1]) * 2.4;
	const N = 150;
	const land: [number, number][] = [];
	for (let q = 0; q < N; q++) {
		const th = (q / N) * TAU;
		const front = Math.sin(th) > 0;
		const n = nz(th);
		const x = cx + Math.cos(th) * rx + n * 11 + (Math.cos(th) > 0.5 ? Math.sin(th * 23 + ph[2]) * 7 + Math.sin(th * 41 + ph[3]) * 4 : 0);
		const y = cy + Math.sin(th) * (front ? ryF : ryB) + n * 4 + (front ? jag(x) * Math.pow(Math.sin(th), 0.5) : 0);
		land.push([x, y]);
	}
	const nF = land.filter((_, q) => Math.sin((q / N) * TAU) > 0).length;
	const faceH = (q: number) => h * Math.pow(Math.max(0, Math.sin((q / N) * TAU)), 0.7);
	const path = (pts: [number, number][]) => {
		g.beginPath();
		pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
		g.closePath();
	};
	// the top of the rock: lit by the sky's cold blue-gray at its far edge and on the left, stone darkening toward the water
	path(land);
	const tg = g.createLinearGradient(0, cy - ryB, 0, cy + ryF);
	tg.addColorStop(0, css([84, 108, 124]));
	tg.addColorStop(0.55, css([48, 66, 78]));
	tg.addColorStop(1, css([22, 32, 40]));
	g.fillStyle = tg;
	g.fill();
	g.save();
	path(land);
	g.clip();
	// planes on the stone: lit (the upper and left-facing ones, about a quarter brighter) and shaded, angular, a few cracks
	for (let k = 0; k < 26; k++) {
		const ax = cx - rx + wr() * rx * 2;
		const ay = cy - ryB + wr() * (ryB + ryF) * 0.9;
		const w = 14 + wr() * 34;
		const hh = 5 + wr() * 9;
		const left = ax < cx + 130 && (ax < cx || wr() < 0.4);
		g.fillStyle = css(left ? [118, 146, 162] : [8, 14, 18], left ? 0.22 : 0.2);
		g.beginPath();
		g.moveTo(ax - w, ay + hh * 0.4);
		g.lineTo(ax - w * 0.3, ay - hh);
		g.lineTo(ax + w * 0.8, ay - hh * 0.6);
		g.lineTo(ax + w * 0.5, ay + hh);
		g.closePath();
		g.fill();
	}
	// the right-hand hump: lit stone with faces, not a pillow
	for (let k = 0; k < 7; k++) {
		const ax = cx + 150 + wr() * 70;
		const ay = cy - 34 + wr() * 62;
		const w = 10 + wr() * 18;
		const hh = 6 + wr() * 8;
		// the hump keeps to the rock face's tone: only its top-left facet catches the sky
		g.fillStyle = css(k === 0 ? [74, 92, 104] : [10, 16, 22], k === 0 ? 0.34 : 0.3);
		g.beginPath();
		g.moveTo(ax - w, ay + hh * 0.5);
		g.lineTo(ax - w * 0.2, ay - hh);
		g.lineTo(ax + w * 0.9, ay - hh * 0.4);
		g.lineTo(ax + w * 0.6, ay + hh);
		g.closePath();
		g.fill();
		g.strokeStyle = css([4, 8, 11], 0.4);
		g.lineWidth = 1;
		g.beginPath();
		g.moveTo(ax - w * 0.2, ay - hh);
		g.lineTo(ax + w * 0.3, ay + hh * 0.8);
		g.stroke();
	}
	const ls = g.createLinearGradient(cx - rx, 0, cx - rx + 120, 0);
	ls.addColorStop(0, css([140, 170, 186], 0.2));
	ls.addColorStop(1, css([140, 170, 186], 0));
	g.fillStyle = ls;
	g.fillRect(cx - rx - 10, cy - ryB - 10, 140, ryB + ryF + 30);
	g.restore();
	// the face: a band of rock between the foundation and the water, near black under the overhang, its left-facing facets lit
	const top = (q: number): [number, number] => [land[q][0], land[q][1] - faceH(q)];
	const qs: number[] = [];
	for (let q = 0; q <= nF; q++) qs.push(q);
	g.beginPath();
	qs.forEach((q, i) => (i ? g.lineTo(land[q][0], land[q][1]) : g.moveTo(land[q][0], land[q][1])));
	[...qs].reverse().forEach((q) => g.lineTo(top(q)[0], top(q)[1]));
	g.closePath();
	const fg = g.createLinearGradient(0, cy + ryF - h, 0, cy + ryF + 6);
	fg.addColorStop(0, css([14, 22, 28]));
	fg.addColorStop(1, css([3, 6, 9]));
	g.fillStyle = fg;
	g.fill();
	// facets on the face: the ones that face left catch the sky, the rest stay near black
	{
		let q0 = 1;
		while (q0 < nF - 2) {
			const len = 5 + Math.floor(wr() * 8);
			const q1 = Math.min(nF - 1, q0 + len);
			const leftFacing = wr() < 0.45;
			if (leftFacing) {
				g.beginPath();
				g.moveTo(land[q0][0], land[q0][1]);
				g.lineTo(land[q1][0], land[q1][1]);
				g.lineTo(top(q1)[0], top(q1)[1]);
				g.lineTo(top(q0)[0], top(q0)[1]);
				g.closePath();
				const lg = g.createLinearGradient(0, top(q0)[1], 0, land[q0][1]);
				lg.addColorStop(0, css([96, 124, 140], 0.42));
				lg.addColorStop(1, css([96, 124, 140], 0.06));
				g.fillStyle = lg;
				g.fill();
			}
			q0 = q1;
		}
	}
	// the overhang: a dark line under the top edge
	g.strokeStyle = css([2, 4, 6], 0.7);
	g.lineWidth = 2;
	g.beginPath();
	qs.forEach((q, i) => (i ? g.lineTo(top(q)[0], top(q)[1] + 1.5) : g.moveTo(top(q)[0], top(q)[1] + 1.5)));
	g.stroke();
	// crags: two or three angular spikes standing up from the top edge, lit on the left plane, dark on the right
	for (const frac of [0.2, 0.52, 0.8]) {
		const q = Math.round(frac * nF);
		const [tx, ty] = top(q);
		const wdt = 14 + wr() * 8;
		const hgt = 9 + wr() * 7;
		g.fillStyle = css([8, 14, 18]);
		g.beginPath();
		g.moveTo(tx - wdt * 0.5, ty + 2);
		g.lineTo(tx + wr() * 4, ty - hgt);
		g.lineTo(tx + wdt * 0.6, ty + 2);
		g.closePath();
		g.fill();
		g.fillStyle = css([108, 138, 154], 0.62);
		g.beginPath();
		g.moveTo(tx - wdt * 0.5, ty + 2);
		g.lineTo(tx + 1, ty - hgt);
		g.lineTo(tx + 1, ty + 2);
		g.closePath();
		g.fill();
	}

	// ---- over the water: white crest strokes hugging the waterline exactly, heavier on the left, and one small spray burst
	const crest = (q0: number, q1: number, w: number, al: number) => {
		f.lineCap = 'round';
		f.lineJoin = 'round';
		f.filter = 'blur(1px)';
		// broken foam: three to five pieces of varied length and width, thinning and fading toward their ends
		const pieces = 3 + Math.floor(wr() * 3);
		const span = q1 - q0;
		const cuts: number[] = [0];
		for (let k = 1; k < pieces; k++) cuts.push(k / pieces + (wr() - 0.5) * 0.12);
		cuts.push(1);
		for (let k = 0; k < pieces; k++) {
			const a0 = q0 + span * (cuts[k] + 0.03 + wr() * 0.03);
			const a1 = q0 + span * (cuts[k + 1] - 0.03 - wr() * 0.06);
			if (a1 - a0 < 2) continue;
			const pw = w * 1.3 * (0.5 + wr() * 0.9);
			const n = Math.max(2, Math.round(a1 - a0));
			for (let i = 0; i < n; i++) {
				const t0 = i / n;
				const t1 = (i + 1) / n;
				const q = (t: number) => {
					const qq = a0 + (a1 - a0) * t;
					const i0 = Math.floor(qq);
					const fr = qq - i0;
					const A = land[Math.min(land.length - 1, i0)];
					const B = land[Math.min(land.length - 1, i0 + 1)];
					return [mix(A[0], B[0], fr), mix(A[1], B[1], fr) + 0.6] as [number, number];
				};
				const m = Math.sin(Math.PI * (t0 + t1) / 2);
				f.strokeStyle = css([236, 246, 250], Math.min(1, al * 1.3) * Math.pow(m, 0.6) * (0.7 + wr() * 0.3));
				f.lineWidth = Math.max(0.5, pw * (0.35 + 0.65 * m));
				const P0 = q(t0);
				const P1 = q(t1);
				f.beginPath();
				f.moveTo(P0[0], P0[1]);
				f.lineTo(P1[0], P1[1]);
				f.stroke();
			}
		}
		f.filter = 'none';
	};
	// theta runs 0 at the right, pi at the left: the left is indices near nF
	crest(Math.round(nF * 0.7), Math.round(nF * 0.98), 2.6, 0.82);
	crest(Math.round(nF * 0.76), Math.round(nF * 0.92), 1.3, 0.6);
	crest(Math.round(nF * 0.4), Math.round(nF * 0.58), 1.4, 0.55);
	crest(Math.round(nF * 0.06), Math.round(nF * 0.22), 1.2, 0.5);
	{
		const q = Math.round(nF * 0.86);
		const bx = land[q][0] - 4;
		const by = land[q][1] - 3;
		f.strokeStyle = css([236, 246, 250], 0.65);
		f.lineWidth = 1.1;
		f.lineCap = 'round';
		f.beginPath();
		for (let k = 0; k < 8; k++) {
			const an = -Math.PI * (0.18 + 0.64 * (k / 7)) - 0.4;
			const l0 = 3 + wr() * 2;
			const l1 = l0 + 3 + wr() * 6;
			f.moveTo(bx + Math.cos(an) * l0, by + Math.sin(an) * l0);
			f.lineTo(bx + Math.cos(an) * l1, by + Math.sin(an) * l1);
		}
		f.stroke();
		for (let k = 0; k < 6; k++) {
			f.fillStyle = css([236, 246, 250], 0.55);
			f.beginPath();
			f.arc(bx + (wr() - 0.5) * 18, by - 8 - wr() * 10, 0.7 + wr() * 0.6, 0, TAU);
			f.fill();
		}
	}
	return (rockCache = { under: u.c, over: v.c, land });
}

/** The sea in front of the rock: the painting's own sea drawn again, as the backdrop drew it, below the jagged waterline. */
function seaWater(ctx: Ctx, a: number, live: number) {
	const P = pics[3];
	const rk = seaRockFor();
	if (!P || !rk) return;
	ctx.save();
	// a rectangle round the rock with the land cut out (even-odd): what is left is the water
	ctx.beginPath();
	ctx.rect(FND.x, FND.y, FND.w, FND.h);
	rk.land.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
	ctx.closePath();
	ctx.clip('evenodd');
	const bd = backdrop[3];
	if (bd && live > 0.02) {
		// drawn under the transform the backdrop used, so the pixels are exactly the ones behind the machine
		const t = ctx.getTransform();
		ctx.globalAlpha = a * live * live;
		ctx.setTransform(bd.t);
		ctx.drawImage(P.c, bd.x, bd.y, bd.w, bd.h);
		ctx.setTransform(t);
	}
	if (live < 0.98) {
		// no backdrop to match (a far machine, or the view pulled back): dark water that thins out toward the edges of its patch
		ctx.globalAlpha = a * (1 - live * live);
		const cxx = SR.cx;
		const cyy = SR.cy + 40;
		ctx.save();
		ctx.translate(cxx, cyy);
		ctx.scale(1, 0.34);
		const wg = ctx.createRadialGradient(0, 0, 40, 0, 0, 300);
		wg.addColorStop(0, css([12, 28, 40], 0.92));
		wg.addColorStop(0.7, css([10, 24, 34], 0.7));
		wg.addColorStop(1, css([10, 24, 34], 0));
		ctx.fillStyle = wg;
		ctx.fillRect(-300, -300, 600, 600);
		ctx.restore();
	}
	ctx.restore();
	// the waterline's top edge, feathered about 2 units: a thin dark line where the water meets the rock
	ctx.save();
	ctx.strokeStyle = css([6, 12, 18], 0.4 * a);
	ctx.lineWidth = 2;
	ctx.lineJoin = 'round';
	ctx.beginPath();
	const n = rk.land.filter(([, y], i) => i < rk.land.length / 2).length;
	rk.land.slice(0, n + 1).forEach(([x, y], i) => (i ? ctx.lineTo(x, y + 1) : ctx.moveTo(x, y + 1)));
	ctx.stroke();
	ctx.restore();
}

/**
 * The foundation, laid stone, seen from above: a broad lit top face the machine stands back on, a short slab front and
 * a side, a wider lower course under it with a ledge, its foot graded into the ground and buried, and two dark cables
 * that cross the top, sag across its face and go into the ground at an angle. Drawn once per world, with that world's
 * material lying on its edges.
 */
function foundationFor(wi: number) {
	const key = wi + 1;
	const hit = fndCache[key];
	if (hit) return hit;
	const o = offscreen(FND.w * 2, FND.h * 2);
	const ft = offscreen(FND.w * 2, FND.h * 2);
	if (!o || !ft) return null;
	const g = o.g;
	const f = ft.g;
	g.setTransform(2, 0, 0, 2, -FND.x * 2, -FND.y * 2);
	f.setTransform(2, 0, 0, 2, -FND.x * 2, -FND.y * 2);
	const pal = palOf(wi);
	const st = pal.stone;
	const wr = rng(31 + wi);
	// 06's world (4) is seen only in the outbreak: its slab runs back no deeper than the housing's own side face
	const FDv = wi === 4 ? { x: -26, y: -42 } : FD;
	const TOPFv: [number, number][] = wi === 4 ? [[MX - SLAB_X, SLAB_F], [MX + SLAB_X, SLAB_F], [MX + SLAB_X + FDv.x, SLAB_F + FDv.y], [MX - SLAB_X + FDv.x, SLAB_F + FDv.y]] : TOPF;
	const lightRight = sideOf(wi) > 0;
	// ambient occlusion on the ground round its foot
	g.save();
	g.translate(MX + 14, GFOOT);
	g.scale(1, 0.1);
	const ao = g.createRadialGradient(0, 0, 100, 0, 0, 290);
	ao.addColorStop(0, css(BLACK, wi === 0 ? 0.85 : 0.7));
	ao.addColorStop(1, css(BLACK, 0));
	g.fillStyle = ao;
	g.fillRect(-290, -290, 580, 580);
	g.restore();

	// ---- the faces, on their own layer so the foot can fade into the ground without eating what lies under it
	const lowD: [number, number] = [FDv.x * LOW_K, FDv.y * LOW_K];
	// the lower course's ledge: its top, a little lit, showing past the slab at the end and the side
	{
		const lt = f.createLinearGradient(0, SLAB_B + lowD[1], 0, SLAB_B);
		lt.addColorStop(0, css(scale3(st, 0.7)));
		lt.addColorStop(1, css(scale3(st, 0.52)));
		polyPath(f, [[MX - LOW_X, SLAB_B], [MX + LOW_X, SLAB_B], [MX + LOW_X + lowD[0], SLAB_B + lowD[1]], [MX - LOW_X + lowD[0], SLAB_B + lowD[1]]]);
		f.fillStyle = lt;
		f.fill();
	}
	// the lower course's side, dark, going back (its left)
	onFace(f, MX - LOW_X, SLAB_B, lowD[0], lowD[1], () => {
		const h = GFOOT - SLAB_B;
		const ug = f.createLinearGradient(0, 0, 1, 0);
		ug.addColorStop(0, css(scale3(st, wi === 4 ? 0.2 : 0.3)));
		ug.addColorStop(1, css(scale3(st, wi === 4 ? 0.12 : 0.14)));
		f.fillStyle = ug;
		f.fillRect(0, 0, 1, h);
		if (wi === 4) {
			// the front's course joints carried round: one row, one staggered upright
			f.fillStyle = css(BLACK, 0.5);
			f.fillRect(0, h * 0.5 - 0.5, 1, 1.2);
			f.fillRect(0.5, 0, 0.025, h * 0.5);
		}
		const vg = f.createLinearGradient(0, 0, 0, h);
		vg.addColorStop(0, css(BLACK, 0.3));
		vg.addColorStop(1, css(BLACK, 0.1));
		f.fillStyle = vg;
		f.fillRect(0, 0, 1, h);
		f.globalCompositeOperation = 'destination-out';
		const fe = f.createLinearGradient(0, h - 16, 0, h + 3);
		fe.addColorStop(0, 'rgba(0,0,0,0)');
		fe.addColorStop(1, 'rgba(0,0,0,0.95)');
		f.fillStyle = fe;
		f.fillRect(0, h - 16, 1, 22);
		f.globalCompositeOperation = 'source-over';
	});
	// the lower course's front: solid, graded darker toward the ground
	{
		const lg = f.createLinearGradient(0, SLAB_B, 0, GFOOT);
		lg.addColorStop(0, css(scale3(st, 0.38)));
		lg.addColorStop(1, css(scale3(st, 0.16)));
		polyPath(f, [[MX - LOW_X, SLAB_B - 1], [MX + LOW_X, SLAB_B - 1], [MX + LOW_X + 4, GFOOT], [MX - LOW_X - 4, GFOOT]]);
		f.fillStyle = lg;
		f.fill();
		// the slab's shadow on it
		const sg = f.createLinearGradient(0, SLAB_B - 1, 0, SLAB_B + 12);
		sg.addColorStop(0, css(BLACK, 0.5));
		sg.addColorStop(1, css(BLACK, 0));
		f.fillStyle = sg;
		f.fillRect(MX - LOW_X, SLAB_B - 1, LOW_X * 2, 13);
	}
	// course joints, staggered
	f.strokeStyle = css(BLACK, 0.5);
	f.lineWidth = 1;
	const c1 = SLAB_B + (GFOOT - SLAB_B) * 0.5;
	f.beginPath();
	f.moveTo(MX - LOW_X, c1);
	f.lineTo(MX + LOW_X, c1 + 0.5);
	for (const [y0, y1, xs] of [[SLAB_B, c1, [-160, -84, -6, 78, 152]], [c1, GFOOT, [-124, -46, 34, 114, 176]]] as [number, number, number[]][])
		for (const x of wi === 3 ? [] : xs) {
			f.moveTo(MX + x, y0);
			f.lineTo(MX + x + 1, y1);
		}
	f.stroke();
	f.strokeStyle = css(pal.lit, 0.06);
	f.beginPath();
	f.moveTo(MX - LOW_X, c1 + 1.2);
	f.lineTo(MX + LOW_X, c1 + 1.7);
	f.stroke();
	// the slab's left-hand side: a plate of stone going back, darker than its top, its lit upper edge
	onFace(f, MX - SLAB_X, SLAB_F, FDv.x, FDv.y, () => {
		const h = SLAB_B - SLAB_F;
		const ug = f.createLinearGradient(0, 0, 1, 0);
		ug.addColorStop(0, css(scale3(st, wi === 4 ? 0.26 : 0.46)));
		ug.addColorStop(1, css(scale3(st, wi === 4 ? 0.16 : 0.26)));
		f.fillStyle = ug;
		f.fillRect(0, 0, 1, h);
		f.fillStyle = css(pal.lit, wi === 4 ? 0.05 : 0.16);
		f.fillRect(0, 0, 1, 1.1);
		if (wi === 4) {
			f.fillStyle = css(BLACK, 0.45);
			f.fillRect(0.33, 0, 0.025, h);
			f.fillRect(0.7, 0, 0.025, h);
		}
		f.fillStyle = css(BLACK, 0.4);
		f.fillRect(0, h - 3, 1, 3);
	});
	// the top face: lit by the sky and the world's light, tooled, joined, a little worn
	{
		const tg = f.createLinearGradient(0, SLAB_F + FDv.y, 0, SLAB_F);
		tg.addColorStop(0, css(scale3(st, 0.78)));
		tg.addColorStop(1, css(scale3(st, 1.02)));
		polyPath(f, TOPFv);
		f.fillStyle = tg;
		f.fill();
		f.save();
		polyPath(f, TOPFv);
		f.clip();
		const lw = f.createLinearGradient(lightRight ? MX + SLAB_X : MX - SLAB_X, 0, lightRight ? MX + SLAB_X - 150 : MX - SLAB_X + 150, 0);
		lw.addColorStop(0, css(pal.lit, 0.16));
		lw.addColorStop(1, css(pal.lit, 0));
		f.fillStyle = lw;
		f.fillRect(MX - 200, SLAB_F + FDv.y, 440, -FDv.y + 2);
		// slab joints, running back along the depth and across it
		f.strokeStyle = css(BLACK, 0.4);
		f.lineWidth = 1;
		f.beginPath();
		for (const x of [-120, -40, 40, 120]) {
			f.moveTo(MX + x, SLAB_F);
			f.lineTo(MX + x + FDv.x, SLAB_F + FDv.y);
		}
		for (const u of [0.34, 0.68]) {
			f.moveTo(MX - SLAB_X + FDv.x * u, SLAB_F + FDv.y * u);
			f.lineTo(MX + SLAB_X + FDv.x * u, SLAB_F + FDv.y * u);
		}
		f.stroke();
		f.strokeStyle = css(pal.lit, 0.08);
		f.beginPath();
		for (const x of [-120, -40, 40, 120]) {
			f.moveTo(MX + x + 1, SLAB_F);
			f.lineTo(MX + x + 1 + FDv.x, SLAB_F + FDv.y);
		}
		f.stroke();
		// tooling: faint chisel marks across it
		for (let k = 0; k < 110; k++) {
			const u = wr();
			const x = MX - SLAB_X + wr() * SLAB_X * 2 + FDv.x * u;
			const y = SLAB_F + FDv.y * u;
			f.strokeStyle = css(wr() < 0.5 ? BLACK : pal.lit, 0.09);
			f.lineWidth = 0.8;
			f.beginPath();
			f.moveTo(x, y);
			f.lineTo(x + 5 + wr() * 9, y - 1.5 - wr() * 2);
			f.stroke();
		}
		// where the machine's feet press: darkening round its base
		const mg = f.createLinearGradient(0, GROUND - 4, 0, GROUND + 12);
		mg.addColorStop(0, css(BLACK, 0.5));
		mg.addColorStop(1, css(BLACK, 0));
		f.fillStyle = mg;
		f.fillRect(MX - 158, GROUND - 4, 316, 16);
		f.restore();
		// the front edge: a lit lip, chips out of it
		f.fillStyle = css(pal.lit, 0.2);
		f.fillRect(MX - SLAB_X, SLAB_F - 0.6, SLAB_X * 2, 1.2);
		for (let k = 0; k < 14; k++) {
			const x = MX - SLAB_X + 2 + wr() * (SLAB_X * 2 - 4);
			f.fillStyle = css(BLACK, 0.4);
			f.beginPath();
			f.moveTo(x, SLAB_F);
			f.lineTo(x + 2 + wr() * 4, SLAB_F);
			f.lineTo(x + 1, SLAB_F - 2 - wr() * 3);
			f.closePath();
			f.fill();
		}
	}
	// the slab's front: short, shadowed
	{
		const fg = f.createLinearGradient(0, SLAB_F, 0, SLAB_B);
		fg.addColorStop(0, css(scale3(st, 0.58)));
		fg.addColorStop(1, css(scale3(st, 0.34)));
		polyPath(f, [[MX - SLAB_X, SLAB_F], [MX + SLAB_X, SLAB_F], [MX + SLAB_X, SLAB_B], [MX - SLAB_X, SLAB_B]]);
		f.fillStyle = fg;
		f.fill();
		f.strokeStyle = css(BLACK, 0.5);
		f.lineWidth = 1;
		f.beginPath();
		for (const x of [-120, -46, 40, 118]) {
			f.moveTo(MX + x, SLAB_F);
			f.lineTo(MX + x + 1, SLAB_B);
		}
		f.stroke();
		for (let k = 0; k < 12; k++) {
			const x = MX - SLAB_X + wr() * SLAB_X * 2;
			const sg2 = f.createLinearGradient(0, SLAB_F, 0, SLAB_B);
			sg2.addColorStop(0, css(BLACK, 0.3));
			sg2.addColorStop(1, css(BLACK, 0));
			f.fillStyle = sg2;
			f.fillRect(x, SLAB_F, 1.2 + wr() * 2, SLAB_B - SLAB_F);
		}
	}
	// wear on the lower course: streaks down the face
	for (let k = 0; k < 14; k++) {
		const x = MX - 196 + wr() * 392;
		const sg2 = f.createLinearGradient(0, SLAB_B, 0, GFOOT);
		sg2.addColorStop(0, css(BLACK, 0.3));
		sg2.addColorStop(1, css(BLACK, 0));
		f.fillStyle = sg2;
		f.fillRect(x, SLAB_B, 1.2 + wr() * 2, 8 + wr() * 18);
	}
	// the foot of the front is drawn over by the ground: its bottom 14 units fade into it
	f.globalCompositeOperation = 'destination-out';
	const bm = f.createLinearGradient(0, GFOOT - 14, 0, GFOOT + 4);
	bm.addColorStop(0, 'rgba(0,0,0,0)');
	bm.addColorStop(1, 'rgba(0,0,0,0.95)');
	f.fillStyle = bm;
	f.fillRect(MX - 240, GFOOT - 14, 480, 24);
	f.globalCompositeOperation = 'source-over';
	g.drawImage(ft.c, FND.x, FND.y, FND.w, FND.h);

	// two cables: near black, 4 to 5 units thick, a 1 px highlight at 0.2. Each leaves the side of a box, sags onto the top face,
	// crosses its front edge, hangs down the face and goes into the ground, ending in a small dark mound
	for (const sg of [-1, 1]) {
		const xs = MX + sg * 156;
		const xt = MX + sg * 174;
		const x0 = MX + sg * 116;
		const xe = wi === 4 ? MX + sg * 172 : MX + sg * 236;
		const path = () => {
			if (wi === 4) {
				// out of the cabinet's outer side, across the top face, over its front edge, flat down the face and into the ground
				g.beginPath();
				g.moveTo(MX + sg * 152, GROUND - 8);
				g.quadraticCurveTo(MX + sg * 160, SLAB_F - 14, xe, SLAB_F - 1);
				g.lineTo(xe, GFOOT - 4);
				return;
			}
			g.beginPath();
			g.moveTo(xs, GROUND - 14);
			g.quadraticCurveTo(xs + sg * 6, GROUND + 22, xt, SLAB_F - 1);
			g.quadraticCurveTo(xt + sg * 3, SLAB_B + 2, xt + sg * 2, SLAB_B + 8);
			g.quadraticCurveTo(xt + sg * 18, GFOOT + 24, xe - sg * 26, GFOOT + 5);
			g.quadraticCurveTo(xe - sg * 10, GFOOT + 1, xe, GFOOT + 5);
		};
		g.lineCap = 'round';
		g.lineJoin = 'round';
		path();
		g.strokeStyle = wi === 4 ? css([46, 24, 30]) : css([20, 20, 22]);
		g.lineWidth = wi === 4 ? 2.8 : 4.6;
		g.stroke();
		g.save();
		g.translate(wi === 4 ? 0 : -1, wi === 4 ? -1.2 : -1);
		path();
		g.strokeStyle = wi === 4 ? css([160, 112, 100], 0.4) : css([220, 226, 232], 0.2);
		g.lineWidth = wi === 4 ? 0.8 : 1;
		g.stroke();
		g.restore();
		// the end goes under a low hump of the ground: a dark dome, lit on its top edge, underlit orange on lava
		g.fillStyle = css([14, 12, 14], 0.97);
		g.beginPath();
		g.ellipse(xe, GFOOT + 7, 11, 6, 0, Math.PI, TAU);
		g.closePath();
		g.fill();
		g.strokeStyle = css(palOf(wi).lit, wi === 1 ? 0.5 : 0.34);
		g.lineWidth = 1;
		g.beginPath();
		if (wi === 1) g.ellipse(xe, GFOOT + 7, 11, 2.2, 0, 0, Math.PI);
		else g.ellipse(xe, GFOOT + 7, 11, 6, 0, Math.PI * 1.1, Math.PI * 1.9);
		g.stroke();
	}
	// contact darkening: a dark band at the foot, soft up into the stone and out onto the ground
	{
		const cg = g.createLinearGradient(0, GFOOT - 10, 0, GFOOT + 8);
		cg.addColorStop(0, css(BLACK, 0));
		cg.addColorStop(0.55, css(BLACK, 0.5));
		cg.addColorStop(1, css(BLACK, 0));
		g.fillStyle = cg;
		g.fillRect(MX - 214, GFOOT - 10, 428, 18);
		g.save();
		g.translate(MX, GFOOT + 5);
		g.scale(1, 0.06);
		const og = g.createRadialGradient(0, 0, 130, 0, 0, 236);
		og.addColorStop(0, css(BLACK, 0.5));
		og.addColorStop(1, css(BLACK, 0));
		g.fillStyle = og;
		g.fillRect(-240, -240, 480, 480);
		g.restore();
	}

	// what has settled on it and against it: each world's own material, lying ON the top face's edges and banked against the front
	const r = rng(7 + wi);
	if (wi === 2) {
		// snow, laid in the painting's own tones: drifts that lie on the ground plane in perspective, a long bank climbing the
		// front and the side, a thin cover on the top face's edges. Lit on top toward the light, blue-gray on the side away
		// from it, feathered into the snowfield, and soft (it is drawn, then blurred a little).
		const sn = offscreen(FND.w * 2, FND.h * 2);
		const bl = offscreen(FND.w * 0.3, FND.h * 0.3);
		if (sn && bl) {
			const s = sn.g;
			s.setTransform(2, 0, 0, 2, -FND.x * 2, -FND.y * 2);
			const L = lightRight ? 1 : -1;
			const lit: RGB = [196, 204, 216];
			const mid: RGB = [164, 174, 190];
			const shade: RGB = [122, 136, 158];
			// a bank: a long soft shape whose top edge rolls and whose height tapers to nothing at both ends
			const bank = (pts: [number, number][], hgt: (u: number) => number, lean: number) => {
				const top: [number, number][] = pts.map(([x, y], i) => [x, y - hgt(i / (pts.length - 1))]);
				s.beginPath();
				top.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
				for (let i = pts.length - 1; i >= 0; i--) s.lineTo(pts[i][0], pts[i][1] + 6);
				s.closePath();
				const x0 = Math.min(...pts.map((q) => q[0]));
				const x1 = Math.max(...pts.map((q) => q[0]));
				const yt = Math.min(...top.map((q) => q[1]));
				const yb = Math.max(...pts.map((q) => q[1])) + 6;
				const gh = s.createLinearGradient(0, yt, 0, yb);
				gh.addColorStop(0, css([228, 236, 246], 0.82));
				gh.addColorStop(0.5, css([176, 188, 208], 0.76));
				gh.addColorStop(1, css([120, 138, 166], 0.7));
				s.fillStyle = gh;
				s.fill();
				s.save();
				s.clip();
				// the lee side: bluer, low on the bank
				const gv = s.createLinearGradient(0, yt, 0, yb);
				gv.addColorStop(0, css([236, 242, 250], 0.24));
				gv.addColorStop(0.4, css([236, 242, 250], 0));
				gv.addColorStop(1, css([96, 114, 148], 0.45));
				s.fillStyle = gv;
				s.fillRect(x0 - 4, yt - 4, x1 - x0 + 8, yb - yt + 8);
				// a soft top edge: the upper part of the bank thins out into the air
				s.globalCompositeOperation = 'destination-out';
				const sf = s.createLinearGradient(0, yt, 0, yt + (yb - yt) * 0.55);
				sf.addColorStop(0, 'rgba(0,0,0,0.85)');
				sf.addColorStop(1, 'rgba(0,0,0,0)');
				s.fillStyle = sf;
				s.fillRect(x0 - 4, yt - 4, x1 - x0 + 8, yb - yt + 8);
				s.globalCompositeOperation = 'source-over';
				void lean;
				s.restore();
			};
			// along the front, climbing the lower course
			{
				const pts: [number, number][] = [];
				for (let x = -226; x <= 226; x += 8) pts.push([MX + x, GFOOT + 1]);
				bank(pts, (u) => Math.pow(Math.sin(u * Math.PI), 0.7) * (26 + 7 * Math.sin(u * 7 + 1) + 4 * Math.sin(u * 13 + 3)), 0);
			}
			// along the side that shows, going back with the foundation and smaller as it recedes
			{
				const pts: [number, number][] = [];
				for (let k = 0; k <= 20; k++) {
					const u = k / 20;
					pts.push([MX - LOW_X - 4 + lowD[0] * u, GFOOT + lowD[1] * u + 1]);
				}
				bank(pts, (u) => Math.pow(Math.sin(Math.min(1, u * 1.1) * Math.PI), 0.6) * (20 - 8 * u), 0);
			}
			// feather it all into the snowfield: its lower edge fades out
			s.globalCompositeOperation = 'destination-out';
			const fe = s.createLinearGradient(0, GFOOT + 14, 0, GFOOT + 58);
			fe.addColorStop(0, 'rgba(0,0,0,0)');
			fe.addColorStop(1, 'rgba(0,0,0,0.92)');
			s.fillStyle = fe;
			s.fillRect(FND.x, GFOOT + 14, FND.w, 80);
			s.globalCompositeOperation = 'source-over';
			// soft: the same layer again, blurred (scaled down and up), under the crisp one
			bl.g.drawImage(sn.c, 0, 0, bl.c.width, bl.c.height);
			g.save();
			g.globalAlpha = 0.9;
			g.drawImage(bl.c, FND.x, FND.y, FND.w, FND.h);
			g.globalAlpha = 0.3;
			g.drawImage(sn.c, FND.x, FND.y, FND.w, FND.h);
			g.restore();
		}
	} else if (wi === 4) {
		// 06's ground: stones as irregular polygons with soft contact shadows on the unlit side (away from the middle), and
		// soft heaps of dust, never flat ellipses or pasted shards
		for (let k = 0; k < 60; k++) {
			const x = MX - 232 + r() * 464;
			if (Math.sin(x * 0.07 + 1) > 0.5) continue;
			const rr = 5 + r() * 14;
			const yy = GFOOT - 2 + r() * 12;
			const dg = g.createRadialGradient(x, yy, 0, x, yy, rr);
			dg.addColorStop(0, css([66, 40, 38], 0.34 * (0.5 + r() * 0.5)));
			dg.addColorStop(1, css([66, 40, 38], 0));
			g.fillStyle = dg;
			g.beginPath();
			g.ellipse(x, yy, rr, rr * 0.4, 0, 0, TAU);
			g.fill();
		}
		const rock = (x: number, y: number, s2: number, tone: number) => {
			const side = x > MX ? 1 : -1;
			const sx0 = x + side * s2 * 0.8;
			const sy0 = y + s2 * 0.3;
			g.save();
			g.translate(sx0, sy0);
			g.scale(1, 0.34);
			const sg = g.createRadialGradient(0, 0, 0, 0, 0, s2 * 1.9);
			sg.addColorStop(0, css([4, 2, 5], 0.55));
			sg.addColorStop(1, css([4, 2, 5], 0));
			g.fillStyle = sg;
			g.fillRect(-s2 * 2, -s2 * 2, s2 * 4, s2 * 4);
			g.restore();
			const n = 7;
			const pts: [number, number][] = [];
			for (let i = 0; i < n; i++) {
				const an = (i / n) * TAU + (r() - 0.5) * 0.5;
				const rd = s2 * (0.7 + r() * 0.5);
				pts.push([x + Math.cos(an) * rd, y + Math.sin(an) * rd * 0.62]);
			}
			const gr = g.createLinearGradient(x, y - s2 * 0.7, x, y + s2 * 0.5);
			gr.addColorStop(0, css(scale3([96, 58, 50], tone), 1));
			gr.addColorStop(1, css(scale3([46, 28, 28], tone), 1));
			g.fillStyle = gr;
			g.beginPath();
			g.moveTo(pts[0][0], pts[0][1]);
			for (let i = 1; i < n; i++) g.lineTo(pts[i][0], pts[i][1]);
			g.closePath();
			g.fill();
		};
		for (let k = 0; k < 26; k++) {
			const x = MX - 236 + r() * 472;
			if (Math.sin(x * 0.05 + 2) > 0.45) continue;
			rock(x, GFOOT + 4 + r() * 12, 1.6 + 5 * Math.pow(r(), 2), 0.7 + r() * 0.6);
		}
		for (let k = 0; k < 3; k++) rock(MX - 170 + k * 120 + r() * 60, GFOOT + 16 + r() * 6, 7 + r() * 4, 0.6 + r() * 0.3);
	} else {
		// soil, rubble and crust heaped over the foot, so it reads as sunk in: clumps with gaps, stones of very different sizes
		for (let k = 0; k < (wi === 3 ? 0 : 90); k++) {
			const x = MX - 236 + r() * 472;
			if (Math.sin(x * 0.07 + 1) > 0.5) continue;
			g.fillStyle = css(scale3(palOf(wi).bot, wi === 3 ? 0.7 + r() * 0.7 : 0.8 + r() * 1.1), 0.5 + r() * 0.3);
			g.beginPath();
			g.ellipse(x, GFOOT - 3 + r() * 12, 3 + r() * 8, 1.8 + r() * 3, 0, 0, TAU);
			g.fill();
		}
		const stone = (x: number, y: number, s2: number, dark: number) => {
			g.save();
			g.translate(x, y);
			g.rotate((r() - 0.5) * 1.1);
			g.fillStyle = css(scale3(st, dark), 0.6 + r() * 0.4);
			g.beginPath();
			if (wi === 1) {
				// lava rubble: a low rounded lump with a lit orange top edge
				g.ellipse(0, 0, s2, s2 * 0.55, 0, Math.PI, TAU);
				g.closePath();
				g.fill();
				g.fillStyle = css([255, 130, 60], 0.4);
				g.fillRect(-s2 * 0.6, -s2 * 0.5, s2 * 1.2, 1);
			} else {
				g.moveTo(-s2, s2 * 0.4);
				g.lineTo(-s2 * 0.5, -s2 * 0.8);
				g.lineTo(s2 * 0.4, -s2 * 1.0);
				g.lineTo(s2, s2 * 0.3);
				g.closePath();
				g.fill();
				g.fillStyle = css(palOf(wi).lit, 0.1);
				g.fillRect(-s2 * 0.5, -s2 * 0.8, s2 * 0.9, 1);
			}
			g.restore();
		};
		for (let k = 0; k < (wi === 3 ? 0 : 22); k++) {
			const x = MX - 236 + r() * 472;
			if (Math.sin(x * 0.05 + 2) > 0.45) continue;
			stone(x, GFOOT + 4 + r() * 10, 1.6 + 7 * Math.pow(r(), 2.3), 0.4 + r() * 0.6);
		}
		for (let k = 0; k < (wi === 3 ? 0 : 4); k++) stone(MX - 150 + r() * 300, GFOOT - 6 - r() * 5, 3 + r() * 5, 0.5 + r() * 0.4);
		for (let k = 0; k < (wi === 3 ? 0 : 3); k++) stone(MX - 170 + k * 120 + r() * 60, GFOOT + 16 + r() * 6, 9 + r() * 5, 0.28 + r() * 0.2);
		// loose stones and grit on the top face and lying against its front edge
		for (let k = 0; k < 8; k++) {
			const u = r();
			stone(MX - SLAB_X + 10 + r() * (SLAB_X * 2 - 20) + FDv.x * u, SLAB_F + FDv.y * u - 1, 1.4 + r() * 3.2, 0.5 + r() * 0.5);
		}
		if (wi === 0) {
			// storm: wet. dark puddles on the top face, pale along their far rims where they catch the sky, and a sheen near the front edge
			for (const [px, u, rx2] of [[-110, 0.34, 24], [96, 0.62, 28], [20, 0.18, 14]] as const) {
				const x = MX + px + FDv.x * u;
				const y = SLAB_F + FDv.y * u;
				g.fillStyle = css([6, 8, 12], 0.7);
				g.beginPath();
				g.ellipse(x, y, rx2, rx2 * 0.16, 0, 0, TAU);
				g.fill();
				g.strokeStyle = css([160, 176, 206], 0.3);
				g.lineWidth = 1;
				g.beginPath();
				g.ellipse(x, y - 0.4, rx2, rx2 * 0.16, 0, Math.PI * 1.08, Math.PI * 1.92);
				g.stroke();
			}
			const shn = g.createLinearGradient(0, SLAB_F - 14, 0, SLAB_F);
			shn.addColorStop(0, css([170, 186, 214], 0));
			shn.addColorStop(1, css([170, 186, 214], 0.1));
			g.fillStyle = shn;
			g.fillRect(MX - SLAB_X, SLAB_F - 14, SLAB_X * 2, 14);
			// water running off the front edge
			for (let k = 0; k < 9; k++) {
				const x = MX - 170 + r() * 340;
				g.fillStyle = css([140, 160, 190], 0.1);
				g.fillRect(x, SLAB_F, 1, SLAB_B - SLAB_F + 2 + r() * 10);
			}
		}
		if (wi === 1) {
			// lava: grey ash dusting the top face's edges, a few embers caught in it, and dark crust fragments in front of the base
			g.fillStyle = css([112, 96, 88], 0.2);
			for (let k = 0; k < 16; k++) {
				const u = r();
				g.beginPath();
				g.ellipse(MX - SLAB_X + r() * SLAB_X * 2 + FDv.x * u, SLAB_F + FDv.y * u + (r() < 0.4 ? 0 : -1), 6 + r() * 14, 1.2 + r() * 1.6, 0, 0, TAU);
				g.fill();
			}
			for (let k = 0; k < 10; k++) {
				const u = r();
				g.fillStyle = css([255, 150, 70], 0.5 + r() * 0.4);
				g.fillRect(MX - SLAB_X + r() * SLAB_X * 2 + FDv.x * u, SLAB_F + FDv.y * u, 1.4, 1.2);
			}
			for (let k = 0; k < 12; k++) {
				let x = MX - 210 + r() * 420;
				if (Math.abs(Math.abs(x - MX) - 236) < 22) x = MX + (x - MX) * 0.6;
				const s2 = 4 + r() * 8;
				// low rounded lumps of crust, not points
				g.fillStyle = css([18, 11, 9], 0.95);
				g.beginPath();
				g.ellipse(x, GFOOT + 11, s2 * 1.1, s2 * 0.5, 0, 0, TAU);
				g.fill();
				g.fillStyle = css([255, 130, 60], 0.16);
				g.beginPath();
				g.ellipse(x - s2 * 0.2, GFOOT + 9.6, s2 * 0.6, s2 * 0.14, 0, 0, TAU);
				g.fill();
			}
		}
	}
	return (fndCache[key] = o.c);
}

/** The machine's shadow, cast on the ground away from the world's light: one soft canvas per world. */
const SHD = { x: MX - 460, y: GROUND - 90, w: 920, h: 296 };
const SHADOW: Record<number, { len: number; a: number; col: RGB }> = {
	0: { len: 0.85, a: 0.5, col: [4, 6, 14] },
	1: { len: 0.7, a: 0.4, col: [20, 6, 4] },
	2: { len: 0.85, a: 0.5, col: [30, 46, 86] },
	3: { len: 0.75, a: 0.5, col: [4, 10, 18] },
	4: { len: 0.75, a: 0.5, col: [18, 4, 8] },
	[-1]: { len: 0.75, a: 0.5, col: [8, 6, 18] },
};
const shdCache: (HTMLCanvasElement | null | undefined)[] = [];
function hull(pts: [number, number][]): [number, number][] {
	const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
	const cross = (o: [number, number], a: [number, number], b: [number, number]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
	const lo: [number, number][] = [];
	for (const q of p) {
		while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop();
		lo.push(q);
	}
	const up: [number, number][] = [];
	for (const q of [...p].reverse()) {
		while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop();
		up.push(q);
	}
	return lo.slice(0, -1).concat(up.slice(0, -1));
}
function shadowFor(wi: number) {
	const key = wi + 1;
	const hit = shdCache[key];
	if (hit) return hit;
	const sd = SHADOW[wi] ?? SHADOW[-1];
	const side = sideOf(wi);
	// a quarter of the pixels: scaling it back up is what softens it
	const Q = 8;
	const o = offscreen(SHD.w / Q, SHD.h / Q);
	if (!o) return null;
	const g = o.g;
	g.setTransform(1 / Q, 0, 0, 1 / Q, -SHD.x / Q, -SHD.y / Q);
	// one light for every world: the shadow always falls to the right and toward us
	void side;
	const sgn = 1;
	// per unit of height the shadow falls out and slightly toward us (the light is a little behind)
	const vx = sgn * 0.7 * sd.len;
	const vy = 0.5 * sd.len;
	const box = (x0: number, x1: number, k: number, hgt: number) => {
		const y = GROUND - 2;
		const base: [number, number][] = [[x0, y], [x1, y], [x1 + DEP.x * k, y + DEP.y * k], [x0 + DEP.x * k, y + DEP.y * k]];
		const tip = base.map(([x, yy]) => [x + vx * hgt, yy + vy * hgt] as [number, number]);
		const h = hull([...base, ...tip]);
		g.beginPath();
		h.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py)));
		g.closePath();
		g.fill();
	};
	g.fillStyle = css(sd.col);
	box(MX - 106, MX + 106, 1, 262);
	box(MX - 44, MX + 44, 0.8, 306);
	box(MX - 152, MX - 104, 0.5, 136);
	box(MX + 104, MX + 152, 0.5, 186);
	// the mast and the ring on it: a thin streak ending in a small ellipse
	{
		const hgt = 346;
		g.strokeStyle = css(sd.col);
		g.lineWidth = 5;
		g.beginPath();
		g.moveTo(DISH.x, GROUND - 26);
		g.lineTo(DISH.x + vx * hgt, GROUND - 26 + vy * hgt);
		g.stroke();
		g.beginPath();
		g.ellipse(DISH.x + vx * hgt, GROUND - 26 + vy * hgt, 26 * sd.len + 10, 6, 0, 0, TAU);
		g.fill();
	}
	// it thins with distance from the foot of the machine
	g.globalCompositeOperation = 'destination-in';
	const fg = g.createLinearGradient(MX, GROUND - 10, MX + vx * 250, GROUND - 10 + vy * 250);
	fg.addColorStop(0, 'rgba(0,0,0,1)');
	fg.addColorStop(0.5, 'rgba(0,0,0,0.7)');
	fg.addColorStop(1, 'rgba(0,0,0,0)');
	g.fillStyle = fg;
	g.fillRect(SHD.x, SHD.y, SHD.w, SHD.h);
	return (shdCache[key] = o.c);
}

/** Draw the ground under a machine: the shelf, the shadow it casts on the ground beyond, the foundation, and its shadow on the top face. `a` is the machine's alpha. */
function drawGround(ctx: Ctx, wi: number, a: number, S: MachineLook, shelf: boolean) {
	if (shelf && wi !== 3) {
		const sh = shelfFor(wi);
		if (sh) {
			ctx.globalAlpha = a * 0.5;
			ctx.drawImage(sh, SHELF.x, SHELF.y, SHELF.w, SHELF.h);
			ctx.globalAlpha = 1;
		}
	}
	const sd = SHADOW[wi] ?? SHADOW[-1];
	const sh = S.lite ? null : shadowFor(wi);
	// on the ground beyond the foundation: lower than its top by the foundation's height, and a little farther out
	if (sh) {
		ctx.globalAlpha = a * sd.a;
		ctx.drawImage(sh, SHD.x + 14, SHD.y + 38, SHD.w, SHD.h);
		ctx.globalAlpha = 1;
	}
	if (wi === 3) {
		// the rock first, then the sea over its lower third, then the crests on the waterline
		const rk = seaRockFor();
		if (rk) {
			ctx.globalAlpha = a;
			ctx.drawImage(rk.under, FND.x, FND.y, FND.w, FND.h);
			ctx.globalAlpha = 1;
			seaWater(ctx, a, S.lite ? 0 : S.seaLive ?? 1);
			ctx.globalAlpha = a;
			ctx.drawImage(rk.over, FND.x, FND.y, FND.w, FND.h);
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
	if (wi === 1) {
		// the glowing ground lights the foundation's underside: a warm band along the foot of its front and the side that shows,
		// strongest at the ground and gone a third of the way up
		ctx.save();
		ctx.translate(MX - 6, GFOOT - 8);
		ctx.scale(1, 0.1);
		lighter(ctx, () => glow(ctx, 0, 0, 250, [255, 120, 50], 0.34 * a));
		ctx.restore();
		ctx.save();
		ctx.translate(MX - LOW_X + FD.x * 0.45, GFOOT + FD.y * 0.4);
		ctx.scale(0.5, 0.22);
		lighter(ctx, () => glow(ctx, 0, 0, 90, [255, 120, 50], 0.28 * a));
		ctx.restore();
	}
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
}

/** The roof's top plane, swept back along the depth: the housing's lid. */
const ROOF_LID: [number, number][] = [[BODY.x0 + BODY.r, BODY.top], [BODY.x1 - BODY.r, BODY.top], [BODY.x1 - BODY.r + DEP.x, BODY.top + DEP.y], [BODY.x0 + BODY.r + DEP.x, BODY.top + DEP.y]];
export function drawMachine(ctx: Ctx, S: MachineLook) {
	const { sec, gel, light, apex, beatPulse, reading, dishCol, side } = S;
	const lit = S.lit ?? 1;
	const dorm = S.dormant ?? 0;
	const fill = S.vatFill ?? 1;
	const a = S.a * S.housing;
	// the outbreak's 06 world (4): its own light and plating rules, so 02 and 03 are untouched
	const o6 = S.world === 4;
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
	if (!S.lite) {
		topShadow(ctx, S.world, a);
		if (S.wk > 0.01 && S.world2 >= 0) topShadow(ctx, S.world2, a * S.wk);
	}
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
		if (o6) {
			// the side face and the roof are opaque steel: a solid base under the plating, so nothing behind it carries through
			ctx.globalAlpha = a;
			ctx.fillStyle = css([40, 24, 30]);
			for (const q of [SIDE_FACE, ROOF_LID]) {
				ctx.beginPath();
				q.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
				ctx.closePath();
				ctx.fill();
			}
		}
		ctx.globalAlpha = a * (S.emerge ?? 1);
		ctx.drawImage(mc, MC.x, MC.y, MC.w, MC.h);
		if (o6) {
			// and 15 percent darker than the front, so the side and the roof separate from the haze behind
			ctx.globalAlpha = a * 0.15;
			ctx.fillStyle = css(BLACK);
			for (const q of [SIDE_FACE, ROOF_LID]) {
				ctx.beginPath();
				q.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
				ctx.closePath();
				ctx.fill();
			}
		}
		ctx.globalAlpha = a;
		const mc2 = !S.lite && S.wk > 0.01 && S.world2 >= 0 ? machineTinted(S.world2) : null;
		if (mc2) {
			ctx.globalAlpha = a * S.wk;
			ctx.drawImage(mc2, MC.x, MC.y, MC.w, MC.h);
			ctx.globalAlpha = a;
		}
		if (S.patchDent) {
			// a clean piece of the same plate, copied over the dent
			ctx.drawImage(mc, (MX + 88 - MC.x) * MQ, (344 - MC.y) * MQ, 16 * MQ, 28 * MQ, MX + 66, 344, 16, 28);
		}
		const fw = S.wk > 0.5 && S.world2 >= 0 ? S.world2 : S.world;
		const fs2 = fw >= 0 && S.foot === true ? footStrip(fw) : null;
		if (fs2) ctx.drawImage(fs2, FOOT.x, FOOT.y, FOOT.w, FOOT.h);
		ctx.globalAlpha = 1;
	}
	// the side that shows takes the world's light, or falls into its shade
	{
		ctx.save();
		ctx.beginPath();
		SIDE_FACE.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
		ctx.closePath();
		ctx.clip();
		const toward = DEP.x < 0 ? -side : side;
		if (toward > 0) {
			ctx.globalCompositeOperation = 'lighter';
			ctx.fillStyle = css(light, 0.24 * clamp(toward) * a);
		} else {
			ctx.fillStyle = css(BLACK, 0.34 * clamp(-toward) * a);
		}
		ctx.fillRect(SX - 40, BODY.top, 80, BODY.bot - BODY.top);
		ctx.restore();
	}
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
	// (06 has no whole-face tint from the vat: only the bands round its window, below)
	if (!o6) {
		const spill = ctx.createRadialGradient(VX, 300, 20, VX, 300, 150);
		spill.addColorStop(0, css(gel, 0.25 * a * lit));
		spill.addColorStop(1, css(gel, 0));
		ctx.fillStyle = spill;
		ctx.fillRect(BODY.x0, BODY.top, BODY.x1 - BODY.x0, BODY.bot - BODY.top);
	}
	// the lowest panels sit darker where they meet the ground
	const low = ctx.createLinearGradient(0, BODY.bot - 80, 0, BODY.bot);
	low.addColorStop(0, css(BLACK, 0));
	low.addColorStop(1, css(BLACK, 0.4 * a));
	ctx.globalCompositeOperation = 'source-over';
	ctx.fillStyle = low;
	ctx.fillRect(BODY.x0, BODY.bot - 80, BODY.x1 - BODY.x0, 80);
	ctx.restore();
	if (S.vatLight) {
		// the lit vat lights what is round it: the plating about the window frame, and a soft pool on the foundation's top below it
		const vl = S.vatLight * fill * lit * a;
		ctx.save();
		bodyPath(ctx);
		ctx.clip();
		ctx.globalCompositeOperation = 'lighter';
		// three bands round the window frame, fading out within about a third of the face's width from it
		ctx.lineJoin = 'round';
		for (const [lw, al] of (o6 ? [[78, 0.026], [60, 0.03], [42, 0.036], [24, 0.05]] : [[140, 0.03], [92, 0.03], [48, 0.03]]) as readonly (readonly [number, number])[]) {
			ctx.strokeStyle = css(gel, al * vl);
			ctx.lineWidth = lw;
			vatPath(ctx);
			ctx.stroke();
		}
		ctx.restore();
		ctx.save();
		ctx.translate(VX, GROUND + 12);
		ctx.scale(1, 0.2);
		lighter(ctx, () => glow(ctx, 0, 0, 175, o6 ? mixRGB(gel, [255, 226, 170], 0.3) : gel, (o6 ? 0.55 : 0.34) * vl));
		ctx.restore();
	}
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

	// the roof's far edges catch the sky
	{
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		const skyRim = S.rim2 ?? mixRGB(light, [170, 190, 220], 0.6);
		ctx.strokeStyle = css(skyRim, 0.36 * a * (S.rimK ?? 1));
		ctx.lineWidth = 1.3;
		ctx.beginPath();
		ctx.moveTo(BODY.x0 + BODY.r + DEP.x, BODY.top + DEP.y);
		ctx.lineTo(BODY.x1 - BODY.r + DEP.x, BODY.top + DEP.y);
		ctx.moveTo(MX - 44 + DEP.x * 0.4, 138 + DEP.y * 0.4);
		ctx.lineTo(MX + 44 + DEP.x * 0.4, 138 + DEP.y * 0.4);
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

	// the sensor ring: it reads the world (and, taken, answers to APEX); seen from above, a ring with an underside and a hollow
	ctx.strokeStyle = css([12, 14, 14], 0.9 * a);
	ctx.lineWidth = 3.6;
	ctx.beginPath();
	ctx.ellipse(DISH.x, DISH.y + 3.6, 25, 10, 0, 0, TAU);
	ctx.stroke();
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
	if ((S.ringSpin ?? 0) > 0.01) {
		const rs = S.ringSpin!;
		const an = sec * 1.7;
		lighter(ctx, () => {
			// a bead and its short tail going round the ring, and the whole ring breathing
			for (let k = 0; k < 6; k++) {
				const aa = an - k * 0.2;
				glow(ctx, DISH.x + Math.cos(aa) * 25, DISH.y + Math.sin(aa) * 10, 11 - k * 1.4, mixRGB(dishCol, WHITE, 0.55), (1 - k * 0.14) * rs * a);
			}
			glow(ctx, DISH.x, DISH.y, 44, dishCol, (0.2 + 0.1 * Math.sin(sec * 2.4)) * rs * a);
			// the ring itself lit green: a lit tube round the whole ellipse
			ctx.strokeStyle = css(dishCol, (0.7 + 0.15 * Math.sin(sec * 2.4)) * rs * a);
			ctx.lineWidth = 3.6;
			ctx.beginPath();
			ctx.ellipse(DISH.x, DISH.y, 25, 10, 0, 0, TAU);
			ctx.stroke();
			ctx.strokeStyle = css(mixRGB(dishCol, WHITE, 0.5), 0.5 * rs * a);
			ctx.lineWidth = 1.2;
			ctx.stroke();
		});
	}
	if ((S.lamps ?? 0) > 0.001) {
		// small indicator lights on the cabinets, coming on one after another and then holding with a faint flicker
		const LAMPS: [number, number, boolean][] = [[MX - 141, 311, false], [MX - 132, 311, true], [MX - 123, 311, false], [MX - 114, 311, true], [MX + 120, 257, false], [MX + 129, 257, true], [MX + 138, 257, false], [MX + 128, 307, true]];
		LAMPS.forEach(([lx, ly, amber], k) => {
			const on = smooth(k / LAMPS.length * 0.8, k / LAMPS.length * 0.8 + 0.2, S.lamps!);
			if (on < 0.01) return;
			const col: RGB = amber ? [255, 190, 100] : dishCol;
			const fl = 0.85 + 0.15 * Math.sin(sec * (3 + k * 0.7) + k * 2);
			ctx.fillStyle = css([8, 10, 10], 0.9 * a);
			ctx.beginPath();
			ctx.arc(lx, ly, 4.6, 0, TAU);
			ctx.fill();
			ctx.fillStyle = css(mixRGB(col, WHITE, 0.3), on * fl * a);
			ctx.beginPath();
			ctx.arc(lx, ly, 3.4, 0, TAU);
			ctx.fill();
			lighter(ctx, () => glow(ctx, lx, ly, 16, col, 0.7 * on * fl * a));
		});
	}
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
		const x = mix(VX + s.x + dx + (vary && k === 1 ? 9 * (S.seedScale ?? 1) : 0), VX, apex);
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
		const kindK = kmk < 0.5 ? S.kindA : S.kindB;
		const fitK = kindK === 'storm' ? 0.84 : kindK === 'sea' ? 0.92 : 1;
		const r = mix(s.r * fitK, 18, apex) * form * (vary ? [0.88, 1, 1.05][k] : 1) * (S.seedScale ?? 1) * (1 + 0.05 * Math.sin((sec * TAU) / 1.6 + s.ph) + 0.06 * pulse);
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
		const fillC = css(mixRGB(tint, BLACK, (0.74 - 0.3 * apex) * (vary ? [0.92, 1.08, 1][k] : 1)), (0.92 + 0.06 * apex) * a);
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
					// a light stroke down each fin's leading edge, so the form reads as a lens with fins
					ctx.beginPath();
					ctx.moveTo(b0[0], b0[1]);
					ctx.quadraticCurveTo(c0[0], c0[1], tip[0], tip[1]);
					ctx.strokeStyle = css(mixRGB(tint, WHITE, 0.55), 0.4 * a);
					ctx.lineWidth = 1.3;
					ctx.stroke();
				}
			}
			// a faint glow of life round it, laid first so the seed stays dark against it
			lighter(ctx, () => glow(ctx, x, y, r * 2.3 + 3, apex > 0.05 ? mixRGB(gel, VIOLET, apex) : gel, (0.14 + 0.1 * pulse + 0.3 * apex) * a * lit));
			const path = shape(stormW === 0);
			path();
			ctx.fillStyle = fillC;
			ctx.fill();
			// a dark edge, so the silhouette holds against the glow at any size
			ctx.strokeStyle = css(mixRGB(tint, BLACK, 0.92), 0.7 * a);
			ctx.lineWidth = 1.8;
			ctx.lineJoin = 'round';
			ctx.stroke();
			// a lighter rim just inside it
			ctx.save();
			path();
			ctx.clip();
			ctx.strokeStyle = css(mixRGB(tint, WHITE, 0.6), (0.2 + 0.32 * apex) * a);
			ctx.lineWidth = 2.6 + 3 * wall;
			ctx.stroke();
			ctx.restore();
			if (wall > 0.01 && !S.lite) {
				// the armored hexagon's facets: light edges from the middle toward each corner, 1 to 2 px
				ctx.strokeStyle = css(mixRGB(tint, WHITE, 0.6), 0.3 * wall * a);
				ctx.lineWidth = 1.3;
				ctx.beginPath();
				for (let q = 0; q < 6; q++) {
					const an = rot + (q * Math.PI) / 3 + 0.2 * Math.sin(s.ph);
					ctx.moveTo(x + Math.cos(an) * r * 0.42, y + Math.sin(an) * r * 0.42 * 0.9);
					ctx.lineTo(x + Math.cos(an) * r * 0.86, y + Math.sin(an) * r * 0.86 * 0.9);
				}
				ctx.stroke();
			}
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
		// the birth flash: about 150 ms, kept to 1.2 seed radii and 0.6 at its peak, in the gel's own light, so nothing clips to white
		for (const [x, y, f, rn] of flashes) glow(ctx, x, y, rn * 1.2, mixRGB(gel, WHITE, 0.4), 0.6 * f * a, 'core');
	});
	// the glass's own sheen
	ctx.fillStyle = css(WHITE, mix(0.13, 0.25, 1 - fill) * a);
	ctx.fillRect(VX - VR + 7, VY0 + 26, 5, VY1 - VY0 - 52);
	// the frame's thickness: the glass sits back in its opening, so the upper lip shades it and the opening's far wall shows
	// down the side away from the turn and along the sill (the glass, set back, is shifted up and toward the turn)
	{
		const lip = ctx.createLinearGradient(0, VY0, 0, VY0 + 40);
		lip.addColorStop(0, css(BLACK, 0.55 * a));
		lip.addColorStop(1, css(BLACK, 0));
		ctx.fillStyle = lip;
		ctx.fillRect(VX - VR, VY0, VR * 2, 40);
		const sgn = DEP.x < 0 ? -1 : 1;
		ctx.beginPath();
		for (const [ox, oy] of [[0, 0], [sgn * 4, -5]]) {
			ctx.moveTo(VX - VR + ox, VY0 + VR + oy);
			ctx.arc(VX + ox, VY0 + VR + oy, VR, Math.PI, 0);
			ctx.lineTo(VX + VR + ox, VY1 - VR + oy);
			ctx.arc(VX + ox, VY1 - VR + oy, VR, 0, Math.PI);
			ctx.closePath();
		}
		ctx.fillStyle = css([6, 9, 10], 0.82 * a);
		ctx.fill('evenodd');
		// the sill catches the light
		ctx.strokeStyle = css(mixRGB(gel, WHITE, 0.35), 0.28 * a * lit);
		ctx.lineWidth = 1.2;
		ctx.beginPath();
		ctx.arc(VX, VY1 - VR - 1, VR - 3, 0.15 * Math.PI, 0.85 * Math.PI);
		ctx.stroke();
	}
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
	if (S.slot) drawSlot(ctx, S.slot, a);
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

/** The card slot: a low intake block on the housing's front with a dark mouth, a thin lip and a lit seam (06 only). */
function drawSlot(ctx: Ctx, sl: { w: number; glow: number; col: RGB }, a: number) {
	const x0 = MX - sl.w / 2 - 7;
	const x1 = MX + sl.w / 2 + 7;
	const yT = 436; // the top face's back edge
	const yL = 443.5; // its front edge (the lip) and the front face's top
	const yB = 454;
	ctx.save();
	ctx.globalAlpha = a;
	// the front face
	const ff = ctx.createLinearGradient(0, yL, 0, yB);
	ff.addColorStop(0, css([58, 64, 64]));
	ff.addColorStop(1, css([20, 24, 25]));
	ctx.fillStyle = ff;
	ctx.fillRect(x0, yL, x1 - x0, yB - yL);
	// the top face, a little narrower at the back
	const tf = ctx.createLinearGradient(0, yT, 0, yL);
	tf.addColorStop(0, css([34, 39, 40]));
	tf.addColorStop(1, css([62, 69, 68]));
	ctx.fillStyle = tf;
	ctx.beginPath();
	ctx.moveTo(x0 + 4, yT);
	ctx.lineTo(x1 - 4, yT);
	ctx.lineTo(x1, yL);
	ctx.lineTo(x0, yL);
	ctx.closePath();
	ctx.fill();
	// the mouth: a dark recess cut into the top face
	const mx0 = MX - sl.w / 2;
	const mx1 = MX + sl.w / 2;
	ctx.fillStyle = css([2, 2, 4]);
	ctx.beginPath();
	ctx.moveTo(mx0 + 1.5, yT + 3);
	ctx.lineTo(mx1 - 1.5, yT + 3);
	ctx.lineTo(mx1, yL - 0.5);
	ctx.lineTo(mx0, yL - 0.5);
	ctx.closePath();
	ctx.fill();
	// the lit mouth: a thin line of light along the recess's back wall, and a glow spilling on the lip
	const g = clamp(sl.glow);
	ctx.globalCompositeOperation = 'lighter';
	ctx.fillStyle = css(sl.col, 0.28 + 0.6 * g);
	ctx.fillRect(mx0 + 2, yT + 3, sl.w - 4, 1.1);
	ctx.fillStyle = css(sl.col, 0.1 + 0.3 * g);
	ctx.fillRect(mx0 + 1, yL - 1.6, sl.w - 2, 1);
	glow(ctx, MX, yT + 3.5, sl.w * 0.7, sl.col, (0.08 + 0.34 * g) * a);
	ctx.globalCompositeOperation = 'source-over';
	// the lip and its bevel, a light nick or two
	ctx.fillStyle = css([210, 214, 204], 0.3);
	ctx.fillRect(x0, yL, x1 - x0, 1);
	ctx.fillStyle = css([0, 0, 0], 0.5);
	ctx.fillRect(x0, yL + 1, x1 - x0, 1.6);
	ctx.fillStyle = css([6, 7, 8]);
	ctx.fillRect(x0, yB - 0.5, x1 - x0, 2);
	rivetAt(ctx, x0 + 4, yL + 5, false);
	rivetAt(ctx, x1 - 4, yL + 5, true);
	ctx.strokeStyle = css([2, 3, 3], 0.8);
	ctx.lineWidth = 1;
	ctx.strokeRect(x0 + 0.5, yT + 0.5, x1 - x0 - 1, yB - yT - 1);
	ctx.restore();
}

/** The machine's shadow across the foundation's top face and down its front, drawn after the vat's glow so the glow does not wash it out. */
const TOPF4: [number, number][] = [[MX - SLAB_X, SLAB_F], [MX + SLAB_X, SLAB_F], [MX + SLAB_X - 26, SLAB_F - 42], [MX - SLAB_X - 26, SLAB_F - 42]];
function topShadow(ctx: Ctx, wi: number, a: number) {
	const sd = SHADOW[wi] ?? SHADOW[-1];
	const sh = shadowFor(wi);
	if (!sh) return;
	ctx.save();
	ctx.beginPath();
	for (const q of [wi === 4 ? TOPF4 : TOPF, [[MX - SLAB_X, SLAB_F], [MX + SLAB_X, SLAB_F], [MX + SLAB_X, SLAB_B], [MX - SLAB_X, SLAB_B]], [[MX - LOW_X, SLAB_B], [MX + LOW_X, SLAB_B], [MX + LOW_X, GFOOT - 6], [MX - LOW_X, GFOOT - 6]]] as [number, number][][]) {
		q.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
		ctx.closePath();
	}
	ctx.clip();
	ctx.globalAlpha = a * sd.a;
	ctx.drawImage(sh, SHD.x, SHD.y, SHD.w, SHD.h);
	ctx.restore();
}
