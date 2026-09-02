import React from 'react';
import TributeBoard from './tributeBoard';
import TributeCard from './tributeCard';
import {
	mulligan, playCreature, playDecree, pass, getPublicState, createRngState, COURT_FAVOR,
} from '../../../gameplay/tribute/tributeRules';
import { chooseAction } from '../../../gameplay/tribute/tributeBot';
import { ROW, DECREES, capitalizeElement } from '../../../gameplay/tribute/tributeInterpretation';
import { decreeContribution } from '../../../gameplay/tribute/decreeCalculator';

const BOT_DELAY_MS = 700;
const LOG_CAP = 40;
const ROWS = [ROW.CLOSE, ROW.MID, ROW.FAR];
const ROW_LABEL = { [ROW.CLOSE]: 'Close', [ROW.MID]: 'Mid', [ROW.FAR]: 'Far' };
// mirrors tributeRules.js's private COURT_FAVOR constant for this component's live score
// readout (the engine exports COURT_FAVOR too; imported below rather than re-declared).

/*
	TributeMatch owns the engine state in React state, per the brief: the engine is a pure
	state-in/state-out machine, so the component's job is only to hold `state`, translate
	human clicks into engine calls, and drive the bot on a timer. Human is seat 'A', bot 'B'.
*/
class TributeMatch extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			match: props.initialMatch,
			log: [],
			selectedCardId: null,
			selectedDecree: null,
			notice: null,
		};
		this.botRng = createRngState(`${props.seed}-bot`);
		this.botTimer = null;
	}

	componentDidMount() {
		// the bot never mulligans away cards (design brief: "bot mulligans nothing") - apply
		// its empty mulligan as soon as it is legal, in whatever order the engine allows
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

	appendLog = (line) => {
		this.setState((prev) => ({
			log: [...prev.log, line].slice(-LOG_CAP),
		}));
	};

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
		const publicState = getPublicState(match, 'B');
		const hand = match.players.B.hand;
		const { action, nextRngState } = chooseAction(publicState, hand, 'B', this.botRng);
		this.botRng = nextRngState;

		let next = null;
		if (action.type === 'playCreature') {
			next = playCreature(match, 'B', action.cardId, action.row);
			if (next) {
				const card = hand.find((c) => c.id === action.cardId);
				const value = card ? card.powerByRow[action.row] : '?';
				this.appendLog(`Court plays ${card ? card.name : action.cardId} to ${ROW_LABEL[action.row]} for ${value}`);
			}
		} else if (action.type === 'playDecree') {
			next = playDecree(match, 'B', action.element, action.row);
			if (next) {
				const decree = DECREES.find((d) => d.element === action.element);
				this.appendLog(`Court declares ${decree ? decree.name : action.element} over ${ROW_LABEL[action.row]}`);
			}
		} else {
			next = pass(match, 'B');
			if (next) {
				this.appendLog(`Court passes: ${this.humanizePassReason(action.reason)}`);
			}
		}

		if (!next) {
			// the engine should never refuse a bot-chosen action; surface it rather than
			// silently stalling, and fall back to a pass so the match keeps moving
			// eslint-disable-next-line no-console
			console.error('Tribute bot produced an illegal action', action);
			this.appendLog(`Court hesitates and passes (bot returned an illegal action: ${action.type})`);
			next = pass(match, 'B');
		}

		if (next) {
			this.afterRoundOrMatchLog(match, next);
			this.setState({ match: next });
		}
	};

	humanizePassReason = (reason) => {
		const words = {
			'winning-after-opp-pass': 'yielding the round, already ahead',
			'cannot-catch-up': 'the hand cannot catch up',
			'yield-after-opp-pass': 'yielding the round; not worth the cards',
			'unbeatable': 'the lead cannot be caught',
			'ahead-parity': 'holding a comfortable lead',
			'yield': 'yielding the round',
			'bluff': 'holding back',
			'no-legal-action': 'nothing left to play',
		};
		return words[reason] || reason || 'passing';
	};

	afterRoundOrMatchLog = (prevMatch, nextMatch) => {
		if (nextMatch.lastRoundResult && nextMatch.lastRoundResult !== prevMatch.lastRoundResult) {
			const r = nextMatch.lastRoundResult;
			const winnerLabel = r.winner === 'A' ? 'you' : "the court's champion";
			this.appendLog(`Round ${r.round} to ${winnerLabel}, ${r.scores.A} to ${r.scores.B}`);
		}
		if (nextMatch.phase === 'matchEnd' && prevMatch.phase !== 'matchEnd') {
			const winnerLabel = nextMatch.winner === 'A' ? 'You win the match' : 'The court wins the match';
			this.appendLog(`${winnerLabel}.`);
		}
	};

	// ---- mulligan (human) ----

	toggleMulliganCard = (cardId) => {
		this.setState((prev) => {
			const already = prev.mulliganSelection || [];
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
		const { match } = this.state;
		const selection = this.state.mulliganSelection || [];
		const next = mulligan(match, 'A', selection);
		if (next) {
			this.appendLog(selection.length > 0 ? `You redraw ${selection.length} card${selection.length > 1 ? 's' : ''}` : 'You keep your hand');
			this.setState({ match: next, mulliganSelection: [] });
		}
	};

	// ---- play (human) ----

	showNotice = (text) => {
		this.setState({ notice: text });
		if (this.noticeTimer) {
			clearTimeout(this.noticeTimer);
		}
		this.noticeTimer = setTimeout(() => this.setState({ notice: null }), 2400);
	};

	selectCard = (cardId) => {
		this.setState((prev) => ({
			selectedCardId: prev.selectedCardId === cardId ? null : cardId,
			selectedDecree: null,
		}));
	};

	selectDecree = (element) => {
		this.setState((prev) => ({
			selectedDecree: prev.selectedDecree === element ? null : element,
			selectedCardId: null,
		}));
	};

	handleRowClick = (row, side) => {
		const { match, selectedCardId, selectedDecree } = this.state;
		if (match.phase !== 'play' || match.turn !== 'A') {
			return;
		}
		if (selectedCardId && side === 'B') {
			this.showNotice('Your creatures stand on your side of the court.');
			return;
		}
		if (selectedCardId) {
			const card = match.players.A.hand.find((c) => c.id === selectedCardId);
			if (!card || !card.eligibleRows.includes(row)) {
				this.showNotice('That row is not eligible for this card.');
				return;
			}
			const next = playCreature(match, 'A', selectedCardId, row);
			if (!next) {
				this.showNotice('Not your turn, or that placement is illegal.');
				return;
			}
			this.appendLog(`You play ${card.name} to ${ROW_LABEL[row]} for ${card.powerByRow[row]}`);
			this.afterRoundOrMatchLog(match, next);
			this.setState({ match: next, selectedCardId: null, selectedDecree: null });
			return;
		}
		if (selectedDecree) {
			const decree = DECREES.find((d) => d.element === selectedDecree);
			const next = playDecree(match, 'A', selectedDecree, row);
			if (!next) {
				this.showNotice('That decree cannot be played (already used, or not your turn).');
				return;
			}
			this.appendLog(`You declare ${decree ? decree.name : selectedDecree} over ${ROW_LABEL[row]}`);
			this.afterRoundOrMatchLog(match, next);
			this.setState({ match: next, selectedCardId: null, selectedDecree: null });
		}
	};

	handlePass = () => {
		const { match } = this.state;
		const next = pass(match, 'A');
		if (!next) {
			this.showNotice('Not your turn.');
			return;
		}
		this.appendLog('You pass');
		this.afterRoundOrMatchLog(match, next);
		this.setState({ match: next, selectedCardId: null, selectedDecree: null });
	};

	renderMulligan() {
		const { match } = this.state;
		const selection = this.state.mulliganSelection || [];
		if (match.mulliganTurn !== 'A' || match.players.A.mulliganUsed) {
			return (
				<div className="g-panel tribute-mulligan-panel">
					<p className="g-body">Waiting on the court to present its own hand.</p>
				</div>
			);
		}
		return (
			<div className="g-panel tribute-mulligan-panel">
				<p className="g-kicker">Mulligan</p>
				<p className="g-body">Choose up to two cards to send back before the court convenes. Click a card to mark it for redraw.</p>
				<div className="tribute-hand-row">
					{match.players.A.hand.map((card) => (
						<TributeCard
							key={card.id}
							card={card}
							selected={selection.includes(card.id)}
							onClick={() => this.toggleMulliganCard(card.id)}
						/>
					))}
				</div>
				<div className="tribute-mulligan-actions">
					<button type="button" className="g-btn g-btn--primary" onClick={this.commitMulligan}>
						{selection.length > 0 ? `Redraw ${selection.length}` : 'Keep hand'}
					</button>
				</div>
			</div>
		);
	}

	renderStatusStrip() {
		const { match } = this.state;
		const a = match.players.A;
		const b = match.players.B;
		return (
			<div className="g-panel tribute-status-strip">
				<div className="tribute-status-block">
					<span className="tribute-status-label">Round</span>
					<span className="tribute-status-value">{match.round} of 3</span>
				</div>

				<div className="tribute-status-block">
					<span className="tribute-status-label">{this.turnLabel()}</span>
					<span className="tribute-status-lamps">
						<span className={`g-lamp ${match.phase === 'play' && match.turn === 'A' ? 'g-lamp--amber' : 'g-lamp--off'}`} />
					</span>
				</div>

				<div className="tribute-status-block">
					<span className="tribute-status-label">Your Wins</span>
					<span className="tribute-status-lamps">
						{[0, 1].map((i) => (
							<span key={i} className={`g-lamp ${i < a.roundWins ? 'g-lamp--amber' : 'g-lamp--off'}`} />
						))}
					</span>
				</div>
				<div className="g-screen tribute-status-screen">
					<span className="g-readout">{this.totalFor('A')}</span>
					{match.starter === 'A' && <span className="g-screen-line--dim">Court Favor +{COURT_FAVOR}</span>}
					{a.passed && <span className="g-chip g-chip--outline">Passed</span>}
					<span className="g-screen-line--dim">{a.hand.length} in hand</span>
				</div>

				<div className="tribute-status-block">
					<span className="tribute-status-label">Court Wins</span>
					<span className="tribute-status-lamps">
						{[0, 1].map((i) => (
							<span key={i} className={`g-lamp ${i < b.roundWins ? 'g-lamp--amber' : 'g-lamp--off'}`} />
						))}
					</span>
				</div>
				<div className="g-screen tribute-status-screen">
					<span className="g-readout">{this.totalFor('B')}</span>
					{match.starter === 'B' && <span className="g-screen-line--dim">Court Favor +{COURT_FAVOR}</span>}
					{b.passed && <span className="g-chip g-chip--outline">Passed</span>}
					<span className="g-screen-line--dim">{b.handCount != null ? b.handCount : b.hand.length} in hand</span>
				</div>

				<div className="tribute-status-decrees">
					<span className="tribute-status-label">Your Decrees</span>
					{a.decrees.map((el) => (
						<span key={el} className={`g-chip g-el-${el} ${a.decreesUsed[el] ? 'tribute-decree-chip--used' : ''}`}>
							{capitalizeElement(el)}
						</span>
					))}
					<span className="tribute-status-label">Court Decrees</span>
					{b.decrees.map((el) => (
						<span key={el} className={`g-chip g-el-${el} ${b.decreesUsed[el] ? 'tribute-decree-chip--used' : ''}`}>
							{capitalizeElement(el)}
						</span>
					))}
				</div>
			</div>
		);
	}

	turnLabel() {
		const { match } = this.state;
		if (match.phase === 'mulligan') {
			return 'Presenting';
		}
		if (match.phase === 'matchEnd') {
			return 'Adjourned';
		}
		return match.turn === 'A' ? 'Your move' : "Court's move";
	}

	// live score readout - mirrors tributeRules.js's rowTotalForPlayer/totalScoreForPlayer
	// (both private to that module) using the same exported decreeContribution math, so the
	// running total always matches what round resolution will compute.
	totalFor(seat) {
		const { match } = this.state;
		let total = 0;
		ROWS.forEach((row) => {
			const decree = match.activeDecrees[row];
			const cards = match.board[row][seat];
			cards.forEach((card) => {
				const printed = card.powerByRow[row];
				total += decreeContribution(printed, decree ? decree.element : null, card.element);
			});
		});
		if (match.starter === seat) {
			total += COURT_FAVOR;
		}
		return total;
	}

	renderRoundResultNotice() {
		const { match } = this.state;
		const r = match.lastRoundResult;
		if (!r) {
			return null;
		}
		if (match.phase === 'matchEnd') {
			return null; // matchEnd gets its own notice below
		}
		const winnerLabel = r.winner === 'A' ? 'you' : "the court's champion";
		const tieNote = r.tie ? ' (tie broken by cards remaining / first pass / starter order)' : '';
		return (
			<div className={`g-notice ${r.winner === 'A' ? 'g-notice--ok' : 'g-notice--alert'}`}>
				Round {r.round} to {winnerLabel}, {r.scores.A} to {r.scores.B}{tieNote}
			</div>
		);
	}

	renderMatchEnd() {
		const { match } = this.state;
		return (
			<div className={`g-notice ${match.winner === 'A' ? 'g-notice--ok' : 'g-notice--alert'}`}>
				<p>{match.winner === 'A' ? 'You win the match.' : "The court's champion wins the match."}</p>
				<button type="button" className="g-btn" onClick={this.props.onPresentAgain}>Present again</button>
			</div>
		);
	}

	renderHumanControls() {
		const { match, selectedCardId, selectedDecree } = this.state;
		const a = match.players.A;
		const yourTurn = match.phase === 'play' && match.turn === 'A';
		const selectedCard = selectedCardId ? a.hand.find((c) => c.id === selectedCardId) : null;

		return (
			<div className="tribute-hand-area">
				<div className="tribute-hand-row">
					{a.hand.map((card) => (
						<TributeCard
							key={card.id}
							card={card}
							selected={selectedCardId === card.id}
							onClick={yourTurn ? () => this.selectCard(card.id) : undefined}
						/>
					))}
				</div>
				<div className="tribute-hand-controls">
					{a.decrees.map((el) => {
						const decree = DECREES.find((d) => d.element === el);
						const disabled = !yourTurn || a.decreesUsed[el] || a.decreePlayedThisRound;
						return (
							<button
								key={el}
								type="button"
								className={`g-btn g-el-${el} ${selectedDecree === el ? 'tribute-decree-selected' : ''}`}
								disabled={disabled}
								aria-pressed={selectedDecree === el}
								onClick={() => this.selectDecree(el)}
							>
								{decree ? decree.name : el} ({capitalizeElement(el)})
							</button>
						);
					})}
					<button type="button" className="g-btn g-btn--danger" disabled={!yourTurn} onClick={this.handlePass}>
						Pass
					</button>
				</div>
				{!yourTurn && match.phase === 'play' && (
					<p className="g-body tribute-waiting-note">Waiting on the court...</p>
				)}
				{selectedCard && (
					<p className="g-body tribute-waiting-note">Selected {selectedCard.name} - click an eligible row to place it.</p>
				)}
			</div>
		);
	}

	// which rows light up as legal targets, and on which side: a creature only ever lands
	// on your own side, a decree covers the facing pair
	targetRows() {
		const { match, selectedCardId, selectedDecree } = this.state;
		if (selectedCardId) {
			const card = match.players.A.hand.find((c) => c.id === selectedCardId);
			return { rows: card ? card.eligibleRows : [], sides: ['A'] };
		}
		if (selectedDecree) {
			return { rows: ROWS, sides: ['A', 'B'] };
		}
		return { rows: [], sides: [] };
	}

	render() {
		const { match, notice } = this.state;

		return (
			<div className="tribute-match">
				{this.renderStatusStrip()}

				{notice && <div className="g-notice g-notice--alert tribute-transient-notice">{notice}</div>}

				{match.phase === 'mulligan' && this.renderMulligan()}

				{match.phase !== 'mulligan' && (
					<TributeBoard
						board={match.board}
						activeDecrees={match.activeDecrees}
						botHandCount={match.players.B.handCount != null ? match.players.B.handCount : match.players.B.hand.length}
						targetRows={this.targetRows().rows}
						targetSides={this.targetRows().sides}
						onRowClick={this.handleRowClick}
					/>
				)}

				{match.phase === 'play' && this.renderRoundResultNotice()}
				{match.phase === 'play' && this.renderHumanControls()}

				{match.phase === 'matchEnd' && this.renderMatchEnd()}

				<div className="g-screen tribute-log">
					{this.state.log.map((line, i) => (
						<div className="g-screen-line" key={i}>{line}</div>
					))}
				</div>
			</div>
		);
	}
}

export default TributeMatch;
