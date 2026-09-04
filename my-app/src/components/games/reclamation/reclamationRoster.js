import React from 'react';
import XalianImage from '../../xalianImage';
import { speciesLabel, formatHold } from './reclamationNarration';
import { prepare, baseHold } from '../../../gameplay/expedition/creatureOnTable';
import { elementName } from './reclamationVocabulary';

/*
	ReclamationRoster — your twelve, as the Duel's roster rail draws a squad.

	Every creature you brought has a fixed slot for the whole expedition, in a fixed
	order, so nothing reshuffles under the cursor: in hand, then sent (with the site it
	stands at), then holding a won site on an earlier world, or routed out of the
	expedition. A slot carries the species portrait, the name, a hold meter on the
	Duel's bulb-strip construction, and one chip per site of this world saying what
	the creature would hold there, with the best site marked and strain named, so the
	twelve can be compared without arming each in turn (Nick, 2026-09-04).

	Every number comes from the engine's own prepare() for the site in question.
*/
export const HOLD_METER_MAX = 20; // attributes run 0-100 and hold divides their mean by 5

export function slotStateOf(record, view, you) {
	const me = view.players[you];
	if ((me.roster || []).some((r) => r.id === record.id)) {
		return { state: 'hand' };
	}
	for (const site of view.world.sites) {
		const entry = (view.board[site.id][you] || []).find((e) => e.recordId === record.id);
		if (entry) {
			return { state: 'sent', site };
		}
	}
	if ((me.holding || []).includes(record.id)) {
		return { state: 'holding' };
	}
	if ((me.routed || []).includes(record.id)) {
		return { state: 'routed' };
	}
	return { state: 'away' };
}

export function siteHoldsFor(record, view, you) {
	const sentCount = view.players[you].sentCount || 0;
	return view.world.sites.map((site, index) => {
		const p = prepare(record, site, view.world, sentCount);
		return { site, index, hold: p.hold, strainLevel: p.strainLevel, isHome: p.isHome };
	});
}

function HoldMeter({ value, label }) {
	const pct = Math.max(0, Math.min(100, (value / HOLD_METER_MAX) * 100));
	return (
		<span className="rec-slot-meter-row">
			<span className="rec-slot-meter-label">{label || 'hold'}</span>
			<span className="rec-slot-meter"><span className="rec-slot-meter-fill" style={{ width: `${pct}%` }} /></span>
			<span className="rec-slot-meter-value">{formatHold(value)}</span>
		</span>
	);
}

export function RosterSlot({
	record,
	slot,
	holds,
	you,
	armed,
	suggested,
	stealthy,
	disabled,
	onArm,
	onInspect,
	onHover,
	compact,
}) {
	const el = record.element.primary;
	const classes = ['rec-slot', `rec-slot--${slot.state}`, `g-el-${el}`];
	if (armed) classes.push('rec-slot--armed');
	if (suggested) classes.push('rec-slot--suggested');
	if (disabled) classes.push('rec-slot--disabled');
	if (compact) classes.push('rec-slot--compact');
	const best = holds && holds.length > 0 ? holds.reduce((a, b) => (b.hold > a.hold ? b : a)) : null;
	const inHand = slot.state === 'hand';
	return (
		<div className={classes.join(' ')} data-slot={record.id} data-slot-state={slot.state}>
			<button
				type="button"
				className="rec-slot-main"
				onClick={() => inHand && !disabled && onArm && onArm(record.id)}
				onMouseEnter={() => onHover && onHover(record.id)}
				onMouseLeave={() => onHover && onHover(null)}
				onFocus={() => onHover && onHover(record.id)}
				onBlur={() => onHover && onHover(null)}
				aria-pressed={armed}
				disabled={!inHand}
				title={inHand ? (armed ? 'Chosen. Pick a site next, or press again to put it back.' : 'Choose this creature') : undefined}
				data-arm={inHand ? record.id : undefined}
			>
				<span className="rec-slot-portrait" aria-hidden="true">
					<XalianImage speciesName={record.species} primaryType={el} padding="0px" fill="black" moreClasses="rec-slot-portrait-art" />
				</span>
				<span className="rec-slot-body">
					<span className="rec-slot-ident">
						<span className="rec-slot-name">{speciesLabel(record)}</span>
						<span className="rec-slot-element">{elementName(el).toLowerCase()}</span>
						{slot.state === 'sent' && <span className="rec-slot-tag rec-slot-tag--sent">sent · {slot.site.name}</span>}
						{slot.state === 'holding' && <span className="rec-slot-tag rec-slot-tag--holding">holding a site</span>}
						{slot.state === 'routed' && <span className="rec-slot-tag rec-slot-tag--routed">routed</span>}
						{slot.state === 'away' && <span className="rec-slot-tag">away</span>}
						{inHand && suggested && <span className="rec-slot-tag rec-slot-tag--suggested">suggested</span>}
						{inHand && stealthy && <span className="rec-slot-tag rec-slot-tag--stealthy" title="Can be sent hidden">stealthy</span>}
					</span>
					<HoldMeter value={baseHold(record)} />
					{inHand && holds && (
						<span className="rec-slot-sites" aria-label="Hold at each site of this world">
							{holds.map((h) => (
								<span
									key={h.site.id}
									className={`rec-slot-site${best && best.site.id === h.site.id && holds.length > 1 ? ' rec-slot-site--best' : ''} rec-slot-site--${h.strainLevel}${h.isHome ? ' rec-slot-site--home' : ''}`}
									title={`${h.site.name}: holds ${formatHold(h.hold)}${h.isHome ? ', home ground' : ''}${h.strainLevel !== 'none' ? `, ${h.strainLevel}` : ''}`}
								>
									<span className="rec-slot-site-index">{h.index + 1}</span>
									<span className="rec-slot-site-hold">{formatHold(h.hold)}</span>
									{h.isHome && <span className="rec-slot-site-mark rec-slot-site-mark--home">home</span>}
									{h.strainLevel === 'strained' && <span className="rec-slot-site-mark rec-slot-site-mark--strain">strain</span>}
									{h.strainLevel === 'severe' && <span className="rec-slot-site-mark rec-slot-site-mark--severe">severe</span>}
								</span>
							))}
						</span>
					)}
				</span>
			</button>
			<button
				type="button"
				className="rec-slot-read"
				onClick={(e) => { e.stopPropagation(); onInspect && onInspect(record); }}
				title="Read this creature's dossier"
				data-read={record.id}
			>
				read
			</button>
		</div>
	);
}

function ReclamationRoster({
	squad, // every record you brought, in slot order
	view,
	you,
	armedRecordId,
	recommendedRecordId,
	onArm,
	onInspect,
	onHover,
	disabled,
	compact,
}) {
	const inHand = (view.players[you].roster || []).length;
	return (
		<div className="rec-roster" data-roster>
			<div className="rec-roster-entries">
				{squad.map((record) => {
					const slot = slotStateOf(record, view, you);
					return (
						<RosterSlot
							key={record.id}
							record={record}
							slot={slot}
							holds={slot.state === 'hand' ? siteHoldsFor(record, view, you) : null}
							you={you}
							armed={armedRecordId === record.id}
							suggested={recommendedRecordId === record.id}
							stealthy={prepare(record, view.world.sites[0], view.world, 0).stealthy}
							disabled={disabled}
							onArm={onArm}
							onInspect={onInspect}
							onHover={onHover}
							compact={compact}
						/>
					);
				})}
				{inHand === 0 && <span className="rec-rank-empty">nothing left in hand</span>}
			</div>
		</div>
	);
}

export default ReclamationRoster;
