// The genome helix both helix pieces draw (docs/design/home-story-small-pieces.md, section 3): a double
// helix with a major and a minor groove, ten base pairs a turn, its backbones chains of glossy beads joined
// by tubes, its base pairs two glowing slabs meeting at a bond. Every part is placed in 3D, projected, and
// drawn back to front, the far side smaller, dimmer and hazed into the chamber. Its axis can curl into a
// ring (the token's coil). A piece says how each base pair looks at a moment (color, glow, broken, falling,
// charred); this file only draws it.
import { type Camera, type Ctx, type P3, type Proj, type RGB, clamp, css, glow, lighter, mix, mixRGB, project, scaleRGB, sphere } from './stage';

export type Helix = {
	/** Base pairs. */
	pairs: number;
	/** Axial distance between pairs, and the radius, in stage units. */
	rise: number;
	radius: number;
	/** Turn of the whole helix about its axis, radians. */
	phase: number;
	/** Where its middle sits, and how much of its size it keeps (1: all). */
	center: P3;
	scale: number;
	/** 0: a straight axis; 1: the axis curled into a ring facing the viewer. */
	curl?: number;
	/** The chamber's color, which the far side fades toward. */
	haze?: RGB;
	/** 0: full weight; 1: fine, its beads and slabs slimmed (coiled tight, it reads as a ring of light). */
	thin?: number;
};

export type PairLook = {
	a: RGB;
	b: RGB;
	/** How brightly the bases glow, 0 to 1 (more flares). */
	glow: number;
	/** The backbone's color here, and its sheen, 0 to 1. */
	bead: RGB;
	sheen: number;
	/** Presence, 0 to 1. */
	alpha: number;
	/** The bond: 0 whole, 1 the two halves pulled well apart. */
	split?: number;
	/** Seconds since this pair let go and began to fall; 0 or less: in place. */
	fell?: number;
	/** How ragged the backbone is here, 0 to 1. */
	fray?: number;
	/** Where it still has to travel to reach its place, in stage units. */
	away?: P3;
	/** A white flash over its bases, 0 to 1. */
	flash?: number;
	/** A burning edge on its pieces, 0 to 1. */
	ember?: number;
};

// The two backbones sit this far apart around the axis: the grooves.
const GROOVE = (145 * Math.PI) / 180;
const PER_TURN = 10;
const SUB = 3; // tube pieces between one pair and the next
const EMBER: RGB = [255, 120, 60];

// Each falling piece's own drift, spin and speed.
const FALL: [number, number, number, number][] = (() => {
	let a = 99;
	const r = () => {
		a = (a * 16807) % 2147483647;
		return a / 2147483647;
	};
	return Array.from({ length: 1024 }, () => [r() * 2 - 1, r() * 2 - 1, 0.6 + r() * 0.8, r() * 2 - 1]);
})();

// A part to draw: its solid body, and the light it gives off, which is added in one pass after every body.
type Prim = { z: number; draw: () => void; light?: () => void };

const add = (p: P3, d: P3): P3 => ({ x: p.x + d.x, y: p.y + d.y, z: p.z + d.z });

/** A point on one backbone, `u` pairs along (fractions between pairs allowed). */
export function strandPoint(h: Helix, u: number, strand: 0 | 1, radiusK = 1): P3 {
	const ang = h.phase + (u * Math.PI * 2) / PER_TURN + (strand ? GROOVE : 0);
	const curl = clamp(h.curl ?? 0);
	const n = h.pairs - 1;
	// straight: along x; curled: round a ring in the view plane
	const ax = (u - n / 2) * h.rise;
	const ringR = (n * h.rise) / (Math.PI * 2 * 0.94);
	const psi = (u / n) * Math.PI * 2 * 0.94 - Math.PI / 2 - Math.PI * 0.94;
	const axis = { x: mix(ax, Math.cos(psi) * ringR, curl), y: mix(0, Math.sin(psi) * ringR, curl) };
	// the cross-section's upward direction: y when straight, outward from the ring when curled
	let nx = mix(0, Math.cos(psi), curl);
	let ny = mix(1, Math.sin(psi), curl);
	const l = Math.hypot(nx, ny) || 1;
	nx /= l;
	ny /= l;
	const r = h.radius * radiusK;
	const c = Math.cos(ang) * r;
	return { x: h.center.x + (axis.x + nx * c) * h.scale, y: h.center.y + (axis.y + ny * c) * h.scale, z: h.center.z + Math.sin(ang) * r * h.scale };
}

/** A falling piece `k`, `sec` seconds in: an offset in 3D and a spin, radians. */
function fallOf(k: number, sec: number) {
	if (!(sec > 0)) return { d: { x: 0, y: 0, z: 0 }, spin: 0 };
	const [dx, dz, speed, spin] = FALL[k % FALL.length];
	return { d: { x: dx * 26 * sec, y: -0.5 * 260 * speed * sec * sec, z: dz * 34 * sec }, spin: spin * 3 * sec };
}

