import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useHistory, useParams } from 'react-router-dom';
import * as lore from '../../lore';
import Prose from './Prose';
import { useVisit, useReadMark, markRead, recordStoryPosition } from './trail';
import StoryContents from './StoryContents';
import { SectionHead } from '@/components/system/masthead';
import { EmptyState } from '@/components/system/record';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { ArrowLeft, ArrowRight } from 'lucide-react';

const PHONE_QUERY = '(max-width: 900px)';

function useIsPhone() {
	const [isPhone, setIsPhone] = useState(() => (
		typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(PHONE_QUERY).matches : false
	));
	useEffect(() => {
		if (typeof window === 'undefined' || !window.matchMedia) return undefined;
		const mql = window.matchMedia(PHONE_QUERY);
		const onChange = () => setIsPhone(mql.matches);
		mql.addEventListener ? mql.addEventListener('change', onChange) : mql.addListener(onChange);
		return () => {
			mql.removeEventListener ? mql.removeEventListener('change', onChange) : mql.removeListener(onChange);
		};
	}, []);
	return isPhone;
}

/* ---- narrator: beats (moved from Tour.js) ------------------------------ */

function RecordsConsulted({ beat }) {
	if (beat.worlds.length === 0 && beat.entries.length === 0) return null;
	return (
		<div className="flex flex-col gap-2">
			<p className="type-legend m-0">Records consulted</p>
			<div className="flex flex-wrap gap-2">
				{beat.worlds.map((world) => (
					<Link key={world.key} to={lore.routeFor('world', world.key)} className={`el-${world.element}`}>
						<Badge variant="chip-outline">{world.name}</Badge>
					</Link>
				))}
				{beat.entries.map((entry) => (
					<Link key={entry.key} to={lore.routeFor('entry', entry.key)}>
						<Badge variant="chip-outline">{entry.title}</Badge>
					</Link>
				))}
			</div>
		</div>
	);
}

function NarratorBeat({ beat, indexInPart, beatCount }) {
	useVisit({ kind: 'beat', key: beat.key, name: beat.title });
	return (
		<Card variant="panel" id={`beat-${beat.key}`} className="mb-8">
			{beatCount > 1 && (
				<p className="type-legend m-0">
					Beat {indexInPart + 1} of {beatCount}
				</p>
			)}
			<h2 className="type-heading m-0">{beat.title}</h2>
			<Prose text={beat.prose} />
			<RecordsConsulted beat={beat} />
		</Card>
	);
}

/* ---- from the records: paragraphs (moved from Reader.js) --------------- */

function MarginNote({ world, index, read }) {
	return (
		<div className="flex flex-col items-start gap-1 pt-0.5 max-sm:flex-row max-sm:items-center max-sm:gap-3">
			<Link to={lore.routeFor('world', world.key)} className={`el-${world.element} max-w-full`}>
				<Badge variant="chip-outline">{world.name}</Badge>
			</Link>
			<span className="type-data text-[11px] text-ink-3">Ch. {String(index).padStart(2, '0')}</span>
			<span className={`inline-block size-1.5 rounded-full ${read ? 'bg-viable' : 'bg-edge-strong'}`} aria-hidden="true" />
		</div>
	);
}

function StoryParagraph({ world, index, text }) {
	const read = useReadMark('chapter', `${world.key}:${index}`);
	const ref = useRef(null);

	useEffect(() => {
		const el = ref.current;
		if (!el || typeof window === 'undefined' || !('IntersectionObserver' in window)) return undefined;
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
						markRead('chapter', `${world.key}:${index}`);
					}
				});
			},
			{ threshold: [0.5] }
		);
		observer.observe(el);
		return () => observer.disconnect();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [world.key, index]);

	return (
		<div
			ref={ref}
			id={`chapter-${world.key}-${index}`}
			data-story-paragraph="true"
			className="grid grid-cols-[8rem_minmax(0,1fr)] items-start gap-4 border-t border-edge py-4 first:border-t-0 max-sm:grid-cols-1"
		>
			<MarginNote world={world} index={index} read={read} />
			<Prose text={text} className="m-0" />
		</div>
	);
}

