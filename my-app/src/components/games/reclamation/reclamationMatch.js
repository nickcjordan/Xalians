import React from 'react';
import ReclamationWorld from './reclamationWorld';
import ReclamationDeploy from './reclamationDeploy';
import ReclamationOrders from './reclamationOrders';
import ReclamationInspect from './reclamationInspect';
import ReclamationLog from './reclamationLog';
import {
	send, pass, relocateVanguard, order, commitOrders, getPublicState,
	createRngState, nextRandom,
} from '../../../gameplay/expedition/expeditionRules';
import { chooseSend, chooseOrders } from '../../../gameplay/expedition/expeditionBot';
import { prepare, magnitudeAgainst, strainMultiplierFor } from '../../../gameplay/expedition/creatureOnTable';
import { SENDABLE, SITES_TO_CLINCH, FRAMES_PER_MATCH } from '../../../gameplay/expedition/expeditionInterpretation';
import {
	speciesLabel, formatHold, classifyEvent, narrateAct, narrateRelocate,
	narrateSend, narratePass, narrateJudge, narrateMatchEnd,
} from './reclamationNarration';
import { orderPreview, flattenBoard, prepareWithCompanions, siteHoldTotal } from './reclamationPreview';
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
	resolution log back one event at a time. The driver sequencing (deploy loop where a
	relocate does not consume the turn, then orders for A and B, then commitOrders for A
	then B) mirrors devtools/expeditionSimulator.js runOneMatch exactly.

	Interface rule, from the design doc: the table must always show whose turn it is,
	what a click will do, and what just happened, without scrolling; every number is the
	live value the rules will use; every invalid action says why.

	Two views of the same match (Nick, 2026-09-03). `props.mode` is 'simple' or
	'advanced'. Simple mode removes decisions rather than hiding panels: each deploy turn
	offers one recommended move with its reason (the player may still pick any creature
	and site), Orders becomes "your creatures act by nature, go" with the full orders
	panel one tap away, and the rail (log, dossier) is gone except when a dossier is
	open; the last two lines of the record ride under the status strip instead.
	Advanced mode is the whole table. The engine and the state are the same in both.
