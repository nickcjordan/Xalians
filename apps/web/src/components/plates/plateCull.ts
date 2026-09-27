// Culling for a baked living plate. Most of a plate's moving pieces are
// invisible most of the time: a rain splash shows for a fifth of a second in
// every two, a seed for a third of its drift down the flood. The browser still
// resamples, restyles and lays out every one of them on every frame, so the
// bake (scripts/plates/bake-plate.cjs) steps through each piece's own loop at
// the film rate, records the frames in which it shows at all, and marks it
// `data-cull="<loop in frames>:<from>-<to>,..."`. While the plate plays, a
// piece is in the page only during those frames and out of it otherwise, with
// a placeholder holding its place in the stack. Its animations are timed from
// the plate's clock, so a piece put back is sampled at the right moment. The
// bake checks, by pixels, that the culled plate matches the uncut one.
//
// The bake runs this same file in its check page (bundled by esbuild), so the
// page and the check cannot disagree about what is shown when.

type Entry = { el: Element; mark: Comment; period: number; spans: number[]; on: boolean };
export type Cull = { fps: number; entries: Entry[] };

/** Read a mounted plate's culling marks; null when it has none. */
export function prepareCull(host: ParentNode): Cull | null {
	const fps = Number(host.querySelector('svg.defs')?.getAttribute('data-cull-fps'));
	if (!fps) return null;
	const entries = [...host.querySelectorAll('[data-cull]')].map((el) => {
		const [period, spans = ''] = (el.getAttribute('data-cull') || '').split(':');
		return {
			el,
			mark: el.ownerDocument.createComment(''),
			period: Number(period),
			spans: spans ? spans.split(',').flatMap((s) => s.split('-').map(Number)) : [],
			on: true,
		};
	});
	return { fps, entries };
}

/** Put in the page exactly the pieces that show at `seconds` on the plate's clock, and take out the rest. */
export function cullAt(cull: Cull, seconds: number) {
	const n = Math.round(seconds * cull.fps);
	for (const e of cull.entries) {
		const k = ((n % e.period) + e.period) % e.period;
		let want = false;
		for (let i = 0; i < e.spans.length; i += 2)
			if (k >= e.spans[i] && k < e.spans[i + 1]) {
				want = true;
				break;
			}
		if (want === e.on) continue;
		if (want) e.mark.replaceWith(e.el);
		else e.el.replaceWith(e.mark);
		e.on = want;
	}
}
