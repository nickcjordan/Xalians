// Terminal: field. Reclamation is survey work on the salvaged ECHELON unit.
import React from 'react';
import '../../styles/legacy/immersive.css';
import '../../styles/legacy/reclamation.css';
import XalianNavbar from '../../components/navbar';
import ReclamationMatch from '../../components/games/reclamation/reclamationMatch';
import { HoldMeter } from '../../components/games/reclamation/reclamationFigure';
import { PhaseGlyph, RivalGlyph } from '../../components/games/reclamation/reclamationGlyphs';
import { buildDraftPools, botDraft, validateKeep, draftOptionsFromRules } from '@xalians/rules/expedition/draft';
import ReclamationDraft from '../../components/games/reclamation/reclamationDraft';
import { createSound } from '../../components/games/reclamation/reclamationSound';
import { createMatch, DEFAULT_RULES } from '@xalians/rules/expedition/expeditionRules';
import { getWorlds } from '@xalians/rules/expedition/sites';
import { RIVALS, DEFAULT_RIVAL_ID, rivalById } from '@xalians/rules/expedition/expeditionBot';
import { ROSTER_SIZE, SENDABLE, SITES_TO_CLINCH, WORLDS_PER_MATCH, FRAMES_PER_MATCH, WORLDS_PER_FRAME } from '@xalians/rules/expedition/expeditionInterpretation';
import {
	saveMatch, loadMatch, clearMatch, recordResult, recordAgainst, loadRivalId, saveRivalId,
} from '../../components/games/reclamation/reclamationStorage';
import { createTelemetry } from '../../components/games/reclamation/reclamationTelemetry';

const MODE_KEY = 'reclamation.mode';

/*
	The table's mode: simple by default, remembered per browser, and overridable by `?view=`
	in the address.

	PASS 18 found that the URL parameter did not exist. The headless whole-Proving check has
	been opening `?view=simple` and `?view=advanced` since pass 5 and getting SIMPLE MODE BOTH
	TIMES, so half of every pass's verification was a duplicate and the advanced table's own
	panels (the log among them) had never been exercised by it. The parameter is read here so
	the check tests what it says it tests, and so a link can name its mode.
*/
function readMode() {
	try {
		const fromUrl = new URLSearchParams(window.location.search).get('view');
		if (fromUrl === 'advanced' || fromUrl === 'simple') {
			return fromUrl;
		}
	} catch (e) {
		// a malformed query string is not a reason to fail to open the table
	}
	try {
		const stored = window.localStorage.getItem(MODE_KEY);
		return stored === 'advanced' ? 'advanced' : 'simple';
	} catch (e) {
		return 'simple';
	}
}

/*
	PASS 21. Hot-seat: two people sharing one screen, reached with `?hotseat=1`.

	It is a URL flag rather than a button on the intro for now because the draft still assumes
	one human keeper (the second handler currently plays the squad the draft built for the
	first). That is the next piece of the feature, and a flag lets the hand-off be played and
	checked before the draft is rebuilt around two people, rather than holding the whole thing
	back behind its last quarter.
*/
function readHotSeat() {
	try {
		const flag = new URLSearchParams(window.location.search).get('hotseat');
		return flag === '1' || flag === 'true';
	} catch (e) {
		return false;
	}
}

