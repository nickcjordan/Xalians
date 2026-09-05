import React from 'react';
import XalianNavbar from '../../components/navbar';
import ReclamationMatch from '../../components/games/reclamation/reclamationMatch';
import { HoldMeter } from '../../components/games/reclamation/reclamationFigure';
import { PhaseGlyph, RivalGlyph } from '../../components/games/reclamation/reclamationGlyphs';
import { buildRosters } from '../../gameplay/expedition/roster';
import { createMatch } from '../../gameplay/expedition/expeditionRules';
import { getWorlds } from '../../gameplay/expedition/sites';
import { RIVALS, DEFAULT_RIVAL_ID, rivalById } from '../../gameplay/expedition/expeditionBot';
import { ROSTER_SIZE, SENDABLE, SITES_TO_CLINCH, WORLDS_PER_MATCH, FRAMES_PER_MATCH, WORLDS_PER_FRAME } from '../../gameplay/expedition/expeditionInterpretation';
import {
	saveMatch, loadMatch, clearMatch, recordResult, recordAgainst, loadRivalId, saveRivalId,
} from '../../components/games/reclamation/reclamationStorage';

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

// the record against one rival, as the plate prints it
function recordLine(rivalId) {
	const { played, won } = recordAgainst(rivalId);
	if (!played) {
		return null;
	}
	return `${won} to ${played - won}`;
}

/*
	The rivals: five named handlers over the same bot, each a weight set with a style of
	its own (expeditionBot.RIVALS). The plate says who they are, how they play, and the
	record against them from this browser's history. The choice is remembered.
*/
function RivalPlates({ rivalId, onChange }) {
	return (
		<div className="rec-rivals" role="radiogroup" aria-label="Your rival" data-rivals>
			{RIVALS.map((rival, i) => {
				const chosen = rival.id === rivalId;
				const record = recordLine(rival.id);
				const mark = Math.round(rival.measured.vsProctor * 100);
				return (
					<button
						key={rival.id}
						type="button"
						className={`rec-rival g-panel${chosen ? ' rec-rival--chosen' : ''}`}
						role="radio"
						aria-checked={chosen}
						onClick={() => onChange(rival.id)}
						data-rival={rival.id}
						title={`${rival.name}, ${rival.faction}, ${rival.home}. ${rival.style} Wins ${mark} in 100 against the proctor.`}
					>
						<span className="rec-rival-glyph"><RivalGlyph id={rival.id} /></span>
						<span className="rec-rival-name">{rival.name}</span>
						<span className="rec-rival-tag">{rival.tag}</span>
						<span className="rec-rival-ladder" aria-label={`Strength ${i + 1} of ${RIVALS.length}`}>
							{RIVALS.map((_, j) => (
								<span className={`g-lamp ${j <= i ? 'g-lamp--amber' : 'g-lamp--off'}`} key={j} />
							))}
						</span>
						{record && <span className="rec-rival-record g-mono" data-rival-record={rival.id}>{record}</span>}
					</button>
				);
			})}
		</div>
	);
}

// how a round goes, as four glyphs with a word each
const PHASES = [
	{ kind: 'deploy', word: 'Deploy', note: 'send a creature, or pass' },
	{ kind: 'orders', word: 'Orders', note: 'each creature an act, sealed' },
	{ kind: 'resolve', word: 'Resolve', note: 'acts strike at hold' },
	{ kind: 'judge', word: 'Judge', note: 'more hold takes the world' },
];

function seedFromQueryOrDefault() {
	const params = new URLSearchParams(window.location.search);
	const fromQuery = params.get('seed');
	if (fromQuery !== null && fromQuery !== '') {
		return fromQuery;
	}
	return Date.now() % 100000;
}

function rivalFromQueryOrStored() {
	const params = new URLSearchParams(window.location.search);
	const fromQuery = params.get('rival');
	if (fromQuery && rivalById(fromQuery).id === fromQuery) {
		return fromQuery;
	}
	const stored = loadRivalId();
	return stored && rivalById(stored).id === stored ? stored : DEFAULT_RIVAL_ID;
}

