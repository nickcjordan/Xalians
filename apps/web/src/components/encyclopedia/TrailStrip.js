import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import * as lore from '../../lore';
import { useTrail } from './trail';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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

function routeForVisit(visit) {
	if (visit.kind === 'chapter') return lore.routeFor('paragraph', visit.key);
	if (visit.kind === 'beat') return lore.routeFor('tour', visit.key);
	return lore.routeFor(visit.kind, visit.key);
}

// World and species visits carry an element, so they read as the same world
// or element chip the rest of the site uses. Everything else (an entry, an
// era, a chapter) is a plain nav link: legend type, no underline, hover to
// ink, matching the vocabulary table's "Nav link" row.
function isChipVisit(visit) {
	return visit.kind === 'world' || visit.kind === 'species';
}

function TrailVisit({ visit }) {
	const to = routeForVisit(visit);
	if (isChipVisit(visit)) {
		return (
			<Link key={`${visit.kind}:${visit.key}`} to={to} className={`shrink-0 ${visit.element ? `el-${visit.element}` : ''}`}>
				<Badge variant="chip-outline">{visit.name}</Badge>
			</Link>
		);
	}
	return (
		<Link
			key={`${visit.kind}:${visit.key}`}
			to={to}
			className="type-legend shrink-0 text-ink-2 no-underline hover:text-ink"
		>
			{visit.name}
		</Link>
	);
}

/**
 * "Trace" strip: the last eight records visited, newest first, as one quiet
 * row above the footer. Renders nothing until at least one visit is
 * recorded. Contract: docs/design/xalian-encyclopedia-ux-pass.md "Trail".
 */
export default function TrailStrip() {
	const [trail, clear] = useTrail();
	const isPhone = useIsPhone();
	if (!trail.length) return null;
	const visible = isPhone ? trail.slice(0, PHONE_CHIP_LIMIT) : trail;
	return (
		<div className="mt-6 flex flex-wrap items-center gap-3 border-t border-edge-strong pt-3 max-sm:mt-4 max-sm:flex-nowrap max-sm:overflow-x-auto max-sm:pt-2">
			<p className="type-legend m-0 shrink-0 max-sm:pt-0.5">Recently viewed</p>
			{visible.map((visit) => <TrailVisit key={`${visit.kind}:${visit.key}`} visit={visit} />)}
			<Button type="button" variant="ghost" size="xs" className="ml-auto shrink-0 max-sm:ml-0" onClick={clear}>
				Clear
			</Button>
		</div>
	);
}
