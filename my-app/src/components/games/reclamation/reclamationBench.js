import React from 'react';
import XalianImage from '../../xalianImage';
import { pieceShadowFilter } from '../duel/board/duelPieceToken';
import { team } from '../../../constants/designTokens';
import { slotStateOf, siteHoldsFor } from './reclamationRoster';
import { speciesLabel, formatHold } from './reclamationNarration';
import { prepare } from '../../../gameplay/expedition/creatureOnTable';
import { SENDABLE } from '../../../gameplay/expedition/expeditionInterpretation';

/*
	ReclamationBench — the squad on a bench under the three worlds (Nick, 2026-09-04,
	sixth pass: the rail was cramped, and the same reading was shown in the rail and on
	the front line).

	A plinth per creature, as the Duel's roster rail stands under its board: the
	portrait, the name, and under it three lamps, one per world of the frame, lit
	where the creature would hold well there and ringed in brass on home ground. No
	numbers on the bench. Pointing at a plinth puts the creature's gauge and reading on
	every world (the controller's ghosts); pressing it lifts the figure, and the worlds
	become the buttons. The wizard's steps are gone: lift a creature, press a world.

	The bench head carries what the deploy panel used to: the state of the turn, the
	sends left, fall back, hidden, pass. Every number is the engine's, through
	siteHoldsFor() and prepare().
*/

// a lamp is lit for a hold that would matter at a world: two-thirds of the printed
// scale is bright, a third is dim, less is dark (levers)
export const LAMP_BRIGHT_AT = 12;
export const LAMP_DIM_AT = 6;

function lampLevel(hold) {
	if (hold >= LAMP_BRIGHT_AT) return 2;
	if (hold >= LAMP_DIM_AT) return 1;
	return 0;
}

function Plinth({ record, view, you, armed, suggested, disabled, onArm, onInspect, onHover }) {
	const slot = slotStateOf(record, view, you);
	const inHand = slot.state === 'hand';
	const holds = inHand ? siteHoldsFor(record, view, you) : null;
	const stealthy = prepare(record, view.frame.sites[0], null, 0).stealthy;
	const el = record.element.primary;
	const classes = ['rec-plinth', `rec-plinth--${slot.state}`];
	if (armed) classes.push('rec-plinth--armed');
	if (suggested && inHand) classes.push('rec-plinth--suggested');
	if (disabled) classes.push('rec-plinth--disabled');
	const bestId = holds ? holds.reduce((a, b) => (b.hold > a.hold ? b : a)).site.id : null;
	const title = inHand
		? (armed ? 'Lifted. Press a world to send it there, or press again to set it down.' : holds.map((h) => `${h.site.world.planet} ${formatHold(h.hold)}`).join(' · '))
		: slot.state === 'sent' ? `Sent to ${slot.site.world.planet}` : slot.state === 'holding' ? 'Holding a world won earlier' : slot.state === 'routed' ? 'Routed out of the Proving' : 'Withdrawn';
	return (
		<div className={classes.join(' ')} data-slot={record.id} data-slot-state={slot.state}>
			<button
				type="button"
				className="rec-plinth-main"
				onClick={() => inHand && !disabled && onArm && onArm(record.id)}
				onMouseEnter={() => onHover && onHover(record.id)}
				onMouseLeave={() => onHover && onHover(null)}
				onFocus={() => onHover && onHover(record.id)}
				onBlur={() => onHover && onHover(null)}
				aria-pressed={armed}
				disabled={!inHand}
				title={title}
				data-arm={inHand ? record.id : undefined}
			>
				<span className="rec-plinth-stage" aria-hidden="true">
					<span className="rec-plinth-base" />
					<XalianImage speciesName={record.species} primaryType={el} padding="0px" fill="black" filter={pieceShadowFilter(team.one, 44)} moreClasses="rec-plinth-art" />
				</span>
				<span className="rec-plinth-name">{speciesLabel(record)}</span>
				{inHand && holds && (
					<span className="rec-lamps" aria-label="Where it holds well">
						{holds.map((h) => (
							<span
								key={h.site.id}
								className={`rec-lamp g-el-${h.site.world.element} rec-lamp--${lampLevel(h.hold)}${h.isHome ? ' rec-lamp--home' : ''}${bestId === h.site.id ? ' rec-lamp--best' : ''}`}
								title={`${h.site.world.planet}: ${formatHold(h.hold)}${h.isHome ? ', home ground' : ''}${h.strainLevel !== 'none' ? `, ${h.strainLevel}` : ''}`}
							/>
						))}
					</span>
				)}
				{!inHand && (
					<span className={`rec-plinth-tag rec-plinth-tag--${slot.state}`}>
						{slot.state === 'sent' ? slot.site.world.planet : slot.state === 'holding' ? 'holding' : slot.state === 'routed' ? 'routed' : 'away'}
					</span>
				)}
				{inHand && (suggested || stealthy) && (
					<span className="rec-plinth-marks">
						{suggested && <span className="rec-plinth-mark rec-plinth-mark--suggested">suggested</span>}
						{stealthy && <span className="rec-plinth-mark" title="Can be sent hidden">stealthy</span>}
					</span>
				)}
			</button>
			<button
				type="button"
				className="rec-plinth-read"
				onClick={(e) => { e.stopPropagation(); onInspect && onInspect(record); }}
				title="Read this creature's dossier"
				data-read={record.id}
			>
				read
			</button>
		</div>
	);
}