/*
	PASS 35. The draft is SKIPPED by default: a Proving deals both squads and starts.

	Nick, 2026-09-22, after playing the draft screen cold: "I don't know what I'm looking at
	here. It's not intuitive... I'm deducing that I'm supposed to select 12 of these boxes. I
	don't know why I'm doing that or what the purpose of me making the selection is."

	The deeper reason it goes rather than gets explained: the draft is squad building against
	a SAMPLE pool, and it stands in for a feature that does not exist yet, picking a squad
	from the creatures you actually own. Nick's ruling is to leave that until the game's
	mechanics are production-ready rather than polish a placeholder: "right now we're not
	messing with integrating the owned creatures into the games, we're just providing a
	sample to use... let's not put too much weight into the user experience of squad
	selection until the rest of the game mechanics are production-ready."

	It is a flag rather than a deletion because the draft is a real rules lever (assumption
	23, the pool size and shape) with its own engine coverage, and the squad-building screen
	that replaces it will want the same machinery. `?draft=1` still reaches it, the same way
	`?hotseat=1` reaches the hand-off.
*/
function readDraftFlag() {
	try {
		const flag = new URLSearchParams(window.location.search).get('draft');
		return flag === '1' || flag === 'true';
	} catch (e) {
		return false;
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
	{ kind: 'deploy', word: 'Deploy', note: 'send a creature, move a swift one, stake a world, or pass' },
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
	{ key: 'charisma', word: 'Charisma', note: 'for shields and bolsters: how much a bolster gives back and a shield stops' },
	{ key: 'instinct', word: 'Instinct', note: 'keen: picks what it can down, and fights on at full power when hurt' },
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
			// the draft: fifteen dealt, twelve kept, before the frame is entered (Pass 3,
			// assumption 23; the pool size is a rules lever, read through draftOptionsFromRules)
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

	// the draft comes first: fifteen creatures dealt to each side under the seed, the
	// nine worlds of the Proving shown, and the handler keeps twelve; the rival keeps its
	// own twelve by its habit. The pool's size and shape are rules levers (assumption 23),
	// so they are read off the same rules object the match will be created under rather
	// than written here.
	begin = (seed) => {
		const { poolA, poolB, frames } = buildDraftPools(seed, draftOptionsFromRules(DEFAULT_RULES));
		clearMatch();
		this.draftUsedAuto = false;
		/*
			PASS 35. Skipped by default: both squads are drafted by the proctor's habit and the
			Proving begins. The same call the "Pick for me" button already made, so the squad a
			player gets is the one the draft would have recommended, not a random twelve.
		*/
		if (!readDraftFlag()) {
			this.beginWithDealtSquads(seed, poolA, poolB, frames);
			return;
		}
		/*
			PASS 23. `side` is which handler is keeping right now, and `keptA` holds the first
			handler's twelve while the second makes their own. In solo play the draft never
			leaves side A: the rival keeps by its habit, as it always has. In hot-seat the
			second person drafts their own squad, with a cover between the two so neither sees
			the other's pool.
		*/
		this.setState({
			seed,
			draft: { poolA, poolB, frames, keepIds: [], side: 'A', keptA: null, covered: false },
			resume: null, saved: null, match: null,
		});
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

	// the pool the handler currently keeping is choosing from
	draftPool = (draft) => (draft.side === 'B' ? draft.poolB : draft.poolA);

	// hot-seat: the first handler is done, cover the screen before the second one looks
	handOverDraft = () => {
		this.setState((prev) => ({
			draft: { ...prev.draft, keptA: prev.draft.keepIds.slice(), covered: true },
		}));
	};

	// the second handler has the keyboard: open their own pool with an empty keep
	takeDraftHandoff = () => {
		this.setState((prev) => ({
			draft: { ...prev.draft, side: 'B', keepIds: [], covered: false },
		}));
	};

	/*
		Deal both squads and start, with no draft screen in between. Shares createMatch and the
		telemetry shape with confirmDraft; `draft: 'skipped'` distinguishes these Provings from
		the ones a person drafted by hand or with "Pick for me".
	*/
	beginWithDealtSquads = (seed, poolA, poolB, frames) => {
		const { rivalId, mode } = this.state;
		const rival = rivalById(rivalId);
		const rosterA = botDraft(poolA, frames, rival).map((id) => poolA.find((r) => r.id === id));
		const rosterB = botDraft(poolB, frames, rival).map((id) => poolB.find((r) => r.id === id));
		const match = createMatch({ rosterA, rosterB, worlds: getWorlds(), seed });
		this.telemetry.beginMatch({ seed, rivalId, mode, draft: 'skipped', resumed: false });
		this.setState((prev) => ({ seed, match, draft: null, resume: null, saved: null, matchKey: prev.matchKey + 1 }));
	};

	confirmDraft = () => {
		const { draft, seed, rivalId, mode } = this.state;
		if (!draft || !validateKeep(this.draftPool(draft), draft.keepIds)) {
			return;
		}
		/*
			PASS 23. In hot-seat the first handler's confirm hands the keyboard over rather than
			starting the Proving: the second person drafts their own twelve from their own pool.
			The cover between them matters for the same reason it does in Deploy - a squad seen
			in advance is information the game does not mean either handler to have.
		*/
		if (readHotSeat() && draft.side === 'A') {
			this.handOverDraft();
			return;
		}
		const rival = rivalById(rivalId);
		const keptAIds = draft.side === 'B' ? draft.keptA : draft.keepIds;
		const rosterA = keptAIds.map((id) => draft.poolA.find((r) => r.id === id));
		const keepB = draft.side === 'B' ? draft.keepIds : botDraft(draft.poolB, draft.frames, rival);
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

	/*
		PASS 14. The Charter may now offer the next rival up the ladder by name, so a new
		Proving can carry a rival with it. Called with nothing it is the old behaviour, a
		fresh seed against whoever the handler last chose.
	*/
	newProving = (rivalId) => {
		if (rivalId && rivalId !== this.state.rivalId) {
			this.setRival(rivalId);
		}
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

	// pass 38: Leave keeps the Proving (it is saved on every step) and returns to the intro, which offers to resume it
	leaveMatch = () => {
		const saved = loadMatch();
		this.setState({ match: null, resume: null, saved: saved && saved.match && saved.match.phase !== 'matchEnd' ? saved : null });
	};

	abandonMatch = () => {
		clearMatch();
		this.setState({ match: null, resume: null, saved: null });
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
						{/*
							PASS 23. Between the two drafts the pool is covered, for the same reason
							the board is covered between turns: a squad seen in advance is
							information the game does not mean either handler to have. Like the
							Deploy cover, this REPLACES the pool rather than sitting over it.
						*/}
						{draft.covered ? (
							<div className="g-panel rec-handoff-panel rec-draft-handoff" data-draft-handoff>
								<div className="g-readout-unit">Hand the table over</div>
								<h2 className="rec-handoff-who">Pass the keyboard to the second handler.</h2>
								<p className="g-body rec-handoff-note">
									The first handler has kept their twelve. The pool is covered so neither
									squad is known to the other before the first world loads.
								</p>
								<button
									type="button"
									className="g-btn g-btn--primary rec-handoff-take"
									onClick={this.takeDraftHandoff}
									data-take-draft-handoff
									autoFocus
								>
									I am the second handler
								</button>
							</div>
						) : (
							<ReclamationDraft
								pool={this.draftPool(draft)}
								frames={draft.frames}
								keepIds={draft.keepIds}
								onToggle={this.toggleKeep}
								onKeepAll={this.keepAll}
								onConfirm={this.confirmDraft}
								rivalName={rival.name}
							/>
						)}
					</div>
				</div>
			);
		}

		if (match) {
			const squad = resume && resume.squadIds && resume.rosters
				? resume.squadIds.map((id) => resume.rosters.A.find((r) => r.id === id)).filter(Boolean)
				: null;
			return (
				/*
					PASS 38. Play is immersive: the site navigation and the masthead give way to the
					game, which carries its own visible way out (Leave, in the top bar). The mode
					switch and the sound move into the table's settings panel; the rival's name
					moves onto its score.
				*/
				<div className="g-console rec-console rec-console--match" data-terminal="field">
					<div className="g-shell rec-shell rec-shell--match">
						<h1 className="sr-only">Reclamation, against the {rival.name}</h1>
						<ReclamationMatch
							onLeave={this.leaveMatch}
							onAbandon={this.abandonMatch}
							rivalName={readHotSeat() ? null : rival.name}
							settings={(
								<>
									<ModeSwitch mode={mode} onChange={this.setMode} />
									{this.renderSoundToggle()}
								</>
							)}
							key={matchKey}
							initialMatch={match}
							initialLog={resume ? resume.log : null}
							botRngState={resume ? resume.botRngState : null}
							squad={squad}
							rosters={resume ? resume.rosters : null}
							rivalId={rivalId}
							seed={seed}
							mode={mode}
							hotSeat={readHotSeat()}
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
						</div>
					</header>

					{saved && (
						<div className="g-panel rec-resume rec-rise" data-resume>
							<span className="g-lamp g-lamp--amber" aria-hidden="true" />
							<span className="rec-resume-text">
								A game against the {rivalById(saved.rivalId || DEFAULT_RIVAL_ID).name} is unfinished: round {(saved.match.frameIndex || 0) + 1}, {saved.match.players.A.sitesWon} worlds to {saved.match.players.B.sitesWon}.
							</span>
							<span className="rec-resume-actions">
								<button type="button" className="g-key g-key--primary" onClick={this.resumeMatch} data-resume-match>Resume the game</button>
								<button type="button" className="g-key" onClick={this.discardSaved} data-discard-match>Abandon it</button>
							</span>
						</div>
					)}

					<div className="g-panel rec-intro-panel">
						<p className="rec-thesis">Send your creatures into three worlds a round. Hold more of a world than the rival and it is yours. The first to five worlds wins.</p>

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
							<p className="rec-module-lead">Each attribute does one thing on the table, and the dossier says which. Speed and hold decide the most; the rest matter where they apply.</p>
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

						<section className="rec-module rec-module--charter" aria-label="The game">
							<h2 className="rec-module-title">The game</h2>
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
									<span className="rec-charter-label">to win</span>
								</div>
								{/*
									PASS 27. This read "12/11 BRING / SEND", which a blind critic named
									as "genuinely incomprehensible as a label" - and it is: two numbers
									divided by a slash, where the slash means neither a ratio nor a
									fraction but two different quantities. It says the same thing in
									words a first-time reader can act on.
								*/}
								{/* pass 47: "sends, from 12 kept" ran into its neighbour on a phone, and "kept" meant nothing yet */}
								<div className="rec-charter-figure" title={`${SENDABLE} sends for the whole game, from a squad of ${ROSTER_SIZE}`}>
									<span className="rec-charter-number g-mono">{SENDABLE}</span>
									<span className="rec-charter-label">sends</span>
								</div>
							</div>
							<div className="rec-intro-actions">
								<div className="rec-intro-mode" title={mode === 'simple' ? 'Simple: the essentials on the table; every number is in the reading behind each creature.' : 'Advanced: every number on the figures, the temperature bands, speed, and the log.'}>
									<ModeSwitch mode={mode} onChange={this.setMode} />
								</div>
								<button type="button" className="g-key g-key--primary rec-enter" onClick={this.startMatch} data-enter>
									Start the game
								</button>
								<span className="rec-intro-against">against the {rival.name}</span>
							</div>
						</section>

						<details className="rec-fiction">
							<summary className="rec-fiction-summary">The story behind it</summary>
							<div className="g-screen rec-rules-screen">
								<div className="g-screen-line">The worlds were lost to war and plague, and no expedition goes in blind. Before Kozrak grants a Charter over a world, the claim is proved on the Court's <strong>frame</strong>: the Generators' own models of the fourteen worlds, run on Poseidas without the Generators. Only the fighting is simulated. The Charter, and the Tokens that come with it, are real.</div>
								<div className="g-screen-line">Each round the frame loads three worlds side by side, every one at a different site of its surface, and no world is loaded twice in a Proving. When both handlers have passed, every world clashes at once: each creature does the one thing its nature does there, attacks subtract from hold, and a creature driven to nothing is downed out of the Proving. Creatures on a won world stay in its model to hold the claim; the rest withdraw; either way they are out of the Proving. A pass is permanent for the round. A stealthy creature arrives hidden: the rival learns that you sent something, not what or where, until the worlds clash.</div>
								<div className="g-screen-line">Attacks land in speed order, and a creature already hurt attacks for less, in proportion to the hold it has left, so hitting first shapes the whole exchange. A swift creature already on a world may step to another world of the frame once a round, without spending a turn. At the Ruling, allies standing with a bolster recover half of what the round took from them before the Court reads the worlds. Once a Proving, before your first send of a round, either handler may stake one of the round's worlds: it then counts two toward the Charter for whoever holds it at the Ruling, three if both handlers staked it, and nothing at all if it is tied. Nothing is given to the side that is behind: there is no catch-up send, the stake is a risk you choose and it doubles the loss as readily as the gain, and every world is won on what you put on it.</div>
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
