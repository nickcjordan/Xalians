// Tier: featured component. The home story as a click-through viewer
// (docs/design/home-story-content-plan.md, decision 12): one beat at a time in
// a fixed box, moved on by the reader with Next and Back, the chapter bar, the
// arrow keys or a swipe. The page scrolls past it like any other section; the
// scroll never moves the story and never switches an animation on or off
// mid-gesture (Nick, 2026-09-24: "you're not having to worry about turning
// animations on or off for a scroll").
//
// One heavy thing at a time, by construction: only the shown beat can be live.
// Its recordings play back on an archive screen (archiveScreen.tsx, Nick
// 2026-09-26): until the viewer has come to rest in the middle of the screen
// the screen stands by, dark, with nothing heavy in it; once it rests, the
// screen tunes in (static, then the picture opening out of a bright line) and
// the recording plays. Scrolling on switches it off. Choosing another beat
// cuts to it through a burst of static. Nothing is live while the page scrolls
// under it, mid-change, or in a hidden tab.
//
// A catch on the way down (Nick, 2026-09-26: "always catch at the video
// player so that it always requires 2 swipes"): however fast the reader
// scrolls, the page stops where the viewer rests, holds until that swipe or
// wheel has ended, and the next one goes on (storyCatch.ts). The section is a
// little taller than the viewer, and the viewer is CSS-sticky at the height
// that centers it; the catch is at the start of that pause, so the viewer
// stays still for `DWELL` of scroll as the reader moves on ("a tiny bit
// sticky when you start to scroll again"). The story never moves with it.
//
// A window too short for the box (a small phone, a phone on its side) shows the
// shown beat in the page at its natural height instead, with the same controls
// and the same catch, with the picture centered, but no pause.
import * as React from 'react';
import { ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { loadFragment } from '@/components/plates/plateStage';
import { SCREEN_MS, type ScreenState } from './archiveScreen';
import { catchAtRest } from './storyCatch';

export type ViewerBeat = {
	key: string;
	/** The beat's numeral, e.g. "01". */
	n: string;
	/** Its name on the chapter bar and in its button's label. */
	label: string;
	/** A small piece: a minor tick on the bar, its numeral only. */
	minor?: boolean;
	/** A living plate's fragment, fetched ahead while its beat is next. */
	live?: string;
	/**
	 * The beat itself. `live`: whether it may animate now. `shown`: whether it
	 * is on the screen at all (the shown beat, or the one leaving), so a beat
	 * that is not can hold nothing heavy in the DOM. `screen`: its archive
	 * screen's power state. `primed`: its heavy picture may be mounted now,
	 * held still, under the static of the screen tuning in, so going live
	 * later only starts it. `play`: brings the viewer to its resting place,
	 * which is what starts the recording (the screen's Play key).
	 */
	render: (live: boolean, shown: boolean, screen: ScreenState, primed: boolean, play: () => void) => React.ReactNode;
};

// The incoming beat's entrance (delay plus transform, see `.story-scene`) is
// over by now; it goes live only after it, like a shot that settles first.
const SETTLE_MS = 1150;
// Resting this long counts as having stopped: the screen tunes in.
const REST_MS = 220;
// The outgoing beat's exit is over by now.
const EXIT_MS = 700;
// The box needs this much window; below it the shown beat sits in the page.
const BOX_QUERY = '(min-width: 1000px) and (min-height: 560px), (min-height: 700px)';
// How much scroll the viewer stays in the middle of the screen for after the catch.
const DWELL = '20svh';
// How far into that pause the viewer rests: just inside it, so it is held by the sticky.
const REST_IN = 4;

function reducedMotion() {
	return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// How much of the chapter bar a beat's item takes on a wide screen, where the full scenes show their names.
function barWeight(b: ViewerBeat) {
	return b.minor ? 0.45 : 1.5;
}

function canBox() {
	if (typeof window === 'undefined' || !window.matchMedia) return true;
	return window.matchMedia(BOX_QUERY).matches;
}

export function StoryViewer({ id, title, beats, after }: { id: string; title: React.ReactNode; beats: ViewerBeat[]; after?: string }) {
	const wrapRef = React.useRef<HTMLElement>(null);
	const boxRef = React.useRef<HTMLDivElement>(null);
	const pinRef = React.useRef<HTMLDivElement>(null);
	const [pinTop, setPinTop] = React.useState(0);
	const [boxed, setBoxed] = React.useState(canBox);
	const [index, setIndex] = React.useState(0);
	const [settled, setSettled] = React.useState(-1);
	const [leaving, setLeaving] = React.useState(-1);
	const [inView, setInView] = React.useState(false);
	const [visible, setVisible] = React.useState(true);
	// Whether the viewer is resting where the reader can watch it, and the screen that follows.
	const [resting, setResting] = React.useState(false);
	// The catch (storyCatch.ts). The page stopping there is the viewer at rest, so the screen tunes in at
	// once, while the reader's swipe or wheel is still going. Only the heavy part, putting the recording's
	// picture in the page, waits for the hold to let go: done during the hold, it can stall the browser
	// long enough to hold back a still-spinning wheel's input, which the hold would read as the wheel
	// having stopped. Until then the screen shows the recording's still. `unheld` stays true once the
	// picture may go in, so a brief second hold does not take it out again.
	const [unheld, setUnheld] = React.useState(true);
	const [screen, setScreen] = React.useState<ScreenState>('standby');
	const count = beats.length;

	React.useEffect(() => {
		if (typeof window === 'undefined' || !window.matchMedia) return undefined;
		const mq = window.matchMedia(BOX_QUERY);
		const apply = () => setBoxed(mq.matches);
		mq.addEventListener?.('change', apply);
		return () => mq.removeEventListener?.('change', apply);
	}, []);

	// Where the viewer rests: the height that centers it on the screen.
	React.useEffect(() => {
		const pin = pinRef.current;
		if (!boxed || !pin || typeof window === 'undefined') return undefined;
		const measure = () => setPinTop(Math.max(8, Math.round((window.innerHeight - pin.offsetHeight) / 2)));
		measure();
		window.addEventListener('resize', measure);
		const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
		ro?.observe(pin);
		return () => {
			window.removeEventListener('resize', measure);
			ro?.disconnect();
		};
	}, [boxed]);

	// Resting: in the box, the viewer held at its centered place by the sticky
	// pause; without it, nearly all of the shown picture on the screen. A reading of positions
	// on each scroll frame, nothing more; it counts as resting after REST_MS still.
	React.useEffect(() => {
		const pin = pinRef.current;
		const box = boxRef.current;
		if (!pin || !box || typeof window === 'undefined') return undefined;
		let frame = 0;
		let timer = 0;
		let was = false;
		const read = () => {
			frame = 0;
			let now: boolean;
			if (boxed) {
				const r = pin.getBoundingClientRect();
				now = Math.abs(r.top - pinTop) < 2 && r.bottom <= window.innerHeight + 1;
			} else {
				// Without the box the beat can be taller than the screen: its picture is what must be in view.
				const pic = box.querySelector<HTMLElement>('.story-scene[data-state="active"] .frame') ?? box;
				const r = pic.getBoundingClientRect();
				const seen = Math.min(window.innerHeight, r.bottom) - Math.max(0, r.top);
				now = r.height > 0 && seen / r.height >= 0.9;
			}
			if (now === was) return;
			was = now;
			window.clearTimeout(timer);
			if (now) timer = window.setTimeout(() => setResting(true), REST_MS);
			else setResting(false);
		};
		const schedule = () => {
			if (!frame) frame = window.requestAnimationFrame(read);
		};
		read();
		window.addEventListener('scroll', schedule, { passive: true });
		window.addEventListener('resize', schedule);
		return () => {
			window.removeEventListener('scroll', schedule);
			window.removeEventListener('resize', schedule);
			window.clearTimeout(timer);
			if (frame) window.cancelAnimationFrame(frame);
		};
	}, [boxed, pinTop]);

	// The screen follows: resting and watched, it tunes in and plays; otherwise it switches off and stands by.
	const power = resting && visible;
	React.useEffect(() => {
		const quick = reducedMotion();
		let t = 0;
		setScreen((cur) => {
			if (power && (cur === 'standby' || cur === 'off')) {
				if (quick) return 'on';
				t = window.setTimeout(() => setScreen((c) => (c === 'tuning' ? 'on' : c)), SCREEN_MS.tuning);
				return 'tuning';
			}
			if (!power && (cur === 'on' || cur === 'tuning' || cur === 'switch')) {
				if (quick) return 'standby';
				t = window.setTimeout(() => setScreen((c) => (c === 'off' ? 'standby' : c)), SCREEN_MS.off);
				return 'off';
			}
			return cur;
		});
		return () => window.clearTimeout(t);
	}, [power]);

	// The picture mostly on the screen: the only time anything in it may move.
	React.useEffect(() => {
		const box = boxRef.current;
		if (!box || typeof IntersectionObserver === 'undefined') return undefined;
		const io = new IntersectionObserver((entries) => entries.forEach((e) => setInView(e.intersectionRatio >= 0.5)), { threshold: [0, 0.5, 1] });
		io.observe(box);
		const tab = () => setVisible(document.visibilityState !== 'hidden');
		document.addEventListener('visibilitychange', tab);
		return () => {
			io.disconnect();
			document.removeEventListener('visibilitychange', tab);
		};
	}, []);

	// A beat settles after its entrance: then, and only then, it may go live.
	React.useEffect(() => {
		setSettled(-1);
		if (reducedMotion()) {
			setSettled(index);
			return undefined;
		}
		const t = window.setTimeout(() => setSettled(index), SETTLE_MS);
		return () => window.clearTimeout(t);
	}, [index]);

	// Fetch the shown beat's plate and its neighbors' before they are needed.
	React.useEffect(() => {
		if (!inView) return;
		for (const i of [index, index + 1, index - 1]) {
			const src = beats[i]?.live;
			if (src) loadFragment(src).catch(() => {
				/* its poster stays */
			});
		}
	}, [inView, index, beats]);

	// How far the page is from where the viewer rests, or null without a viewer. In the box that is just
	// inside its centered pause; in the page, the picture centered on the screen (or its top, if it is
	// taller than the screen).
	const restBy = React.useCallback((): number | null => {
		const wrap = wrapRef.current;
		const pin = pinRef.current;
		const box = boxRef.current;
		if (!wrap || !pin || !box || typeof window === 'undefined') return null;
		if (boxed) {
			const natural = wrap.getBoundingClientRect().top + parseFloat(getComputedStyle(wrap).paddingTop || '0');
			return natural - pinTop + REST_IN;
		}
		const pic = box.querySelector<HTMLElement>('.story-scene[data-state="active"] .frame') ?? box;
		const r = pic.getBoundingClientRect();
		return r.height <= window.innerHeight ? r.top - (window.innerHeight - r.height) / 2 : r.top - 8;
	}, [boxed, pinTop]);

	// The catch on the way down (storyCatch.ts).
	const screenRef = React.useRef(screen);
	React.useEffect(() => {
		screenRef.current = screen;
	}, [screen]);
	const onHold = React.useCallback((holding: boolean) => {
		if (!holding) return setUnheld(true);
		// Caught: resting now, without waiting out REST_MS.
		setResting(true);
		if (screenRef.current === 'standby' || screenRef.current === 'off') setUnheld(false);
	}, []);
	React.useEffect(() => {
		if (typeof window === 'undefined') return undefined;
		return catchAtRest(() => {
			const by = restBy();
			return by == null ? null : window.scrollY + by;
		}, onHold);
	}, [restBy, onHold]);

	// Play: scroll the page to where the viewer rests, and let resting start the recording as it always does.
	// The key goes away as the screen tunes in, so a keyboard reader's focus moves to the beat it plays
	// rather than falling out to the page.
	const play = React.useCallback(() => {
		const box = boxRef.current;
		const scene = box?.querySelector<HTMLElement>('.story-scene[data-state="active"]');
		if (scene && box?.contains(document.activeElement)) scene.focus({ preventScroll: true });
		const by = restBy();
		if (by == null || Math.abs(by) < 1) return;
		window.scrollTo({ top: window.scrollY + by, behavior: reducedMotion() ? 'auto' : 'smooth' });
	}, [restBy]);

	// Where a beat's marker sits on the bar once the full scenes carry their names (lg): a small piece's
	// numeral needs less room than a scene's name, so the bar gives the names more, and "05 The Reign of
	// Kozrak" is no longer cut short. Each marker is its item's left edge, so the dot goes to the share of
	// the bar that the items before it take.
	const barAt = React.useCallback(
		(i: number) => {
			const total = beats.reduce((a, b) => a + barWeight(b), 0);
			return beats.slice(0, i).reduce((a, b) => a + barWeight(b), 0) / total;
		},
		[beats]
	);

	const go = React.useCallback(
		(to: number) => {
			const next = Math.max(0, Math.min(count - 1, to));
			if (next === index) return;
			setLeaving(index);
			window.setTimeout(() => setLeaving((l) => (l === index ? -1 : l)), EXIT_MS);
			setIndex(next);
			// A playing screen cuts to the next recording through a burst of static.
			if (!reducedMotion()) {
				setScreen((c) => (c === 'on' || c === 'switch' ? 'switch' : c));
				window.setTimeout(() => setScreen((c) => (c === 'switch' ? 'on' : c)), SCREEN_MS.switch);
			}
			// In the page (no box) the beat's height changes: keep the viewer's top in sight.
			const wrap = wrapRef.current;
			if (!boxed && wrap && wrap.getBoundingClientRect().top < 0) wrap.scrollIntoView({ block: 'start' });
		},
		[count, index, boxed]
	);

	// The arrow keys move the story while it is mostly on the screen, unless the reader is typing.
	React.useEffect(() => {
		if (!inView) return undefined;
		const key = (e: KeyboardEvent) => {
			const t = e.target as HTMLElement | null;
			if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)))) return;
			if (e.key === 'ArrowRight') go(index + 1);
			else if (e.key === 'ArrowLeft') go(index - 1);
			else return;
			e.preventDefault();
		};
		window.addEventListener('keydown', key);
		return () => window.removeEventListener('keydown', key);
	}, [inView, index, go]);

	// A horizontal swipe on a touch screen moves it too; a vertical one is the page's.
	const touch = React.useRef<{ x: number; y: number } | null>(null);
	const onTouchStart = (e: React.TouchEvent) => {
		const t = e.touches[0];
		touch.current = t ? { x: t.clientX, y: t.clientY } : null;
	};
	const onTouchEnd = (e: React.TouchEvent) => {
		const s = touch.current;
		const t = e.changedTouches[0];
		touch.current = null;
		if (!s || !t) return;
		const dx = t.clientX - s.x;
		const dy = t.clientY - s.y;
		if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(index + (dx < 0 ? 1 : -1));
	};

	const liveNow = (i: number) => inView && visible && unheld && screen === 'on' && settled === index && i === index;
	const last = index === count - 1;
	const beat = beats[index];

	return (
		<section
			id={id}
			ref={wrapRef}
			aria-labelledby={`${id}-title`}
			aria-roledescription="carousel"
			className="story-viewer scroll-mt-16 pt-8"
		>
			{/* The viewer itself, resting in the middle of the screen for a moment on the way past. */}
			<div ref={pinRef} className={cn(boxed && 'sticky')} style={boxed ? { top: pinTop } : undefined}>
				<div className="flex flex-wrap items-end gap-x-10 gap-y-2 pb-4 lg:pb-5">
					{title}
					{/* The chapter bar: one marker per beat, the dot on the shown one. */}
					<div className="story-line min-w-64 flex-1" style={{ '--story-progress': index / count, '--story-progress-lg': barAt(index) } as React.CSSProperties}>
						<ol className="m-0 flex list-none p-0" aria-label="Chapters">
							{beats.map((b, i) => (
								<li key={b.key} className="m-0 min-w-0 flex-1 lg:grow-(--bar-w)" style={{ '--bar-w': barWeight(b) } as React.CSSProperties}>
									<button
										type="button"
										onClick={() => go(i)}
										aria-label={`${b.n} ${b.label}`}
										aria-current={i === index ? 'step' : undefined}
										data-reached={i <= index ? '' : undefined}
										data-minor={b.minor ? '' : undefined}
										className={cn(
											'story-marker type-data flex h-11 w-full min-w-0 items-end gap-2 pb-3 pl-2 text-left text-tiny tracking-legend transition-colors duration-1 ease-out focus-visible:outline-2 focus-visible:outline-ring',
											i === index ? 'text-ink' : 'text-ink-3 hover:text-ink-2'
										)}
									>
										<span>{b.n}</span>
										{b.minor ? null : <span className="type-legend hidden truncate text-current lg:inline">{b.label}</span>}
									</button>
								</li>
							))}
						</ol>
						<span aria-hidden="true" className="story-track">
							<span className="story-fill" />
							<span className="story-dot" />
						</span>
					</div>
				</div>

				<div
					ref={boxRef}
					className={cn('story-box relative', boxed ? 'h-[clamp(360px,calc(100svh-14.5rem),820px)]' : '')}
					data-boxed={boxed ? '' : undefined}
					onTouchStart={onTouchStart}
					onTouchEnd={onTouchEnd}
					aria-live="polite"
				>
					{beats.map((b, i) => {
						const shown = i === index || i === leaving;
						if (!boxed && i !== index) return null;
						return (
							<div
								key={b.key}
								className="story-scene focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
								role="group"
								aria-roledescription="slide"
								aria-label={`${b.n} of ${beats[count - 1].n}: ${b.label}`}
								aria-hidden={i === index ? undefined : true}
								inert={i === index ? undefined : true}
								data-state={i === index ? 'active' : i < index ? 'past' : 'future'}
								tabIndex={i === index ? -1 : undefined}
							>
								{b.render(liveNow(i), shown, i === index ? screen : 'standby', i === index && visible && unheld && screen !== 'standby' && screen !== 'off', play)}
							</div>
						);
					})}
				</div>

				{/* Back and Next, with where the reader is. On the last beat Next reads on into the page. */}
				<div className="mt-4 flex items-center justify-between gap-4">
					<span className="type-data text-tiny tracking-legend text-ink-3" aria-hidden="true">
						{beat.n} / {beats[count - 1].n}
					</span>
					<div className="flex items-center gap-3">
						<Button type="button" variant="outline" onClick={() => go(index - 1)} disabled={index === 0}>
							<ArrowLeft aria-hidden="true" />
							Back
						</Button>
						{last && after ? (
							<Button asChild variant="secondary">
								<a href={after}>
									Read on
									<ArrowDown aria-hidden="true" />
								</a>
							</Button>
						) : (
							<Button type="button" variant="secondary" onClick={() => go(index + 1)} disabled={last}>
								Next
								<ArrowRight aria-hidden="true" />
							</Button>
						)}
					</div>
				</div>
			</div>
			{/* The room it rests over: inside the section, so the sticky viewer has it to travel in (padding would not count). */}
			{boxed ? <div aria-hidden="true" style={{ height: DWELL }} /> : null}
		</section>
	);
}