/** Turn projected point `p` about `c` by `a` radians. */
function turn(p: Proj, c: { x: number; y: number }, a: number): Proj {
	if (!a) return p;
	const s = Math.sin(a);
	const k = Math.cos(a);
	const x = p.x - c.x;
	const y = p.y - c.y;
	return { ...p, x: c.x + x * k - y * s, y: c.y + x * s + y * k };
}

// Deterministic noise, 0 to 1.
const noise = (i: number, j: number) => {
	const v = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453;
	return v - Math.floor(v);
};

export function drawHelix(ctx: Ctx, cam: Camera, h: Helix, look: (i: number) => PairLook) {
	const prims: Prim[] = [];
	const sc = h.scale;
	const haze = h.haze ?? [10, 14, 18];
	// Depth, -1 far to 1 near, from a point's z.
	const depthOf = (z: number) => clamp((z - h.center.z) / (h.radius * sc || 1), -1, 1);
	const shade = (c: RGB, dn: number) => {
		const near = (dn + 1) / 2;
		return mixRGB(scaleRGB(c, 0.22 + 0.78 * Math.pow(near, 1.1)), haze, 0.45 * (1 - near));
	};
	const sizeK = (dn: number) => 0.74 + 0.36 * ((dn + 1) / 2);
	const thin = clamp(h.thin ?? 0);

	for (let i = 0; i < h.pairs; i++) {
		const L = look(i);
		if (L.alpha <= 0.004) continue;
		const fell = L.fell ?? 0;
		const away = L.away ?? { x: 0, y: 0, z: 0 };
		const split = clamp(L.split ?? 0);
		const fray = clamp(L.fray ?? 0);
		const flash = clamp(L.flash ?? 0);
		const ember = clamp(L.ember ?? 0);
		const A0 = add(strandPoint(h, i, 0), away);
		const B0 = add(strandPoint(h, i, 1), away);

		// The base pair: two slabs meeting at the bond. Broken, each half falls on its own.
		const midW = { x: (A0.x + B0.x) / 2, y: (A0.y + B0.y) / 2, z: (A0.z + B0.z) / 2 };
		for (const half of [0, 1] as const) {
			const P0 = half ? B0 : A0;
			// the half's inner end, short of the middle by the bond's gap, pulled back as it breaks
			const gap = 0.04 + 0.34 * split;
			const E0 = { x: mix(P0.x, midW.x, 1 - gap), y: mix(P0.y, midW.y, 1 - gap) - split * 8, z: mix(P0.z, midW.z, 1 - gap) };
			// Falling, a half breaks into two uneven shards, each on its own way down.
			const cut = 0.38 + 0.24 * noise(i, half + 5);
			const M0 = { x: mix(P0.x, E0.x, cut), y: mix(P0.y, E0.y, cut) + (noise(i, half) - 0.5) * 6, z: mix(P0.z, E0.z, cut) };
			const pieces: [P3, P3, number][] = fell > 0 ? [[P0, M0, i * 5 + half], [M0, E0, 600 + i * 5 + half]] : [[P0, E0, i * 5 + half]];
			const dn = depthOf((P0.z + E0.z) / 2);
			const color = half ? L.b : L.a;
			const lit = shade(mixRGB(color, [255, 255, 255], flash * 0.8), dn);
			for (const [S0, T0, key] of pieces) {
				const f = fallOf(key, fell);
				const P = project(cam, add(S0, f.d));
				const E = project(cam, add(T0, f.d));
				const c = { x: (P.x + E.x) / 2, y: (P.y + E.y) / 2 };
				const p = turn(P, c, f.spin);
				const e = turn(E, c, f.spin);
				const w = 12 * sc * ((p.s + e.s) / 2) * sizeK(dn) * (1 - 0.45 * thin);
				const broken = fell > 0;
				prims.push({
					z: (p.z + e.z) / 2,
					draw: () => {
						ctx.globalAlpha = L.alpha;
						ctx.lineCap = broken ? 'butt' : 'round';
						ctx.strokeStyle = css(scaleRGB(lit, 0.5));
						ctx.lineWidth = w;
						ctx.beginPath();
						ctx.moveTo(p.x, p.y);
						ctx.lineTo(e.x, e.y);
						ctx.stroke();
						// the light it gives off: a bright core (the far side, dim and hazed, does without)
						if (dn > -0.4) {
							ctx.strokeStyle = css(mixRGB(lit, [255, 255, 255], 0.28 + 0.2 * L.glow));
							ctx.lineWidth = w * 0.42;
							ctx.beginPath();
							ctx.moveTo(p.x, p.y);
							ctx.lineTo(e.x, e.y);
							ctx.stroke();
						}
						ctx.lineCap = 'round';
						ctx.globalAlpha = 1;
					},
					light: () => {
						const near = (dn + 1) / 2;
						const g = L.glow * (0.35 + 0.65 * near) + flash;
						if (g > 0.02) glow(ctx, c.x, c.y, w * 3.4 * (1 + flash * 0.5), color, 0.42 * g * L.alpha);
						if (ember > 0.02) {
							glow(ctx, e.x, e.y, w * 1.4, EMBER, 0.85 * ember * L.alpha, 'core');
							if (broken) glow(ctx, p.x, p.y, w * 1.1, EMBER, 0.7 * ember * L.alpha, 'core');
						}
					},
				});
			}
		}
		if (flash > 0.02) {
			const m = project(cam, midW);
			prims.push({ z: m.z + 2, draw: () => {}, light: () => glow(ctx, m.x, m.y, 26 * sc * m.s, [255, 255, 255], 0.55 * flash * L.alpha, 'core') });
		}

		// The backbones: a bead at the pair, and the tube to the next pair, falling in shards.
		for (const strand of [0, 1] as const) {
			const P0 = strand ? B0 : A0;
			const fb = fallOf(i * 5 + 2 + strand, fell);
			const pp = project(cam, add(P0, fb.d));
			const dn = depthOf(P0.z);
			const bead = shade(L.bead, dn);
			const r = 8.6 * sc * pp.s * sizeK(dn) * (1 - 0.65 * thin);
			prims.push({
				z: pp.z + 0.5,
				draw: () => sphere(ctx, pp.x, pp.y, r, bead, L.alpha, 0.35 + 0.65 * L.sheen),
				light: ember > 0.02 ? () => glow(ctx, pp.x, pp.y, r * 1.8, EMBER, 0.5 * ember * L.alpha) : undefined,
			});
			if (i === h.pairs - 1) continue;
			for (let k = 0; k < SUB; k++) {
				// A frayed strand has gaps.
				if (fray > 0.35 && noise(i * SUB + k, strand * 3) > 1.25 - fray) continue;
				const u0 = i + k / SUB;
				const u1 = i + (k + 1) / SUB;
				let Q0 = add(strandPoint(h, u0, strand), away);
				let Q1 = add(strandPoint(h, u1, strand), away);
				if (fray > 0) {
					const j0 = (noise(i * SUB + k, strand) - 0.5) * 18 * fray;
					const j1 = (noise(i * SUB + k + 1, strand) - 0.5) * 18 * fray;
					Q0 = add(Q0, { x: 0, y: j0, z: j0 * 0.6 });
					Q1 = add(Q1, { x: 0, y: j1, z: j1 * 0.6 });
				}
				const fs = fallOf(i * 5 + 11 + strand * SUB + k, fell);
				const a0 = project(cam, add(Q0, fs.d));
				const b0 = project(cam, add(Q1, fs.d));
				const cm = { x: (a0.x + b0.x) / 2, y: (a0.y + b0.y) / 2 };
				const a = turn(a0, cm, fs.spin);
				const b = turn(b0, cm, fs.spin);
				const dq = depthOf((Q0.z + Q1.z) / 2);
				const tube = shade(L.bead, dq);
				const tw = 7.4 * sc * ((a.s + b.s) / 2) * sizeK(dq) * (1 - 0.5 * thin);
				prims.push({
					z: (a.z + b.z) / 2,
					draw: () => {
						ctx.globalAlpha = L.alpha;
						ctx.lineCap = 'round';
						ctx.strokeStyle = css(scaleRGB(tube, 0.62));
						ctx.lineWidth = tw;
						ctx.beginPath();
						ctx.moveTo(a.x, a.y);
						ctx.lineTo(b.x, b.y);
						ctx.stroke();
						if (dq > -0.3) {
							ctx.strokeStyle = css(mixRGB(tube, [255, 255, 255], 0.35), 0.55 * L.sheen);
							ctx.lineWidth = tw * 0.3;
							ctx.beginPath();
							ctx.moveTo(a.x, a.y - tw * 0.22);
							ctx.lineTo(b.x, b.y - tw * 0.22);
							ctx.stroke();
						}
						ctx.globalAlpha = 1;
					},
				});
			}
		}
	}
	prims.sort((p, q) => p.z - q.z);
	for (const p of prims) p.draw();
	ctx.globalAlpha = 1;
	lighter(ctx, () => {
		for (const p of prims) p.light?.();
	});
}

/** Where pair `i` sits on the stage (for effects placed along the helix). */
export function pairPoint(cam: Camera, h: Helix, i: number): Proj {
	const A = strandPoint(h, i, 0);
	const B = strandPoint(h, i, 1);
	return project(cam, { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2, z: (A.z + B.z) / 2 });
}

/**
 * The four bases and the pairs they make, as art colors (lore art keeps its own palette): one cool,
 * luminous family, so the molecule reads as living light rather than a model kit.
 */
export const BASES: RGB[] = [
	[84, 206, 190], // sea green
	[206, 196, 128], // pale gold
	[112, 164, 236], // blue
	[172, 144, 232], // lavender
];
export const PAIRED = [1, 0, 3, 2];
export const BACKBONE: RGB = [150, 188, 204];
