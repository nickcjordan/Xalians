import React from 'react';
import ReclamationWorld from './reclamationWorld';
import ReclamationRoster from './reclamationRoster';
import ReclamationOrders from './reclamationOrders';
import ReclamationInspect from './reclamationInspect';
import ReclamationLog from './reclamationLog';
import {
	send, pass, relocateVanguard, order, commitOrders, getPublicState,
	createRngState, nextRandom,
} from '../../../gameplay/expedition/expeditionRules';
import { chooseSend, chooseOrders } from '../../../gameplay/expedition/expeditionBot';
import { prepare, magnitudeAgainst } from '../../../gameplay/expedition/creatureOnTable';
import { SENDABLE, SITES_TO_CLINCH, WORLDS_PER_MATCH } from '../../../gameplay/expedition/expeditionInterpretation';
import {
	speciesLabel, formatHold, classifyEvent, narrateAct, narrateRelocate,
	narrateSend, narratePass, narrateJudge, narrateMatchEnd,
} from './reclamationNarration';
import { orderPreview, flattenBoard, prepareWithCompanions, siteHoldTotal } from './reclamationPreview';

function capitalize(sentence) {
	return sentence ? sentence.charAt(0).toUpperCase() + sentence.slice(1) : sentence;
}

const BOT_DELAY_MS = 750;
const RESOLUTION_STEP_MS = 600;
const LOG_CAP = 120;
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
			judgedWorld: null,
			judgedSnapshot: null,
			judged: false,
			hoverRow: null, // the preview line under the pointer, to light its creatures
		};
		this.botRngState = createRngState(`${props.seed}-bot`);
		this.botTimer = null;
		this.noticeTimer = null;
		this.playbackTimer = null;
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
		[this.botTimer, this.noticeTimer, this.playbackTimer].forEach((t) => t && clearTimeout(t));
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
		view.world.sites.forEach((site) => {
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
		view.world.sites.forEach((site) => {
			siteTotals[site.id] = { A: siteHoldTotal(view, site.id, 'A'), B: siteHoldTotal(view, site.id, 'B') };
		});
		window.__reclamationDebug = {
			phase: view.phase,
			turn: view.turn,
			worldIndex: view.worldIndex,
			world: view.world.planet,
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
		base.world.sites.forEach((site) => {
			board[site.id] = { A: [], B: [] };
		});
		base.world.sites.forEach((site) => {
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
		const lines = [];

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
				match = relocated;
				publicState = getPublicState(match, THEM);
				action = chooseSend(publicState, match.players[THEM].roster, THEM, rngLike);
			}
		}

		let next = null;
		if (action.type === 'send') {
			const record = match.players[THEM].roster.find((r) => r.id === action.recordId);
			next = send(match, THEM, action.recordId, action.siteId, action.hidden);
			if (next) {
				lines.push(action.hidden
					? 'The rival sends something, hidden.'
					: `The rival sends ${speciesLabel(record)} to ${this.siteName(match, action.siteId)}.`);
			}
		} else {
			next = pass(match, THEM);
			if (next) {
				lines.push('The rival passes for this world.');
			}
		}

		if (!next) {
			// the engine should never refuse a bot action; say so rather than stall
			// eslint-disable-next-line no-console
			console.error('Reclamation bot produced an illegal action', action);
			next = pass(match, THEM);
			lines.push('The rival hesitates and passes.');
		}

		this.appendLogLines(lines);
		this.setState({ match: next }, this.afterEngineStep);
	};

	siteName = (match, siteId) => {
		const world = match.worlds[match.worldIndex];
		const site = world.sites.find((s) => s.id === siteId);
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
			this.notice('Deploy is over for this world. There is nothing left to send.');
			return;
		}
		if (match.players[YOU].passed) {
			this.notice('You have passed. Passing is permanent for this world.');
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
				this.notice('Your vanguard cannot fall back there. It must be a different site, and only once per world.');
				return;
			}
			const ev = next.resolutionLog[next.resolutionLog.length - 1];
			const record = this.findRecordOnBoard(match, ev.recordId);
			this.appendLog(narrateRelocate(ev, {
				actorName: record ? speciesLabel(record) : 'Your vanguard',
				fromSiteName: this.siteName(match, ev.fromSite),
				toSiteName: this.siteName(match, ev.toSite),
			}));
			this.setState({ match: next, relocating: false }, this.afterEngineStep);
			return;
		}
		if (!armedRecordId) {
			this.notice('Arm a creature from your roster first, then click a site to send it.');
			return;
		}
		if (match.phase !== 'deploy') {
			this.notice('Deploy is over for this world.');
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
		this.appendLog(narrateSend({
			you: true,
			actorName: speciesLabel(record),
			siteName: this.siteName(match, siteId),
			hidden: sendHidden,
		}));
		this.setState({ match: next, armedRecordId: null, sendHidden: false }, this.afterEngineStep);
	};

	findRecordOnBoard = (match, recordId) => {
		const world = match.worlds[match.worldIndex];
		for (const site of world.sites) {
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
				? 'You have already passed. Passing is permanent for this world.'
				: 'It is not your turn to pass.');
			return;
		}
		const next = pass(match, YOU);
		if (!next) {
			this.notice('You cannot pass right now.');
			return;
		}
		this.appendLog(narratePass({ you: true }));
		this.setState({ match: next, armedRecordId: null, relocating: false }, this.afterEngineStep);
	};

	beginRelocate = () => {
		const view = this.view();
		if (!view.players[YOU].canRelocateVanguard) {
			this.notice('Only this world’s starter may fall back, once, before passing.');
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
	// orders
	// ------------------------------------------------------------------
	setOrder = (recordId, actName) => {
		const { match } = this.state;
		if (match.committed[YOU]) {
			this.notice('Your orders are already sealed for this world.');
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
		const worldBefore = match.worlds[match.worldIndex];
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
		this.setState({
			match: next,
			playback: {
				events: newEvents,
				index: 0,
				world: worldBefore,
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
		const world = match.worlds[match.worldIndex];
		world.sites.forEach((site) => {
			['A', 'B'].forEach((seat) => {
				match.board[site.id][seat].forEach((e) => {
					if (index[e.recordId]) {
						return;
					}
					index[e.recordId] = {
						record: e.record,
						siteName: site.name,
						siteId: site.id,
						hold: prepare(e.record, site, world, e.sentIndex).hold,
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
			playback.world.sites.forEach((s) => { siteNames[s.id] = s.name; });
			this.appendLogLines(narrateJudge(event, { siteNames, you: YOU }));
			return;
		}
		if (kind !== 'act') {
			return;
		}
		const actor = snap[event.recordId];
		const target = event.target ? snap[event.target] : null;
		const site = event.site ? playback.world.sites.find((s) => s.id === event.site) : null;
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
		const world = this.state.playback ? this.state.playback.world : null;
		if (!world) {
			return undefined;
		}
		const site = world.sites.find((s) => s.id === actor.siteId);
		const prepared = prepare(actor.record, site, world, 0);
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
			nextWorld: match.phase === 'matchEnd' ? null : { planet: match.worlds[match.worldIndex].planet },
			winner: match.winner,
		};
		this.setState({
			playback: null,
			verdicts,
			judged: true,
			judgedWorld: playback.world.planet,
			judgedSnapshot: match.phase === 'matchEnd' ? judgedSnapshot : judgedSnapshot,
		});

		if (match.phase === 'matchEnd') {
			const view = getPublicState(match, YOU);
			// ENGINE GAP: matchEndReason is only 'clinched' or 'worlds-exhausted'; the engine
			// does not say when decideMatchWinner fell through to the tiebreak. Level sites
			// at the end is exactly that case, so the narration names it, matching the
			// verdict panel.
			const sitesYou = view.players[YOU].sitesWon;
			const sitesThem = view.players[THEM].sitesWon;
			const reason = match.matchEndReason === 'worlds-exhausted' && sitesYou === sitesThem
				? 'tiebreak'
				: match.matchEndReason;
			this.appendLog(narrateMatchEnd({ winner: match.winner, you: YOU, sitesYou, sitesThem, reason }));
		}
	};

	nextWorld = () => {
		this.setState({ verdicts: null, judged: false, judgedWorld: null, judgedSnapshot: null }, () => {
			const { match } = this.state;
			this.appendLog(`The expedition moves on to ${match.worlds[match.worldIndex].planet}.`);
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
		view.world.sites.forEach((site) => {
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
					};
				});
			});
		});
		return holds;
	}

	totalsForBoard(view) {
		const totals = {};
		view.world.sites.forEach((site) => {
			totals[site.id] = { A: siteHoldTotal(view, site.id, 'A'), B: siteHoldTotal(view, site.id, 'B') };
		});
		return totals;
	}

	ghostsForArmed(view) {
		const { armedRecordId } = this.state;
		if (!armedRecordId) {
			return null;
		}
		const record = view.players[YOU].roster.find((r) => r.id === armedRecordId);
		if (!record) {
			return null;
		}
		const ghosts = {};
		view.world.sites.forEach((site) => {
			const prepared = prepare(record, site, view.world, view.players[YOU].sentCount);
			ghosts[site.id] = {
				hold: prepared.hold,
				strainLevel: prepared.strainLevel,
				isHome: prepared.isHome,
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
			return 'The Court has ruled. Reveal the next world when you are ready.';
		}
		if (view.phase === 'orders') {
			return view.players[YOU].committed
				? 'Your orders are sealed.'
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
			return `${speciesLabel(record)} is armed. Click a site to send it there, or press Escape to put it back.`;
		}
		if (view.players[YOU].passed) {
			return 'You have passed. Waiting on the rival.';
		}
		return 'Click a creature in your roster to arm it, then click a site. Or pass.';
	}

	turnText(view) {
		if (this.state.playback) {
			return 'Resolving';
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
		const yourTurn = ((view.turn === YOU && view.phase === 'deploy') || (view.phase === 'orders' && !view.players[YOU].committed)) && !this.state.playback && !this.state.judged;
		const waiting = view.turn === THEM && view.phase === 'deploy' && !this.state.playback && !this.state.judged;
		const phaseLabel = this.state.playback ? 'Resolve'
			: view.phase === 'matchEnd' ? 'Charter'
				: this.state.judged ? 'Judge'
					: view.phase === 'orders' ? 'Orders' : 'Deploy';
		const pips = (n) => Array.from({ length: SITES_TO_CLINCH }).map((_, i) => (
			<span className={`rec-pip${i < n ? ' rec-pip--lit' : ''}`} key={i} />
		));
		const worldDots = Array.from({ length: WORLDS_PER_MATCH }).map((_, i) => (
			<span className={`rec-world-dot${i === view.worldIndex ? ' rec-world-dot--now' : i < view.worldIndex ? ' rec-world-dot--done' : ''}`} key={i} />
		));
		return (
			<div className={`g-panel rec-status g-el-${view.world.element}`}>
				<div className="rec-status-world">
					<span className="rec-world-dots" title={`World ${view.worldIndex + 1} of ${WORLDS_PER_MATCH}`}>{worldDots}</span>
					<h2 className="rec-status-planet">{view.world.planet}</h2>
					<span className="g-chip rec-status-element">{view.world.element}</span>
					<span className="rec-status-next g-mono">
						{view.nextWorld ? `then ${view.nextWorld.planet}` : 'the last world'}
					</span>
				</div>

				<div className="rec-status-score" title={`First to ${SITES_TO_CLINCH} sites takes the Charter`}>
					<span className="rec-score rec-score--mine">
						<span className="rec-score-label">You</span>
						<span className="rec-pips">{pips(you.sitesWon)}</span>
						<span className="rec-score-value" data-sites-a>{you.sitesWon}</span>
					</span>
					<span className="rec-score rec-score--theirs">
						<span className="rec-score-label">Rival</span>
						<span className="rec-pips">{pips(them.sitesWon)}</span>
						<span className="rec-score-value" data-sites-b>{them.sitesWon}</span>
					</span>
					<span className="rec-score-of">{SITES_TO_CLINCH} sites clinch</span>
				</div>

				<div className="rec-status-turn">
					<span className="rec-status-phase">{phaseLabel}</span>
					<span className={`rec-turn${yourTurn ? ' rec-turn--yours' : ''}${waiting ? ' rec-turn--waiting' : ''}`}>
						<span className={`g-lamp ${yourTurn ? 'g-lamp--amber' : waiting ? 'g-lamp--red' : 'g-lamp--off'}`} />
						<span className="rec-turn-text" data-turn-text>{this.turnText(view)}</span>
					</span>
				</div>

				<p className={`rec-status-hint g-body${yourTurn ? ' rec-status-hint--yours' : ''}`} data-hint>{this.whatAClickDoes(view)}</p>
			</div>
		);
	}

	renderDeployControls(view) {
		const me = view.players[YOU];
		const them = view.players[THEM];
		const armed = this.state.armedRecordId
			? me.roster.find((r) => r.id === this.state.armedRecordId)
			: null;
		const armedStealthy = armed
			&& [...(armed.traits.guaranteed || []), ...(armed.traits.rolled || [])].includes('stealthy');
		const yourTurn = view.turn === YOU && view.phase === 'deploy' && !this.state.playback;
		const vanguard = me.canRelocateVanguard && me.vanguardRecordId
			? this.findRecordOnBoard(this.state.match, me.vanguardRecordId)
			: null;

		return (
			<div className="rec-deploy-controls">
				{armedStealthy && (
					<label className="g-check rec-hidden-toggle" title="A stealthy creature may be sent hidden: the rival learns that you sent something, not what or where, until orders are revealed.">
						<input type="checkbox" checked={this.state.sendHidden} onChange={this.toggleHidden} data-hidden-toggle />
						<span className="g-check-box" />
						<span>Send hidden</span>
					</label>
				)}
				{them.passed && !me.passed && (
					<span className="rec-deploy-note rec-deploy-note--open">The rival has passed. Nothing you send now can be answered.</span>
				)}
				{vanguard && (
					<button
						type="button"
						className={`g-btn rec-fallback-btn${this.state.relocating ? ' rec-fallback-btn--active' : ''}`}
						onClick={this.beginRelocate}
						disabled={!yourTurn}
						data-fallback
						title="You placed your first creature knowing nothing. Once per world it may fall back to another site, without spending your turn."
					>
						{this.state.relocating ? 'Choose a site' : `Fall back ${speciesLabel(vanguard)}`}
						<span className="rec-btn-sub">free move, once this world</span>
					</button>
				)}
				<button
					type="button"
					className="g-btn rec-pass-btn"
					onClick={this.handlePass}
					disabled={!yourTurn}
					data-pass
					title="Pass is permanent for this world."
				>
					Pass for this world
					<span className="rec-btn-sub">permanent, ends your deploy here</span>
				</button>
			</div>
		);
	}

	renderVerdictPanel(view) {
		const won = this.state.match.winner === YOU;
		const reason = this.state.match.matchEndReason;
		const why = reason === 'clinched'
			? 'clinched at five sites'
			: view.players[YOU].sitesWon === view.players[THEM].sitesWon
				? 'level on sites and settled on the tiebreak'
				: 'after the third world';
		return (
			<div className={`g-panel rec-verdict ${won ? 'rec-verdict--won' : 'rec-verdict--lost'}`} data-verdict>
				<span className="g-kicker">The Charter</span>
				<h2 className="rec-verdict-title">{won ? 'The Charter is yours.' : 'The rival takes the Charter.'}</h2>
				<p className="g-body rec-verdict-body">
					{plural(view.players[YOU].sitesWon, 'site')} to {view.players[THEM].sitesWon}, with {why}.
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
			<div className="rec-match">
				{this.renderStatusStrip(view)}

				{notice && <div className="g-notice g-notice--alert rec-notice" role="status" data-notice>{notice}</div>}

				<div className="rec-body">
					<div className="rec-table">
						<ReclamationWorld
							world={view.world}
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
							holdingIds={holdingIds}
							hiddenEnemyCount={deploying || ordering ? (them.hiddenSentThisRound || 0) : 0}
							badges={badges}
							highlights={highlights}
							onSiteClick={this.handleSiteClick}
							onFigureClick={(entry, seat, site) => this.inspectRecord(entry.record, site)}
						/>

						{deploying && (
							<div className="rec-deploy-bar">
								<ReclamationRoster
									roster={me.roster}
									you={YOU}
									armedRecordId={this.state.armedRecordId}
									onArm={this.armRecord}
									onInspect={(record) => this.inspectRecord(record, null)}
									sendsLeft={Math.max(0, SENDABLE - me.sentCount)}
									disabled={view.turn !== YOU || me.passed}
									yourTurn={view.turn === YOU && !me.passed}
								/>
								{this.renderDeployControls(view)}
							</div>
						)}

						{ordering && (
							<div className="rec-orders-bar" data-orders-bar>
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

						{playback && (
							<div className="rec-resolving">
								<span className="g-label">Resolving in initiative order, {playback.index} of {playback.events.length}</span>
								<button type="button" className="g-btn rec-skip-btn" onClick={this.skipPlayback} data-skip>Skip</button>
							</div>
						)}

						{judged && view.phase !== 'matchEnd' && (
							<div className="rec-judge-bar">
								<span className="g-label">The Court has ruled on {this.state.judgedWorld || 'the world'}.</span>
								<button type="button" className="g-btn g-btn--primary" onClick={this.nextWorld} data-next-world>
									Next world: {view.nextWorld ? view.nextWorld.planet : view.world.planet}
								</button>
							</div>
						)}

						{view.phase === 'matchEnd' && this.renderVerdictPanel(view)}
					</div>

					<div className="rec-rail">
						{ordering && (
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
								world={view.world}
								onClose={() => this.setState({ inspect: null })}
							/>
						)}
						<ReclamationLog lines={this.state.log} />
					</div>
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
