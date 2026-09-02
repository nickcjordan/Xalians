import React from 'react';
import { speciesLabel, formatHold } from './reclamationNarration';

/*
	ReclamationFigure — one creature standing on the table.

	No artwork exists for the provisional species, so the figure is what a wargame figure
	would be if the machine shop made it: the species name stencilled on a small steel
	plate, standing on a painted disc plinth. The side's paint is the disc (bone/olive for
	the handler, gunmetal for the rival), the element is a medallion on the front of the
	disc, and the creature's live hold is stamped at the disc's foot in tabular mono.

	Every number here is passed in from the engine's own prepare(); this component never
	computes one.
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
	dimmed,
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
	if (dimmed) {
		classes.push('rec-figure--dimmed');
	}
	if (element) {
		classes.push(`g-el-${element}`);
	}

	const name = record ? speciesLabel(record) : (label || 'Unknown');

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
			<span className="rec-figure-plate">
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
			</span>
			{(strainLevel === 'strained' || strainLevel === 'severe' || isHome) && (
				<span className="rec-figure-tags">
					{isHome && <span className="rec-tag rec-tag--home">home</span>}
					{strainLevel === 'strained' && <span className="rec-tag rec-tag--strain">strained</span>}
					{strainLevel === 'severe' && <span className="rec-tag rec-tag--severe">severe</span>}
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
						<span className="rec-figure-name">something was sent</span>
					</span>
					<span className="rec-figure-plinth" />
					<span className="rec-figure-foot"><span className="rec-figure-hold">?</span></span>
				</div>
			))}
		</div>
	);
}

export default ReclamationFigure;
