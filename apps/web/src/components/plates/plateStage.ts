// The stage for living plates: at most one plate on a page is live at a time.
//
// Each plate is a stack of layered SVGs with filters and SMIL motion, heavy
// enough that two in the DOM at once cost real memory and compositing even
// while paused. The stage keeps exactly one plate mounted, the one most in
// view; every other plate drops its SVG out of the DOM and shows its still.
// React-free, so the rule can be tested and reused by any page.

export type StageSlot = {
	/** Report how much of the plate is in view, 0 to 1. */
	update: (ratio: number) => void;
	/** Leave the stage (on unmount). */
	release: () => void;
};

type Entry = { ratio: number; onActive: (active: boolean) => void };

// A challenger takes the stage only when it is clearly more in view than the
// plate holding it, so two plates straddling the fold do not swap back and forth.
const MARGIN = 0.1;

const entries = new Map<symbol, Entry>();
let active: symbol | null = null;

function decide() {
	let best: symbol | null = null;
	let bestRatio = 0;
	entries.forEach((e, id) => {
		if (e.ratio > bestRatio) {
			best = id;
			bestRatio = e.ratio;
		}
	});
	const current = active ? entries.get(active) : undefined;
	if (current && current.ratio > 0 && best !== active && bestRatio <= current.ratio + MARGIN) return;
	if (best === active) return;
	const prev = active;
	active = best;
	if (prev) entries.get(prev)?.onActive(false);
	if (best) entries.get(best)?.onActive(true);
}

export function joinStage(onActive: (active: boolean) => void): StageSlot {
	const id = Symbol('plate');
	entries.set(id, { ratio: 0, onActive });
	return {
		update(ratio) {
			const e = entries.get(id);
			if (!e) return;
			e.ratio = ratio;
			decide();
		},
		release() {
			entries.delete(id);
			if (active === id) {
				active = null;
				decide();
			}
		},
	};
}

// Fragments are fetched once per page load and kept as text, so a plate that
// leaves the stage and comes back re-injects without another request.
const fragments = new Map<string, Promise<string>>();

// A baked plate's still parts are pictures (scripts/plates/bake-plate.cjs):
// start fetching them with the fragment, so they are decoded by the time the
// plate goes into the page rather than arriving in pieces after it.
function warmPictures(html: string) {
	if (typeof Image === 'undefined') return;
	for (const m of html.matchAll(/<image [^>]*href="([^"]+)"/g)) {
		const img = new Image();
		img.decoding = 'async';
		img.src = m[1];
	}
}

export function loadFragment(src: string): Promise<string> {
	let p = fragments.get(src);
	if (!p) {
		p = fetch(src)
			.then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
			.then((html) => {
				warmPictures(html);
				return html;
			});
		p.catch(() => fragments.delete(src));
		fragments.set(src, p);
	}
	return p;
}

/** Tests only: forget every plate and every cached fragment. */
export function resetStage() {
	entries.clear();
	active = null;
	fragments.clear();
}
