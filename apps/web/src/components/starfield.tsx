// Tier: featured component. The sky behind the home hero.
import * as React from 'react';

/**
 * The starfield is fixed to the viewport so it holds still while the page
 * scrolls over it (anchoring it to the hero made it slide away, which read
 * as the sky moving). Fixed alone would leave it behind the reading sections
 * and the footer, so this fades it out over the first screen of scrolling:
 * full strength at the top, gone by the time the hero has left. Written to
 * a CSS variable rather than React state so scrolling never re-renders.
 */
function useStarfieldFade() {
	React.useEffect(() => {
		const root = document.documentElement;
		let frame = 0;
		const apply = () => {
			frame = 0;
			// Fully faded once the hero band is off screen.
			const span = Math.max(1, window.innerHeight * 0.6);
			const fade = 1 - Math.min(1, window.scrollY / span);
			root.style.setProperty('--starfield-fade', fade.toFixed(3));
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
			// The variable is set on <html>, so it has to be cleaned up when the
			// page unmounts or every other route inherits the last value.
			root.style.removeProperty('--starfield-fade');
		};
	}, []);
}

/**
 * The sky is a sibling of the page content, not a child of the hero: it is
 * pinned to the viewport so it holds still while the page scrolls over it,
 * and `isolate` or `overflow-hidden` on a wrapper would both break that. Its
 * own mask keeps it to the top band (`.starfield` in globals.css).
 */
function Starfield() {
	useStarfieldFade();
	return (
		<div className="starfield" aria-hidden="true">
			<div className="starfield-far" />
		</div>
	);
}

export { Starfield, useStarfieldFade };
