// Tier: featured component. A living painting: an era plate built as stacked
// SVG layers with SMIL motion, served as an HTML fragment from public/ and
// injected here while this plate holds the page's stage. The poster (a still
// of the plate's own first frame) shows whenever the plate is not live and
// stays underneath it, so a browser that never fetches or never animates sees
// the finished picture.
//
// One plate at a time: only the live plate keeps its SVG in the DOM. Every
// other plate drops its SVG entirely and shows its still, so a page of plates
// only ever pays for one. A page that presents its plates one scene at a time
// (the home story's stage) says which plate is live through `active`; left
// out, the plate joins the page's stage (plateStage.ts), where the plate most
// in view is live.
//
// Motion discipline (docs/DESIGN_SYSTEM.md section 7, ruled exception of
// 2026-09-22): the plate's fire, smoke and water loop because they are the
// painting, not the interface. The live plate pauses when the tab is hidden,
// and always under reduced motion, where it holds its composed first frame.
//
// Film rate (2026-09-26): a plate plays at FILM_FPS, not the screen's rate.
// Its timelines stay paused and are stepped forward by hand, so the browser
// redraws the plate's moving layers a third as often. Every redraw of a
// filtered SVG layer is costly on the graphics chip; at the screen's rate the
// Unbirth plate kept it fully busy, which is what made the whole page jumpy
// around it. The recordings are archive footage, and a lower frame rate suits them.
// A device that cannot keep up plays at half the rate. A baked plate also keeps
// its hidden pieces out of the page (plateCull.ts), and its rain slides as whole
// sheets rather than being redrawn (plateDrift.ts).
import * as React from 'react';
import { cn } from '@/lib/utils';
import { cullAt, prepareCull, type Cull } from './plateCull';
import { driftAt, prepareDrift, type Drift } from './plateDrift';
import { joinStage, loadFragment } from './plateStage';

type Props = {
	/** The fragment's URL, e.g. /assets/plates/end-wars/plate.html. */
	src: string;
	/** The still shown whenever the plate is not live, and beneath it while it is. */
	poster: { src: string; small: string; alt: string };
	/** Controlled: whether this plate is the live one. Left out, the plate most in view is live. */
	active?: boolean;
	/**
	 * Controlled: mount the plate's SVG now, held at its first frame, so that
	 * going live later only starts it. Injecting a plate is the costliest thing
	 * it does (a parse and a first style of every layer); a page that has a
	 * moment to hide it in, such as the story's archive screen tuning in under
	 * static, primes the plate then.
	 */
	primed?: boolean;
	className?: string;
};

// Start fetching a plate's fragment a little before it scrolls into view.
const NEAR = '600px';
// Every top-level svg in a plate has its own animation timeline: the layers,
// and the shared defs sheet, whose animated filters (fire, smoke, glitter) and
// clip paths would otherwise run free while the layers are paused.
const PLATE_SVGS = 'svg.layer, svg.defs';
const THRESHOLDS = Array.from({ length: 21 }, (_, i) => i / 20);
/** Frames a second a live plate plays at. */
export const FILM_FPS = 20;

function plateSvgs(host: HTMLElement) {
	return [...host.querySelectorAll<SVGSVGElement>(PLATE_SVGS)].filter((svg) => typeof svg.pauseAnimations === 'function');
}

/**
 * Play a mounted plate at the film rate: each of its timelines stays paused
 * and is set to the next frame's time FILM_FPS times a second. Starts from
 * `from` seconds; returns a stop that gives back where it got to.
 */
// The culling marks and drifting sheets of each mounted plate (plateCull.ts, plateDrift.ts), read once when it goes in.
const culls = new WeakMap<HTMLElement, Cull | null>();
const drifts = new WeakMap<HTMLElement, Drift | null>();

/** Show a mounted plate at `seconds`: only the pieces that show then are in the page, and every timeline is there. */
function seek(host: HTMLElement, svgs: SVGSVGElement[], seconds: number) {
	const cull = culls.get(host);
	if (cull) cullAt(cull, seconds);
	const drift = drifts.get(host);
	if (drift) driftAt(drift, seconds);
	svgs.forEach((svg) => svg.setCurrentTime?.(seconds));
}

// A device that cannot keep up plays every other frame instead (half the
// film rate, still on the frames the bake measured). Once a device has shown
// it is too slow, every plate after plays at the lower rate for the visit.
let stride = 1;
// How a device is judged: over two seconds of play, after the first second
// (when the plate's pictures are still being decoded and first drawn, which
// is slow everywhere). Not keeping up is a step arriving more than half an
// interval late, too often, or the step itself (the plate's own work in
// script, before any drawing) costing too much.
const WARM_MS = 1000;
const JUDGE_MS = 2000;
const LATE_SHARE = 0.3;
const STEP_BUDGET_MS = 10;

