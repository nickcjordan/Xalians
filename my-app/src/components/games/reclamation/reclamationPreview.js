/*
	Reclamation — the Orders resolution preview.

	ENGINE GAP: expeditionRules.js exposes no preview helper. pickAttackTarget /
	pickSupportTarget / buildResolutionOrder are module-private, and the public surface
	(send/pass/order/commitOrders/getPublicState) has no "what would happen" call. This
	module therefore MIRRORS the engine's targeting and ordering from the public state,
	using the engine's own creatureOnTable.prepare()/magnitudeAgainst() for every number
	so no arithmetic is duplicated — only the *choice* rules are.

	IT MUST BE KEPT IN SYNC with expeditionRules.js:
	  - buildResolutionOrder()   -> orderPreview() below
	  - pickAttackTarget()       -> pickAttackTargetPreview() below
	  - pickSupportTarget()      -> pickSupportTargetPreview() below
	  - enemiesInReach()         -> reachableEnemies() below
	If any of those change, change these. The preview is deliberately optimistic about
	information the player does not have: it sees only the visible board (hidden enemies
	are absent from getPublicState, so the preview cannot account for them), and it does
	not know the enemy's orders, exactly as the design doc's "The resolution preview
	shows, during Orders, the initiative order and each of your own creatures' chosen
	targets given the board, without the enemy's orders" requires.
*/

import { prepare, magnitudeAgainst, targetMatchupMultiplier } from '../../../gameplay/expedition/creatureOnTable';
import { getActClass, ACT_CLASS, ROUT_FRACTION, AREA_ACTIONS } from '../../../gameplay/expedition/expeditionInterpretation';
import { speciesLabel, formatHold } from './reclamationNarration';

const OTHER = { A: 'B', B: 'A' };

/*
	flattenBoard(publicState) -> [{ recordId, record, sentIndex, hidden, seat, site,
	prepared }] for every VISIBLE creature on the table, both sides.
*/
export function flattenBoard(publicState) {
	const out = [];
	publicState.world.sites.forEach((site) => {
		['A', 'B'].forEach((seat) => {
			(publicState.board[site.id][seat] || []).forEach((entry) => {
				if (!entry.record) {
					return;
				}
				out.push({
					recordId: entry.recordId,
					record: entry.record,
					sentIndex: entry.sentIndex,
					hidden: !!entry.hidden,
					seat,
					site,
					prepared: prepare(entry.record, site, publicState.world, entry.sentIndex),
				});
			});
		});
	});
	return out;
}

// mirrors expeditionRules.currentHoldOf: prepared hold, halved while staggered. The
// pack-bonded / solitary companion adjustments and drain bonuses are engine-internal
// per-resolution details; during Orders no drain has happened yet, and the companion
// counts are recomputed below in siteHoldTotal via prepareWithCompanions.
export function livingHold(unit, publicState) {
	const staggered = publicState.staggered && publicState.staggered[unit.recordId];
	return staggered ? unit.prepared.hold * 0.5 : unit.prepared.hold;
}

// mirrors expeditionRules.prepareEntry: pack-bonded/solitary read the OTHER visible
// creatures of the same seat at the same site.
export function prepareWithCompanions(publicState, record, site, sentIndex, seat, excludeRecordId) {
	const companions = (publicState.board[site.id][seat] || []).filter(
		(e) => e.record && e.recordId !== excludeRecordId && !e.hidden,
	);
	const kin = companions.filter((c) => c.record.species === record.species).length;
	return prepare(record, site, publicState.world, sentIndex, {
		packBondedKinAtSite: kin,
		solitaryAlliesAtSite: companions.length,
	});
}

// mirrors expeditionRules.enemiesInReach
export function reachableEnemies(unit, actClass, units) {
	const opponent = OTHER[unit.seat];
	if (actClass === ACT_CLASS.CONTACT || actClass === ACT_CLASS.REACH) {
		return units.filter((u) => u.seat === opponent && u.site.id === unit.site.id);
	}
	return units.filter((u) => u.seat === opponent);
}

function alliesOf(unit, units) {
	return units.filter((u) => u.seat === unit.seat && u.recordId !== unit.recordId);
}

function bestMagnitude(unit) {
	if (unit.prepared.acts.length === 0) {
		return 0;
	}
	return Math.max(...unit.prepared.acts.map((a) => a.magnitude));
}

// mirrors expeditionRules.applyMenacingRedirect
function applyMenacingRedirect(candidate, units, publicState) {
	if (!candidate) {
		return candidate;
	}
	const companions = units.filter((u) => u.seat === candidate.seat && u.site.id === candidate.site.id);
	const holds = companions.map((c) => livingHold(c, publicState));
	const weakest = Math.min(...holds);
	if (livingHold(candidate, publicState) !== weakest) {
		return candidate;
	}
	const menacer = companions.find((c) => c.recordId !== candidate.recordId && c.prepared.menacing);
	return menacer || candidate;
}

