import React from 'react';
import XalianNavbar from '../../components/navbar';
import ReclamationMatch from '../../components/games/reclamation/reclamationMatch';
import { buildRosters } from '../../gameplay/expedition/roster';
import { createMatch } from '../../gameplay/expedition/expeditionRules';
import { getWorlds } from '../../gameplay/expedition/sites';
import { ROSTER_SIZE, SENDABLE, SITES_TO_CLINCH, WORLDS_PER_MATCH, FRAMES_PER_MATCH, WORLDS_PER_FRAME } from '../../gameplay/expedition/expeditionInterpretation';

const MODE_KEY = 'reclamation.mode';

function readMode() {
	try {
		const stored = window.localStorage.getItem(MODE_KEY);
		return stored === 'advanced' ? 'advanced' : 'simple';
	} catch (e) {
		return 'simple';
	}
}

function storeMode(mode) {
	try {
		window.localStorage.setItem(MODE_KEY, mode);
	} catch (e) {
		// storage may be unavailable; the choice then lasts for the page
	}
}

function ModeSwitch({ mode, onChange, compact }) {
	return (
		<div className={`g-segmented rec-mode${compact ? ' rec-mode--compact' : ''}`} role="group" aria-label="Table mode" data-mode-switch>
			{['simple', 'advanced'].map((m) => (
				<button
					key={m}
					type="button"
					className="g-segment"
					aria-pressed={mode === m}
					onClick={() => onChange(m)}
					data-mode={m}
				>
					{m === 'simple' ? 'Simple' : 'Advanced'}
				</button>
			))}
		</div>
	);
}

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
		mode: readMode(),
	};

	setMode = (mode) => {
		storeMode(mode);
		this.setState({ mode });
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
		const { match, seed, matchKey, mode } = this.state;

		if (match) {
			return (
				<div className="g-console rec-console rec-console--match">
					<XalianNavbar />
					<div className="g-shell rec-shell rec-shell--match">
						<header className="rec-masthead">
							<span className="g-kicker">Kozrak's Charter</span>
							<h1 className="rec-masthead-title">Reclamation</h1>
							<ModeSwitch mode={mode} onChange={this.setMode} compact />
							<span className="g-mono rec-masthead-seed">seed {seed}</span>
						</header>
						<ReclamationMatch
							key={matchKey}
							initialMatch={match}
							seed={seed}
							mode={mode}
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
							<div className="g-screen-line">The worlds were lost to war and plague, and no expedition goes in blind. Before Kozrak grants a Charter over a world, the claim is proved on the Court's <strong>frame</strong>: the Generators' own models of the fourteen worlds, run on Poseidas without the Generators. Only the fighting is simulated. The Charter, and the Tokens that come with it, are real.</div>
							<div className="g-screen-line">A Proving runs {FRAMES_PER_MATCH} rounds. Each round the frame loads {WORLDS_PER_FRAME} worlds side by side, every one at a different site of its surface, and no world is loaded twice. Hold {SITES_TO_CLINCH} of the {WORLDS_PER_MATCH} and the Charter is clinched.</div>
							<div className="g-screen-line">Every creature has a <strong>hold</strong>: how firmly it keeps a world, read by the frame on a scale of 0 to 20. The Generators built each for one world, so on the wrong world, or at a site its body cannot bear, it holds less; on its own world it holds half again. Acts strike at hold. When the fighting stops, the Court reads the frame and gives each world to the side that still holds more of it.</div>
							<dl className="rec-rules-phases">
								<dt className="g-screen-line">Deploy</dt>
								<dd className="g-screen-line">You and the rival alternate sending one creature into one of the three worlds, or passing. A pass is permanent for that round.</dd>
								<dt className="g-screen-line">Orders</dt>
								<dd className="g-screen-line">Give each creature an act, in secret. Left alone, it performs the act its archetype favors. You choose the creature, the world and the act; the creature chooses its own target, by its conduct.</dd>
								<dt className="g-screen-line">Resolve</dt>
								<dd className="g-screen-line">The acts play out, and each creature's hold on its world is struck down, warded or kept.</dd>
								<dt className="g-screen-line">Judge</dt>
								<dd className="g-screen-line">Each world goes to the side with the greater surviving hold. A tie reverts it to the Court. Creatures on a won world stay in its model to hold the claim; the rest withdraw. Either way they are out of the Proving.</dd>
							</dl>
						</div>

						<aside className="rec-intro-charter">
							<div className="rec-charter-figures">
								<div className="rec-charter-figure">
									<span className="rec-charter-number g-mono">{FRAMES_PER_MATCH}</span>
									<span className="rec-charter-label">rounds</span>
								</div>
								<div className="rec-charter-figure">
									<span className="rec-charter-number g-mono">{WORLDS_PER_MATCH}</span>
									<span className="rec-charter-label">worlds</span>
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
								<li><strong>Fall back.</strong> The side that sends first in a round may, once, move its first creature to another world in the frame without spending a turn.</li>
								<li><strong>Hidden.</strong> A stealthy creature may be sent hidden. The rival learns that you sent something, not what or where.</li>
							</ul>

							<div className="rec-intro-actions">
							<div className="rec-intro-mode">
								<ModeSwitch mode={mode} onChange={this.setMode} />
								<span className="rec-intro-mode-text">
									{mode === 'simple'
										? 'Simple: choose a creature, then a world, with the suggested move marked; orders by nature, go. Switch any time.'
										: 'Advanced: every order, every number, hidden sends, the log and the dossiers.'}
								</span>
							</div>
							<button type="button" className="g-btn g-btn--primary" onClick={this.startMatch}>
								Enter the frame
							</button>
								<span className="rec-intro-seed g-mono">Add ?seed={seed} to the address to replay this Proving.</span>
							</div>
						</aside>
					</div>
				</div>
			</div>
		);
	}
}

export default ReclamationPage;
