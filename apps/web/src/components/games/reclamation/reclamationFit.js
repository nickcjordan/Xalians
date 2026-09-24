import { forecastClash, forecastSend, moveSwift, movableRecordIdsFor } from '@xalians/rules/expedition/expeditionRules';
import { prepare, baseHold, roleOf, strainMultiplierFor, wholeHoldsOn } from '@xalians/rules/expedition/creatureOnTable';
import { HOME_GROUND_MULTIPLIER } from '@xalians/rules/expedition/expeditionInterpretation';
import { strainCause } from './reclamationPreview';

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
	PASS 57, WHY A COLUMN IS AS TALL AS IT IS (docs/design/reclamation-attention-and-why.md).
	Nick, 2026-09-24: "it's still not obvious to me why one creature would fare better at one
	of the worlds over another ... it's obvious when the creature has an element that aligns
	to the element on the screen, but it's not obvious when it's any other combination."

	A send's swing is exactly the sum of three parts, all from the same two forecasts:

	  own      what the creature would still stand with after the Clash (0 when it falls)
	  allies   what it changes for your other creatures there (a bolster's lift, a shield's
	           cover, a pack's bond; negative for a solitary one)
	  taken    what the Clash would take off the rival there because it came

	and `toll` is what the Clash would take off it (its hold going in, less `own`). Its hold
	going in is made of its body and the world: `body` is what it holds at a world that
	neither favors nor strains it (baseHold: vitality, resilience and endurance), times 1.5
	on its home world, times a half or a quarter where the climate or the air strains it
	(a willful creature shrugs off one grade), and `company` is whatever bolsters and packs
	add on top. The element type chart is not in it: it has read 1 for every schema 5
	creature since the conversion (rules.elementMatchups, off as shipped).

	PASS 59, READ THE CARD (docs/design/reclamation-read-the-card.md). Nick, 2026-09-24: "I
	also don't understand what the icons are beneath each bar or how each bar is calculated."
	So each reason carries the factor it applies (`homeFactor`, `climate.factor`), which the
	card prints beside its mark, and a bolster standing alone is told apart from company: the
	rules let a bolster lift itself ("allies at its world, itself included"), and pass 57
	drew that as two figures on a world with nobody else on it. It is `selfLift` now, drawn
	with the bolster's own role mark.
*/
const BAND = { none: 1, strained: 0.5, severe: 0.25 };
export function breakdown(ownForecast, base, totals, record, site, reading, rules) {
	const f = ownForecast || null;
	const own = f && !f.downed ? f.hold : 0;
	const going = f && typeof f.before === 'number' ? f.before : own;
	const body = baseHold(record, rules);
	const level = reading ? reading.strainLevel : 'none';
	const held = reading ? reading.heldStrainLevel || level : 'none';
	const home = !!(reading && reading.isHome);
	const tolerance = (record.physiology && record.physiology.environmentalTolerance) || {};
	const cause = held !== 'none'
		? (strainCause({ temperatureC: tolerance.temperatureC, ambientMedia: tolerance.ambientMedia || [], breathes: (record.physiology && record.physiology.breathes) || [] }, site) || 'strained')
		: null;
	// rounded as the engine rounds a hold at a world (rules.wholeHolds), so a plain 13 x 1/2 is 7 and no company
	const plain = body * (home ? HOME_GROUND_MULTIPLIER : 1) * (BAND[held] || 1);
	const expected = wholeHoldsOn(rules) ? Math.round(plain) : plain;
	const lift = going - expected;
	// a bolster with none of yours beside it can only have lifted itself
	const self = Math.abs(lift) >= 0.5 && !(base.mine > EPS) && roleOf(record, rules) === 'bolster';
	const allies = totals.mine - own - base.mine;
	return {
		own,
		going,
		// pass 58: what your side there would gain, the only number a card prints for the send
		gain: own + allies,
		toll: Math.max(0, going - own),
		falls: !!(f && f.downed && going > EPS),
		allies,
		taken: Math.max(0, base.theirs - totals.theirs),
		body,
		home,
		homeFactor: home ? HOME_GROUND_MULTIPLIER : 1,
		climate: held !== 'none' ? { level: held, cause, medium: (site.environment && site.environment.medium) || null, factor: strainMultiplierFor(held) } : null,
		// willpower lifted its grade here: it would be strained, and is not (or less so)
		shrugged: level !== held,
		company: Math.abs(lift) >= 0.5 && !self ? lift : 0,
		selfLift: self ? lift : 0,
	};
}

/*
	The strip's scale: one for the whole bench, so a column on one card reads against the
	columns on the next. The tallest column any card could draw (what it would go in with
	and what it would add to your creatures there; since pass 58 what it takes off the rival
	is not part of the column), rounded up to a step of six, between FIT_SCALE and twice it;
	a column past the cap is clipped and marked.
*/
const cellsOf = (fits) => {
	const out = [];
	['fits', 'moves'].forEach((key) => {
		Object.values((fits && fits[key]) || {}).forEach((row) => Object.values(row || {}).forEach((cell) => {
			if (cell) out.push(cell);
		}));
	});
	return out;
};
export function fitScale(fits) {
	let top = FIT_SCALE;
	cellsOf(fits).forEach((cell) => {
		top = Math.max(top, (cell.going || 0) + Math.max(0, cell.allies || 0), cell.gain || 0);
	});
	return Math.min(FIT_SCALE * 2, Math.ceil(top / 6) * 6);
}

/*
	PASS 58. Whether any column on the bench would take something off the rival: then every
	card keeps the top of its columns for the rival's side (the brass tag of what it would
	take), so a column never runs up under a tag and the columns still read on one scale.
*/
export const FIT_RIVAL_ROOM = 0.76;
export function fitTakesAny(fits) {
	return cellsOf(fits).some((cell) => (cell.taken || 0) > EPS);
}

/*
	fitTable(match, seat, records, roleOf?) -> {
		forecast,                         the board as it stands
		base: { [siteId]: { mine, theirs } },
		fits: { [recordId]: { [siteId]: {
			swing,     how much this send moves your forecast margin at that world (pass 58:
			           never printed, because it adds the rival's loss to your gain)
			gain,      what your side there would gain: its own hold after the Clash and what
			           it adds to your creatures there (breakdown(), with its parts)
			taken,     what the rival's side there would lose
			rivalBefore  the rival's total there as the board stands (its tag reads
			           rivalBefore -> rivalBefore - taken)
			clear,     what the rival would still lead by there after this send, less what you
			           already have there: the gain must pass it to put you ahead
			downs,     how many of the rival's creatures there this send would down
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
// the rival's creatures at a world that `after` downs and the board as it stands does not
function downsAt(match, seat, base, after, siteId) {
	const siteBoard = match.board[siteId];
	if (!siteBoard || !after) {
		return 0;
	}
	return siteBoard[other(seat)].filter((e) => !e.hidden).filter((e) => {
		const f = after[e.recordId];
		const b = base && base[e.recordId];
		return f && f.downed && !(b && b.downed);
	}).length;
}

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
				clear: Math.max(0, totals.theirs - before.mine),
				rivalBefore: before.theirs,
				downs: downsAt(match, seat, forecast, after, site.id),
				takes: deficit > EPS && marginAfter > EPS,
				hold: reading ? reading.hold : null,
				isHome: !!(reading && reading.isHome),
				strainLevel: reading ? reading.strainLevel : 'none',
				forecast: after,
				...breakdown(after[record.id], before, totals, record, site, reading, match.rules),
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
			// pass 58: the column reads the world it would join, the same parts as a send there
			const to = totals[site.id];
			const from = base[site.id];
			const f = after[recordId];
			const own = f && !f.downed ? f.hold : 0;
			const going = f && typeof f.before === 'number' ? f.before : own;
			row[site.id] = {
				swing,
				after: totals,
				forecast: after,
				own,
				going,
				gain: to.mine - from.mine,
				allies: to.mine - from.mine - own,
				toll: Math.max(0, going - own),
				falls: !!(f && f.downed && going > EPS),
				taken: Math.max(0, from.theirs - to.theirs),
				rivalBefore: from.theirs,
				clear: Math.max(0, to.theirs - from.mine),
				downs: downsAt(match, seat, forecast, after, site.id),
				takes: from.theirs - from.mine > EPS && to.mine - to.theirs > EPS,
			};
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
