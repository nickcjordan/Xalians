import React from 'react';
import { speciesLabel, formatHold } from './reclamationNarration';

/*
	Reclamation: the match report (docs/design/reclamation-play-enhancements.md, Pass 1,
	item 3: "the verdict becomes a match report... derived from the match alone").

	buildMatchReport(match, you, recordsById) reads only match.frames, match.resolutionLog,
	match.players, match.winner and match.matchEndReason, so it works on a phase 'matchEnd'
	state or on any later, still-shaped state (a saved-and-reloaded match). Pure function,
	no React; ReclamationReport below is the panel that renders its output.

	recordsById is optional: the raw judge log entries carry only a recordId (see the
	engine's judge() in expeditionRules.js), not the record itself, so a caller that still
	holds the full squads (the match page does) passes a map to get species names and
	dossiers in the report. Without it the report still returns every field; creature rows
	just carry record: null and speciesLabel(null) reads as "a creature".
*/

function otherSide(you) {
	return you === 'A' ? 'B' : 'A';
}

// the judge event's siteResults[siteId].entries.<side> lists every creature standing at
// judgement, already carrying the counted hold (staggered counted at half) and whether it
// was staggered; here we also need to know which of those were routed or withdrew, which
// only the resolutionLog's act events (routed) and the player's post-judge withdrawn/
// holding lists (everyone else) can say.
function fateOf(recordId, players) {
	if (players.A.holding.includes(recordId) || players.B.holding.includes(recordId)) {
		return 'held';
	}
	if (players.A.routed.includes(recordId) || players.B.routed.includes(recordId)) {
		return 'routed';
	}
	return 'withdrew';
}

function buildWorlds(match, you, recordsById) {
	const rival = otherSide(you);
	const worlds = [];
	const judgeEvents = (match.resolutionLog || []).filter((e) => e && e.type === 'judge');
	judgeEvents.forEach((event) => {
		const frame = match.frames ? match.frames[event.round] : null;
		const siteResults = event.siteResults || {};
		Object.keys(siteResults).forEach((siteId) => {
			const result = siteResults[siteId];
			const site = frame ? frame.sites.find((s) => s.id === siteId) : null;
			const who = !result.winner ? 'court' : result.winner === you ? 'you' : 'rival';
			const entries = result.entries || { A: [], B: [] };
			const rowsFor = (side) => (entries[side] || []).map((e) => ({
				recordId: e.recordId,
				record: recordsById ? recordsById[e.recordId] || null : null,
				hold: e.hold,
				staggered: !!e.staggered,
				fate: fateOf(e.recordId, match.players),
			}));
			worlds.push({
				frameIndex: event.round,
				siteId,
				planet: site ? site.world.planet : (site && site.planet) || null,
				siteName: site ? site.name : siteId,
				element: site ? site.world.element : null,
				who,
				holdYou: you === 'A' ? result.holdA : result.holdB,
				holdRival: you === 'A' ? result.holdB : result.holdA,
				yours: rowsFor(you),
				theirs: rowsFor(rival),
			});
		});
	});
	// nine entries max, in frame order then site order; a frame never played (the match
	// clinched early) simply never wrote a judge event, so it is already absent
	return worlds;
}

function routsAndStaggers(match, you) {
	const rival = otherSide(you);
	const acts = (match.resolutionLog || []).filter((e) => e && !e.type && Object.prototype.hasOwnProperty.call(e, 'outcome'));
	const sideOfRecord = (recordId) => {
		if (match.players.A.holding.includes(recordId) || match.players.A.withdrawn.includes(recordId) || match.players.A.routed.includes(recordId) || match.players.A.roster.some((r) => r.id === recordId)) {
			return 'A';
		}
		if (match.players.B.holding.includes(recordId) || match.players.B.withdrawn.includes(recordId) || match.players.B.routed.includes(recordId) || match.players.B.roster.some((r) => r.id === recordId)) {
			return 'B';
		}
		return null;
	};
	let routsDealt = 0;
	let routsTaken = 0;
	let staggersDealt = 0;
	let staggersTaken = 0;
	acts.forEach((act) => {
		if (!act.target) {
			return;
		}
		const targetSide = sideOfRecord(act.target);
		if (!targetSide) {
			return;
		}
		const targetIsYou = targetSide === you;
		if (act.outcome === 'routed') {
			if (targetIsYou) {
				routsTaken++;
			} else {
				routsDealt++;
			}
		} else if (act.outcome === 'staggered') {
			if (targetIsYou) {
				staggersTaken++;
			} else {
				staggersDealt++;
			}
		}
	});
	return {
		routs: { dealt: routsDealt, taken: routsTaken },
		staggers: { dealt: staggersDealt, taken: staggersTaken },
	};
}