class ReclamationPage extends React.Component {
	constructor(props) {
		super(props);
		const saved = loadMatch();
		this.state = {
			seed: seedFromQueryOrDefault(),
			match: null,
			matchKey: 0,
			mode: readMode(),
			rivalId: rivalFromQueryOrStored(),
			// a Proving left unfinished in this browser, offered on the intro
			saved: saved && saved.match && saved.match.phase !== 'matchEnd' ? saved : null,
			// what the running table was given when it mounted, so a resume restores the log,
			// the squad order and the rival's dice as well as the engine state
			resume: null,
		};
	}

	setMode = (mode) => {
		storeMode(mode);
		this.setState({ mode });
	};

	setRival = (rivalId) => {
		saveRivalId(rivalId);
		this.setState({ rivalId });
	};

	begin = (seed) => {
		const { rivalId } = this.state;
		const { rosterA, rosterB } = buildRosters(seed);
		const match = createMatch({ rosterA, rosterB, worlds: getWorlds(), seed });
		clearMatch();
		this.setState((prev) => ({ seed, match, rivalId, resume: null, saved: null, matchKey: prev.matchKey + 1 }));
	};

	startMatch = () => {
		this.begin(this.state.seed);
	};

	newProving = () => {
		this.begin(Date.now() % 100000);
	};

	resumeMatch = () => {
		const { saved } = this.state;
		if (!saved) {
			return;
		}
		this.setState((prev) => ({
			seed: saved.seed,
			rivalId: saved.rivalId || DEFAULT_RIVAL_ID,
			match: saved.match,
			resume: saved,
			saved: null,
			matchKey: prev.matchKey + 1,
		}));
	};

	discardSaved = () => {
		clearMatch();
		this.setState({ saved: null });
	};

	// after every engine step the table hands over what a resume needs; a finished Proving
	// goes into the history instead and the saved match is cleared
	onEngineStep = ({ match, log, botRngState, squadIds, rosters }) => {
		const { seed, rivalId, mode } = this.state;
		if (match.phase === 'matchEnd') {
			clearMatch();
			recordResult({
				rivalId,
				won: match.winner === 'A',
				sitesYou: match.players.A.sitesWon,
				sitesRival: match.players.B.sitesWon,
				seed,
				reason: match.matchEndReason,
			});
			return;
		}
		saveMatch({ version: 1, seed, rivalId, mode, match, log, botRngState, squadIds, rosters });
	};

