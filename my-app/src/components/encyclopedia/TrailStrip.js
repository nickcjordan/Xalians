import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as lore from '../../lore';
import { useTrail } from './trail';
import './TrailStrip.css';

const PHONE_QUERY = '(max-width: 700px)';
const PHONE_CHIP_LIMIT = 5;

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
	const isPhone = useIsPhone();
	if (!trail.length) return null;
	const visible = isPhone ? trail.slice(0, PHONE_CHIP_LIMIT) : trail;
	return (
		<div className="enc-trail enc-trail-row enc-scrollrow">
			<p className="g-kicker enc-trail-kicker">Trace</p>
			{visible.map((visit) => (
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
	);
}