/*
	pickAttackTargetPreview — mirrors expeditionRules.pickAttackTarget, including the
	temperament tiebreak nudges and the menacing redirect.
*/
export function pickAttackTargetPreview(publicState, unit, actClass, units) {
	const conduct = unit.prepared.conduct;
	const candidates = reachableEnemies(unit, actClass, units).map((u) => ({
		unit: u,
		hold: livingHold(u, publicState),
		magnitude: bestMagnitude(u),
		initiative: u.prepared.initiative,
		sentIndex: u.sentIndex,
	}));
	if (candidates.length === 0) {
		return null;
	}
	const minBy = (pool, key) => pool.reduce((best, c) => (!best || c[key] < best[key] ? c : best), null);
	const maxBy = (pool, key) => pool.reduce((best, c) => (!best || c[key] > best[key] ? c : best), null);

	let chosen = null;
	switch (conduct.attacking) {
		case 'weakestEnemyInReach': {
			const staggered = candidates.filter((c) => publicState.staggered && publicState.staggered[c.unit.recordId]);
			chosen = minBy(staggered.length > 0 ? staggered : candidates, 'hold');
			break;
		}
		case 'strongestEnemyInReach':
			chosen = maxBy(candidates, 'hold');
			break;
		case 'enemySentEarliest':
			chosen = minBy(candidates, 'sentIndex');
			break;
		case 'enemyThreateningWeakestAlly': {
			const allies = alliesOf(unit, units).map((a) => ({ unit: a, hold: livingHold(a, publicState) }));
			const weakestAlly = minBy(allies, 'hold');
			const atSite = weakestAlly ? candidates.filter((c) => c.unit.site.id === weakestAlly.unit.site.id) : [];
			chosen = maxBy(atSite.length > 0 ? atSite : candidates, 'hold');
			break;
		}
		case 'enemyWithLowestMagnitude':
			chosen = minBy(candidates, 'magnitude');
			break;
		case 'slowerEnemyWeakestFirst': {
			const slower = candidates.filter((c) => c.initiative < unit.prepared.initiative);
			chosen = minBy(slower.length > 0 ? slower : candidates, 'hold');
			break;
		}
		case 'enemyMostVulnerableToElement':
			chosen = candidates.reduce((best, c) => {
				const eff = targetMatchupMultiplier(unit.record, c.unit.record);
				return !best || eff > best._eff ? { ...c, _eff: eff } : best;
			}, null);
			break;
		case 'enemyWithHighestMagnitude':
			chosen = maxBy(candidates, 'magnitude');
			break;
		case 'enemyRoutableElseWeakest': {
			const mine = bestMagnitude(unit);
			const routable = candidates.filter((c) => mine >= c.hold * ROUT_FRACTION);
			chosen = minBy(routable.length > 0 ? routable : candidates, 'hold');
			break;
		}
		default:
			chosen = minBy(candidates, 'sentIndex');
	}

	if (chosen && candidates.length > 1) {
		const tied = candidates.filter((c) => c.hold === chosen.hold);
		if (tied.length > 1) {
			if (conduct.isHighBoldness) {
				chosen = tied.reduce((best, c) => (c.hold > best.hold ? c : best));
			} else if (conduct.isLowBoldness) {
				chosen = tied.reduce((best, c) => (c.hold < best.hold ? c : best));
			}
		}
		if (conduct.isHighSociability) {
			const kin = tied.find((c) => c.unit.record.species === unit.record.species);
			if (kin) {
				chosen = kin;
			}
		}
	}
	if (actClass === ACT_CLASS.PROJECTION && conduct.isHighCuriosity) {
		const elsewhere = candidates.filter((c) => c.unit.site.id !== unit.site.id);
		if (elsewhere.length > 0 && !elsewhere.includes(chosen)) {
			chosen = elsewhere.reduce((best, c) => (!best || c.hold > best.hold ? c : best), chosen);
		}
	}
	const redirected = applyMenacingRedirect(chosen ? chosen.unit : null, units, publicState);
	return redirected || null;
}

