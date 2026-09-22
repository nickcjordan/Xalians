import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import * as lore from '../../lore';
import Prose from './Prose';
import LoreArt from './LoreArt';
import { useVisit, useReadMark, markRead, recordStoryPosition } from './trail';
import StoryContents from './StoryContents';
import { SectionHead } from '@/components/system/masthead';
import { usePageTitle } from '@/components/system/head';
import { EmptyState } from '@/components/system/record';
import { ReadingLayout, ReadingRail, ReadingBlock } from '@/components/system/reading-layout';
import { Fold, FoldGroup } from '@/components/system/fold';
import { Timeline, TimelineItem } from '@/components/system/readouts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';

/* ---- records consulted (moved from Tour.js) ----------------------------- */

// Dedupe chips by display name: a world and an entry that share a name (e.g.
// a planet with its own index entry) render one chip, and the world link
// wins since it is the richer record.
export function dedupeRecordsConsulted(worlds, entries) {
	const seenNames = new Set(worlds.map((world) => world.name));
	const uniqueEntries = entries.filter((entry) => {
		if (seenNames.has(entry.title)) return false;
		seenNames.add(entry.title);
		return true;
	});
	return { worlds, entries: uniqueEntries };
}

function RecordsConsulted({ beat }) {
	if (beat.worlds.length === 0 && beat.entries.length === 0) return null;
	const { worlds, entries } = dedupeRecordsConsulted(beat.worlds, beat.entries);
	return (
		<div className="flex flex-col gap-2">
			<p className="type-legend m-0">Records consulted</p>
			<div className="flex flex-wrap gap-2 lg:flex-col lg:items-start">
				{worlds.map((world) => (
					<Link key={world.key} to={lore.routeFor('world', world.key)} className={`el-${world.element}`}>
						<Badge variant="chip-outline">{world.name}</Badge>
					</Link>
				))}
				{entries.map((entry) => (
					<Link key={entry.key} to={lore.routeFor('entry', entry.key)} className="text-ink-2 no-underline hover:text-ink">
						<span className="type-legend">{entry.title}</span>
					</Link>
				))}
			</div>
		</div>
	);
}

function NarratorBeat({ beat }) {
	useVisit({ kind: 'beat', key: beat.key, name: beat.title });
	return (
		<ReadingBlock
			margin={<RecordsConsulted beat={beat} />}
			text={
				<>
					<SectionHead title={beat.title} />
					<Prose text={beat.prose} />
					<LoreArt kind="beats" recordKey={beat.key} />
				</>
			}
		/>
	);
}

/* ---- from the records: paragraphs, grouped by world ---------------------- */

// Flattens every section's paragraphs and groups them by world, in order of
// each world's first appearance -- the section heads (era-story "elsewhere
// in the era" breaks) are dropped; a story part reads as one book grouped by
// the record it comes from, not by the order the chronicle assembled it in.
function groupParagraphsByWorld(sections) {
	const order = [];
	const byWorld = new Map();
	for (const section of sections) {
		for (const paragraph of section.paragraphs) {
			const key = paragraph.world.key;
			if (!byWorld.has(key)) {
				byWorld.set(key, { world: paragraph.world, paragraphs: [] });
				order.push(key);
			}
			byWorld.get(key).paragraphs.push(paragraph);
		}
	}
	return order.map((key) => byWorld.get(key));
}

// First sentence of `text`, for a fold's hint line.
function firstSentence(text) {
	const trimmed = (text || '').trim();
	const match = /^.*?[.!?](?=\s|$)/.exec(trimmed);
	return match ? match[0] : trimmed;
}

