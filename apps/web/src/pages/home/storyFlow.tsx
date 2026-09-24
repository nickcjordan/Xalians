// Tier: featured component. The home story, told in the page's own scroll
// (docs/design/home-story-content-plan.md, section 5): its beats one after
// another at their natural height, nothing pinned and nothing driven by the
// scroll position (Nick, 2026-09-24: the pinned stage "technically works, but
// it's buggy and it feels gross").
//
// What the pinned stage was for is kept by other means: only one animated
// thing on the page at a time. Every living plate and every small piece joins
// the page's plate stage (components/plates/plateStage.ts), where the one most
// in view is live and everything else holds a still or nothing.
//
// A slim chapter bar sticks to the top of the screen while the story is on it.
// Its markers sit where the beats really are in the section, its dot is the
// middle of the screen, and a marker jumps to its beat. It follows the scroll;
// it never holds it.
import * as React from 'react';
import { cn } from '@/lib/utils';

export type FlowBeat = {
	key: string;
	/** The beat's numeral, e.g. "01". */
	n: string;
	/** Its name on the chapter bar and in its marker's label. */
	label: string;
	/** A small piece: a minor tick on the bar, its numeral only. */
	minor?: boolean;
	node: React.ReactNode;
};

/**
 * Where the dot and the markers sit: each beat's start, and the middle of the
 * screen, as fractions of the section. `tops` are the beats' offsets from the
 * section's top; `middle` is the screen's middle, from the same top.
 */
export function flowPositions(tops: number[], height: number, middle: number) {
	const f = (y: number) => (height > 0 ? Math.min(1, Math.max(0, y / height)) : 0);
	let current = 0;
	tops.forEach((t, i) => {
		if (middle >= t) current = i;
	});
	return { markers: tops.map(f), dot: f(middle), current };
}

export function StoryFlow({ id, title, beats }: { id: string; title: React.ReactNode; beats: FlowBeat[] }) {
	const wrapRef = React.useRef<HTMLElement>(null);
	const bodyRef = React.useRef<HTMLDivElement>(null);
	const lineRef = React.useRef<HTMLDivElement>(null);
	const [markers, setMarkers] = React.useState<number[]>(() => beats.map((_, i) => i / beats.length));
	const [current, setCurrent] = React.useState(0);

	React.useEffect(() => {
		const body = bodyRef.current;
		if (!body || typeof window === 'undefined') return undefined;
		let frame = 0;
		const measure = () => {
			frame = 0;
			const r = body.getBoundingClientRect();
			const tops = [...body.querySelectorAll<HTMLElement>(':scope > [data-beat]')].map((el) => el.getBoundingClientRect().top - r.top);
			const at = flowPositions(tops, r.height, window.innerHeight / 2 - r.top);
			// The dot, every frame the page moved: straight to the style, no render.
			lineRef.current?.style.setProperty('--story-progress', String(at.dot));
			setCurrent(at.current);
			setMarkers((m) => (m.length === at.markers.length && m.every((v, i) => Math.abs(v - at.markers[i]) < 0.001) ? m : at.markers));
		};
		const schedule = () => {
			if (!frame) frame = window.requestAnimationFrame(measure);
		};
		measure();
		window.addEventListener('scroll', schedule, { passive: true });
		window.addEventListener('resize', schedule);
		// Paintings and fonts change the beats' heights after the first layout.
		const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
		ro?.observe(body);
		return () => {
			window.removeEventListener('scroll', schedule);
			window.removeEventListener('resize', schedule);
			ro?.disconnect();
			if (frame) window.cancelAnimationFrame(frame);
		};
	}, [beats.length]);

	const goTo = (key: string) => {
		const el = document.getElementById(`beat-${key}`);
		if (!el) return;
		const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
	};

	return (
		<section id={id} ref={wrapRef} aria-labelledby={`${id}-title`} className="story-flow relative scroll-mt-24 pt-8">
			<div className="mb-2">{title}</div>
			{/* The chapter bar: sticky while the story is on the screen, never holding it. */}
			<div className="sticky top-0 z-30 -mx-4 mb-6 bg-room/92 px-4 pt-3 pb-2 backdrop-blur-sm sm:-mx-6 sm:px-6">
				<div ref={lineRef} className="story-line relative h-9" style={{ '--story-progress': 0 } as React.CSSProperties}>
					<ol className="m-0 list-none p-0" aria-label="Chapters">
						{beats.map((b, i) => (
							<li key={b.key} className="absolute top-0 m-0" style={{ left: `${(markers[i] ?? 0) * 100}%` }}>
								<button
									type="button"
									onClick={() => goTo(b.key)}
									aria-label={`${b.n} ${b.label}`}
									aria-current={i === current ? 'step' : undefined}
									data-reached={i <= current ? '' : undefined}
									data-minor={b.minor ? '' : undefined}
									className={cn(
										'story-marker type-data flex h-9 items-end gap-2 pb-3 pl-2 text-left text-tiny tracking-legend whitespace-nowrap transition-colors duration-1 ease-out focus-visible:outline-2 focus-visible:outline-ring',
										i === current ? 'text-ink' : 'text-ink-3 hover:text-ink-2'
									)}
								>
									<span>{b.n}</span>
									{b.minor ? null : <span className="type-legend hidden text-current xl:inline">{b.label}</span>}
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
			<div ref={bodyRef} className="flex flex-col">
				{beats.map((b) => (
					<div key={b.key} id={`beat-${b.key}`} data-beat={b.key} className={cn('scroll-mt-20', b.minor ? 'py-10 lg:py-14' : 'py-12 lg:py-20')}>
						{b.node}
					</div>
				))}
			</div>
		</section>
	);
}
