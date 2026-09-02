import React from 'react';
import TributeCard from './tributeCard';
import { ROW, DECREES } from '../../../gameplay/tribute/tributeInterpretation';

/*
	TributeBoard - the six rows, seam rule, and the Court's face-down hand strip.
	Row order top to bottom (docs/design/tribute-design.md's UI brief): Court Far, Court
	Mid, Court Close, seam, Your Close, Your Mid, Your Far - so the two Close rows face
	each other across the seam.
*/

const ROW_LABEL = { [ROW.CLOSE]: 'Close', [ROW.MID]: 'Mid', [ROW.FAR]: 'Far' };

function decreeName(element) {
	const found = DECREES.find((d) => d.element === element);
	return found ? found.name : element;
}

function RowPanel({ row, side, cards, decree, isTarget, onRowClick }) {
	const total = cards.reduce((sum, c) => sum + (c.powerByRow[row] != null ? c.powerByRow[row] : 0), 0);
	const decreeElement = decree ? decree.element : null;
	const classes = [
		'g-panel',
		'tribute-row',
		decreeElement ? `g-el-${decreeElement}` : '',
		decreeElement ? 'tribute-row--decreed' : '',
		isTarget ? 'tribute-row--target' : '',
	].filter(Boolean).join(' ');

	return (
		<div
			className={classes}
			onClick={onRowClick ? () => onRowClick(row, side) : undefined}
			role={onRowClick ? 'button' : undefined}
			tabIndex={onRowClick ? 0 : undefined}
			onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { onRowClick(row, side); } } : undefined}
		>
			<span className="tribute-row-label">{side === 'A' ? 'Your' : "Court's"} {ROW_LABEL[row]}</span>
			<div className="tribute-row-cards">
				{cards.length === 0 && <span className="tribute-row-empty">--</span>}
				{cards.map((card) => (
					<TributeCard key={card.id} card={card} compact activeRow={row} />
				))}
				{decreeElement && (
					<span className={`g-chip g-el-${decreeElement} tribute-row-decree-chip`}>{decreeName(decreeElement)}</span>
				)}
			</div>
			<span className="tribute-row-total">{total}</span>
		</div>
	);
}

function TributeBoard({ board, activeDecrees, botHandCount, targetRows, targetSides, onRowClick }) {
	const sides = targetSides || ['A'];
	const isTarget = (row, side) => !!(targetRows && targetRows.includes(row) && sides.includes(side));

	return (
		<div className="tribute-board">
			<div className="tribute-board-bot-hand" aria-label="Court's hand">
				{Array.from({ length: botHandCount }).map((_, i) => (
					<span className="tribute-card tribute-card--back" key={`bot-back-${i}`} />
				))}
			</div>

			<RowPanel row={ROW.FAR} side="B" cards={board[ROW.FAR].B} decree={activeDecrees[ROW.FAR]} isTarget={isTarget(ROW.FAR, 'B')} onRowClick={onRowClick} />
			<RowPanel row={ROW.MID} side="B" cards={board[ROW.MID].B} decree={activeDecrees[ROW.MID]} isTarget={isTarget(ROW.MID, 'B')} onRowClick={onRowClick} />
			<RowPanel row={ROW.CLOSE} side="B" cards={board[ROW.CLOSE].B} decree={activeDecrees[ROW.CLOSE]} isTarget={isTarget(ROW.CLOSE, 'B')} onRowClick={onRowClick} />

			<div className="g-seam-rule" />

			<RowPanel row={ROW.CLOSE} side="A" cards={board[ROW.CLOSE].A} decree={activeDecrees[ROW.CLOSE]} isTarget={isTarget(ROW.CLOSE, 'A')} onRowClick={onRowClick} />
			<RowPanel row={ROW.MID} side="A" cards={board[ROW.MID].A} decree={activeDecrees[ROW.MID]} isTarget={isTarget(ROW.MID, 'A')} onRowClick={onRowClick} />
			<RowPanel row={ROW.FAR} side="A" cards={board[ROW.FAR].A} decree={activeDecrees[ROW.FAR]} isTarget={isTarget(ROW.FAR, 'A')} onRowClick={onRowClick} />
		</div>
	);
}

export default TributeBoard;