function RecordsSection({ section, showHead }) {
	return (
		<section className="[&+&]:mt-8">
			{showHead && <p className="type-legend m-0 mb-3">{section.head || 'Elsewhere in the era'}</p>}
			{section.paragraphs.map((p) => (
				<StoryParagraph key={`${p.world.key}:${p.index}`} world={p.world} index={p.index} text={p.text} />
			))}
		</section>
	);
}

/* ---- fixed points: events (simplified from EraView.js) ----------------- */

function groupEvents(events) {
	const groups = [];
	let current = null;
	for (const event of events) {
		if (event.firmness === 'firm') {
			groups.push({ kind: 'firm', order: event.order, events: [event] });
			current = null;
			continue;
		}
		if (current && current.order === event.order) {
			current.events.push(event);
		} else {
			current = { kind: 'contemporaneous', order: event.order, events: [event] };
			groups.push(current);
		}
	}
	return groups;
}

function EventAnchors({ anchors }) {
	if (anchors.length === 0) return null;
	return (
		<div className="mt-3 flex flex-col gap-3">
			{anchors.map((anchor, i) => (
				<div key={i}>
					<Link
						to={`${lore.routeFor('world', anchor.world.key)}#chapter-${anchor.world.key}-${anchor.index}`}
						className="inline-block text-ink no-underline hover:underline"
					>
						{anchor.world.name} CH. {String(anchor.index).padStart(2, '0')}
					</Link>
					<p className="type-data m-0 whitespace-normal break-words text-small text-ink-2">&ldquo;{anchor.quote}&rdquo;</p>
				</div>
			))}
		</div>
	);
}

function FixedPointCard({ event }) {
	return (
		<Card variant="panel" id={`event-${event.key}`}>
			<div className="flex flex-wrap items-baseline justify-between gap-3">
				<span className="type-heading m-0 text-[19px]">{event.title}</span>
				{event.planets.length > 0 && (
					<span className="flex flex-wrap gap-2">
						{event.planets.map((planet) => (
							<span key={planet.key} className={`el-${planet.element}`}>
								<Badge variant="chip-outline">{planet.name}</Badge>
							</span>
						))}
					</span>
				)}
			</div>
			{event.entry && (
				<Link to={lore.routeFor('entry', event.entry.key)} className="my-3 inline-block text-ink underline decoration-ink-3 underline-offset-4 hover:decoration-ink">
					Entry: {event.entry.title}
				</Link>
			)}
			<EventAnchors anchors={event.anchors} />
		</Card>
	);
}

function ContemporaneousCard({ group }) {
	return (
		<Card variant="panel">
			<p className="type-legend m-0">Contemporaneous, unordered</p>
			{group.events.map((event) => (
				<div id={`event-${event.key}`} key={event.key} className="[&+&]:mt-5 [&+&]:border-t [&+&]:border-edge [&+&]:pt-5">
					<h4 className="type-heading m-0 text-[19px]">{event.title}</h4>
					{event.planets.length > 0 && (
						<div className="mt-3 flex flex-wrap gap-2">
							{event.planets.map((planet) => (
								<Link key={planet.key} to={lore.routeFor('world', planet.key)} className={`el-${planet.element}`}>
									<Badge variant="chip-outline">{planet.name}</Badge>
								</Link>
							))}
						</div>
					)}
					{event.entry && (
						<Link to={lore.routeFor('entry', event.entry.key)} className="my-3 inline-block text-ink underline decoration-ink-3 underline-offset-4 hover:decoration-ink">
							Entry: {event.entry.title}
						</Link>
					)}
					<EventAnchors anchors={event.anchors} />
				</div>
			))}
		</Card>
	);
}

function FixedPoints({ fixedPoints }) {
	const groups = useMemo(() => groupEvents(fixedPoints), [fixedPoints]);
	if (groups.length === 0) return null;
	return (
		<section className="mt-8">
			<SectionHead title="Fixed points" count={groups.length} />
			<div className="flex flex-col gap-4">
				{groups.map((group, i) =>
					group.kind === 'firm' ? (
						<FixedPointCard key={group.events[0].key} event={group.events[0]} />
					) : (
						<ContemporaneousCard key={`group-${group.order}-${i}`} group={group} />
					)
				)}
			</div>
		</section>
	);
}

/* ---- sticky part rail ---------------------------------------------------- */

