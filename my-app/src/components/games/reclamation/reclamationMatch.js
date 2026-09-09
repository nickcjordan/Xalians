import React from 'react';
import ReclamationWorld from './reclamationWorld';
import ReclamationBench from './reclamationBench';
import ReclamationInspect from './reclamationInspect';
import ReclamationLog from './reclamationLog';
import { ReclamationReport, buildMatchReport } from './reclamationReport';
import {
	send, pass, relocateVanguard, getPublicState,
	createRngState, nextRandom,
} from '../../../gameplay/expedition/expeditionRules';
import { chooseSend, rivalById, DEFAULT_RIVAL_ID } from '../../../gameplay/expedition/expeditionBot';
import { prepare, strainMultiplierFor } from '../../../gameplay/expedition/creatureOnTable';
import { SENDABLE, SITES_TO_CLINCH, FRAMES_PER_MATCH } from '../../../gameplay/expedition/expeditionInterpretation';
import {
	speciesLabel, formatHold, classifyEvent, narrateEvent, cueForEvent, narrateRelocate,
	narrateSend, narratePass, narrateJudge, narrateMatchEnd,
} from './reclamationNarration';
import { flattenBoard, prepareWithCompanions, siteHoldTotal, threatsFor, threatSentence, ghostPlanFor } from './reclamationPreview';
import { recommendSend } from './reclamationAdvice';

function capitalize(sentence) {
	return sentence ? sentence.charAt(0).toUpperCase() + sentence.slice(1) : sentence;
}

/*
	Motion (Nick, 2026-09-03): a change on the table that just appears reads as nothing
	having happened, so every engine step is told twice. The figures that arrived wear an
	arrival animation and their site pulses (`arrival`, cleared after ARRIVE_MS), and a
	callout over the sites says what happened in a sentence (`beat`, one at a time from a
	queue, each shown for BEAT_MS). While a rival beat is showing, the turn lamp keeps
	the rival's colour and the turn text says what it did, so "Your move" arrives as its
	own change after the rival's, not at the same instant. The bot's delay is longer than
	the human's beat so the table settles before the rival is seen deciding.
*/
const BOT_DELAY_MS = 1900;
const BEAT_MS = 1400;
const ARRIVE_MS = 1300;
const RESOLUTION_STEP_MS = 700;
const LOG_CAP = 120;
// "Zolton, Krystos and Saiphus": the frame's worlds as a sentence fragment
function frameWorldNames(frame) {
	const names = frame.sites.map((site) => site.world.planet);
	return names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names.join('');
}

const YOU = 'A';
const THEM = 'B';

