import React from 'react';
import XalianNavbar from '../../components/navbar';
import ReclamationMatch from '../../components/games/reclamation/reclamationMatch';
import { rollExpeditionXalians } from '../../gameplay/expedition/devtools/rollExpeditionXalians';
import { createMatch, createRngState, nextRandom } from '../../gameplay/expedition/expeditionRules';
import { getWorlds } from '../../gameplay/expedition/sites';
import { ROSTER_SIZE, SENDABLE, SITES_TO_CLINCH, WORLDS_PER_MATCH } from '../../gameplay/expedition/expeditionInterpretation';

const POOL_SIZE = 60;

function seedFromQueryOrDefault() {
	const params = new URLSearchParams(window.location.search);
	const fromQuery = params.get('seed');
	if (fromQuery !== null && fromQuery !== '') {
		return fromQuery;
	}
	return Date.now() % 100000;
}

// Fisher-Yates over the engine's own deterministic PRNG, so the same seed always deals
// the same two rosters — the /tribute page builds its decks the same way.
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

function buildRosters(seed) {
	const pool = rollExpeditionXalians(POOL_SIZE, seed);
	const { array: shuffled } = shuffleWithRng(pool, createRngState(`${seed}-rosterbuild`));
	return {
		rosterA: shuffled.slice(0, ROSTER_SIZE),
		rosterB: shuffled.slice(ROSTER_SIZE, ROSTER_SIZE * 2),
	};
}

class ReclamationPage extends React.Component {
	state = {
		seed: seedFromQueryOrDefault(),
		match: null,
		matchKey: 0,
	};

	startMatch = () => {
		const { seed } = this.state;
		const { rosterA, rosterB } = buildRosters(seed);
		const match = createMatch({ rosterA, rosterB, worlds: getWorlds(), seed });
		this.setState((prev) => ({ match, matchKey: prev.matchKey + 1 }));
	};

	newExpedition = () => {
		const seed = Date.now() % 100000;
		const { rosterA, rosterB } = buildRosters(seed);
		const match = createMatch({ rosterA, rosterB, worlds: getWorlds(), seed });
		this.setState((prev) => ({ seed, match, matchKey: prev.matchKey + 1 }));
	};

	render() {
		const { match, seed, matchKey } = this.state;

		if (match) {
			return (
				<div className="g-console rec-console">
					<XalianNavbar />
					<div className="g-shell rec-shell rec-shell--match">
						<header className="rec-masthead">
							<span className="g-kicker">Kozrak's Charter</span>
							<h1 className="rec-masthead-title">Reclamation</h1>
							<span className="g-mono rec-masthead-seed">seed {seed}</span>
						</header>
						<ReclamationMatch
							key={matchKey}
							initialMatch={match}
							seed={seed}
							onNewExpedition={this.newExpedition}
						/>
					</div>
				</div>
			);
		}

		return (
			<div className="g-console rec-console">
				<XalianNavbar />
				<div className="g-shell page-shell rec-shell">
					<header className="page-header">
						<p className="g-kicker">Kozrak's Charter</p>
						<h1 className="g-title">Reclamation</h1>
					</header>

					<div className="g-panel rec-intro-panel">
						<div className="g-screen rec-rules-screen">
							<div className="g-screen-line">The worlds were lost to war and plague. An expedition takes them back, site by site, and the Court's Charter is the acknowledgment of what you already hold.</div>
							<div className="g-screen-line">A match crosses {WORLDS_PER_MATCH} worlds. Each world opens {3} sites. Hold {SITES_TO_CLINCH} sites and the Charter is clinched.</div>
							<div className="g-screen-line">Each world runs Deploy, Orders, Resolve, Judge. In Deploy you alternate sending one creature to one site, or passing. Passing is permanent for that world.</div>
							<div className="g-screen-line">In Orders you assign each of your creatures an act, in secret. A creature you leave alone performs the act its archetype favors. You choose the creature, the site and the act; the creature chooses its own target, by its conduct.</div>
							<div className="g-screen-line">At the Judge each site goes to the side with the greater surviving hold. A tie reverts the site to the Court. Creatures at a won site stay to hold the claim; the rest withdraw. Either way they are out of the expedition.</div>
							<div className="g-screen-line">You bring {ROSTER_SIZE} creatures and may send {SENDABLE}. The two you never send are your reserve, chosen as you go.</div>
							<div className="g-screen-line">Two small rules. The side that moves first on a world may, once, fall its first creature back to another site without spending a turn. And a stealthy creature may be sent hidden: the rival learns that you sent something, not what or where.</div>
							<div className="g-screen-line--dim">Match seed: {seed}. Add ?seed=NUMBER to the address to replay an expedition.</div>
						</div>

						<div className="rec-intro-actions">
							<button type="button" className="g-btn g-btn--primary" onClick={this.startMatch}>
								Mount the expedition
							</button>
						</div>
					</div>
				</div>
			</div>
		);
	}
}

export default ReclamationPage;
