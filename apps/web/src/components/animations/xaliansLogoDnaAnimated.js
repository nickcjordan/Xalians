// Tier: featured component. The home splash's brand intro.
//
// The mark is *sequenced*, the way a Generator prints a specimen: the two
// strands draw themselves, the base pairs snap in one at a time, the genome
// locks with a single pulse, and the wordmark resolves out of that pulse.
//
// Beat 1 (0.00-0.90s)  Strands draw on, outer pair first, long strand last.
// Beat 2 (0.55-1.35s)  Rungs sequence in top to bottom as the pairs bond.
// Beat 3 (1.30-1.75s)  One pulse: the genome is viable.
// Beat 4 (1.55-2.30s)  XALIANS resolves letter by letter out of the pulse.
//
// Everything is one GSAP timeline so it can be scrubbed, replayed and killed
// as a unit. Reduced motion skips straight to the resting frame.
//
// This replaces the earlier X-path morph (which depended on an Iceland glyph
// extracted to ../brand/wordmarkX and never actually ran on the deployed
// site: the component fell through to its resting frame on every load). The
// wordmark here is real text, so it needs no extracted glyph, stays
// selectable and accessible, and cannot silently fail to a static frame.
import React from 'react';
import gsap from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { HelixPaths } from '@/components/system/brand';

gsap.registerPlugin(DrawSVGPlugin);

const WORD = 'XALIANS';

class XaliansLogoDnaAnimated extends React.Component {
	containerRef = React.createRef();

	componentDidMount() {
		const root = this.containerRef.current;
		if (!root || typeof window === 'undefined') return;

		const reduced =
			window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (reduced) return;

		const strands = root.querySelectorAll('.helix .strand');
		const rungs = root.querySelectorAll('.helix .rung');
		const letters = root.querySelectorAll('[data-letter]');
		if (!strands.length || !letters.length) return;

		// DrawSVG needs a measurable path; in a non-rendering DOM (tests, SSR
		// hydration) getBBox throws and there is nothing to animate. Leaving the
		// resting frame up is the correct outcome, not an error.
		try {
			strands[0].getBBox();
		} catch (e) {
			return;
		}

		// The resting frame is what the markup already renders, so the intro
		// starts by hiding it and plays forward into it. Anything that goes
		// wrong after this point leaves the timeline mid-flight rather than
		// blank, which is why the set() and the timeline are not separated.
		gsap.set(strands, { drawSVG: '50% 50%', opacity: 1 });
		gsap.set(rungs, { drawSVG: '50% 50%', opacity: 1 });
		gsap.set(letters, { opacity: 0, y: '0.12em' });

		this.timeline = gsap.timeline({ defaults: { ease: 'power2.out' } });
		// Exposed so the intro can be scrubbed while tuning it, and so a
		// headless check can hold it at a chosen beat instead of racing it:
		//   __xaliansIntro.pause(1.4)
		if (process.env.NODE_ENV !== 'production') window.__xaliansIntro = this.timeline;

		// Beat 1: the backbone draws itself. The long strand finishes last so
		// the shape reads as closing rather than merely appearing.
		this.timeline.to(strands, {
			drawSVG: '0% 100%',
			duration: 0.9,
			ease: 'power1.inOut',
			stagger: 0.1,
		});

		// Beat 2: base pairs bond in sequence. Overlaps beat 1 so the rungs
		// appear to chase the strands down rather than wait for them.
		this.timeline.to(
			rungs,
			{ drawSVG: '0% 100%', duration: 0.3, ease: 'power3.out', stagger: 0.05 },
			0.55
		);

		// Beat 3: the genome locks. One pulse, not a loop: it is an event that
		// happens once and ends, so the resting lockup never glows.
		this.timeline
			.to(
				root.querySelector('.helix'),
				{ filter: 'drop-shadow(0 0 9px var(--color-viable-hi))', duration: 0.2 },
				1.3
			)
			.to(root.querySelector('.helix'), {
				filter: 'drop-shadow(0 0 0px var(--color-viable-hi))',
				duration: 0.45,
				ease: 'power2.inOut',
			});

		// Beat 4: the word resolves out of the pulse, letter by letter.
		this.timeline.to(
			letters,
			{ opacity: 1, y: '0em', duration: 0.4, ease: 'power2.out', stagger: 0.055 },
			1.55
		);
	}

	componentWillUnmount() {
		// Kill the timeline so a route change mid-intro cannot leave tweens
		// running against detached nodes.
		if (this.timeline) this.timeline.kill();
	}

	render() {
		return (
			<a
				className="mb-2 inline-flex items-center gap-3.5 font-brand uppercase leading-none text-viable-hi no-underline hover:text-viable-hi sm:gap-5 sm:text-[64px] text-[40px]"
				href="/"
				aria-label="Xalians"
				ref={this.containerRef}
			>
				{/* The mark is decorative here: the anchor's aria-label already
				    names the link, so this carries no title and no role. Geometry
				    comes from HelixPaths so there is one source for the shape. */}
				<svg
					className="helix block h-[52px] w-auto overflow-visible sm:h-[84px]"
					viewBox="-6 -6 144 173"
					aria-hidden="true"
					focusable="false"
				>
					<HelixPaths />
				</svg>
				{/* Real text, so the wordmark stays selectable and legible to a
				    screen reader through the anchor's own label. The per-letter
				    spans are the animation's only reason for existing. */}
				<span aria-hidden="true">
					{WORD.split('').map((ch, i) => (
						<span key={`${ch}-${i}`} data-letter className="inline-block">
							{ch}
						</span>
					))}
				</span>
			</a>
		);
	}
}

export default XaliansLogoDnaAnimated;
