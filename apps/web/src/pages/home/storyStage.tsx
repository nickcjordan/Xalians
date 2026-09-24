// Tier: featured component. The home story's stage: the story's scenes shown
// one at a time. The section pins a full-height stage while the reader scrolls
// through it, and a timeline in the stage's head answers every scroll: its dot
// is the reader's place in the whole section, moved directly by the scroll
// position, so no scroll ever goes unanswered (Nick, 2026-09-23). The track has
// one marker per scene; when the dot reaches a scene's marker, that scene comes
// on stage and the one before it leaves (the frame drifts and fades the way the
// page travels, then the reading column and the painting's label arrive). The
// transitions are CSS (`.story-scene` in globals.css), keyed off each scene's
// state, so reversing direction plays them backward. The dot is written straight
// to a custom property from the scroll listener's animation frame, never through
// React state, and it follows the scroll under reduced motion too: it is
// feedback, not decoration.
//
// Only one scene's living plate is ever in the DOM. The outgoing scene keeps its
// plate playing while it fades; the incoming one shows its still, which is the
// plate's own first frame, and goes live once its entrance has settled, so the
// swap is invisible. A scene off the stage, or a stage off the screen, holds no
// SVG at all.
//
// A window too short for a scene and its words (a phone on its side, a small
// phone) gets the scenes stacked in the page instead, where the plate most in
// view is live.
//
// Two kinds of scene (docs/design/home-story-content-plan.md): a full scene, a
// painting with its words, holds a full stretch of scroll and a major marker;
// a small piece, one focused animation with no landscape, holds a shorter
// stretch (`weight`) and a minor tick. A small piece is scrubbed: the stage
// hands it a `SceneTime`, its own 0 to 1 through its stretch, written every
// frame the page moves, so scrolling back plays it backward.
import * as React from 'react';
import { cn } from '@/lib/utils';
import { loadFragment } from '@/components/plates/plateStage';

/**
 * A scene's own place in its stretch of the stage, 0 at its marker and 1 at
 * the next, written from the scroll listener's frame. Pieces subscribe to it
 * and draw from it directly, never through React state.
 */
export class SceneTime {
	value = 0;
	private listeners = new Set<(t: number) => void>();
	set(t: number) {
		if (t === this.value) return;
		this.value = t;
		this.listeners.forEach((fn) => fn(t));
	}
	subscribe(fn: (t: number) => void) {
		this.listeners.add(fn);
		return () => {
			this.listeners.delete(fn);
		};
	}
}

export type StageScene = {
	key: string;
	/** Its share of the scroll: 1 for a full scene (the default), less for a small piece. */
	weight?: number;
	/** A small piece: a minor tick on the timeline, its numeral only. */
	minor?: boolean;
	/** The scene's numeral on the timeline, e.g. "01". */
	n: string;
	/** The scene's name on the timeline and in its marker's label, e.g. "The Age of Unbirth". */
	label: string;
	/** A living plate's fragment, fetched ahead while its scene is next. */
	live?: string;
	/**
	 * The scene itself. `live` says whether its plate is the page's live one;
	 * undefined when the scenes are stacked and each plate decides for itself.
	 */
	render: (live: boolean | undefined, time?: SceneTime) => React.ReactNode;
};

// The incoming frame's entrance (delay plus transform, see `.story-scene`)
// is over by now; the live plate takes over from its still only after it.
const SETTLE_MS = 1150;
// A scene and its words need this much height (more on a narrow screen,
// where they stack under the painting); below it the scenes stack.
const STAGE_QUERY = '(min-width: 1000px) and (min-height: 560px), (min-height: 700px)';

/**
 * Where the reader is in the stage. `scrolled` is how far the section's top has
 * gone above the viewport's top and `range` is how far it can go while pinned.
 * `p` runs continuously from 0 to 1 over the whole range, so any scroll inside
 * it moves the dot; the range is cut into one stretch per scene, and
 * scene `i` is shown from its marker to the next one. `weights` is each
 * scene's share of the range (a number means that many equal shares).
 */
export function stageProgress(scrolled: number, range: number, weights: number | number[]) {
	const w = typeof weights === 'number' ? Array.from({ length: weights }, () => 1) : weights;
	const p = range > 0 ? Math.min(1, Math.max(0, scrolled / range)) : 0;
	const at = p * w.reduce((a, b) => a + b, 0);
	let index = 0;
	let start = 0;
	while (index < w.length - 1 && at >= start + w[index]) start += w[index++];
	return { p, index };
}

/** Each scene's own 0 to 1 through its stretch, for the dot at `p`. */
export function sceneTimes(p: number, weights: number[]) {
	const at = p * weights.reduce((a, b) => a + b, 0);
	let start = 0;
	return weights.map((w) => {
		const t = Math.min(1, Math.max(0, (at - start) / w));
		start += w;
		return t;
	});
}

