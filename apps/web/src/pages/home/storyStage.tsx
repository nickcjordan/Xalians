// Tier: featured component. The home story's stage: the story's scenes shown
// one at a time. The section pins a full-height stage while the reader scrolls
// through it; each stretch of scroll is one scene, and crossing into the next
// stretch sends the current scene out and brings the next one in (the frame
// drifts and fades in the direction of travel, then its caption plate slides
// out from behind it). The transitions themselves are CSS (`.story-scene` in
// globals.css), keyed off each scene's state, so reversing direction plays them
// backward for free.
//
// Only one scene's living plate is ever in the DOM. The outgoing scene keeps its
// plate playing while it fades; the incoming one shows its still, which is the
// plate's own first frame, and goes live once its entrance has settled, so the
// swap is invisible. A scene off the stage, or a stage off the screen, holds no
// SVG at all.
//
// A window too short for a scene and its caption (a phone on its side) gets the
// scenes stacked in the page instead, where the plate most in view is live.
import * as React from 'react';
import { cn } from '@/lib/utils';
import { loadFragment } from '@/components/plates/plateStage';

export type StageScene = {
	key: string;
	/** The scene's numeral on the rail, e.g. "01". */
	n: string;
	/** What the rail's key announces, e.g. "The Age of Unbirth". */
	label: string;
	/** A living plate's fragment, fetched ahead while its scene is next. */
	live?: string;
	/**
	 * The scene itself. `live` says whether its plate is the page's live one;
	 * undefined when the scenes are stacked and each plate decides for itself.
	 */
	render: (live: boolean | undefined) => React.ReactNode;
};

// The incoming frame's entrance (delay plus transform, see `.story-scene`)
// is over by now; the live plate takes over from its still only after it.
const SETTLE_MS = 1150;
// A scene and its caption need this much height; below it the scenes stack.
const STAGE_QUERY = '(min-height: 560px)';

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
	const [staged, setStaged] = React.useState(canStage);
	const [index, setIndex] = React.useState(0);
	const [settled, setSettled] = React.useState(0);
	const [inView, setInView] = React.useState(false);
	const [near, setNear] = React.useState(false);
	const measured = React.useRef(false);

	React.useEffect(() => {
		if (typeof window === 'undefined' || !window.matchMedia) return undefined;
		const mq = window.matchMedia(STAGE_QUERY);
		const apply = () => setStaged(mq.matches);
		mq.addEventListener?.('change', apply);
		return () => mq.removeEventListener?.('change', apply);
	}, []);

	// The scroll position picks the scene: each scene holds one step of scroll.
	const step = React.useCallback(() => {
		const wrap = wrapRef.current;
		const stage = stageRef.current;
		if (!wrap || !stage || scenes.length < 2) return 0;
		return (wrap.offsetHeight - stage.offsetHeight) / (scenes.length - 1);
	}, [scenes.length]);

	React.useEffect(() => {
		if (!staged) return undefined;
		let frame = 0;
		const measure = () => {
			frame = 0;
			const wrap = wrapRef.current;
			if (!wrap) return;
			const r = wrap.getBoundingClientRect();
			const s = step();
			const at = s > 0 ? Math.min(scenes.length - 1, Math.max(0, Math.round(-r.top / s))) : 0;
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
	}, [staged, step, scenes.length]);

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

	const goTo = (i: number) => {
		const wrap = wrapRef.current;
		if (!wrap) return;
		const top = window.scrollY + wrap.getBoundingClientRect().top + i * step() + 1;
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
			style={{ height: `calc(100svh + ${scenes.length - 1} * var(--story-step))` }}
		>
			<div ref={stageRef} className="sticky top-0 flex h-svh flex-col pt-14 pb-6">
				<div className="flex items-end justify-between gap-6 pt-5 pb-5 lg:pt-7">
					{title}
					<ol className="m-0 flex list-none items-end gap-1 p-0" aria-label="Scenes">
						{scenes.map((s, i) => (
							<li key={s.key} className="m-0">
								<button
									type="button"
									onClick={() => goTo(i)}
									aria-label={`${s.n} ${s.label}`}
									aria-current={i === index ? 'step' : undefined}
									className={cn(
										'type-data flex flex-col items-center gap-1.5 px-2 pt-1 pb-0 text-tiny tracking-legend transition-colors duration-1 ease-out focus-visible:outline-2 focus-visible:outline-ring',
										i === index ? 'text-ink' : 'text-ink-4 hover:text-ink-2'
									)}
								>
									{s.n}
									<span aria-hidden="true" className={cn('block h-0.5 w-6 transition-colors duration-1 ease-out', i === index ? 'bg-ink' : 'bg-edge-strong')} />
								</button>
							</li>
						))}
					</ol>
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
							{s.render(inView && settled === i)}
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