/*
	ReclamationMatch — the whole table.

	The engine is a pure state-in / state-out machine, so this component only holds the
	match state, turns clicks into engine calls, drives the bot on a timer, and plays the
	resolution log back one event at a time.

	THE BASE (docs/design/reclamation-base-redesign.md). The round is Deploy, Resolve,
	Judge, and only Deploy is a phase anyone sits in: Resolve and Judge run inside the
	engine's pass() the moment the second handler passes. So there is no Orders panel and
	no Go button; the driver watches every pass (yours and the rival's) and, when the
	state that comes back has moved to the next frame or ended the match, freezes the
	board as it stood and plays the round's events back over it, world by world.

	Interface rule, from the design doc: the table must always show whose turn it is,
	what a click will do, and what just happened, without scrolling; every number is the
	live value the rules will use; every invalid action says why.

	Two views of the same match (Nick, 2026-09-03; narrowed by the base redesign's
	"Interface consequences" to how much arithmetic is printed). `props.mode` is 'simple'
	or 'advanced'. The decisions are identical in both: simple mode marks one recommended
	send with its reason, shows the bar moving and the sentence, and keeps the rail (log,
	dossier) closed unless a dossier is open; advanced mode additionally prints the
	numbers on the figures and the plan lines under a previewed send.
*/
class ReclamationMatch extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			match: props.initialMatch,
			log: props.initialLog ? props.initialLog.slice() : [],
			notice: null,
			armedRecordId: null,
			sendHidden: false,
			relocating: false,
			inspect: null, // { record, site }
			// resolution playback
			playback: null, // { events, index, snapshotBoard, staggeredAt }
			pendingAfterPlayback: null,
			verdicts: null,
			judgedFrame: null,
			judgedSnapshot: null,
			judged: false,
			beat: null, // { id, seat, kind, text, short } the callout being shown
			arrival: null, // { id, ids, siteId, seat } figures that just landed
			hoverRecordId: null, // the roster slot under the pointer: previewed on every site
			hoverSiteId: null, // the site row under the pointer in the deploy panel
			coached: readCoached(), // the first Proving's three steps, shown once
		};
		// your twelve in slot order, held for the whole expedition so the roster never reshuffles
		this.squad = props.squad ? props.squad.slice() : props.initialMatch.players[YOU].roster.slice();
		// the rival handler: a named weight set over the bot (expeditionBot.RIVALS); the
		// proctor is the bot as it always was
		this.rival = rivalById(props.rivalId || DEFAULT_RIVAL_ID);
		// every creature of both squads by id, kept from the start so the report can name
		// creatures long after they have left the rosters
		this.recordsById = {};
		const fullRosters = props.rosters || { A: props.initialMatch.players.A.roster, B: props.initialMatch.players.B.roster };
		['A', 'B'].forEach((seat) => (fullRosters[seat] || []).forEach((r) => { this.recordsById[r.id] = r; }));
		this.fullRosters = fullRosters;
		this.botRngState = typeof props.botRngState === 'number' ? props.botRngState : createRngState(`${props.seed}-bot`);
		this.botTimer = null;
		this.noticeTimer = null;
		this.playbackTimer = null;
		this.beatTimer = null;
		this.arrivalTimer = null;
		this.beatQueue = [];
		this.beatSeq = 0;
		this.lastLoggedEventCount = 0;
		this.roundEverResolved = false;
		this.matchEndTold = false;
	}

	componentDidMount() {
		document.addEventListener('keydown', this.handleKeyDown);
		this.exposeDebug();
		this.scheduleBotIfDue();
		this.trackDecisionWindows(null, this.state);
	}

	componentDidUpdate(prevProps, prevState) {
		// the debug surface must track whatever the table is actually drawing, which during
		// resolution and the Judge is a held snapshot rather than the live match, so it is
		// refreshed on every update rather than only when `match` changes.
		this.exposeDebug();
		if (prevState.match !== this.state.match && !this.state.playback && !this.state.judged) {
			this.scheduleBotIfDue();
		}
		this.trackDecisionWindows(prevState, this.state);
		this.trackHovers(prevState, this.state);
		this.trackMatchEnd(prevState, this.state);
	}

	// ------------------------------------------------------------------
	// telemetry (docs/design/game-validation-principles.md section 3): decision timing,
	// preview usage, skip depth, coach dismissal, sound, and match outcome. Every call is
	// guarded on this.props.telemetry so the table behaves identically with none wired.
	// ------------------------------------------------------------------
	trackDecisionWindows = (prevState, state) => {
		if (!this.props.telemetry) {
			return;
		}
		const wasYourDeployTurn = !!prevState && prevState.match.phase === 'deploy' && prevState.match.turn === YOU && !prevState.playback;
		const isYourDeployTurn = state.match.phase === 'deploy' && state.match.turn === YOU && !state.playback;
		if (isYourDeployTurn && !wasYourDeployTurn) {
			this.props.telemetry.decisionStart('deploy', { round: state.match.frameIndex });
		}
	};

	trackHovers = (prevState, state) => {
		if (!this.props.telemetry) {
			return;
		}
		if (state.hoverSiteId != null && (!prevState || prevState.hoverSiteId == null)) {
			this.props.telemetry.hover('site');
		}
		if (state.hoverRecordId != null && (!prevState || prevState.hoverRecordId == null)) {
			this.props.telemetry.hover('record');
		}
		if (state.inspect != null && (!prevState || prevState.inspect == null)) {
			this.props.telemetry.hover('inspect');
		}
	};

	trackMatchEnd = (prevState, state) => {
		if (!this.props.telemetry || this.matchEndTold) {
			return;
		}
		// once the report is on the table, not when the engine's phase flips: the last
		// round's playback (and its skip) is still running at that moment
		if (state.match.phase !== 'matchEnd' || state.playback) {
			return;
		}
		this.matchEndTold = true;
		const you = state.match.players[YOU];
		const them = state.match.players[THEM];
		this.props.telemetry.endMatch({
			won: state.match.winner === YOU,
			sitesYou: you.sitesWon,
			sitesRival: them.sitesWon,
			reason: state.match.matchEndReason,
		});
	};

	componentWillUnmount() {
		document.removeEventListener('keydown', this.handleKeyDown);
		[this.botTimer, this.noticeTimer, this.playbackTimer, this.beatTimer, this.arrivalTimer].forEach((t) => t && clearTimeout(t));
		if (typeof window !== 'undefined') {
			delete window.__reclamationDebug;
		}
	}

	// ------------------------------------------------------------------
	// dev-only debug surface — the verification harness reads the engine's own numbers
	// off this and compares them to what the DOM prints. Not used by the UI itself.
	// ------------------------------------------------------------------
	exposeDebug = () => {
		if (typeof window === 'undefined') {
			return;
		}
		const view = this.view();
		const holds = {};
		view.frame.sites.forEach((site) => {
			['A', 'B'].forEach((seat) => {
				(view.board[site.id][seat] || []).forEach((e) => {
					if (!e.record) {
						return;
					}
					const prepared = prepareWithCompanions(view, e.record, site, e.sentIndex, seat, e.recordId);
					const full = typeof e.fullHold === 'number' ? e.fullHold : prepared.hold;
					const live = typeof e.currentHold === 'number' ? e.currentHold : prepared.hold;
					holds[e.recordId] = {
						recordId: e.recordId,
						species: e.record.species,
						siteId: site.id,
						seat,
						role: e.role || prepared.role,
						printed: full,
						hold: live,
						staggered: !!e.staggered,
					};
				});
			});
		});
		const siteTotals = {};
		view.frame.sites.forEach((site) => {
			siteTotals[site.id] = { A: siteHoldTotal(view, site.id, 'A'), B: siteHoldTotal(view, site.id, 'B') };
		});
		window.__reclamationDebug = {
			phase: view.phase,
			turn: view.turn,
			frameIndex: view.frameIndex,
			worlds: view.frame.sites.map((site) => site.world.planet),
			you: YOU,
			holds,
			siteTotals,
			sitesWon: { A: view.players.A.sitesWon, B: view.players.B.sitesWon },
			winner: view.winner,
			playing: !!this.state.playback,
			rosterIds: (view.players[YOU].roster || []).map((r) => r.id),
			format: formatHold,
			telemetry: () => this.props.telemetry && this.props.telemetry.snapshot(),
		};
	};

	/*
		The engine's pass() runs resolve() AND judge() in one call, so the moment the second
		handler passes the live state has already moved to the next world. Replaying the
		round against that state would draw the wrong board, so while playback runs the
		table renders a FROZEN copy of the view as it stood the instant before resolution,
		with stagger and rout applied by the events replayed so far. Once playback ends the
		live view takes over again.
	*/
	view() {
		const { playback, judgedSnapshot } = this.state;
		if (playback && playback.frozenView) {
			return this.applyPlaybackEffects(playback);
		}
		// judge() has already advanced the engine to the next world, but the player is still
		// looking at the verdict on the world just played, so the judged board is held until
		// they ask for the next world.
		if (judgedSnapshot) {
			return judgedSnapshot;
		}
		return getPublicState(this.state.match, YOU);
	}

	/*
		The pre-resolution view with every effect of the events told so far applied: each
		creature at the hold the last blow left it with (the event's own `remaining`),
		routed ones off the world, hit ones flagged staggered, and a rival's hidden send
		revealed the moment it acts (assumption 9: a hidden blow lands first).

		The balance bar and the bulbs both read off this, so the world moves by each
		number as it is told, which is the whole of "Resolve told per world".
	*/
	applyPlaybackEffects(playback) {
		const base = playback.frozenView;
		const staggered = {};
		const routed = new Set();
		const holdNow = {};
		const damageNow = {};
		const revealed = new Set();
		for (let i = 0; i < playback.index; i++) {
			const event = playback.events[i];
			if (event.type === 'blow' || event.type === 'area' || event.type === 'shield') {
				revealed.add(event.recordId);
			}
			if (event.type !== 'blow' || !event.target) {
				continue;
			}
			if (event.outcome === 'routed') {
				routed.add(event.target);
				holdNow[event.target] = 0;
			} else if (event.outcome === 'staggered') {
				staggered[event.target] = true;
				holdNow[event.target] = event.remaining;
				damageNow[event.target] = (damageNow[event.target] || 0) + event.amount;
			}
		}
		const board = {};
		base.frame.sites.forEach((site) => {
			board[site.id] = { A: [], B: [] };
		});
		base.frame.sites.forEach((site) => {
			['A', 'B'].forEach((seat) => {
				(base.board[site.id][seat] || []).forEach((entry) => {
					if (routed.has(entry.recordId)) {
						return;
					}
					if (entry.revealPending && !revealed.has(entry.recordId)) {
						return;
					}
					const hold = holdNow[entry.recordId];
					board[site.id][seat].push(typeof hold === 'number'
						? {
							...entry,
							currentHold: hold,
							damage: damageNow[entry.recordId] || entry.damage || 0,
							staggered: true,
						}
						: entry);
				});
			});
		});
		return { ...base, board, staggered };
	}

	appendLog = (line) => {
		if (!line) {
			return;
		}
		this.setState((prev) => ({ log: [...prev.log, line].slice(-LOG_CAP) }));
	};

	appendLogLines = (lines) => {
		this.setState((prev) => ({ log: [...prev.log, ...lines].slice(-LOG_CAP) }));
	};

	// ------------------------------------------------------------------
	// motion: beats (the callout) and arrivals (figures landing)
	// ------------------------------------------------------------------
	beat = (spec) => {
		this.beatQueue.push(spec);
		this.pumpBeats();
	};

	pumpBeats = () => {
		if (this.beatTimer || this.beatQueue.length === 0) {
			return;
		}
		const spec = this.beatQueue.shift();
		this.beatSeq += 1;
		this.setState({ beat: { ...spec, id: this.beatSeq } });
		const ms = (typeof window !== 'undefined' && window.__reclamationBeatMs) || BEAT_MS;
		this.beatTimer = setTimeout(() => {
			this.beatTimer = null;
			this.setState({ beat: null }, this.pumpBeats);
		}, ms);
	};

	// a phase change cuts whatever beat is showing so its callout does not outlive the phase
	cutBeats = () => {
		this.beatQueue = [];
		if (this.beatTimer) {
			clearTimeout(this.beatTimer);
			this.beatTimer = null;
		}
		this.setState({ beat: null });
	};

	arrive = (ids, siteId, seat) => {
		if (this.arrivalTimer) {
			clearTimeout(this.arrivalTimer);
		}
		this.setState({ arrival: { id: this.beatSeq + 1, ids, siteId, seat } });
		this.arrivalTimer = setTimeout(() => {
			this.arrivalTimer = null;
			this.setState({ arrival: null });
		}, ARRIVE_MS);
	};

	notice = (text) => {
		this.setState({ notice: text });
		if (this.noticeTimer) {
			clearTimeout(this.noticeTimer);
		}
		this.noticeTimer = setTimeout(() => this.setState({ notice: null }), 3400);
	};

	// a cue on the console, if the player has sound on; never throws
	cue = (name, opts) => {
		if (this.props.sound) {
			this.props.sound.play(name, opts);
		}
	};

	dismissCoach = () => {
		writeCoached();
		if (this.props.telemetry) {
			this.props.telemetry.coachDismissed({ beforeFirstOrders: !this.roundEverResolved });
		}
		this.setState({ coached: true });
	};

	// ------------------------------------------------------------------
	// keyboard
	// ------------------------------------------------------------------
	handleKeyDown = (e) => {
		if (e.key === ' ' && !/^(INPUT|TEXTAREA|BUTTON)$/.test((document.activeElement || {}).tagName || '')) {
			if (this.state.playback || this.botTimer) {
				e.preventDefault();
				this.hurry();
			}
			return;
		}
		if (e.key === 'Escape') {
			if (this.state.armedRecordId || this.state.relocating || this.state.inspect) {
				this.setState({ armedRecordId: null, relocating: false, inspect: null, sendHidden: false });
			}
			return;
		}
	};

	// ------------------------------------------------------------------
	// the bot
	// ------------------------------------------------------------------
	scheduleBotIfDue = () => {
		const { match } = this.state;
		if (match.phase === 'deploy' && match.turn === THEM) {
			if (this.botTimer) {
				clearTimeout(this.botTimer);
			}
			this.botBeatStartedAt = Date.now();
			this.botTimer = setTimeout(this.runBotDeployTurn, BOT_DELAY_MS);
		}
	};

	botRng = () => {
		const { value, nextState } = nextRandom(this.botRngState);
		this.botRngState = nextState;
		return value;
	};

	runBotDeployTurn = () => {
		this.botTimer = null;
		let match = this.state.match;
		if (match.phase !== 'deploy' || match.turn !== THEM) {
			return;
		}
		const rngLike = { float: this.botRng };
		const before = match;
		const lines = [];
		const arrivals = [];
		let fellBack = null;

		let publicState = getPublicState(match, THEM);
		let action = chooseSend(publicState, match.players[THEM].roster, THEM, rngLike, this.rival);

		// relocate does not consume the turn: apply it, then ask again for the send/pass
		if (action.type === 'relocate') {
			const relocated = relocateVanguard(match, THEM, action.siteId);
			if (relocated) {
				const ev = relocated.resolutionLog[relocated.resolutionLog.length - 1];
				const from = this.siteName(match, ev.fromSite);
				const to = this.siteName(match, ev.toSite);
				lines.push(`The rival's vanguard falls back from ${from} to ${to}.`);
				fellBack = { from, to, recordId: ev.recordId, siteId: ev.toSite };
				arrivals.push(ev.recordId);
				match = relocated;
				publicState = getPublicState(match, THEM);
				action = chooseSend(publicState, match.players[THEM].roster, THEM, rngLike, this.rival);
			}
		}

		let next = null;
		let beat = null;
		if (action.type === 'send') {
			const record = match.players[THEM].roster.find((r) => r.id === action.recordId);
			next = send(match, THEM, action.recordId, action.siteId, action.hidden);
			if (next) {
				const sentence = action.hidden
					? 'The rival sends something, hidden.'
					: `The rival sends ${speciesLabel(record)} to ${this.siteName(match, action.siteId)}.`;
				lines.push(sentence);
				if (!action.hidden) {
					arrivals.push(action.recordId);
				}
				beat = {
					kind: action.hidden ? 'rival-hidden' : 'rival-send',
					seat: THEM,
					short: 'The rival sent',
					siteId: action.hidden ? null : action.siteId,
					text: fellBack
						? `The rival's vanguard falls back to ${fellBack.to}, and ${sentence.charAt(0).toLowerCase()}${sentence.slice(1)}`
						: sentence,
				};
			}
		} else {
			next = pass(match, THEM);
			if (next) {
				lines.push('The rival passes for this round.');
				beat = {
					kind: 'rival-pass',
					seat: THEM,
					short: 'The rival passed',
					text: fellBack
						? `The rival's vanguard falls back to ${fellBack.to}, and the rival passes for this round.`
						: 'The rival passes for this round. Nothing you send now can be answered.',
				};
			}
		}

		if (!next) {
			// the engine should never refuse a bot action; say so rather than stall
			// eslint-disable-next-line no-console
			console.error('Reclamation bot produced an illegal action', action);
			next = pass(match, THEM);
			lines.push('The rival hesitates and passes.');
			beat = { kind: 'rival-pass', seat: THEM, short: 'The rival passed', text: 'The rival hesitates and passes.' };
		}

		this.appendLogLines(lines);
		this.cue('rival');
		if (arrivals.length > 0) {
			this.arrive(arrivals, (fellBack && !beat.siteId) ? fellBack.siteId : beat.siteId, THEM);
		}
		this.beat(beat);
		this.commitStep(before, next, {});
	};

	siteName = (match, siteId) => {
		const frame = match.frames[match.frameIndex];
		const site = frame.sites.find((s) => s.id === siteId);
		return site ? site.name : siteId;
	};

	// after every engine step: refresh the debug surface and hand the page what a resume
	// would need. Nothing else is automatic; the round closes on the second pass.
	afterEngineStep = () => {
		this.exposeDebug();
		this.persist();
	};

	// the page keeps the Proving in the browser so a reload resumes it; told after every
	// engine step, with everything the table needs to pick up where it stood
	persist = () => {
		if (!this.props.onEngineStep) {
			return;
		}
		const { match, log } = this.state;
		this.props.onEngineStep({
			match,
			log,
			botRngState: this.botRngState,
			squadIds: this.squad.map((r) => r.id),
			rosters: this.fullRosters,
		});
	};

	// ------------------------------------------------------------------
	// deploy — human
	// ------------------------------------------------------------------
	isYourDeployTurn() {
		const { match } = this.state;
		return match.phase === 'deploy' && match.turn === YOU && !this.state.playback;
	}

	armRecord = (recordId) => {
		if (this.state.playback) {
			this.notice('The round is still resolving.');
			return;
		}
		const { match } = this.state;
		if (match.phase !== 'deploy') {
			this.notice('Deploy is over for this round. There is nothing left to send.');
			return;
		}
		if (match.players[YOU].passed) {
			this.notice('You have passed. Passing is permanent for this round.');
			return;
		}
		if (match.turn !== YOU) {
			this.notice('It is the rival’s turn. Wait for it to move.');
			return;
		}
		if (match.players[YOU].sentCount >= SENDABLE) {
			this.notice(`You have sent all ${SENDABLE} creatures a Proving allows. The rest are your reserve.`);
			return;
		}
		if (this.state.armedRecordId !== recordId) {
			this.cue('lift');
		}
		this.setState((prev) => ({
			armedRecordId: prev.armedRecordId === recordId ? null : recordId,
			sendHidden: false,
			relocating: false,
		}));
	};

	toggleHidden = () => {
		this.setState((prev) => ({ sendHidden: !prev.sendHidden }));
	};

	handleSiteClick = (siteId) => {
		const { match, armedRecordId, relocating, sendHidden } = this.state;
		if (this.state.playback) {
			this.notice('The round is still resolving.');
			return;
		}
		if (relocating) {
			const next = relocateVanguard(match, YOU, siteId);
			if (!next) {
				this.notice('Your vanguard cannot fall back there. It must be a different world, and only once per round.');
				return;
			}
			const ev = next.resolutionLog[next.resolutionLog.length - 1];
			const record = this.findRecordOnBoard(match, ev.recordId);
			const line = narrateRelocate(ev, {
				actorName: record ? speciesLabel(record) : 'Your vanguard',
				fromSiteName: this.siteName(match, ev.fromSite),
				toSiteName: this.siteName(match, ev.toSite),
			});
			this.appendLog(line);
			this.arrive([ev.recordId], ev.toSite, YOU);
			this.beat({ kind: 'your-relocate', seat: YOU, short: 'Fell back', text: line });
			if (this.props.telemetry) {
				// relocate does not spend the deploy turn (see the class doc comment), so the
				// decision window is closed as 'relocate' and immediately reopened: the player
				// is still mid-turn and will send or pass next.
				this.props.telemetry.decisionEnd('deploy', 'relocate', { round: match.frameIndex });
				this.props.telemetry.decisionStart('deploy', { round: match.frameIndex });
			}
			this.setState({ match: next, relocating: false }, this.afterEngineStep);
			return;
		}
		if (!armedRecordId) {
			this.notice('Arm a creature from your roster first, then click a site to send it.');
			return;
		}
		if (match.phase !== 'deploy') {
			this.notice('Deploy is over for this round.');
			return;
		}
		if (match.turn !== YOU) {
			this.notice('It is the rival’s turn.');
			return;
		}
		const record = match.players[YOU].roster.find((r) => r.id === armedRecordId);
		const next = send(match, YOU, armedRecordId, siteId, sendHidden);
		if (!next) {
			if (sendHidden) {
				this.notice(`${speciesLabel(record)} is not stealthy and cannot be sent hidden.`);
			} else {
				this.notice('That send is not allowed right now.');
			}
			return;
		}
		this.tellSend(match, next, record, siteId, sendHidden);
		this.cue('send');
		if (this.props.telemetry) {
			this.props.telemetry.decisionEnd('deploy', 'send', { round: match.frameIndex });
		}
		this.setState({ match: next, armedRecordId: null, sendHidden: false, hoverSiteId: null, hoverRecordId: null }, this.afterEngineStep);
	};

	// your own send, told the same way as the rival's: log line, arrival, callout
	tellSend = (match, next, record, siteId, hidden) => {
		const line = narrateSend({
			you: true,
			actorName: speciesLabel(record),
			siteName: this.siteName(match, siteId),
			hidden,
		});
		this.appendLog(line);
		this.arrive([record.id], siteId, YOU);
		this.beat({ kind: 'your-send', seat: YOU, short: 'Sent', siteId, text: line });
	};

	findRecordOnBoard = (match, recordId) => {
		const frame = match.frames[match.frameIndex];
		for (const site of frame.sites) {
			for (const seat of ['A', 'B']) {
				const found = match.board[site.id][seat].find((e) => e.recordId === recordId);
				if (found) {
					return found.record;
				}
			}
		}
		return null;
	};

	handlePass = () => {
		const { match } = this.state;
		if (!this.isYourDeployTurn()) {
			this.notice(match.players[YOU].passed
				? 'You have already passed. Passing is permanent for this round.'
				: 'It is not your turn to pass.');
			return;
		}
		const next = pass(match, YOU);
		if (!next) {
			this.notice('You cannot pass right now.');
			return;
		}
		const line = narratePass({ you: true });
		this.cue('pass');
		this.appendLog(line);
		this.beat({ kind: 'your-pass', seat: YOU, short: 'Passed', text: line });
		if (this.props.telemetry) {
			this.props.telemetry.decisionEnd('deploy', 'pass', { round: match.frameIndex });
		}
		this.commitStep(match, next, { armedRecordId: null, relocating: false });
	};

	beginRelocate = () => {
		const view = this.view();
		if (!view.players[YOU].canRelocateVanguard) {
			this.notice('Only this round’s starter may fall back, once, before passing.');
			return;
		}
		if (!view.players[YOU].vanguardRecordId) {
			this.notice('You have sent nothing yet, so there is no vanguard to fall back.');
			return;
		}
		this.setState({ relocating: true, armedRecordId: null });
		this.notice('Click another site to fall the vanguard back. This does not spend your turn.');
	};

	// ------------------------------------------------------------------
	// simple mode: the recommended move
	// ------------------------------------------------------------------
	isSimple() {
		return this.props.mode !== 'advanced';
	}

	recommendation(view) {
		if (view.phase !== 'deploy' || this.state.playback || this.state.judged) {
			return null;
		}
		return recommendSend(view, view.players[YOU].roster, YOU);
	}

	// ------------------------------------------------------------------
	// the round closes: Resolve and Judge run inside the engine's pass()
	// ------------------------------------------------------------------

	/*
		commitStep(before, next, extra) - every engine step the driver takes goes through
		here. A send never closes a round; a pass may, and when it does the state that
		comes back has already resolved and judged (the engine's pass() runs both in one
		call), so `before` is the last state that still shows the round as it was played,
		and is what the playback is drawn over.
	*/
	commitStep = (before, next, extra) => {
		const resolved = next.frameIndex !== before.frameIndex || next.phase === 'matchEnd';
		if (!resolved) {
			this.setState({ match: next, ...(extra || {}) }, this.afterEngineStep);
			return;
		}
		this.beginResolution(before, next, extra);
	};

	/*
		beginResolution - freeze the board as it stood with both handlers passed and
		nothing resolved, then play the round's new events over it.

		The engine resolves one world at a time already, but the frame's own order is what
		the table tells them in, so the events are re-grouped by site in frame order and the
		Court's ruling is kept for last.
	*/
	beginResolution = (before, next, extra) => {
		const frameBefore = before.frames[before.frameIndex];
		const boardBefore = this.snapshotBoard(before);
		const events = this.sequenceEvents(next.resolutionLog.slice(before.resolutionLog.length), frameBefore);
		// the whole public view with both sides in and nothing resolved: the board the
		// playback draws (see view()). The engine reveals every hidden creature at the
		// start of resolution, so our own hidden sends are already visible here.
		const frozenView = getPublicState(before, YOU);
		// the rival's hidden sends are filtered out of the public view, but resolution
		// reveals them, so the frozen board carries them marked to be revealed by playback;
		// without this a world could go to the rival while its tray said no one stood there
		frameBefore.sites.forEach((site) => {
			before.board[site.id][THEM].forEach((e) => {
				if (e.hidden && !frozenView.board[site.id][THEM].some((v) => v.recordId === e.recordId)) {
					frozenView.board[site.id][THEM].push({
						recordId: e.recordId,
						record: e.record,
						sentIndex: e.sentIndex,
						hidden: false,
						revealPending: true,
						currentHold: e.currentHold,
						fullHold: e.fullHold,
						role: e.role,
						damage: e.damage || 0,
					});
				}
			});
		});
		const sitesWonBefore = { A: before.players.A.sitesWon, B: before.players.B.sitesWon };

		this.cue('seal');
		this.roundEverResolved = true;
		if (!this.state.coached) {
			writeCoached();
			// the coach strip is dismissed automatically the moment the first round
			// resolves, if the player never dismissed it by hand; that is not "before" its
			// own lesson, so beforeFirstOrders is false here
			if (this.props.telemetry) {
				this.props.telemetry.coachDismissed({ beforeFirstOrders: false });
			}
		}
		this.appendLog('Both handlers have passed. The worlds resolve.');
		this.cutBeats();
		this.beat({ kind: 'resolve', seat: null, short: 'Resolving', text: 'Both handlers have passed. Each world resolves in turn, hidden blows first.' });
		this.playbackStartedAt = Date.now();
		this.setState({
			match: next,
			...(extra || {}),
			playback: {
				events,
				index: 0,
				frame: frameBefore,
				boardBefore,
				frozenView,
				sitesWonBefore,
			},
			verdicts: null,
			judged: false,
			armedRecordId: null,
			relocating: false,
		}, this.stepPlayback);
	};

	// the round told per world: every event of the first world, then the second, then the
	// third, then the Court's ruling (the base redesign's "Resolve told per world")
	sequenceEvents = (events, frame) => {
		const ordered = [];
		frame.sites.forEach((site) => {
			events.forEach((event) => {
				if (event.site === site.id) {
					ordered.push(event);
				}
			});
		});
		events.forEach((event) => {
			if (!event.site && ordered.indexOf(event) < 0) {
				ordered.push(event);
			}
		});
		return ordered;
	};

	// a flat index of every creature on the table just before resolution: its record, its
	// world and its side, so the sentences can name a creature that has since been routed
	// off the board.
	snapshotBoard = (match) => {
		const view = getPublicState(match, YOU);
		const index = {};
		flattenBoard(view).forEach((u) => {
			index[u.recordId] = {
				record: u.record,
				siteName: u.site.name,
				siteId: u.site.id,
				hold: u.prepared.hold,
				seat: u.seat,
			};
		});
		// hidden rival creatures are invisible in the handler's own view; fall back to the
		// raw board for narration once resolution has revealed them.
		const frame = match.frames[match.frameIndex];
		frame.sites.forEach((site) => {
			['A', 'B'].forEach((seat) => {
				match.board[site.id][seat].forEach((e) => {
					if (index[e.recordId]) {
						return;
					}
					index[e.recordId] = {
						record: e.record,
						siteName: site.name,
						siteId: site.id,
						hold: prepare(e.record, site, site.world, e.sentIndex, { rules: view.rules }).hold,
						seat,
					};
				});
			});
		});
		return index;
	};

	// ------------------------------------------------------------------
	// resolution playback
	// ------------------------------------------------------------------
	stepPlayback = () => {
		const { playback } = this.state;
		if (!playback) {
			return;
		}
		if (playback.index >= playback.events.length) {
			this.finishPlayback();
			return;
		}
		const event = playback.events[playback.index];
		this.tellEvent(event, playback);
		const cue = cueForEvent(event);
		if (cue) {
			this.cue(cue.name, cue.opts);
		}
		this.setState((prev) => ({ playback: { ...prev.playback, index: prev.playback.index + 1, current: event } }));
		// dev hook: window.__reclamationStepMs slows playback so it can be watched or captured
		const stepMs = (typeof window !== 'undefined' && window.__reclamationStepMs) || RESOLUTION_STEP_MS;
		this.playbackTimer = setTimeout(this.stepPlayback, stepMs);
	};

	// the player sets the pace of watching: jump the resolution to the ruling, or the
	// rival's thinking beat to its move
	hurry = () => {
		if (this.state.playback) {
			if (this.props.telemetry) {
				const since = this.playbackStartedAt ? Date.now() - this.playbackStartedAt : 0;
				this.props.telemetry.skip('playback', since);
			}
			this.cutBeats();
			this.skipPlayback();
			return;
		}
		if (this.botTimer) {
			if (this.props.telemetry) {
				const since = this.botBeatStartedAt ? Date.now() - this.botBeatStartedAt : 0;
				this.props.telemetry.skip('rival', since);
			}
			clearTimeout(this.botTimer);
			this.botTimer = null;
			this.runBotDeployTurn();
		}
	};

	skipPlayback = () => {
		if (this.playbackTimer) {
			clearTimeout(this.playbackTimer);
			this.playbackTimer = null;
		}
		const { playback } = this.state;
		if (!playback) {
			return;
		}
		for (let i = playback.index; i < playback.events.length; i++) {
			this.tellEvent(playback.events[i], playback);
		}
		this.setState((prev) => ({ playback: { ...prev.playback, index: prev.playback.events.length } }), this.finishPlayback);
	};

	/*
		tellEvent - one resolution event, told as one sentence in the log.

		Names carry their side: the provisional pool repeats species, so "Stonebrawler
		routs Stonebrawler" needs "your" and "the rival's" to be readable. A blow the
		shield cancelled gets no sentence of its own; the shield event says it.
	*/
	tellEvent = (event, playback) => {
		const kind = classifyEvent(event);
		const snap = playback.boardBefore;
		if (kind === 'vanguard-relocate') {
			return; // already narrated as it happened during deploy
		}
		if (kind === 'judge') {
			const siteNames = {};
			playback.frame.sites.forEach((s) => { siteNames[s.id] = `${s.world.planet} (${s.name})`; });
			this.appendLogLines(narrateJudge(event, { siteNames, you: YOU }));
			return;
		}
		if (kind !== 'blow' && kind !== 'area' && kind !== 'shield') {
			return;
		}
		const sided = (u) => (u.seat === YOU ? `your ${speciesLabel(u.record)}` : `the rival's ${speciesLabel(u.record)}`);
		const actor = snap[event.recordId];
		// a shield names the creature whose blow it cancelled; a blow names its target
		const otherId = kind === 'shield' ? event.cancelled : event.target;
		const other = otherId ? snap[otherId] : null;
		const site = event.site ? playback.frame.sites.find((s) => s.id === event.site) : null;
		const sentence = narrateEvent(event, {
			actorName: actor ? sided(actor) : 'A creature',
			targetName: other ? sided(other) : undefined,
			siteName: site ? site.name : (actor ? actor.siteName : undefined),
			worldName: site ? site.world.planet : undefined,
		});
		if (sentence) {
			this.appendLog(capitalize(sentence));
		}
	};

	finishPlayback = () => {
		const { playback, match } = this.state;
		if (!playback) {
			return;
		}
		const judgeEvent = playback.events.slice().reverse().find((e) => classifyEvent(e) === 'judge');
		let verdicts = null;
		if (judgeEvent) {
			verdicts = {};
			Object.keys(judgeEvent.siteResults).forEach((siteId) => {
				const r = judgeEvent.siteResults[siteId];
				verdicts[siteId] = {
					who: !r.winner ? 'court' : r.winner === YOU ? 'yours' : 'theirs',
					text: !r.winner ? 'to the Court' : r.winner === YOU ? 'yours' : 'the rival’s',
				};
			});
		}
		const resolved = this.applyPlaybackEffects({ ...playback, index: playback.events.length });
		const live = getPublicState(match, YOU);
		// the resolved board of the world just played, carrying the post-judge site counts
		const judgedSnapshot = {
			...resolved,
			players: live.players,
			phase: match.phase,
			turn: null,
			nextFrame: match.phase === 'matchEnd' ? null : live.frame.sites.map((site) => ({ planet: site.world.planet, element: site.world.element, siteId: site.id, siteName: site.name })),
			winner: match.winner,
		};
		this.setState({
			playback: null,
			verdicts,
			judged: true,
			judgedFrame: playback.frame.index,
			judgedSnapshot,
		}, this.persist);

		if (verdicts) {
			this.cue(match.phase === 'matchEnd' ? 'charter' : 'stamp');
			const tally = { yours: 0, theirs: 0, court: 0 };
			Object.keys(verdicts).forEach((siteId) => { tally[verdicts[siteId].who] += 1; });
			const parts = [];
			if (tally.yours) parts.push(`${plural(tally.yours, 'world')} yours`);
			if (tally.theirs) parts.push(`${plural(tally.theirs, 'world')} the rival's`);
			if (tally.court) parts.push(`${plural(tally.court, 'world')} to the Court`);
			this.beat({
				kind: 'judge',
				seat: null,
				short: 'The Court rules',
				text: `The Court reads the frame: ${parts.join(', ')}.`,
			});
		}

		if (match.phase === 'matchEnd') {
			const view = getPublicState(match, YOU);
			// ENGINE GAP: matchEndReason is only 'clinched' or 'frames-exhausted'; the engine
			// does not say when decideMatchWinner fell through to the tiebreak. Level sites
			// at the end is exactly that case, so the narration names it, matching the
			// verdict panel.
			const sitesYou = view.players[YOU].sitesWon;
			const sitesThem = view.players[THEM].sitesWon;
			const reason = match.matchEndReason === 'frames-exhausted' && sitesYou === sitesThem
				? 'tiebreak'
				: match.matchEndReason;
			this.appendLog(narrateMatchEnd({ winner: match.winner, you: YOU, sitesYou, sitesThem, reason }));
		}
	};

	nextFrame = () => {
		this.setState({ verdicts: null, judged: false, judgedFrame: null, judgedSnapshot: null }, () => {
			const { match } = this.state;
			const frame = match.frames[match.frameIndex];
			const names = frameWorldNames(frame);
			this.appendLog(`The frame loads ${names}.`);
			this.cutBeats();
			this.beat({
				kind: 'world',
				seat: null,
				short: `Round ${frame.index + 1}`,
				text: `The frame loads ${names}. ${match.turn === YOU ? 'You send first this round.' : 'The rival sends first this round.'}`,
			});
			this.scheduleBotIfDue();
		});
	};

	// ------------------------------------------------------------------
	// inspection
	// ------------------------------------------------------------------
	inspectRecord = (record, site) => {
		this.setState({ inspect: { record, site: site || null } });
	};

	// ------------------------------------------------------------------
	// derived views for rendering — every number comes from the engine
	// ------------------------------------------------------------------
	holdsForBoard(view) {
		const holds = {};
		view.frame.sites.forEach((site) => {
			['A', 'B'].forEach((seat) => {
				(view.board[site.id][seat] || []).forEach((e) => {
					if (!e.record) {
						return;
					}
					const prepared = prepareWithCompanions(view, e.record, site, e.sentIndex, seat, e.recordId);
					// blows subtract (assumption 5): the engine keeps the live hold on the
					// board row, and the meter draws the gap back up to the untouched one as
					// what the round has taken
					const full = typeof e.fullHold === 'number' ? e.fullHold : prepared.hold;
					const live = typeof e.currentHold === 'number' ? e.currentHold : prepared.hold;
					holds[e.recordId] = {
						printed: full,
						hold: live,
						role: e.role !== undefined ? e.role : prepared.role,
						blowMagnitude: prepared.blowMagnitude,
						staggered: live < full,
						strainLevel: prepared.strainLevel,
						isHome: prepared.isHome,
						// the hold it would have here unstrained: the meter draws the difference
						// as what the environment took
						unstrained: full / strainMultiplierFor(prepared.strainLevel),
						baseHold: prepared.baseHold,
					};
				});
			});
		});
		return holds;
	}

	totalsForBoard(view) {
		const totals = {};
		view.frame.sites.forEach((site) => {
			totals[site.id] = { A: siteHoldTotal(view, site.id, 'A'), B: siteHoldTotal(view, site.id, 'B') };
		});
		return totals;
	}

	// what the armed creature (or, before one is armed, the slot under the pointer)
	// would hold at every site
	ghostsForArmed(view) {
		const { armedRecordId, hoverRecordId } = this.state;
		const id = armedRecordId || hoverRecordId;
		if (!id || view.phase !== 'deploy' || view.turn !== YOU) {
			return null;
		}
		const record = view.players[YOU].roster.find((r) => r.id === id);
		if (!record) {
			return null;
		}
		const ghosts = {};
		view.frame.sites.forEach((site) => {
			// the whole arithmetic of this send at this world: hold after strain and any
			// bolster standing there, the role sentence, and what the role would do to the
			// board as it stands (the base redesign's "Interface consequences")
			const plan = ghostPlanFor(view, record, site, YOU, view.players[YOU].sentCount);
			const prepared = prepare(record, site, site.world, view.players[YOU].sentCount, { rules: view.rules });
			const tolerance = (record.physiology && record.physiology.environmentalTolerance) || {};
			ghosts[site.id] = {
				hold: plan.hold,
				role: plan.role,
				roleLine: plan.roleLine,
				lines: plan.lines,
				targetRecordId: plan.targetRecordId,
				strainLevel: plan.strainLevel,
				isHome: plan.isHome,
				bolstered: plan.bolstered,
				preview: !armedRecordId,
				unstrained: plan.hold / strainMultiplierFor(plan.strainLevel),
				// the creature's own band and media, drawn over the site's on the environment scale
				tolerance: {
					temperatureC: tolerance.temperatureC || null,
					ambientMedia: tolerance.ambientMedia || [],
					breathes: (record.physiology && record.physiology.breathes) || [],
				},
			};
		});
		return ghosts;
	}

	// ------------------------------------------------------------------
	// the status strip
	// ------------------------------------------------------------------
	whatAClickDoes(view) {
		const { armedRecordId, relocating, playback } = this.state;
		if (playback) {
			return 'The round is resolving. Skip, or press space, to jump to the ruling.';
		}
		if (view.phase === 'matchEnd') {
			return 'The Proving is over. The report says how it went; start a new one to play again.';
		}
		if (this.state.judged) {
			return 'The Court has ruled. Load the next frame when you are ready.';
		}
		if (view.turn !== YOU) {
			return 'The rival is deciding. Press space to hurry it.';
		}
		if (relocating) {
			return 'Click a site to fall your vanguard back to it. This does not spend your turn.';
		}
		if (armedRecordId) {
			const record = view.players[YOU].roster.find((r) => r.id === armedRecordId);
			return `${speciesLabel(record)} is lifted. Press a world to send it there, or press it again to set it down.`;
		}
		if (view.players[YOU].passed) {
			return 'You have passed. Waiting on the rival.';
		}
		return 'Lift a creature from the bench, then press a world. Or pass.';
	}

	// a rival beat holds the turn readout on what the rival just did, so "Your move" lands
	// after it as its own change
	rivalBeat() {
		const { beat } = this.state;
		return beat && beat.seat === THEM ? beat : null;
	}

	turnText(view) {
		if (this.state.playback) {
			return 'Resolving';
		}
		const rivalBeat = this.rivalBeat();
		if (rivalBeat && view.phase === 'deploy' && !this.state.judged) {
			return rivalBeat.short;
		}
		if (this.state.judged && view.phase !== 'matchEnd') {
			return 'The Court has ruled';
		}
		if (view.phase === 'matchEnd') {
			return 'The Proving is over';
		}
		if (view.turn === YOU) {
			return 'Your move';
		}
		return 'The rival is deciding';
	}

	renderStatusStrip(view) {
		const you = view.players[YOU];
		const them = view.players[THEM];
		const rivalBeat = !!this.rivalBeat() && view.phase === 'deploy' && !this.state.judged;
		const yourTurn = view.turn === YOU && view.phase === 'deploy' && !this.state.playback && !this.state.judged && !rivalBeat;
		const waiting = (view.turn === THEM || rivalBeat) && view.phase === 'deploy' && !this.state.playback && !this.state.judged;
		const deciding = waiting && !rivalBeat;
		const turnLabel = this.turnText(view);
		const lampKind = yourTurn ? 'amber' : waiting ? 'red' : 'off';
		const phaseLabel = this.state.playback ? 'Resolve'
			: view.phase === 'matchEnd' ? 'Charter'
				: this.state.judged ? 'Judge' : 'Deploy';
		// a pip is keyed on whether it is lit, so lighting one remounts it and it pops
		const pips = (n) => Array.from({ length: SITES_TO_CLINCH }).map((_, i) => (
			<span className={`rec-pip${i < n ? ' rec-pip--lit' : ''}`} key={`${i}-${i < n ? 'lit' : 'dark'}`} />
		));
		const frameDots = Array.from({ length: FRAMES_PER_MATCH }).map((_, i) => (
			<span className={`rec-world-dot${i === view.frameIndex ? ' rec-world-dot--now' : i < view.frameIndex ? ' rec-world-dot--done' : ''}`} key={i} />
		));
		return (
			<div className="g-panel rec-status">
				<div className="rec-status-world">
					<span className="rec-world-dots" title={`Round ${view.frameIndex + 1} of ${FRAMES_PER_MATCH}`}>{frameDots}</span>
					<h2 className="rec-status-planet">Round {view.frameIndex + 1}</h2>
					<span className="rec-status-worlds" aria-label="The worlds loaded in the frame">
						{view.frame.sites.map((site) => (
							<span className={`g-chip g-chip--outline rec-status-element g-el-${site.world.element}`} key={site.id} title={`${site.world.planet}, at ${site.name}`}>{site.world.planet}</span>
						))}
					</span>

				</div>

				<div className="rec-status-score" title={`First to ${SITES_TO_CLINCH} sites takes the Charter`}>
					<span className="rec-score rec-score--mine">
						<span className="rec-score-label">You</span>
						<span className="rec-pips">{pips(you.sitesWon)}</span>
						<span className="rec-score-value rec-tick" data-sites-a key={you.sitesWon}>{you.sitesWon}</span>
					</span>
					<span className="rec-score rec-score--theirs">
						<span className="rec-score-label">Rival</span>
						<span className="rec-pips">{pips(them.sitesWon)}</span>
						<span className="rec-score-value rec-tick" data-sites-b key={them.sitesWon}>{them.sitesWon}</span>
					</span>

				</div>

				<div className="rec-status-turn">
					<span className="rec-status-phase">{phaseLabel}</span>
					<span className={`rec-turn${yourTurn ? ' rec-turn--yours' : ''}${waiting ? ' rec-turn--waiting' : ''}${deciding ? ' rec-turn--deciding' : ''}`}>
						<span className={`g-lamp g-lamp--${lampKind}`} key={lampKind} />
						<span className="rec-turn-text rec-turn-text--in" data-turn-text key={turnLabel}>{turnLabel}</span>
					</span>
					{this.state.playback && (
						<button type="button" className="g-btn rec-skip" onClick={this.hurry} data-skip title="Space">
							Skip to the ruling
						</button>
					)}
				</div>

				<p className={`rec-status-hint g-body${yourTurn ? ' rec-status-hint--yours' : ''}`} data-hint>
					{rivalBeat ? this.rivalBeat().text : this.whatAClickDoes(view)}
				</p>
			</div>
		);
	}

	// the callout: one sentence over the sites saying what just happened, in the colour
	// of whoever did it. Keyed on the beat so each one plays its own entrance and exit.
	renderCallout() {
		const { beat } = this.state;
		if (!beat) {
			return <div className="rec-callout-row" data-callout-row />;
		}
		const who = beat.seat === YOU ? 'you' : beat.seat === THEM ? 'rival' : 'table';
		const kicker = beat.seat === YOU ? 'You' : beat.seat === THEM ? 'The rival' : beat.kind === 'judge' ? 'The Court' : 'The table';
		const ms = (typeof window !== 'undefined' && window.__reclamationBeatMs) || BEAT_MS;
		return (
			<div className="rec-callout-row" data-callout-row>
				<div
					className={`rec-callout rec-callout--${who} rec-callout--${beat.kind}`}
					key={beat.id}
					style={{ '--rec-beat-ms': `${ms}ms` }}
					data-callout={beat.kind}
					role="status"
				>
					<span className="rec-callout-kicker">{kicker}</span>
					<span className="rec-callout-text">{beat.text}</span>
				</div>
			</div>
		);
	}

	renderVerdictPanel() {
		const { match } = this.state;
		const report = buildMatchReport(match, YOU, this.recordsById);
		return (
			<ReclamationReport
				report={report}
				rivalName={this.rival.name}
				onNewProving={this.props.onNewProving}
				seed={this.props.seed}
				rivalId={this.props.rivalId}
				telemetry={this.props.telemetry}
			/>
		);
	}

	render() {
		const view = this.view();
		const { notice, playback, verdicts, judged, inspect } = this.state;
		const simple = this.isSimple();
		const rec = this.recommendation(view);
		// the suggested site is marked once its creature is the chosen one
		const recommendedSiteId = rec && rec.type === 'send' && this.state.armedRecordId === rec.recordId ? rec.siteId
			: rec && rec.type === 'relocate' && this.state.relocating ? rec.siteId : null;
		// simple mode has no rail; the bench lives under the worlds and the dossier is the
		// only thing that opens one
		const deployPanelOpen = view.phase === 'deploy' && !playback && !judged;
		const showRail = !simple || !!inspect;
		const holds = this.holdsForBoard(view);
		const totals = this.totalsForBoard(view);
		const ghosts = this.ghostsForArmed(view);
		const me = view.players[YOU];
		const them = view.players[THEM];
		const deploying = view.phase === 'deploy' && !playback && !judged;
		// sites accept a click for the whole of your deploy turn, not only when something is
		// armed: the interface principle is that every click says why, and a site that
		// silently ignores a click explains nothing.
		const clickable = deploying && view.turn === YOU;

		/*
			The threat read (the base redesign's "Interface consequences"): each of your
			figures carries the number it would lose this round to the worst visible enemy
			blow at its own world, and a rout mark when that number reaches its remaining
			hold. It is a number now, not a level, because blows subtract.
		*/
		const threatMap = deploying ? threatsFor(view, YOU) : {};
		const threats = {};
		Object.keys(threatMap).forEach((id) => {
			// simple and advanced differ only in how much arithmetic is printed: simple marks
			// only the blow that would rout, advanced prints every number
			if (simple && !threatMap[id].routs) {
				return;
			}
			threats[id] = {
				level: threatMap[id].routs ? 'rout' : 'amount',
				amount: formatHold(threatMap[id].amount),
				text: threatSentence(threatMap[id]),
			};
		});
		const coaching = this.isSimple() && !this.state.coached && view.frameIndex === 0 && deploying;
		const holdingIds = [...me.holding, ...them.holding];

		// what to light on the table: the creature the ghost would strike, or the event
		// being told during resolution
		const highlights = {};
		const armedGhost = ghosts && this.state.hoverSiteId ? ghosts[this.state.hoverSiteId] : null;
		if (armedGhost && armedGhost.targetRecordId) {
			highlights.hover = armedGhost.targetRecordId;
		}
		if (playback && playback.current) {
			const kind = classifyEvent(playback.current);
			if (kind === 'blow' || kind === 'area' || kind === 'shield') {
				highlights.acting = playback.current.recordId;
				highlights.hit = playback.current.target || null;
				highlights.flash = flashFor(playback.current);
			}
		}

		return (
			<div className={`rec-match${simple ? ' rec-match--simple' : ' rec-match--advanced'}`}>
				{this.renderStatusStrip(view)}

				{simple && this.state.log.length > 0 && (
					<div className="rec-ticker g-screen" data-ticker aria-live="polite">
						{this.state.log.slice(-2).map((line, i) => (
							<span className={`g-screen-line${i === this.state.log.slice(-2).length - 1 ? ' rec-ticker-line--in' : ' g-screen-line--dim'}`} key={`${this.state.log.length}-${i}`}>{line}</span>
						))}
					</div>
				)}

				{notice && <div className="g-notice g-notice--alert rec-notice" role="status" data-notice>{notice}</div>}

				<div className={`rec-body${showRail ? '' : ' rec-body--wide'}`}>
					<div className="rec-table">
						{this.renderCallout()}
						<ReclamationWorld
							key={view.frame.index}
							arrival={this.state.arrival}
							frame={view.frame}
							board={view.board}
							you={YOU}
							holds={holds}
							totals={totals}
							staggered={view.staggered}
							ghosts={ghosts}
							verdicts={verdicts}
							armedRecordId={this.state.armedRecordId}
							relocating={this.state.relocating}
							vanguardRecordId={me.vanguardRecordId}
							clickable={clickable}
							recommendedSiteId={recommendedSiteId}
							holdingIds={holdingIds}
							hiddenEnemyCount={deploying ? (them.hiddenSentThisRound || 0) : 0}
							threats={threats}
							highlights={highlights}
							hoverSiteId={this.state.hoverSiteId}
							advanced={!simple}
							onSiteClick={this.handleSiteClick}
							onSiteHover={(id) => this.setState({ hoverSiteId: id })}
							onFigureClick={(entry, seat, site) => this.inspectRecord(entry.record, site)}
						/>

						{view.nextFrame && !judged && (
							<div className="rec-next-plate" data-next-plate>
								<span className="rec-next-plate-label">Next round</span>
								{view.nextFrame.map((w) => (
									<span className={`g-chip g-chip--outline rec-status-element g-el-${w.element}`} key={w.siteId} title={`${w.planet}, at ${w.siteName}`}>{w.planet}</span>
								))}
							</div>
						)}

						{coaching && (
							<div className="rec-coach rec-rise" data-coach role="note">
								<ol className="rec-coach-steps">
									<li className={`rec-coach-step${!this.state.armedRecordId ? ' rec-coach-step--now' : ' rec-coach-step--done'}`}><span className="rec-coach-index g-mono">1</span> Lift a creature from the bench</li>
									<li className={`rec-coach-step${this.state.armedRecordId ? ' rec-coach-step--now' : ''}`}><span className="rec-coach-index g-mono">2</span> Press a world to send it there</li>
									<li className="rec-coach-step"><span className="rec-coach-index g-mono">3</span> Or pass, and keep the rest for later rounds</li>
								</ol>
								<button type="button" className="g-btn rec-coach-dismiss" onClick={this.dismissCoach} data-coach-dismiss>Got it</button>
							</div>
						)}

						{deployPanelOpen && (
							<ReclamationBench
								view={view}
								you={YOU}
								squad={this.squad}
								mode={simple ? 'simple' : 'advanced'}
								armedRecordId={this.state.armedRecordId}
								recommendation={rec}
								sendHidden={this.state.sendHidden}
								relocating={this.state.relocating}
								vanguard={me.canRelocateVanguard && me.vanguardRecordId ? this.findRecordOnBoard(this.state.match, me.vanguardRecordId) : null}
								onArm={this.armRecord}
								onInspect={(record) => this.inspectRecord(record, null)}
								onHoverRecord={(id) => this.setState({ hoverRecordId: id })}
								onToggleHidden={this.toggleHidden}
								onPass={this.handlePass}
								onBeginRelocate={this.beginRelocate}
								rivalBeat={this.rivalBeat()}
							/>
						)}

						{judged && !playback && view.phase !== 'matchEnd' && (
							<div className="rec-judge-bar rec-rise" data-judge-bar>
								<span className="rec-judge-bar-text">
									The Court has ruled on round {(this.state.judgedFrame || 0) + 1}.
									{view.nextFrame ? ` The frame loads ${view.nextFrame.map((w) => w.planet).join(', ')} next; ${this.state.match.turn === YOU ? 'you send first' : 'the rival sends first'}.` : ''}
								</span>
								<button type="button" className="g-btn g-btn--primary" onClick={this.nextFrame} data-next-frame>
									Load round {(this.state.judgedFrame || 0) + 2}
								</button>
							</div>
						)}

						{judged && !playback && view.phase === 'matchEnd' && this.renderVerdictPanel()}

					</div>

					{showRail && (
					<div className="rec-rail">
						{inspect && (
							<ReclamationInspect
								record={inspect.record}
								site={inspect.site}
								frame={view.frame}
								rules={view.rules}
								onClose={() => this.setState({ inspect: null })}
							/>
						)}
						{!simple && <ReclamationLog lines={this.state.log} />}
					</div>
					)}
				</div>
			</div>
		);
	}
}