function worldLabel(world) {
	if (!world) {
		return 'a world';
	}
	return `${world.planet || 'a world'}${world.siteName ? ` at ${world.siteName}` : ''}`;
}

// "the world that decided it": the world that clinched (the last judge event, if the
// match ended by clinching), or, if the frames were exhausted, the world won by the
// narrowest margin; for a tiebreak, the sentence instead names which rulebook tiebreak
// rule decided (rulebook order: more creatures unsent, then firstPasser, then the
// non-starter of the final round), per reclamation-design.md "The round" match-end text.
function decisiveSentence(match, you, worlds, reason) {
	const rival = otherSide(you);
	if (reason === 'clinched') {
		// the clinch is the winner's: of the worlds the winner took in the final round, the
		// one held by the narrowest margin is the one that was nearly not taken
		const winnerSide = match.winner === you ? 'you' : 'rival';
		const lastFrame = worlds.length ? worlds[worlds.length - 1].frameIndex : null;
		const taken = worlds.filter((w) => w.frameIndex === lastFrame && w.who === winnerSide);
		if (lastFrame === null || taken.length === 0) {
			return 'The Charter was decided before a world could be read.';
		}
		const closest = taken.reduce((best, w) => (!best || Math.abs(w.holdYou - w.holdRival) < Math.abs(best.holdYou - best.holdRival) ? w : best), null);
		const by = Math.abs(closest.holdYou - closest.holdRival);
		const winner = winnerSide === 'you' ? 'You' : 'The rival';
		return `${winner} clinched the Charter in round ${lastFrame + 1}, taking ${worldLabel(closest)} by ${formatHold(by)}.`;
	}
	if (reason === 'tiebreak') {
		const rosterYou = match.players[you].roster.length;
		const rosterRival = match.players[rival].roster.length;
		if (rosterYou !== rosterRival) {
			const holder = rosterYou > rosterRival ? you : rival;
			return holder === you
				? `Level on worlds, you held more creatures unsent and took the tiebreak.`
				: `Level on worlds, the rival held more creatures unsent and took the tiebreak.`;
		}
		const firstPasserYou = match.players[you].firstPasser;
		const firstPasserRival = match.players[rival].firstPasser;
		if (firstPasserYou !== firstPasserRival) {
			return firstPasserYou
				? `Level on worlds and unsent creatures, you passed first in the final round and took the tiebreak.`
				: `Level on worlds and unsent creatures, the rival passed first in the final round and took the tiebreak.`;
		}
		const nonStarterWins = match.starter === you ? rival : you;
		return nonStarterWins === you
			? `Level on every count, you were not the final round's starter and took the tiebreak.`
			: `Level on every count, the rival was not the final round's starter and took the tiebreak.`;
	}
	// frames-exhausted, not tied: the world won by the narrowest margin decided the total
	let narrowest = null;
	let narrowestMargin = Infinity;
	worlds.forEach((w) => {
		if (w.who === 'court') {
			return;
		}
		const margin = Math.abs(w.holdYou - w.holdRival);
		if (margin < narrowestMargin) {
			narrowestMargin = margin;
			narrowest = w;
		}
	});
	if (!narrowest) {
		return 'The Proving ran its third frame with no world decisively read.';
	}
	const winner = narrowest.who === 'you' ? 'You' : 'The rival';
	return `${winner} won ${worldLabel(narrowest)} by the narrowest margin, in round ${narrowest.frameIndex + 1}, and that decided the Charter.`;
}

