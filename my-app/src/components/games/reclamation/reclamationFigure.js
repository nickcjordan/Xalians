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
// The dial's printed range. Base hold runs 0 to 20; the sector past 20 is home ground,
// where a native can carry up to 30. The scale is fixed so a reading always means the
// same thing (Nick, 2026-09-04: "a consistent scale so we always know what the max is").
export const HOLD_SCALE = 30;
export const HOLD_PRINTED_MAX = 20;

/*
	HoldMeter: hold as an instrument dial. A half-round face printed 0 to 20 with the
	brass over-range sector to 30 for home ground, a bone needle at the reading, and
	the number beneath it. What the site's environment takes is a second, dim needle at
	the unstrained reading with a hazard arc between the two (red when severe); a stagger
	is a red arc from the halved reading back to the printed one. The face is neutral
	on purpose: the side is said by the ground the figure stands on and the world by
	the chip's rim, so the dial carries only the quantity.

	Props are unchanged from the strip it replaces: hold, unstrained, printedHold,
	isHome, strainLevel, staggered, small. `mine` is accepted and ignored.
*/
const GAUGE_W = 48;
const GAUGE_H = 30;
const GAUGE_CX = 24;
const GAUGE_CY = 26;
const GAUGE_R = 19;

function gaugeAngle(value) {
	const v = Math.max(0, Math.min(HOLD_SCALE, value));
	return Math.PI - (v / HOLD_SCALE) * Math.PI;
}

function gaugePoint(value, radius) {
	const a = gaugeAngle(value);
	return { x: GAUGE_CX + radius * Math.cos(a), y: GAUGE_CY - radius * Math.sin(a) };
}

function gaugeArc(from, to, radius) {
	const lo = Math.min(from, to);
	const hi = Math.max(from, to);
	if (hi - lo < 0.01) {
		return '';
	}
	const p1 = gaugePoint(lo, radius);
	const p2 = gaugePoint(hi, radius);
	return `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} A ${radius} ${radius} 0 0 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
}

const GAUGE_TICKS = [0, 5, 10, 15, 20, 25, 30];

export function HoldMeter({ hold, unstrained, printedHold, isHome, strainLevel, staggered, small }) {
	const lostToStrain = typeof unstrained === 'number' && unstrained > hold ? unstrained - hold : 0;
	const lostToStagger = staggered && typeof printedHold === 'number' && printedHold > hold ? printedHold - hold : 0;
	const title = [
		`hold ${formatHold(hold)} of ${HOLD_PRINTED_MAX}`,
		lostToStrain > 0 ? `${strainLevel === 'severe' ? 'severe strain' : 'strain'} took ${formatHold(lostToStrain)}` : null,
		lostToStagger > 0 ? `staggered, half of ${formatHold(printedHold)}` : null,
		isHome ? 'home ground, past 20' : null,
	].filter(Boolean).join(', ');
	const needle = gaugePoint(hold, GAUGE_R - 3);
	const ghost = lostToStrain > 0 ? gaugePoint(unstrained, GAUGE_R - 3) : null;
	const severe = strainLevel === 'severe';
	return (
		<span className={`rec-gauge${small ? ' rec-gauge--small' : ''}${isHome ? ' rec-gauge--home' : ''}`} title={title} aria-label={title} role="img">
			<svg className="rec-gauge-face" viewBox={`0 0 ${GAUGE_W} ${GAUGE_H}`} aria-hidden="true">
				{/* the face */}
				<path className="rec-gauge-bezel" d={`${gaugeArc(0, HOLD_SCALE, GAUGE_R + 1)} L ${GAUGE_CX + GAUGE_R + 1} ${GAUGE_CY} Z`} />
				{/* the printed range, and the over-range sector for home ground */}
				<path className="rec-gauge-range" d={gaugeArc(0, HOLD_PRINTED_MAX, GAUGE_R - 1)} />
				<path className="rec-gauge-over" d={gaugeArc(HOLD_PRINTED_MAX, HOLD_SCALE, GAUGE_R - 1)} />
				{/* what strain took: an arc from the reading out to what it would have been */}
				{lostToStrain > 0 && <path className={`rec-gauge-lost${severe ? ' rec-gauge-lost--severe' : ''}`} d={gaugeArc(hold, unstrained, GAUGE_R - 1)} />}
				{/* what a stagger took */}
				{lostToStagger > 0 && <path className="rec-gauge-lost rec-gauge-lost--stagger" d={gaugeArc(hold, printedHold, GAUGE_R - 1)} />}
				{/* ticks: majors at 0, 10, 20, 30; minors between */}
				{GAUGE_TICKS.map((t) => {
					const major = t % 10 === 0;
					const a = gaugePoint(t, GAUGE_R - 1);
					const b = gaugePoint(t, GAUGE_R - (major ? 5 : 3));
					return <line key={t} className={`rec-gauge-tick${major ? ' rec-gauge-tick--major' : ''}${t > HOLD_PRINTED_MAX ? ' rec-gauge-tick--over' : ''}`} x1={a.x.toFixed(2)} y1={a.y.toFixed(2)} x2={b.x.toFixed(2)} y2={b.y.toFixed(2)} />;
				})}
				{/* the unstrained reading, dim */}
				{ghost && <line className="rec-gauge-needle rec-gauge-needle--ghost" x1={GAUGE_CX} y1={GAUGE_CY} x2={ghost.x.toFixed(2)} y2={ghost.y.toFixed(2)} />}
				{/* the reading */}
				<line className="rec-gauge-needle" x1={GAUGE_CX} y1={GAUGE_CY} x2={needle.x.toFixed(2)} y2={needle.y.toFixed(2)} />
				<circle className="rec-gauge-hub" cx={GAUGE_CX} cy={GAUGE_CY} r="2" />
			</svg>
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
