import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useHistory, useParams } from 'react-router-dom';
import * as lore from '../../lore';
import Prose from './Prose';
import { useVisit, useReadMark, markRead, recordStoryPosition } from './trail';
import StoryContents from './StoryContents';
import './Story.css';

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
		<div className="enc-story-consulted">
			<p className="g-kicker">Records consulted</p>
			<div className="enc-chips">
				{beat.worlds.map((world) => (
					<Link key={world.key} to={lore.routeFor('world', world.key)} className={`g-chip g-el-${world.element}`}>
						{world.name}
					</Link>
				))}
				{beat.entries.map((entry) => (
					<Link key={entry.key} to={lore.routeFor('entry', entry.key)} className="g-chip g-chip--outline">
						{entry.title}
					</Link>
				))}
			</div>
		</div>
	);
}

function NarratorBeat({ beat, indexInPart, beatCount }) {
	useVisit({ kind: 'beat', key: beat.key, name: beat.title });
	return (
		<div id={`beat-${beat.key}`} className="enc-story-beat">
			{beatCount > 1 && (
				<p className="g-kicker enc-story-beat-kicker">
					Beat {indexInPart + 1} of {beatCount}
				</p>
			)}
			<h2 className="g-h2 enc-story-beat-title">{beat.title}</h2>
			<Prose text={beat.prose} className="enc-story-beat-prose" />
			<RecordsConsulted beat={beat} />
		</div>
	);
}

/* ---- from the records: paragraphs (moved from Reader.js) --------------- */

function MarginNote({ world, index, read }) {
	return (
		<div className="enc-story-note">
			<Link
				to={lore.routeFor('world', world.key)}
				className={`g-chip g-chip--outline g-el-${world.element} enc-story-note-chip`}
			>
				{world.name}
			</Link>
			<span className="g-mono enc-story-note-chapter">Ch. {String(index).padStart(2, '0')}</span>
			<span className={`g-lamp enc-story-note-lamp ${read ? '' : 'g-lamp--off'}`} aria-hidden="true" />
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
			className="enc-story-para"
		>
			<MarginNote world={world} index={index} read={read} />
			<Prose text={text} className="enc-story-para-text" />
		</div>
	);
}

function RecordsSection({ section, showHead }) {
	return (
		<section className="enc-story-section">
			{showHead && <p className="g-kicker enc-story-section-head">{section.head || 'Elsewhere in the era'}</p>}
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
		<div className="g-screen enc-story-event-screen">
			{anchors.map((anchor, i) => (
				<div className="enc-story-anchor" key={i}>
					<Link
						to={`${lore.routeFor('world', anchor.world.key)}#chapter-${anchor.world.key}-${anchor.index}`}
						className="g-screen-line g-screen-line--dim enc-story-anchor-link"
					>
						{anchor.world.name} CH. {String(anchor.index).padStart(2, '0')}
					</Link>
					<p className="g-screen-line enc-quote enc-story-anchor-text">&ldquo;{anchor.quote}&rdquo;</p>
				</div>
			))}
		</div>
	);
}

function FixedPointCard({ event }) {
	return (
		<div id={`event-${event.key}`} className="g-panel g-panel--raised enc-story-event-card">
			<div className="enc-story-event-head">
				<span className="g-h3 enc-story-event-title">{event.title}</span>
				{event.planets.length > 0 && (
					<span className="enc-chips enc-story-event-chips">
						{event.planets.map((planet) => (
							<span key={planet.key} className={`g-chip g-chip--outline g-el-${planet.element}`}>
								{planet.name}
							</span>
						))}
					</span>
				)}
			</div>
			{event.entry && (
				<Link to={lore.routeFor('entry', event.entry.key)} className="g-link enc-story-event-entry">
					Entry: {event.entry.title}
				</Link>
			)}
			<EventAnchors anchors={event.anchors} />
		</div>
	);
}

function ContemporaneousCard({ group }) {
	return (
		<div className="g-panel g-panel--recessed enc-story-event-card">
			<p className="g-kicker">Contemporaneous, unordered</p>
			{group.events.map((event) => (
				<div id={`event-${event.key}`} key={event.key} className="enc-story-event">
					<h4 className="g-h3 enc-story-event-title">{event.title}</h4>
					{event.planets.length > 0 && (
						<div className="enc-chips enc-story-event-chips">
							{event.planets.map((planet) => (
								<Link
									key={planet.key}
									to={lore.routeFor('world', planet.key)}
									className={`g-chip g-chip--outline g-el-${planet.element}`}
								>
									{planet.name}
								</Link>
							))}
						</div>
					)}
					{event.entry && (
						<Link to={lore.routeFor('entry', event.entry.key)} className="g-link enc-story-event-entry">
							Entry: {event.entry.title}
						</Link>
					)}
					<EventAnchors anchors={event.anchors} />
				</div>
			))}
		</div>
	);
}

