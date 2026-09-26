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
import * as React from 'react';
import { cn } from '@/lib/utils';
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
function playFilm(host: HTMLElement, from: number): () => number {
	const svgs = plateSvgs(host);
	svgs.forEach((svg) => svg.pauseAnimations());
	const step = 1 / FILM_FPS;
	let at = from;
	let last = -1;
	let frame = 0;
	const tick = (now: number) => {
		frame = window.requestAnimationFrame(tick);
		if (last < 0) last = now;
		const n = Math.floor((now - last) / 1000 / step);
		if (n < 1) return;
		// A long stall (a busy main thread) skips ahead at most a few frames, never a jump.
		at += Math.min(n, 3) * step;
		last += n * step * 1000;
		svgs.forEach((svg) => svg.setCurrentTime?.(at));
	};
	frame = window.requestAnimationFrame(tick);
	return () => {
		window.cancelAnimationFrame(frame);
		return at;
	};
}

// A freshly injected plate is paused before its timeline has ever been
// sampled, which leaves every animated element at its authored resting value
// (most are opacity 0) instead of the frame the plate was composed for. Seeking
// to zero while paused forces that first sample, so the reduced-motion still
// and the first frame before play are the plate's real t=0.
function holdAtStart(host: HTMLElement) {
	host.querySelectorAll<SVGSVGElement>(PLATE_SVGS).forEach((svg) => {
		if (typeof svg.pauseAnimations !== 'function') return;
		svg.pauseAnimations();
		if (typeof svg.setCurrentTime === 'function') svg.setCurrentTime(0);
	});
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
