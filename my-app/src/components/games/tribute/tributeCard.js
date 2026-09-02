import React from 'react';
import { ROW, capitalizeElement } from '../../../gameplay/tribute/tributeInterpretation';

/*
	TributeCard - a court dossier on one creature (docs/design/tribute-design.md's
	"Lore framing": "the card face shows the real record"). Two faces:

	- full (the hand): name, element chip (plus a graded second affinity), and the number
	  it fights for in each row, with "--" where it cannot stand.
	- compact (the board): name and the number it is worth in its row right now. When a
	  Decree has changed that number the printed value is shown struck through beside it,
	  so the weather's effect is visible card by card.

	No artwork: provisional species have none, so the plate is a printed stencil.
*/

const ROW_LABELS = { [ROW.CLOSE]: 'Close', [ROW.MID]: 'Mid', [ROW.FAR]: 'Far' };
const ROW_ORDER = [ROW.CLOSE, ROW.MID, ROW.FAR];

function secondaryOf(card) {
	const primary = card.element && card.element.primary;
	const keys = card.element ? Object.keys(card.element.affinities || {}).filter((k) => k !== primary) : [];
	if (keys.length === 0) {
		return null;
	}
	return { element: keys[0], grade: card.element.affinities[keys[0]] };
}

function TributeCard({ card, compact, selected, activeRow, contribution, onClick, title }) {
	if (!card) {
		return null;
	}
	const primaryElement = card.element && card.element.primary;
	const secondary = secondaryOf(card);

	const classes = [
		'g-panel',
		`g-el-${primaryElement}`,
		'tribute-card',
		compact ? 'tribute-card--compact' : 'tribute-card--full',
		selected ? 'tribute-card--selected' : '',
		onClick ? 'tribute-card--clickable' : '',
	].filter(Boolean).join(' ');

	if (compact) {
		const printed = activeRow ? card.powerByRow[activeRow] : null;
		const shown = contribution != null ? contribution : printed;
		const changed = printed != null && contribution != null && contribution !== printed;
		return (
			<span className={classes} title={title || `${card.name}, ${capitalizeElement(primaryElement)}`}>
				<span className="tribute-card-compact-name">{card.name}</span>
				{changed && <span className="tribute-card-compact-printed">{printed}</span>}
				<span className="tribute-card-compact-value">{shown != null ? shown : '--'}</span>
			</span>
		);
	}

	return (
		<button
			type="button"
			className={classes}
			aria-pressed={!!selected}
			onClick={onClick}
			title={title}
		>
			<span className="tribute-card-name">{card.name}</span>
			<span className="tribute-card-chips">
				<span className="g-chip">{capitalizeElement(primaryElement)}</span>
			</span>
			<span className="tribute-card-secondary" title={secondary ? `Second affinity: ${capitalizeElement(secondary.element)} at grade ${secondary.grade}` : undefined}>
				{secondary ? `+ ${capitalizeElement(secondary.element)} ${secondary.grade}` : ''}
			</span>
			<span className="tribute-card-cells">
				{ROW_ORDER.map((row) => {
					const eligible = card.eligibleRows.includes(row);
					return (
						<span className={`tribute-card-cell-group${eligible ? '' : ' tribute-card-cell-group--ineligible'}`} key={row}>
							<span className="tribute-card-cell-label">{ROW_LABELS[row]}</span>
							<span className="tribute-card-cell">{eligible ? card.powerByRow[row] : '--'}</span>
						</span>
					);
				})}
			</span>
		</button>
	);
}

export default TributeCard;
