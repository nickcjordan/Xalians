import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import * as lore from '../../lore';
import './GalaxyMap.css';

/**
 * Hand-authored positions honoring canon: Telypso at the exact center;
 * Veridium near the core; Grimedes at the far rim beside a drawn black hole;
 * Zolton on the rim; Stonera inside the drawn Cybele belt; Phantiri off in
 * its own Wraithix system with a moon. The rest are spread for legibility.
 * viewBox is 1000x700; these are raw svg coordinates.
 */
const POSITIONS = {
	telypso: { x: 500, y: 350 },
	veridium: { x: 440, y: 305 },
	magmuth: { x: 640, y: 190 },
	poseidas: { x: 300, y: 230 },
	luminax: { x: 760, y: 470 },
	floria: { x: 545, y: 610 },
	zolton: { x: 880, y: 555 },
	phantiri: { x: 120, y: 175 },
	stonera: { x: 165, y: 480 },
	drainov: { x: 355, y: 590 },
	saiphus: { x: 700, y: 615 },
	krystos: { x: 250, y: 110 },
	grimedes: { x: 905, y: 130 },
	endessa: { x: 815, y: 300 },
};

// Where the black hole sits beside Grimedes, and Phantiri's moon.
const BLACK_HOLE = { x: 945, y: 90 };
const WRAITHIX_MOON = { x: 155, y: 210 };

// One marker per world carrying events, offset up and to the side of the
// disc so it never overlaps the world label printed below the disc.
const PIN_OFFSET = { x: 16, y: -16 };

function WorldEventPin({ world, events, eraKey, onHover, onLeave }) {
	const history = useHistory();
	const pos = POSITIONS[world.key];
	// A single firm event routes straight to its own chronicle anchor; more
	// than one routes to the era, filtered to this world, so the reader can
	// see all of them together.
	const route =
		events.length === 1
			? lore.routeFor('event', `${eraKey}:${events[0].key}`)
			: `${lore.routeFor('era', eraKey)}?world=${world.key}`;

	const go = () => history.push(route);
	const onKeyDown = (e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			go();
		}
	};

	const label =
		events.length === 1
			? `Event at ${world.name}: ${events[0].title}`
			: `${events.length} events at ${world.name}`;

	return (
		<g
			className="enc-map-pin"
			transform={`translate(${pos.x + PIN_OFFSET.x}, ${pos.y + PIN_OFFSET.y})`}
			role="link"
			tabIndex={0}
			aria-label={label}
			onClick={go}
			onKeyDown={onKeyDown}
			onMouseEnter={(e) => onHover(events, e)}
			onMouseLeave={onLeave}
			onFocus={(e) => onHover(events, e)}
			onBlur={onLeave}
		>
			<circle className="enc-map-pin-head" r={9} />
			<circle className="enc-map-pin-ring" r={9} />
			{events.length > 1 && (
				<text className="enc-map-pin-count g-mono" y={3}>
					{events.length}
				</text>
			)}
		</g>
	);
}

function WorldMark({ world, compact, lit, dimLabel, era, onHover, onLeave }) {
	const history = useHistory();
	const pos = POSITIONS[world.key];
	if (!pos) return null;
	// With an era selected and this world lit in it, the record worth opening
	// is that era's page filtered to this world; otherwise, or when the world
	// is dimmed (has no footprint in the era), fall back to its survey record.
	const route =
		era && lit !== false ? `${lore.routeFor('era', era)}?world=${world.key}` : lore.routeFor('world', world.key);

	const go = () => history.push(route);
	const onKeyDown = (e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			go();
		}
	};

	return (
		<g
			className={`enc-map-world g-el-${world.element} ${lit === false ? 'enc-map-world--dim' : ''}`}
			transform={`translate(${pos.x}, ${pos.y})`}
			role="link"
			tabIndex={0}
			aria-label={`${world.name}, ${world.element} world`}
			onClick={go}
			onKeyDown={onKeyDown}
			onMouseEnter={(e) => onHover(world, e)}
			onMouseLeave={onLeave}
			onFocus={(e) => onHover(world, e)}
			onBlur={onLeave}
		>
			<circle className="enc-map-world-disc" r={11} />
			{lit !== false && <circle className="enc-map-world-ring" r={11} />}
			{!(dimLabel && lit === false) && (
				<text className="enc-map-world-label" y={compact ? 22 : 26}>
					{world.name}
				</text>
			)}
		</g>
	);
}

/**
 * Inline SVG galaxy of Xalia: a dark field, faint disc guides, and the
 * fourteen worlds as element-colored discs. Each world is a link into its
 * survey record. A `compact` prop shrinks (never hides) the labels below
 * 600px so the map stays legible without collisions.
 *
 * With an `era` key set, worlds in that era's chronicle footprint are lit
 * (full disc, ring, label); worlds outside it are dimmed (low-opacity disc,
 * no ring, label hidden at compact sizes). That era's firm events are pinned
 * to their first anchor world; `showEvents` (default true) can suppress the
 * pins for callers that only want the lit/dim treatment.
 */
