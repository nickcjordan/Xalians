// Tier: featured component. The sky behind the home hero.
import * as React from 'react';

/**
 * The starfield is fixed to the viewport so it holds still while the page
 * scrolls over it (anchoring it to the hero made it slide away, which read
 * as the sky moving). Fixed alone would leave it behind the reading sections
 * and the footer, so this fades it out over the first screen of scrolling:
 * full strength at the top, gone by the time the hero has left. Written to
 * the starfield's own opacity, and only when it changes: a custom property on
 * <html> made every element on the page restyle on every scroll frame
 * (measured 2026-09-26), and past the hero the value never changes at all.
 */
function useStarfieldFade(ref: React.RefObject<HTMLDivElement | null>) {
	React.useEffect(() => {
		const el = ref.current;
		if (!el) return undefined;
		let frame = 0;
		let shown = '';
		const apply = () => {
			frame = 0;
			// Fully faded once the hero band is off screen.
			const span = Math.max(1, window.innerHeight * 0.6);
			const fade = (1 - Math.min(1, window.scrollY / span)).toFixed(3);
			if (fade === shown) return;
			shown = fade;
			el.style.opacity = fade;
			// Gone entirely: its drifting layers stop costing anything.
			el.style.visibility = fade === '0.000' ? 'hidden' : '';
		};
		const onScroll = () => {
			if (!frame) frame = window.requestAnimationFrame(apply);
		};
		apply();
		window.addEventListener('scroll', onScroll, { passive: true });
		window.addEventListener('resize', onScroll, { passive: true });
		return () => {
			if (frame) window.cancelAnimationFrame(frame);
			window.removeEventListener('scroll', onScroll);
			window.removeEventListener('resize', onScroll);
		};
	}, [ref]);
}

/**
 * The sky is a sibling of the page content, not a child of the hero: it is
 * pinned to the viewport so it holds still while the page scrolls over it,
 * and `isolate` or `overflow-hidden` on a wrapper would both break that. Its
 * own mask keeps it to the top band (`.starfield` in globals.css).
 */
function Starfield() {
	const ref = React.useRef<HTMLDivElement>(null);
	useStarfieldFade(ref);
	return (
		<div ref={ref} className="starfield" aria-hidden="true">
			<div className="starfield-far" />
		</div>
	);
}

export { Starfield, useStarfieldFade };
