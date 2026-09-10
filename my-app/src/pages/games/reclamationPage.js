// Terminal: field. Reclamation is survey work on the salvaged ECHELON unit.
import React from 'react';
import XalianNavbar from '../../components/navbar';
import ReclamationMatch from '../../components/games/reclamation/reclamationMatch';
import { HoldMeter } from '../../components/games/reclamation/reclamationFigure';
import { PhaseGlyph, RivalGlyph } from '../../components/games/reclamation/reclamationGlyphs';
import { buildDraftPools, botDraft, validateKeep } from '../../gameplay/expedition/draft';
import ReclamationDraft from '../../components/games/reclamation/reclamationDraft';
import { createSound } from '../../components/games/reclamation/reclamationSound';
import { createMatch } from '../../gameplay/expedition/expeditionRules';
import { getWorlds } from '../../gameplay/expedition/sites';
import { RIVALS, DEFAULT_RIVAL_ID, rivalById } from '../../gameplay/expedition/expeditionBot';
import { ROSTER_SIZE, SENDABLE, SITES_TO_CLINCH, WORLDS_PER_MATCH, FRAMES_PER_MATCH, WORLDS_PER_FRAME } from '../../gameplay/expedition/expeditionInterpretation';
import {
	saveMatch, loadMatch, clearMatch, recordResult, recordAgainst, loadRivalId, saveRivalId,
} from '../../components/games/reclamation/reclamationStorage';
import { createTelemetry } from '../../components/games/reclamation/reclamationTelemetry';

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

// how a round goes, as three glyphs with a word each (the base redesign: Deploy, Clash,
// Ruling; there is no Orders phase and a creature's role is fixed at send)
const PHASES = [
	{ kind: 'deploy', word: 'Deploy', note: 'send a creature, move a swift one, or pass' },
	{ kind: 'clash', word: 'Clash', note: 'attacks subtract from hold, fastest first' },
	{ kind: 'ruling', word: 'Ruling', note: 'bolsters recover, then more hold takes the world' },
];

