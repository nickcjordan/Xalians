import React, { useEffect, useRef } from 'react';
import * as lore from '../../lore';
import { tabTriggerClass } from '@/components/ui/tabs';

/**
 * A rail of stations under the galaxy map: "All" plus the seven eras.
 * Pointer and keyboard (left/right arrows move focus and selection while
 * the rail has focus). Controlled: `era` is the selected era key or null
 * for "All"; `onChange(eraKey|null)` fires on selection.
 */
export default function EraScrubber({ era, onChange }) {
	const railRef = useRef(null);
	const eras = lore.getEras();
	const stations = [{ key: null, order: null, name: 'All', definition: null }, ...eras];
	const activeIndex = stations.findIndex((s) => s.key === era);
	const preface = 'Every record the Generator has on the galaxy it serves. Records are relative in time; no date survives.';
	const active = activeIndex >= 0 ? stations[activeIndex] : stations[0];
	const definition = active.key === null ? preface : active.definition;

	// When an era is selected, spell out what the map is showing: which
	// worlds light and which carry fixed events, with the counts for each.
	const footprint = active.key !== null ? lore.getEraFootprint(active.key) : null;
	const litCount = footprint
		? footprint.worlds.filter((row) => row.chapterCount > 0 || row.events.length > 0).length
		: 0;
	const eventCount = footprint
		? new Set(
				footprint.worlds.flatMap((row) => row.events.filter((e) => e.firmness === 'firm').map((e) => e.key))
			).size
		: 0;

	// Keep the lit station in view when the rail scrolls horizontally at
	// narrow widths, without scrolling the page itself.
	useEffect(() => {
		const rail = railRef.current;
		if (!rail) return;
		const buttons = rail.querySelectorAll('[data-slot="scrub-station"]');
		const btn = buttons[Math.max(activeIndex, 0)];
		if (btn && btn.scrollIntoView) {
			btn.scrollIntoView({ block: 'nearest', inline: 'center' });
		}
	}, [activeIndex]);

	const focusStation = (index) => {
		const rail = railRef.current;
		if (!rail) return;
		const buttons = rail.querySelectorAll('[data-slot="scrub-station"]');
		const btn = buttons[index];
		if (btn) btn.focus();
	};

	const onKeyDown = (e) => {
		if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
		e.preventDefault();
		const current = Math.max(activeIndex, 0);
		const delta = e.key === 'ArrowRight' ? 1 : -1;
		const next = (current + delta + stations.length) % stations.length;
		onChange(stations[next].key);
		focusStation(next);
	};

	return (
		<div className="mt-4">
			<div
				className="flex flex-wrap gap-0.5 max-sm:flex-nowrap max-sm:overflow-x-auto max-sm:[mask-image:linear-gradient(to_right,black_calc(100%-40px),transparent)]"
				ref={railRef}
				role="group"
				aria-label="Filter the map by era"
				onKeyDown={onKeyDown}
			>
				{stations.map((s, i) => (
					<button
						key={s.key === null ? 'all' : s.key}
						type="button"
						data-slot="scrub-station"
						data-state={i === activeIndex ? 'active' : 'inactive'}
						className={`${tabTriggerClass} max-sm:shrink-0`}
						aria-pressed={i === activeIndex}
						onClick={() => onChange(s.key)}
					>
						<span>{s.name}</span>
					</button>
				))}
			</div>
			<p className="m-0 mt-3 max-w-[62ch] font-body text-body text-ink-2">{definition}</p>
			{footprint && (
				<p className="type-data m-0 mt-2 max-w-[62ch] text-small text-ink-3">
					Lit: worlds with chapters in this era. Pins: events fixed to a world. ({litCount} worlds,{' '}
					{eventCount} events)
				</p>
			)}
		</div>
	);
}
