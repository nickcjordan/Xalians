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

// Offsets (from the world's own center) for stacking pins around a disc
// when more than one firm event anchors to the same world.
const PIN_OFFSETS = [
	{ x: 15, y: -15 },
	{ x: -17, y: -13 },
	{ x: 17, y: 13 },
	{ x: -15, y: 15 },
];

function EventPin({ world, event, index, onHover, onLeave }) {
	const history = useHistory();
	const pos = POSITIONS[world.key];
	const offset = PIN_OFFSETS[index % PIN_OFFSETS.length];
	const route = lore.routeFor('event', `${event.eraKey}:${event.key}`);

	const go = () => history.push(route);
	const onKeyDown = (e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			go();
		}
	};

	return (
		<g
			className="enc-map-pin"
			transform={`translate(${pos.x + offset.x}, ${pos.y + offset.y})`}
			role="link"
			tabIndex={0}
			aria-label={`Event: ${event.title}`}
			onClick={go}
			onKeyDown={onKeyDown}
			onMouseEnter={(e) => onHover(event, e)}
			onMouseLeave={onLeave}
			onFocus={(e) => onHover(event, e)}
			onBlur={onLeave}
		>
			<circle className="enc-map-pin-head" r={4} />
			<line className="enc-map-pin-stem" x1={0} y1={0} x2={0} y2={5} />
		</g>
	);
}

function WorldMark({ world, compact, lit, dimLabel, onHover, onLeave }) {
	const history = useHistory();
	const pos = POSITIONS[world.key];
	if (!pos) return null;
	const route = lore.routeFor('world', world.key);

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

	// One entry per event, pinned to the first world it anchors to.
	const eventPins = [];
	if (footprint && showEvents) {
		const seen = new Set();
		for (const row of footprint.worlds) {
			for (const event of row.events) {
				if (event.firmness !== 'firm' || seen.has(event.key)) continue;
				seen.add(event.key);
				eventPins.push({ world: row.world, event: { ...event, eraKey: era } });
			}
		}
	}
	// Stack index per world so multiple pins on one disc do not overlap.
	const pinIndexByWorld = new Map();

	const onHoverWorld = (world, e) => {
		const svg = e.currentTarget.ownerSVGElement;
		const rect = svg.getBoundingClientRect();
		const pos = POSITIONS[world.key];
		const left = rect.left + (pos.x / 1000) * rect.width;
		const top = rect.top + (pos.y / 700) * rect.height;
		const row = footprintByWorld ? footprintByWorld.get(world.key) : null;
		setHoverState({ kind: 'world', world, row, left, top });
	};
	const onHoverEvent = (event, e) => {
		const svg = e.currentTarget.ownerSVGElement;
		const rect = svg.getBoundingClientRect();
		const pos = POSITIONS[event.__worldKey];
		const left = rect.left + (pos.x / 1000) * rect.width;
		const top = rect.top + (pos.y / 700) * rect.height;
		setHoverState({ kind: 'event', event, left, top });
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
							onHover={onHoverWorld}
							onLeave={onLeave}
						/>
					);
				})}

				{eventPins.map(({ world, event }) => {
					const index = pinIndexByWorld.get(world.key) || 0;
					pinIndexByWorld.set(world.key, index + 1);
					return (
						<EventPin
							key={event.key}
							world={world}
							event={{ ...event, __worldKey: world.key }}
							index={index}
							onHover={onHoverEvent}
							onLeave={onLeave}
						/>
					);
				})}
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
				</div>
			)}

			{hoverState && hoverState.kind === 'event' && (
				<div className="g-panel g-panel--raised enc-map-card enc-map-card--event" style={{ left: hoverState.left, top: hoverState.top - 18 }}>
					<span className="g-kicker enc-map-card-kicker">Event</span>
					<span className="enc-map-card-name">{hoverState.event.title}</span>
				</div>
			)}
		</div>
	);
}
