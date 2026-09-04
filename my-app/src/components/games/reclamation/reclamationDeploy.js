import React from 'react';
import ReclamationRoster, { siteHoldsFor } from './reclamationRoster';
import XalianImage from '../../xalianImage';
import { speciesLabel, formatHold } from './reclamationNarration';
import { baseHold, prepare } from '../../../gameplay/expedition/creatureOnTable';
import { SENDABLE } from '../../../gameplay/expedition/expeditionInterpretation';
import { elementName, archetypeLabel } from './reclamationVocabulary';

/*
	ReclamationDeploy — the deploy turn as a two-step choice, in the rail beside the sites.

	Nick, 2026-09-04: a recommended-move button was too much hand-holding, and arming
	creatures one by one to learn where each would do well was tedious. So the turn is
	a wizard whose view changes with the step:

	  1. Choose a creature. The rail is your squad, each slot saying what that creature
	     would hold at every site of this world (the best marked, strain named), so the
	     comparison is made on the list, not by clicking through it. Pointing at a slot
	     previews it on every site.
	  2. Choose a site. The rail becomes the chosen creature's card with its three site
	     chips, now pressable; the sites themselves show the send and how the balance
	     would shift (Nick, second pass: the sites are not repeated as rows here).

	The bot's own pick is still marked, quietly, as "suggested" on a slot and a site.
	Pass, fall back and hidden sends live in the footer; simple mode shows hidden and
	fall back only when the suggestion would use them, advanced always.

	Every number is the engine's: siteHoldsFor() runs prepare() per site.
*/
function Stepper({ step }) {
	const steps = [
		{ n: 1, label: 'Creature' },
		{ n: 2, label: 'Site' },
		{ n: 3, label: 'Send' },
	];
	return (
		<ol className="rec-steps" aria-label="Deploy steps">
			{steps.map((s) => (
				<li
					key={s.n}
					className={`rec-step${s.n === step ? ' rec-step--now' : s.n < step ? ' rec-step--done' : ''}`}
					aria-current={s.n === step ? 'step' : undefined}
				>
					<span className="rec-step-n">{s.n}</span>
					<span className="rec-step-label">{s.label}</span>
				</li>
			))}
		</ol>
	);
}

