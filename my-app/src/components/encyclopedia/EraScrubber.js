import React, { useEffect, useRef } from 'react';
import * as lore from '../../lore';
import './EraScrubber.css';

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

	// Keep the lit station in view when the rail scrolls horizontally at
	// narrow widths, without scrolling the page itself.
	useEffect(() => {
		const rail = railRef.current;
		if (!rail) return;
		const buttons = rail.querySelectorAll('.enc-scrub-station');
		const btn = buttons[Math.max(activeIndex, 0)];
		if (btn && btn.scrollIntoView) {
			btn.scrollIntoView({ block: 'nearest', inline: 'nearest' });
		}
	}, [activeIndex]);

	const focusStation = (index) => {
		const rail = railRef.current;
		if (!rail) return;
		const buttons = rail.querySelectorAll('.enc-scrub-station');
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
		<div className="enc-scrub">
			<div
				className="enc-scrub-rail"
				ref={railRef}
				role="group"
				aria-label="Filter the map by era"
				onKeyDown={onKeyDown}
			>
				{stations.map((s, i) => (
					<button
						key={s.key === null ? 'all' : s.key}
						type="button"
						className="enc-scrub-station"
						aria-pressed={i === activeIndex}
						onClick={() => onChange(s.key)}
					>
						{s.order !== null && <span className="enc-scrub-order g-mono">{s.order}</span>}
						<span className="enc-scrub-name">{s.name}</span>
					</button>
				))}
			</div>
			<p className="g-body enc-scrub-definition">{definition}</p>
		</div>
	);
}
