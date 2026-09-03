import React from 'react';
import TributeCard from './tributeCard';
import { ROW, DECREES } from '../../../gameplay/tribute/tributeInterpretation';
import { decreeContribution } from '../../../gameplay/tribute/decreeCalculator';

/*
	TributeBoard - the six rows and the Court's face-down hand.
	Row order top to bottom: Court Far, Court Mid, Court Close, seam, Your Close, Your
	Mid, Your Far, so the two Close rows face each other across the seam.

	Every number on the board is the contribution under the live Decree (the same
	decreeContribution the engine scores with), never the bare printed value, so what the
	player reads is what the round will be scored on. A row that is a legal target for the
	current selection lights up and previews the total it would have after the play.
*/

const ROW_LABEL = { [ROW.CLOSE]: 'Close', [ROW.MID]: 'Mid', [ROW.FAR]: 'Far' };

function decreeName(element) {
	const found = DECREES.find((d) => d.element === element);
	return found ? found.name : element;
}

export function rowContributions(cards, row, decreeElement) {
	return cards.map((card) => decreeContribution(card.powerByRow[row], decreeElement, card.element));
}

export function rowTotal(cards, row, decreeElement) {
	return rowContributions(cards, row, decreeElement).reduce((sum, v) => sum + v, 0);
}

function RowPanel({ row, side, cards, decree, target, onRowClick }) {
	const decreeElement = decree ? decree.element : null;
	const contributions = rowContributions(cards, row, decreeElement);
	const total = contributions.reduce((sum, v) => sum + v, 0);
	const isTarget = !!target;
	const classes = [
		'g-panel',
		'tribute-row',
		`tribute-row--${side === 'A' ? 'yours' : 'court'}`,
		decreeElement ? `g-el-${decreeElement}` : '',
		decreeElement ? 'tribute-row--decreed' : '',
		isTarget ? 'tribute-row--target' : '',
	].filter(Boolean).join(' ');

	const clickable = isTarget && onRowClick;

	return (
		<div
			className={classes}
			onClick={clickable ? () => onRowClick(row, side) : undefined}
			role={clickable ? 'button' : undefined}
			tabIndex={clickable ? 0 : undefined}
			onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRowClick(row, side); } } : undefined}
			aria-label={`${side === 'A' ? 'Your' : "Court's"} ${ROW_LABEL[row]} row, total ${total}`}
		>
			<span className="tribute-row-label">
				<span className="tribute-row-side">{side === 'A' ? 'Your' : "Court's"}</span>
				<span className="tribute-row-range">{ROW_LABEL[row]}</span>
			</span>
			<div className="tribute-row-cards">
				{cards.map((card, i) => (
					<TributeCard key={card.id} card={card} compact activeRow={row} contribution={contributions[i]} />
				))}
				{decreeElement && (
					<span className={`g-chip g-el-${decreeElement} tribute-row-decree-chip`} title="A Court Decree over this range, on both sides">
						{decreeName(decreeElement)}
					</span>
				)}
				{cards.length === 0 && !decreeElement && <span className="tribute-row-empty">no creatures</span>}
			</div>
			<span className="tribute-row-total">
				<span className="tribute-row-total-now">{total}</span>
				{isTarget && target.total != null && target.total !== total && (
					<span className="tribute-row-total-preview">{target.total}</span>
				)}
			</span>
		</div>
	);
}

/*
	targets: { [row]: { A?: { total }, B?: { total } } } - which rows light up for the
	current selection and the total each would show after the play.
*/
function TributeBoard({ board, activeDecrees, botHandCount, targets, onRowClick }) {
	const targetFor = (row, side) => (targets && targets[row] && targets[row][side]) || null;

	return (
		<div className="tribute-board">
			<div className="tribute-board-bot-hand" aria-label={`Court's hand: ${botHandCount} cards`}>
				<span className="tribute-status-label">Court's hand</span>
				<span className="tribute-board-bot-hand-cards">
					{Array.from({ length: botHandCount }).map((_, i) => (
						<span className="tribute-card tribute-card--back" key={`bot-back-${i}`} />
					))}
				</span>
				<span className="tribute-board-bot-hand-count">{botHandCount}</span>
			</div>

			<RowPanel row={ROW.FAR} side="B" cards={board[ROW.FAR].B} decree={activeDecrees[ROW.FAR]} target={targetFor(ROW.FAR, 'B')} onRowClick={onRowClick} />
			<RowPanel row={ROW.MID} side="B" cards={board[ROW.MID].B} decree={activeDecrees[ROW.MID]} target={targetFor(ROW.MID, 'B')} onRowClick={onRowClick} />
			<RowPanel row={ROW.CLOSE} side="B" cards={board[ROW.CLOSE].B} decree={activeDecrees[ROW.CLOSE]} target={targetFor(ROW.CLOSE, 'B')} onRowClick={onRowClick} />

			<div className="g-seam-rule tribute-seam" />

			<RowPanel row={ROW.CLOSE} side="A" cards={board[ROW.CLOSE].A} decree={activeDecrees[ROW.CLOSE]} target={targetFor(ROW.CLOSE, 'A')} onRowClick={onRowClick} />
			<RowPanel row={ROW.MID} side="A" cards={board[ROW.MID].A} decree={activeDecrees[ROW.MID]} target={targetFor(ROW.MID, 'A')} onRowClick={onRowClick} />
			<RowPanel row={ROW.FAR} side="A" cards={board[ROW.FAR].A} decree={activeDecrees[ROW.FAR]} target={targetFor(ROW.FAR, 'A')} onRowClick={onRowClick} />
		</div>
	);
}

export default TributeBoard;