// the first Proving's coach strip is shown until dismissed or until the first round resolves
const COACH_KEY = 'reclamation.coached';
function readCoached() {
	try {
		return window.localStorage.getItem(COACH_KEY) === 'yes';
	} catch (e) {
		return true;
	}
}
function writeCoached() {
	try {
		window.localStorage.setItem(COACH_KEY, 'yes');
	} catch (e) {
		// nothing to do; the strip returns next time
	}
}

// the word that pops over a creature as a blow lands on it during playback: the number
// it lost, or the outcome where there is no number (the base redesign: every point counts)
function flashFor(event) {
	if (!event) {
		return null;
	}
	if (event.type === 'shield') {
		return event.cancelled ? { kind: 'ward', text: 'cancelled' } : null;
	}
	if (event.type !== 'blow') {
		return null;
	}
	switch (event.outcome) {
		case 'routed': return { kind: 'rout', text: 'routed' };
		case 'staggered': return { kind: 'stagger', text: `-${formatHold(event.amount)}` };
		case 'cancelled': return { kind: 'ward', text: 'cancelled' };
		default: return null;
	}
}

// "1 site" reads better than "1 sites" on the verdict panel and in the log.
function plural(n, word) {
	return `${n} ${word}${n === 1 ? '' : 's'}`;
}

export default ReclamationMatch;
