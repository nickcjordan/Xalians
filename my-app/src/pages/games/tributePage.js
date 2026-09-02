import React from 'react';
import XalianNavbar from '../../components/navbar';
import TributeMatch from '../../components/games/tribute/tributeMatch';
import { rollXalians } from '../../gameplay/tribute/devtools/rollProvisionalXalians';
import { createMatch, createRngState, nextRandom, COURT_FAVOR } from '../../gameplay/tribute/tributeRules';
import { DECREES } from '../../gameplay/tribute/tributeInterpretation';

const POOL_SIZE = 60;
const DECK_SIZE = 12;
const DECREES_PER_DECK = 2;

function seedFromQueryOrDefault() {
	const params = new URLSearchParams(window.location.search);
	const fromQuery = params.get('seed');
	if (fromQuery !== null && fromQuery !== '') {
		return fromQuery;
	}
	return Date.now() % 100000;
}

// Fisher-Yates over the match's own deterministic PRNG state, so the deck build replays
// identically from the same seed (the same rng primitives tributeRules.js exports).
function shuffleWithRng(array, rngState) {
	const result = array.slice();
	let state = rngState;
	for (let i = result.length - 1; i > 0; i--) {
		const { value, nextState } = nextRandom(state);
		state = nextState;
		const j = Math.floor(value * (i + 1));
		const tmp = result[i];
		result[i] = result[j];
		result[j] = tmp;
	}
	return { array: result, nextState: state };
}

function pickDecrees(rngState) {
	const { array: shuffled, nextState } = shuffleWithRng(DECREES.map((d) => d.element), rngState);
	return { decrees: shuffled.slice(0, DECREES_PER_DECK), nextState };
}

// rolls a 60-creature pool, deals 12 to each side, and gives each 2 random distinct
// decrees, all from one deterministic rng seeded off the match seed - so the same seed
// always reproduces the same match setup for replay/testing (design brief step 1a).
function buildDecks(seed) {
	const pool = rollXalians(POOL_SIZE, seed);
	let rngState = createRngState(`${seed}-deckbuild`);

	const { array: shuffledPool, nextState: afterShuffle } = shuffleWithRng(pool, rngState);
	rngState = afterShuffle;

	const humanCards = shuffledPool.slice(0, DECK_SIZE);
	const botCards = shuffledPool.slice(DECK_SIZE, DECK_SIZE * 2);

	const { decrees: humanDecrees, nextState: afterHumanDecrees } = pickDecrees(rngState);
	rngState = afterHumanDecrees;
	const { decrees: botDecrees } = pickDecrees(rngState);

	return {
		deckA: { cards: humanCards, decrees: humanDecrees },
		deckB: { cards: botCards, decrees: botDecrees },
	};
}

class TributePage extends React.Component {
	state = {
		seed: seedFromQueryOrDefault(),
		match: null,
	};

	startMatch = () => {
		const { seed } = this.state;
		const { deckA, deckB } = buildDecks(seed);
		const match = createMatch(deckA, deckB, seed);
		this.setState({ match });
	};

	presentAgain = () => {
		this.setState({ seed: Date.now() % 100000, match: null });
	};

	render() {
		const { match, seed } = this.state;

		if (match) {
			return (
				<div className="g-console">
					<XalianNavbar />
					<div className="g-shell page-shell tribute-shell tribute-shell--match">
						<header className="tribute-match-masthead">
							<span className="g-kicker">Kozrak's Court</span>
							<h1 className="tribute-match-title">Tribute</h1>
						</header>
						<TributeMatch initialMatch={match} seed={seed} onPresentAgain={this.presentAgain} />
					</div>
				</div>
			);
		}

		return (
			<div className="g-console">
				<XalianNavbar />
				<div className="g-shell page-shell tribute-shell">
					<header className="page-header">
						<p className="g-kicker">Kozrak's Court</p>
						<h1 className="g-title">Tribute</h1>
					</header>

					<div className="g-panel tribute-intro-panel">
						<div className="g-screen tribute-rules-screen">
							<div className="g-screen-line">You and the Court each field creatures into three rows: Close, Mid and Far. A creature can only stand in a row its abilities reach; its card shows the number it fights for in each row it can use.</div>
							<div className="g-screen-line">Take turns playing one creature at a time. Rows hold any number of creatures. Your round score is the sum of all three of your rows.</div>
							<div className="g-screen-line">When you pass you are out for the rest of the round. When both sides have passed, the higher score takes the round. First to two rounds wins the match.</div>
							<div className="g-screen-line">You draw ten cards for the whole match, with no redraws between rounds. Cards spent winning round one are not there for round three.</div>
							<div className="g-screen-line">Whoever moves first in a round holds Court Favor, +{COURT_FAVOR} on their score.</div>
							<div className="g-screen-line">A Court Decree names a condition over one range, on both sides. Every creature there is scaled by how its element fares against the Decree's element. One Decree per round, each once per match.</div>
							<div className="g-screen-line--dim">Match seed: {seed}. Add ?seed=NUMBER to the address to replay a match.</div>
						</div>

						<div className="tribute-intro-actions">
							<button type="button" className="g-btn g-btn--primary" onClick={this.startMatch}>
								Present your roster
							</button>
						</div>
					</div>
				</div>
			</div>
		);
	}
}

export default TributePage;