function ReclamationBench({
	view,
	you,
	squad,
	mode,
	armedRecordId,
	recommendation,
	sendHidden,
	relocating,
	vanguard,
	onArm,
	onInspect,
	onHoverRecord,
	onToggleHidden,
	onPass,
	onBeginRelocate,
	rivalBeat,
}) {
	const me = view.players[you];
	const yourTurn = view.turn === you && view.phase === 'deploy';
	const advanced = mode === 'advanced';
	const sendsLeft = Math.max(0, SENDABLE - (me.sentCount || 0));
	const armed = armedRecordId ? (me.roster || []).find((r) => r.id === armedRecordId) : null;
	const step = !yourTurn ? 0 : armed ? 2 : 1;
	const rec = recommendation && recommendation.type === 'send' ? recommendation : null;
	const suggestedRecordId = rec && !armed ? rec.recordId : null;
	const armedStealthy = !!(armed && prepare(armed, view.frame.sites[0], null, 0).stealthy);
	const showHidden = armedStealthy && (advanced || (rec && rec.hidden));
	const showFallback = !!vanguard && (advanced || (recommendation && recommendation.type === 'relocate'));

	let heading;
	let lead;
	if (!yourTurn) {
		heading = rivalBeat ? 'The rival has moved' : 'The rival is deciding';
		lead = rivalBeat ? rivalBeat.text : 'When the rival has sent or passed, the move is yours.';
	} else if (me.passed) {
		heading = 'You have passed';
		lead = 'Passing is permanent for this round. The rival finishes its deploy alone.';
	} else if (relocating) {
		heading = 'Fall back';
		lead = 'Press a world to move your vanguard there. This does not spend your turn.';
	} else if (step === 2) {
		heading = `${speciesLabel(armed)} is lifted`;
		lead = 'Press a world to send it there. Each world shows what it would hold.';
	} else {
		heading = 'Lift a creature';
		lead = sendsLeft === 0
			? `You have sent all ${SENDABLE} this Proving allows. The rest are your reserve.`
			: 'The lamps under each say where it holds well. Point at one to read it on the worlds.';
	}

	return (
		<section className={`g-panel rec-bench rec-bench--step-${step}`} aria-label="Your squad" data-deploy-step={step}>
			<header className="rec-bench-head">
				<div className="rec-bench-title">
					<h3 className="rec-bench-heading" key={heading}>{heading}</h3>
					<p className="rec-bench-lead g-body">{lead}</p>
				</div>
				<span className="rec-deploy-count" title={`${me.sentCount || 0} of ${SENDABLE} sends spent this Proving; ${(me.roster || []).length} in hand`}>
					<span className="rec-sends" aria-hidden="true">
						{Array.from({ length: SENDABLE }).map((_, i) => (
							<span className={`rec-send-pip${i < (me.sentCount || 0) ? ' rec-send-pip--spent' : ''}`} key={i} />
						))}
					</span>
					<span className="g-mono rec-sends-text">{sendsLeft} send{sendsLeft === 1 ? '' : 's'} left</span>
				</span>
				{yourTurn && !me.passed && (
					<div className="rec-bench-actions">
						{showHidden && (
							<label className="g-check rec-hidden-toggle" title="A stealthy creature may be sent hidden: the rival learns that you sent something, not what or where, until orders are revealed.">
								<input type="checkbox" checked={!!sendHidden} onChange={onToggleHidden} data-hidden-toggle />
								<span className="g-check-box" />
								<span>Send hidden</span>
							</label>
						)}
						{showFallback && (
							<button
								type="button"
								className={`g-btn rec-fallback-btn${relocating ? ' rec-fallback-btn--active' : ''}`}
								onClick={onBeginRelocate}
								data-fallback
								title="You placed your first creature knowing nothing. Once per round it may fall back to another world in the frame, without spending your turn."
							>
								{relocating ? 'Choose a world' : `Fall back ${speciesLabel(vanguard)}`}
							</button>
						)}
						<button
							type="button"
							className={`g-btn rec-pass-btn${recommendation && recommendation.type === 'pass' ? ' rec-pass-btn--suggested' : ''}`}
							onClick={onPass}
							data-pass
							title="Pass is permanent for this round."
						>
							Pass this round
							{recommendation && recommendation.type === 'pass' && <span className="rec-btn-sub">suggested: {recommendation.reason}</span>}
						</button>
					</div>
				)}
			</header>
			<div className="rec-plinths" role="list">
				{squad.map((record) => (
					<Plinth
						key={record.id}
						record={record}
						view={view}
						you={you}
						armed={armedRecordId === record.id}
						suggested={suggestedRecordId === record.id}
						disabled={!yourTurn || me.passed || sendsLeft === 0}
						onArm={onArm}
						onInspect={onInspect}
						onHover={onHoverRecord}
					/>
				))}
			</div>
		</section>
	);
}

export default ReclamationBench;
