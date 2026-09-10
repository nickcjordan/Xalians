import React from 'react';
import { speciesLabel, formatHold, roleSentence } from './reclamationNarration';
import { RoleGlyph } from './reclamationGlyphs';
import { createTelemetry } from './reclamationTelemetry';

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
// the Ruling, already carrying the counted hold and whether it is hurt; here we also need
// to know which of those were downed or withdrew, which only the resolutionLog's attack
// events (downed) and the player's post-Ruling withdrawn/holding lists (everyone else)
// can say.
function fateOf(recordId, players) {
	if (players.A.holding.includes(recordId) || players.B.holding.includes(recordId)) {
		return 'held';
	}
	if ((players.A.downed || []).includes(recordId) || (players.B.downed || []).includes(recordId)) {
		return 'downed';
	}
	return 'withdrew';
}

/*
	Recovery under a bolster (assumption 19), per creature per round: the Ruling logs one
	`recover` event for each creature that got hold back, just before the judge event, so
	the world row can print "+2.1" beside the hold the Court counted.
*/
function recoveredByRound(match) {
	const byRound = new Map();
	let round = 0;
	(match.resolutionLog || []).forEach((event) => {
		if (!event) {
			return;
		}
		if (event.type === 'recover') {
			if (!byRound.has(round)) {
				byRound.set(round, {});
			}
			const forRound = byRound.get(round);
			forRound[event.recordId] = Math.round(((forRound[event.recordId] || 0) + event.amount) * 10) / 10;
			return;
		}
		if (event.type === 'judge') {
			round = typeof event.round === 'number' ? event.round + 1 : round + 1;
		}
	});
	return byRound;
}