function championOf(worlds, you) {
	let best = null;
	worlds.forEach((w) => {
		if (w.who !== 'you') {
			return;
		}
		w.yours.forEach((entry) => {
			if (!best || entry.hold > best.hold) {
				best = { record: entry.record, planet: w.planet, hold: entry.hold };
			}
		});
	});
	return best;
}

/*
	buildMatchReport(match, you, recordsById) -> the report object described in the task
	brief. Never throws: every read is defensive against a partial or empty match (e.g. a
	saved match with an empty resolutionLog, which should read as zero worlds rather than
	crash the report panel).
*/
export function buildMatchReport(match, you, recordsById) {
	const safeMatch = match || {};
	const players = safeMatch.players || {
		A: { roster: [], holding: [], withdrawn: [], routed: [], sentCount: 0, firstPasser: false },
		B: { roster: [], holding: [], withdrawn: [], routed: [], sentCount: 0, firstPasser: false },
	};
	const normalizedMatch = { ...safeMatch, players, resolutionLog: safeMatch.resolutionLog || [], frames: safeMatch.frames || [] };
	const rival = otherSide(you);

	let worlds = [];
	try {
		worlds = buildWorlds(normalizedMatch, you, recordsById);
	} catch (err) {
		worlds = [];
	}

	const sitesYou = players[you] ? players[you].sitesWon || 0 : 0;
	const sitesRival = players[rival] ? players[rival].sitesWon || 0 : 0;
	// read off the worlds actually judged, not an assumed frame count (a partial match may
	// not have judged every world yet)
	const sitesCourt = worlds.filter((w) => w.who === 'court').length;

	const rawReason = normalizedMatch.matchEndReason;
	const reason = rawReason === 'frames-exhausted' && sitesYou === sitesRival ? 'tiebreak' : rawReason;

	let decisive = '';
	try {
		decisive = decisiveSentence(normalizedMatch, you, worlds, reason);
	} catch (err) {
		decisive = 'The Charter was decided; the record of exactly how is incomplete.';
	}

	let sendsYou = 0;
	let sendsRival = 0;
	try {
		sendsYou = players[you] ? players[you].sentCount || 0 : 0;
		sendsRival = players[rival] ? players[rival].sentCount || 0 : 0;
	} catch (err) {
		sendsYou = 0;
		sendsRival = 0;
	}

	let routs = { dealt: 0, taken: 0 };
	let staggers = { dealt: 0, taken: 0 };
	try {
		const counted = routsAndStaggers(normalizedMatch, you);
		routs = counted.routs;
		staggers = counted.staggers;
	} catch (err) {
		// leave the zeroed defaults
	}

	let champion = null;
	try {
		champion = championOf(worlds, you);
	} catch (err) {
		champion = null;
	}

	return {
		won: normalizedMatch.winner === you,
		sitesYou,
		sitesRival,
		sitesCourt,
		reason: reason || 'frames-exhausted',
		worlds,
		sends: { you: sendsYou, rival: sendsRival },
		routs,
		staggers,
		decisive,
		champion,
	};
}

// ---------------------------------------------------------------------------
// ReclamationReport: the panel
// ---------------------------------------------------------------------------

function worldsByRound(worlds) {
	const rounds = new Map();
	worlds.forEach((w) => {
		const key = w.frameIndex;
		if (!rounds.has(key)) {
			rounds.set(key, []);
		}
		rounds.get(key).push(w);
	});
	return [...rounds.entries()].sort((a, b) => a[0] - b[0]);
}

function creatureLine(entries) {
	if (!entries || entries.length === 0) {
		return 'no one';
	}
	return entries
		.map((e) => {
			const name = speciesLabel(e.record);
			const tag = e.fate === 'routed' ? ' (routed)' : '';
			return `${name} ${formatHold(e.hold)}${tag}`;
		})
		.join(', ');
}

