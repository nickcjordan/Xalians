// Tier: featured component. The motion of the home story, in one place.
//
// Everything here is a GSAP timeline or ScrollTrigger inside one context, so
// it is killed as a unit when the page unmounts and never runs under
// reduced motion. The markup renders its resting frame: if this never runs
// (an old browser, a test DOM), the page is complete and still.
//
// What moves, and the catalog row each answers to (docs/DESIGN_SYSTEM.md
// section 7):
//   [data-hero-fig]     the creature arriving after the lockup, once on load
//   [data-panel]        a painting settling into its frame as it scrolls in, once
//   [data-panel] img    a scroll-linked drift inside the frame (no loop)
//   [data-plate]        a caption plate sliding out from behind its panel, once
//   [data-reveal]       a story beat's words or small piece rising in, once
//   [data-figure]       the specimen printing in (blur to sharp), once
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const ENTER = 'power3.out';

export function startStoryMotion(root: HTMLElement): (() => void) | undefined {
	if (typeof window === 'undefined') return undefined;
	const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	if (reduced) return undefined;

	// gsap 3.9 has no context(); every tween is kept so the page can kill
	// them, and their triggers, as one unit on unmount. Every tween is a
	// fromTo with its resting values spelled out: React's development double
	// mount runs this twice, and a plain from() on the second pass would read
	// the hidden state the first pass left as its destination and animate
	// hidden to hidden (the ghosted page of 2026-09-22).
	const tweens: gsap.core.Tween[] = [];
	const targets: Element[] = [];
	const keep = (tw: gsap.core.Tween) => {
		tweens.push(tw);
		targets.push(...(tw.targets() as Element[]));
		return tw;
	};
	try {
		{
			const once = (trigger: Element, start = 'top 88%') => ({ trigger, start, once: true });

			root.querySelectorAll<HTMLElement>('[data-hero-fig]').forEach((el) => {
				keep(gsap.fromTo(el, { y: 28, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.9, ease: ENTER, delay: 1.4 }));
			});

			root.querySelectorAll<HTMLElement>('[data-panel]').forEach((panel) => {
				keep(gsap.fromTo(panel, { y: 32, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.9, ease: ENTER, scrollTrigger: once(panel) }));
				// A living plate holds still in its frame: its SVG cannot travel with
				// its poster, so only a plain painting drifts.
				const img = panel.querySelector('[data-live-plate]') ? null : panel.querySelector('img');
				if (img) {
					// The image is drawn a little larger than its frame (see the
					// panel's classes) so it can travel without showing an edge.
					keep(gsap.fromTo(
						img,
						{ yPercent: -5 },
						{ yPercent: 5, ease: 'none', scrollTrigger: { trigger: panel, start: 'top bottom', end: 'bottom top', scrub: 0.6 } }
					));
				}
			});

			root.querySelectorAll<HTMLElement>('[data-plate]').forEach((plate) => {
				const from = plate.dataset.plate;
				const x = from === 'left' ? -56 : from === 'right' ? 56 : 0;
				const y = from === 'up' ? 28 : 0;
				keep(gsap.fromTo(plate, { x, y, autoAlpha: 0 }, { x: 0, y: 0, autoAlpha: 1, duration: 0.8, ease: ENTER, delay: 0.15, scrollTrigger: once(plate, 'top 90%') }));
			});

			root.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
				// Opacity, not visibility: words not yet revealed stay in the accessibility tree.
				keep(gsap.fromTo(el, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: ENTER, scrollTrigger: once(el, 'top 90%') }));
			});

			root.querySelectorAll<HTMLElement>('[data-figure]').forEach((fig) => {
				keep(gsap.fromTo(
					fig,
					{ autoAlpha: 0.1, filter: 'blur(14px)', y: 16 },
					{ autoAlpha: 1, filter: 'blur(0px)', y: 0, duration: 1.1, ease: ENTER, scrollTrigger: once(fig, 'top 80%') }
				));
			});
		}
	} catch {
		// A DOM that cannot be measured (tests) keeps its resting frame.
		return undefined;
	}

	// Paintings arrive after layout; positions are re-measured once they have.
	const refresh = () => ScrollTrigger.refresh();
	window.addEventListener('load', refresh);
	const timer = window.setTimeout(refresh, 1200);

	return () => {
		window.removeEventListener('load', refresh);
		window.clearTimeout(timer);
		for (const tw of tweens) {
			tw.scrollTrigger?.kill();
			tw.kill();
		}
		// Back to the resting frame the markup renders, so a remount starts
		// clean. Only the tweened properties: 'all' would also strip the plates'
		// inline custom properties (their chamfer fill) on the development
		// double mount.
		gsap.set(targets, { clearProps: 'transform,opacity,visibility,filter' });
	};
}