*/
class ReclamationMatch extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			match: props.initialMatch,
			log: [],
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
			hoverRow: null, // the preview line under the pointer, to light its creatures
			ordersOpen: false, // simple mode: the full orders panel, opened on request
			beat: null, // { id, seat, kind, text, short } the callout being shown
			arrival: null, // { id, ids, siteId, seat } figures that just landed
			hoverRecordId: null, // the roster slot under the pointer: previewed on every site
			hoverSiteId: null, // the site row under the pointer in the deploy panel
		};
		// your twelve in slot order, held for the whole expedition so the roster never reshuffles
		this.squad = props.initialMatch.players[YOU].roster.slice();
		this.botRngState = createRngState(`${props.seed}-bot`);
		this.botTimer = null;
		this.noticeTimer = null;
		this.playbackTimer = null;
		this.beatTimer = null;
		this.arrivalTimer = null;
		this.beatQueue = [];
		this.beatSeq = 0;
		this.ordersPanel = React.createRef();
		this.lastLoggedEventCount = 0;
	}

	componentDidMount() {
		document.addEventListener('keydown', this.handleKeyDown);
		this.exposeDebug();
		this.scheduleBotIfDue();
	}

	componentDidUpdate(prevProps, prevState) {
		// the debug surface must track whatever the table is actually drawing, which during
		// resolution and the Judge is a held snapshot rather than the live match, so it is
		// refreshed on every update rather than only when `match` changes.
		this.exposeDebug();
		if (prevState.match !== this.state.match && !this.state.playback && !this.state.judged) {
			this.scheduleBotIfDue();
		}
	}

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
					const staggered = !!(view.staggered && view.staggered[e.recordId]);
					holds[e.recordId] = {
						recordId: e.recordId,
						species: e.record.species,
						siteId: site.id,
						seat,
						printed: prepared.hold,
						hold: staggered ? prepared.hold * 0.5 : prepared.hold,
						staggered,
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
		};
	};

	/*
		The engine's commitOrders() runs resolve() AND judge() in one call, so the moment
		orders are given the live state has already moved to the next world. Replaying the
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

	// the pre-resolution view with every effect from the events already narrated applied:
	// routed creatures removed from their site, staggered ones flagged, shoved ones moved.
	applyPlaybackEffects(playback) {
		const base = playback.frozenView;
		const staggered = {};
		const routed = new Set();
		const movedTo = {};
		for (let i = 0; i < playback.index; i++) {
			const event = playback.events[i];
			if (classifyEvent(event) !== 'act') {
				continue;
			}
			if (event.outcome === 'staggered' && event.target) {
				staggered[event.target] = true;
			}
			if (event.outcome === 'routed' && event.target) {
				routed.add(event.target);
			}
			if (event.outcome === 'mended' && event.target) {
				delete staggered[event.target];
			}
			if (event.outcome === 'shoved' && event.target && event.toSite) {
				movedTo[event.target] = event.toSite;
			}
			if (event.outcome === 'terrorized' && event.target) {
				routed.add(event.target);
			}
			// an area act's outcomes are not itemised per victim in the log, so the board
			// shows them only once the judge's totals land — the sentences still say what
			// happened. Noted as an engine gap in reclamationNarration.js.
		}
		const board = {};
		const displaced = [];
		base.frame.sites.forEach((site) => {
			board[site.id] = { A: [], B: [] };
		});
		base.frame.sites.forEach((site) => {
			['A', 'B'].forEach((seat) => {
				(base.board[site.id][seat] || []).forEach((entry) => {
					if (routed.has(entry.recordId)) {
						return;
					}
					const dest = movedTo[entry.recordId] || site.id;
					if (board[dest]) {
						board[dest][seat].push(entry);
					} else {
						displaced.push(entry);
					}
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

	// the phase the engine moved to, told as a beat of its own after the move that caused it
	beatPhaseChange = (before, after) => {
		if (before.phase === 'deploy' && after.phase === 'orders') {
			const yours = after.frames[after.frameIndex].sites
				.reduce((n, site) => n + after.board[site.id][YOU].length, 0);
			this.beat({
				kind: 'orders',
				seat: null,
				short: 'Your orders',
				text: yours === 0
					? 'Deploy is over. You have nothing in the frame, so the rival acts alone.'
					: 'Deploy is over. Your creatures are waiting for orders.',
			});
		}
	};

	notice = (text) => {
		this.setState({ notice: text });
		if (this.noticeTimer) {
			clearTimeout(this.noticeTimer);
		}
		this.noticeTimer = setTimeout(() => this.setState({ notice: null }), 3400);
	};

	// ------------------------------------------------------------------
	// keyboard
	// ------------------------------------------------------------------
	handleKeyDown = (e) => {
		if (e.key === 'Escape') {
			if (this.state.armedRecordId || this.state.relocating || this.state.inspect) {
				this.setState({ armedRecordId: null, relocating: false, inspect: null, sendHidden: false });
			}
			return;
		}
		if (e.key === 'Enter' && this.state.match.phase === 'orders') {
			const panel = this.ordersPanel.current;
			if (panel && panel.contains(document.activeElement)) {
				e.preventDefault();
				this.commitOrders();
			}
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
		let action = chooseSend(publicState, match.players[THEM].roster, THEM, rngLike);

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
				action = chooseSend(publicState, match.players[THEM].roster, THEM, rngLike);
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
		if (arrivals.length > 0) {
			this.arrive(arrivals, (fellBack && !beat.siteId) ? fellBack.siteId : beat.siteId, THEM);
		}
		this.beat(beat);
		this.beatPhaseChange(before, next);
		this.setState({ match: next }, this.afterEngineStep);
	};

	siteName = (match, siteId) => {
		const frame = match.frames[match.frameIndex];
		const site = frame.sites.find((s) => s.id === siteId);
		return site ? site.name : siteId;
	};

	// once deploy ends, the phase becomes 'orders' — nothing automatic happens then; the
	// human gives orders, and the bot's orders are submitted at commit time.
	afterEngineStep = () => {
		this.exposeDebug();
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
			this.notice(`You have sent all ${SENDABLE} creatures this expedition allows. The rest are your reserve.`);
			return;
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
		this.beatPhaseChange(match, next);
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
		this.appendLog(line);
		this.beat({ kind: 'your-pass', seat: YOU, short: 'Passed', text: line });
		this.beatPhaseChange(match, next);
		this.setState({ match: next, armedRecordId: null, relocating: false }, this.afterEngineStep);
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
	// orders
	// ------------------------------------------------------------------
	setOrder = (recordId, actName) => {
		const { match } = this.state;
		if (match.committed[YOU]) {
			this.notice('Your orders are already sealed for this round.');
			return;
		}
		const next = order(match, YOU, recordId, actName);
		if (!next) {
			this.notice('That act is not one this creature can perform.');
			return;
		}
		this.setState({ match: next });
	};

	commitOrders = () => {
		let match = this.state.match;
		if (match.phase !== 'orders') {
			this.notice('There are no orders to give right now.');
			return;
		}
		if (match.committed[YOU]) {
			this.notice('Your orders are already sealed.');
			return;
		}

		// the bot's orders go in first (as the simulator does), then A commits, then B —
		// committing B is what triggers resolve() and judge() inside the engine.
		const botOrders = chooseOrders(getPublicState(match, THEM), THEM);
		Object.keys(botOrders).forEach((creatureId) => {
			const next = order(match, THEM, creatureId, botOrders[creatureId]);
			if (next) {
				match = next;
			}
		});

		const beforeLogLength = match.resolutionLog.length;
		const frameBefore = match.frames[match.frameIndex];
		const boardBefore = this.snapshotBoard(match);
		// the whole public view as it stands with orders locked but nothing resolved: the
		// board the playback draws (see view()). Hidden creatures are revealed at the start
		// of resolution by the engine, so this view un-hides our own side's hidden sends
		// too, matching what the sentences will say.
		const frozenView = getPublicState(match, YOU);
		const sitesWonBefore = { A: match.players.A.sitesWon, B: match.players.B.sitesWon };

		let next = commitOrders(match, YOU);
		if (!next) {
			this.notice('Your orders could not be given.');
			return;
		}
		next = commitOrders(next, THEM);
		if (!next) {
			this.notice('The rival could not give its orders.');
			return;
		}

		const newEvents = next.resolutionLog.slice(beforeLogLength);
		this.appendLog('Orders are revealed.');
		this.cutBeats();
		this.beat({ kind: 'resolve', seat: null, short: 'Resolving', text: 'Orders are revealed. Each creature acts in turn, fastest first.' });
		this.setState({
			match: next,
			playback: {
				events: newEvents,
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

	// a flat index of every creature on the table just before resolution, with the hold
	// the engine had for it at that moment — the resolution log carries no holds or
	// magnitudes, so the narration reads them from here.
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
						hold: prepare(e.record, site, site.world, e.sentIndex).hold,
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
		this.narrateEvent(event, playback);
		this.setState((prev) => ({ playback: { ...prev.playback, index: prev.playback.index + 1, current: event } }));
		// dev hook: window.__reclamationStepMs slows playback so it can be watched or captured
		const stepMs = (typeof window !== 'undefined' && window.__reclamationStepMs) || RESOLUTION_STEP_MS;
		this.playbackTimer = setTimeout(this.stepPlayback, stepMs);
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
			this.narrateEvent(playback.events[i], playback);
		}
		this.setState((prev) => ({ playback: { ...prev.playback, index: prev.playback.events.length } }), this.finishPlayback);
	};

	narrateEvent = (event, playback) => {
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
		if (kind !== 'act') {
			return;
		}
		const actor = snap[event.recordId];
		const target = event.target ? snap[event.target] : null;
		const site = event.site ? playback.frame.sites.find((s) => s.id === event.site) : null;
		// names carry their side: the provisional pool repeats species, so "Stonebrawler
		// is crushed by Stonebrawler" needs "your" and "the rival's" to be readable
		const sided = (u) => (u.seat === YOU ? `your ${speciesLabel(u.record)}` : `the rival's ${speciesLabel(u.record)}`);
		this.appendLog(capitalize(narrateAct(event, {
			actorName: actor ? sided(actor) : 'A creature',
			actorHold: actor ? actor.hold : undefined,
			targetName: target ? sided(target) : undefined,
			targetHold: target ? target.hold : undefined,
			siteName: site ? site.name : (actor ? actor.siteName : undefined),
			magnitude: this.magnitudeForEvent(event, actor, target),
		})));
	};

	// the log event carries no magnitude, so it is recomputed from the engine's own
	// creatureOnTable helpers against the pre-resolution snapshot.
	magnitudeForEvent = (event, actor, target) => {
		if (!actor || !target || !event.action) {
			return undefined;
		}
		const frame = this.state.playback ? this.state.playback.frame : null;
		if (!frame) {
			return undefined;
		}
		const site = frame.sites.find((s) => s.id === actor.siteId);
		const prepared = prepare(actor.record, site, site.world, 0);
		const act = prepared.acts.find((a) => a.action === event.action);
		if (!act) {
			return undefined;
		}
		return magnitudeAgainst(actor.record, act, target.record);
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
			judgedSnapshot: match.phase === 'matchEnd' ? judgedSnapshot : judgedSnapshot,
		});

		if (verdicts) {
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
					const staggered = !!(view.staggered && view.staggered[e.recordId]);
					holds[e.recordId] = {
						printed: prepared.hold,
						hold: staggered ? prepared.hold * 0.5 : prepared.hold,
						strainLevel: prepared.strainLevel,
						isHome: prepared.isHome,
						// the hold it would have here unstrained: the meter draws the difference
						// as what the environment took
						unstrained: prepared.hold / strainMultiplierFor(prepared.strainLevel),
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
			const prepared = prepare(record, site, site.world, view.players[YOU].sentCount);
			const tolerance = (record.physiology && record.physiology.environmentalTolerance) || {};
			ghosts[site.id] = {
				hold: prepared.hold,
				strainLevel: prepared.strainLevel,
				isHome: prepared.isHome,
				preview: !armedRecordId,
				unstrained: prepared.hold / strainMultiplierFor(prepared.strainLevel),
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
			return 'The round is resolving. Skip to jump to the verdict.';
		}
		if (view.phase === 'matchEnd') {
			return 'The expedition is over. Start a new one to play again.';
		}
		if (this.state.judged) {
			return 'The Court has ruled. Load the next frame when you are ready.';
		}
		if (view.phase === 'orders') {
			if (view.players[YOU].committed) {
				return 'Your orders are sealed.';
			}
			return this.isSimple()
				? 'Your creatures act by nature. Go, or change an order first.'
				: 'Choose an act for each of your creatures, then give orders.';
		}
		if (view.turn !== YOU) {
			return 'The rival is deciding.';
		}
		if (relocating) {
			return 'Click a site to fall your vanguard back to it. This does not spend your turn.';
		}
		if (armedRecordId) {
			const record = view.players[YOU].roster.find((r) => r.id === armedRecordId);
			return `${speciesLabel(record)} is chosen. Press a world to send it there, or Change to pick another.`;
		}
		if (view.players[YOU].passed) {
			return 'You have passed. Waiting on the rival.';
		}
		return 'Choose a creature from your squad, then the world to send it to. Or pass.';
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
			return 'Expedition over';
		}
		if (view.phase === 'orders') {
			return view.players[YOU].committed ? 'Orders sealed' : 'Your orders';
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
		const yourTurn = ((view.turn === YOU && view.phase === 'deploy') || (view.phase === 'orders' && !view.players[YOU].committed)) && !this.state.playback && !this.state.judged && !rivalBeat;
		const waiting = (view.turn === THEM || rivalBeat) && view.phase === 'deploy' && !this.state.playback && !this.state.judged;
		const deciding = waiting && !rivalBeat;
		const turnLabel = this.turnText(view);
		const lampKind = yourTurn ? 'amber' : waiting ? 'red' : 'off';
		const phaseLabel = this.state.playback ? 'Resolve'
			: view.phase === 'matchEnd' ? 'Charter'
				: this.state.judged ? 'Judge'
					: view.phase === 'orders' ? 'Orders' : 'Deploy';
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
							<span className={`g-chip rec-status-element g-el-${site.world.element}`} key={site.id} title={`${site.world.planet}, at ${site.name}`}>{site.world.planet}</span>
						))}
					</span>
					<span className="rec-status-next g-mono">
						{view.nextFrame ? `then ${view.nextFrame.map((w) => w.planet).join(', ')}` : 'the last frame'}
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
					<span className="rec-score-of">{SITES_TO_CLINCH} worlds clinch</span>
				</div>

				<div className="rec-status-turn">
					<span className="rec-status-phase">{phaseLabel}</span>
					<span className={`rec-turn${yourTurn ? ' rec-turn--yours' : ''}${waiting ? ' rec-turn--waiting' : ''}${deciding ? ' rec-turn--deciding' : ''}`}>
						<span className={`g-lamp g-lamp--${lampKind}`} key={lampKind} />
						<span className="rec-turn-text rec-turn-text--in" data-turn-text key={turnLabel}>{turnLabel}</span>
					</span>
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

	renderVerdictPanel(view) {
		const won = this.state.match.winner === YOU;
		const reason = this.state.match.matchEndReason;
		const why = reason === 'clinched'
			? 'clinched at five worlds'
			: view.players[YOU].sitesWon === view.players[THEM].sitesWon
				? 'level on worlds and settled on the tiebreak'
				: 'after the third frame';
		return (
			<div className={`g-panel rec-verdict rec-rise ${won ? 'rec-verdict--won' : 'rec-verdict--lost'}`} data-verdict>
				<span className="g-kicker">The Charter</span>
				<h2 className="rec-verdict-title">{won ? 'The Charter is yours.' : 'The rival takes the Charter.'}</h2>
				<p className="g-body rec-verdict-body">
					{plural(view.players[YOU].sitesWon, 'world')} to {view.players[THEM].sitesWon}, with {why}.
				</p>
				<button type="button" className="g-btn g-btn--primary" onClick={this.props.onNewExpedition} data-new-expedition>
					New expedition
				</button>
			</div>
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
		// simple mode has no rail, except during deploy (the deploy panel lives there), for
		// an open dossier, or for the full orders panel
		const ordersPanelOpen = view.phase === 'orders' && !playback && (!simple || (this.state.ordersOpen && !view.players[YOU].committed));
		const deployPanelOpen = view.phase === 'deploy' && !playback && !judged;
		// simple mode's orders: the plan by nature, in the rail, with the full panel one tap away
		const planPanelOpen = view.phase === 'orders' && !playback && simple && !this.state.ordersOpen;
		const showRail = !simple || !!inspect || ordersPanelOpen || deployPanelOpen || planPanelOpen;
		const holds = this.holdsForBoard(view);
		const totals = this.totalsForBoard(view);
		const ghosts = this.ghostsForArmed(view);
		const me = view.players[YOU];
		const them = view.players[THEM];
		const deploying = view.phase === 'deploy' && !playback && !judged;
		const ordering = view.phase === 'orders' && !playback;
		// sites accept a click for the whole of your deploy turn, not only when something is
		// armed: the interface principle is that every click says why, and a site that
		// silently ignores a click explains nothing.
		const clickable = deploying && view.turn === YOU;

		const units = ordering ? flattenBoard(view).filter((u) => u.seat === YOU) : [];
		const preview = ordering ? orderPreview(view, me.orders, YOU) : [];
		const holdingIds = [...me.holding, ...them.holding];

		// during Orders every one of your figures wears the act it will perform
		const badges = {};
		if (ordering) {
			units.forEach((u) => {
				const chosen = (me.orders && me.orders[u.recordId]) || u.prepared.favoredAct.action;
				const act = u.prepared.acts.find((a) => a.action === chosen);
				badges[u.recordId] = chosen === 'hold' ? 'hold' : `${chosen}${act ? ` ${act.magnitude}` : ''}`;
			});
		}
		// what to light on the table: the preview line under the pointer, or the event
		// being narrated during resolution
		const highlights = {};
		if (this.state.hoverRow) {
			highlights.hover = this.state.hoverRow.target ? this.state.hoverRow.target.recordId : null;
			highlights.acting = this.state.hoverRow.unit.recordId;
		}
		if (playback && playback.current && classifyEvent(playback.current) === 'act') {
			highlights.acting = playback.current.recordId;
			highlights.hit = playback.current.target || null;
			highlights.flash = flashFor(playback.current.outcome);
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
							hiddenEnemyCount={deploying || ordering ? (them.hiddenSentThisRound || 0) : 0}
							badges={badges}
							highlights={highlights}
							hoverSiteId={this.state.hoverSiteId}
							onSiteClick={this.handleSiteClick}
							onFigureClick={(entry, seat, site) => this.inspectRecord(entry.record, site)}
						/>

						{ordering && !simple && (
							<div className="rec-orders-bar rec-rise" data-orders-bar>
								<span className="rec-orders-bar-text">
									{me.committed
										? 'Your orders are sealed. The rival is giving its own.'
										: 'Deploy is over. Every creature on the table has an act by nature; change any in the panel, then give orders.'}
								</span>
								<button type="button" className="g-btn g-btn--primary" onClick={this.commitOrders} disabled={me.committed} data-give-orders>
									{me.committed ? 'Orders given' : 'Give orders'}
								</button>
							</div>
						)}

					</div>

					{showRail && (
					<div className="rec-rail">
						{deployPanelOpen && !inspect && (
							<ReclamationDeploy
								view={view}
								you={YOU}
								squad={this.squad}
								mode={simple ? 'simple' : 'advanced'}
								armedRecordId={this.state.armedRecordId}
								recommendation={rec}
								sendHidden={this.state.sendHidden}
								relocating={this.state.relocating}
								vanguard={me.canRelocateVanguard && me.vanguardRecordId ? this.findRecordOnBoard(this.state.match, me.vanguardRecordId) : null}
								hoverSiteId={this.state.hoverSiteId}
								onArm={this.armRecord}
								onDisarm={() => this.setState({ armedRecordId: null, sendHidden: false })}
								onInspect={(record) => this.inspectRecord(record, null)}
								onHoverRecord={(id) => this.setState({ hoverRecordId: id })}
								onHoverSite={(id) => this.setState({ hoverSiteId: id })}
								onSend={this.handleSiteClick}
								onToggleHidden={this.toggleHidden}
								onPass={this.handlePass}
								onBeginRelocate={this.beginRelocate}
								rivalBeat={this.rivalBeat()}
							/>
						)}
						{planPanelOpen && !inspect && (
							<aside className="g-panel rec-deploy rec-plan rec-rise" data-orders-bar aria-label="Orders">
								<header className="rec-deploy-head">
									<span className="g-kicker">Orders</span>
									<div className="rec-deploy-title">
										<h3 className="rec-deploy-heading">{me.committed ? 'Orders sealed' : 'By nature'}</h3>
										<p className="rec-deploy-lead g-body">
											{me.committed
												? 'Your orders are sealed. The rival is giving its own.'
												: units.length === 0
													? 'You have nothing in the frame. The rival acts alone.'
													: 'Each of your creatures acts by nature. Go, or change an order first.'}
										</p>
									</div>
								</header>
								{!me.committed && units.length > 0 && (
									<ul className="rec-orders-plan-list rec-plan-list">
										{preview.filter((row) => row.isYours).map((row) => (
											<li
												key={row.unit.recordId}
												className={row.ordered ? 'rec-orders-plan-item rec-orders-plan-item--ordered' : 'rec-orders-plan-item'}
												onMouseEnter={() => this.setState({ hoverRow: row })}
												onMouseLeave={() => this.setState({ hoverRow: null })}
											>
												{row.sentence}
											</li>
										))}
									</ul>
								)}
								<footer className="rec-deploy-foot rec-plan-foot">
									<button type="button" className="g-btn g-btn--primary rec-go-btn" onClick={this.commitOrders} disabled={me.committed} data-give-orders>
										{me.committed ? 'Orders given' : 'Go'}
									</button>
									{!me.committed && units.length > 0 && (
										<button type="button" className="g-btn rec-change-orders" onClick={() => this.setState({ ordersOpen: true })} data-change-orders>
											Change orders
										</button>
									)}
								</footer>
							</aside>
						)}
						{ordersPanelOpen && simple && (
							<button type="button" className="g-btn rec-plan-back" onClick={() => this.setState({ ordersOpen: false })} data-change-orders>
								Back to the plan
							</button>
						)}
						{ordersPanelOpen && (
							<ReclamationOrders
								units={units}
								orders={me.orders}
								preview={preview}
								onOrder={this.setOrder}
								onCommit={this.commitOrders}
								committed={me.committed}
								you={YOU}
								panelRef={this.ordersPanel}
								onHoverPreview={(row) => this.setState({ hoverRow: row })}
							/>
						)}
						{inspect && (
							<ReclamationInspect
								record={inspect.record}
								site={inspect.site}
								frame={view.frame}
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

// the word that pops over a creature as an act lands on it during playback
function flashFor(outcome) {
	const map = {
		routed: { kind: 'rout', text: 'routed' },
		staggered: { kind: 'stagger', text: 'staggered' },
		shrugged: { kind: 'shrug', text: 'shrugged' },
		shoved: { kind: 'shrug', text: 'shoved' },
		snared: { kind: 'stagger', text: 'snared' },
		terrorized: { kind: 'rout', text: 'withdraws' },
		'warded-absorbed': { kind: 'ward', text: 'warded' },
		'warded-ally': { kind: 'ward', text: 'warded' },
		'warded-self': { kind: 'ward', text: 'warded' },
		mended: { kind: 'ward', text: 'mended' },
		'anchored-immune': { kind: 'shrug', text: 'anchored' },
		'snared-immune': { kind: 'shrug', text: 'held fast' },
	};
	return map[outcome] || null;
}

// "1 site" reads better than "1 sites" on the verdict panel and in the log.
function plural(n, word) {
	return `${n} ${word}${n === 1 ? '' : 's'}`;
}

export default ReclamationMatch;