function WorldRow({ world, you }) {
	const whoText = world.who === 'you' ? 'yours' : world.who === 'rival' ? "the rival's" : 'to the Court';
	const youHigher = world.holdYou >= world.holdRival;
	return (
		<div className={`rec-report-world rec-report-world--${world.who}`} data-world-row>
			<div className="rec-report-world-head">
				<span className={`g-chip g-chip--outline rec-report-world-planet g-el-${world.element || 'fire'}`}>
					{world.planet || 'Unknown world'}
				</span>
				<span className="rec-report-world-site">{world.siteName}</span>
				<span className="rec-report-world-holds">
					<span className={`rec-report-hold rec-report-hold--you${youHigher && world.who === 'you' ? ' rec-report-hold--winner' : ''}`}>
						{formatHold(world.holdYou)}
					</span>
					<span className="rec-report-hold-sep">to</span>
					<span className={`rec-report-hold rec-report-hold--rival${!youHigher && world.who === 'rival' ? ' rec-report-hold--winner' : ''}`}>
						{formatHold(world.holdRival)}
					</span>
				</span>
				<span className="rec-report-world-who">{whoText}</span>
			</div>
			<div className="rec-report-world-creatures">
				<span className="rec-report-world-side rec-report-world-side--you"><strong>You</strong> {creatureLine(world.yours)}</span>
				<span className="rec-report-world-side rec-report-world-side--rival"><strong>Rival</strong> {creatureLine(world.theirs)}</span>
			</div>
		</div>
	);
}

export function ReclamationReport({ report, onNewProving, rivalName }) {
	const rival = rivalName || 'the rival';
	const rounds = worldsByRound(report.worlds || []);
	const why = report.reason === 'clinched'
		? 'clinched at five worlds'
		: report.reason === 'tiebreak'
			? 'settled on the tiebreak'
			: 'after the third frame';
	return (
		<div className={`g-panel rec-report rec-rise ${report.won ? 'rec-report--won' : 'rec-report--lost'}`} data-report>
			<span className="g-kicker">The Charter</span>
			<h2 className="rec-report-title">
				{report.won ? 'The Charter is yours.' : `The ${rival} takes the Charter.`}
			</h2>
			<p className="g-body rec-report-lede">
				{report.sitesYou} {report.sitesYou === 1 ? 'world' : 'worlds'} to {report.sitesRival}, {why}.
			</p>

			<div className="rec-report-worlds">
				{rounds.map(([frameIndex, worldsInRound]) => (
					<div className="rec-report-round" key={frameIndex}>
						<h3 className="rec-report-round-title">Round {frameIndex + 1}</h3>
						{worldsInRound.map((world) => (
							<WorldRow world={world} you="you" key={world.siteId} />
						))}
					</div>
				))}
			</div>

			<p className="g-body rec-report-decisive">{report.decisive}</p>

			<div className="rec-report-foot">
				<span className="rec-report-figure" data-sends>
					<span className="rec-report-figure-value"><span className="rec-report-hold--you">{report.sends.you}</span> / <span className="rec-report-hold--rival">{report.sends.rival}</span></span>
					<span className="rec-report-figure-label">sends spent, you / rival</span>
				</span>
				<span className="rec-report-figure" data-routs>
					<span className="rec-report-figure-value">{report.routs.dealt} / {report.routs.taken}</span>
					<span className="rec-report-figure-label">routs dealt / taken</span>
				</span>
				<span className="rec-report-figure" data-champion>
					<span className="rec-report-figure-value">{report.champion ? `${speciesLabel(report.champion.record)} ${formatHold(report.champion.hold)}` : 'none'}</span>
					<span className="rec-report-figure-label">{report.champion ? `held ${report.champion.planet || 'a world'} for you` : 'no world held'}</span>
				</span>
			</div>

			<button type="button" className="g-btn g-btn--primary" onClick={onNewProving} data-new-proving>
				New Proving
			</button>
		</div>
	);
}

export default ReclamationReport;
