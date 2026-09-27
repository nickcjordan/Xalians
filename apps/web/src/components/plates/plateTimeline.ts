// A living plate's motion, played by script instead of SMIL. A plate's
// timelines are stepped by hand at the film rate (livePlate.tsx), and each step
// used to be a setCurrentTime on every layer: Chrome then resamples every SMIL
// animation in the layer, and that sampling was most of a step's cost (the
// Unbirth plate: about 1,500 animations, 8 ms a step on a fast laptop, several
// times that on a phone). Setting the same values from a precomputed table
// measured three to six times cheaper, and a value that has not changed since
// the last step (a ring held at opacity 0) is not set at all.
//
// When a plate goes in, every animation this file can play exactly is read
// into a track and its SMIL element taken out; anything it cannot (motion
// along a path, event or list timing, additive or accumulating values, several
// animations on one attribute) stays SMIL and is still stepped by
// setCurrentTime. Supported, and nothing else: <animate> of a number attribute
// or property, or of a path's `d` between values of one shape; and
// <animateTransform> (translate, scale, rotate, skewX, skewY), replacing or
// summed onto the element's own transform. Each with `values` (or from/to),
// optional keyTimes, calcMode linear, discrete or spline, one clock begin, a
// clock dur, repeatCount (a number or indefinite) and fill.
//
// The bake (scripts/plates/bake-plate.cjs) checks, against SMIL, that a baked
// plate played this way matches.

type Mode = 'linear' | 'discrete' | 'spline';
type Clock = { dur: number; begin: number; repeat: number; freeze: boolean };
type Curve = { values: number[][]; times: number[]; splines: number[][] | null; mode: Mode };
type Track = Clock &
	Curve & {
		el: SVGElement;
		/** How to write a value: a CSS property, an attribute, or a transform's part. */
		kind: 'style' | 'attr' | 'transform';
		name: string;
		/** For `d`: the text between the numbers. */
		template: string[] | null;
		/** For a transform: its function name, and whether it replaces what is under it rather than adding to it. */
		fn: string;
		replace: boolean;
		/** The value before it began and after it ended without freezing. */
		base: string | null;
		/** What was last written; undefined until the first step. */
		last?: string | null;
		anim: Element;
	};
type TransformEl = { el: SVGElement; base: string | null; parts: Track[]; last?: string | null };
export type Timeline = { tracks: Track[]; transforms: TransformEl[] };

// Presentation properties are written as inline style (where SMIL's animated value sat, above the attribute).
const STYLE_PROPS = new Set(['opacity', 'fill-opacity', 'stroke-opacity', 'stop-opacity', 'flood-opacity', 'stroke-width', 'stroke-dashoffset']);
const ATTRS = new Set(['rx', 'ry', 'r', 'cx', 'cy', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'width', 'height', 'offset', 'stdDeviation', 'dx', 'dy', 'scale', 'k1', 'k2', 'k3', 'k4', 'd']);
const TRANSFORMS = new Set(['translate', 'scale', 'rotate', 'skewX', 'skewY']);
// Attributes that change what a timing means and are not supported here.
const REFUSE = ['by', 'additive', 'accumulate', 'end', 'min', 'max', 'repeatDur', 'keyPoints', 'href', 'xlink:href'];

