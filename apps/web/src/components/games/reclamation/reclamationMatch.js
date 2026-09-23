import React from 'react';
import ReclamationWorld from './reclamationWorld';
import ReclamationBench from './reclamationBench';
import ReclamationInspect from './reclamationInspect';
import ReclamationLog from './reclamationLog';
import { HelpPanel, HistoryPanel, SettingsPanel } from './reclamationPanels';
import { ReclamationReport, buildMatchReport } from './reclamationReport';
import {
	send, pass, moveSwift, stakeWorld, getPublicState, forecastClash,
	createRngState, nextRandom,
} from '@xalians/rules/expedition/expeditionRules';
import { chooseSend, chooseStake, rivalById, DEFAULT_RIVAL_ID } from '@xalians/rules/expedition/expeditionBot';
import { prepare, strainMultiplierFor } from '@xalians/rules/expedition/creatureOnTable';
import { SENDABLE, clinchFor, FRAMES_PER_MATCH } from '@xalians/rules/expedition/expeditionInterpretation';
import {
	speciesLabel, formatHold, formatHoldShown, formatBlow, classifyEvent, narrateEvent, cueForEvent, narrateSwiftMove,
	narrateSend, narratePass, narrateJudge, narrateMatchEnd, narrateStake, countWord, captionEvent,
	verdictOf, rulingLine,
} from './reclamationNarration';
import { flattenBoard, prepareWithCompanions, siteHoldTotal, ghostPlanFor, ownSweepsFor } from './reclamationPreview';

// pass 38: the top bar's short form of each pass reason; the full sentence is the button's title
const PASS_SHORT = {
	'holding-majority': 'you lead on two worlds and the rival has passed',
	'saving-the-roster': 'keep your remaining sends for the rounds to come',
	'nothing-to-gain': 'no send would change a world this round',
	'no-sendable-creatures': 'you have nothing left to send',
};
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

/*
	PASS 12. What is still reachable, said in one sentence.

	The rubric critic scored "a reason to keep playing" 4 of 10: shut out on every world of
	round 3, nothing on the screen gave a reason to take the turn. The answer is not a gift
	to the side behind (ruled out, and rightly) but arithmetic the player could do
	themselves and should not have to.

	Worlds still to be ruled on: the ones in this round that have not been awarded, plus
	three for every round after it. Against those, each side's distance from the clinch.
	Four cases, and the wording is deliberately flat in all four, because a losing player
	being told they can still win reads as condescension if it is dressed up:

	- the Proving can still be taken: say what it would take,
	- it can no longer be taken but can still be drawn: say that,
	- it is already decided on worlds: say so plainly rather than letting the player find
	  out by playing three more sends for nothing,
	- it is close for both: say nothing, because the score already says it.

	A staked world counts two, so the arithmetic reads the counted value rather than the
	number of worlds. This never announces a rule the player does not have; it only counts.
*/
export function reachabilityLine(view, you, them) {
	if (!view || !view.frame || view.phase === 'matchEnd') {
		return null;
	}
	const perRound = view.frame.sites.length;
	const roundsAfterThis = Math.max(0, FRAMES_PER_MATCH - (view.frameIndex + 1));
	/*
		This round's worlds are still open while the Court has not ruled on them, and settled
		once it has. During Deploy they count; at the Ruling and while its result is on the
		table they do not, or the line would tell a player a world is still winnable after it
		has been awarded.
	*/
	const thisRoundStillOpen = view.phase === 'deploy' || view.phase === 'resolve';
	const worldsLeft = (thisRoundStillOpen ? perRound : 0) + roundsAfterThis * perRound;
	if (worldsLeft <= 0) {
		return null;
	}
	// PASS 15: the clinch is a majority of the worlds on offer, read off the live frame, so
	// a narrower frame prints the bar it is actually playing to.
	const toClinch = clinchFor(perRound, FRAMES_PER_MATCH);
	const yourNeed = toClinch - you.sitesWon;
	const theirNeed = toClinch - them.sitesWon;
	const behind = you.sitesWon < them.sitesWon;

	/*
		PASS 39. Worlds are not the only limit: every world you win needs a creature on it, and
		sends are a budget for the whole game. A blind critic reached round three needing three
		worlds with two sends left while the line still read "you need 3 more of the 3 worlds
		left". This is an upper bound on what you could still count, so the line only calls a
		game lost when it certainly is: the worlds you already stand on this round, one more
		per send you could still make (the trailing bonus included for every round it could
		come), and two more if your stake is unused (a world both sides staked counts three).
	*/
	if (you.isSelf !== false && typeof you.sentCount === 'number') {
		const rules = view.rules || {};
		const bonusRounds = roundsAfterThis + (thisRoundStillOpen ? 1 : 0);
		const sendsMax = Math.max(0, (typeof rules.sendable === 'number' ? rules.sendable : SENDABLE) - you.sentCount)
			+ (rules.trailingBonus || 0) * bonusRounds;
		const inHand = Array.isArray(you.roster) ? you.roster.length : (typeof you.rosterCount === 'number' ? you.rosterCount : sendsMax);
		const standing = thisRoundStillOpen
			? view.frame.sites.filter((site) => (((view.board || {})[site.id] || {})[view.players && view.players.B === you ? 'B' : 'A'] || []).some((e) => e.record && !e.downed)).length
			: 0;
		/*
			PASS 47. A pass closes THIS round only. The first version counted no new worlds at
			all once you had passed, so through every Clash, even in round one at 0 to 0, the
			line told a blind critic the game was already lost. New worlds are one per creature
			still sendable, placed in this round's empty worlds (unless you passed) or in the
			rounds still to come.
		*/
		const avail = Math.min(sendsMax, inHand);
		const openThisRound = thisRoundStillOpen && !you.passed ? perRound - standing : 0;
		const stakeBonus = !you.stakeUsed && (roundsAfterThis > 0 || (you.stakeableSiteIds || []).length > 0) ? 2 : 0;
		const reachable = standing + Math.min(avail, openThisRound + roundsAfterThis * perRound) + stakeBonus;
		if (yourNeed > reachable && yourNeed > 0) {
			return {
				tone: 'lost',
				text: avail > 0
					? `Out of reach: you need ${yourNeed} more ${yourNeed === 1 ? 'world' : 'worlds'} and can send only ${plural(avail, 'more creature')}.`
					: `Out of reach: you need ${yourNeed} more ${yourNeed === 1 ? 'world' : 'worlds'} and have no sends left.`,
			};
		}
	}

	// already out of reach on worlds: the rival cannot be caught even by taking every one
	if (yourNeed > worldsLeft && theirNeed <= worldsLeft) {
		return {
			tone: 'lost',
			text: `Winning is out of reach: you need ${yourNeed}, with ${plural(worldsLeft, 'world')} left. Worlds still count toward the record.`,
		};
	}
	if (theirNeed > worldsLeft && yourNeed <= worldsLeft) {
		return {
			tone: 'won',
			text: `The rival can no longer clinch: they need ${theirNeed}, with ${plural(worldsLeft, 'world')} left.`,
		};
	}
	// still live, and the player is behind: say exactly what it would take
	if (behind && yourNeed <= worldsLeft) {
		return {
			tone: 'behind',
			text: `You need ${yourNeed} more of the ${worldsLeft} worlds left to win.`,
		};
	}
	return null;
}

/*
	The two seats. `YOU` and `THEM` are the SOLO reading of the table: the person at the
	keyboard holds A and the proctor holds B.

	PASS 20 adds hot-seat, where two people share one screen, and the table must then show
	whichever of them is currently to move. Rather than thread a seat through sixty-four call
	sites, the component reads `this.you` / `this.them`, which are these constants in solo
	play and the live seats in hot-seat. The constants stay as the default so every existing
	reading of the table is unchanged when nobody is sharing the keyboard.
*/
const YOU = 'A';
const THEM = 'B';
const OTHER_SEAT = { A: 'B', B: 'A' };

