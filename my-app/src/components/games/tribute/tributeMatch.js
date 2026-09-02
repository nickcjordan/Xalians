import React from 'react';
import TributeBoard, { rowTotal } from './tributeBoard';
import TributeCard from './tributeCard';
import {
	mulligan, playCreature, playDecree, pass, getPublicState, createRngState, COURT_FAVOR,
} from '../../../gameplay/tribute/tributeRules';
import { chooseAction } from '../../../gameplay/tribute/tributeBot';
import { ROW, DECREES, capitalizeElement } from '../../../gameplay/tribute/tributeInterpretation';
import { decreeContribution } from '../../../gameplay/tribute/decreeCalculator';

const BOT_DELAY_MS = 700;
const LOG_CAP = 60;
const ROWS = [ROW.CLOSE, ROW.MID, ROW.FAR];
const ROW_LABEL = { [ROW.CLOSE]: 'Close', [ROW.MID]: 'Mid', [ROW.FAR]: 'Far' };
const COURT = 'the Court';

function decreeName(element) {
	const found = DECREES.find((d) => d.element === element);
	return found ? found.name : element;
}

/*
	TributeMatch owns the engine state in React state: the engine is a pure state-in /
	state-out machine, so this component only holds `match`, turns clicks into engine
	calls, and drives the bot on a timer. Human is seat 'A', the Court (the bot) is 'B'.

	The one rule for the interface: the player must always be able to tell whose move it
	is, what a click will do, and what just happened, without scrolling.
*/
class TributeMatch extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			match: props.initialMatch,
			log: [],
			mulliganSelection: [],
			selectedCardId: null,
			selectedDecree: null,
			notice: null,
		};
		this.botRng = createRngState(`${props.seed}-bot`);
		this.botTimer = null;
		this.noticeTimer = null;
	}

	componentDidMount() {
		this.applyBotMulliganIfDue();
		this.scheduleBotIfDue();
	}

	componentDidUpdate(prevProps, prevState) {
		if (prevState.match !== this.state.match) {
			this.applyBotMulliganIfDue();
			this.scheduleBotIfDue();
		}
	}

	componentWillUnmount() {
		if (this.botTimer) {
			clearTimeout(this.botTimer);
		}
		if (this.noticeTimer) {
			clearTimeout(this.noticeTimer);
		}
	}

	// ---- shared helpers ----

	appendLog = (line) => {
		this.setState((prev) => ({ log: [...prev.log, line].slice(-LOG_CAP) }));
	};

	showNotice = (text) => {
		this.setState({ notice: text });
		if (this.noticeTimer) {
			clearTimeout(this.noticeTimer);
		}
		this.noticeTimer = setTimeout(() => this.setState({ notice: null }), 2600);
	};

	isYourMove() {
		const { match } = this.state;
		return match.phase === 'play' && match.turn === 'A';
	}

	totalFor(seat, matchState = this.state.match) {
		let total = 0;
		ROWS.forEach((row) => {
			const decree = matchState.activeDecrees[row];
			total += rowTotal(matchState.board[row][seat], row, decree ? decree.element : null);
		});
		if (matchState.starter === seat) {
			total += COURT_FAVOR;
		}
		return total;
	}

	// a round result or match result becomes a log line the moment it appears
	logTransitions = (prevMatch, nextMatch) => {
		if (nextMatch.lastRoundResult && nextMatch.lastRoundResult !== prevMatch.lastRoundResult) {
			const r = nextMatch.lastRoundResult;
			const who = r.winner === 'A' ? 'you' : COURT;
			this.appendLog(`Round ${r.round} goes to ${who}, ${r.scores.A} to ${r.scores.B}${r.tie ? ' (tie broken)' : ''}.`);
		}
		if (nextMatch.phase === 'matchEnd' && prevMatch.phase !== 'matchEnd') {
			this.appendLog(nextMatch.winner === 'A' ? 'You win the match.' : `${capitalizeFirst(COURT)} wins the match.`);
		}
	};

	commit = (prevMatch, nextMatch) => {
		this.logTransitions(prevMatch, nextMatch);
		this.setState({ match: nextMatch, selectedCardId: null, selectedDecree: null });
	};

	// ---- the bot ----

	applyBotMulliganIfDue = () => {
		const { match } = this.state;
		if (match.phase === 'mulligan' && match.mulliganTurn === 'B' && !match.players.B.mulliganUsed) {
			const next = mulligan(match, 'B', []);
			if (next) {
				this.setState({ match: next });
			}
		}
	};

	scheduleBotIfDue = () => {
		const { match } = this.state;
		if (match.phase === 'play' && match.turn === 'B') {
			if (this.botTimer) {
				clearTimeout(this.botTimer);
			}
			this.botTimer = setTimeout(this.runBotTurn, BOT_DELAY_MS);
		}
	};

	runBotTurn = () => {
		this.botTimer = null;
		const { match } = this.state;
		if (match.phase !== 'play' || match.turn !== 'B') {
			return;
		}
		const hand = match.players.B.hand;
		const { action, nextRngState } = chooseAction(getPublicState(match, 'B'), hand, 'B', this.botRng);
		this.botRng = nextRngState;

		let next = null;
		if (action.type === 'playCreature') {
			next = playCreature(match, 'B', action.cardId, action.row);
			const card = hand.find((c) => c.id === action.cardId);
			if (next && card) {
				const decree = match.activeDecrees[action.row];
				const worth = decreeContribution(card.powerByRow[action.row], decree ? decree.element : null, card.element);
				this.appendLog(`${capitalizeFirst(COURT)} plays ${card.name} to ${ROW_LABEL[action.row]} for ${worth}.`);
			}
		} else if (action.type === 'playDecree') {
			next = playDecree(match, 'B', action.element, action.row);
			if (next) {
				this.appendLog(`${capitalizeFirst(COURT)} declares ${decreeName(action.element)} over ${ROW_LABEL[action.row]}.`);
			}
		} else {
			next = pass(match, 'B');
			if (next) {
				this.appendLog(`${capitalizeFirst(COURT)} passes${this.passReasonSuffix(action.reason)}.`);
			}
		}

		if (!next) {
			// the engine should never refuse a bot action; say so rather than stall
			// eslint-disable-next-line no-console
			console.error('Tribute bot produced an illegal action', action);
			this.appendLog(`${capitalizeFirst(COURT)} hesitates and passes.`);
			next = pass(match, 'B');
		}
		if (next) {
			this.commit(match, next);
		}
	};

	passReasonSuffix = (reason) => {
		const words = {
			'winning-after-opp-pass': ', holding its lead',
			'cannot-catch-up': ', unable to catch up',
			'yield-after-opp-pass': ', conceding the round to save cards',
			'unbeatable': ', out of reach',
			'ahead-parity': ', content with its lead',
			'yield': ', conceding the round to save cards',
			'bluff': '',
			'no-legal-action': ', with nothing left to play',
		};
		return words[reason] || '';
	};

	// ---- mulligan ----

	toggleMulliganCard = (cardId) => {
		this.setState((prev) => {
			const already = prev.mulliganSelection;
			if (already.includes(cardId)) {
				return { mulliganSelection: already.filter((id) => id !== cardId) };
			}
			if (already.length >= 2) {
				return null;
			}
			return { mulliganSelection: [...already, cardId] };
		});
	};

	commitMulligan = () => {
		const { match, mulliganSelection } = this.state;
		const next = mulligan(match, 'A', mulliganSelection);
		if (next) {
			const n = mulliganSelection.length;
			this.appendLog(n > 0 ? `You send back ${n} card${n > 1 ? 's' : ''} and draw ${n}.` : 'You keep your hand.');
			this.setState({ match: next, mulliganSelection: [] });
		}
	};

	// ---- human play ----

	selectCard = (cardId) => {
		if (!this.isYourMove()) {
			this.showNotice(`${capitalizeFirst(COURT)} is still moving.`);
			return;
		}
		this.setState((prev) => ({
			selectedCardId: prev.selectedCardId === cardId ? null : cardId,
			selectedDecree: null,
		}));
	};

	selectDecree = (element) => {
		if (!this.isYourMove()) {
			this.showNotice(`${capitalizeFirst(COURT)} is still moving.`);
			return;
		}
		this.setState((prev) => ({
			selectedDecree: prev.selectedDecree === element ? null : element,
			selectedCardId: null,
		}));
	};

	handleRowClick = (row, side) => {
		const { match, selectedCardId, selectedDecree } = this.state;
		if (!this.isYourMove()) {
			this.showNotice(`${capitalizeFirst(COURT)} is still moving.`);
			return;
		}
		if (selectedCardId) {
			const card = match.players.A.hand.find((c) => c.id === selectedCardId);
			if (!card) {
				return;
			}
			if (side === 'B') {
				this.showNotice('Your creatures stand on your side of the court.');
				return;
			}
			if (!card.eligibleRows.includes(row)) {
				this.showNotice(`${card.name} cannot fight at ${ROW_LABEL[row]} range.`);
				return;
			}
			const next = playCreature(match, 'A', selectedCardId, row);
			if (!next) {
				this.showNotice('That placement is not allowed right now.');
				return;
			}
			const decree = match.activeDecrees[row];
			const worth = decreeContribution(card.powerByRow[row], decree ? decree.element : null, card.element);
			this.appendLog(`You play ${card.name} to ${ROW_LABEL[row]} for ${worth}.`);
			this.commit(match, next);
			return;
		}
		if (selectedDecree) {
			const next = playDecree(match, 'A', selectedDecree, row);
			if (!next) {
				this.showNotice('That Decree cannot be declared right now.');
				return;
			}
			this.appendLog(`You declare ${decreeName(selectedDecree)} over ${ROW_LABEL[row]}.`);
			this.commit(match, next);
			return;
		}
		this.showNotice('Pick a creature or a Decree first.');
	};

	handlePass = () => {
		const { match } = this.state;
		if (!this.isYourMove()) {
			this.showNotice(`${capitalizeFirst(COURT)} is still moving.`);
			return;
		}
		const next = pass(match, 'A');
		if (!next) {
			return;
		}
		this.appendLog('You pass for the round.');
		this.commit(match, next);
	};

	// which rows light up for the current selection, and the total each would show after
	// the play (both sides for a Decree, your side only for a creature)
	targets() {
		const { match, selectedCardId, selectedDecree } = this.state;
		const targets = {};
		if (selectedCardId) {
			const card = match.players.A.hand.find((c) => c.id === selectedCardId);
			if (card) {
				card.eligibleRows.forEach((row) => {
					const decree = match.activeDecrees[row];
					const decreeElement = decree ? decree.element : null;
					const total = rowTotal(match.board[row].A.concat([card]), row, decreeElement);
					targets[row] = { A: { total } };
				});
			}
		} else if (selectedDecree) {
			ROWS.forEach((row) => {
				targets[row] = {
					A: { total: rowTotal(match.board[row].A, row, selectedDecree) },
					B: { total: rowTotal(match.board[row].B, row, selectedDecree) },
				};
			});
		}
		return targets;
	}

	// ---- rendering ----

	turnText() {
		const { match } = this.state;
		if (match.phase === 'mulligan') {
			return 'Presenting hands';
		}
		if (match.phase === 'matchEnd') {
			return 'Match over';
		}
		return match.turn === 'A' ? 'Your move' : `${capitalizeFirst(COURT)} is moving`;
	}

	renderSideBlock(seat) {
		const { match } = this.state;
		const p = match.players[seat];
		const isYou = seat === 'A';
		const handCount = p.hand.length;
		const live = match.phase === 'play' && match.turn === seat;
		return (
			<div className={`tribute-side ${isYou ? 'tribute-side--you' : 'tribute-side--court'}${live ? ' tribute-side--live' : ''}`}>
				<div className="tribute-side-name">{isYou ? 'You' : capitalizeFirst(COURT)}</div>
				<div className="g-screen tribute-side-screen">
					<span className="g-readout-unit">{match.phase === 'matchEnd' ? 'Final round' : 'Round score'}</span>
					<span className="g-readout">{match.phase === 'matchEnd' && match.lastRoundResult ? match.lastRoundResult.scores[seat] : this.totalFor(seat)}</span>
					<span className="g-screen-line--dim">
						{match.starter === seat && match.phase !== 'matchEnd' ? `+${COURT_FAVOR} Court Favor` : ' '}
					</span>
				</div>
				<div className="tribute-side-facts">
					<span className="tribute-fact">
						<span className="tribute-status-label">Rounds won</span>
						<span className="tribute-status-lamps">
							{[0, 1].map((i) => (
								<span key={i} className={`g-lamp ${i < p.roundWins ? 'g-lamp--amber' : 'g-lamp--off'}`} />
							))}
						</span>
					</span>
					<span className="tribute-fact">
						<span className="tribute-status-label">In hand</span>
						<span className="tribute-status-value">{handCount}</span>
					</span>
					<span className="tribute-fact">
						<span className="tribute-status-label">Decrees</span>
						<span className="tribute-fact-chips">
							{p.decrees.map((el) => (
								<span key={el} className={`g-chip g-el-${el} ${p.decreesUsed[el] ? 'tribute-decree-chip--used' : ''}`} title={`${decreeName(el)}${p.decreesUsed[el] ? ' (spent)' : ''}`}>
									{capitalizeElement(el)}
								</span>
							))}
						</span>
					</span>
					{p.passed && match.phase === 'play' && <span className="g-chip g-chip--outline tribute-passed-chip">Passed</span>}
				</div>
			</div>
		);
	}

	renderStatusStrip() {
		const { match } = this.state;
		return (
			<div className="g-panel tribute-status-strip">
				{this.renderSideBlock('A')}
				<div className="tribute-centre">
					<span className="tribute-status-label">Round</span>
					<span className="tribute-status-value">{match.phase === 'matchEnd' ? 'Over' : `${match.round} of 3`}</span>
					<span className={`tribute-turn${this.isYourMove() ? ' tribute-turn--yours' : ''}`}>
						<span className={`g-lamp ${this.isYourMove() ? 'g-lamp--amber' : 'g-lamp--off'}`} />
						<span className="tribute-turn-text">{this.turnText()}</span>
					</span>
				</div>
				{this.renderSideBlock('B')}
			</div>
		);
	}

	renderMulligan() {
		const { match, mulliganSelection } = this.state;
		if (match.mulliganTurn !== 'A' || match.players.A.mulliganUsed) {
			return (
				<div className="g-panel tribute-mulligan-panel">
					<p className="g-body">Waiting on the court to present its hand.</p>
				</div>
			);
		}
		const n = mulliganSelection.length;
		return (
			<div className="g-panel tribute-mulligan-panel">
				<p className="g-kicker">Your hand for the whole match</p>
				<p className="g-body">
					These ten cards are all you get for all three rounds. You may send up to two back for fresh draws
					from your remaining two cards. Click a card to mark it, then confirm.
				</p>
				<div className="tribute-hand-row">
					{match.players.A.hand.map((card) => (
						<TributeCard
							key={card.id}
							card={card}
							selected={mulliganSelection.includes(card.id)}
							onClick={() => this.toggleMulliganCard(card.id)}
							title={mulliganSelection.includes(card.id) ? 'Marked to send back. Click again to keep it.' : 'Click to send this card back.'}
						/>
					))}
				</div>
				<div className="tribute-mulligan-actions">
					<button type="button" className="g-btn g-btn--primary" onClick={this.commitMulligan}>
						{n > 0 ? `Send back ${n} and begin` : 'Keep this hand and begin'}
					</button>
					{n > 0 && <span className="g-body tribute-hint">{n === 2 ? 'Two marked, the most you may send back.' : 'One marked.'}</span>}
				</div>
			</div>
		);
	}

	renderRoundBanner() {
		const { match } = this.state;
		const r = match.lastRoundResult;
		if (match.phase === 'matchEnd') {
			const won = match.winner === 'A';
			return (
				<div className={`g-notice ${won ? 'g-notice--ok' : 'g-notice--alert'} tribute-banner`}>
					<span>
						{won ? 'You win the match.' : `${capitalizeFirst(COURT)} wins the match.`}
						{r ? ` The last round went ${r.scores.A} to ${r.scores.B}.` : ''}
					</span>
					<button type="button" className="g-btn" onClick={this.props.onPresentAgain}>Present again</button>
				</div>
			);
		}
		if (!r) {
			return null;
		}
		const won = r.winner === 'A';
		return (
			<div className={`g-notice ${won ? 'g-notice--ok' : 'g-notice--alert'} tribute-banner`}>
				Round {r.round} went to {won ? 'you' : COURT}, {r.scores.A} to {r.scores.B}
				{r.tie ? ' (a tie, settled by cards in hand, then who passed first, then who moved second)' : ''}.
				{' '}Round {match.round}: {match.starter === 'A' ? 'you move first' : `${COURT} moves first`}.
			</div>
		);
	}

	hintText() {
		const { match, selectedCardId, selectedDecree } = this.state;
		if (match.phase !== 'play') {
			return null;
		}
		if (!this.isYourMove()) {
			return `${capitalizeFirst(COURT)} is choosing its move.`;
		}
		if (selectedCardId) {
			const card = match.players.A.hand.find((c) => c.id === selectedCardId);
			return card ? `${card.name} is in hand. Click a lit row on your side to play it, or click the card again to put it back.` : null;
		}
		if (selectedDecree) {
			return `${decreeName(selectedDecree)} is ready. Click any lit row to declare it there. It hits both sides of that range; the totals show what each row becomes.`;
		}
		const a = match.players.A;
		if (a.hand.length === 0) {
			return 'No creatures left. Declare a Decree or pass.';
		}
		return 'Click a creature to play it, a Decree to declare one, or Pass to end your part of the round.';
	}

	renderHumanControls() {
		const { match, selectedCardId, selectedDecree } = this.state;
		const a = match.players.A;
		const yourMove = this.isYourMove();

		return (
			<div className={`tribute-hand-area${yourMove ? '' : ' tribute-hand-area--waiting'}`}>
				<div className="tribute-hand-head">
					<span className="tribute-status-label">Your hand</span>
					<span className="g-body tribute-hint">{this.hintText()}</span>
				</div>
				<div className="tribute-hand-row">
					{a.hand.map((card) => (
						<TributeCard
							key={card.id}
							card={card}
							selected={selectedCardId === card.id}
							onClick={() => this.selectCard(card.id)}
							title={`Fights at ${card.eligibleRows.map((r) => ROW_LABEL[r]).join(', ')}`}
						/>
					))}
					{a.hand.length === 0 && <span className="tribute-row-empty">your hand is empty</span>}
				</div>
				<div className="tribute-hand-controls">
					{a.decrees.map((el) => {
						const spent = a.decreesUsed[el];
						const blockedThisRound = !spent && a.decreePlayedThisRound;
						const disabled = !yourMove || spent || blockedThisRound;
						let suffix = '';
						if (spent) {
							suffix = ' (spent)';
						} else if (blockedThisRound) {
							suffix = ' (next round)';
						}
						return (
							<button
								key={el}
								type="button"
								className={`g-btn g-el-${el} tribute-decree-key${selectedDecree === el ? ' tribute-decree-key--selected' : ''}`}
								disabled={disabled}
								aria-pressed={selectedDecree === el}
								onClick={() => this.selectDecree(el)}
								title={spent ? 'Each Decree can be declared once per match.' : blockedThisRound ? 'One Decree per round.' : `Declare ${decreeName(el)} (${capitalizeElement(el)}) over a row`}
							>
								<span className="tribute-decree-key-el" />
								{decreeName(el)}{suffix}
							</button>
						);
					})}
					<button type="button" className="g-btn g-btn--danger tribute-pass-key" disabled={!yourMove} onClick={this.handlePass} title="End your part of this round. You cannot play again until the next round.">
						Pass
					</button>
				</div>
			</div>
		);
	}

	render() {
		const { match, notice, log } = this.state;
		const playing = match.phase === 'play';

		return (
			<div className="tribute-match">
				{this.renderStatusStrip()}
				{match.phase !== 'mulligan' && this.renderRoundBanner()}
				{notice && <div className="g-notice g-notice--alert tribute-transient-notice" role="status">{notice}</div>}

				{match.phase === 'mulligan' && this.renderMulligan()}

				{match.phase !== 'mulligan' && (
					<TributeBoard
						board={match.board}
						activeDecrees={match.activeDecrees}
						botHandCount={match.players.B.hand.length}
						targets={playing ? this.targets() : {}}
						onRowClick={this.handleRowClick}
					/>
				)}

				{playing && this.renderHumanControls()}

				<div className="g-screen tribute-log" aria-label="Match log">
					{log.length === 0 && <div className="g-screen-line--dim">The court is in session.</div>}
					{log.slice().reverse().map((line, i) => (
						<div className={`g-screen-line${i === 0 ? '' : ' g-screen-line--dim'}`} key={`${log.length - i}`}>{line}</div>
					))}
				</div>
			</div>
		);
	}
}

function capitalizeFirst(s) {
	return s.charAt(0).toUpperCase() + s.slice(1);
}

export default TributeMatch;