function reducedMotion() {
	return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function canStage() {
	if (typeof window === 'undefined' || !window.matchMedia) return true;
	return window.matchMedia(STAGE_QUERY).matches;
}

export function StoryStage({ id, title, scenes }: { id: string; title: React.ReactNode; scenes: StageScene[] }) {
	const wrapRef = React.useRef<HTMLElement>(null);
	const stageRef = React.useRef<HTMLDivElement>(null);
	const lineRef = React.useRef<HTMLDivElement>(null);
	const [staged, setStaged] = React.useState(canStage);
	const [index, setIndex] = React.useState(0);
	const [settled, setSettled] = React.useState(0);
	const [inView, setInView] = React.useState(false);
	const [near, setNear] = React.useState(false);
	const measured = React.useRef(false);
	const weights = React.useMemo(() => scenes.map((s) => s.weight ?? 1), [scenes]);
	const total = weights.reduce((a, b) => a + b, 0);
	const times = React.useMemo(() => scenes.map(() => new SceneTime()), [scenes]);

	React.useEffect(() => {
		if (typeof window === 'undefined' || !window.matchMedia) return undefined;
		const mq = window.matchMedia(STAGE_QUERY);
		const apply = () => setStaged(mq.matches);
		mq.addEventListener?.('change', apply);
		return () => mq.removeEventListener?.('change', apply);
	}, []);

	// How far the section can scroll while its stage is pinned.
	const range = React.useCallback(() => {
		const wrap = wrapRef.current;
		const stage = stageRef.current;
		if (!wrap || !stage) return 0;
		return Math.max(0, wrap.offsetHeight - stage.offsetHeight);
	}, []);

	React.useEffect(() => {
		if (!staged) return undefined;
		let frame = 0;
		const measure = () => {
			frame = 0;
			const wrap = wrapRef.current;
			if (!wrap) return;
			const r = wrap.getBoundingClientRect();
			const { p, index: at } = stageProgress(-r.top, range(), weights);
			// The dot, every frame the page moved: straight to the style, no render.
			lineRef.current?.style.setProperty('--story-progress', String(p));
			// And each small piece's own place in its stretch, the same way.
			sceneTimes(p, weights).forEach((t, i) => times[i].set(t));
			setIndex(at);
			// The first reading is where the page opened, not a move: no entrance.
			if (!measured.current) {
				measured.current = true;
				setSettled(at);
			}
			setInView(r.bottom > 0 && r.top < window.innerHeight);
			setNear(r.bottom > -600 && r.top < window.innerHeight + 600);
		};
		const schedule = () => {
			if (!frame) frame = window.requestAnimationFrame(measure);
		};
		measure();
		window.addEventListener('scroll', schedule, { passive: true });
		window.addEventListener('resize', schedule);
		return () => {
			window.removeEventListener('scroll', schedule);
			window.removeEventListener('resize', schedule);
			if (frame) window.cancelAnimationFrame(frame);
		};
	}, [staged, range, weights, times]);

	// The live plate follows the shown scene once its entrance has settled.
	React.useEffect(() => {
		if (reducedMotion()) {
			setSettled(index);
			return undefined;
		}
		const t = window.setTimeout(() => setSettled(index), SETTLE_MS);
		return () => window.clearTimeout(t);
	}, [index]);

	// Fetch the shown scene's plate and its neighbors' before they are needed.
	React.useEffect(() => {
		if (!staged || !near) return;
		for (const i of [index, index + 1, index - 1]) {
			const src = scenes[i]?.live;
			if (src) loadFragment(src).catch(() => {
				/* its still stays */
			});
		}
	}, [staged, near, index, scenes]);

	// A marker puts the dot on itself: the start of its scene's stretch.
	const goTo = (i: number) => {
		const wrap = wrapRef.current;
		if (!wrap) return;
		const start = weights.slice(0, i).reduce((a, b) => a + b, 0);
		const top = window.scrollY + wrap.getBoundingClientRect().top + (start * range()) / total + 2;
		// A jump, not a glide: the scene transition is the motion.
		window.scrollTo({ top, behavior: 'auto' });
	};

	if (!staged) {
		return (
			<section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 overflow-x-clip pt-8">
				<div className="mb-8">{title}</div>
				{scenes.map((s) => (
					<div key={s.key} className="mb-16">
						{s.render(undefined)}
					</div>
				))}
			</section>
		);
	}

	return (
		<section
			id={id}
			ref={wrapRef}
			aria-labelledby={`${id}-title`}
			className="story-stage relative"
			style={{ height: `calc(100svh + ${total} * var(--story-step))` }}
		>
			<div ref={stageRef} className="sticky top-0 flex h-svh flex-col pt-14 pb-5 lg:pb-6">
				<div className="flex flex-wrap items-end gap-x-10 gap-y-1 pt-4 pb-3 lg:pt-6 lg:pb-5">
					{title}
					{/* The timeline: one stretch per scene, a marker at the start of
					    each, and a dot that is the reader's place in the section. */}
					<div ref={lineRef} className="story-line min-w-64 flex-1" style={{ '--story-progress': 0 } as React.CSSProperties}>
						<ol className="m-0 flex list-none p-0" aria-label="Scenes">
							{scenes.map((s, i) => (
								<li key={s.key} className="m-0 min-w-0" style={{ flex: `${weights[i]} 1 0%` }}>
									<button
										type="button"
										onClick={() => goTo(i)}
										aria-label={`${s.n} ${s.label}`}
										aria-current={i === index ? 'step' : undefined}
										data-reached={i <= index ? '' : undefined}
										data-minor={s.minor ? '' : undefined}
										className={cn(
											'story-marker type-data flex h-11 w-full min-w-0 items-end gap-2 pb-3 pl-2 text-left text-tiny tracking-legend transition-colors duration-1 ease-out focus-visible:outline-2 focus-visible:outline-ring',
											i === index ? 'text-ink' : 'text-ink-3 hover:text-ink-2'
										)}
									>
										<span>{s.n}</span>
										{s.minor ? null : <span className="type-legend hidden truncate text-current lg:inline">{s.label}</span>}
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
				<div className="relative min-h-0 flex-1">
					{scenes.map((s, i) => (
						<div
							key={s.key}
							className="story-scene"
							data-state={i === index ? 'active' : i < index ? 'past' : 'future'}
							// Tabbing into a scene that is not shown brings it on stage.
							onFocusCapture={() => {
								if (i !== index) goTo(i);
							}}
						>
							{s.render(inView && settled === i, times[i])}
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