function ParagraphRow({ world, index, text }) {
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

	// This row lives inside a Fold's content, not directly in ReadingLayout's
	// grid, so it lays itself out with its own two-column grid mirroring the
	// layout's proportions rather than ReadingBlock's `display: contents`
	// (which only places its children onto an ancestor grid's own tracks).
	return (
		<div
			ref={ref}
			id={`chapter-${world.key}-${index}`}
			data-story-paragraph="true"
			className="grid grid-cols-1 items-start gap-x-8 gap-y-2 border-t border-edge py-4 first:border-t-0 first:pt-0 lg:grid-cols-[minmax(0,1fr)_9rem]"
		>
			<div className="order-2 min-w-0 lg:order-1">
				<Prose text={text} className="m-0" />
				<LoreArt kind="paragraphs" recordKey={`${world.key}:${index}`} />
			</div>
			<div className="order-1 flex items-center gap-2 lg:order-2 lg:justify-end">
				<span className="type-data text-[11px] text-ink-3">{lore.chapterLabel(index)}</span>
				<span className={`inline-block size-1.5 rounded-full ${read ? 'bg-viable' : 'bg-edge-strong'}`} aria-hidden="true" />
			</div>
		</div>
	);
}

// Scrolls to an element that lives inside a fold which has just been asked
// to open: waits two frames for the open state to commit and the content to
// mount, then reuses encyclopediaPage.js's header-offset approach so the
// target does not land under a sticky rail or masthead.
function scrollToIdAfterOpen(id) {
	requestAnimationFrame(() => {
		requestAnimationFrame(() => {
			const target = document.getElementById(id);
			if (!target) return;
			const styles = getComputedStyle(document.documentElement);
			const gap = parseFloat(styles.getPropertyValue('--g-8')) || 0;
			let pinnedHeight = 0;
			document.querySelectorAll('.enc-header, .g-header, header').forEach((el) => {
				const position = getComputedStyle(el).position;
				if (position !== 'sticky' && position !== 'fixed') return;
				const rect = el.getBoundingClientRect();
				if (rect.top <= 0 && rect.bottom > 0) pinnedHeight = Math.max(pinnedHeight, rect.bottom);
			});
			const top = target.getBoundingClientRect().top + window.pageYOffset - (pinnedHeight + gap);
			window.scrollTo(0, Math.max(0, top));
		});
	});
}

function chapterHref(worldKey, index) {
	return `chapter-${worldKey}-${index}`;
}