// mirrors expeditionRules.pickSupportTarget
export function pickSupportTargetPreview(publicState, unit, units) {
	const conduct = unit.prepared.conduct;
	const allies = alliesOf(unit, units).map((a) => ({
		unit: a,
		hold: livingHold(a, publicState),
		magnitude: bestMagnitude(a),
		initiative: a.prepared.initiative,
		sentIndex: a.sentIndex,
	}));
	if (allies.length === 0) {
		return null;
	}
	const minBy = (pool, key) => pool.reduce((best, c) => (!best || c[key] < best[key] ? c : best), null);
	const maxBy = (pool, key) => pool.reduce((best, c) => (!best || c[key] > best[key] ? c : best), null);
	let chosen = null;
	switch (conduct.supporting) {
		case 'allyWithLeastHold': chosen = minBy(allies, 'hold'); break;
		case 'allyWithMostHold': chosen = maxBy(allies, 'hold'); break;
		case 'allySentEarliest': chosen = minBy(allies, 'sentIndex'); break;
		case 'self': return null;
		case 'fastestAlly': chosen = maxBy(allies, 'initiative'); break;
		case 'allyMostVulnerablePresent': {
			const enemies = units.filter((u) => u.seat === OTHER[unit.seat]);
			chosen = allies.reduce((best, a) => {
				const worst = enemies.length > 0
					? Math.max(...enemies.map((en) => targetMatchupMultiplier(en.record, a.unit.record)))
					: 0;
				return !best || worst > best._vuln ? { ...a, _vuln: worst } : best;
			}, null);
			break;
		}
		case 'allyWithHighestMagnitude': chosen = maxBy(allies, 'magnitude'); break;
		default: chosen = allies[0];
	}
	return chosen ? chosen.unit : null;
}

/*
	orderPreview(publicState, orders, you) -> [{ unit, action, act, target, sentence,
	magnitude, isYours }] in the engine's resolution order.

	`orders` is the human's own { recordId: actionName } map; every other creature falls
	back to its favored act (which is exactly what the engine does when no order is
	given). Enemy orders are unknown, so enemy rows show their favored act, marked.
*/
export function orderPreview(publicState, orders, you) {
	const units = flattenBoard(publicState);
	const actionFor = (unit) => {
		if (unit.seat === you && orders && orders[unit.recordId]) {
			return orders[unit.recordId];
		}
		return unit.prepared.favoredAct.action;
	};

	// mirrors buildResolutionOrder: ambush, then wards, then the rest; each group by
	// (not strained) then descending initiative, ties to the earlier sentIndex.
	const meta = units.map((unit) => ({
		unit,
		action: actionFor(unit),
		initiative: unit.prepared.initiative,
		strained: unit.prepared.strainLevel !== 'none',
	}));
	const cmp = (a, b) => {
		if (a.strained !== b.strained) {
			return a.strained ? 1 : -1;
		}
		if (b.initiative !== a.initiative) {
			return b.initiative - a.initiative;
		}
		return a.unit.sentIndex - b.unit.sentIndex;
	};
	const ambush = meta.filter((m) => m.action === 'ambush').sort(cmp);
	const ward = meta.filter((m) => m.action === 'ward').sort(cmp);
	const rest = meta.filter((m) => m.action !== 'ambush' && m.action !== 'ward').sort(cmp);
	const sequence = [...ambush, ...ward, ...rest];

	return sequence.map((m) => {
		const { unit, action } = m;
		const act = unit.prepared.acts.find((a) => a.action === action) || null;
		const actClass = act ? act.class : getActClass(action);
		const isYours = unit.seat === you;

		let target = null;
		let magnitude = null;
		if (action !== 'hold' && act) {
			if (actClass === ACT_CLASS.SUPPORT && action !== 'terrorize') {
				target = pickSupportTargetPreview(publicState, unit, units);
			} else {
				const cls = action === 'terrorize' ? ACT_CLASS.CONTACT : actClass;
				target = pickAttackTargetPreview(publicState, unit, cls, units);
				if (!target && action === 'terrorize') {
					target = pickAttackTargetPreview(publicState, unit, ACT_CLASS.PROJECTION, units);
				}
			}
			if (target) {
				magnitude = magnitudeAgainst(unit.record, act, target.record);
			}
		}

		return {
			unit,
			isYours,
			action,
			act,
			actClass,
			target,
			magnitude,
			ordered: isYours && orders && !!orders[unit.recordId],
			sentence: previewSentence({ unit, action, act, actClass, target, magnitude, publicState }),
		};
	});
}

/*
	pickAreaSitePreview — mirrors expeditionRules.pickAreaTargetSite: of the sites holding
	at least one enemy, the one with the most creatures present (both sides).
*/
export function pickAreaSitePreview(publicState, unit) {
	const opponent = OTHER[unit.seat];
	let best = null;
	let bestCount = -1;
	publicState.world.sites.forEach((site) => {
		const enemies = (publicState.board[site.id][opponent] || []).filter((e) => e.record).length;
		if (enemies === 0) {
			return;
		}
		const count = enemies + (publicState.board[site.id][unit.seat] || []).filter((e) => e.record).length;
		if (count > bestCount) {
			bestCount = count;
			best = site.name;
		}
	});
	return best;
}

