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
					<div className="g-shell page-shell tribute-shell">
						<header className="page-header">
							<p className="g-kicker">Kozrak's Court</p>
							<h1 className="g-title">Tribute</h1>
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
							<div className="g-screen-line">Three rows are ranges - Close, Mid and Far - and a creature fights where its abilities can reach.</div>
							<div className="g-screen-line">Best of three rounds decides the match; the higher row total wins each round.</div>
							<div className="g-screen-line">One hand of ten cards has to last you the whole match - there is no redraw between rounds.</div>
							<div className="g-screen-line">Pass is permanent for the round, so it is a bet as much as a retreat.</div>
							<div className="g-screen-line">The round's starter holds Court Favor, a standing +{COURT_FAVOR} on their total.</div>
							<div className="g-screen-line">A Court Decree is a declared condition that hits both sides of one row through the type chart.</div>
							<div className="g-screen-line--dim">Match seed: {seed}</div>
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
