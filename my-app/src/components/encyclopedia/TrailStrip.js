import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
		<div className="mt-6 flex flex-wrap items-center gap-2 border-t border-edge-strong pt-3 max-sm:mt-4 max-sm:flex-nowrap max-sm:overflow-x-auto max-sm:pt-2">
			<p className="type-legend m-0 shrink-0 max-sm:pt-0.5">Trace</p>
			{visible.map((visit) => (
				<Link
					key={`${visit.kind}:${visit.key}`}
					to={routeForVisit(visit)}
					className={`shrink-0 ${visit.element ? `el-${visit.element}` : ''}`}
				>
					<Badge variant="chip-outline" className="gap-2">
						<span className="max-sm:hidden">{KIND_GLYPH[visit.kind] || visit.kind.toUpperCase()}</span>
						<span className="normal-case tracking-normal">{visit.name}</span>
					</Badge>
				</Link>
			))}
			<Button type="button" variant="ghost" size="xs" className="ml-auto shrink-0 max-sm:ml-0" onClick={clear}>
				Clear
			</Button>
		</div>
	);
}
