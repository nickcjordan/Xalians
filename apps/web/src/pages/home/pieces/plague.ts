// Beat 5, the Nemesis Plague (docs/design/home-story-small-pieces.md): the healthy helix turning, then a
// dark crimson haze that enters from one end and burns along it. Where it reaches, the bases flare ember
// orange and go to charcoal, the bonds break, the pieces fall away as tumbling shards with burning edges,
// the strands fray, ash sifts down; a short broken length is left, desaturated and guttering, as the haze
// thins and lingers over the ruin.
import { BACKBONE, BASES, PAIRED, type Helix, type PairLook, drawHelix, pairPoint } from './helix';
import { type Camera, type Ctx, type RGB, H, W, blot, clamp, easeOut, glow, ground, lighter, loopFade, mix, mixRGB, motes, ramp, rng, smooth, vignette } from './stage';

export const PLAGUE_LOOP = 12;

export const PAIRS = 30;
const STOP = 19.5; // where the front stops, in pairs: past it, about a turn is left whole
const FRONT_FROM = 1.7;
const FRONT_TO = 8.2;
const LET_GO = 3.2; // a pair lets go this far behind the front, as soon as it has burned

export const PLAGUE_HELIX = { pairs: PAIRS, rise: 29, radius: 100 };
const CAM0: Camera = { cx: W / 2, cy: H / 2 + 4, pitch: 0.34, roll: -0.06, dist: 1500, zoom: 1 };
/** The camera, easing a little toward what is left once the front has passed. */
export const plagueCam = (t: number): Camera => ({ ...CAM0, cx: CAM0.cx - 90 * smooth(4.5, 10, t) });

const pickRng = rng(505);
const SEQ = Array.from({ length: PAIRS }, () => Math.floor(pickRng() * 4));

const EMBER: RGB = [255, 118, 52];
const CHAR: RGB = [30, 22, 24];
const ASH: RGB = [96, 80, 80];
const HAZE_DARK: RGB = [46, 5, 14];
const HAZE_LIT: RGB = [176, 30, 46];
const GREY: RGB = [120, 124, 128];

/** Where the plague's front is at `t`, in pairs along the helix. */
export function frontAt(t: number) {
	const p = ramp(FRONT_FROM, FRONT_TO, t);
	return mix(-4, STOP, 0.6 * p + 0.4 * easeOut(p));
}

/** When the front got `u` pairs along (Infinity: it never does). */
function reached(u: number) {
	if (frontAt(FRONT_TO) < u) return Infinity;
	let lo = FRONT_FROM;
	let hi = FRONT_TO;
	for (let k = 0; k < 22; k++) {
		const m = (lo + hi) / 2;
		if (frontAt(m) < u) lo = m;
		else hi = m;
	}
	return hi;
}
// A pair lets go once the front is LET_GO past it; one it burned but never got that far past goes soon
// after the front stops, so nothing charred is left standing without its strands.
const LET_GO_AT = Array.from({ length: PAIRS }, (_, i) => {
	const past = frontAt(FRONT_TO) - i;
	return past > 1 && past < LET_GO ? FRONT_TO + 0.2 + (LET_GO - past) * 0.4 : reached(i + LET_GO);
});

// Irregular guttering, 0 to 1, stepping a dozen times a second.
const gutter = (sec: number, i: number) => {
	const v = Math.sin(Math.floor(sec * 12) * 91.7 + i * 17.3) * 43758.5453;
	return v - Math.floor(v);
};

export function plagueLook(i: number, t: number, sec: number): PairLook {
	const d = frontAt(t) - i; // pairs behind the front (negative: not reached)
	const base = BASES[SEQ[i]];
	const pair = BASES[PAIRED[SEQ[i]]];
	const heat = t > FRONT_FROM ? Math.exp(-Math.pow((d - 0.5) / 0.9, 2)) : 0;
	const fell = Math.max(0, t - LET_GO_AT[i]);
	// a piece that has let go is charcoal through, whatever it was
	const char = Math.max(smooth(0.9, 2.6, d), smooth(0, 0.35, fell));
	const split = smooth(2.2, 3.4, d);
	const fray = smooth(1.2, 3, d);
	// What is left once the front has stopped goes grey and gutters.
	const spent = d > -14 && d < LET_GO ? smooth(FRONT_TO - 0.5, FRONT_TO + 1.5, t) * (1 - smooth(-14, -3, -d) * 0.35) : 0;
	const tone = (c: RGB) => mixRGB(mixRGB(mixRGB(c, GREY, spent * 0.65), EMBER, heat), CHAR, char);
	const breathe = 0.55 + 0.12 * Math.sin(sec * 1.7 + i * 0.6);
	const weak = spent > 0.05 ? 1 - spent * (0.45 + 0.55 * gutter(sec, i)) : 1;
	return {
		a: tone(base),
		b: tone(pair),
		glow: (breathe * (1 - char) + heat * 2.2) * weak,
		flash: heat * 0.3,
		bead: mixRGB(mixRGB(BACKBONE, EMBER, heat * 0.6), CHAR, char * 0.9),
		sheen: 1 - char * 0.85,
		alpha: 1 - smooth(1.4, 2.8, fell),
		split,
		fell,
		fray,
		ember: fell > 0 ? Math.max(0, 1 - fell / 0.8) : smooth(0.5, 1.5, d),
	};
}

type Wisp = { du: number; dy: number; len: number; thick: number; ang: number; curl: number; front: boolean; lit: number };
const WISPS: Wisp[] = (() => {
	const r = rng(66);
	return Array.from({ length: 22 }, () => ({
		du: -10 + r() * 12,
		dy: (r() - 0.5) * 200,
		len: 160 + r() * 200,
		thick: 22 + r() * 30,
		ang: (r() - 0.5) * 0.7,
		curl: 0.15 + r() * 0.35,
		front: r() < 0.35,
		lit: r(),
	}));
})();

