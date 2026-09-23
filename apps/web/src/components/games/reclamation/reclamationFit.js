import { forecastClash, forecastSend } from '@xalians/rules/expedition/expeditionRules';
import { prepare } from '@xalians/rules/expedition/creatureOnTable';

/*
	PASS 52, THE GLANCE REDESIGN (docs/design/reclamation-glance-redesign.md).

	What the table draws without being asked: every world's forecast totals (the front
	line), and what each creature in hand would do to each world if sent there now (the
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
*/
export function forecastTotalsAt(match, seat, forecast, siteId, extraId) {
	const siteBoard = match.board[siteId];
	if (!siteBoard || !forecast) {
		return { mine: 0, theirs: 0 };
	}
	const held = (id) => (forecast[id] && !forecast[id].downed ? forecast[id].hold : 0);
	const mineIds = siteBoard[seat].map((e) => e.recordId);
	if (extraId && !mineIds.includes(extraId)) {
		mineIds.push(extraId);
	}
	const theirIds = siteBoard[other(seat)].filter((e) => !e.hidden).map((e) => e.recordId);
	return {
		mine: mineIds.reduce((sum, id) => sum + held(id), 0),
		theirs: theirIds.reduce((sum, id) => sum + held(id), 0),
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
	return { forecast, base, fits };
}

/*
	The fraction of a world's field that is the rival's ground: 0 is all yours, 1 all
	theirs, a half is level. Null when nobody stands there.
*/
export function frontFraction(theirs, mine) {
	const total = (theirs || 0) + (mine || 0);
	if (!(total > EPS)) {
		return null;
	}
	return theirs / total;
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