// Reads the initial set of world keys whose fold should be open on first
// render, derived synchronously from window.location so the page's own
// hash-scroll effect (encyclopediaPage.js) finds the target element the
// first time it runs -- a fold that opens only after a later effect would
// miss that first pass. Recognizes `#chapter-<world>-<index>` and
// `?world=<key>`.
function initialOpenWorldKeys(hash, search) {
	const open = new Set();
	if (hash) {
		const id = hash.replace(/^#/, '');
		const match = /^chapter-(.+)-(\d+)$/.exec(id);
		if (match) open.add(match[1]);
	}
	if (search) {
		const params = new URLSearchParams(search);
		const world = params.get('world');
		if (world) open.add(world);
	}
	return open;
}

function RecordsByWorld({ sections }) {
	const location = useLocation();
	const groups = useMemo(() => groupParagraphsByWorld(sections), [sections]);

	const [openKeys, setOpenKeys] = useState(() => initialOpenWorldKeys(
		typeof window !== 'undefined' ? window.location.hash : '',
		typeof window !== 'undefined' ? window.location.search : ''
	));
	const [allOpen, setAllOpen] = useState(false);

	const prevHash = useRef(location.hash);
	useEffect(() => {
		if (prevHash.current === location.hash) return;
		prevHash.current = location.hash;
		const match = /^#chapter-(.+)-(\d+)$/.exec(location.hash || '');
		if (!match) return;
		const worldKey = match[1];
		const id = chapterHref(worldKey, match[2]);
		setOpenKeys((prev) => {
			if (prev.has(worldKey)) return prev;
			const next = new Set(prev);
			next.add(worldKey);
			return next;
		});
		scrollToIdAfterOpen(id);
	}, [location.hash]);

	if (groups.length === 0) return null;

	const totalParagraphs = groups.reduce((sum, g) => sum + g.paragraphs.length, 0);

	function toggleAll() {
		if (allOpen) {
			setOpenKeys(new Set());
			setAllOpen(false);
		} else {
			setOpenKeys(new Set(groups.map((g) => g.world.key)));
			setAllOpen(true);
		}
	}

	return (
		<ReadingBlock
			span="wide"
			divided
		>
			<div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-2">
				<SectionHead title="From the records" count={`${totalParagraphs} paragraph${totalParagraphs === 1 ? '' : 's'}`} className="mb-0" />
				<Button type="button" variant="ghost" size="sm" className="ml-auto" onClick={toggleAll}>
					{allOpen ? 'Collapse all' : 'Expand all'}
				</Button>
			</div>
			<FoldGroup>
				{groups.map((group) => {
					const isOpen = openKeys.has(group.world.key);
					return (
						<Fold
							key={group.world.key}
							id={`records-${group.world.key}`}
							defaultOpen={isOpen}
							label={
								<span className={`el-${group.world.element}`}>
									<Badge variant="chip-outline">{group.world.name}</Badge>
								</span>
							}
							count={`${group.paragraphs.length} chapter${group.paragraphs.length === 1 ? '' : 's'}`}
							hint={firstSentence(group.paragraphs[0].text)}
						>
							<div className="flex flex-col">
								{group.paragraphs.map((p) => (
									<ParagraphRow key={`${p.world.key}:${p.index}`} world={p.world} index={p.index} text={p.text} />
								))}
							</div>
						</Fold>
					);
				})}
			</FoldGroup>
		</ReadingBlock>
	);
}

/* ---- fixed points: events ------------------------------------------------ */

export function groupEvents(events) {
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

function WorldChips({ planets }) {
	if (planets.length === 0) return null;
	return (
		<span className="flex flex-wrap items-center gap-2">
			{planets.map((planet) => (
				<Link key={planet.key} to={lore.routeFor('world', planet.key)} className={`el-${planet.element}`}>
					<Badge variant="chip-outline">{planet.name}</Badge>
				</Link>
			))}
		</span>
	);
}

function EventBody({ event }) {
	return (
		<>
			{event.entry && (
				<Link to={lore.routeFor('entry', event.entry.key)} className="mb-2 inline-block text-ink-2 no-underline hover:text-ink">
					<span className="type-legend">{event.entry.title}</span>
				</Link>
			)}
			{event.anchors.length > 0 && (
				<div className="flex flex-col gap-2">
					{event.anchors.map((anchor, i) => (
						<p key={i} className="m-0 font-body text-small text-ink-2">
							<Link
								to={`${lore.routeFor('world', anchor.world.key)}#chapter-${anchor.world.key}-${anchor.index}`}
								className="text-ink-2 no-underline hover:text-ink"
							>
								<span className="type-legend">
									{anchor.world.name}, {lore.chapterLabel(anchor.index)}
								</span>
							</Link>{' '}
							&ldquo;{anchor.quote}&rdquo;
						</p>
					))}
				</div>
			)}
		</>
	);
}

// The event key named by a `#event-<key>` hash, when it belongs to this part.
function hashEventKey(hash, eventKeys) {
	const match = /^#?event-(.+)$/.exec((hash || '').replace(/^#/, ''));
	return match && eventKeys.has(match[1]) ? match[1] : null;
}

/**
 * Fixed points: the era's events as a timeline inside one Fold, closed by
 * default like the records-by-world groups, so a part reads as the narrator's
 * chapter first. A deep link to an event (`#event-<key>`, from the galaxy map
 * pins, an entry page or a Connections sample) opens the fold on first render
 * and on later hash changes.
 */
function FixedPoints({ fixedPoints }) {
	const groups = useMemo(() => groupEvents(fixedPoints), [fixedPoints]);
	const location = useLocation();
	const eventKeys = useMemo(() => new Set(fixedPoints.map((event) => event.key)), [fixedPoints]);
	const [open, setOpen] = useState(() => Boolean(hashEventKey(
		typeof window !== 'undefined' ? window.location.hash : '',
		eventKeys
	)));
	const prevHash = useRef(location.hash);
	useEffect(() => {
		if (prevHash.current === location.hash) return;
		prevHash.current = location.hash;
		const key = hashEventKey(location.hash, eventKeys);
		if (!key) return;
		setOpen(true);
		scrollToIdAfterOpen(`event-${key}`);
	}, [location.hash, eventKeys]);

	if (groups.length === 0) return null;
	const first = fixedPoints[0];
	const hint = fixedPoints.length > 1 ? `${first.title}, and ${fixedPoints.length - 1} more` : first.title;
	return (
		<ReadingBlock span="wide" divided>
			<Fold
				id="fixed-points"
				label="Fixed points"
				count={`${fixedPoints.length} event${fixedPoints.length === 1 ? '' : 's'}`}
				hint={hint}
				open={open}
				onOpenChange={setOpen}
			>
			<Timeline>
				{groups.map((group) =>
					group.events.map((event) => (
						<TimelineItem
							key={event.key}
							id={`event-${event.key}`}
							titleAs="sentence"
							date={
								<span className="flex flex-wrap items-center gap-2">
									{group.kind === 'contemporaneous' && group.events.length > 1 && (
										<span className="type-legend text-ink-3">Around the same time</span>
									)}
									<WorldChips planets={event.planets} />
								</span>
							}
							title={event.title}
						>
							<EventBody event={event} />
						</TimelineItem>
					))
				)}
			</Timeline>
			</Fold>
		</ReadingBlock>
	);
}

/* ---- part rail ------------------------------------------------------------ */

function PartRailBody({ story, part, progress }) {
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
			<p className="type-data m-0 mt-4 border-t border-edge pt-4 text-[11px] leading-relaxed text-ink-3">
				Part {part.order} of {story.parts.length}
				{progress > 0 && (
					<>
						<br />
						{progress} read
					</>
				)}
			</p>
		</>
	);
}

/* ---- part page ------------------------------------------------------------ */

function StoryContentsPage() {
	usePageTitle('The Story');
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
	const navigate = useNavigate();
	const story = useMemo(() => lore.getStory(), []);
	const part = lore.getStoryPart(eraKey);

	usePageTitle(part ? `Part ${part.order}: ${part.era.name}` : 'Not found');

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
				navigate(lore.routeFor('era', part.prev));
			} else if (e.key === 'ArrowRight' && part.next) {
				navigate(lore.routeFor('era', part.next));
			}
		}
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, [part, navigate]);

	if (!part) {
		return (
			<div>
				<Link to="/encyclopedia/story" className="mb-4 inline-block text-ink-2 underline decoration-ink-3 underline-offset-4 hover:decoration-ink">&laquo; Back to The Story</Link>
				<EmptyState legend="Not found">No record for &ldquo;{eraKey}&rdquo;.</EmptyState>
			</div>
		);
	}

	return (
		<div>
			<ReadingLayout>
				<ReadingRail label={`Part ${part.order} of ${story.parts.length}`}>
					<PartRailBody story={story} part={part} progress={progress} />
				</ReadingRail>

				{part.plate && (
					<ReadingBlock span="wide">
						<figure className="m-0">
							<img
								src={part.plate.srcSmall}
								width={768}
								height={384}
								alt={part.plate.alt}
								loading="eager"
								decoding="async"
								className="block h-auto w-full"
							/>
							<figcaption className="border-b border-edge py-3 font-body text-small text-ink-2">{part.plate.caption}</figcaption>
						</figure>
					</ReadingBlock>
				)}

				<ReadingBlock text={<p className="m-0 font-body text-lead text-ink-2">{part.era.definition}</p>} />

				{part.beats.map((beat) => (
					<NarratorBeat key={beat.key} beat={beat} />
				))}

				<RecordsByWorld sections={part.sections} />

				<FixedPoints fixedPoints={part.fixedPoints} />

				<ReadingBlock
					text={
						<>
							<div className="mt-4 flex justify-between gap-4 max-sm:flex-col max-sm:items-stretch">
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
									<Button asChild className="h-auto min-w-0 shrink py-2 whitespace-normal text-left">
										{/* The label carries a part number and an era name, wider
										    than the row it sits in at several widths. The button
										    base is `shrink-0`, so without `shrink` + `min-w-0` it
										    refused to give ground and pushed its arrow off the
										    page instead of wrapping. */}
										<Link to={lore.routeFor('era', part.next)}>
											<span className="min-w-0">Continue to Part {part.order + 1}: {lore.getStoryPart(part.next).era.name}</span> <ArrowRight className="shrink-0" />
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
						</>
					}
				/>
			</ReadingLayout>
		</div>
	);
}

export default function Story() {
	const { era: eraKey } = useParams();
	return eraKey ? <StoryPart /> : <StoryContentsPage />;
}
