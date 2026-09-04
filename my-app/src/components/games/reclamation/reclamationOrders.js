import React from 'react';
import { speciesLabel } from './reclamationNarration';

/*
	ReclamationOrders — the Orders phase panel.

	Every one of your creatures on the table gets a row of act chips (each act by name
	with its magnitude and class, plus Hold). The archetype's favored act starts chosen
	and is marked "by nature", exactly as the engine treats an unordered creature. The
	chips are radio buttons, so the chosen act is visible without opening anything.

	Beneath it, the resolution preview: the initiative order of every visible creature
	and, for each of yours, the target its conduct would pick right now, in words.
	Hovering a preview line lights the creatures it names on the table.

	The "Give orders" button is the one action of the phase, so it is pinned at the top
	of the panel where it cannot scroll away.
*/
function ReclamationOrders({
	units,
	orders,
	preview,
	onOrder,
	onCommit,
	committed,
	panelRef,
	onHoverPreview,
}) {
	const ordered = units.filter((u) => orders && orders[u.recordId]).length;
	return (
		<div className="rec-orders" ref={panelRef} tabIndex={-1} aria-label="Orders">
			<div className="rec-orders-list">
				<header className="rec-orders-head">
					<div>
						<span className="g-label">Orders</span>
						<span className="g-mono rec-orders-hint">
							{committed
								? 'Orders sealed. Waiting on the rival.'
								: `${ordered} of ${units.length} chosen; the rest act by nature.`}
						</span>
					</div>
					<button
						type="button"
						className="g-btn g-btn--primary rec-commit-btn"
						onClick={onCommit}
						disabled={committed}
						data-commit-orders
					>
						{committed ? 'Orders given' : 'Give orders'}
					</button>
				</header>
				{units.map((unit) => {
					const favored = unit.prepared.favoredAct.action;
					const chosen = (orders && orders[unit.recordId]) || favored;
					// A creature can carry two abilities with the SAME action (the roller happily
					// gives one creature two `drain` acts), and the engine's order() takes an
					// action name, not an ability. Identical actions are merged into one chip
					// naming both abilities; the chip's value stays the action name.
					const byAction = new Map();
					unit.prepared.acts.forEach((a) => {
						const existing = byAction.get(a.action);
						if (existing) {
							existing.names.push(a.name);
							existing.magnitude = Math.max(existing.magnitude, a.magnitude);
						} else {
							byAction.set(a.action, { action: a.action, names: [a.name], magnitude: a.magnitude, cls: a.class });
						}
					});
					const options = [
						...[...byAction.values()].map((a) => ({
							value: a.action,
							act: a.action,
							name: a.names.join(' / '),
							magnitude: a.magnitude,
							cls: a.cls,
						})),
						{ value: 'hold', act: 'hold', name: 'Hold', magnitude: null, cls: 'keeps full hold' },
					];
					return (
						<div className={`rec-order-row g-el-${unit.record.element.primary}`} key={unit.recordId} data-order-row={unit.recordId}>
							<div className="rec-order-who">
								<span className="rec-order-name">{speciesLabel(unit.record)}</span>
								<span className="rec-order-site g-mono">{unit.site.name} · hold {unit.prepared.hold.toFixed(1).replace(/\.0$/, '')}</span>
							</div>
							<div className="rec-order-chips" role="radiogroup" aria-label={`Act for ${speciesLabel(unit.record)}`}>
								{options.map((o) => {
									const isChosen = o.value === chosen;
									return (
										<button
											type="button"
											role="radio"
											aria-checked={isChosen}
											className={`rec-act-chip${isChosen ? ' rec-act-chip--chosen' : ''}`}
											key={o.value}
											disabled={committed}
											data-order-for={unit.recordId}
											data-act={o.value}
											onClick={() => onOrder(unit.recordId, o.value)}
											title={o.name}
										>
											<span className="rec-act-chip-act">{o.act}</span>
											{o.magnitude !== null && <span className="rec-act-chip-mag">{o.magnitude}</span>}
											<span className="rec-act-chip-sub">{o.value === favored ? 'by nature' : o.cls}</span>
										</button>
									);
								})}
							</div>
						</div>
					);
				})}
				{units.length === 0 && <p className="g-body rec-rank-empty">You sent nothing this round.</p>}
			</div>

			<div className="g-screen rec-preview" aria-label="Resolution preview">
				<div className="g-readout-unit">What will happen, in initiative order</div>
				{preview.map((row, i) => (
					<div
						className={`g-screen-line rec-preview-line${row.isYours ? '' : ' g-screen-line--dim'}`}
						key={`${row.unit.recordId}-${i}`}
						onMouseEnter={onHoverPreview ? () => onHoverPreview(row) : undefined}
						onMouseLeave={onHoverPreview ? () => onHoverPreview(null) : undefined}
					>
						{i + 1}. {row.isYours ? row.sentence : `${speciesLabel(row.unit.record)} (rival) acts here, orders unknown.`}
					</div>
				))}
				{preview.length === 0 && <div className="g-screen-line--dim">Nothing stands in the frame.</div>}
			</div>
		</div>
	);
}

export default ReclamationOrders;
