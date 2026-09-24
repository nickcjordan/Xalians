import { forecastClash, forecastSend, moveSwift, movableRecordIdsFor } from '@xalians/rules/expedition/expeditionRules';
import { prepare } from '@xalians/rules/expedition/creatureOnTable';

/*
	PASS 52, THE GLANCE REDESIGN (docs/design/reclamation-glance-redesign.md).

	What the table draws without being asked: every world's forecast totals (its standing,
	pass 54), and what each creature in hand would do to each world if sent there now (the
	fit strip on its card). Every number is the engine's: forecastClash() for the board as
	it stands, forecastSend() for the board with one more creature on it, both blind to
	the opponent's hidden sends. Nothing here is React.
*/

// a fit column is full at this much margin; a hold bar is full at this much hold (levers)
export const FIT_SCALE = 24;
export const HOLD_BAR_SCALE = 24;
// below this a difference is the rounding of the forecast, not a lead
const EPS = 0.05;

function other(seat) {
	return seat === 'A' ? 'B' : 'A';
}

/*
	The two sides' totals at one world under a forecast: the creatures `seat` can see there
	(its own, and the opponent's that arrived in the open), each at the hold the forecast
	leaves it, a fallen one at nothing. `extraId` is a creature placed by forecastSend.
	PASS 54: `mineBefore` and `theirsBefore` are the same creatures at the hold they go into
	the Clash with (the forecast's `before`), so the standing can draw what the Clash takes.
*/
export function forecastTotalsAt(match, seat, forecast, siteId, extraId) {
	const siteBoard = match.board[siteId];
	if (!siteBoard || !forecast) {
		return { mine: 0, theirs: 0, mineBefore: 0, theirsBefore: 0 };
	}
	const held = (id) => (forecast[id] && !forecast[id].downed ? forecast[id].hold : 0);
	const going = (id) => (forecast[id] && typeof forecast[id].before === 'number' ? forecast[id].before : held(id));
	const mineIds = siteBoard[seat].map((e) => e.recordId);
	if (extraId && !mineIds.includes(extraId)) {
		mineIds.push(extraId);
	}
	const theirIds = siteBoard[other(seat)].filter((e) => !e.hidden).map((e) => e.recordId);
	return {
		mine: mineIds.reduce((sum, id) => sum + held(id), 0),
		theirs: theirIds.reduce((sum, id) => sum + held(id), 0),
		mineBefore: mineIds.reduce((sum, id) => sum + going(id), 0),
		theirsBefore: theirIds.reduce((sum, id) => sum + going(id), 0),
	};
}