function playFilm(host: HTMLElement, from: number): () => number {
	const svgs = plateSvgs(host);
	svgs.forEach((svg) => svg.pauseAnimations());
	// Whole frames, so the clock lands exactly on the frames the bake measured.
	let n = Math.round(from * FILM_FPS);
	let last = -1;
	let frame = 0;
	let steps = 0;
	let late = 0;
	let cost = 0;
	let started = -1;
	host.dataset.filmFps = String(FILM_FPS / stride);
	const tick = (now: number) => {
		frame = window.requestAnimationFrame(tick);
		if (last < 0) last = started = now;
		const interval = (1000 * stride) / FILM_FPS;
		const elapsed = now - last;
		const due = Math.floor(elapsed / interval);
		if (due < 1) return;
		// A long stall (a busy main thread) skips ahead at most a few frames, never a jump.
		n = n - (n % stride) + Math.min(due, 3) * stride;
		last += due * interval;
		const t0 = performance.now();
		seek(host, svgs, n / FILM_FPS);
		if (stride > 1 || now - started < WARM_MS) return;
		cost += performance.now() - t0;
		if (elapsed > interval * 1.5) late++;
		steps++;
		if (now - started < WARM_MS + JUDGE_MS) return;
		if (late > steps * LATE_SHARE || cost / steps > STEP_BUDGET_MS) {
			stride = 2;
			host.dataset.filmFps = String(FILM_FPS / stride);
		}
		started = now - WARM_MS; // judge the next two seconds afresh
		steps = late = cost = 0;
	};
	frame = window.requestAnimationFrame(tick);
	return () => {
		window.cancelAnimationFrame(frame);
		return n / FILM_FPS;
	};
}

// A freshly injected plate is paused before its timeline has ever been
// sampled, which leaves every animated element at its authored resting value
// (most are opacity 0) instead of the frame the plate was composed for. Seeking
// to zero while paused forces that first sample, so the reduced-motion still
// and the first frame before play are the plate's real t=0.
function holdAtStart(host: HTMLElement) {
	culls.set(host, prepareCull(host));
	drifts.set(host, prepareDrift(host));
	const svgs = plateSvgs(host);
	svgs.forEach((svg) => svg.pauseAnimations());
	seek(host, svgs, 0);
}

export function LivePlate({ src, poster, active, primed = false, className }: Props) {
	const hostRef = React.useRef<HTMLDivElement>(null);
	const controlled = active !== undefined;
	const [staged, setStaged] = React.useState(false);
	const live = controlled ? active : staged;
	const mounted = live || (controlled && primed);
	const [ready, setReady] = React.useState(false);

	// Join the stage: report how much of this plate is in view; the stage says when it is live.
	React.useEffect(() => {
		const host = hostRef.current;
		if (controlled || !host || typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return undefined;
		const slot = joinStage(setStaged);
		const seen = new IntersectionObserver((entries) => entries.forEach((e) => slot.update(e.isIntersecting ? e.intersectionRatio : 0)), { threshold: THRESHOLDS });
		const near = new IntersectionObserver(
			(entries) => {
				if (!entries.some((e) => e.isIntersecting)) return;
				near.disconnect();
				loadFragment(src).catch(() => {
					/* the poster stays */
				});
			},
			{ rootMargin: NEAR }
		);
		seen.observe(host);
		near.observe(host);
		return () => {
			seen.disconnect();
			near.disconnect();
			slot.release();
		};
	}, [src, controlled]);

	// Out of the DOM before the browser restyles: a plate leaving the stage is
	// often under a change of state (a beat going inert and hidden), and with
	// its thousands of elements still in place that restyle was the costliest
	// frame of a change (measured 2026-09-26).
	React.useLayoutEffect(() => {
		const host = hostRef.current;
		if (mounted || !host || !host.firstChild) return;
		host.innerHTML = '';
	}, [mounted]);

	// Mount the SVG while live or primed; take it out of the DOM entirely when neither.
	React.useEffect(() => {
		const host = hostRef.current;
		if (!host) return undefined;
		if (!mounted) {
			host.innerHTML = '';
			setReady(false);
			return undefined;
		}
		let cancelled = false;
		loadFragment(src)
			.then((html) => {
				if (cancelled) return;
				host.innerHTML = html;
				holdAtStart(host);
				setReady(true);
			})
			.catch(() => {
				/* the poster stays */
			});
		return () => {
			cancelled = true;
		};
	}, [mounted, src]);

	// Where the plate's clock has got to, so a pause resumes rather than restarts; a fresh mount starts at zero.
	const clock = React.useRef(0);
	React.useEffect(() => {
		if (!mounted) clock.current = 0;
	}, [mounted]);

	// The live plate plays at the film rate while the tab is shown, never under reduced motion; a primed one holds.
	React.useEffect(() => {
		const host = hostRef.current;
		if (!ready || !host || !live) return undefined;
		const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (reduced) return undefined;
		let stop: (() => number) | null = null;
		const apply = () => {
			if (document.visibilityState === 'hidden') {
				if (stop) clock.current = stop();
				stop = null;
			} else if (!stop) stop = playFilm(host, clock.current);
		};
		apply();
		document.addEventListener('visibilitychange', apply);
		return () => {
			document.removeEventListener('visibilitychange', apply);
			if (stop) clock.current = stop();
		};
	}, [ready, live]);

	return (
		<span className={cn('live-plate block h-full w-full', className)} data-live-plate={ready ? (live ? 'ready' : 'primed') : 'poster'} data-plate-src={src}>
			<img
				src={poster.src}
				srcSet={`${poster.small} 768w, ${poster.src} 1536w`}
				sizes="(min-width: 1000px) 1160px, 100vw"
				alt={poster.alt}
				width={1536}
				height={768}
				loading="lazy"
				decoding="async"
				className="h-full w-full object-cover"
			/>
			<div ref={hostRef} className="live-plate-host" aria-hidden={!ready} />
		</span>
	);
}