const NUM = /[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;

function clock(v: string | null, empty: number): number | null {
	if (v == null || v.trim() === '') return empty;
	const m = /^\s*([-+]?(?:\d+\.?\d*|\.\d+))\s*(ms|s)?\s*$/.exec(v);
	if (!m) return null;
	return Number(m[1]) / (m[2] === 'ms' ? 1000 : 1);
}

function list(v: string) {
	return v
		.split(';')
		.map((s) => s.trim())
		.filter((s) => s !== '');
}

function numbers(v: string) {
	return (v.match(NUM) || []).map(Number);
}

function readClock(a: Element): Clock | null {
	const dur = clock(a.getAttribute('dur'), NaN);
	const begin = clock(a.getAttribute('begin'), 0);
	if (dur == null || !(dur > 0) || begin == null) return null;
	const rc = a.getAttribute('repeatCount');
	const repeat = rc == null ? 1 : rc.trim() === 'indefinite' ? Infinity : Number(rc);
	if (!(repeat > 0)) return null;
	return { dur, begin, repeat, freeze: a.getAttribute('fill') === 'freeze' };
}

function readCurve(a: Element, parse: (v: string) => number[] | null): Curve | null {
	const raw = a.getAttribute('values');
	let texts: string[];
	if (raw != null) texts = list(raw);
	else {
		const from = a.getAttribute('from');
		const to = a.getAttribute('to');
		if (from == null || to == null) return null;
		texts = [from, to];
	}
	if (texts.length < 1) return null;
	const values = texts.map(parse);
	if (values.some((v) => !v) || new Set(values.map((v) => v!.length)).size !== 1) return null;
	const mode = (a.getAttribute('calcMode') || 'linear').trim();
	if (mode !== 'linear' && mode !== 'discrete' && mode !== 'spline') return null;
	const n = values.length;
	const kt = a.getAttribute('keyTimes');
	let times: number[];
	if (kt != null) {
		times = list(kt).map(Number);
		if (times.length !== n || times.some((t) => !(t >= 0 && t <= 1)) || times.some((t, i) => i > 0 && t < times[i - 1])) return null;
		if (mode !== 'discrete' && (times[0] !== 0 || times[n - 1] !== 1)) return null;
	} else if (mode === 'discrete') times = values.map((_, i) => i / n);
	else times = n === 1 ? [0] : values.map((_, i) => i / (n - 1));
	let splines: number[][] | null = null;
	if (mode === 'spline') {
		splines = list(a.getAttribute('keySplines') || '').map(numbers);
		if (splines.length !== n - 1 || splines.some((s) => s.length !== 4)) return null;
	}
	return { values: values as number[][], times, splines, mode };
}

// A cubic Bezier from (0,0) to (1,1) with control points (x1,y1), (x2,y2): y for a given x.
function bezier([x1, y1, x2, y2]: number[], x: number) {
	const cx = 3 * x1;
	const bx = 3 * (x2 - x1) - cx;
	const ax = 1 - cx - bx;
	const cy = 3 * y1;
	const by = 3 * (y2 - y1) - cy;
	const ay = 1 - cy - by;
	const fx = (t: number) => ((ax * t + bx) * t + cx) * t;
	let t = x;
	for (let i = 0; i < 8; i++) {
		const e = fx(t) - x;
		if (Math.abs(e) < 1e-6) break;
		const d = (3 * ax * t + 2 * bx) * t + cx;
		if (Math.abs(d) < 1e-6) break;
		t -= e / d;
	}
	if (t < 0 || t > 1 || Math.abs(fx(t) - x) > 1e-4) {
		let lo = 0;
		let hi = 1;
		t = x;
		for (let i = 0; i < 30; i++) {
			if (fx(t) < x) lo = t;
			else hi = t;
			t = (lo + hi) / 2;
		}
	}
	return ((ay * t + by) * t + cy) * t;
}

/** The curve's value at `p` (0 to 1 through one iteration). */
function sample(c: Curve, p: number): number[] {
	const { values, times } = c;
	const n = values.length;
	if (n === 1) return values[0];
	if (c.mode === 'discrete') {
		let i = 0;
		while (i < n - 1 && p >= times[i + 1]) i++;
		return values[i];
	}
	if (p >= 1) return values[n - 1];
	let i = 0;
	while (i < n - 2 && p >= times[i + 1]) i++;
	const span = times[i + 1] - times[i];
	let k = span > 0 ? (p - times[i]) / span : 0;
	if (c.splines) k = bezier(c.splines[i], k);
	const a = values[i];
	const b = values[i + 1];
	return a.map((v, j) => v + (b[j] - v) * k);
}

// Film frames often land exactly where an iteration ends (begins and durations in twentieths of a
// second). There a value is the next iteration's first, as the SMIL timing model has it; Chrome's own
// SMIL picks either side depending on rounding, so a piece may differ from it for that one frame.
const EDGE = 1e-7;

/** Where a track is at `seconds`: its value, or null for its base (not begun, or ended without freezing). */
function valueAt(t: Track, seconds: number): number[] | null {
	const local = seconds - t.begin;
	if (local < -EDGE) return null;
	const it = Math.max(0, local) / t.dur;
	if (it > t.repeat + EDGE) {
		if (!t.freeze) return null;
		// Frozen at the end of the last iteration (a fractional repeat stops partway).
		const frac = t.repeat % 1;
		return sample(t, frac === 0 ? 1 : frac);
	}
	let p = it - Math.floor(it);
	if (p > 1 - EDGE) p = 0;
	return sample(t, p);
}

const fmt = (v: number) => {
	const s = v.toFixed(3);
	return s.includes('.') ? s.replace(/\.?0+$/, '') : s;
};

function write(t: Track, v: number[] | null) {
	let text: string | null;
	if (v == null) text = t.base;
	else if (t.template) text = t.template.map((s, i) => (i < v.length ? s + (s === '' && i > 0 && v[i] >= 0 ? ' ' : '') + fmt(v[i]) : s)).join('');
	else text = fmt(v[0]);
	if (text === t.last) return;
	t.last = text;
	if (t.kind === 'style') {
		if (text == null) t.el.style.removeProperty(t.name);
		else t.el.style.setProperty(t.name, text);
	} else if (text == null) t.el.removeAttribute(t.name);
	else t.el.setAttribute(t.name, text);
}

/**
 * Take a mounted plate's animations that script can play exactly out of SMIL and into tracks; null when there are none.
 * Call it once the plate is in the page, before its first step.
 */
export function prepareTimeline(host: ParentNode): Timeline | null {
	const anims = [...host.querySelectorAll('animate, animateTransform, animateMotion, set')];
	// Several animations on one attribute of one element resolve by priority: leave those to SMIL.
	const per = new Map<Element, Map<string, number>>();
	const keyOf = (a: Element) => (a.tagName === 'animateTransform' ? 'transform' : a.tagName === 'animateMotion' ? 'motion' : a.getAttribute('attributeName') || '');
	for (const a of anims) {
		const el = a.parentElement;
		if (!el) continue;
		const m = per.get(el) || new Map<string, number>();
		m.set(keyOf(a), (m.get(keyOf(a)) || 0) + 1);
		per.set(el, m);
	}
	const tracks: Track[] = [];
	const transformed = new Map<SVGElement, { base: string | null; parts: { track: Track; order: number }[]; ok: boolean }>();
	anims.forEach((a, order) => {
		const el = a.parentElement as SVGElement | null;
		if (!el || a.tagName === 'animateMotion' || a.tagName === 'set') return;
		if (REFUSE.some((r) => a.hasAttribute(r) && !(r === 'additive' && a.tagName === 'animateTransform'))) return;
		const c = readClock(a);
		if (!c) return;
		if (a.tagName === 'animateTransform') {
			const fn = a.getAttribute('type') || 'translate';
			const additive = a.getAttribute('additive') || 'replace';
			if (!TRANSFORMS.has(fn) || (additive !== 'sum' && additive !== 'replace')) return;
			// A motion path on the same element composes with the transform in its own way: leave it all to SMIL.
			if (per.get(el)?.get('motion')) return;
			const curve = readCurve(a, (v) => {
				const n = numbers(v);
				return n.length ? n : null;
			});
			if (!curve) return;
			const entry = transformed.get(el) || { base: el.getAttribute('transform'), parts: [], ok: true };
			const track: Track = { ...c, ...curve, el, kind: 'transform', name: 'transform', template: null, fn, replace: additive === 'replace', base: null, anim: a };
			entry.parts.push({ track, order });
			transformed.set(el, entry);
			return;
		}
		const name = (a.getAttribute('attributeName') || '').trim();
		if ((per.get(el)?.get(name) || 0) > 1) return;
		if (!STYLE_PROPS.has(name) && !ATTRS.has(name)) return;
		let template: string[] | null = null;
		let curve: Curve | null;
		if (name === 'd') {
			// A path morph: every value must be the same path with different numbers.
			const texts = a.getAttribute('values') != null ? list(a.getAttribute('values') || '') : [a.getAttribute('from') || '', a.getAttribute('to') || ''];
			const shapes = texts.map((t) => t.split(NUM));
			if (shapes.some((s) => s.join('|') !== shapes[0].join('|'))) return;
			template = shapes[0];
			curve = readCurve(a, (v) => numbers(v));
		} else
			curve = readCurve(a, (v) => {
				const n = numbers(v);
				return n.length === 1 && /^\s*[-+\d.eE]+\s*$/.test(v) ? n : null;
			});
		if (!curve) return;
		const kind = STYLE_PROPS.has(name) ? 'style' : 'attr';
		const base = kind === 'style' ? el.style.getPropertyValue(name) || null : el.getAttribute(name);
		tracks.push({ ...c, ...curve, el, kind, name, template, fn: '', replace: true, base, anim: a });
		a.remove();
	});
	const transforms: TransformEl[] = [];
	for (const [el, entry] of transformed) {
		// Only when every transform animation on the element could be read.
		if (!entry.ok || entry.parts.length !== (per.get(el)?.get('transform') || 0)) continue;
		// Priority: the one that began later is applied last; ties in document order.
		const parts = entry.parts.sort((x, y) => x.track.begin - y.track.begin || x.order - y.order).map((p) => p.track);
		for (const p of parts) p.anim.remove();
		transforms.push({ el, base: entry.base, parts });
	}
	return tracks.length || transforms.length ? { tracks, transforms } : null;
}

/** Set every track to where it is at `seconds` on the plate's clock. Pieces culled out of the page are skipped. */
export function timelineAt(tl: Timeline, seconds: number) {
	for (const t of tl.tracks) if (t.el.isConnected) write(t, valueAt(t, seconds));
	for (const x of tl.transforms) {
		if (!x.el.isConnected) continue;
		// SMIL's sandwich: the element's own transform, then each running animation in priority order,
		// a replacing one discarding what is under it.
		let text = x.base;
		for (const p of x.parts) {
			const v = valueAt(p, seconds);
			if (!v) continue;
			const f = `${p.fn}(${v.map(fmt).join(' ')})`;
			text = p.replace || !text ? f : `${text} ${f}`;
		}
		if (text === x.last) continue;
		x.last = text;
		if (text) x.el.setAttribute('transform', text);
		else x.el.removeAttribute('transform');
	}
}

/** Whether an svg still has SMIL of its own to step. */
export function hasSmil(svg: Element) {
	return !!svg.querySelector('animate, animateTransform, animateMotion, set');
}