/*
	fitTable(match, seat, records, roleOf?) -> {
		forecast,                         the board as it stands
		base: { [siteId]: { mine, theirs } },
		fits: { [recordId]: { [siteId]: {
			swing,     how much this send moves your forecast margin at that world
			after,     { mine, theirs } there after it
			deficit,   how far the rival leads there now (0 when it does not)
			takes,     the rival leads there now and this send alone would put you ahead
			hold, isHome, strainLevel,   the creature's own reading there
			forecast,  the whole forecast with it sent there
		} } },
		moves: { [recordId]: { [siteId]: {      pass 55: a swift creature of yours on the board
			swing,     how much stepping it there now moves the whole frame your way (the world
			           it leaves and the world it joins together)
			after,     { [siteId]: { mine, theirs, mineBefore, theirsBefore } } across the frame
			forecast,  the whole forecast with it moved there
		} } },
	}

	`roleOf(recordId)` names a chosen act (the act flip) for a creature, when there is one.
*/
export function fitTable(match, seat, records, roleOf) {
	if (!match || match.phase !== 'deploy') {
		return null;
	}
	const frame = match.frames[match.frameIndex];
	const forecast = forecastClash(match, seat) || {};
	const base = {};
	frame.sites.forEach((site) => {
		base[site.id] = forecastTotalsAt(match, seat, forecast, site.id);
	});
	const fits = {};
	(records || []).forEach((record) => {
		const row = {};
		frame.sites.forEach((site) => {
			const role = roleOf ? roleOf(record.id) : null;
			let after = null;
			try {
				after = forecastSend(match, seat, record.id, site.id, role || null);
			} catch (e) {
				after = null;
			}
			if (!after) {
				return;
			}
			let reading = null;
			try {
				reading = prepare(record, site, site.world, match.players[seat].sentCount, { rules: match.rules });
			} catch (e) {
				reading = null;
			}
			const before = base[site.id];
			const totals = forecastTotalsAt(match, seat, after, site.id, record.id);
			const marginBefore = before.mine - before.theirs;
			const marginAfter = totals.mine - totals.theirs;
			const deficit = Math.max(0, -marginBefore);
			row[site.id] = {
				swing: marginAfter - marginBefore,
				after: totals,
				deficit,
				takes: deficit > EPS && marginAfter > EPS,
				hold: reading ? reading.hold : null,
				isHome: !!(reading && reading.isHome),
				strainLevel: reading ? reading.strainLevel : 'none',
				forecast: after,
			};
		});
		fits[record.id] = row;
	});
	/*
		PASS 55. A swift creature already on the board may step to another world once a round,
		so its card carries columns for that too: the move forecast, netted across the frame,
		because a move takes a creature away from one world as it gives it to another.
	*/
	const moves = {};
	let movable = [];
	try {
		movable = match.turn === seat ? movableRecordIdsFor(match, seat) : [];
	} catch (e) {
		movable = [];
	}
	const marginOf = (t) => t.mine - t.theirs;
	movable.forEach((recordId) => {
		const row = {};
		frame.sites.forEach((site) => {
			// the engine's own move and forecast (forecastMove() is the same two calls); the moved
			// board is kept, because the totals must count the creature where it now stands
			let moved = null;
			let after = null;
			try {
				moved = moveSwift(match, seat, recordId, site.id);
				after = moved ? forecastClash(moved, seat) : null;
			} catch (e) {
				after = null;
			}
			if (!after) {
				return;
			}
			const totals = {};
			let swing = 0;
			frame.sites.forEach((s) => {
				totals[s.id] = forecastTotalsAt(moved, seat, after, s.id);
				swing += marginOf(totals[s.id]) - marginOf(base[s.id]);
			});
			row[site.id] = { swing, after: totals, forecast: after };
		});
		moves[recordId] = row;
	});
	return { forecast, base, fits, moves };
}

/*
	PASS 54. THE STANDING'S SCALE. Every world's two bars are drawn on one scale, so a bar
	at one world can be read against a bar at the next. The scale is the largest amount any
	bar could show in this state: each side's total going into the Clash at every world, and
	with a fit table every total a send of any creature in hand would make, so pointing from
	one creature to the next never rescales the table under the pointer. Rounded up to a
	step of six, never below STANDING_FLOOR, so a round's first send does not fill its world.
*/
export const STANDING_FLOOR = 24;
const STANDING_STEP = 6;
export function standingScale(fits, extra) {
	let top = STANDING_FLOOR;
	const take = (v) => {
		if (typeof v === 'number' && Number.isFinite(v) && v > top) {
			top = v;
		}
	};
	(extra || []).forEach(take);
	if (fits) {
		Object.values(fits.base || {}).forEach((t) => [t.mine, t.theirs, t.mineBefore, t.theirsBefore].forEach(take));
		Object.values(fits.fits || {}).forEach((row) => Object.values(row || {}).forEach((cell) => {
			if (cell && cell.after) {
				[cell.after.mine, cell.after.theirs, cell.after.mineBefore, cell.after.theirsBefore].forEach(take);
			}
		}));
	}
	return Math.ceil(top / STANDING_STEP) * STANDING_STEP;
}

/*
	The round track: one square per world of the game, three rounds of three, from the
	Ruling events in the log. Each square: { siteId, planet, element, who: 'mine' | 'theirs'
	| 'tie' | null, staked, current }.
*/
export function roundTrack(frames, log, you, currentIndex) {
	const results = {};
	(log || []).forEach((event) => {
		if (event && event.type === 'judge' && event.siteResults) {
			Object.entries(event.siteResults).forEach(([siteId, result]) => {
				results[siteId] = result;
			});
		}
	});
	return (frames || []).map((frame, index) => ({
		index,
		current: index === currentIndex,
		sites: frame.sites.map((site) => {
			const result = results[site.id];
			const who = !result ? null : result.winner === you ? 'mine' : result.winner ? 'theirs' : 'tie';
			return {
				siteId: site.id,
				planet: site.world.planet,
				element: site.world.element,
				who,
				staked: !!(result && result.countedValue > 1),
			};
		}),
	}));
}
