import React from 'react';
import { SwiftGlyph } from './reclamationGlyphs';
import { speciesLabel, roleSentence, roleWord } from './reclamationNarration';
import { flippableRolesOf } from '@xalians/rules/expedition/creatureOnTable';
import { SENDABLE } from '@xalians/rules/expedition/expeditionInterpretation';
import ReclamationSquad, { SquadGone } from './reclamationSquad';

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
	engine's, through prepare() and the fit table.

	PASS 2 ("every attribute a job"): each plinth prints the creature's speed and, beside
	it, a mark per attribute lane that is doing something - a wing for swift, an upright
	bar for willful, an eye for keen or dull instinct - each carrying its lane sentence as
	its title, the same sentence the dossier's Lanes block prints.

	PASS 52, THE GLANCE REDESIGN (docs/design/reclamation-glance-redesign.md). The lamps and
	the best-world name became the fit strip: three columns, one per world in the order the
	worlds stand above (the engine's forecastSend). Since pass 58 each column is your side
	only, what your side there would gain, with what the rival would lose on a tag at its
	top (docs/design/reclamation-one-side-per-number.md). Nothing on a card is
	suggested; it only says what would happen.

	PASS 75: the plinths are gone. The squad is a roster of the creatures you can still send,
	a row each with a column per world (reclamationSquad.js, docs/design/reclamation-squad-roster.md),
	and the creatures already used sit small in the head (SquadGone).
*/

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
	// pass 57: the world the rival just sent to, whose columns changed with the arrival
	newsSiteId,
	// pass 65: your side row (pointer, piece, pennants, sends), at the foot with your squad
	sideRow,
	// the world each creature of yours won and holds, for the used creatures in the head
	heldWorlds,
}) {
	const me = view.players[you];
	const yourTurn = interactive && view.turn === you && view.phase === 'deploy';
	const advanced = mode === 'advanced';
	// the round's cap: the sendable ten, plus the trailing seat's bonus send this round
	const cap = typeof me.sendableCap === 'number' ? me.sendableCap : SENDABLE;
	const sendsLeft = Math.max(0, cap - (me.sentCount || 0));
	const armed = armedRecordId ? (me.roster || []).find((r) => r.id === armedRecordId) : null;
	const step = !yourTurn ? 0 : armed ? 2 : 1;
	// assumption 20: a swift creature already on the table may move once a round, and it
	// does not spend the turn. One button per creature that still may.
	const movers = movable || [];

	return (
		<section className={`rec-bench rec-bench--step-${step}${yourTurn && !me.passed ? ' rec-bench--active' : ''}`} aria-label="Your squad" data-deploy-step={step}>
			<header className="rec-bench-head">
				{/* pass 65: your side's row at your edge of the table, beside the squad it counts */}
				<div className="rec-bench-side">{sideRow}</div>
				{/* pass 75: the creatures already used, small, so the roster below is only what you can send */}
				<SquadGone view={view} you={you} squad={squad} heldWorlds={heldWorlds} />
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
								{/* pass 66: on a phone the word goes and the swift mark stays, so your row keeps its counts beside two keys */}
								{movingRecordId === mover.record.id ? 'Choose a world' : <><span className="rec-move-word">Move </span>{speciesLabel(mover.record)}</>}
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

			<ReclamationSquad
				view={view}
				you={you}
				squad={squad}
				fits={fits}
				armedRecordId={armedRecordId}
				disabled={!yourTurn || me.passed || sendsLeft === 0}
				reserve={sendsLeft === 0}
				focusSiteId={focusSiteId}
				advanced={advanced}
				onArm={onArm}
				onInspect={onInspect}
				onHover={onHoverRecord}
			/>
		</section>
	);
}

export default ReclamationBench;
