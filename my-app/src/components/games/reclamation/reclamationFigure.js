import React from 'react';
import { speciesLabel, formatHold } from './reclamationNarration';
import XalianImage from '../../xalianImage';
import XalianTypeSymbolBadge from '../duel/board/xalianTypeSymbolBadge';
import { pieceShadowFilter } from '../duel/board/duelPieceToken';
import { getSpeciesTemplate } from '../../../gameplay/generator/index.js';
import { team } from '../../../constants/designTokens';

/*
	ReclamationFigure — one creature standing at a site.

	It is the Duel's piece (Nick, 2026-09-04: reuse the duel design system rather than a
	fresh one). The species silhouette stands on the floor with a rim of light in its
	side's colour (cyan for you, brass for the rival, the same two paints the Duel uses),
	the element disc pinned at its foot, and its name on a stencilled plate below with
	the live hold stamped large beside it, because hold is the number this game is
	counted in. The rival's figures face down the table; yours face up.

	Every number here is passed in from the engine's own prepare(); this component never
	computes one.

	Emphasis states, all set by the controller:
	- selected / armed: the creature the next click will act on (the Duel's corner brackets)
	- acting / hit: the creature acting or being acted on during resolution playback,
	  with `flash` naming the outcome over the figure
	- hover: the creature under the pointer in a preview line
	- arrive: it just landed (the controller clears this after the animation)
	- badge: a small tag on the plate (the act ordered, during Orders)
*/
export const FIGURE_SIZE = 56;

function ReclamationFigure({
	record,
	element,
	hold,
	printedHold,
	seat,
	you,
	staggered,
	routed,
	hidden,
	strainLevel,
	isHome,
	facing,
	selected,
	armed,
	recommended,
	dimmed,
	acting,
	hit,
	hover,
	flash,
	arrive,
	label,
	badge,
	onClick,
	size,
	title,
}) {
	const mine = seat === you;
	const px = size === 'small' ? 40 : FIGURE_SIZE;
	const teamHex = mine ? team.one : team.two;
	const classes = ['rec-figure', 'rec-piece'];
	classes.push(mine ? 'rec-figure--mine' : 'rec-figure--theirs');
	classes.push(facing === 'down' ? 'rec-figure--down' : 'rec-figure--up');
	if (size) {
		classes.push(`rec-figure--${size}`);
	}
	if (staggered) classes.push('rec-figure--staggered');
	if (routed) classes.push('rec-figure--routed');
	if (hidden) classes.push('rec-figure--hidden');
	if (selected) classes.push('rec-figure--selected');
	if (armed) classes.push('rec-figure--armed');
	if (recommended) classes.push('rec-figure--recommended');
	if (dimmed) classes.push('rec-figure--dimmed');
	if (acting) classes.push('rec-figure--acting');
	if (hit) classes.push('rec-figure--hit');
	if (hover) classes.push('rec-figure--hover');
	if (arrive) classes.push('rec-figure--arrive');
	if (element) classes.push(`g-el-${element}`);

	const name = record ? speciesLabel(record) : (label || 'Unknown');
	const portrait = record && record.species && getSpeciesTemplate(record.species) ? record.species : null;
	const tags = [];
	if (isHome) tags.push({ key: 'home', text: 'home' });
	if (strainLevel === 'strained') tags.push({ key: 'strain', text: 'strained' });
	if (strainLevel === 'severe') tags.push({ key: 'severe', text: 'severe strain' });
	if (staggered) tags.push({ key: 'staggered', text: 'staggered' });
	if (hidden) tags.push({ key: 'hidden', text: 'hidden' });

	return (
		<button
			type="button"
			className={classes.join(' ')}
			style={{ '--rec-team': mine ? 'var(--g-team-one)' : 'var(--g-team-two)', '--rec-piece': `${px}px` }}
			onClick={onClick}
			title={title || name}
			aria-label={`${name}${typeof hold === 'number' ? `, hold ${formatHold(hold)}` : ''}${mine ? ', yours' : ', the rival’s'}`}
			data-record-id={record ? record.id : undefined}
			data-hold={typeof hold === 'number' ? formatHold(hold) : undefined}
			data-seat={mine ? 'mine' : 'theirs'}
		>
			{flash && <span className={`rec-figure-flash rec-figure-flash--${flash.kind}`}>{flash.text}</span>}
			<span className="rec-piece-stage" aria-hidden="true">
				<span className="rec-piece-base" />
				{portrait && (
					<XalianImage
						speciesName={portrait}
						primaryType={element || 'ghost'}
						padding="0px"
						fill="black"
						filter={pieceShadowFilter(teamHex, px)}
						moreClasses="rec-piece-art"
					/>
				)}
				{!portrait && <span className="rec-piece-unknown">?</span>}
				{element && <XalianTypeSymbolBadge size={Math.round(px / 2.6)} type={element} classes="rec-piece-disc" />}
			</span>
			<span className="rec-figure-plate">
				<span className="rec-figure-name">{name}</span>
				{badge && <span className="rec-figure-badge">{badge}</span>}
			</span>
			<span className="rec-figure-foot">
				{staggered && typeof printedHold === 'number' && (
					<span className="rec-figure-hold rec-figure-hold--struck">{formatHold(printedHold)}</span>
				)}
				{typeof hold === 'number' && <span className="rec-figure-hold">{formatHold(hold)}</span>}
			</span>
			{tags.length > 0 && (
				<span className="rec-figure-tags">
					{tags.map((t) => <span className={`rec-tag rec-tag--${t.key}`} key={t.key}>{t.text}</span>)}
				</span>
			)}
		</button>
	);
}

/*
	A hidden send from the rival: the opponent sees that a creature was sent, not which
	one or where. Drawn as an empty stage in the rival's paint with a blank plate.
*/
export function ReclamationSilhouette({ count }) {
	return (
		<div className="rec-silhouettes" aria-label={`${count} hidden send${count === 1 ? '' : 's'}`}>
			{Array.from({ length: count }).map((_, i) => (
				<div className="rec-figure rec-piece rec-figure--theirs rec-figure--silhouette rec-figure--down" style={{ '--rec-team': 'var(--g-team-two)', '--rec-piece': '40px' }} key={i}>
					<span className="rec-piece-stage" aria-hidden="true"><span className="rec-piece-base" /><span className="rec-piece-unknown">?</span></span>
					<span className="rec-figure-plate"><span className="rec-figure-name">unknown</span></span>
				</div>
			))}
		</div>
	);
}

export default ReclamationFigure;