function ReclamationDeploy({
	view,
	you,
	squad,
	mode,
	armedRecordId,
	recommendation,
	sendHidden,
	relocating,
	vanguard,
	hoverSiteId,
	onArm,
	onDisarm,
	onInspect,
	onHoverRecord,
	onHoverSite,
	onSend,
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
	const suggestedSiteId = rec && armed && rec.recordId === armed.id ? rec.siteId : null;
	const holds = armed ? siteHoldsFor(armed, view, you) : null;
	const armedStealthy = !!(armed && prepare(armed, view.world.sites[0], view.world, 0).stealthy);
	const showHidden = armedStealthy && (advanced || (rec && rec.hidden));
	const showFallback = !!vanguard && (advanced || (recommendation && recommendation.type === 'relocate'));

	let heading;
	let lead;
	if (!yourTurn) {
		heading = rivalBeat ? 'The rival has moved' : 'The rival is deciding';
		lead = rivalBeat ? rivalBeat.text : 'Your squad waits. When the rival has sent or passed, the move is yours.';
	} else if (me.passed) {
		heading = 'You have passed';
		lead = 'Passing is permanent for this world. The rival finishes its deploy alone.';
	} else if (relocating) {
		heading = 'Fall back';
		lead = 'Press a site to move your vanguard there. This does not spend your turn.';
	} else if (step === 2) {
		heading = 'Choose a site';
		lead = `Where does ${speciesLabel(armed)} go?`;
	} else {
		heading = 'Choose a creature';
		lead = sendsLeft === 0
			? `You have sent all ${SENDABLE} this expedition allows. The rest are your reserve.`
			: 'Each slot shows what the creature would hold at every site of this world.';
	}

	return (
		<aside className={`g-panel rec-deploy rec-deploy--step-${step}`} aria-label="Deploy" data-deploy-step={step}>
			<header className="rec-deploy-head">
				<Stepper step={step === 0 ? 0 : step} />
				<div className="rec-deploy-title">
					<h3 className="rec-deploy-heading" key={heading}>{heading}</h3>
					<p className="rec-deploy-lead g-body">{lead}</p>
				</div>
				<span className="rec-deploy-count g-mono">
					{(me.roster || []).length} in hand · {sendsLeft} send{sendsLeft === 1 ? '' : 's'} left
				</span>
			</header>

			{step === 2 && armed && (
				<div className="rec-deploy-choice rec-rise" data-deploy-choice>
					<div className={`rec-chosen g-el-${armed.element.primary}`}>
						<span className="rec-chosen-portrait" aria-hidden="true">
							<XalianImage speciesName={armed.species} primaryType={armed.element.primary} padding="0px" fill="black" moreClasses="rec-chosen-art" />
						</span>
						<span className="rec-chosen-body">
							<span className="rec-chosen-name">{speciesLabel(armed)}</span>
							<span className="rec-chosen-sub g-mono">{elementName(armed.element.primary).toLowerCase()} · {archetypeLabel(armed.archetype).toLowerCase()} · base hold {formatHold(baseHold(armed))}</span>
						</span>
						<button type="button" className="g-btn rec-chosen-change" onClick={onDisarm} data-change-creature>Change</button>
					</div>

					<p className="rec-deploy-lead g-body rec-chosen-cue">
						Press a site on the table. Each one shows what {speciesLabel(armed)} would hold there and how the balance would shift.
					</p>
					<span className="rec-slot-sites rec-chosen-sites" aria-label="Hold at each site of this world">
						{holds.map((h) => (
							<button
								type="button"
								key={h.site.id}
								className={`rec-slot-site rec-chosen-site${suggestedSiteId === h.site.id ? ' rec-slot-site--suggested' : ''}${hoverSiteId === h.site.id ? ' rec-slot-site--hover' : ''} rec-slot-site--${h.strainLevel}${h.isHome ? ' rec-slot-site--home' : ''}`}
								onClick={() => onSend(h.site.id)}
								onMouseEnter={() => onHoverSite && onHoverSite(h.site.id)}
								onMouseLeave={() => onHoverSite && onHoverSite(null)}
								title={`Send to ${h.site.name}`}
								data-send-site={h.site.id}
							>
								<span className="rec-slot-site-index">{h.index + 1}</span>
								<span className="rec-slot-site-hold">{formatHold(h.hold)}</span>
								{h.isHome && <span className="rec-slot-site-mark rec-slot-site-mark--home">home</span>}
								{h.strainLevel === 'strained' && <span className="rec-slot-site-mark rec-slot-site-mark--strain">strain</span>}
								{h.strainLevel === 'severe' && <span className="rec-slot-site-mark rec-slot-site-mark--severe">severe</span>}
								{suggestedSiteId === h.site.id && <span className="rec-slot-site-mark rec-slot-site-mark--suggested">suggested</span>}
							</button>
						))}
					</span>

					{showHidden && (
						<label className="g-check rec-hidden-toggle" title="A stealthy creature may be sent hidden: the rival learns that you sent something, not what or where, until orders are revealed.">
							<input type="checkbox" checked={!!sendHidden} onChange={onToggleHidden} data-hidden-toggle />
							<span className="g-check-box" />
							<span>Send hidden</span>
						</label>
					)}
				</div>
			)}

			{step !== 2 && (
				<ReclamationRoster
					squad={squad}
					view={view}
					you={you}
					armedRecordId={armedRecordId}
					recommendedRecordId={suggestedRecordId}
					onArm={onArm}
					onInspect={onInspect}
					onHover={onHoverRecord}
					disabled={!yourTurn || me.passed || sendsLeft === 0}
				/>
			)}

			{yourTurn && !me.passed && (
				<footer className="rec-deploy-foot">
					{showFallback && (
						<button
							type="button"
							className={`g-btn rec-fallback-btn${relocating ? ' rec-fallback-btn--active' : ''}`}
							onClick={onBeginRelocate}
							data-fallback
							title="You placed your first creature knowing nothing. Once per world it may fall back to another site, without spending your turn."
						>
							{relocating ? 'Choose a site' : `Fall back ${speciesLabel(vanguard)}`}
						</button>
					)}
					<button
						type="button"
						className={`g-btn rec-pass-btn${recommendation && recommendation.type === 'pass' ? ' rec-pass-btn--suggested' : ''}`}
						onClick={onPass}
						data-pass
						title="Pass is permanent for this world."
					>
						Pass for this world
						{recommendation && recommendation.type === 'pass' && <span className="rec-btn-sub">suggested: {recommendation.reason}</span>}
					</button>
				</footer>
			)}
		</aside>
	);
}

export default ReclamationDeploy;