function PartRailBody({ story, part }) {
	return (
		<>
			<ol className="m-0 flex list-none flex-col p-0">
				{story.parts.map((p) => (
					<li key={p.era.key}>
						<Link
							to={lore.routeFor('era', p.era.key)}
							className={`flex items-baseline gap-3 border-l-2 py-2 pl-3 text-ink-2 no-underline hover:text-ink ${p.era.key === part.era.key ? 'border-l-viable text-ink' : 'border-l-transparent'}`}
							aria-current={p.era.key === part.era.key ? 'true' : undefined}
						>
							<span className={`type-data text-[11px] ${p.era.key === part.era.key ? 'text-viable' : 'text-ink-3'}`}>{String(p.order).padStart(2, '0')}</span>
							<span className="type-legend text-[13px]">{p.era.name}</span>
						</Link>
					</li>
				))}
			</ol>
			{part.worlds.length > 0 && (
				<div className="mt-4 border-t border-edge pt-4">
					<p className="type-legend m-0 mb-3">Worlds in this part</p>
					<div className="flex flex-wrap gap-2">
						{part.worlds.map((world) => (
							<Link key={world.key} to={lore.routeFor('world', world.key)} className={`el-${world.element}`}>
								<Badge variant="chip-outline">{world.name}</Badge>
							</Link>
						))}
					</div>
				</div>
			)}
			{part.fixedPoints.length > 0 && (
				<div className="mt-4 border-t border-edge pt-4">
					<p className="type-legend m-0 mb-3">Fixed points</p>
					<ul className="m-0 flex flex-col gap-2 p-0 text-small">
						{part.fixedPoints.map((event) => (
							<li key={event.key}>
								<a href={`#event-${event.key}`} className="text-ink underline decoration-ink-3 underline-offset-4 hover:decoration-ink">
									{event.title}
								</a>
							</li>
						))}
					</ul>
				</div>
			)}
		</>
	);
}

function PartRail({ story, part, progress }) {
	const isPhone = useIsPhone();

	if (isPhone) {
		return (
			<Accordion type="single" collapsible className="mb-5">
				<AccordionItem value="part-rail" className="border border-edge bg-s0 px-4">
					<AccordionTrigger className="hover:no-underline">
						<h3 className="type-legend m-0 text-ink-2">
							Part {part.order} of {story.parts.length}
						</h3>
					</AccordionTrigger>
					<AccordionContent>
						<p className="type-data m-0 mb-3 text-[11px] text-ink-3">
							{progress} / {part.sections.reduce((sum, s) => sum + s.paragraphs.length, 0)} read in this part
						</p>
						<PartRailBody story={story} part={part} />
					</AccordionContent>
				</AccordionItem>
			</Accordion>
		);
	}

	return (
		<nav className="sticky top-5 flex max-h-[calc(100vh-64px)] flex-col gap-4 overflow-y-auto pb-3" aria-label="Story parts">
			<PartRailBody story={story} part={part} />
			<p className="type-data m-0 border-t border-edge pt-4 text-[11px] leading-relaxed text-ink-3">
				Part {part.order} of {story.parts.length}
				<br />
				{progress} read
			</p>
		</nav>
	);
}

/* ---- part page ------------------------------------------------------------ */

function StoryContentsPage() {
	const story = useMemo(() => lore.getStory(), []);
	useVisit({ kind: 'story', key: 'story', name: story.title });
	return (
		<div>
			<p className="mb-6 max-w-[62ch] font-body text-body text-ink-2">
				Seven parts, one for each era the Generator's records carry. Begin at Part 1, or open any part below.
			</p>
			<StoryContents story={story} />
		</div>
	);
}

