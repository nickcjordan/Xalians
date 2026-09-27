// The story's catch on the way down (Nick, 2026-09-26: "i want it to always
// catch at the video player so that it always requires 2 swipes or scrolls to
// get to the very bottom"). A swipe, a wheel or a scroll key that would carry
// the page past the viewer's resting place stops there instead, and the page
// stays put until that gesture has ended (a finger lifted, a wheel or a glide
// gone quiet); the next gesture goes on as usual.
//
// It holds for as long as the gesture goes on, however long (Nick,
// 2026-09-26: "as long as it keep spinning without stopping, it will not
// continue past the video player until the scroller comes to a complete stop
// and subsequently begins scrolling again"). While it holds, the page cannot
// scroll at all (`overflow: hidden`), so nothing gets past even while the main
// thread is busy tuning the screen in; the wheel, the finger and the keys are
// still heard, and only QUIET_MS without any of them lets go.
//
// It catches once per trip down and never on the way up, and lets every
// deliberate jump through (a link, End or Home, the scrollbar, find in page,
// the Play key's own scroll): only a scroll that a wheel, a swipe or a scroll
// key is driving is caught.
//
// A busy browser can hold a spinning wheel's turns back and deliver them late,
// after the quiet check has already let go. Two things keep that from carrying
// the page past: the recording's picture, the heavy moment, does not go into
// the page until the hold has let go (`onHold`, storyViewer.tsx; the screen
// itself tunes in at once), and a turn that arrives after the let-go but was
// made before it (its timeStamp says so) puts the hold back on.
//
// CSS scroll snapping was measured first and does not do this: Chrome lets a
// wheel or a fling pass a `scroll-snap-stop: always` point under `proximity`,
// and `mandatory` snaps the rest of the page.

/** This long without wheel, key, swipe or pushed-back scroll: the gesture has come to a complete stop. */
const QUIET_MS = 300;
/** A quiet check that runs this late was held up by a busy main thread, whose queued input it has not heard yet. */
const LATE_MS = 60;
/** A swipe's glide after the finger lifts counts as that swipe for this long. */
const GLIDE_MS = 2500;
/** A wheel turn or a scroll key drives the scroll for this long after it. */
const DRIVE_MS = 400;
/** A deliberate jump (a link, End, Home) is never caught for this long. */
const JUMP_MS = 1500;
/** The class that takes the page's scroll away while it is held (globals.css). */
export const HELD_CLASS = 'story-held';
/** The class that keeps the scrollbar's room while it is taken away, so nothing shifts sideways. */
export const CATCH_CLASS = 'story-catch';

const SCROLL_KEYS = new Set(['ArrowDown', 'PageDown', ' ', 'Spacebar']);

function typing(t: EventTarget | null) {
	const el = t as HTMLElement | null;
	return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
}

/**
 * Catch the page at `rest()` (a scroll position, or null while there is none) on the way down.
 * Returns the function that takes it all away again.
 */