/*
	previewSentence — the design brief's example shape:
	"Rakh strikes the weakest enemy at the Ash Wastes: Gorrel, hold 7"
*/
export function previewSentence({ unit, action, act, actClass, target, magnitude, publicState }) {
	const who = speciesLabel(unit.record);
	if (action === 'hold' || !act) {
		return `${who} holds at ${unit.site.name}, keeping its full hold.`;
	}
	const clause = conductClause(unit.prepared.conduct, actClass, action);
	const where = actClass === ACT_CLASS.PROJECTION ? 'anywhere on the world' : `at ${unit.site.name}`;
	if (!target) {
		return `${who} would ${action}, but finds ${clause} nowhere ${where}.`;
	}
	const targetHold = formatHold(livingHold(target, publicState));
	const forN = typeof magnitude === 'number' ? ` for ${magnitude}` : '';
	// an area act does not choose a creature, it chooses the site with the most standing
	// on it and catches both sides there (expeditionRules.pickAreaTargetSite), so the
	// sentence has to name the site rather than a target.
	if (AREA_ACTIONS.includes(action)) {
		const siteName = pickAreaSitePreview(publicState, unit);
		return siteName
			? `${who} ${actVerbPhrase(action)} ${siteName}, catching everything standing there, both sides, for ${magnitude}.`
			: `${who} would ${action}, but there is nothing on the world to catch.`;
	}
	return `${who} ${actVerbPhrase(action)} ${clause} ${where}: ${speciesLabel(target.record)}, hold ${targetHold}${forN}.`;
}

function actVerbPhrase(action) {
	const map = {
		strike: 'strikes', crush: 'crushes', rake: 'rakes', lash: 'lashes',
		shove: 'shoves', snare: 'snares', drain: 'drains', ambush: 'ambushes',
		beam: 'beams', hurl: 'hurls at', burst: 'bursts over', spray: 'sprays',
		cloud: 'clouds', ward: 'wards', mend: 'mends', terrorize: 'terrorizes',
	};
	return map[action] || action;
}

// the printed conduct sentence's noun phrase, per the design doc's conduct table
const ATTACKING_PHRASE = {
	weakestEnemyInReach: 'the weakest enemy',
	strongestEnemyInReach: 'the strongest enemy',
	enemySentEarliest: 'the enemy sent earliest',
	enemyThreateningWeakestAlly: 'the enemy threatening its weakest ally',
	enemyWithLowestMagnitude: 'the enemy with the lowest magnitude',
	slowerEnemyWeakestFirst: 'the slowest enemy it can outpace',
	enemyMostVulnerableToElement: 'the enemy its element is most effective against',
	enemyWithHighestMagnitude: 'the enemy with the highest magnitude',
	enemyRoutableElseWeakest: 'the strongest enemy it can rout',
};

const SUPPORTING_PHRASE = {
	allyWithLeastHold: 'the ally with the least hold',
	allyWithMostHold: 'the ally with the most hold',
	allySentEarliest: 'the ally sent earliest',
	self: 'itself',
	fastestAlly: 'the fastest ally',
	allyMostVulnerablePresent: 'the ally most vulnerable to the enemies present',
	allyWithHighestMagnitude: 'the ally with the highest magnitude',
};

export function conductClause(conduct, actClass, action) {
	if (actClass === ACT_CLASS.SUPPORT && action !== 'terrorize') {
		return SUPPORTING_PHRASE[conduct.supporting] || 'an ally';
	}
	return ATTACKING_PHRASE[conduct.attacking] || 'an enemy';
}

/*
	conductSentence(prepared) -> the printed conduct line for the dossier.
*/
export function conductSentence(prepared) {
	const attacking = ATTACKING_PHRASE[prepared.conduct.attacking] || 'an enemy';
	const supporting = SUPPORTING_PHRASE[prepared.conduct.supporting] || 'an ally';
	return `When it attacks it chooses ${attacking}. When it supports it chooses ${supporting}.`;
}

/*
	siteHoldTotal(publicState, siteId, seat) -> the live sum the Judge will compare, from
	the engine's own prepare() with the same companion counts the engine uses.
*/
export function siteHoldTotal(publicState, siteId, seat) {
	const site = publicState.world.sites.find((s) => s.id === siteId);
	return (publicState.board[siteId][seat] || [])
		.filter((e) => e.record)
		.reduce((sum, e) => {
			const prepared = prepareWithCompanions(publicState, e.record, site, e.sentIndex, seat, e.recordId);
			const staggered = publicState.staggered && publicState.staggered[e.recordId];
			return sum + (staggered ? prepared.hold * 0.5 : prepared.hold);
		}, 0);
}
