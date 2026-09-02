import React from 'react';
import { ROW } from '../../../gameplay/tribute/tributeInterpretation';
import { capitalizeElement } from '../../../gameplay/tribute/tributeInterpretation';

/*
	TributeCard - a court dossier on one creature (docs/design/tribute-design.md's
	"Lore framing": "the card face shows the real record"). Renders the same card shape
	for the hand (full face) and the board (compact - name, this row's number, element
	flash only). No artwork: provisional species have none, so the plate is a printed
	stencil, not an image socket.
*/

const ROW_LABELS = { [ROW.CLOSE]: 'CLOSE', [ROW.MID]: 'MID', [ROW.FAR]: 'FAR' };
const ROW_ORDER = [ROW.CLOSE, ROW.MID, ROW.FAR];

function powerCell(card, row) {
	const eligible = card.eligibleRows.includes(row);
	if (!eligible) {
		return <span className="tribute-card-cell tribute-card-cell--ineligible">--</span>;
	}
	return <span className="tribute-card-cell">{card.powerByRow[row]}</span>;
}

function TributeCard({ card, compact, selected, activeRow, onClick }) {
	if (!card) {
		return null;
	}
	const primaryElement = card.element && card.element.primary;
	const secondaryEntries = card.element
		? Object.keys(card.element.affinities || {}).filter((k) => k !== primaryElement)
		: [];
	const secondaryElement = secondaryEntries[0] || null;
	const secondaryGrade = secondaryElement ? card.element.affinities[secondaryElement] : null;

	// the element is carried by a painted band (top edge on the full face, left edge on
	// the compact one) rather than the corner flash, which would sit under the name
	const classes = [
		'g-panel',
		`g-el-${primaryElement}`,
		'tribute-card',
		compact ? 'tribute-card--compact' : 'tribute-card--full',
		selected ? 'tribute-card--selected' : '',
	].filter(Boolean).join(' ');

	if (compact) {
		const value = activeRow ? card.powerByRow[activeRow] : null;
		return (
			<button
				type="button"
				className={classes}
				aria-pressed={!!selected}
				onClick={onClick}
				disabled={!onClick}
			>
				<span className="tribute-card-compact-name">{card.name}</span>
				<span className="tribute-card-compact-value">{value != null ? value : '--'}</span>
			</button>
		);
	}

	return (
		<button
			type="button"
			className={classes}
			aria-pressed={!!selected}
			onClick={onClick}
		>
			<span className="tribute-card-name">{card.name}</span>
			<span className="tribute-card-chips">
				<span className="g-chip">{capitalizeElement(primaryElement)}</span>
				{secondaryElement && (
					<span className="g-chip g-chip--outline">{capitalizeElement(secondaryElement)} {secondaryGrade}</span>
				)}
			</span>
			{card.archetype && card.archetype.key && (
				<span className="tribute-card-archetype">{card.archetype.key}</span>
			)}
			<span className="tribute-card-cells">
				{ROW_ORDER.map((row) => (
					<span className="tribute-card-cell-group" key={row}>
						<span className="tribute-card-cell-label">{ROW_LABELS[row]}</span>
						{powerCell(card, row)}
					</span>
				))}
			</span>
		</button>
	);
}

export default TributeCard;
