import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import * as lore from '../../lore';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

// Telypso sits at the drawn center of the galaxy (POSITIONS.telypso above);
// on phones the map scrolls wider than the viewport, so the wrapper opens
// centered on it rather than pinned to the left edge.
const CENTER_WORLD_KEY = 'telypso';

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
	const navigate = useNavigate();
	const pos = POSITIONS[world.key];
	// A single firm event routes straight to its own chronicle anchor; more
	// than one routes to the era, filtered to this world, so the reader can
	// see all of them together.
	const route =
		events.length === 1
			? lore.routeFor('event', `${eraKey}:${events[0].key}`)
			: `${lore.routeFor('era', eraKey)}?world=${world.key}`;

	const go = () => navigate(route);
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
			className="group cursor-pointer outline-none"
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
			<circle r={22} fill="transparent" stroke="none" className="pointer-events-auto" />
			<circle
				r={9}
				className="fill-[var(--color-room)] stroke-edge-strong transition-[stroke-width] duration-1 group-hover:[stroke-width:2px] group-focus-visible:[stroke-width:2px]"
				strokeWidth={1.5}
			/>
			<circle
				r={9}
				fill="none"
				className="stroke-edge-strong opacity-55 transition-opacity duration-1 group-hover:opacity-100 group-focus-visible:opacity-100"
				strokeWidth={1}
			/>
			{events.length > 1 && (
				<text className="type-data fill-ink-2 text-center" style={{ fontSize: 9, fontWeight: 600, textAnchor: 'middle' }} y={3}>
					{events.length}
				</text>
			)}
		</g>
	);
}

