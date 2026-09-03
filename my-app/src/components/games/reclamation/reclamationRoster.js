import React from 'react';
import ReclamationFigure from './reclamationFigure';
import { baseHold } from '../../../gameplay/expedition/creatureOnTable';

/*
	ReclamationRoster — the strip of figures waiting to be sent. Each shows its base
	hold and element so the twelve can be compared at a glance; the hold it would have
	at each site appears on the sites themselves once it is armed.
*/
function ReclamationRoster({
	roster,
	you,
	armedRecordId,
	onArm,
	onInspect,
	sendsLeft,
	disabled,
	yourTurn,
}) {
	return (
		<div className="rec-roster">
			<header className="rec-roster-head">
				<span className="g-label">Your roster</span>
				<span className="g-mono rec-roster-count">{roster.length} in hand · {sendsLeft} sends left this expedition</span>
				<span className="g-mono rec-roster-help">
					{yourTurn ? 'click one to arm it · shift-click to read its dossier' : 'shift-click to read a dossier'}
				</span>
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
		</div>
	);
}

export default ReclamationRoster;