/*
	ReclamationMatch — the whole table.

	The engine is a pure state-in / state-out machine, so this component only holds the
	match state, turns clicks into engine calls, drives the bot on a timer, and plays the
	resolution log back one event at a time.

	THE BASE (docs/design/reclamation-base-redesign.md). The round is Deploy, Clash,
	Ruling, and only Deploy is a phase anyone sits in: the Clash and the Ruling run inside
	the engine's pass() the moment the second handler passes. So there is no Orders panel and
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
			/*
				PASS 25, ACT FLIP. The behaviour the handler has chosen for the armed creature,
				or null for its natural one. Cleared whenever the arming changes, so a choice
				can never leak onto a different creature.
			*/
			armedRole: null,
			// assumption 20: the swift creature armed to move, if any. A move does not spend
			// the turn, so this is its own arming, separate from armedRecordId.
			movingRecordId: null,
			// assumption 22: the world whose Stake control was pressed, waiting on the
			// inline confirm in the status strip. A stake is once per Proving, so it is
			// never taken on one click.
			pendingStakeSiteId: null,
			// pass 38: the stake is one key in the squad bar; the worlds offer it only while it is open
			stakeMode: false,
			inspect: null, // { record, site }
			// resolution playback
			playback: null, // { events, index, snapshotBoard, hurtAt }
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
			// PASS 21, hot-seat only: { seat } while the board is covered between two people
			handoff: null,
		};
		/*
			PASS 20. THE SEAT THE TABLE IS DRAWN FOR.

			Solo play has one reading: the person at the keyboard holds A and the proctor holds
			B, which is what YOU and THEM have meant since the table was built. Hot-seat (two
			people, one screen) needs the table to show whichever of them is to move, so the
			seat becomes a value the component reads rather than a constant it is compiled
			against.

			`seatInPlay` is that value. With no `hotSeat` prop it is always YOU, so every one of
			this component's readings is byte-identical to before; the indirection is here so
			the hand-off screen can land in its own pass without touching sixty-four call sites
			at the same time as the rest of the feature.

			Hiding is why hot-seat needs a hand-off at all rather than just a flipped view:
			16.8 percent of sends arrive hidden, and removing hiding moves the flip gauge
			+2.46 +/- 0.98, beyond noise. A shared screen cannot keep a secret, so the two
			people have to be separated by a screen that hides the board between turns, and
			validating the game means validating it WITH hiding, not a variant without.
		*/
		this.hotSeat = !!props.hotSeat;
		// the seat the table was last drawn for, so the Clash and the Ruling stay with
		// whoever just moved instead of flipping under a playback both people are reading
		this.lastSeatInPlay = YOU;
		// hot-seat: the seat whose board is currently uncovered. The first person does not
		// need to be handed the keyboard they are already holding, so the opening seat counts
		// as shown.
		this.seatShown = props.initialMatch ? props.initialMatch.turn : YOU;
		// your twelve in slot order, held for the whole expedition so the roster never reshuffles
		this.squad = props.squad ? props.squad.slice() : props.initialMatch.players[YOU].roster.slice();
		/*
			PASS 21. In hot-seat the bench belongs to whichever person is moving, so each seat
			needs its own slot order held for the whole Proving. `this.squad` is seat A's, kept
			as it was so solo play is untouched; seat B's is taken from the match at the start
			for the same reason - the roster shrinks as creatures are sent, and the bench must
			not reshuffle under the player.

			Without this the table drew seat B's turn with seat A's squad, so seat B had no
			creature it could arm and no control to press: Deploy stalled with the turn on B and
			nothing on screen to do. The paint check found that; reading the code did not.
		*/
		this.squadB = props.initialMatch.players[THEM].roster.slice();
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
		/*
			PASS 27. The open dossier is dropped when the round changes.

			A blind critic reading the end-of-match screen found the inspector still showing
			"KOSANOS, read on STONERA" - a creature and a world from round one, two rounds
			stale, beside a Charter awarding worlds it never mentioned. `inspect` was only ever
			cleared by Escape or the close button, so it survived every Ruling. A panel showing
			a creature at a world that is no longer on the table is worse than no panel.
		*/
		if (prevState.match.frameIndex !== this.state.match.frameIndex && this.state.inspect) {
			this.setState({ inspect: null });
		}
		if (this.state.match.phase === 'matchEnd' && this.state.inspect) {
			this.setState({ inspect: null });
		}
		/*
			PASS 21. Hot-seat's hand-off has to be raised on more occasions than the bot's turn
			was scheduled on. The bot only ever needed waking when the match state changed
			outside playback; a hand-off is also due when playback or the Ruling ENDS, because
			the seat to move has usually changed by then and that update carried no match
			change of its own. Without this the cover was raised once, for seat B, and the
			Proving then stalled with neither person prompted - caught by the paint check
			rather than by reading this code.
		*/
		if (this.hotSeat) {
			const leftPlayback = prevState.playback && !this.state.playback;
			const leftJudged = prevState.judged && !this.state.judged;
			if (leftPlayback || leftJudged) {
				this.raiseHandoffIfDue();
			}
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
						hurt: !!e.hurt,
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
			// the event being told right now, so a check can wait for one kind of moment
			// (a recovery, say) rather than guessing at a timer
			currentEvent: this.state.playback && this.state.playback.current
				? this.state.playback.current.type : null,
			rosterIds: (view.players[YOU].roster || []).map((r) => r.id),
			format: formatHold,
			telemetry: () => this.props.telemetry && this.props.telemetry.snapshot(),
		};
	};

	/*
		The engine's Clash AND Ruling run inside one pass() call, so the moment the second
		handler passes the live state has already moved to the next world. Replaying the
		round against that state would draw the wrong board, so while playback runs the
		table renders a FROZEN copy of the view as it stood the instant before the clash,
		with every hurt, downing and recovery applied by the events replayed so far. Once
		playback ends, the held Ruling view takes its board from the engine's judge event;
		the live view takes over only when the player advances to the next world.
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
		return getPublicState(this.state.match, this.seatInPlay());
	}

	/*
		PASS 20. Which seat the table is currently drawn for, and its opponent.

		Solo: always YOU / THEM, unchanged. Hot-seat: the seat to move during Deploy, so each
		person sees their own bench and their own hidden sends. Outside Deploy (the Clash, the
		Ruling, the Charter) both people watch the same thing, so the view stays with whoever
		was last to move rather than flipping under a playback they are both reading.
	*/
	seatInPlay = () => {
		if (!this.hotSeat) {
			return YOU;
		}
		const { match } = this.state;
		if (match.phase === 'deploy' && (match.turn === 'A' || match.turn === 'B')) {
			this.lastSeatInPlay = match.turn;
			return match.turn;
		}
		return this.lastSeatInPlay;
	};

	seatOpponent = () => OTHER_SEAT[this.seatInPlay()];

	/*
		The pre-clash view with every effect of the events told so far applied: each
		creature at the hold the last attack left it with (the event's own `remaining`),
		downed ones off the world, hit ones flagged hurt, recovered ones lifted back by
		their `recover` event, and a rival's hidden send revealed the moment it acts
		(assumption 9: hidden creatures are revealed when they act, not before).

		The balance bar and the bulbs both read off this, so the world moves by each
		number as it is told, which is the whole of "the Clash told per world".
	*/
	applyPlaybackEffects(playback) {
		return playbackEffects(playback.frozenView, playback.events, playback.index);
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
			if (this.state.panel) {
				this.setState({ panel: null });
				return;
			}
			if (this.state.armedRecordId || this.state.movingRecordId || this.state.inspect || this.state.pendingStakeSiteId || this.state.stakeMode) {
				this.setState({
					armedRecordId: null, armedRole: null, movingRecordId: null, inspect: null, pendingStakeSiteId: null, stakeMode: false,
				});
			}
			return;
		}
	};

	// ------------------------------------------------------------------
	// the bot
	// ------------------------------------------------------------------
	scheduleBotIfDue = () => {
		const { match } = this.state;
		/*
			PASS 21. In hot-seat there is no bot: the other seat is a person, so instead of
			scheduling a turn we raise the hand-off and wait to be told the right person is
			looking. Everything else about the turn is identical, which is the point of hot-seat
			as a validation instrument: two people play the shipped game, not a variant.
		*/
		if (this.hotSeat) {
			this.raiseHandoffIfDue();
			return;
		}
		if (match.phase === 'deploy' && match.turn === THEM) {
			if (this.botTimer) {
				clearTimeout(this.botTimer);
			}
			this.botBeatStartedAt = Date.now();
			this.botTimer = setTimeout(this.runBotDeployTurn, BOT_DELAY_MS);
		}
	};

	/*
		THE HAND-OFF (pass 21). Two people at one screen cannot share hidden information, and
		hiding is not optional: 16.8 percent of sends arrive hidden, and switching hiding off
		moves the flip gauge +2.46 +/- 0.98, beyond noise. A hot-seat that revealed everything
		would validate a different game from the one being shipped.

		So the board is covered whenever the seat to move changes, and uncovered only when
		someone presses through. The cover names who should be looking and says nothing else
		about the position - not the score, not the worlds, not whose creatures are where -
		because a cover that leaks is worse than no cover, the player having trusted it.

		It is raised on a CHANGE of seat, not on every turn: a handler who sends twice in a row
		(the engine allows it while the other has passed) is not handing anything over.
	*/
	raiseHandoffIfDue = () => {
		const { match, handoff } = this.state;
		if (match.phase !== 'deploy' || (match.turn !== 'A' && match.turn !== 'B')) {
			return;
		}
		if (handoff) {
			return; // already covered, waiting on a press
		}
		if (this.seatShown === match.turn) {
			return; // same person still moving
		}
		this.setState({ handoff: { seat: match.turn }, armedRecordId: null, armedRole: null, movingRecordId: null });
	};

	// the other person has the keyboard: uncover the board for their seat
	takeHandoff = () => {
		const { match } = this.state;
		this.seatShown = match.turn === 'A' || match.turn === 'B' ? match.turn : this.seatShown;
		this.setState({ handoff: null });
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
		let moved = null;

		let publicState = getPublicState(match, THEM);

		/*
			THE STAKE (assumption 22), on the rival's turn before its first send of the
			round. Staking does not spend the turn, so it is applied first and the bot is
			then asked for its send as normal. The engine drives the legality; chooseStake
			only ever names a world the rival's own `stakeableSiteIds` allows.
		*/
		const stakeChoice = chooseStake(publicState, match.players[THEM].roster, THEM, this.rival);
		if (stakeChoice && stakeChoice.siteId) {
			const staked = stakeWorld(match, THEM, stakeChoice.siteId);
			if (staked) {
				const worldName = this.worldName(match, stakeChoice.siteId);
				const counted = getPublicState(staked, THEM).stakes[stakeChoice.siteId].countedValue;
				const sentence = narrateStake({ you: false, worldName, countedValue: counted });
				lines.push(sentence);
				this.beat({
					kind: 'rival-stake',
					seat: THEM,
					short: 'The rival staked',
					siteId: stakeChoice.siteId,
					text: sentence,
				});
				match = staked;
				publicState = getPublicState(match, THEM);
			}
		}

		let action = chooseSend(publicState, match.players[THEM].roster, THEM, rngLike, this.rival);

		// a swift move does not consume the turn: apply it, then ask again for the send/pass
		if (action.type === 'move') {
			const record = this.findRecordOnBoard(match, action.recordId);
			const next = moveSwift(match, THEM, action.recordId, action.siteId);
			if (next) {
				const ev = next.resolutionLog[next.resolutionLog.length - 1];
				const from = this.siteName(match, ev.from);
				const to = this.siteName(match, ev.to);
				const sentence = narrateSwiftMove(ev, {
					actorName: `The rival's ${speciesLabel(record)}`,
					fromSiteName: from,
					toSiteName: to,
				});
				lines.push(sentence);
				moved = { sentence, recordId: ev.recordId, siteId: ev.to };
				arrivals.push(ev.recordId);
				match = next;
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
					text: moved ? `${moved.sentence} ${sentence}` : sentence,
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
					text: moved
						? `${moved.sentence} The rival passes for this round.`
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
		// pass 38: the rival's move stays readable in the instruction line until you answer it
		this.setState({ lastRival: beat ? beat.text.replace(/ Nothing you send now can be answered\.$/, '') : null });
		this.cue('rival');
		if (arrivals.length > 0) {
			this.arrive(arrivals, (moved && !beat.siteId) ? moved.siteId : beat.siteId, THEM);
		}
		this.beat(beat);
		this.commitStep(before, next, {});
	};

	siteName = (match, siteId) => {
		const frame = match.frames[match.frameIndex];
		const site = frame.sites.find((s) => s.id === siteId);
		// pass 38: the planet, as the board heads each world; the site's own name is flavor for advanced mode
		return site ? site.world.planet : siteId;
	};

	// the planet a site stands on: what the stake is named by, since a stake is on the
	// world and not on the patch of ground the frame loaded
	worldName = (match, siteId) => {
		const frame = match.frames[match.frameIndex];
		const site = frame.sites.find((s) => s.id === siteId);
		return site ? site.world.planet : siteId;
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
	/*
		"Is it the player's turn to deploy?" - the gate every control on the bench reads.

		PASS 21: in hot-seat the player is whichever person is moving, so this asks about the
		seat in play rather than about seat A. Solo play is unchanged because seatInPlay()
		returns YOU with no hotSeat prop. Before this, seat B's turn drew a table with no armed
		creature and no pass button, and Deploy stalled with nothing on screen to press.
	*/
	isYourDeployTurn() {
		const { match } = this.state;
		return match.phase === 'deploy' && match.turn === this.seatInPlay() && !this.state.playback;
	}

	// pass 25: choosing which behaviour the armed creature will use. Only legal while a
	// creature is armed, and only for a role its own record can support (the engine checks
	// that too, so a stale choice can never produce an illegal send).
	chooseRole = (role) => {
		if (!this.state.armedRecordId) {
			return;
		}
		this.setState((prev) => ({ armedRole: prev.armedRole === role ? null : role }));
	};

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
		if (match.players[this.seatInPlay()].passed) {
			this.notice('You have passed. Passing is permanent for this round.');
			return;
		}
		if (match.turn !== this.seatInPlay()) {
			this.notice('It is the rival’s turn. Wait for it to move.');
			return;
		}
		if (match.players[this.seatInPlay()].sentCount >= SENDABLE) {
			this.notice(`You have sent all ${SENDABLE} creatures a Proving allows. The rest are your reserve.`);
			return;
		}
		if (this.state.armedRecordId !== recordId) {
			this.cue('lift');
		}
		this.setState((prev) => ({
			armedRecordId: prev.armedRecordId === recordId ? null : recordId,
			// pass 25: arming a different creature drops any behaviour chosen for the last one
			armedRole: null,
			movingRecordId: null,
			/*
				pass 37: lifting a creature closes the dossier. On one screen the dossier is a
				drawer over the right of the table, and a creature in hand is about to be sent,
				so every world has to be pressable.
			*/
			inspect: null,
		}));
	};

	handleSiteClick = (siteId) => {
		const { match, armedRecordId, movingRecordId } = this.state;
		if (this.state.playback) {
			this.notice('The round is still resolving.');
			return;
		}
		if (movingRecordId) {
			const record = this.findRecordOnBoard(match, movingRecordId);
			const next = moveSwift(match, this.seatInPlay(), movingRecordId, siteId);
			if (!next) {
				this.notice('It cannot move there. It must be another world of the frame, and a swift creature moves only once a round.');
				return;
			}
			const ev = next.resolutionLog[next.resolutionLog.length - 1];
			const line = narrateSwiftMove(ev, {
				actorName: record ? speciesLabel(record) : 'Your swift creature',
				fromSiteName: this.siteName(match, ev.from),
				toSiteName: this.siteName(match, ev.to),
			});
			this.appendLog(line);
			this.arrive([ev.recordId], ev.to, YOU);
			this.beat({ kind: 'your-relocate', seat: YOU, short: 'Moved', text: line });
			if (this.props.telemetry) {
				// a swift move does not spend the deploy turn (see the class doc comment), so
				// the decision window is closed as 'move' and immediately reopened: the player
				// is still mid-turn and will send or pass next.
				this.props.telemetry.decisionEnd('deploy', 'move', { round: match.frameIndex });
				this.props.telemetry.decisionStart('deploy', { round: match.frameIndex });
			}
			this.setState({ match: next, movingRecordId: null }, this.afterEngineStep);
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
		if (match.turn !== this.seatInPlay()) {
			this.notice('It is the rival’s turn.');
			return;
		}
		const record = match.players[this.seatInPlay()].roster.find((r) => r.id === armedRecordId);
		// pass 25: the behaviour the handler chose travels with the send, so the engine applies
		// the same role the table previewed
		const next = send(match, this.seatInPlay(), armedRecordId, siteId, false, this.state.armedRole || null);
		if (!next) {
			this.notice('That send is not allowed right now.');
			return;
		}
		this.tellSend(match, next, record, siteId);
		this.cue('send');
		if (this.props.telemetry) {
			this.props.telemetry.decisionEnd('deploy', 'send', { round: match.frameIndex });
		}
		// a send can close the round on its own: the engine auto-passes a handler with no
		// legal send left (expeditionRules.autoPassIfNoLegalSend), so both sides can end up
		// passed inside this one call and the round resolves. It therefore goes through
		// commitStep like every other engine step, or that round's clash is never told.
		this.commitStep(match, next, {
			armedRecordId: null, armedRole: null, hoverSiteId: null, hoverRecordId: null, lastRival: null,
		});
	};

	// your own send, told the same way as the rival's: log line, arrival, callout. Hiding is
	// no longer a choice (Nick, 2026-09-13): whether it arrived hidden is read off the board
	// entry the engine just wrote, the same truth the bench's plinths read via prepare().
	tellSend = (match, next, record, siteId) => {
		const entry = (next.board[siteId] && next.board[siteId][YOU] || []).find((e) => e.recordId === record.id);
		const hidden = !!(entry && entry.hidden);
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
			this.notice(match.players[this.seatInPlay()].passed
				? 'You have already passed. Passing is permanent for this round.'
				: 'It is not your turn to pass.');
			return;
		}
		const next = pass(match, this.seatInPlay());
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
		this.commitStep(match, next, { armedRecordId: null, armedRole: null, movingRecordId: null, lastRival: null });
	};

	// ------------------------------------------------------------------
	// the stake (assumption 22): once a Proving, before your first send of the round
	// ------------------------------------------------------------------

	/*
		The Stake control on a tray head asks before it acts. The question is put in the
		status strip rather than a browser dialog, so the worlds stay on screen while it is
		answered and the answer is a press on the same panel as everything else.
	*/
	askStake = (siteId) => {
		if (this.state.playback) {
			this.notice('The round is still resolving.');
			return;
		}
		const view = this.view();
		const stakeable = (view.players[this.seatInPlay()].stakeableSiteIds) || [];
		if (!stakeable.includes(siteId)) {
			this.notice('That world cannot be staked now. A stake is once a game, and only before your first send of a round.');
			return;
		}
		this.setState((prev) => ({
			pendingStakeSiteId: prev.pendingStakeSiteId === siteId ? null : siteId,
		}));
	};

	cancelStake = () => this.setState({ pendingStakeSiteId: null, stakeMode: false });

	toggleStakeMode = () => this.setState((prev) => ({
		stakeMode: !prev.stakeMode, pendingStakeSiteId: null, armedRecordId: null, armedRole: null, movingRecordId: null,
	}));

	confirmStake = () => {
		const { match, pendingStakeSiteId } = this.state;
		if (!pendingStakeSiteId) {
			return;
		}
		const next = stakeWorld(match, this.seatInPlay(), pendingStakeSiteId);
		if (!next) {
			this.setState({ pendingStakeSiteId: null });
			this.notice('That world cannot be staked now. A stake is once a Proving, and only before your first send of the round.');
			return;
		}
		const worldName = this.worldName(match, pendingStakeSiteId);
		const counted = getPublicState(next, YOU).stakes[pendingStakeSiteId].countedValue;
		const line = narrateStake({ you: true, worldName, countedValue: counted });
		this.cue('seal');
		this.appendLog(line);
		this.beat({ kind: 'your-stake', seat: YOU, short: 'Staked', siteId: pendingStakeSiteId, text: line });
		if (this.props.telemetry) {
			this.props.telemetry.mark('stake', { site: pendingStakeSiteId, round: match.frameIndex });
		}
		// a stake does not spend the turn and can never close a round, so it is a plain
		// state step rather than a commitStep
		this.setState({ match: next, pendingStakeSiteId: null, stakeMode: false }, this.afterEngineStep);
	};

	/*
		Arm a swift creature to move (assumption 20). `movableRecordIds` comes from the
		engine's own view of your side, so the button only appears for a creature the
		engine would actually let move.
	*/
	beginMove = (recordId) => {
		const view = this.view();
		const movable = view.players[this.seatInPlay()].movableRecordIds || [];
		if (!movable.includes(recordId)) {
			this.notice('That creature is not swift enough to move, or it has already moved this round.');
			return;
		}
		const record = this.findRecordOnBoard(this.state.match, recordId);
		this.setState((prev) => ({
			movingRecordId: prev.movingRecordId === recordId ? null : recordId,
			armedRecordId: null,
			armedRole: null,
		}), () => {
			if (this.state.movingRecordId) {
				this.notice(`Press another world to move ${record ? speciesLabel(record) : 'it'} there. This does not spend your turn.`);
			}
		});
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
		const seat = this.seatInPlay();
		/*
			PASS 43. Only a suggested PASS reaches the table. The per-send suggestion was the
			Court proctor's own policy, and measured in pass 42 it wins 45 to 50 percent against
			every rival: a coin flip that three blind critics followed and read as a trap. It
			also cost three marks (the card outline, its "suggested" word, the world's
			"recommended" tag). Each empty world's "best here" names now give a first-timer a
			place to start from the creatures' own numbers, without claiming to be advice. A
			pass is suggested for reasons that are arithmetic, so it stays.
		*/
		const rec = recommendSend(view, view.players[seat].roster, seat);
		return rec && rec.type === 'pass' ? rec : null;
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

		The engine clashes one world at a time already, but the frame's own order is what
		the table tells them in, so the events are re-grouped by site in frame order and the
		Court's ruling is kept for last.
	*/
	beginResolution = (before, next, extra) => {
		const frameBefore = before.frames[before.frameIndex];
		const boardBefore = this.snapshotBoard(before);
		// a swift move and a stake were both told when they happened, during Deploy; leaving
		// them in the playback only makes the table pause on a step with nothing to say
		const newEvents = next.resolutionLog
			.slice(before.resolutionLog.length)
			.filter((e) => e.type !== 'swift-move' && e.type !== 'stake');
		const events = this.sequenceEvents(newEvents, frameBefore);
		// the whole public view with both sides in and nothing clashed yet: the board the
		// playback draws (see view()). The engine reveals every hidden creature at the
		// start of resolution, so our own hidden sends are already visible here.
		const frozenView = getPublicState(before, YOU);
		// the rival's hidden sends are filtered out of the public view, but the clash
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
		this.appendLog('Both sides have passed. The worlds clash.');
		this.cutBeats();
		this.beat({ kind: 'resolve', seat: null, short: 'The clash', text: 'Both sides have passed. Each world clashes in turn, fastest first.' });
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
			movingRecordId: null,
		}, this.stepPlayback);
	};

	// the round told per world: every event of the first world, then the second, then the
	// third, then the Court's ruling (the base redesign's "the Clash told per world")
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

	// a flat index of every creature on the table just before the clash: its record, its
	// world and its side, so the sentences can name a creature that has since been downed
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
		// raw board for narration once the clash has revealed them.
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
		this.playbackTimer = setTimeout(this.stepPlayback, Math.round(stepMs * stepWeight(event)));
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
		tellEvent - one clash or ruling event, told as one sentence in the log.

		Names carry their side: the provisional pool repeats species, so "Stonebrawler
		downs Stonebrawler" needs "your" and "the rival's" to be readable. An attack the
		shield cancelled gets no sentence of its own; the shield event says it.
	*/
	tellEvent = (event, playback) => {
		const kind = classifyEvent(event);
		const snap = playback.boardBefore;
		if (kind === 'swift-move' || kind === 'stake') {
			return; // already narrated as it happened during deploy
		}
		if (kind === 'judge') {
			// a staked world is named by its planet alone in the ruling, so the count reads
			// as the world's own parenthetical ("Zolton (counting two) is yours") rather
			// than trailing a second bracket after the site's name
			const siteNames = {};
			const counted = {};
			playback.frame.sites.forEach((s) => {
				const result = (event.siteResults || {})[s.id];
				const value = result && typeof result.countedValue === 'number' ? result.countedValue : 1;
				counted[s.id] = value;
				siteNames[s.id] = value > 1 ? s.world.planet : `${s.world.planet} (${s.name})`;
			});
			this.appendLogLines(narrateJudge(event, { siteNames, counted, you: YOU }));
			return;
		}
		// PASS 18: `pin` joins the narrated kinds. A restraining attack takes its target's
		// swing, and a swing that vanishes without a sentence is how a table loses a player's
		// trust, so the cause is said out loud before the effect.
		if (kind !== 'attack' && kind !== 'sweep' && kind !== 'shield' && kind !== 'recover' && kind !== 'pin') {
			return;
		}
		const sided = (u) => (u.seat === YOU ? `your ${speciesLabel(u.record)}` : `the rival's ${speciesLabel(u.record)}`);
		const actor = snap[event.recordId];
		// a shield names the creature whose attack it cancelled; an attack and a pin both
		// name their target
		const otherId = kind === 'shield' ? event.cancelled : event.target;
		const other = otherId ? snap[otherId] : null;
		const bolster = kind === 'recover' && event.bolster ? snap[event.bolster] : null;
		const site = event.site ? playback.frame.sites.find((s) => s.id === event.site) : null;
		const sentence = narrateEvent(event, {
			actorName: actor ? sided(actor) : 'A creature',
			targetName: other ? sided(other) : undefined,
			bolsterName: bolster ? speciesLabel(bolster.record) : undefined,
			// assumption 18: a hurt attacker lands less, so the sentence names the condition
			actorHurt: (kind === 'attack' || kind === 'sweep') && this.wasHurtBefore(event, playback),
			siteName: site ? site.name : (actor ? actor.siteName : undefined),
			worldName: site ? site.world.planet : undefined,
		});
		if (sentence) {
			this.appendLog(capitalize(sentence));
		}
	};

	/*
		wasHurtBefore(event, playback) - had this attacker already been hit when its own
		attack landed? The engine's `power` already carries the scaled number
		(assumption 18); this only decides whether the sentence names the condition.
	*/
	wasHurtBefore = (event, playback) => {
		const index = playback.events.indexOf(event);
		const upTo = index < 0 ? playback.events.length : index;
		for (let i = 0; i < upTo; i++) {
			const e = playback.events[i];
			if (e.type === 'attack' && e.target === event.recordId && e.outcome === 'hurt') {
				return true;
			}
		}
		return false;
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
				// pass 49: the stamp says why ("rival's, unopposed", "yours by 12")
				const site = playback.frame.sites.find((x) => x.id === siteId);
				const before = (playback.frozenView && playback.frozenView.board && playback.frozenView.board[siteId]) || null;
				const sentBy = before ? { A: (before.A || []).length, B: (before.B || []).length } : undefined;
				verdicts[siteId] = verdictOf(r, YOU, site ? site.world.planet : siteId, sentBy);
			});
		}
		const resolved = judgedViewFromRuling(
			this.applyPlaybackEffects({ ...playback, index: playback.events.length }),
			judgeEvent,
			playback.frozenView,
		);
		const live = getPublicState(match, YOU);
		// Hold the world just played while the live engine is already on the next one. Its
		// board is the Court's own post-resolution board, so the figures and totals cannot
		// disagree with the verdict stamped on the site.
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
			// pass 38: the round's result in plain words, once (the dock no longer repeats it)
			this.beat({
				kind: 'judge',
				seat: null,
				short: 'The Court rules',
				// pass 49: world by world, with why (unopposed, or by how much)
				text: rulingLine(playback.frame.index, playback.frame.sites.map((x) => verdicts[x.id]).filter(Boolean)),
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
		this.setState({ verdicts: null, judged: false, judgedFrame: null, judgedSnapshot: null, lastRival: null }, () => {
			const { match } = this.state;
			const frame = match.frames[match.frameIndex];
			const names = frameWorldNames(frame);
			this.appendLog(`Round ${frame.index + 1}: ${names}.`);
			this.cutBeats();
			this.beat({
				kind: 'world',
				seat: null,
				short: `Round ${frame.index + 1}`,
				// pass 39: each round opens on what it is worth, so the rounds do not read alike
				text: (() => {
					const clinch = clinchFor(frame.sites.length, FRAMES_PER_MATCH);
					const need = Math.max(0, clinch - match.players[YOU].sitesWon);
					const theirs = Math.max(0, clinch - match.players[THEM].sitesWon);
					// pass 41: when the sends left cannot take the worlds needed, the opening says so first
					const liveView = getPublicState(match, YOU);
					const reach = reachabilityLine(liveView, liveView.players[YOU], liveView.players[THEM]);
					if (reach && reach.tone === 'lost') {
						return `${names}. ${reach.text} ${match.turn === YOU ? 'You send first.' : 'The rival sends first.'}`;
					}
					const stakes = need <= frame.sites.length && theirs <= frame.sites.length
						? `Either side can win the game this round: you need ${need}, the rival ${theirs}.`
						: need <= frame.sites.length
							? `You can win the game this round: you need ${need} of these ${frame.sites.length}.`
							: theirs <= frame.sites.length
								? `The rival can win the game this round with ${theirs} of these ${frame.sites.length}.`
								: `You need ${need} more worlds to win, the rival ${theirs}.`;
					return `${names}. ${stakes} ${match.turn === YOU ? 'You send first.' : 'The rival sends first.'}`;
				})(),
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
					// attacks subtract (assumption 5): the engine keeps the live hold on the
					// board row, and the meter draws the gap back up to the untouched one as
					// what the round has taken
					const full = typeof e.fullHold === 'number' ? e.fullHold : prepared.hold;
					const live = typeof e.currentHold === 'number' ? e.currentHold : prepared.hold;
					holds[e.recordId] = {
						printed: full,
						hold: live,
						role: e.role !== undefined ? e.role : prepared.role,
						blowMagnitude: prepared.blowMagnitude,
						hurt: live < full,
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
		if (!id || view.phase !== 'deploy' || view.turn !== this.seatInPlay()) {
			return null;
		}
		const record = view.players[this.seatInPlay()].roster.find((r) => r.id === id);
		if (!record) {
			return null;
		}
		const ghosts = {};
		view.frame.sites.forEach((site) => {
			// the whole arithmetic of this send at this world: hold after strain and any
			// bolster standing there, the role sentence, and what the role would do to the
			// board as it stands (the base redesign's "Interface consequences")
			const seat = this.seatInPlay();
			const plan = ghostPlanFor(view, record, site, seat, view.players[seat].sentCount);
			const prepared = prepare(record, site, site.world, view.players[this.seatInPlay()].sentCount, { rules: view.rules });
			const tolerance = (record.physiology && record.physiology.environmentalTolerance) || {};
			ghosts[site.id] = {
				hold: plan.hold,
				role: plan.role,
				roleLine: plan.roleLine,
				lines: plan.lines,
				effect: plan.effect,
				recordId: record.id,
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
	/*
		PASS 38. The one instruction for this moment, in as few words as it takes. The top
		bar's message slot is the only place that says what to do next; the bench heading, the
		bench lead and the coaching strip that used to repeat it are gone
		(docs/design/reclamation-declutter.md).
	*/
	whatAClickDoes(view) {
		const { armedRecordId, movingRecordId, playback } = this.state;
		if (playback) {
			// pass 45: what is happening is said on the world it happens at; this line says which world
			const current = playback.current && playback.current.site ? playback.frame.sites.find((s) => s.id === playback.current.site) : null;
			return current ? `${current.world.planet} clashes. The fastest act first.` : 'The worlds clash in turn, fastest first.';
		}
		if (view.phase === 'matchEnd') {
			return 'The game is over.';
		}
		if (this.state.judged) {
			return this.rulingSentence(view);
		}
		if (view.turn !== this.seatInPlay()) {
			return view.players[this.seatInPlay()].passed ? 'You passed. The rival is still choosing.' : 'The rival is choosing.';
		}
		if (movingRecordId) {
			const record = this.findRecordOnBoard(this.state.match, movingRecordId);
			return `Pick the world ${record ? speciesLabel(record) : 'it'} moves to. A move does not use your turn.`;
		}
		if (armedRecordId) {
			const record = view.players[this.seatInPlay()].roster.find((r) => r.id === armedRecordId);
			let stealthy = false;
			try {
				stealthy = !!prepare(record, view.frame.sites[0], null, 0, { rules: view.rules }).stealthy;
			} catch (e) {
				stealthy = false;
			}
			return `Pick a world for ${speciesLabel(record)}.${stealthy ? ' It arrives hidden.' : ''}`;
		}
		if (view.players[this.seatInPlay()].passed) {
			return 'You passed. Waiting for the rival.';
		}
		const rivalPassed = view.players[this.seatOpponent()].passed;
		const me = view.players[this.seatInPlay()];
		const cap = typeof me.sendableCap === 'number' ? me.sendableCap : SENDABLE;
		if ((me.sentCount || 0) >= cap) {
			return `You have used all ${cap} sends. Pass to end your round.`;
		}
		if (this.state.stakeMode) {
			return 'Pick a world to stake: it counts two worlds for whoever holds it.';
		}
		const rec = this.recommendation(view);
		if (rec && rec.type === 'pass') {
			return `Pass suggested: ${PASS_SHORT[rec.reasonKey] || rec.reason.split('. ')[0].replace(/\.$/, '').toLowerCase()}.`;
		}
		const lastRival = this.state.lastRival ? `${this.state.lastRival} ` : rivalPassed ? 'The rival has passed. ' : '';
		return `${lastRival}Pick a creature from your squad.`;
	}

	// the Ruling in one sentence, from the counts the score is about to show
	rulingSentence(view) {
		const judged = this.state.judgedFrame != null ? this.state.judgedFrame : view.frameIndex;
		const verdicts = this.state.verdicts || {};
		// pass 49: the round in the terms that made it, world by world, in frame order
		const order = (view.frame && view.frame.sites) ? view.frame.sites.map((x) => x.id) : Object.keys(verdicts);
		return rulingLine(judged, order.map((id) => verdicts[id]).filter(Boolean));
	}

	// a rival beat holds the turn readout on what the rival just did, so "Your move" lands
	// after it as its own change
	rivalBeat() {
		const { beat } = this.state;
		return beat && beat.seat === THEM ? beat : null;
	}

	turnText(view) {
		if (this.state.playback) {
			return 'Clash';
		}
		const rivalBeat = this.rivalBeat();
		if (rivalBeat && view.phase === 'deploy' && !this.state.judged) {
			return rivalBeat.short;
		}
		if (this.state.judged && view.phase !== 'matchEnd') {
			return 'Round over';
		}
		if (view.phase === 'matchEnd') {
			return 'Over';
		}
		if (view.turn === this.seatInPlay()) {
			return 'Your move';
		}
		return 'Rival\u2019s move';
	}

	renderStatusStrip(view) {
		const you = view.players[this.seatInPlay()];
		const them = view.players[this.seatOpponent()];
		const stillReachable = reachabilityLine(view, you, them);
		const rivalBeat = !!this.rivalBeat() && view.phase === 'deploy' && !this.state.judged;
		const yourTurn = view.turn === this.seatInPlay() && view.phase === 'deploy' && !this.state.playback && !this.state.judged && !rivalBeat;
		const waiting = (view.turn === THEM || rivalBeat) && view.phase === 'deploy' && !this.state.playback && !this.state.judged;
		const deciding = waiting && !rivalBeat;
		const turnLabel = this.turnText(view);
		const lampKind = yourTurn ? 'amber' : waiting ? 'red' : 'off';
		const simple = this.isSimple();
		// a pip is keyed on whether it is lit, so lighting one remounts it and it pops
		const toClinch = clinchFor(view.frame.sites.length, FRAMES_PER_MATCH);
		const pips = (n) => Array.from({ length: toClinch }).map((_, i) => (
			<span className={`rec-pip${i < n ? ' rec-pip--lit' : ''}`} key={`${i}-${i < n ? 'lit' : 'dark'}`} />
		));
		/*
			PASS 38. Only a callout that says something the board does not. Your own send is
			visible the moment the creature lands on the world, so it is not also narrated; the
			rival's moves, the Clash and the Court still are.
		*/
		const beat = this.state.beat && this.state.beat.seat !== this.seatInPlay() ? this.state.beat : null;
		const handling = !!(this.state.armedRecordId || this.state.movingRecordId || this.state.stakeMode);
		return (
			<div className="g-panel rec-status" data-topbar>
				{/* the way out, always visible (design system core rule); the Proving is saved and resumes from the intro */}
				{this.props.onLeave && (
					<button type="button" className="g-btn rec-leave" onClick={this.props.onLeave} data-leave aria-label="Leave the table">
						<span aria-hidden="true">&larr;</span> <span className="rec-tool-word">Leave</span>
					</button>
				)}

				<div className="rec-status-world">
					<h2 className="rec-status-planet">Round {view.frameIndex + 1}<span className="rec-status-of"><span className="rec-status-of-word"> of </span><span className="rec-status-of-slash">/</span>{FRAMES_PER_MATCH}</span></h2>
					{/* the next round's worlds are planning arithmetic: advanced mode, and the help panel's round list */}
					{!simple && view.nextFrame && !this.state.judged && (
						<span className="rec-next-plate" data-next-plate>
							<span className="rec-next-plate-label">next</span>
							{view.nextFrame.map((w) => (
								<span className={`g-chip g-chip--outline rec-status-element g-el-${w.element}`} key={w.siteId} title={`${w.planet}, at ${w.siteName}`}>{w.planet}</span>
							))}
						</span>
					)}
				</div>

				<div className="rec-status-score" title={`First to ${toClinch} worlds wins`}>
					<span className="rec-score rec-score--mine">
						<span className="rec-score-label">You</span>
						<span className="rec-pips">{pips(you.sitesWon)}</span>
						<span className="rec-score-value rec-tick" data-sites-a key={you.sitesWon}>{you.sitesWon}</span>
					</span>
					<span className="rec-score rec-score--theirs">
						<span className="rec-score-label">Rival</span>
						<span className="rec-pips">{pips(them.sitesWon)}</span>
						<span className="rec-score-value rec-tick" data-sites-b key={them.sitesWon}>{them.sitesWon}</span>
						{them.passed && view.phase === 'deploy' && !this.state.judged && !this.state.playback && <span className="rec-score-passed" data-rival-passed>has passed</span>}
					</span>
				</div>

				<div className="rec-status-turn">
					<span className={`rec-turn${yourTurn ? ' rec-turn--yours' : ''}${waiting ? ' rec-turn--waiting' : ''}${deciding ? ' rec-turn--deciding' : ''}`}>
						<span className={`g-lamp g-lamp--${lampKind}`} key={lampKind} />
						<span className="rec-turn-text rec-turn-text--in" data-turn-text key={turnLabel}>{turnLabel}</span>
					</span>
				</div>

				{/*
					PASS 37 made this ONE MESSAGE SLOT. Pass 38 made it the only place on the table
					that says what to do next: the stake's question, what the rival or the Court
					just did, or the one instruction for this moment.
				*/}
				<div className={`rec-status-say${this.state.playback ? ' rec-status-say--skip' : ''}`} data-say>
					{this.state.playback && (
						<button type="button" className="g-btn rec-skip" onClick={this.hurry} data-skip title="Space">
							Skip <kbd>Space</kbd>
						</button>
					)}
					{/*
						pass 47: with a creature in hand the instruction wins over the rival's last
						move; a critic lifted a creature on a phone and read a stale rival line
						where "Pick a world for Scalatto" should have been
					*/}
					{this.state.pendingStakeSiteId ? this.renderStakeConfirm(view)
						: beat && !handling ? this.renderCallout(beat)
							: (
								<p className={`rec-status-hint g-body${yourTurn ? ' rec-status-hint--yours' : ''}`} data-hint>
									{rivalBeat && !handling ? this.rivalBeat().text : this.whatAClickDoes(view)}
								</p>
							)}
					<p
						className="rec-status-reach g-body"
						data-still-reachable={stillReachable && !beat ? stillReachable.tone : 'none'}
					>
						{stillReachable && !beat ? stillReachable.text : ''}
					</p>
				</div>

				{/* pass 38: reference opens on request. The simple-mode ticker became History. */}
				<div className="rec-status-tools">
					{(
						<button type="button" className="g-btn rec-tool rec-tool--history" onClick={() => this.setState({ panel: 'history' })} data-open-history aria-label="History">
							<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="none" stroke="currentColor" strokeWidth="1.6" d="M2 4h12M2 8h12M2 12h8" /></svg>
							<span className="rec-tool-word">History</span>
						</button>
					)}
					<button type="button" className="g-btn rec-tool" onClick={() => this.setState({ panel: 'help' })} data-open-help aria-label="How to play">?</button>
					{this.props.settings && (
						<button type="button" className="g-btn rec-tool" onClick={() => this.setState({ panel: 'settings' })} data-open-settings aria-label="Settings">
							<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M6.6 1h2.8l.4 1.9 1.3.6 1.7-1 2 2-1 1.7.6 1.3 1.9.4v2.8l-1.9.4-.6 1.3 1 1.7-2 2-1.7-1-1.3.6-.4 1.9H6.6l-.4-1.9-1.3-.6-1.7 1-2-2 1-1.7-.6-1.3L0 9.4V6.6l1.9-.4.6-1.3-1-1.7 2-2 1.7 1 1.3-.6zM8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z" /></svg>
						</button>
					)}
				</div>
			</div>
		);
	}

	renderPanel(view) {
		const close = () => this.setState({ panel: null });
		switch (this.state.panel) {
			case 'help':
				return <HelpPanel match={this.state.match} clinch={clinchFor(view.frame.sites.length, FRAMES_PER_MATCH)} onClose={close} />;
			case 'history':
				return <HistoryPanel lines={this.state.log} onClose={close} />;
			case 'settings':
				return (
					<SettingsPanel rivalName={this.props.rivalName} seed={this.isSimple() ? null : this.props.seed} onAbandon={this.props.onAbandon} onClose={close}>
						{this.props.settings}
					</SettingsPanel>
				);
			default:
				return null;
		}
	}

	/*
		The stake's question, asked once, on the status strip: the worlds stay on screen
		while it is answered. The count named is the engine's own for that world after the
		stake would land, so a world the rival already staked correctly asks about three.
	*/
	renderStakeConfirm(view) {
		const siteId = this.state.pendingStakeSiteId;
		const site = view.frame.sites.find((s) => s.id === siteId);
		const already = view.stakes && view.stakes[siteId] ? view.stakes[siteId].by.length : 0;
		const word = countWord(already >= 1 ? 3 : 2);
		return (
			<div className="rec-stake-ask g-body" data-stake-ask={siteId} role="status">
				<span className="rec-stake-ask-text">
					Stake {site ? site.world.planet : 'this world'}? It counts {word} worlds for whoever holds it.
				</span>
				<span className="rec-stake-ask-actions">
					<button type="button" className="g-btn g-btn--primary rec-stake-yes" onClick={this.confirmStake} data-stake-confirm>Stake it</button>
					<button type="button" className="g-btn rec-stake-no" onClick={this.cancelStake} data-stake-cancel>Cancel</button>
				</span>
			</div>
		);
	}

	// the callout: one sentence over the sites saying what just happened, in the colour
	// of whoever did it. Keyed on the beat so each one plays its own entrance and exit.
	renderCallout(beat) {
		if (!beat) {
			return <div className="rec-callout-row" data-callout-row />;
		}
		const who = beat.seat === YOU ? 'you' : beat.seat === THEM ? 'rival' : 'table';
		const kicker = beat.seat === YOU ? 'You' : beat.seat === THEM ? 'The rival' : beat.kind === 'judge' ? 'Ruling' : 'The table';
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

	/*
		The cover between two people (pass 21). It says exactly three things: who should be
		looking, that the other person should not be, and how to proceed. It deliberately does
		NOT name the round, the score, the worlds in the frame, or anything else that would tell
		the wrong reader about the position.

		`data-handoff` is the harness's handle on it, and the seat is on the element so a check
		can assert the cover is up for the right person.
	*/
	renderHandoff(handoff) {
		const who = handoff.seat === 'A' ? 'the first handler' : 'the second handler';
		const other = handoff.seat === 'A' ? 'second' : 'first';
		return (
			<div className="rec-match rec-handoff" data-handoff={handoff.seat}>
				<div className="g-panel rec-handoff-panel">
					<div className="g-readout-unit">Hand the table over</div>
					<h2 className="rec-handoff-who">Pass the keyboard to {who}.</h2>
					<p className="g-body rec-handoff-note">
						The board is covered so the {other} handler cannot see what was sent hidden.
						Press when the right person is looking.
					</p>
					<button
						type="button"
						className="g-btn g-btn--primary rec-handoff-take"
						onClick={this.takeHandoff}
						data-take-handoff
						autoFocus
					>
						I am {who}
					</button>
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
			: rec && rec.type === 'move' && this.state.movingRecordId === rec.recordId ? rec.siteId : null;
		// simple mode has no rail; the bench lives under the worlds and the dossier is the
		// only thing that opens one
		const deployPanelOpen = view.phase === 'deploy' && !playback && !judged;
		const showRail = !simple || !!inspect;
		const holds = this.holdsForBoard(view);
		const totals = this.totalsForBoard(view);
		const ghosts = this.ghostsForArmed(view);
		const me = view.players[this.seatInPlay()];
		const them = view.players[this.seatOpponent()];
		const deploying = view.phase === 'deploy' && !playback && !judged;
		// sites accept a click for the whole of your deploy turn, not only when something is
		// armed: the interface principle is that every click says why, and a site that
		// silently ignores a click explains nothing.
		const clickable = deploying && view.turn === this.seatInPlay();

		/*
			PASS 38, THE FORECAST IN THE NUMBERS. Two blind critics watched a world read 32
			with "-6 own sweep" marked on two creatures and then rule at 20, and a creature
			marked to fall survive because its slower attacker fell first. The forecast is now
			the engine's own resolve run on what this seat can see (forecastClash), so each
			creature's number and each world's total print what the Clash would leave.
		*/
		const forecast = deploying ? forecastClash(this.state.match, this.seatInPlay()) : null;
		const ownSweepMap = deploying ? ownSweepsFor(view, YOU) : null;
		const holdingIds = [...me.holding, ...them.holding];

		/*
			PASS 29, THE FOOTING IN THE PANEL BODY.

			A blind critic scored "reason to keep playing" 4 of 10 and named the cause:
			"three identical empty black rectangles labelled UNCLAIMED are the least
			motivating opening board possible." Measured before designing: an empty world
			panel is 411px tall with a 264px body carrying nine words, six of which are
			"no one", "UNCLAIMED" and "no one". Three of them is 792px of screen saying
			nothing about why any world is worth having, or how the three differ.

			They differ a great deal, and the game already knows how. Over five seeds and
			every site (210 site-roster pairs, a twelve-creature squad):

			  creatures comfortable here      mean 5.4 of 12, RANGE 0 TO 11
			  strained                        mean 4.4
			  severely strained               mean 2.2
			  native to this world (1.5x hold) mean 0.86, up to 3; 61% of worlds have one
			  sites where every creature is comfortable   0 of 210
			  sites where fewer than half are             87 of 210

			So which of your squad can actually stand on a world is the sharpest thing that
			distinguishes one panel from another, it is different on every world, and it was
			never shown. This computes it from the handler's own bench, through the same
			prepare() the figures use, so the panel cannot disagree with the table.
		*/
		const footingOfSite = {};
		if (view.frame && view.frame.sites) {
			const bench = (me.roster || []).filter((r) => !holdingIds.includes(r.id));
			view.frame.sites.forEach((site) => {
				let comfortable = 0;
				let strained = 0;
				let severe = 0;
				let native = 0;
				const holdsHere = [];
				bench.forEach((record) => {
					let plan = null;
					try {
						plan = prepare(record, site, site.world, 0, { rules: view.rules });
					} catch (e) {
						// a record the adapter cannot field is not a stake; it is counted nowhere
						return;
					}
					if (!plan) {
						return;
					}
					if (plan.isHome) {
						native++;
					}
					holdsHere.push({ record, hold: plan.hold });
					if (plan.strainLevel === 'severe') {
						severe++;
					} else if (plan.strainLevel === 'strained') {
						strained++;
					} else {
						comfortable++;
					}
				});
				// pass 39: the three that would hold this world best, so each round's worlds open on their own names
				const best = holdsHere.sort((a, b) => b.hold - a.hold).slice(0, 3);
				footingOfSite[site.id] = { comfortable, strained, severe, native, of: bench.length, best };
			});
		}
		// assumption 20: your swift creatures that may still move this round, as the bench's
		// move buttons. The engine's own list, so a button never offers an illegal move.
		const movable = deploying && view.turn === this.seatInPlay()
			? (me.movableRecordIds || []).map((id) => ({ record: this.findRecordOnBoard(this.state.match, id) })).filter((m) => m.record)
			: [];

		// what to light on the table: the creature the ghost would strike, or the event
		// being told during resolution
		const highlights = {};
		const armedGhost = ghosts && this.state.hoverSiteId ? ghosts[this.state.hoverSiteId] : null;
		if (armedGhost && armedGhost.targetRecordId) {
			highlights.hover = armedGhost.targetRecordId;
		}
		if (playback && playback.current) {
			const kind = classifyEvent(playback.current);
			/*
				PASS 28, THE CAMERA. Which world is clashing right now.

				Measured before this pass, on a live Clash at full motion over 61 sampled
				frames: 21% of frames had any figure transformed at all, the largest movement
				of any figure across the whole round was 5.9px, and nothing on the table said
				which of the three worlds the current event belonged to. Three equally lit
				panels while one of them is where everything is happening is the reason a
				blind critic scored pace 3/10 and called the screen "paperwork": the eye has
				nowhere to go. The clashing world is now named on the panel itself, so the
				other two recede while it is read.
			*/
			if (playback.current.site) {
				highlights.clashSiteId = playback.current.site;
			}
			// pass 32: the step index, so a figure acting twice running replays its animation
			highlights.beat = playback.index;
			if (kind === 'attack' || kind === 'sweep' || kind === 'shield') {
				highlights.acting = playback.current.recordId;
				highlights.hit = playback.current.target || null;
				highlights.flash = flashFor(playback.current);
			}
			if (kind === 'recover') {
				// a recovery moves the creature's own bulb, so it lights as the acted-on one
				highlights.acting = playback.current.bolster || null;
				highlights.hit = playback.current.recordId;
				highlights.flash = flashFor(playback.current);
			}
			// pass 45: what is happening, said on the clashing world rather than in the top bar
			const snap = playback.boardBefore || {};
			const who = (id) => (id && snap[id] ? { name: speciesLabel(snap[id].record), seat: snap[id].seat } : null);
			const ev = playback.current;
			const parts = captionEvent(ev, {
				actor: who(ev.recordId) || undefined,
				target: who(kind === 'shield' ? ev.cancelled : ev.target) || undefined,
				bolster: kind === 'recover' ? who(ev.bolster) || undefined : undefined,
			});
			if (parts && ev.site) {
				highlights.caption = { parts, key: playback.index };
			}
		}

		/*
			PASS 21. THE HAND-OFF COVER REPLACES THE TABLE, it does not sit over it.

			An overlay can be scrolled past, inspected, or read around the edges of, and the
			whole value of the cover is that the person who should not be looking cannot see the
			position. So while a hand-off is up the table is not rendered at all: nothing about
			the score, the worlds, or whose creatures stand where reaches the document.

			A cover that leaks is worse than no cover, because the player trusted it.
		*/
		if (this.state.handoff) {
			return this.renderHandoff(this.state.handoff);
		}

		return (
			<div className={`rec-match${simple ? ' rec-match--simple' : ' rec-match--advanced'}`}>
				{this.renderStatusStrip(view)}
				{this.renderPanel(view)}

				{/*
					PASS 27 kept the ticker at FOUR lines, the smallest that carries a whole Ruling
					(three verdict sentences). Pass 37 moved it into the status strip's last column.
				*/}

				{notice && <div className="g-notice g-notice--alert rec-notice" role="status" data-notice>{notice}</div>}

				{/* pass 37: in simple mode the dossier is a drawer over the table, so opening it never narrows the worlds */}
				<div className={`rec-body${showRail && !simple ? '' : ' rec-body--wide'}`}>
					<div className="rec-table">
						<ReclamationWorld
							key={view.frame.index}
							arrival={this.state.arrival}
							frame={view.frame}
							board={view.board}
							you={YOU}
							holds={holds}
							totals={totals}
							hurt={view.hurt}
							ghosts={ghosts}
							verdicts={verdicts}
							armedRecordId={this.state.armedRecordId}
							movingRecordId={this.state.movingRecordId}
							clickable={clickable}
							recommendedSiteId={recommendedSiteId}
							holdingIds={holdingIds}
							hiddenEnemyCount={deploying ? (them.hiddenSentThisRound || 0) : 0}
							forecast={forecast}
							ownSweeps={ownSweepMap}
							highlights={highlights}
							clashSiteId={playback ? highlights.clashSiteId : null}
							siteFootings={deploying ? footingOfSite : null}
							onPickBest={clickable ? this.armRecord : null}
							hoverSiteId={this.state.hoverSiteId}
							advanced={!simple}
							stakes={view.stakes}
							stakeableSiteIds={deploying && view.turn === this.seatInPlay() && (this.state.stakeMode || this.state.pendingStakeSiteId) ? (me.stakeableSiteIds || []) : []}
							pendingStakeSiteId={this.state.pendingStakeSiteId}
							onStake={this.askStake}
							onSiteClick={this.handleSiteClick}
							onSiteHover={(id) => this.setState({ hoverSiteId: id })}
							/*
								pass 37: with a creature in hand, pressing a creature already standing
								on a world is pressing that world. Figures fill most of a world now
								that they size to it, and a send that opened a dossier instead was the
								table ignoring what the player plainly meant.
							*/
							onFigureClick={(entry, seat, site) => (this.state.armedRecordId || this.state.movingRecordId
								? this.handleSiteClick(site.id)
								: this.inspectRecord(entry.record, site))}
						/>

						{/*
							PASS 37. THE DOCK. The bench, the Court's "load the next round" bar and nothing
							at all (during a Clash) take turns in one box of a fixed height, so the worlds
							above it keep their size whatever the dock is showing.
						*/}
						<div className="rec-dock" data-dock>
							{/*
								pass 37: the bench stays in the dock through the Clash, pressed flat,
								rather than leaving a hole the size of the dock. Not in hot-seat, where
								the squad in hand is one person's secret and the Clash is watched by both.
							*/}
							{(deployPanelOpen || ((playback || judged) && !this.hotSeat)) && (
								<ReclamationBench
									view={view}
									you={this.seatInPlay()}
									squad={this.hotSeat && this.seatInPlay() === THEM ? this.squadB : this.squad}
									mode={simple ? 'simple' : 'advanced'}
									armedRecordId={this.state.armedRecordId}
									recommendation={rec}
									movingRecordId={this.state.movingRecordId}
									movable={movable}
									onArm={this.armRecord}
									/*
										PASS 25, ACT FLIP. The behaviours the armed creature can take, and
										the one chosen. The bot gained this axis in the engine; without
										these props the player could not use it, which would be the worst
										possible version of the change.
									*/
									actFlip={!!view.rules.actFlip}
									armedRole={this.state.armedRole}
									onChooseRole={this.chooseRole}
									onInspect={(record) => this.inspectRecord(record, null)}
									onHoverRecord={(id) => this.setState({ hoverRecordId: id })}
									onPass={this.handlePass}
									onBeginMove={this.beginMove}
									stakeAvailable={deploying && view.turn === this.seatInPlay() && (me.stakeableSiteIds || []).length > 0}
									stakeMode={this.state.stakeMode || !!this.state.pendingStakeSiteId}
									onToggleStake={this.toggleStakeMode}
									rivalBeat={this.rivalBeat()}
									interactive={deployPanelOpen}
								/>
							)}

							{/*
								PASS 39: the last round's Ruling gets its moment on the board too. The
								result used to cover the table the instant the Clash finished, so the
								round that decided the game was the one round a player never saw ruled.
								The key keeps data-next-frame, which every check already presses.
							*/}
							{judged && !playback && view.phase === 'matchEnd' && !this.state.reportOpen && (
								<div className="rec-judge-bar rec-rise" data-judge-bar>
									<span className="rec-judge-bar-text">
										{view.winner === this.seatInPlay() ? 'You win the game' : view.winner ? 'The rival wins the game' : 'The game is over'}, {view.players[this.seatInPlay()].sitesWon} worlds to {view.players[this.seatOpponent()].sitesWon}.
									</span>
									<button type="button" className="g-btn g-btn--primary" onClick={() => this.setState({ reportOpen: true })} data-next-frame data-see-result>
										See the result
									</button>
								</div>
							)}
							{judged && !playback && view.phase !== 'matchEnd' && (
								<div className="rec-judge-bar rec-rise" data-judge-bar>
									<span className="rec-judge-bar-text">
										{view.nextFrame ? <>Next: {view.nextFrame.map((w) => w.planet).join(', ')}. {this.state.match.turn === YOU ? 'You send first.' : 'The rival sends first.'}</> : 'That was the last round.'}
									</span>
									<button type="button" className="g-btn g-btn--primary" onClick={this.nextFrame} data-next-frame>
										Round {(this.state.judgedFrame || 0) + 2}
									</button>
								</div>
							)}

						</div>

						{judged && !playback && view.phase === 'matchEnd' && this.state.reportOpen && (
							<div className="rec-verdict-cover" data-verdict-cover>{this.renderVerdictPanel()}</div>
						)}

					</div>

					{showRail && (
					<div className={`rec-rail${simple ? ' rec-rail--drawer' : ''}`}>
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

/*
	playbackEffects(frozenView, events, index) -> the frozen view with every effect of the
	first `index` events applied: each creature at the hold the last attack left it with
	(the event's own `remaining`), downed ones off the world, hit ones flagged hurt,
	recovered ones lifted back by their `recover` event (assumption 19), and a rival's
	hidden send revealed the moment it acts (assumption 9).

	Pure and exported so the playback can be tested without a table:
	see __tests__/reclamationPlayback.test.js.
*/
export function playbackEffects(frozenView, events, index) {
	const base = frozenView;
	const hurt = {};
	const downed = new Set();
	const holdNow = {};
	const damageNow = {};
	const revealed = new Set();
	for (let i = 0; i < index; i++) {
		const event = events[i];
		if (event.type === 'attack' || event.type === 'sweep' || event.type === 'shield') {
			revealed.add(event.recordId);
		}
		// the Ruling's recovery moves the bulb back up before the Court reads the world
		if (event.type === 'recover') {
			holdNow[event.recordId] = event.remaining;
			damageNow[event.recordId] = Math.max(0, (damageNow[event.recordId] || 0) - event.amount);
			continue;
		}
		if (event.type !== 'attack' || !event.target) {
			continue;
		}
		if (event.outcome === 'downed') {
			downed.add(event.target);
			holdNow[event.target] = 0;
		} else if (event.outcome === 'hurt') {
			hurt[event.target] = true;
			holdNow[event.target] = event.remaining;
			damageNow[event.target] = (damageNow[event.target] || 0) + event.power;
		}
	}
	const board = {};
	base.frame.sites.forEach((site) => {
		board[site.id] = { A: [], B: [] };
	});
	base.frame.sites.forEach((site) => {
		['A', 'B'].forEach((seat) => {
			(base.board[site.id][seat] || []).forEach((entry) => {
				if (downed.has(entry.recordId)) {
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
						hurt: true,
					}
					: entry);
			});
		});
	});
	return { ...base, board, hurt };
}

/*
	judgedViewFromRuling(resolvedView, judgeEvent) -> the held verdict view with its
	board replaced by the engine's own post-resolution entries. Playback is deliberately
	an animation over a pre-clash snapshot; it must not become a second implementation of
	the Court's final board. Every surviving creature is public once the Court rules.
*/
export function judgedViewFromRuling(resolvedView, judgeEvent, beforeView) {
	if (!judgeEvent || !judgeEvent.siteResults) {
		return resolvedView;
	}
	const board = { ...resolvedView.board };
	const hurt = {};
	resolvedView.frame.sites.forEach((site) => {
		const result = judgeEvent.siteResults[site.id];
		if (!result || !result.entries) {
			return;
		}
		board[site.id] = { A: [], B: [] };
		['A', 'B'].forEach((seat) => {
			/*
				PASS 38. A creature downed in the Clash stays on the board at the Ruling,
				marked fallen, rather than vanishing. A blind critic could not tell what the
				round had cost it: "Sonalloy and my Graviclaw vanish with no trace, so I
				can't learn from what happened."
			*/
			const ruled = (result.entries[seat] || []).filter((entry) => entry.record);
			const ruledIds = new Set(ruled.map((entry) => entry.recordId));
			// the Ruling's entries omit a creature the Clash downed; the board from before the Clash still has it
			const before = (beforeView || resolvedView).board;
			const lost = (((before && before[site.id]) || {})[seat] || [])
				.filter((entry) => entry.record && !ruledIds.has(entry.recordId))
				.map((entry) => ({ ...entry, downed: true }));
			board[site.id][seat] = ruled.concat(lost)
				.map((entry) => {
					if (entry.downed) {
						return { ...entry, currentHold: 0, hidden: false, revealPending: false, fallen: true };
					}
					const currentHold = typeof entry.hold === 'number' ? entry.hold : entry.currentHold;
					if (entry.hurt && currentHold > 0) {
						hurt[entry.recordId] = true;
					}
					return {
						...entry,
						currentHold,
						hidden: false,
						revealPending: false,
					};
				});
		});
	});
	return { ...resolvedView, board, hurt };
}

/*
	PASS 28. STEP TIMING: A ROUND WITH A SHAPE.

	Every event of the Clash used to be held for the same 700ms, which is why a round
	read as a list rather than as a fight: a creature being downed and a shield
	cancelling nothing took exactly as long to watch. The step is now weighted by what
	happened, so the round has a rhythm and its biggest moments are the ones the eye
	has time to land on.

	The weights are a lever, recorded here with what set them. A downing is the loudest
	thing that can happen at a world and gets nearly double; the Court's ruling gets
	longer still because three verdicts arrive in one event; an attack that changed
	nothing is got out of the way. Skipping is unaffected: hurry() replays every
	remaining event at once and never consults this.
*/
export function stepWeight(event) {
	if (!event) {
		return 1;
	}
	if (event.type === 'judge') {
		return 1.6;
	}
	if (event.type === 'attack') {
		if (event.outcome === 'downed') return 1.9;
		if (event.outcome === 'cancelled') return 0.7;
		if (event.outcome === 'hurt') return 1;
		/*
			SCHEMA 5 MADE THE EMPTY BEATS MATTER. An attack whose target is already down or
			out of reach produces an event with nothing to show: no figure moves, no flash
			appears, the log gains a line. Measured on the v5 roster, those are 16.6% lapsed
			plus 9.9% no-target, so over a QUARTER of attacks are a held pause on a still
			board. The clash gauge caught it as motion falling to 33% of frames while every
			animation still worked: the round had not gone quiet, it had got longer.

			They are still told, because a player needs to know a blow was thrown and missed,
			but they are got out of the way rather than dwelt on.
		*/
		if (event.outcome === 'lapsed' || event.outcome === 'no-target') return 0.35;
		return 0.7;
	}
	if (event.type === 'sweep') {
		// a sweep hits several creatures in one event, so it needs longer to be read
		return 1.35;
	}
	if (event.type === 'shield' || event.type === 'recover') {
		return 0.9;
	}
	return 1;
}

// the word that pops over a creature as an attack lands on it during playback: the number
// it lost, or the outcome where there is no number (the base redesign: every point counts)
export function flashFor(event) {
	if (!event) {
		return null;
	}
	if (event.type === 'shield') {
		return event.cancelled ? { kind: 'ward', text: 'cancelled' } : null;
	}
	if (event.type === 'recover') {
		return { kind: 'recover', text: `+${formatBlow(event.amount)}` };
	}
	if (event.type !== 'attack') {
		return null;
	}
	switch (event.outcome) {
		// the class names are the console's own; the words are Pass 2's
		case 'downed': return { kind: 'rout', text: 'downed' };
		case 'hurt': return { kind: 'stagger', text: `-${formatBlow(event.power)}` };
		case 'cancelled': return { kind: 'ward', text: 'cancelled' };
		default: return null;
	}
}

// "1 site" reads better than "1 sites" on the verdict panel and in the log.
function plural(n, word) {
	return `${n} ${word}${n === 1 ? '' : 's'}`;
}

export default ReclamationMatch;
