import React from 'react';
import ReclamationFigure, { ReclamationSilhouette } from './reclamationFigure';
import { baseHold } from '../../../gameplay/expedition/creatureOnTable';

/*
	ReclamationRoster — the strip of figures waiting to be sent, plus the rival's hidden
	sends drawn as silhouettes (they are on the table, but the handler is not told where,
	so the only honest place to show them is the rail).
*/
function ReclamationRoster({
	roster,
	you,
	armedRecordId,
	onArm,
	onInspect,
	sendsLeft,
	hiddenEnemyCount,
	disabled,
}) {
	return (
		<div className="rec-roster">
			<header className="rec-roster-head">
				<span className="g-label">Your roster</span>
				<span className="g-mono rec-roster-count">{roster.length} in hand · {sendsLeft} sends left</span>
			</header>
			<div className="rec-roster-strip">
				{roster.map((record) => (
					<ReclamationFigure
						key={record.id}
						record={record}
						element={record.element.primary}
						seat={you}
						you={you}
						facing="up"
						size="small"
						hold={baseHold(record)}
						armed={armedRecordId === record.id}
						dimmed={disabled}
						onClick={(e) => {
							e.stopPropagation();
							if (e.shiftKey) {
								onInspect(record);
							} else {
								onArm(record.id);
							}
						}}
						title={armedRecordId === record.id ? 'Armed. Click a site to send it, or Escape to disarm.' : 'Click to arm this creature. Shift-click to inspect it.'}
					/>
				))}
				{roster.length === 0 && <span className="rec-rank-empty">your roster is empty</span>}
			</div>
			{hiddenEnemyCount > 0 && (
				<div className="rec-roster-hidden">
					<span className="g-label">Rival, hidden</span>
					<ReclamationSilhouette count={hiddenEnemyCount} />
				</div>
			)}
		</div>
	);
}

export default ReclamationRoster;
