import React from 'react';
import { Link } from 'react-router-dom';
import * as lore from '../../lore';
import { useTrail } from './trail';
import './TrailStrip.css';

const KIND_GLYPH = {
	entry: 'ENTRY',
	world: 'WORLD',
	species: 'SPECIES',
	era: 'ERA',
	chapter: 'CHAPTER',
	beat: 'BEAT',
};

function routeForVisit(visit) {
	if (visit.kind === 'chapter') return lore.routeFor('paragraph', visit.key);
	if (visit.kind === 'beat') return lore.routeFor('tour', visit.key);
	return lore.routeFor(visit.kind, visit.key);
}

/**
 * "Trace" strip: the last eight records visited, newest first. Renders
 * nothing until at least one visit is recorded. Contract: docs/design/
 * xalian-encyclopedia-ux-pass.md "Trail".
 */
export default function TrailStrip() {
	const [trail, clear] = useTrail();
	if (!trail.length) return null;
	return (
		<div className="g-panel g-panel--recessed enc-trail">
			<p className="g-kicker enc-trail-kicker">Trace</p>
			<div className="enc-trail-chips">
				{trail.map((visit) => (
					<Link
						key={`${visit.kind}:${visit.key}`}
						to={routeForVisit(visit)}
						className={`g-chip g-chip--outline enc-trail-chip${visit.element ? ` g-el-${visit.element}` : ''}`}
					>
						<span className="g-mono enc-trail-chip-kind">{KIND_GLYPH[visit.kind] || visit.kind.toUpperCase()}</span>
						<span className="enc-trail-chip-name">{visit.name}</span>
					</Link>
				))}
				<button type="button" className="g-btn g-btn--ghost enc-btn-small enc-trail-clear" onClick={clear}>
					Clear
				</button>
			</div>
		</div>
	);
}