function buildWorlds(match, you, recordsById) {
	const rival = otherSide(you);
	const worlds = [];
	const recovered = recoveredByRound(match);
	const judgeEvents = (match.resolutionLog || []).filter((e) => e && e.type === 'judge');
	judgeEvents.forEach((event) => {
		const frame = match.frames ? match.frames[event.round] : null;
		const siteResults = event.siteResults || {};
		Object.keys(siteResults).forEach((siteId) => {
			const result = siteResults[siteId];
			const site = frame ? frame.sites.find((s) => s.id === siteId) : null;
			const who = !result.winner ? 'court' : result.winner === you ? 'you' : 'rival';
			const entries = result.entries || { A: [], B: [] };
			// the judge entry carries the hold the Court counted and the role the creature
			// played (the base redesign's judge event), so the row needs nothing derived
			const recoveredHere = recovered.get(event.round) || {};
			const rowsFor = (side) => (entries[side] || []).map((e) => ({
				recordId: e.recordId,
				record: recordsById ? recordsById[e.recordId] || null : null,
				hold: e.hold,
				fullHold: e.fullHold,
				damage: e.damage || 0,
				role: e.role || null,
				hurt: !!e.hurt,
				recovered: recoveredHere[e.recordId] || 0,
				fate: fateOf(e.recordId, match.players),
			}));
			worlds.push({
				frameIndex: event.round,
				siteId,
				planet: site ? site.world.planet : (site && site.planet) || null,
				siteName: site ? site.name : siteId,
				element: site ? site.world.element : null,
				who,
				// the stake (Pass 3, assumption 22): what the Court counted this world for,
				// and which handlers staked it. Both come off the judge event's own
				// arithmetic, so the row never recomputes the Charter.
				countedValue: typeof result.countedValue === 'number' ? result.countedValue : 1,
				staked: result.staked || [],
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

function downsAndHurts(match, you) {
	// THE BASE: a landing attack is an 'attack' event with an outcome; the 'sweep' event
	// that precedes a burst is only its announcement and lands nothing itself
	const acts = (match.resolutionLog || []).filter((e) => e && e.type === 'attack');
	const sideOfRecord = (recordId) => {
		const inSide = (side) => side.holding.includes(recordId)
			|| side.withdrawn.includes(recordId)
			|| (side.downed || []).includes(recordId)
			|| side.roster.some((r) => r.id === recordId);
		if (inSide(match.players.A)) {
			return 'A';
		}
		if (inSide(match.players.B)) {
			return 'B';
		}
		return null;
	};
	let downsDealt = 0;
	let downsTaken = 0;
	let hurtsDealt = 0;
	let hurtsTaken = 0;
	acts.forEach((act) => {
		if (!act.target) {
			return;
		}
		const targetSide = sideOfRecord(act.target);
		if (!targetSide) {
			return;
		}
		const targetIsYou = targetSide === you;
		if (act.outcome === 'downed') {
			if (targetIsYou) {
				downsTaken++;
			} else {
				downsDealt++;
			}
		} else if (act.outcome === 'hurt') {
			if (targetIsYou) {
				hurtsTaken++;
			} else {
				hurtsDealt++;
			}
		}
	});
	return {
		downs: { dealt: downsDealt, taken: downsTaken },
		hurts: { dealt: hurtsDealt, taken: hurtsTaken },
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
		A: { roster: [], holding: [], withdrawn: [], downed: [], sentCount: 0, firstPasser: false },
		B: { roster: [], holding: [], withdrawn: [], downed: [], sentCount: 0, firstPasser: false },
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

	let downs = { dealt: 0, taken: 0 };
	let hurts = { dealt: 0, taken: 0 };
	try {
		const counted = downsAndHurts(normalizedMatch, you);
		downs = counted.downs;
		hurts = counted.hurts;
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
		downs,
		hurts,
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

// one creature on a world row: its role glyph, its name, and the hold the Court counted
function CreatureLine({ entries }) {
	if (!entries || entries.length === 0) {
		return <span className="rec-report-creature rec-report-creature--none">no one</span>;
	}
	return (
		<>
			{entries.map((e) => (
				<span className="rec-report-creature" key={e.recordId} data-report-creature={e.recordId}>
					{e.role && e.role !== 'none' && (
						<span className="rec-role-glyph rec-report-role" title={roleSentence(e.role)} data-role={e.role}>
							<RoleGlyph role={e.role} />
						</span>
					)}
					<span className="rec-report-creature-name">{speciesLabel(e.record)}</span>
					<span className="rec-report-creature-hold g-mono">{formatHold(e.hold)}</span>
					{e.recovered > 0 && (
						<span className="rec-report-creature-recovered g-mono" title={`Recovered ${formatHold(e.recovered)} under a bolster at the Ruling`}>+{formatHold(e.recovered)}</span>
					)}
					{e.fate === 'downed' && <span className="rec-report-creature-fate">downed</span>}
				</span>
			))}
		</>
	);
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
				{world.countedValue > 1 && (
					<span
						className="rec-report-world-counted g-mono"
						data-counted={world.countedValue}
						title={`Staked${(world.staked || []).length > 1 ? ' by both handlers' : ''}: it counted ${world.countedValue} toward the Charter.`}
					>
						x{world.countedValue}
					</span>
				)}
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
				<span className="rec-report-world-side rec-report-world-side--you"><strong>You</strong> <CreatureLine entries={world.yours} /></span>
				<span className="rec-report-world-side rec-report-world-side--rival"><strong>Rival</strong> <CreatureLine entries={world.theirs} /></span>
			</div>
		</div>
	);
}

/*
	ReclamationProvingNotes — the designer's own-play protocol
	(docs/design/game-validation-principles.md section 3, "Three questions after every
	match") as a panel on the report. Optional and does not gate "New Proving": the
	button above it always works with or without notes saved.

	Storage is injected two ways, whichever is cleanest for the caller: pass a
	`telemetry` prop (an object made by createTelemetry(), the same one the match
	already holds) or a `storage` prop (a raw storage-like object, localStorage shape),
	in which case this component makes its own createTelemetry({ storage }) internally.
	With neither, it falls back to createTelemetry({}) (real window.localStorage, or a
	no-op if that throws or is absent) so the panel still renders and "Save notes" still
	does something sensible rather than crashing. Tests inject `storage` with a fake
	object (see __tests__/reclamationReport.test.js).
*/
function useTelemetryFor(telemetry, storage) {
	if (telemetry) {
		return telemetry;
	}
	return createTelemetry({ storage });
}

class ReclamationProvingNotes extends React.Component {
	constructor(props) {
		super(props);
		this.telemetry = useTelemetryFor(props.telemetry, props.storage);
		const counts = this.readCounts();
		this.state = {
			tension: '',
			obvious: '',
			earned: 'unsure',
			saved: false,
			exported: false,
			exportText: '',
			notesCount: counts.notesCount,
			telemetryCount: counts.telemetryCount,
		};
	}

	readCounts = () => {
		let notesCount = 0;
		let telemetryCount = 0;
		try {
			notesCount = (this.telemetry.loadNotes() || []).length;
		} catch (err) {
			notesCount = 0;
		}
		try {
			telemetryCount = (this.telemetry.loadTelemetry() || []).length;
		} catch (err) {
			telemetryCount = 0;
		}
		return { notesCount, telemetryCount };
	};

	setTension = (e) => this.setState({ tension: e.target.value });

	setObvious = (e) => this.setState({ obvious: e.target.value });

	setEarned = (value) => this.setState({ earned: value });

	preventEnterSubmit = (e) => {
		if (e.key === 'Enter') {
			e.preventDefault();
		}
	};

	save = () => {
		const { seed, rivalId, won } = this.props;
		const { tension, obvious, earned } = this.state;
		try {
			this.telemetry.saveNotes({
				seed, rivalId, won, tension, obvious, earned,
			});
		} catch (err) {
			// saving is optional; the report and New Proving still work either way
		}
		const counts = this.readCounts();
		this.setState({ saved: true, notesCount: counts.notesCount, telemetryCount: counts.telemetryCount });
	};

	exportNotes = () => {
		let text = '';
		try {
			text = this.telemetry.exportAll();
		} catch (err) {
			text = '';
		}
		if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
			try {
				navigator.clipboard.writeText(text);
			} catch (err) {
				// clipboard may be unavailable (permissions, non-secure context); the
				// textarea below still lets the export be copied by hand
			}
		}
		this.setState({ exported: true, exportText: text });
	};

	render() {
		const {
			tension, obvious, earned, saved, exported, exportText, notesCount, telemetryCount,
		} = this.state;
		return (
			<div className="g-panel rec-notes" data-notes>
				<span className="g-kicker">Proving notes</span>
				<div className="rec-notes-row">
					<label className="rec-notes-label" htmlFor="rec-notes-tension">Where was the moment of most tension?</label>
					<input
						id="rec-notes-tension"
						type="text"
						className="g-input rec-notes-input"
						placeholder="Where was the moment of most tension?"
						value={tension}
						onChange={this.setTension}
						onKeyDown={this.preventEnterSubmit}
						data-notes-tension
					/>
				</div>
				<div className="rec-notes-row">
					<label className="rec-notes-label" htmlFor="rec-notes-obvious">Was there a turn where you knew what to do before looking?</label>
					<input
						id="rec-notes-obvious"
						type="text"
						className="g-input rec-notes-input"
						placeholder="Was there a turn where you knew what to do before looking?"
						value={obvious}
						onChange={this.setObvious}
						onKeyDown={this.preventEnterSubmit}
						data-notes-obvious
					/>
				</div>
				<div className="rec-notes-row">
					<span className="rec-notes-label">Did the result feel earned, or handed to you?</span>
					<div className="g-segmented rec-notes-earned" role="group" aria-label="Did the result feel earned, or handed to you?">
						{[
							{ key: 'earned', label: 'Earned' },
							{ key: 'handed', label: 'Handed' },
							{ key: 'unsure', label: 'Unsure' },
						].map((opt) => (
							<button
								key={opt.key}
								type="button"
								className="g-segment"
								aria-pressed={earned === opt.key}
								onClick={() => this.setEarned(opt.key)}
								data-notes-earned={opt.key}
							>
								{opt.label}
							</button>
						))}
					</div>
				</div>
				<div className="rec-notes-actions">
					<button
						type="button"
						className="g-btn g-btn--primary"
						onClick={this.save}
						disabled={saved}
						data-notes-save
					>
						{saved ? 'Saved' : 'Save notes'}
					</button>
					{saved && (
						<span className="rec-notes-saved" data-notes-saved-lamp>
							<span className="g-lamp g-lamp--amber" aria-hidden="true" />
							Saved
						</span>
					)}
				</div>
				<div className="rec-notes-export-row">
					<button type="button" className="g-btn" onClick={this.exportNotes} data-notes-export>
						Export notes
					</button>
					<span className="rec-notes-count g-mono" data-notes-count>
						{notesCount} {notesCount === 1 ? 'Proving' : 'Provings'} noted, {telemetryCount} recorded
					</span>
				</div>
				{exported && (
					<textarea
						className="g-input rec-notes-export"
						readOnly
						value={exportText}
						data-notes-export-text
						onFocus={(e) => e.target.select()}
					/>
				)}
			</div>
		);
	}
}

export function ReclamationReport({
	report, onNewProving, rivalName, seed, rivalId, telemetry, storage,
}) {
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
					<span className="rec-report-figure-value">{report.downs.dealt} / {report.downs.taken}</span>
					<span className="rec-report-figure-label">downs dealt / taken</span>
				</span>
				<span className="rec-report-figure" data-champion>
					<span className="rec-report-figure-value">{report.champion ? `${speciesLabel(report.champion.record)} ${formatHold(report.champion.hold)}` : 'none'}</span>
					<span className="rec-report-figure-label">{report.champion ? `held ${report.champion.planet || 'a world'} for you` : 'no world held'}</span>
				</span>
			</div>

			<ReclamationProvingNotes
				seed={seed}
				rivalId={rivalId}
				won={report.won}
				telemetry={telemetry}
				storage={storage}
			/>

			<button type="button" className="g-btn g-btn--primary" onClick={onNewProving} data-new-proving>
				New Proving
			</button>
		</div>
	);
}

export default ReclamationReport;
