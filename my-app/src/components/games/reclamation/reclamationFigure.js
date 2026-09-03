import React from 'react';
import { speciesLabel, formatHold } from './reclamationNarration';
import XalianSVG from '../../../svg/species/xalianSvg';
import { getSpeciesTemplate } from '../../../gameplay/generator/index.js';

/*
	ReclamationFigure — one creature standing on the table.

	The figure is what a wargame figure would be if the machine shop made it: the species
	silhouette (the Encyclopedia's own species art) and its name stencilled on a small
	steel plate, standing on a painted disc plinth. The side's paint is the disc (bone/olive for
	the handler, gunmetal for the rival), the element is a medallion on the front of the
	disc with its name beside it, and the creature's live hold is stamped at the disc's
	foot in tabular mono, large, because hold is the number the whole game is counted in.

	Every number here is passed in from the engine's own prepare(); this component never
	computes one.

	Emphasis states, all set by the controller:
	- armed / selected: the creature the next click will act on
	- acting / hit: the creature acting or being acted on during resolution playback,
	  with `flash` naming the outcome over the figure
	- hover: the target of the preview line under the pointer during Orders
	- badge: a small tag on the plate (the act ordered, during Orders)
*/
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
	ghostHold,
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
	const classes = ['rec-figure'];
	classes.push(mine ? 'rec-figure--mine' : 'rec-figure--theirs');
	classes.push(facing === 'down' ? 'rec-figure--down' : 'rec-figure--up');
	if (size) {
		classes.push(`rec-figure--${size}`);
	}
	if (staggered) {
		classes.push('rec-figure--staggered');
	}
	if (routed) {
		classes.push('rec-figure--routed');
	}
	if (hidden) {
		classes.push('rec-figure--hidden');
	}
	if (selected) {
		classes.push('rec-figure--selected');
	}
	if (armed) {
		classes.push('rec-figure--armed');
	}
	if (recommended) {
		classes.push('rec-figure--recommended');
	}
	if (dimmed) {
		classes.push('rec-figure--dimmed');
	}
	if (acting) {
		classes.push('rec-figure--acting');
	}
	if (hit) {
		classes.push('rec-figure--hit');
	}
	if (hover) {
		classes.push('rec-figure--hover');
	}
	if (arrive) {
		classes.push('rec-figure--arrive');
	}
	if (element) {
		classes.push(`g-el-${element}`);
	}

	const name = record ? speciesLabel(record) : (label || 'Unknown');
	// the species silhouette from the Encyclopedia's own art, when the record is a real species
	const portrait = record && record.species && getSpeciesTemplate(record.species) && !hidden ? record.species : null;
	const tags = [];
	if (isHome) {
		tags.push({ key: 'home', text: 'home' });
	}
	if (strainLevel === 'strained') {
		tags.push({ key: 'strain', text: 'strained' });
	}
	if (strainLevel === 'severe') {
		tags.push({ key: 'severe', text: 'severe strain' });
	}
	if (staggered) {
		tags.push({ key: 'staggered', text: 'staggered' });
	}
	if (hidden) {
		tags.push({ key: 'hidden', text: 'hidden' });
	}

	return (
		<button
			type="button"
			className={classes.join(' ')}
			onClick={onClick}
			title={title || name}
			aria-label={`${name}${typeof hold === 'number' ? `, hold ${formatHold(hold)}` : ''}`}
			data-record-id={record ? record.id : undefined}
			data-hold={typeof hold === 'number' ? formatHold(hold) : undefined}
		>
			{flash && <span className={`rec-figure-flash rec-figure-flash--${flash.kind}`}>{flash.text}</span>}
			<span className="rec-figure-plate">
				{portrait && (
					<span className="rec-figure-portrait" aria-hidden="true">
						<XalianSVG name={portrait} className="rec-figure-portrait-svg" />
					</span>
				)}
				<span className="rec-figure-name">{name}</span>
				{badge && <span className="rec-figure-badge">{badge}</span>}
			</span>
			<span className="rec-figure-plinth">
				<span className="rec-figure-medallion" aria-hidden="true" />
			</span>
			<span className="rec-figure-foot">
				{staggered && typeof printedHold === 'number' && (
					<span className="rec-figure-hold rec-figure-hold--struck">{formatHold(printedHold)}</span>
				)}
				{typeof hold === 'number' && <span className="rec-figure-hold">{formatHold(hold)}</span>}
				{typeof ghostHold === 'number' && <span className="rec-figure-hold rec-figure-hold--ghost">{formatHold(ghostHold)}</span>}
				{element && <span className="rec-figure-element">{element}</span>}
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
	one or where. Drawn as an empty plinth with a blank plate, in the rival's paint.
*/
export function ReclamationSilhouette({ count }) {
	return (
		<div className="rec-silhouettes" aria-label={`${count} hidden send${count === 1 ? '' : 's'}`}>
			{Array.from({ length: count }).map((_, i) => (
				<div className="rec-figure rec-figure--theirs rec-figure--silhouette rec-figure--down" key={i}>
					<span className="rec-figure-plate">
						<span className="rec-figure-name">unknown</span>
					</span>
					<span className="rec-figure-plinth" />
					<span className="rec-figure-foot"><span className="rec-figure-hold">?</span></span>
				</div>
			))}
		</div>
	);
}

export default ReclamationFigure;
