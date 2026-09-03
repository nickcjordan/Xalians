import React from 'react';
import XalianNavbar from '../../components/navbar';
import ReclamationMatch from '../../components/games/reclamation/reclamationMatch';
import { buildRosters } from '../../gameplay/expedition/roster';
import { createMatch } from '../../gameplay/expedition/expeditionRules';
import { getWorlds } from '../../gameplay/expedition/sites';
import { ROSTER_SIZE, SENDABLE, SITES_TO_CLINCH, WORLDS_PER_MATCH } from '../../gameplay/expedition/expeditionInterpretation';

function seedFromQueryOrDefault() {
	const params = new URLSearchParams(window.location.search);
	const fromQuery = params.get('seed');
	if (fromQuery !== null && fromQuery !== '') {
		return fromQuery;
	}
	return Date.now() % 100000;
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
				<div className="g-console rec-console rec-console--match">
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
			<div className="g-console rec-console rec-console--intro">
				<XalianNavbar />
				<div className="g-shell rec-shell rec-shell--intro">
					<header className="rec-masthead">
						<span className="g-kicker">Kozrak's Charter</span>
						<h1 className="rec-masthead-title">Reclamation</h1>
						<span className="g-mono rec-masthead-seed">seed {seed}</span>
					</header>

					<div className="g-panel rec-intro-panel">
						<div className="g-screen rec-rules-screen">
							<div className="g-screen-line">The worlds were lost to war and plague. An expedition takes them back, site by site. The Court's Charter is the acknowledgment of what you already hold.</div>
							<div className="g-screen-line">A match crosses {WORLDS_PER_MATCH} worlds of {3} sites each. Hold {SITES_TO_CLINCH} sites and the Charter is clinched. Every world runs four phases.</div>
							<dl className="rec-rules-phases">
								<dt className="g-screen-line">Deploy</dt>
								<dd className="g-screen-line">You and the rival alternate sending one creature to one site, or passing. A pass is permanent for that world.</dd>
								<dt className="g-screen-line">Orders</dt>
								<dd className="g-screen-line">Give each creature an act, in secret. Left alone, it performs the act its archetype favors. You choose the creature, the site and the act; the creature chooses its own target, by its conduct.</dd>
								<dt className="g-screen-line">Resolve</dt>
								<dd className="g-screen-line">The acts play out, and each creature's hold on its site is struck down, warded or kept.</dd>
								<dt className="g-screen-line">Judge</dt>
								<dd className="g-screen-line">Each site goes to the side with the greater surviving hold. A tie reverts it to the Court. Creatures at a won site stay to hold the claim; the rest withdraw. Either way they are out of the expedition.</dd>
							</dl>
						</div>

						<aside className="rec-intro-charter">
							<div className="rec-charter-figures">
								<div className="rec-charter-figure">
									<span className="rec-charter-number g-mono">{WORLDS_PER_MATCH}</span>
									<span className="rec-charter-label">worlds</span>
								</div>
								<div className="rec-charter-figure">
									<span className="rec-charter-number g-mono">{WORLDS_PER_MATCH * 3}</span>
									<span className="rec-charter-label">sites</span>
								</div>
								<div className="rec-charter-figure rec-charter-figure--key">
									<span className="rec-charter-number g-mono">{SITES_TO_CLINCH}</span>
									<span className="rec-charter-label">to clinch</span>
								</div>
								<div className="rec-charter-figure">
									<span className="rec-charter-number g-mono">{ROSTER_SIZE}<span className="rec-charter-sub">/{SENDABLE}</span></span>
									<span className="rec-charter-label">bring / send</span>
								</div>
							</div>

							<ul className="rec-charter-rules">
								<li><strong>Roster.</strong> Your {ROSTER_SIZE} are generated from the Encyclopedia's species, dealt by the seed. The {ROSTER_SIZE - SENDABLE} you never send are your reserve, chosen as you go.</li>
								<li><strong>Fall back.</strong> The side that moves first on a world may, once, move its first creature to another site without spending a turn.</li>
								<li><strong>Hidden.</strong> A stealthy creature may be sent hidden. The rival learns that you sent something, not what or where.</li>
							</ul>

							<div className="rec-intro-actions">
								<button type="button" className="g-btn g-btn--primary" onClick={this.startMatch}>
									Mount the expedition
								</button>
								<span className="rec-intro-seed g-mono">Add ?seed={seed} to the address to replay this expedition.</span>
							</div>
						</aside>
					</div>
				</div>
			</div>
		);
	}
}

export default ReclamationPage;
