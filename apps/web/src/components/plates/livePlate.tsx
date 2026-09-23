// Tier: featured component. A living painting: an era plate built as stacked
// SVG layers with SMIL motion, served as an HTML fragment from public/ and
// injected here when it comes near the viewport. The poster (the raster
// plate) shows until the fragment lands and stays underneath it, so a
// browser that never fetches or never animates sees the finished picture.
//
// Motion discipline (docs/DESIGN_SYSTEM.md section 7, ruled exception of
// 2026-09-22): the plate's fire, smoke and water loop because they are the
// painting, not the interface. It pauses whenever it is off screen, when the
// tab is hidden, and always under reduced motion, so a page holding several
// plates only ever pays for the one in view.
import * as React from 'react';
import { cn } from '@/lib/utils';

type Props = {
	/** The fragment's URL, e.g. /assets/plates/end-wars/plate.html. */
	src: string;
	/** The raster plate shown until the fragment lands and kept beneath it. */
	poster: { src: string; small: string; alt: string };
	className?: string;
};

const NEAR = '320px';
// Every top-level svg in a plate has its own animation timeline: the layers,
// and the shared defs sheet, whose animated filters (fire, smoke, glitter) and
// clip paths would otherwise run free while the layers are paused.
const PLATE_SVGS = 'svg.layer, svg.defs';

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

export function LivePlate({ src, poster, className }: Props) {
	const hostRef = React.useRef<HTMLDivElement>(null);
	const [ready, setReady] = React.useState(false);

	// Fetch and inject once the plate is near the viewport.
	React.useEffect(() => {
		const host = hostRef.current;
		if (!host || typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return undefined;
		let cancelled = false;
		const io = new IntersectionObserver(
			(entries) => {
				if (!entries.some((e) => e.isIntersecting)) return;
				io.disconnect();
				fetch(src)
					.then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
					.then((html) => {
						if (cancelled) return;
						host.innerHTML = html;
						holdAtStart(host);
						setReady(true);
					})
					.catch(() => {
						/* the poster stays */
					});
			},
			{ rootMargin: NEAR }
		);
		io.observe(host);
		return () => {
			cancelled = true;
			io.disconnect();
		};
	}, [src]);

	// Play only while visible, only while the tab is shown, never under reduced motion.
	React.useEffect(() => {
		const host = hostRef.current;
		if (!ready || !host || typeof IntersectionObserver === 'undefined') return undefined;
		const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (reduced) {
			setPlaying(host, false);
			return undefined;
		}
		let visible = false;
		const apply = () => setPlaying(host, visible && document.visibilityState !== 'hidden');
		const io = new IntersectionObserver(
			(entries) => {
				visible = entries.some((e) => e.isIntersecting);
				apply();
			},
			{ threshold: 0.05 }
		);
		io.observe(host);
		document.addEventListener('visibilitychange', apply);
		return () => {
			io.disconnect();
			document.removeEventListener('visibilitychange', apply);
			setPlaying(host, false);
		};
	}, [ready]);

	return (
		<span className={cn('live-plate block h-full w-full', className)} data-live-plate={ready ? 'ready' : 'poster'} data-plate-src={src}>
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
