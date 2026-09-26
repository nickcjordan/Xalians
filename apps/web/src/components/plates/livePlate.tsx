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

function setPlaying(host: HTMLElement, playing: boolean) {
	host.querySelectorAll<SVGSVGElement>(PLATE_SVGS).forEach((svg) => {
		if (typeof svg.pauseAnimations !== 'function') return;
		if (playing) svg.unpauseAnimations();
		else svg.pauseAnimations();
	});
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
		setPlaying(host, false);
		host.innerHTML = '';
	}, [mounted]);

	// Mount the SVG while live or primed; take it out of the DOM entirely when neither.
	React.useEffect(() => {
		const host = hostRef.current;
		if (!host) return undefined;
		if (!mounted) {
			setPlaying(host, false);
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

	// The live plate plays while the tab is shown, never under reduced motion; a primed one holds.
	React.useEffect(() => {
		const host = hostRef.current;
		if (!ready || !host || !live) return undefined;
		const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (reduced) return undefined;
		const apply = () => setPlaying(host, document.visibilityState !== 'hidden');
		apply();
		document.addEventListener('visibilitychange', apply);
		return () => {
			document.removeEventListener('visibilitychange', apply);
			setPlaying(host, false);
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