function WorldMark({ world, compact, lit, dimLabel, era, onHover, onLeave }) {
	const navigate = useNavigate();
	const pos = POSITIONS[world.key];
	if (!pos) return null;
	// With an era selected and this world lit in it, the record worth opening
	// is that era's page filtered to this world; otherwise, or when the world
	// is dimmed (has no footprint in the era), fall back to its survey record.
	const route =
		era && lit !== false ? `${lore.routeFor('era', era)}?world=${world.key}` : lore.routeFor('world', world.key);

	const go = () => navigate(route);
	const onKeyDown = (e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			go();
		}
	};

	const dim = lit === false;

	return (
		<g
			className={`el-${world.element} group cursor-pointer outline-none`}
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
			<circle r={30} fill="transparent" stroke="none" className="pointer-events-auto" />
			<circle
				r={11}
				className={`fill-el transition-[r,opacity] duration-1 group-hover:[r:15px] group-focus-visible:[r:15px] ${dim ? 'opacity-[0.28] group-hover:opacity-50 group-focus-visible:opacity-50' : ''}`}
			/>
			{!dim && (
				<circle
					r={11}
					fill="none"
					strokeWidth={1.5}
					className="stroke-edge-strong transition-[stroke-width] duration-1 group-hover:[stroke-width:2.5px] group-focus-visible:[stroke-width:2.5px]"
				/>
			)}
			{!(dimLabel && dim) && (
				<text
					y={compact ? 22 : 26}
					className={`type-legend ${dim ? 'fill-ink-3' : 'fill-ink'}`}
					style={{ fontSize: compact ? 9 : 12, fontWeight: 600, textAnchor: 'middle', textTransform: 'uppercase' }}
				>
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
	const scrollRef = useRef(null);

	// Phones scroll the map rather than shrink it; open centered on Telypso,
	// the drawn center of the galaxy, instead of the scrolled-left default.
	useEffect(() => {
		const wrap = scrollRef.current;
		if (!wrap) return;
		const center = POSITIONS[CENTER_WORLD_KEY];
		if (!center || wrap.scrollWidth <= wrap.clientWidth) return;
		const targetLeft = (center.x / 1000) * wrap.scrollWidth - wrap.clientWidth / 2;
		wrap.scrollLeft = Math.max(0, targetLeft);
	}, []);

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
		<div className="relative" data-tier="featured">
			<p className="type-data m-0 mb-2 text-small text-ink-3 sm:hidden">Drag to pan the galaxy.</p>
			<Card variant="glass" className="p-4">
				<div
					ref={scrollRef}
					className="w-full max-sm:overflow-x-auto max-sm:[mask-image:linear-gradient(to_right,var(--color-ink)_0,var(--color-ink)_calc(100%-40px),transparent_100%)] max-sm:pr-6"
				>
					<svg
						className="block w-full max-sm:min-w-[640px]"
						viewBox="0 0 1000 700"
						role="img"
						aria-label="Galaxy map of Xalia, showing the fourteen worlds"
					>
						<rect x={0} y={0} width={1000} height={700} className="fill-[var(--color-room)]" />

						{/* Faint concentric guides suggesting the disc of the galaxy. */}
						<ellipse cx={500} cy={350} rx={460} ry={300} fill="none" className="stroke-edge" strokeWidth={1} />
						<ellipse cx={500} cy={350} rx={320} ry={210} fill="none" className="stroke-edge" strokeWidth={1} />
						<ellipse cx={500} cy={350} rx={180} ry={120} fill="none" className="stroke-edge" strokeWidth={1} />

						{/* Cybele: the belt Stonera crosses annually. */}
						<ellipse
							cx={230}
							cy={430}
							rx={130}
							ry={70}
							transform="rotate(-18 230 430)"
							fill="none"
							className="stroke-ink-3 opacity-60"
							strokeWidth={1}
							strokeDasharray="3 5"
						/>
						<text x={205} y={370} className="type-legend fill-ink-3" style={{ fontSize: 11, fontWeight: 600 }}>
							Cybele
						</text>

						{/* Wraithix: Phantiri's own system, with its moon. */}
						<text x={75} y={130} className="type-legend fill-ink-3" style={{ fontSize: 11, fontWeight: 600 }}>
							Wraithix
						</text>
						<circle cx={WRAITHIX_MOON.x} cy={WRAITHIX_MOON.y} r={3} className="fill-ink-3 opacity-80" />

						{/* The black hole beside Grimedes. */}
						<circle cx={BLACK_HOLE.x} cy={BLACK_HOLE.y} r={9} className="fill-[var(--color-room)] stroke-edge-strong" strokeWidth={1} />
						<circle cx={BLACK_HOLE.x} cy={BLACK_HOLE.y} r={13} fill="none" className="stroke-edge-strong opacity-85" strokeWidth={1} />

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
				</div>
			</Card>

			{hoverState && hoverState.kind === 'world' && (
				<div
					className={`el-${hoverState.world.element} pointer-events-none absolute z-40 w-[220px] max-w-[60vw] -translate-x-1/2 -translate-y-full border border-edge bg-s2 p-4 shadow-[inset_0_1px_0_var(--color-edge-hi)]`}
					style={{ left: hoverState.left, top: hoverState.top - 18 }}
				>
					<span className="type-legend block text-[15px] text-ink">{hoverState.world.name}</span>
					<Badge variant="chip" className="mt-2">{hoverState.world.element}</Badge>
					<span className="mt-1 block text-[13px] text-ink-2">{hoverState.world.physical && hoverState.world.physical.terrainLabel}</span>
					<span className="mt-1 block text-[13px] text-ink-3">{hoverState.world.nativeSpecies.length} native species</span>
					<span className="type-data mt-2 block text-[13px] text-ink-2">
						{era && hoverState.lit !== false ? 'Read in this era' : 'Open survey record'}
					</span>
				</div>
			)}

			{hoverState && hoverState.kind === 'events' && (
				<div
					className="pointer-events-none absolute z-40 w-[200px] -translate-x-1/2 -translate-y-full border border-edge bg-s2 p-4 shadow-[inset_0_1px_0_var(--color-edge-hi)]"
					style={{ left: hoverState.left, top: hoverState.top - 18 }}
				>
					<span className="type-legend block">
						{hoverState.events.length > 1 ? `${hoverState.events.length} events` : 'Event'}
					</span>
					{hoverState.events.map((event) => (
						<span className="mt-1 block text-[15px] text-ink" key={event.key}>
							{event.title}
						</span>
					))}
				</div>
			)}

			<div className="mt-4 hidden gap-2 max-sm:flex max-sm:flex-nowrap max-sm:overflow-x-auto max-sm:[mask-image:linear-gradient(to_right,black_calc(100%-40px),transparent)]">
				{worlds.map((world) => {
					const row = footprintByWorld ? footprintByWorld.get(world.key) : null;
					const lit = footprint ? Boolean(row && (row.chapterCount > 0 || row.events.length > 0)) : true;
					const route =
						era && lit ? `${lore.routeFor('era', era)}?world=${world.key}` : lore.routeFor('world', world.key);
					return (
						<Link key={world.key} to={route} className={`el-${world.element} shrink-0`}>
							<Badge variant={lit ? 'chip' : 'chip-outline'}>{world.name}</Badge>
						</Link>
					);
				})}
			</div>
		</div>
	);
}