export function catchAtRest(rest: () => number | null, onHold: (holding: boolean) => void = () => {}, win: Window = window): () => void {
	const doc = win.document;
	const root = doc.documentElement;
	const now = () => Date.now();
	const jump = (y: number) => win.scrollTo({ top: y, left: 0, behavior: 'instant' as ScrollBehavior });

	// Armed: the reader is above the resting place, so the next pass down is caught.
	let armed = (() => {
		const r = rest();
		return r != null && win.scrollY < r - 1;
	})();
	let held: { y: number; since: number } | null = null;
	// When the last hold let go, on the events' clock, so a turn made before it can be told from a new one.
	let letGo = -Infinity;
	let lastWheel = -Infinity;
	let lastKey = -Infinity;
	let lastTouchEnd = -Infinity;
	let lastActivity = -Infinity;
	let jumpUntil = -Infinity;
	let touching = false;
	let touchMoved = false;
	let swiped = false;
	let timer = 0;
	let due = 0;
	let wheelOn = false;

	const driven = (t: number) =>
		t >= jumpUntil && (t - lastWheel < DRIVE_MS || t - lastKey < DRIVE_MS || (touching && touchMoved) || (swiped && t - lastTouchEnd < GLIDE_MS));

	const release = () => {
		held = null;
		letGo = win.performance.now();
		onHold(false);
		armed = false;
		root.classList.remove(HELD_CLASS);
		win.clearTimeout(timer);
		timer = 0;
		sync();
	};
	const wait = (ms = QUIET_MS) => {
		win.clearTimeout(timer);
		due = now() + ms;
		timer = win.setTimeout(check, ms);
	};
	const check = () => {
		timer = 0;
		if (!held) return;
		const t = now();
		// Late: the main thread was busy, and the wheel turns queued behind it have not been heard. Wait again.
		if (t - due > LATE_MS) return wait();
		// A finger still down holds it until it lifts; otherwise only a complete stop lets go.
		if (touching) return wait();
		if (t - lastActivity < QUIET_MS) return wait(QUIET_MS - (t - lastActivity) + 1);
		release();
	};
	const hold = (y: number, t: number) => {
		if (!held) onHold(true);
		held = { y, since: t };
		lastActivity = t;
		root.classList.add(HELD_CLASS);
		jump(y);
		wait();
		sync();
	};

	// The wheel may only be stopped by a listener that is not passive, which makes the browser wait on
	// it before every wheel scroll: it is only there near the resting place, or while holding. Chrome
	// lets only the first wheel event of a scroll be stopped; what the rest move, onScroll pushes back.
	const onWheelStop = (e: WheelEvent) => {
		const t = now();
		if (held) {
			e.preventDefault();
			lastActivity = t;
			return;
		}
		if (!armed || e.ctrlKey || e.deltaY <= 0 || Math.abs(e.deltaX) > Math.abs(e.deltaY) || t < jumpUntil) return;
		const r = rest();
		if (r == null) return;
		const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * win.innerHeight : e.deltaY;
		// A turn that would carry the page past the resting place stops on it instead.
		if (win.scrollY + dy > r + 1) {
			e.preventDefault();
			hold(r, t);
		}
	};
	const sync = (r = rest(), y = win.scrollY) => {
		const want = !!held || (armed && r != null && y > r - 2 * win.innerHeight);
		if (want === wheelOn) return;
		wheelOn = want;
		if (want) win.addEventListener('wheel', onWheelStop, { passive: false });
		else win.removeEventListener('wheel', onWheelStop);
	};

	const onScroll = () => {
		const y = win.scrollY;
		const t = now();
		if (held) {
			// Whatever still pushes (a smooth wheel's tail, a glide) is pushed back, and keeps the hold on.
			if (Math.abs(y - held.y) > 1) {
				lastActivity = t;
				jump(held.y);
			}
			return;
		}
		const r = rest();
		if (r == null) return;
		if (!armed) {
			// Back above it by half a screen: the next trip down is caught again.
			if (y < r - win.innerHeight / 2) armed = true;
		} else if (y > r + 1) {
			if (driven(t)) hold(r, t);
			// Carried past by something deliberate: this trip is over.
			else armed = false;
		}
		sync(r, y);
	};

	const onWheel = (e: WheelEvent) => {
		lastWheel = now();
		// A turn made before the let-go and heard only now was held back by a busy browser: the same spin.
		if (!held && e.deltaY > 0 && e.timeStamp > 0 && e.timeStamp < letGo) {
			const r = rest();
			if (r != null && win.scrollY >= r - 1) hold(r, lastWheel);
		} else if (e.timeStamp >= letGo) letGo = -Infinity;
	};
	const onKey = (e: KeyboardEvent) => {
		if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || typing(e.target)) return;
		const t = now();
		if (e.key === 'End' || e.key === 'Home') {
			jumpUntil = t + JUMP_MS;
			return;
		}
		if (!SCROLL_KEYS.has(e.key)) return;
		// Space on a button presses it; it scrolls nothing.
		if ((e.key === ' ' || e.key === 'Spacebar') && (e.target as Element | null)?.closest?.('button, a, summary, [role="button"]')) return;
		lastKey = t;
		if (held) {
			e.preventDefault();
			lastActivity = t;
		}
	};
	const onTouchStart = () => {
		touching = true;
		touchMoved = false;
	};
	const onTouchMove = () => {
		touchMoved = true;
		if (held) lastActivity = now();
	};
	const onTouchEnd = (e: TouchEvent) => {
		touching = e.touches.length > 0;
		if (touching) return;
		const t = now();
		lastTouchEnd = t;
		swiped = touchMoved;
		if (held) {
			lastActivity = t;
			wait();
		}
	};
	const onClick = (e: MouseEvent) => {
		if ((e.target as Element | null)?.closest?.('a[href]')) jumpUntil = now() + JUMP_MS;
	};
	const onHash = () => {
		jumpUntil = now() + JUMP_MS;
	};

	win.addEventListener('scroll', onScroll, { passive: true });
	win.addEventListener('wheel', onWheel, { passive: true });
	win.addEventListener('keydown', onKey);
	win.addEventListener('touchstart', onTouchStart, { passive: true });
	win.addEventListener('touchmove', onTouchMove, { passive: true });
	win.addEventListener('touchend', onTouchEnd, { passive: true });
	win.addEventListener('touchcancel', onTouchEnd, { passive: true });
	doc.addEventListener('click', onClick, true);
	win.addEventListener('hashchange', onHash);
	root.classList.add(CATCH_CLASS);
	sync();

	return () => {
		win.removeEventListener('scroll', onScroll);
		win.removeEventListener('wheel', onWheel);
		win.removeEventListener('wheel', onWheelStop);
		win.removeEventListener('keydown', onKey);
		win.removeEventListener('touchstart', onTouchStart);
		win.removeEventListener('touchmove', onTouchMove);
		win.removeEventListener('touchend', onTouchEnd);
		win.removeEventListener('touchcancel', onTouchEnd);
		doc.removeEventListener('click', onClick, true);
		win.removeEventListener('hashchange', onHash);
		win.clearTimeout(timer);
		root.classList.remove(HELD_CLASS, CATCH_CLASS);
	};
}