function FixedPoints({ fixedPoints }) {
	const groups = useMemo(() => groupEvents(fixedPoints), [fixedPoints]);
	if (groups.length === 0) return null;
	return (
		<section className="enc-section enc-story-fixed">
			<div className="enc-section-head">
				<h2 className="g-h2">Fixed points</h2>
				<span className="enc-count">{groups.length}</span>
			</div>
			<div className="enc-story-event-list">
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
			<ol className="enc-story-rail-stations">
				{story.parts.map((p) => (
					<li key={p.era.key}>
						<Link
							to={lore.routeFor('era', p.era.key)}
							className="enc-story-rail-station"
							aria-current={p.era.key === part.era.key ? 'true' : undefined}
						>
							<span className="g-mono enc-story-rail-index">{String(p.order).padStart(2, '0')}</span>
							<span className="enc-story-rail-name">{p.era.name}</span>
						</Link>
					</li>
				))}
			</ol>
			{part.worlds.length > 0 && (
				<div className="enc-story-rail-block">
					<p className="g-kicker enc-story-rail-kicker">Worlds in this part</p>
					<div className="enc-chips">
						{part.worlds.map((world) => (
							<Link key={world.key} to={lore.routeFor('world', world.key)} className={`g-chip g-chip--outline g-el-${world.element}`}>
								{world.name}
							</Link>
						))}
					</div>
				</div>
			)}
			{part.fixedPoints.length > 0 && (
				<div className="enc-story-rail-block">
					<p className="g-kicker enc-story-rail-kicker">Fixed points</p>
					<ul className="enc-story-rail-jumps">
						{part.fixedPoints.map((event) => (
							<li key={event.key}>
								<a href={`#event-${event.key}`} className="g-link">
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
			<details className="g-panel g-panel--recessed enc-story-rail enc-story-rail--phone">
				<summary className="g-panel-head enc-story-rail-summary">
					<h3 className="g-h3">
						Part {part.order} of {story.parts.length}
					</h3>
				</summary>
				<p className="g-mono enc-story-rail-progress">
					{progress} / {part.sections.reduce((sum, s) => sum + s.paragraphs.length, 0)} read in this part
				</p>
				<PartRailBody story={story} part={part} />
			</details>
		);
	}

	return (
		<nav className="enc-story-rail" aria-label="Story parts">
			<PartRailBody story={story} part={part} />
			<p className="g-mono enc-story-rail-progress">
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
		<div className="enc-story enc-story-contents">
			<p className="g-kicker enc-story-kicker">The Story of Xalia</p>
			<h1 className="g-title enc-story-title">{story.title}</h1>
			<p className="g-body enc-prose enc-story-def">
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
			<div className="enc-story">
				<Link to="/encyclopedia/story" className="enc-back">&laquo; Back to The Story</Link>
				<p className="g-empty">No record for &ldquo;{eraKey}&rdquo;.</p>
			</div>
		);
	}

	const beatCount = part.beats.length;

	return (
		<div className="enc-story">
			<div className="enc-story-layout">
				<PartRail story={story} part={part} progress={progress} />
				<div className="enc-story-main">
					<p className="g-kicker enc-story-kicker">Part {part.order} of {story.parts.length}</p>
					<h1 className="g-title enc-story-title">{part.era.name}</h1>
					<p className="g-body enc-prose enc-story-def">{part.era.definition}</p>

					{part.beats.map((beat, i) => (
						<NarratorBeat key={beat.key} beat={beat} indexInPart={i} beatCount={beatCount} />
					))}

					{part.sections.length > 0 && (
						<>
							<hr className="enc-story-rule" />
							<p className="g-kicker enc-story-records-kicker">From the records</p>
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

					<div className="enc-story-nav">
						{part.prev ? (
							<Link to={lore.routeFor('era', part.prev)} className="g-btn enc-story-nav-btn">
								&larr; {lore.getStoryPart(part.prev).era.name}
							</Link>
						) : (
							<span />
						)}
						{part.next && (
							<Link to={lore.routeFor('era', part.next)} className="g-btn enc-story-nav-btn">
								Continue to Part {part.order + 1}: {lore.getStoryPart(part.next).era.name} &rarr;
							</Link>
						)}
					</div>

					{!part.next && (
						<div className="enc-story-end">
							<p className="g-kicker">End of the Story</p>
							<div className="enc-story-end-links">
								<Link to="/encyclopedia/species" className="g-btn enc-story-nav-btn">The Bestiary</Link>
								<Link to="/encyclopedia/worlds" className="g-btn enc-story-nav-btn">The Worlds</Link>
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