/*
	Every attribute a job (docs/design/reclamation-base-redesign.md, "Pass 2"): one line
	per lane, in the same words the dossier's Lanes block and the plinth's marks use.
*/
const LANES = [
	{ key: 'hold', word: 'Vitality, resilience, endurance', note: 'how much hold it brings to a world' },
	{ key: 'power', word: 'Strength, intelligence', note: 'attack power, by contact or by mind' },
	{ key: 'speed', word: 'Agility, reflex', note: 'speed: who attacks first, and who may move once a round' },
	{ key: 'willpower', word: 'Willpower', note: 'holds against the world: one grade less strain' },
	{ key: 'charisma', word: 'Charisma', note: 'presence: how much a bolster gives back and a shield stops' },
	{ key: 'instinct', word: 'Instinct', note: 'targeting: keen picks what it can down, dull hits what came first' },
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
			// the draft: eighteen dealt, twelve kept, before the frame is entered
			draft: null,
			soundOn: false,
		};
		// the console's cues, synthesized in code, off until the player turns them on
		this.sound = createSound({});
		this.state.soundOn = this.sound.enabled();
		// quiet local instrumentation (docs/design/game-validation-principles.md section 3);
		// one instance for the page's lifetime, handed to every ReclamationMatch it mounts
		this.telemetry = createTelemetry({});
		// whether the draft in progress has used "Pick for me" (auto) at least once; reset
		// each time a new draft begins, read at confirmDraft to tell beginMatch's draft field
		this.draftUsedAuto = false;
	}

	componentWillUnmount() {
		this.sound.dispose();
	}

	toggleSound = () => {
		this.sound.toggle();
		const on = this.sound.enabled();
		if (on) {
			this.sound.play('lift');
		}
		this.telemetry.soundToggled(on);
		this.setState({ soundOn: on });
	};

	renderSoundToggle() {
		const { soundOn } = this.state;
		return (
			<button
				type="button"
				className={`g-btn rec-sound${soundOn ? ' rec-sound--on' : ''}`}
				onClick={this.toggleSound}
				aria-pressed={soundOn}
				title={soundOn ? 'Console sound is on. Press to mute.' : 'Console sound is off. Press to turn it on.'}
				data-sound
			>
				<span className={`g-lamp ${soundOn ? 'g-lamp--amber' : 'g-lamp--off'}`} aria-hidden="true" />
				Sound
			</button>
		);
	}

	setMode = (mode) => {
		storeMode(mode);
		this.setState({ mode });
	};

	setRival = (rivalId) => {
		saveRivalId(rivalId);
		this.setState({ rivalId });
	};

	// the draft comes first: eighteen creatures dealt to each side under the seed, the
	// nine worlds of the Proving shown, and the handler keeps twelve; the rival keeps its
	// own twelve by its habit
	begin = (seed) => {
		const { poolA, poolB, frames } = buildDraftPools(seed);
		clearMatch();
		this.draftUsedAuto = false;
		this.setState({ seed, draft: { poolA, poolB, frames, keepIds: [] }, resume: null, saved: null, match: null });
	};

	toggleKeep = (recordId) => {
		this.setState((prev) => {
			const kept = prev.draft.keepIds.includes(recordId)
				? prev.draft.keepIds.filter((id) => id !== recordId)
				: prev.draft.keepIds.length < ROSTER_SIZE ? [...prev.draft.keepIds, recordId] : prev.draft.keepIds;
			return { draft: { ...prev.draft, keepIds: kept } };
		});
	};

	keepAll = (ids) => {
		this.draftUsedAuto = true;
		this.setState((prev) => ({ draft: { ...prev.draft, keepIds: ids.slice(0, ROSTER_SIZE) } }));
	};

	confirmDraft = () => {
		const { draft, seed, rivalId, mode } = this.state;
		if (!draft || !validateKeep(draft.poolA, draft.keepIds)) {
			return;
		}
		const rival = rivalById(rivalId);
		const rosterA = draft.keepIds.map((id) => draft.poolA.find((r) => r.id === id));
		const keepB = botDraft(draft.poolB, draft.frames, rival);
		const rosterB = keepB.map((id) => draft.poolB.find((r) => r.id === id));
		const match = createMatch({ rosterA, rosterB, worlds: getWorlds(), seed });
		this.telemetry.beginMatch({
			seed, rivalId, mode, draft: this.draftUsedAuto ? 'auto' : 'manual', resumed: false,
		});
		this.setState((prev) => ({ match, draft: null, matchKey: prev.matchKey + 1 }));
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
		this.telemetry.beginMatch({
			seed: saved.seed, rivalId: saved.rivalId || DEFAULT_RIVAL_ID, mode: saved.mode, draft: 'none', resumed: true,
		});
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
		const { match, seed, matchKey, mode, rivalId, saved, resume, draft } = this.state;
		const rival = rivalById(rivalId);

		if (draft) {
			return (
				<div className="g-console rec-console rec-console--draft" data-terminal="field">
					<XalianNavbar />
					<div className="g-shell rec-shell rec-shell--draft">
						<header className="rec-masthead">
							<span className="g-kicker">Kozrak's Charter</span>
							<h1 className="rec-masthead-title">Reclamation</h1>
							<span className="rec-masthead-rival" data-masthead-rival>against the {rival.name}</span>
							<span className="g-mono rec-masthead-seed">seed {seed}</span>
						</header>
						<ReclamationDraft
							pool={draft.poolA}
							frames={draft.frames}
							keepIds={draft.keepIds}
							onToggle={this.toggleKeep}
							onKeepAll={this.keepAll}
							onConfirm={this.confirmDraft}
							rivalName={rival.name}
						/>
					</div>
				</div>
			);
		}

		if (match) {
			const squad = resume && resume.squadIds && resume.rosters
				? resume.squadIds.map((id) => resume.rosters.A.find((r) => r.id === id)).filter(Boolean)
				: null;
			return (
				<div className="g-console rec-console rec-console--match" data-terminal="field">
					<XalianNavbar />
					<div className="g-shell rec-shell rec-shell--match">
						<header className="rec-masthead">
							<span className="g-kicker">Kozrak's Charter</span>
							<h1 className="rec-masthead-title">Reclamation</h1>
							<ModeSwitch mode={mode} onChange={this.setMode} compact />
							<span className="rec-masthead-rival" data-masthead-rival>against the {rival.name}</span>
							{this.renderSoundToggle()}
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
							sound={this.sound}
						telemetry={this.telemetry}
						/>
					</div>
				</div>
			);
		}

		return (
			<div className="g-console rec-console rec-console--intro" data-terminal="field">
				<XalianNavbar />
				<div className="g-shell rec-shell rec-shell--intro">
					<header className="g-masthead">
						<div className="g-masthead-heading">
							<p className="g-kicker">Field terminal</p>
							<h1 className="g-title">Reclamation</h1>
						</div>
						<div className="g-masthead-aside">
							<span className="g-mono rec-masthead-seed">seed {seed}</span>
							<span className="g-nameplate">Survey program</span>
						</div>
					</header>

					{saved && (
						<div className="g-panel rec-resume rec-rise" data-resume>
							<span className="g-lamp g-lamp--amber" aria-hidden="true" />
							<span className="rec-resume-text">
								A Proving against the {rivalById(saved.rivalId || DEFAULT_RIVAL_ID).name} is still on the frame, round {(saved.match.frameIndex || 0) + 1}, {saved.match.players.A.sitesWon} worlds to {saved.match.players.B.sitesWon}.
							</span>
							<span className="rec-resume-actions">
								<button type="button" className="g-key g-key--primary" onClick={this.resumeMatch} data-resume-match>Resume the Proving</button>
								<button type="button" className="g-key" onClick={this.discardSaved} data-discard-match>Abandon it</button>
							</span>
						</div>
					)}

					<div className="g-panel rec-intro-panel">
						<p className="rec-thesis">Send your creatures into three worlds a round. Hold more of a world than the rival and it is yours. Five worlds take the Charter.</p>

						<section className="rec-module rec-module--round" aria-label="A round">
							<h2 className="rec-module-title">A round</h2>
							<ol className="rec-phases">
								{PHASES.map((phase, i) => (
									<li className="rec-phase" key={phase.kind}>
										<span className="rec-phase-glyph"><PhaseGlyph kind={phase.kind} /></span>
										<span className="rec-phase-text">
											<span className="rec-phase-word"><span className="rec-phase-index g-mono">{i + 1}</span> {phase.word}</span>
											<span className="rec-phase-note">{phase.note}</span>
										</span>
									</li>
								))}
							</ol>
						</section>

						<section className="rec-module rec-module--lanes" aria-label="Every attribute a job">
							<h2 className="rec-module-title">Every attribute a job</h2>
							<p className="rec-module-lead">Nothing on a creature's record is decoration: each attribute does one thing on the table, and the dossier says which.</p>
							<ul className="rec-lane-list rec-intro-lanes">
								{LANES.map((lane) => (
									<li className="rec-lane" key={lane.key} data-intro-lane={lane.key}>
										<span className="rec-lane-word">{lane.word}</span>
										<span className="rec-lane-text">{lane.note}</span>
									</li>
								))}
							</ul>
						</section>

						<section className="rec-module rec-module--hold" aria-label="Hold">
							<h2 className="rec-module-title">Hold</h2>
							<p className="rec-module-lead">How firmly a creature keeps a world, 0 to 20. The Generators built each for one world.</p>
							<ul className="rec-hold-cases">
								<li className="rec-hold-case g-el-water">
									<HoldMeter hold={18} isHome size="large" scale />
									<span className="rec-hold-case-note">on its own world, half again</span>
								</li>
								<li className="rec-hold-case g-el-rock">
									<HoldMeter hold={12} size="large" scale />
									<span className="rec-hold-case-note">on another world</span>
								</li>
								<li className="rec-hold-case g-el-ice">
									<HoldMeter hold={5} unstrained={12} strainLevel="severe" size="large" scale />
									<span className="rec-hold-case-note">where its body strains, the world takes the rest</span>
								</li>
							</ul>
						</section>

						<section className="rec-module rec-module--charter" aria-label="The Charter">
							<h2 className="rec-module-title">The Charter</h2>
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
								<div className="rec-intro-mode" title={mode === 'simple' ? 'Simple: the suggested move is marked and only what would down a creature is printed.' : 'Advanced: every number on the figures, the plan lines under a send, hidden sends, the log and the dossiers.'}>
									<ModeSwitch mode={mode} onChange={this.setMode} />
								</div>
								<button type="button" className="g-key g-key--primary rec-enter" onClick={this.startMatch} data-enter>
									Enter the frame
								</button>
								<span className="rec-intro-against">against the {rival.name}</span>
							</div>
						</section>

						<details className="rec-fiction">
							<summary className="rec-fiction-summary">Why the frame</summary>
							<div className="g-screen rec-rules-screen">
								<div className="g-screen-line">The worlds were lost to war and plague, and no expedition goes in blind. Before Kozrak grants a Charter over a world, the claim is proved on the Court's <strong>frame</strong>: the Generators' own models of the fourteen worlds, run on Poseidas without the Generators. Only the fighting is simulated. The Charter, and the Tokens that come with it, are real.</div>
								<div className="g-screen-line">Each round the frame loads three worlds side by side, every one at a different site of its surface, and no world is loaded twice in a Proving. When both handlers have passed, every world clashes at once: each creature does the one thing its nature does there, attacks subtract from hold, and a creature driven to nothing is downed out of the Proving. Creatures on a won world stay in its model to hold the claim; the rest withdraw; either way they are out of the Proving. A pass is permanent for the round. A stealthy creature may be sent hidden, and its attack lands before all others.</div>
								<div className="g-screen-line">Attacks land in speed order, and a creature already hurt attacks for less, in proportion to the hold it has left, so hitting first shapes the whole exchange. A swift creature already on a world may step to another world of the frame once a round, without spending a turn. At the Ruling, allies standing with a bolster recover half of what the round took from them before the Court reads the worlds. Nothing is given to the side that is behind: there is no catch-up send, and every world is won on what you put on it.</div>
							</div>
						</details>
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