function StoryPart() {
	const { era: eraKey } = useParams();
	const history = useHistory();
	const story = useMemo(() => lore.getStory(), []);
	const part = lore.getStoryPart(eraKey);

	const [progress, setProgress] = useState(0);

	useVisit(part ? { kind: 'era', key: part.era.key, name: part.era.name } : { kind: null, key: null });

	useEffect(() => {
		if (part) recordStoryPosition(part.era.key);
	}, [part]);

	useEffect(() => {
		if (!part) return undefined;
		function recompute() {
			let readKeys;
			try {
				const raw = window.localStorage.getItem('enc.read.v1');
				const read = raw ? JSON.parse(raw) : {};
				readKeys = new Set(
					Object.keys(read || {})
						.filter((k) => k.startsWith('chapter:'))
						.map((k) => k.slice('chapter:'.length))
				);
			} catch (e) {
				readKeys = new Set();
			}
			let count = 0;
			for (const section of part.sections) {
				for (const paragraph of section.paragraphs) {
					if (readKeys.has(`${paragraph.world.key}:${paragraph.index}`)) count += 1;
				}
			}
			setProgress(count);
		}
		recompute();
		window.addEventListener('enc-trail-change', recompute);
		window.addEventListener('storage', recompute);
		return () => {
			window.removeEventListener('enc-trail-change', recompute);
			window.removeEventListener('storage', recompute);
		};
	}, [part]);

	useEffect(() => {
		function onKeyDown(e) {
			const tag = document.activeElement && document.activeElement.tagName;
			if (tag === 'INPUT' || tag === 'TEXTAREA' || (document.activeElement && document.activeElement.isContentEditable)) return;
			if (!part) return;
			if (e.key === 'ArrowLeft' && part.prev) {
				history.push(lore.routeFor('era', part.prev));
			} else if (e.key === 'ArrowRight' && part.next) {
				history.push(lore.routeFor('era', part.next));
			}
		}
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, [part, history]);

	if (!part) {
		return (
			<div>
				<Link to="/encyclopedia/story" className="mb-4 inline-block text-ink-2 underline decoration-ink-3 underline-offset-4 hover:decoration-ink">&laquo; Back to The Story</Link>
				<EmptyState legend="Not found">No record for &ldquo;{eraKey}&rdquo;.</EmptyState>
			</div>
		);
	}

	const beatCount = part.beats.length;

	return (
		<div>
			<div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
				<PartRail story={story} part={part} progress={progress} />
				<div className="min-w-0 max-w-[62ch]">
					{part.plate && (
						<figure className="mb-8 border border-edge-strong bg-s0 p-2 shadow-float">
							<img
								src={part.plate.src}
								srcSet={`${part.plate.srcSmall} 768w, ${part.plate.src} 1536w`}
								sizes="(max-width: 900px) 100vw, 760px"
								width={1536}
								height={768}
								alt={part.plate.alt}
								loading="eager"
								decoding="async"
								className="block h-auto w-full"
							/>
							<figcaption className="mx-0 mt-2 max-w-[70ch] px-2 text-left font-body text-small leading-relaxed text-ink-2">{part.plate.caption}</figcaption>
						</figure>
					)}
					<p className="mb-8 max-w-[62ch] font-body text-body text-ink-2">{part.era.definition}</p>

					{part.beats.map((beat, i) => (
						<NarratorBeat key={beat.key} beat={beat} indexInPart={i} beatCount={beatCount} />
					))}

					{part.sections.length > 0 && (
						<>
							<hr className="m-0 mb-5 border-t border-edge" />
							<p className="type-legend m-0 mb-6">From the records</p>
							{part.sections.map((section, i) => (
								<RecordsSection
									key={`${part.era.key}-${i}`}
									section={section}
									showHead={!(part.sections.length === 1 && section.head === null)}
								/>
							))}
						</>
					)}

					<FixedPoints fixedPoints={part.fixedPoints} />

					<div className="mt-8 flex justify-between gap-4 max-sm:flex-col max-sm:items-stretch">
						{part.prev ? (
							<Button asChild variant="secondary">
								<Link to={lore.routeFor('era', part.prev)}>
									<ArrowLeft /> {lore.getStoryPart(part.prev).era.name}
								</Link>
							</Button>
						) : (
							<span />
						)}
						{part.next && (
							<Button asChild>
								<Link to={lore.routeFor('era', part.next)}>
									Continue to Part {part.order + 1}: {lore.getStoryPart(part.next).era.name} <ArrowRight />
								</Link>
							</Button>
						)}
					</div>

					{!part.next && (
						<div className="mt-7 border-t border-edge pt-5 text-center">
							<p className="type-legend m-0">End of the Story</p>
							<div className="mt-4 flex justify-center gap-4">
								<Button asChild variant="secondary"><Link to="/encyclopedia/species">The Bestiary</Link></Button>
								<Button asChild variant="secondary"><Link to="/encyclopedia/worlds">The Worlds</Link></Button>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

export default function Story() {
	const { era: eraKey } = useParams();
	return eraKey ? <StoryPart /> : <StoryContentsPage />;
}
