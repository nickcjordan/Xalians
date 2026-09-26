import React from 'react';
import { speciesLabel, formatHold, formatHoldShown, roleSentence } from './reclamationNarration';
import { RoleGlyph, PIECE_RIM } from './reclamationGlyphs';
import XalianImage from '../../xalianImage';
import XalianTypeSymbolBadge from '../duel/board/xalianTypeSymbolBadge';
import { pieceShadowFilter } from '../duel/board/duelPieceToken';
import { getSpeciesTemplate } from '@xalians/rules/generator';
import { HoldBar, WhyMarks } from './reclamationInstruments';

/*
	ReclamationFigure — one creature standing at a site.

	It is the Duel's piece (Nick, 2026-09-04: reuse the duel design system rather than a
	fresh one). The species silhouette stands on the floor with a rim of light, the
	element disc pinned at its foot, and its name on a stencilled plate below with
	the live hold stamped large beside it, because hold is the number this game is
	counted in. The rival's figures face down the table; yours face up.

	PASS 60. The rim was the side's colour (cyan for you, brass for the rival, the Duel's
	two paints) until Nick ruled the side colours off the table; it is now one neutral
	rim for both, and a figure's side is read from the rank it stands in.

	Every number here is passed in from the engine's own prepare(); this component never
	computes one.

	Emphasis states, all set by the controller:
	- selected / armed: the creature the next click will act on (the Duel's corner brackets)
	- acting / hit: the creature acting or being acted on during resolution playback,
	  with `flash` naming the outcome over the figure
	- hover: the creature under the pointer in a preview line
	- arrive: it just landed (the controller clears this after the animation)
	- badge: a small tag on the plate
	- role: one of 'strike' | 'sweep' | 'bolster' | 'shield' (the base redesign's four
	  roles), drawn as one glyph beside the hold bulb with the role sentence as its title;
	  'none' draws nothing
	- forecast: the hold the Clash would leave it at, as the board stands (pass 52: drawn as
	  the struck end of its hold bar, and a cross over it when that is nothing)

	The CSS class names still read `staggered` and `routed`; the words the player sees are
	Pass 2's, hurt and downed (docs/design/reclamation-base-redesign.md assumption 17).
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
	a hit is the struck red bulbs from the live reading back to the printed one.
	The number prints beside the strip in mono. `scale` adds the printed 0, 10, 20
	under the strip on the large size.

	Props: hold, unstrained, printedHold, isHome, strainLevel, hurt, size ('chip'
	| 'full' | 'large'), scale. `small` and `mine` are accepted for old call sites.
*/
export function HoldMeter({ hold, unstrained, printedHold, isHome, strainLevel, hurt, small, size, scale }) {
	const sz = size || (small ? 'chip' : 'full');
	const lit = Math.max(0, Math.min(HOLD_SCALE, Math.round(hold)));
	const struckTo = hurt && typeof printedHold === 'number' && printedHold > hold ? Math.min(HOLD_SCALE, Math.round(printedHold)) : lit;
	const dimTo = typeof unstrained === 'number' && unstrained > hold ? Math.min(HOLD_SCALE, Math.round(unstrained)) : struckTo;
	const reach = Math.max(lit, struckTo, dimTo);
	const count = isHome || reach > HOLD_PRINTED_MAX ? HOLD_SCALE : HOLD_PRINTED_MAX;
	const lostToStrain = typeof unstrained === 'number' && unstrained > hold ? unstrained - hold : 0;
	const lostToHits = hurt && typeof printedHold === 'number' && printedHold > hold ? printedHold - hold : 0;
	const title = [
		`hold ${formatHold(hold)} of ${HOLD_PRINTED_MAX}`,
		lostToStrain > 0 ? `${strainLevel === 'severe' ? 'severe strain' : 'strain'} took ${formatHold(lostToStrain)}` : null,
		lostToHits > 0 ? `hurt, ${formatHold(lostToHits)} taken of ${formatHold(printedHold)}` : null,
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
	hurt,
	downed,
	hidden,
	strainLevel,
	isHome,
	unstrainedHold,
	baseHold,
	facing,
	role,
	blowMagnitude,
	selected,
	armed,
	recommended,
	dimmed,
	acting,
	hit,
	beat,
	hover,
	flash,
	arrive,
	label,
	badge,
	threat,
	onClick,
	size,
	title,
	showMeter,
	fallen,
	ownSweep,
	forecast,
	lossText,
	noTarget,
	reasons,
}) {
	const mine = seat === you;
	const px = size === 'small' ? 40 : FIGURE_SIZE;
	const classes = ['rec-figure', 'rec-piece'];
	classes.push(mine ? 'rec-figure--mine' : 'rec-figure--theirs');
	classes.push(facing === 'down' ? 'rec-figure--down' : 'rec-figure--up');
	if (size) {
		classes.push(`rec-figure--${size}`);
	}
	if (hurt) classes.push('rec-figure--staggered');
	if (downed) classes.push('rec-figure--routed');
	// pass 38: downed in the round just ruled, and left on the board greyed so the loss can be read
	if (fallen) classes.push('rec-figure--fallen');
	if (hidden) classes.push('rec-figure--hidden');
	if (selected) classes.push('rec-figure--selected');
	if (armed) classes.push('rec-figure--armed');
	if (recommended) classes.push('rec-figure--recommended');
	if (dimmed) classes.push('rec-figure--dimmed');
	if (acting) classes.push('rec-figure--acting');
	/*
		SCHEMA 5 EXPOSED A STALE-ANIMATION BUG HERE.

		A CSS animation runs once when its class is applied and does not restart while the
		class stays applied. When the same creature acts on consecutive engine steps - or is
		hit twice in a row - the class never leaves, so the second blow plays nothing.

		Under schema 4 that was rare enough to go unnoticed. Schema 5 guarantees every
		creature exactly four structurally distinct actions, so a creature attacking several
		times in one Clash is now normal, and the clash gauge caught the result: 77 still
		frames during `attack` events against 43 moving, with every animation individually
		working. The round had not stopped animating; the same figure was being asked to
		replay an animation it had already finished.

		`--rec-beat` is a render-scoped key that changes on every engine step, so React
		remounts the plate and the browser starts the animation again. It is only applied
		while this figure is the one acting or being hit, so a still figure is not remounted
		sixty times a round.
	*/
	// pass 52: forecast to fall in the Clash, as the board stands
	const falls = typeof forecast === 'number' && forecast === 0 && typeof hold === 'number' && hold > 0;
	if (falls) classes.push('rec-figure--falls');
	if (noTarget) classes.push('rec-figure--no-target');
	if (role && role !== 'none') classes.push(`rec-figure--role-${role}`);
	if (hit) classes.push('rec-figure--hit');
	if (hover) classes.push('rec-figure--hover');
	if (arrive) classes.push('rec-figure--arrive');
	if (element) classes.push(`g-el-${element}`);

	const name = record ? speciesLabel(record) : (label || 'Unknown');
	const portrait = record && record.species && getSpeciesTemplate(record.species) ? record.species : null;
	// the meter says home, strain and what a hit took; only hidden still needs a word
	const tags = [];
	if (hidden) tags.push({ key: 'hidden', text: 'hidden' });

	return (
		<button
			type="button"
			className={classes.join(' ')}
			style={{ '--rec-piece': `${px}px` }}
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
						variant="token"
						speciesName={portrait}
						primaryType={element || 'ghost'}
						padding="0px"
						fill="black"
						filter={pieceShadowFilter(PIECE_RIM, px)}
						moreClasses="rec-piece-art"
					/>
				)}
				{!portrait && <span className="rec-piece-unknown">?</span>}
				{element && <XalianTypeSymbolBadge size={Math.round(px / 2.6)} type={element} classes="rec-piece-disc" />}
			</span>
			{/*
				pass 32: a plate that is acting or being hit carries the engine step as its key,
				so a creature acting twice in a row replays its animation instead of standing
				still with a class it already finished. A plate that is doing neither keeps a
				stable key and is not remounted.
			*/}
			{/*
				PASS 52. The forecast is drawn, not written: the bar below strikes out what the
				Clash would take, and a creature it would down carries a cross. "you lose it",
				"you down it", "own sweep" and "no target" were labels over the art.
			*/}
			{falls && (
				<span className="rec-figure-mark rec-figure-mark--falls" title={lossText} data-threat="downed">
					<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
				</span>
			)}
			<span className="rec-figure-plate" key={(acting || hit) && beat != null ? `beat-${beat}` : 'plate'}>
				{/* pass 38: the role glyph rides with the name, so the number below is only the hold */}
				{role && role !== 'none' && (
					<span
						className={`rec-role-glyph rec-figure-plate-role${noTarget ? ' rec-role-glyph--idle' : ''}`}
						title={noTarget ? 'No rival stands at this world, so its strike has no target' : roleSentence(role, blowMagnitude)}
						aria-label={roleSentence(role, blowMagnitude)}
						data-role={role}
						data-no-target={noTarget ? '' : undefined}
					>
						<RoleGlyph role={role} />
					</span>
				)}
				<span className="rec-figure-name">{name}</span>
				{/* pass 57: why it holds what it does here, the marks its card's column carries */}
				{reasons && (reasons.home || reasons.climate) && <WhyMarks reasons={reasons} className="rec-figure-whys" />}
				{badge && <span className="rec-figure-badge">{badge}</span>}
			</span>
			{/*
				PASS 52. The hold as a bar in this side's color, the part the Clash would take
				striped at its end, and the number. The bulb meter stays for the dossier and the intro.
			*/}
			<span className="rec-figure-foot" data-forecast={typeof hold === 'number' && typeof forecast === 'number' ? formatHoldShown(forecast) : undefined} title={lossText}>
				{typeof hold === 'number' && <HoldBar hold={hold} after={forecast} side={mine ? 'mine' : 'theirs'} className="rec-figure-bar" />}
				{/* pass 47: a standing creature under half a point read "0", and a critic asked why it had not fallen */}
				{typeof hold === 'number' && <span className="rec-figure-hold" title={`hold ${formatHold(hold)}`}>{hold > 0 && hold < 0.5 && !downed ? '<1' : formatHoldShown(hold)}</span>}
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
	one or where. Drawn as an empty stage with a blank plate, in the rival's rank.
*/
export function ReclamationSilhouette({ count }) {
	return (
		<div className="rec-silhouettes" aria-label={`${count} hidden send${count === 1 ? '' : 's'}`}>
			{Array.from({ length: count }).map((_, i) => (
				<div className="rec-figure rec-piece rec-figure--theirs rec-figure--silhouette rec-figure--down" style={{ '--rec-piece': '40px' }} key={i}>
					<span className="rec-piece-stage" aria-hidden="true"><span className="rec-piece-base" /><span className="rec-piece-unknown">?</span></span>
					<span className="rec-figure-plate"><span className="rec-figure-name">unknown</span></span>
				</div>
			))}
		</div>
	);
}

export default ReclamationFigure;
