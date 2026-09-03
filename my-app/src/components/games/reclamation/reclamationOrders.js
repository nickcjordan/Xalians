import React from 'react';
import { speciesLabel } from './reclamationNarration';

/*
	ReclamationOrders — the Orders phase panel.

	Every one of your creatures on the table gets an act selector (its acts by name with
	magnitude, plus Hold). The archetype's favored act is preselected and marked "by
	nature", exactly as the engine treats an unordered creature. Beside it, the resolution
	preview: the initiative order of every visible creature and, for each of yours, the
	target its conduct would pick right now, in words.
*/
function ReclamationOrders({
	units,
	orders,
	preview,
	onOrder,
	onCommit,
	committed,
	you,
	panelRef,
}) {
	return (
		<div className="rec-orders" ref={panelRef} tabIndex={-1} aria-label="Orders">
			<div className="rec-orders-list">
				<header className="rec-orders-head">
					<span className="g-label">Orders</span>
					<span className="g-mono rec-orders-hint">
						{committed ? 'Orders sealed. Waiting on the rival.' : 'Choose an act for each creature, then give orders.'}
					</span>
				</header>
				{units.map((unit) => {
					const favored = unit.prepared.favoredAct.action;
					const chosen = (orders && orders[unit.recordId]) || favored;
					// A creature can carry two abilities with the SAME action (the roller happily
					// gives one creature two `drain` acts), and the engine's order() takes an
					// action name, not an ability. Two options with the same value would collide
					// as React keys and make the second unpickable, so identical actions are
					// merged into one option naming both abilities, and the option's value stays
					// the action name the engine expects.
					const byAction = new Map();
					unit.prepared.acts.forEach((a) => {
						const existing = byAction.get(a.action);
						if (existing) {
							existing.names.push(a.name);
							existing.magnitude = Math.max(existing.magnitude, a.magnitude);
						} else {
							byAction.set(a.action, { action: a.action, names: [a.name], magnitude: a.magnitude });
						}
					});
					const options = [
						...[...byAction.values()].map((a) => ({
							value: a.action,
							label: `${a.names.join(' / ')} — ${a.action}, magnitude ${a.magnitude}`,
						})),
						{ value: 'hold', label: 'Hold — keep full hold' },
					];
					return (
						<div className={`rec-order-row g-el-${unit.record.element.primary}`} key={unit.recordId}>
							<div className="rec-order-who">
								<span className="rec-order-name">{speciesLabel(unit.record)}</span>
								<span className="rec-order-site g-mono">{unit.site.name}</span>
							</div>
							<select
								className="g-select rec-order-select"
								value={chosen}
								disabled={committed}
								data-order-for={unit.recordId}
								onChange={(e) => onOrder(unit.recordId, e.target.value)}
							>
								{options.map((o) => (
									<option value={o.value} key={o.value}>
										{o.label}{o.value === favored ? ' (by nature)' : ''}
									</option>
								))}
							</select>
						</div>
					);
				})}
				{units.length === 0 && <p className="g-body rec-rank-empty">You sent nothing to this world.</p>}
				<button
					type="button"
					className="g-btn g-btn--primary rec-commit-btn"
					onClick={onCommit}
					disabled={committed}
				>
					{committed ? 'Orders given' : 'Give orders'}
				</button>
			</div>

			<div className="g-screen rec-preview" aria-label="Resolution preview">
				<div className="g-readout-unit">Resolution preview · initiative order</div>
				{preview.map((row, i) => (
					<div
						className={`g-screen-line${row.isYours ? '' : ' g-screen-line--dim'}`}
						key={`${row.unit.recordId}-${i}`}
					>
						{i + 1}. {row.isYours ? row.sentence : `${speciesLabel(row.unit.record)} (rival) acts here, orders unknown.`}
					</div>
				))}
				{preview.length === 0 && <div className="g-screen-line--dim">Nothing stands on this world.</div>}
			</div>
		</div>
	);
}

export default ReclamationOrders;