type Flake = { x: number; y0: number; speed: number; sway: number; size: number };
const ASHES: Flake[] = (() => {
	const r = rng(77);
	return Array.from({ length: 120 }, () => ({ x: r(), y0: r(), speed: 22 + r() * 46, sway: r() * Math.PI * 2, size: 0.7 + r() * 1.7 }));
})();

export function drawPlague(ctx: Ctx, t: number, sec: number) {
	const cam = plagueCam(t);
	const haze = smooth(FRONT_FROM - 0.6, FRONT_FROM + 0.8, t) * (1 - 0.65 * smooth(FRONT_TO, FRONT_TO + 2.4, t));
	ground(ctx, { tint: [7, 9, 12], pool: mixRGB([24, 56, 72], [70, 14, 24], haze * 0.7), poolR: W * 0.62 });
	motes(ctx, sec, [150, 186, 204], 'back', 0.8);
	const h: Helix = { ...PLAGUE_HELIX, phase: 0.33 * sec, center: { x: 0, y: 0, z: 0 }, scale: 1, haze: mixRGB([12, 18, 22], [30, 8, 12], haze) };
	const front = frontAt(t);
	const fp = pairPoint(cam, h, clamp(front, 0, PAIRS - 1));
	const endX = (u: number) => pairPoint(cam, h, clamp(u, 0, PAIRS - 1)).x + (u < 0 ? u * 29 : 0);

	// The haze: long wisps round the front, lingering thinner over what it has passed.
	const wisps = (front_: boolean) => {
		if (haze <= 0.01) return;
		for (const w of WISPS) {
			if (w.front !== front_) continue;
			const u = front + w.du;
			if (u < -5) continue;
			const trail = w.du < -2 ? 0.35 + 0.65 * Math.exp((w.du + 2) / 3) : 1;
			const lead = 1 - smooth(0.3, 2, w.du);
			const a = haze * trail * lead * (front_ ? 0.4 : 1);
			if (a <= 0.01) continue;
			const x = endX(u) + Math.sin(sec * 0.4 + w.curl * 9) * 18;
			const y = fp.y + w.dy + Math.cos(sec * 0.5 + w.curl * 7) * 10;
			blot(ctx, x, y, w.len, w.thick * 1.4, w.ang + Math.sin(sec * w.curl) * 0.25, HAZE_DARK, Math.min(1, 1.5 * a));
			blot(ctx, x + w.len * 0.3, y - w.thick * 0.3, w.len * 0.5, w.thick * 0.6, w.ang, HAZE_DARK, Math.min(1, 1.2 * a));
			if (w.lit > 0.5) glow(ctx, x, y, w.thick * 1.6, HAZE_LIT, 0.14 * a * (0.6 + 0.4 * Math.sin(sec * 2.3 + w.curl * 11)));
		}
	};
	wisps(false);
	drawHelix(ctx, cam, h, (i) => plagueLook(i, t, sec));
	wisps(true);

	// Embers at the front, and ash sifting down, thickest just behind it.
	if (haze > 0.01 && t < FRONT_TO + 0.4) {
		const r = rng(Math.floor(sec * 20));
		for (let k = 0; k < 9; k++) glow(ctx, fp.x + (r() - 0.6) * 70, fp.y + (r() - 0.5) * 150, 3 + r() * 7, EMBER, 0.6 * haze * r(), 'core');
		glow(ctx, fp.x, fp.y, 150, HAZE_LIT, 0.16 * haze);
	}
	if (front > -2 && t > FRONT_FROM + 0.8) {
		const x1 = endX(front - 1);
		const x0 = endX(-2);
		lighter(ctx, () => {
			for (const f of ASHES) {
				const x = x1 - f.x * f.x * (x1 - x0) + 10 * Math.sin(sec * 0.8 + f.sway);
				const y = (f.y0 * H + sec * f.speed) % H;
				const a = smooth(FRONT_FROM + 0.8, FRONT_FROM + 2.4, t) * 0.6 * (1 - 0.5 * f.x);
				glow(ctx, x, y, f.size * 1.6, [160, 136, 130], a * 0.6, 'core');
			}
		});
	}
	// Ash shed by each piece as it falls, slower than the pieces and drifting.
	lighter(ctx, () => {
	for (let i = 0; i < PAIRS; i++) {
		const fell = t - LET_GO_AT[i];
		if (!(fell > 0) || fell > 3.5) continue;
		const at = pairPoint(cam, h, i);
		const r = rng(900 + i);
		for (let k = 0; k < 5; k++) {
			const vx = (r() - 0.5) * 30;
			const vy = 30 + r() * 50;
			const x = at.x + (r() - 0.5) * 60 + vx * fell + 8 * Math.sin(sec * 1.3 + k);
			const y = at.y + (r() - 0.5) * 120 + vy * fell;
			const a = (1 - fell / 3.5) * (0.4 + 0.6 * r());
			glow(ctx, x, y, 2.4, [150, 128, 124], 0.5 * a, 'core');
			if (fell < 0.9 && k % 3 === 0) glow(ctx, x, y, 3, EMBER, 0.6 * (1 - fell / 0.9), 'core');
		}
	}
	});
	motes(ctx, sec, [170, 196, 210], 'front', 0.7);
	vignette(ctx, 0.8);
	const fade = loopFade(t, PLAGUE_LOOP);
	if (fade < 1) {
		ctx.globalCompositeOperation = 'source-over';
		ctx.fillStyle = `rgba(0,0,0,${(1 - fade).toFixed(3)})`;
		ctx.fillRect(0, 0, W, H);
	}
}
