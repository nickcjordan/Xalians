// Drifting sheets in a baked living plate. Rain in a plate is a pattern of
// streaks sliding one tile along, over and over, across the whole picture. As
// SVG the browser redraws every streak on every frame. The bake
// (scripts/plates/bake-plate.cjs) turns such a layer into plain boxes: each
// holds a sheet tiled with a picture of one tile, under a still mask picture,
// and the sheet only slides. Sliding a box is the compositor's work, with
// nothing redrawn. On each film frame the page sets where every sheet has got
// to on the plate's clock (`data-drift="<loop s>;<start s>;<x %>;<y %>"`: over
// one loop the sheet moves x and y percent of its own size), and the opacity of
// any box whose strength changes (`data-fade="<loop s>;<start s>;<values>;<key times>"`,
// linear, as the SVG animation it replaces).
//
// The bake runs this same file in its check page, like plateCull.ts.

type Sheet = { el: HTMLElement; dur: number; begin: number; x: number; y: number };
type Fade = { el: HTMLElement; dur: number; begin: number; values: number[]; times: number[] };
export type Drift = { sheets: Sheet[]; fades: Fade[] };

const phase = (t: number, dur: number, begin: number) => ((((t - begin) % dur) + dur) % dur) / dur;

/** Read a mounted plate's drifting sheets; null when it has none. */
export function prepareDrift(host: ParentNode): Drift | null {
	const sheets = [...host.querySelectorAll<HTMLElement>('[data-drift]')].map((el) => {
		const [dur, begin, x, y] = (el.dataset.drift || '').split(';').map(Number);
		return { el, dur, begin, x, y };
	});
	const fades = [...host.querySelectorAll<HTMLElement>('[data-fade]')].map((el) => {
		const [dur, begin, values, times] = (el.dataset.fade || '').split(';');
		return { el, dur: Number(dur), begin: Number(begin), values: values.split(',').map(Number), times: times.split(',').map(Number) };
	});
	return sheets.length || fades.length ? { sheets, fades } : null;
}

/** Set every sheet and every fading box to where it is at `seconds` on the plate's clock. */
export function driftAt(drift: Drift, seconds: number) {
	for (const s of drift.sheets) {
		const p = phase(seconds, s.dur, s.begin);
		s.el.style.transform = `translate(${(s.x * p).toFixed(4)}%, ${(s.y * p).toFixed(4)}%)`;
	}
	for (const f of drift.fades) {
		const p = phase(seconds, f.dur, f.begin);
		let i = 0;
		while (i < f.times.length - 2 && p >= f.times[i + 1]) i++;
		const span = f.times[i + 1] - f.times[i];
		const k = span > 0 ? Math.min(1, Math.max(0, (p - f.times[i]) / span)) : 0;
		const o = f.values[i] + (f.values[i + 1] - f.values[i]) * k;
		const v = o.toFixed(3);
		if (f.el.style.opacity !== v) f.el.style.opacity = v;
	}
}