	render() {
		const { match, seed, matchKey, mode, rivalId, saved, resume } = this.state;
		const rival = rivalById(rivalId);

		if (match) {
			const squad = resume && resume.squadIds && resume.rosters
				? resume.squadIds.map((id) => resume.rosters.A.find((r) => r.id === id)).filter(Boolean)
				: null;
			return (
				<div className="g-console rec-console rec-console--match">
					<XalianNavbar />
					<div className="g-shell rec-shell rec-shell--match">
						<header className="rec-masthead">
							<span className="g-kicker">Kozrak's Charter</span>
							<h1 className="rec-masthead-title">Reclamation</h1>
							<ModeSwitch mode={mode} onChange={this.setMode} compact />
							<span className="rec-masthead-rival" data-masthead-rival>against the {rival.name}</span>
							<span className="g-mono rec-masthead-seed">seed {seed}</span>
						</header>
						<ReclamationMatch
							key={matchKey}
							initialMatch={match}
							initialLog={resume ? resume.log : null}
							botRngState={resume ? resume.botRngState : null}
							squad={squad}
							rosters={resume ? resume.rosters : null}
							rivalId={rivalId}
							seed={seed}
							mode={mode}
							onEngineStep={this.onEngineStep}
							onNewProving={this.newProving}
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

					{saved && (
						<div className="g-panel rec-resume rec-rise" data-resume>
							<span className="g-lamp g-lamp--amber" aria-hidden="true" />
							<span className="rec-resume-text">
								A Proving against the {rivalById(saved.rivalId || DEFAULT_RIVAL_ID).name} is still on the frame, round {(saved.match.frameIndex || 0) + 1}, {saved.match.players.A.sitesWon} worlds to {saved.match.players.B.sitesWon}.
							</span>
							<span className="rec-resume-actions">
								<button type="button" className="g-btn g-btn--primary" onClick={this.resumeMatch} data-resume-match>Resume the Proving</button>
								<button type="button" className="g-btn" onClick={this.discardSaved} data-discard-match>Abandon it</button>
							</span>
						</div>
					)}

					<div className="g-panel rec-intro-panel">
						<div className="rec-intro-brief">
							<p className="rec-thesis">Send your creatures into three worlds a round. Hold more of a world than the rival and it is yours. Five worlds take the Charter.</p>

							<ol className="rec-phases" aria-label="A round">
								{PHASES.map((phase, i) => (
									<li className="rec-phase" key={phase.kind}>
										<span className="rec-phase-glyph"><PhaseGlyph kind={phase.kind} /></span>
										<span className="rec-phase-word">{i + 1} {phase.word}</span>
										<span className="rec-phase-note">{phase.note}</span>
									</li>
								))}
							</ol>

							<div className="rec-hold-lesson" aria-label="Hold">
								<span className="rec-hold-lesson-title">Hold</span>
								<ul className="rec-hold-cases">
									<li className="rec-hold-case g-el-water">
										<HoldMeter hold={18} isHome size="full" scale />
										<span className="rec-hold-case-note">on its own world</span>
									</li>
									<li className="rec-hold-case g-el-rock">
										<HoldMeter hold={12} size="full" scale />
										<span className="rec-hold-case-note">on another</span>
									</li>
									<li className="rec-hold-case g-el-ice">
										<HoldMeter hold={5} unstrained={12} strainLevel="severe" size="full" scale />
										<span className="rec-hold-case-note">where its body strains</span>
									</li>
								</ul>
							</div>

							<details className="rec-fiction">
								<summary className="rec-fiction-summary">Why the frame</summary>
								<div className="g-screen rec-rules-screen">
									<div className="g-screen-line">The worlds were lost to war and plague, and no expedition goes in blind. Before Kozrak grants a Charter over a world, the claim is proved on the Court's <strong>frame</strong>: the Generators' own models of the fourteen worlds, run on Poseidas without the Generators. Only the fighting is simulated. The Charter, and the Tokens that come with it, are real.</div>
									<div className="g-screen-line">Each round the frame loads three worlds side by side, every one at a different site of its surface, and no world is loaded twice in a Proving. A creature's hold is how firmly it keeps a world, read by the frame on a scale of 0 to 20; the Generators built each for one world, so on its own it holds half again and at a site its body cannot bear it holds less. Creatures on a won world stay in its model to hold the claim; the rest withdraw; either way they are out of the Proving. A pass is permanent for the round. The side that sends first in a round may, once, move its first creature to another world without spending a turn. A stealthy creature may be sent hidden.</div>
								</div>
							</details>
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

							<div className="rec-intro-actions">
								<div className="rec-intro-mode" title={mode === 'simple' ? 'Simple: the suggested move is marked and orders go by nature.' : 'Advanced: every order, every number, hidden sends, the log and the dossiers.'}>
									<ModeSwitch mode={mode} onChange={this.setMode} />
								</div>
								<button type="button" className="g-btn g-btn--primary" onClick={this.startMatch} data-enter>
									Enter the frame
								</button>
								<span className="rec-intro-against">against the {rival.name}</span>
							</div>
						</aside>
					</div>

					<section className="rec-rivals-panel" aria-labelledby="rec-rivals-title">
						<header className="rec-rivals-head">
							<span className="g-kicker">Connected over QED</span>
							<h2 className="rec-rivals-title" id="rec-rivals-title">Your rival</h2>
							<span className="rec-rivals-ladder-note">weakest to strongest</span>
						</header>
						<RivalPlates rivalId={rivalId} onChange={this.setRival} />
					</section>
				</div>
			</div>
		);
	}
}

export default ReclamationPage;
