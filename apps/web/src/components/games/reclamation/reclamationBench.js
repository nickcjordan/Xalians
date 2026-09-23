import { elementOf } from './reclamationVocabulary';
import React from 'react';
import {
	InfoGlyph, HiddenGlyph, RoleGlyph, SwiftGlyph, WillfulGlyph, InstinctGlyph,
} from './reclamationGlyphs';
import XalianImage from '../../xalianImage';
import { pieceShadowFilter } from '../duel/board/duelPieceToken';
import { team } from '../../../constants/designTokens';
import { slotStateOf } from './reclamationRoster';
import { speciesLabel, roleSentence, roleWord } from './reclamationNarration';
import { FitStrip, fitSentence } from './reclamationInstruments';
import { prepare, speedOf, flippableRolesOf } from '@xalians/rules/expedition/creatureOnTable';
import { attributeLanes } from './reclamationPreview';
import { SENDABLE, FRAMES_PER_MATCH } from '@xalians/rules/expedition/expeditionInterpretation';

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
	sends left, the swift moves available this round, hidden, pass. Every number is the
	engine's, through siteHoldsFor() and prepare().

	PASS 2 ("every attribute a job"): each plinth prints the creature's speed and, beside
	it, a mark per attribute lane that is doing something - a wing for swift, an upright
	bar for willful, an eye for keen or dull instinct - each carrying its lane sentence as
	its title, the same sentence the dossier's Lanes block prints.

	PASS 52, THE GLANCE REDESIGN (docs/design/reclamation-glance-redesign.md). The lamps and
	the best-world name became the fit strip: three columns, one per world in the order the
	worlds stand above, each as tall as what sending this creature there now would move
	that world your way (the engine's forecastSend), with the rival's lead ticked on it
	where the rival has one. Nothing on a card is suggested; it only says what would happen.
*/

function Plinth({ record, view, you, armed, disabled, onArm, onInspect, onHover, advanced, fitRow, focusSiteId }) {
	const slot = slotStateOf(record, view, you);
	const inHand = slot.state === 'hand';
	const sites = view.frame.sites;
	const readAt = prepare(record, view.frame.sites[0], null, 0, { rules: view.rules });
	const stealthy = readAt.stealthy;
	// the base redesign's one glyph per creature: the role it plays at the Clash, the same
	// on the bench as on the plinth on the table and in the dossier
	const role = readAt.role;
	const roleLine = roleSentence(role, readAt.blowMagnitude);
	// the attribute lanes that are actually doing something for this creature: the marks
	// beside the speed number, each with its own lane sentence (Pass 2, assumption 17)
	const laneMarks = attributeLanes(readAt, view.rules).filter((l) => l.glyph);
	const el = elementOf(record);
	const classes = ['rec-plinth', `rec-plinth--${slot.state}`];
	if (armed) classes.push('rec-plinth--armed');
	if (disabled) classes.push('rec-plinth--disabled');
	if (inHand && fitRow && Object.values(fitRow).some((cell) => cell && cell.takes)) classes.push('rec-plinth--takes');
	const title = inHand
		? `${speciesLabel(record)}${armed ? ', lifted: press a world to send it there, or press it again to set it down' : ''}. ${fitSentence(sites, fitRow)}`
		: slot.state === 'sent' ? `Sent to ${slot.site.world.planet}` : slot.state === 'holding' ? 'Won its world in an earlier round, and stays there' : slot.state === 'downed' ? 'Fell in a Clash, out of the game' : 'Spent on a world that was lost or tied, out of the game';
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
				data-arm={inHand && !disabled ? record.id : undefined}
			>
				<span className="rec-plinth-stage" aria-hidden="true">
					<span className="rec-plinth-base" />
					<XalianImage variant="token" speciesName={record.species} primaryType={el} padding="0px" fill="black" filter={pieceShadowFilter(team.one, 44)} moreClasses="rec-plinth-art" />
				</span>
				<span className="rec-plinth-name">{speciesLabel(record)}</span>
				{role && role !== 'none' && (
					<span className="rec-role-glyph rec-plinth-role" title={roleLine} aria-label={roleLine} data-role={role}>
						<RoleGlyph role={role} />
					</span>
				)}
				{/* pass 38: speed and the attribute lanes are arithmetic, shown in advanced mode; the dossier always has them */}
				{advanced && <span className="rec-plinth-init g-mono" title="Speed: the faster attacks land first when the worlds resolve">{Math.round(speedOf(record))}</span>}
				{advanced && laneMarks.length > 0 && (
					<span className="rec-plinth-lanes" aria-label="What this creature's attributes do here">
						{laneMarks.map((mark) => (
							<span className={`rec-plinth-lane rec-plinth-lane--${mark.glyph}`} key={mark.key} title={mark.text} aria-label={mark.text} data-lane-mark={mark.glyph}>
								{mark.glyph === 'swift' && <SwiftGlyph />}
								{mark.glyph === 'willful' && <WillfulGlyph />}
								{(mark.glyph === 'keen' || mark.glyph === 'dull') && <InstinctGlyph lane={mark.glyph} />}
							</span>
						))}
					</span>
				)}
				{/* pass 52: the fit strip, one column per world, for a creature in hand or the world it went to */}
				{((inHand && fitRow) || slot.state === 'sent') && (
					<FitStrip
						sites={sites}
						row={inHand ? fitRow : null}
						sentSiteId={slot.state === 'sent' && slot.site ? slot.site.id : null}
						focusSiteId={inHand ? focusSiteId : null}
						off={disabled}
					/>
				)}
				{!inHand && slot.state !== 'sent' && (
					<span className={`rec-plinth-tag rec-plinth-tag--${slot.state}`} aria-label={slot.state === 'holding' ? 'won its world' : slot.state === 'downed' ? 'fell in a Clash' : 'spent'}>
						{slot.state === 'holding'
							? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 21V3" /><path d="M6 4h12l-3 4.5L18 13H6" /></svg>
							: slot.state === 'downed'
								? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
								: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" /></svg>}
					</span>
				)}
				{inHand && stealthy && (
					<span className="rec-plinth-marks">
						<span className="rec-plinth-mark rec-plinth-mark--glyph" title="Stealthy: arrives hidden"><HiddenGlyph /></span>
					</span>
				)}
			</button>
			<button
				type="button"
				className="rec-plinth-read"
				onClick={(e) => { e.stopPropagation(); onInspect && onInspect(record); }}
				title="Read this creature's dossier"
				aria-label="Read this creature's dossier"
				data-read={record.id}
			>
				<InfoGlyph />
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
	movingRecordId,
	movable,
	onArm,
	onInspect,
	onHoverRecord,
	onPass,
	onBeginMove,
	rivalBeat,
	// PASS 25, act flip: the behaviours the armed creature can take, and the chosen one
	actFlip,
	armedRole,
	onChooseRole,
	// pass 38: false through the Clash, when the bench stays in the dock but nothing on it acts
	interactive = true,
	stakeAvailable,
	stakeMode,
	onToggleStake,
	// pass 52: the fit table (reclamationFit.fitTable) and the world under the pointer
	fits,
	focusSiteId,
	sendsTone,
}) {
	const me = view.players[you];
	const yourTurn = interactive && view.turn === you && view.phase === 'deploy';
	const advanced = mode === 'advanced';
	// the round's cap: the sendable ten, plus the trailing seat's bonus send this round
	const cap = typeof me.sendableCap === 'number' ? me.sendableCap : SENDABLE;
	const sendsLeft = Math.max(0, cap - (me.sentCount || 0));
	// this round's worlds and every round still to come
	const worldsAhead = ((view.frame && view.frame.sites.length) || 3) * Math.max(1, FRAMES_PER_MATCH - (view.frameIndex || 0));
	const armed = armedRecordId ? (me.roster || []).find((r) => r.id === armedRecordId) : null;
	const step = !yourTurn ? 0 : armed ? 2 : 1;
	const armedRead = armed ? prepare(armed, view.frame.sites[0], null, 0, { rules: view.rules }) : null;
	const armedStealthy = !!(armedRead && armedRead.stealthy);
	// assumption 20: a swift creature already on the table may move once a round, and it
	// does not spend the turn. One button per creature that still may.
	const movers = movable || [];

	return (
		<section className={`rec-bench rec-bench--step-${step}${yourTurn && !me.passed ? ' rec-bench--active' : ''}`} aria-label="Your squad" data-deploy-step={step}>
			<header className="rec-bench-head">
				{/*
					PASS 38. The head keeps only what is acted on: the act picker, the sends left and
					the pass. "Your squad 12/12", the heading and the lead line repeated the top bar's
					instruction and turn line, which are now the one place that says what to do.
				*/}
				{/*
					PASS 25, ACT FLIP. A creature has three or four usable acts and most can offer
					two or more genuinely different behaviours; until this pass the table picked one
					and discarded the rest, which is why the decision space ran out by round three
					(2.05 near-best options, half of them with one dominant answer).

					The picker only appears with a creature lifted and only when that creature has a
					real choice, so it is never a control asking a question with one answer. The
					natural behaviour is first and is what a player gets by pressing nothing.
				*/}
				{/*
					PASS 36. The picker's room is held whether or not a picker is in it, the same way
					`rec-callout-row` holds the callout's. It used to appear when a creature with two
					or more behaviours was lifted and vanish when it was sent, moving the whole plinth
					grid 62px each way.
				*/}
				<div className="rec-bench-acts-slot" data-act-slot>
					{actFlip && armed && yourTurn && !me.passed && (() => {
					const roles = flippableRolesOf(armed, view.rules);
					if (roles.length < 2) {
						return null;
					}
					const current = armedRole || roles[0];
					return (
						<div className="rec-bench-acts" data-act-picker={armed.id}>
							<span className="rec-bench-acts-legend">{speciesLabel(armed)} can</span>
							{roles.map((role) => (
								<button
									type="button"
									key={role}
									className={`g-btn rec-bench-act${role === current ? ' rec-bench-act--on' : ''}`}
									aria-pressed={role === current}
									data-act-role={role}
									onClick={() => onChooseRole && onChooseRole(role)}
									title={roleSentence(role)}
								>
									{roleWord(role)}
								</button>
							))}
						</div>
					);
				})()}
				</div>
				{/* pass 52: the sends left moved to the top bar, beside each side's score */}
				<span className="rec-deploy-count" data-sends-count={sendsLeft} />
				{yourTurn && !me.passed && (
					<div className="rec-bench-actions">
						{movers.map((mover) => (
							<button
								key={mover.record.id}
								type="button"
								className={`g-btn rec-fallback-btn rec-move-btn${movingRecordId === mover.record.id ? ' rec-fallback-btn--active' : ''}`}
								onClick={() => onBeginMove && onBeginMove(mover.record.id)}
								data-move={mover.record.id}
								title="Swift: it may move to another world of the frame once a round, without spending your turn."
							>
								<SwiftGlyph />
								{movingRecordId === mover.record.id ? 'Choose a world' : `Move ${speciesLabel(mover.record)}`}
							</button>
						))}
						{/* pass 38: the stake is one key here, not a button on every world's head */}
						{stakeAvailable && (
							<button
								type="button"
								className={`g-btn rec-stake-key${stakeMode ? ' rec-fallback-btn--active' : ''}`}
								onClick={onToggleStake}
								aria-pressed={!!stakeMode}
								data-stake-mode
								title="Once a game, before your first send of a round: the world you stake counts two worlds for whoever holds it."
							>
								{stakeMode ? 'Stake: pick a world' : <>Stake &times;2</>}
							</button>
						)}
						<button
							type="button"
							className="g-btn rec-pass-btn"
							onClick={onPass}
							data-pass
							title="Pass: send nothing more this round. It is permanent for the round."
						>
							Pass
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
						fitRow={fits && fits.fits ? fits.fits[record.id] : null}
						focusSiteId={focusSiteId}
						disabled={!yourTurn || me.passed || sendsLeft === 0}
						onArm={onArm}
						onInspect={onInspect}
						onHover={onHoverRecord}
						advanced={advanced}
					/>
				))}
			</div>
		</section>
	);
}

export default ReclamationBench;
