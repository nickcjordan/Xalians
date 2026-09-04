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
// The meter's printed range. Base hold runs 0 to 20; the bulbs past 20 are home
// ground, where a native can carry up to 30. The scale is fixed so a reading always
// means the same thing (Nick, 2026-09-04).
export const HOLD_SCALE = 30;
export const HOLD_PRINTED_MAX = 20;

/*
	HoldMeter: hold as the system's own instrument, the segmented bulb strip the Duel's
	rail carries for vitals (Nick, 2026-09-04, seventh pass: theme the table as one
	thing; the brass dial was a different object from everything around it and its
	needle could not be read at a glance). One bulb per point, twenty in four banks of
	five with a seam between banks so the count is read without counting, and a brass
	bank of ten beyond for home ground that appears only when a native stands there.
	Bulbs light in the element in scope, which on the table is the world's, so hold on
	Zolton reads electric and hold on Telypso reads psychic. What the site's environment
	takes is the dim bulbs past the lit ones (the bulbs that would be lit unstrained);
	a stagger is the struck red bulbs from the halved reading back to the printed one.
	The number prints beside the strip in mono. `scale` adds the printed 0, 10, 20
	under the strip on the large size.

	Props: hold, unstrained, printedHold, isHome, strainLevel, staggered, size ('chip'
	| 'full' | 'large'), scale. `small` and `mine` are accepted for old call sites.
*/
export function HoldMeter({ hold, unstrained, printedHold, isHome, strainLevel, staggered, small, size, scale }) {
	const sz = size || (small ? 'chip' : 'full');
	const lit = Math.max(0, Math.min(HOLD_SCALE, Math.round(hold)));
	const struckTo = staggered && typeof printedHold === 'number' && printedHold > hold ? Math.min(HOLD_SCALE, Math.round(printedHold)) : lit;
	const dimTo = typeof unstrained === 'number' && unstrained > hold ? Math.min(HOLD_SCALE, Math.round(unstrained)) : struckTo;
	const reach = Math.max(lit, struckTo, dimTo);
	const count = isHome || reach > HOLD_PRINTED_MAX ? HOLD_SCALE : HOLD_PRINTED_MAX;
	const lostToStrain = typeof unstrained === 'number' && unstrained > hold ? unstrained - hold : 0;
	const lostToStagger = staggered && typeof printedHold === 'number' && printedHold > hold ? printedHold - hold : 0;
	const title = [
		`hold ${formatHold(hold)} of ${HOLD_PRINTED_MAX}`,
		lostToStrain > 0 ? `${strainLevel === 'severe' ? 'severe strain' : 'strain'} took ${formatHold(lostToStrain)}` : null,
		lostToStagger > 0 ? `staggered, half of ${formatHold(printedHold)}` : null,
		isHome ? 'home ground, past 20' : null,
	].filter(Boolean).join(', ');
	const bulbs = [];
	for (let i = 1; i <= count; i++) {
		let state = 'off';
		if (i <= lit) state = 'lit';
		else if (i <= struckTo) state = 'struck';
		else if (i <= dimTo) state = strainLevel === 'severe' ? 'dim-severe' : 'dim';
		bulbs.push(<i key={i} className={`rec-bulb rec-bulb--${state}${i > HOLD_PRINTED_MAX ? ' rec-bulb--over' : ''}`} />);
	}
	return (
		<span className={`rec-meter rec-meter--${sz}${isHome ? ' rec-meter--home' : ''}`} title={title} aria-label={title} role="img">
			<span className="rec-meter-bulbs">{bulbs}</span>
			{scale && (
				<span className="rec-meter-scale" aria-hidden="true">
					<i>0</i><i>5</i><i>10</i><i>15</i><i>20</i>
				</span>
			)}
		</span>
	);
}

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
	unstrainedHold,
	baseHold,
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
	// the meter says home, strain and stagger; only hidden still needs a word
	const tags = [];
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
				{typeof hold === 'number' && (
					<HoldMeter
						hold={hold}
						unstrained={unstrainedHold}
						printedHold={printedHold}
						isHome={isHome}
						strainLevel={strainLevel}
						staggered={staggered}
						size="chip"
						mine={mine}
					/>
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
