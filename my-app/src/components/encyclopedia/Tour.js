import React, { useEffect } from 'react';
import { Link, useHistory, useParams } from 'react-router-dom';
import * as lore from '../../lore';
import Prose from './Prose';
import GalaxyMap from './GalaxyMap';
import { useVisit, useReadMark } from './trail';
import './Tour.css';

function Station({ beat, isCurrent }) {
	const visited = useReadMark('beat', beat.key);
	return (
		<Link
			to={lore.routeFor('tour', beat.key)}
			className={`enc-tour-station g-lamp ${isCurrent ? 'enc-tour-station--current' : ''} ${
				visited && !isCurrent ? 'enc-tour-station--visited' : ''
			}`}
			aria-current={isCurrent ? 'step' : undefined}
		>
			<span className="enc-tour-station-index">{String(beat.order + 1).padStart(2, '0')}</span>
		</Link>
	);
}

function ProgressRail({ beats, current }) {
	return (
		<nav className="enc-tour-rail" aria-label="First Survey progress">
			{beats.map((beat) => (
				<Station key={beat.key} beat={beat} isCurrent={beat.key === current.key} />
			))}
		</nav>
	);
}

function RecordsConsulted({ beat }) {
	if (beat.worlds.length === 0 && beat.entries.length === 0) return null;
	return (
		<div className="enc-tour-consulted">
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

function TourBeat({ tour, beat, beats, index }) {
	const history = useHistory();
	useVisit({ kind: 'beat', key: beat.key, name: beat.title });

	const prev = index > 0 ? beats[index - 1] : null;
	const next = index < beats.length - 1 ? beats[index + 1] : null;
	const isLast = index === beats.length - 1;

	useEffect(() => {
		const onKeyDown = (e) => {
			const tag = document.activeElement && document.activeElement.tagName;
			if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
			if (e.key === 'ArrowLeft' && prev) {
				history.push(lore.routeFor('tour', prev.key));
			} else if (e.key === 'ArrowRight' && next) {
				history.push(lore.routeFor('tour', next.key));
			}
		};
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, [prev, next, history]);

	return (
		<div className="enc-tour-beat">
			<ProgressRail beats={beats} current={beat} />

			<p className="g-kicker enc-tour-kicker">
				First Survey, beat {beat.order + 1} of {beats.length}, {beat.era ? beat.era.name : ''}
			</p>
			<h1 className="g-title enc-tour-title">{beat.title}</h1>

			<div className="enc-record enc-tour-record">
				<div className="g-panel enc-tour-map-panel">
					<GalaxyMap era={beat.era ? beat.era.key : undefined} compact showEvents={false} />
					{beat.era && (
						<Link to={lore.routeFor('era', beat.era.key)} className="g-link enc-tour-era-link">
							{beat.era.name}
						</Link>
					)}
				</div>
				<div className="enc-tour-prose-col">
					<Prose text={beat.prose} className="enc-tour-prose" />
					<RecordsConsulted beat={beat} />
				</div>
			</div>

			<div className="enc-tour-nav">
				{prev ? (
					<Link to={lore.routeFor('tour', prev.key)} className="g-btn enc-tour-nav-btn">
						&larr; {prev.title}
					</Link>
				) : (
					<span />
				)}
				{!isLast && next && (
					<Link to={lore.routeFor('tour', next.key)} className="g-btn enc-tour-nav-btn">
						{next.title} &rarr;
					</Link>
				)}
				{isLast && (
					<div className="enc-tour-finish">
						<Link to="/encyclopedia/chronicle" className="g-btn g-btn--primary enc-tour-nav-btn">
							Open the Chronicle
						</Link>
						<Link to="/encyclopedia/species" className="g-btn g-btn--primary enc-tour-nav-btn">
							Open the Bestiary
						</Link>
					</div>
				)}
			</div>
		</div>
	);
}

export default function Tour() {
	const { beat: beatKey } = useParams();
	const tour = lore.getTour();
	const beats = tour.beats;

	const beat = beatKey ? beats.find((b) => b.key === beatKey) : beats[0];

	if (!beat) {
		return (
			<div>
				<p className="g-empty">No record for &ldquo;{beatKey}&rdquo;.</p>
				<Link to="/encyclopedia" className="enc-back">
					&larr; Back to the Reading Room
				</Link>
			</div>
		);
	}

	const index = beats.findIndex((b) => b.key === beat.key);

	return (
		<div className="enc-tour">
			<Link to="/encyclopedia" className="enc-back">
				&larr; Back to the Reading Room
			</Link>
			<TourBeat tour={tour} beat={beat} beats={beats} index={index} />
		</div>
	);
}