export default function GalaxyMap({ era = null, showEvents = true, compact = false }) {
	const worlds = lore.getWorlds();
	const footprint = era ? lore.getEraFootprint(era) : null;
	const [hoverState, setHoverState] = useState(null);

	const footprintByWorld = footprint
		? new Map(footprint.worlds.map((row) => [row.world.key, row]))
		: null;

	// One marker per world, carrying every firm event anchored there.
	const worldPins = [];
	if (footprint && showEvents) {
		for (const row of footprint.worlds) {
			const firmEvents = row.events.filter((event) => event.firmness === 'firm');
			if (firmEvents.length > 0) {
				worldPins.push({ world: row.world, events: firmEvents });
			}
		}
	}

	const onHoverWorld = (world, lit, e) => {
		const svg = e.currentTarget.ownerSVGElement;
		const rect = svg.getBoundingClientRect();
		const pos = POSITIONS[world.key];
		const left = rect.left + (pos.x / 1000) * rect.width;
		const top = rect.top + (pos.y / 700) * rect.height;
		const row = footprintByWorld ? footprintByWorld.get(world.key) : null;
		setHoverState({ kind: 'world', world, row, lit, left, top });
	};
	const onHoverEvents = (world, events, e) => {
		const svg = e.currentTarget.ownerSVGElement;
		const rect = svg.getBoundingClientRect();
		const pos = POSITIONS[world.key];
		const left = rect.left + ((pos.x + PIN_OFFSET.x) / 1000) * rect.width;
		const top = rect.top + ((pos.y + PIN_OFFSET.y) / 700) * rect.height;
		setHoverState({ kind: 'events', world, events, left, top });
	};
	const onLeave = () => setHoverState(null);

	return (
		<div className={`enc-map ${compact ? 'enc-map--compact' : ''}`}>
			<svg
				className="enc-map-svg"
				viewBox="0 0 1000 700"
				role="img"
				aria-label="Galaxy map of Xalia, showing the fourteen worlds"
			>
				<rect className="enc-map-void" x={0} y={0} width={1000} height={700} />

				{/* Faint concentric guides suggesting the disc of the galaxy. */}
				<ellipse className="enc-map-guide" cx={500} cy={350} rx={460} ry={300} />
				<ellipse className="enc-map-guide" cx={500} cy={350} rx={320} ry={210} />
				<ellipse className="enc-map-guide" cx={500} cy={350} rx={180} ry={120} />

				{/* Cybele: the belt Stonera crosses annually. */}
				<ellipse
					className="enc-map-belt"
					cx={230}
					cy={430}
					rx={130}
					ry={70}
					transform="rotate(-18 230 430)"
				/>
				<text className="enc-map-belt-label" x={205} y={370}>
					Cybele
				</text>

				{/* Wraithix: Phantiri's own system, with its moon. */}
				<text className="enc-map-system-label" x={75} y={130}>
					Wraithix
				</text>
				<circle className="enc-map-moon" cx={WRAITHIX_MOON.x} cy={WRAITHIX_MOON.y} r={3} />

				{/* The black hole beside Grimedes. */}
				<circle className="enc-map-hole-core" cx={BLACK_HOLE.x} cy={BLACK_HOLE.y} r={9} />
				<circle className="enc-map-hole-ring" cx={BLACK_HOLE.x} cy={BLACK_HOLE.y} r={13} />

				{worlds.map((world) => {
					const row = footprintByWorld ? footprintByWorld.get(world.key) : null;
					const lit = footprint ? Boolean(row && (row.chapterCount > 0 || row.events.length > 0)) : true;
					return (
						<WorldMark
							key={world.key}
							world={world}
							compact={compact}
							lit={footprint ? lit : true}
							dimLabel={compact}
							era={era}
							onHover={(w, e) => onHoverWorld(w, footprint ? lit : true, e)}
							onLeave={onLeave}
						/>
					);
				})}

				{worldPins.map(({ world, events }) => (
					<WorldEventPin
						key={world.key}
						world={world}
						events={events}
						eraKey={era}
						onHover={(evs, e) => onHoverEvents(world, evs, e)}
						onLeave={onLeave}
					/>
				))}
			</svg>

			{hoverState && hoverState.kind === 'world' && (
				<div
					className={`g-panel g-panel--raised enc-map-card g-el-${hoverState.world.element}`}
					style={{ left: hoverState.left, top: hoverState.top - 18 }}
				>
					<span className="enc-map-card-name">{hoverState.world.name}</span>
					<span className="g-chip">{hoverState.world.element}</span>
					<span className="enc-map-card-terrain">{hoverState.world.physical && hoverState.world.physical.terrainLabel}</span>
					<span className="enc-map-card-species">{hoverState.world.nativeSpecies.length} native species</span>
					<span className="enc-map-card-action g-mono">
						{era && hoverState.lit !== false ? 'Read in this era' : 'Open survey record'}
					</span>
				</div>
			)}

			{hoverState && hoverState.kind === 'events' && (
				<div className="g-panel g-panel--raised enc-map-card enc-map-card--event" style={{ left: hoverState.left, top: hoverState.top - 18 }}>
					<span className="g-kicker enc-map-card-kicker">
						{hoverState.events.length > 1 ? `${hoverState.events.length} events` : 'Event'}
					</span>
					{hoverState.events.map((event) => (
						<span className="enc-map-card-name enc-map-card-event-title" key={event.key}>
							{event.title}
						</span>
					))}
				</div>
			)}
		</div>
	);
}
