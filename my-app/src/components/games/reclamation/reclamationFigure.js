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
// The gauge's printed range. Base hold runs 0 to 20; the sector past 20 is home ground,
// where a native can carry up to 30. The scale is fixed so a reading always means the
// same thing (Nick, 2026-09-04: "a consistent scale so we always know what the max is").
export const HOLD_SCALE = 30;
export const HOLD_PRINTED_MAX = 20;

/*
	HoldMeter: hold as a pressure gauge (Nick, 2026-09-04: a real instrument, kept
	legible). A round brass bezel, a dark face under glass, a 270 degree scale printed
	0 to 20 with the over-range to 30 hatched in brass, a needle with a counterweight
	tail that points down at zero and climbs past the top. What the site's environment
	takes is a dim second needle at the unstrained reading with a hazard arc between
	the two (red when severe); a stagger is a red arc from the halved reading back to
	the printed one. Chip and full sizes carry ticks only, with a heavier needle;
	numerals print on the large face only, where they can be read (Nick, twice).

	Props: hold, unstrained, printedHold, isHome, strainLevel, staggered, small (chip
	size) or size: 'chip' | 'full' | 'large'. `mine` is accepted and ignored: the face
	is neutral and the side is said by the ground.
*/
const GAUGE_SWEEP = 270;

function gaugeAngle(value) {
	const t = Math.max(0, Math.min(HOLD_SCALE, value)) / HOLD_SCALE;
	return ((225 - GAUGE_SWEEP * t) * Math.PI) / 180;
}

function gaugePoint(value, radius) {
	const a = gaugeAngle(value);
	return { x: 50 + radius * Math.cos(a), y: 50 - radius * Math.sin(a) };
}

function gaugeArc(from, to, radius) {
	const lo = Math.min(from, to);
	const hi = Math.max(from, to);
	if (hi - lo < 0.01) {
		return '';
	}
	const p1 = gaugePoint(lo, radius);
	const p2 = gaugePoint(hi, radius);
	const large = ((hi - lo) / HOLD_SCALE) * GAUGE_SWEEP > 180 ? 1 : 0;
	return `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} A ${radius} ${radius} 0 ${large} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
}

const GAUGE_NUMERALS = [0, 10, 20, 30];

export function HoldMeter({ hold, unstrained, printedHold, isHome, strainLevel, staggered, small, size }) {
	const sz = size || (small ? 'chip' : 'full');
	const chip = sz === 'chip';
	// numerals only where they can be read: the large face on the front line (Nick)
	const numerals = sz === 'large';
	const lostToStrain = typeof unstrained === 'number' && unstrained > hold ? unstrained - hold : 0;
	const lostToStagger = staggered && typeof printedHold === 'number' && printedHold > hold ? printedHold - hold : 0;
	const title = [
		`hold ${formatHold(hold)} of ${HOLD_PRINTED_MAX}`,
		lostToStrain > 0 ? `${strainLevel === 'severe' ? 'severe strain' : 'strain'} took ${formatHold(lostToStrain)}` : null,
		lostToStagger > 0 ? `staggered, half of ${formatHold(printedHold)}` : null,
		isHome ? 'home ground, past 20' : null,
	].filter(Boolean).join(', ');
	const R = 44;
	const needle = gaugePoint(hold, R - (chip ? 9 : 11));
	const tail = gaugePoint(hold + HOLD_SCALE / 2, chip ? 7 : 9);
	const ghost = lostToStrain > 0 ? gaugePoint(unstrained, R - 12) : null;
	const severe = strainLevel === 'severe';
	const ticks = [];
	for (let t = 0; t <= HOLD_SCALE; t += numerals ? 2.5 : 5) {
		const major = t % 10 === 0;
		const mid = t % 5 === 0;
		const a = gaugePoint(t, R - 7);
		const b = gaugePoint(t, R - (major ? 15 : mid ? 12 : 10));
		ticks.push(<line key={t} className={`rec-gauge-tick${major ? ' rec-gauge-tick--major' : ''}${t > HOLD_PRINTED_MAX ? ' rec-gauge-tick--over' : ''}`} x1={a.x.toFixed(2)} y1={a.y.toFixed(2)} x2={b.x.toFixed(2)} y2={b.y.toFixed(2)} />);
	}
	return (
		<span className={`rec-gauge rec-gauge--${sz}${isHome ? ' rec-gauge--home' : ''}`} title={title} aria-label={title} role="img">
			<svg className="rec-gauge-face" viewBox="0 0 100 100" aria-hidden="true">
				<circle className="rec-gauge-bezel-dark" cx="50" cy="50" r={R + 4} />
				<circle className="rec-gauge-bezel" cx="50" cy="50" r={R + 2} />
				<circle className="rec-gauge-glass" cx="50" cy="50" r={R - 1} />
				<path className="rec-gauge-range" d={gaugeArc(0, HOLD_PRINTED_MAX, R - 7)} />
				<path className="rec-gauge-over" d={gaugeArc(HOLD_PRINTED_MAX, HOLD_SCALE, R - 7)} />
				{lostToStagger > 0 && <path className="rec-gauge-lost rec-gauge-lost--stagger" d={gaugeArc(hold, printedHold, R - 7)} />}
				{lostToStrain > 0 && lostToStagger === 0 && <path className={`rec-gauge-lost${severe ? ' rec-gauge-lost--severe' : ''}`} d={gaugeArc(hold, unstrained, R - 7)} />}
				{ticks}
				{numerals && GAUGE_NUMERALS.map((t) => {
					const q = gaugePoint(t, R - 25);
					return <text key={t} className={`rec-gauge-numeral${t > HOLD_PRINTED_MAX ? ' rec-gauge-numeral--over' : ''}`} x={q.x.toFixed(2)} y={(q.y + 3.5).toFixed(2)} textAnchor="middle">{t}</text>;
				})}
				{numerals && <text className="rec-gauge-legend" x="50" y="80" textAnchor="middle">HOLD</text>}
				{ghost && <line className="rec-gauge-needle rec-gauge-needle--ghost" x1="50" y1="50" x2={ghost.x.toFixed(2)} y2={ghost.y.toFixed(2)} />}
				<line className="rec-gauge-needle" x1={tail.x.toFixed(2)} y1={tail.y.toFixed(2)} x2={needle.x.toFixed(2)} y2={needle.y.toFixed(2)} />
				<circle className="rec-gauge-hub" cx="50" cy="50" r={chip ? 5 : 4.5} />
				<circle className="rec-gauge-shine" cx="50" cy="50" r={R - 1} />
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
