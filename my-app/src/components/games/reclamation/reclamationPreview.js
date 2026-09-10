/*
	Reclamation - the arithmetic preview (docs/design/reclamation-base-redesign.md,
	"Interface consequences").

	THE BASE. Orders are gone, so there is no plan to preview: what a handler needs
	before a send is the arithmetic of the send itself. This module answers two
	questions, both in numbers:

		ghostPlanFor()  what this creature would do at this world - its hold there after
		                strain and any bolster, and, for an attack, the target its instinct
		                would pick and the number that target would lose (with "downs" when
		                the number reaches the target's remaining hold); for a shield, the
		                attack it would cancel; for a bolster, the hold it would give back.
		threatsFor()    what each of your creatures would lose this round to the worst
		                visible enemy attack, and whether that would down it.

	ENGINE GAP, unchanged in kind: expeditionRules exposes no preview call.
	pickAttackTarget and the resolution order are module-private, so the *choice* rules
	are mirrored here while every NUMBER comes from the engine's own
	creatureOnTable.prepare() and expeditionRules.attackPowerAgainst().

	IT MUST BE KEPT IN SYNC with expeditionRules.js:
	  - pickAttackTarget()  -> pickAttackTargetPreview() below, instinct lanes included
	  - applyMenacingRedirect() -> applyMenacingRedirect() below
	Worlds are sealed (assumption 3), so "in reach" is always "at this site" and there is
	no projection branch left to mirror. The preview is deliberately optimistic about
	information the player does not have: it sees only the visible board, so a hidden
	enemy is absent from it, exactly as it is absent from getPublicState.
*/

import { prepare, magnitudeAgainst, targetMatchupMultiplier } from '../../../gameplay/expedition/creatureOnTable';
import { attackPowerAgainst } from '../../../gameplay/expedition/expeditionRules';
import { ROLE, instinctLaneOf, presenceScaleOf } from '../../../gameplay/expedition/expeditionInterpretation';
import { speciesLabel, formatHold, roleSentence } from './reclamationNarration';

const OTHER = { A: 'B', B: 'A' };

// the engine's attackPowerAgainst takes an internal state only to read its rules off it
// (expeditionRules.rulesOf), and two entries only to read their records; the public view
// carries the same rules, so the preview calls it with exactly that much.
function attackPower(publicState, actorRecord, preparedActor, targetRecord) {
	if (!preparedActor || !preparedActor.blow || !targetRecord) {
		return 0;
	}
	return attackPowerAgainst(
		{ rules: publicState ? publicState.rules : undefined },
		{ record: actorRecord },
		preparedActor,
		{ record: targetRecord },
	);
}

export { attackPower };

function rulesOfView(publicState) {
	return publicState && publicState.rules ? publicState.rules : undefined;
}

/*
	flattenBoard(publicState) -> [{ recordId, record, sentIndex, hidden, seat, site,
	entry, prepared }] for every VISIBLE creature on the table, both sides.
*/
export function flattenBoard(publicState) {
	const out = [];
	publicState.frame.sites.forEach((site) => {
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
					entry,
					prepared: prepareWithCompanions(publicState, entry.record, site, entry.sentIndex, seat, entry.recordId),
				});
			});
		});
	});
	return out;
}

/*
	livingHold: the hold the Ruling would count for this creature right now. Attacks subtract
	(assumption 5), so the engine keeps a mutable `currentHold` per board entry and the
	view carries it; before any attack has landed it equals the prepared hold.
*/
export function livingHold(unit) {
	if (unit && unit.entry && typeof unit.entry.currentHold === 'number') {
		return unit.entry.currentHold;
	}
	return unit && unit.prepared ? unit.prepared.hold : 0;
}

// the engine stamps `role` on every board row; only a row the table synthesised (a
// rival's hidden send, revealed for playback) has none, and that one is prepared
function roleOfRow(publicState, row, site) {
	if (row.role !== undefined) {
		return row.role;
	}
	return prepare(row.record, site, null, row.sentIndex, { rules: rulesOfView(publicState) }).role;
}

/*
	bolsterInForceView - mirrors expeditionRules.bolsterInForce: the strongest presence
	standing at this site on this side, ITSELF INCLUDED (assumption 8), since bolsters
	never stack and charisma prices what one restores (assumption 17). `own` is the
	creature being prepared, which counts as its own bolsterer when it is a bolster.
*/
function bolsterInForceView(publicState, site, seat, rows, own) {
	const rules = rulesOfView(publicState);
	let best = null;
	const consider = (record) => {
		const scale = presenceScaleOf(record, rules);
		if (!best || scale > best.scale) {
			best = { record, scale };
		}
	};
	rows.forEach((row) => {
		if (roleOfRow(publicState, row, site) === ROLE.BOLSTER) {
			consider(row.record);
		}
	});
	if (own && own.role === ROLE.BOLSTER) {
		consider(own.record);
	}
	return best;
}

// mirrors expeditionRules.prepareEntry: pack-bonded/solitary read the OTHER visible
// creatures of the same seat at the same site; a bolsterer standing there lifts one grade
// of strain for everyone on its side, itself included (assumption 8), scaled by that
// bolsterer's charisma (assumption 17).
export function prepareWithCompanions(publicState, record, site, sentIndex, seat, excludeRecordId) {
	const companions = (publicState.board[site.id][seat] || []).filter(
		(e) => e.record && e.recordId !== excludeRecordId && !e.hidden,
	);
	const kin = companions.filter((c) => c.record.species === record.species).length;
	const rules = rulesOfView(publicState);
	const own = prepare(record, site, null, sentIndex, { rules });
	const bolster = bolsterInForceView(publicState, site, seat, companions, own);
	return prepare(record, site, null, sentIndex, {
		packBondedKinAtSite: kin,
		solitaryAlliesAtSite: companions.length,
		bolstered: !!bolster,
		bolsterScale: bolster ? bolster.scale : 1,
		rules,
	});
}

// mirrors expeditionRules.enemiesAtSite: sealed worlds, so only this site
function enemiesAtSite(unit, units) {
	const opponent = OTHER[unit.seat];
	return units.filter((u) => u.seat === opponent && u.site.id === unit.site.id);
}

function alliesAtSite(unit, units) {
	return units.filter((u) => u.seat === unit.seat && u.site.id === unit.site.id && u.recordId !== unit.recordId);
}

// mirrors expeditionRules.applyMenacingRedirect
function applyMenacingRedirect(candidate, units) {
	if (!candidate) {
		return candidate;
	}
	const companions = units.filter((u) => u.seat === candidate.seat && u.site.id === candidate.site.id);
	const weakest = Math.min(...companions.map((c) => livingHold(c)));
	if (livingHold(candidate) !== weakest) {
		return candidate;
	}
	const menacer = companions.find((c) => c.recordId !== candidate.recordId && c.prepared.menacing);
	return menacer || candidate;
}

/*
	pickAttackTargetPreview - mirrors expeditionRules.pickAttackTarget, including Pass 2's
	instinct lanes (keen picks the enemy it can down, dull hits the enemy sent earliest,
	between the two the archetype's line), the temperament tiebreak nudges and the
	menacing redirect. `unit` may be a real board unit or a ghost (a creature not yet
	sent, prepared at the site it is being pointed at).
*/
export function pickAttackTargetPreview(publicState, unit, units) {
	const conduct = unit.prepared.conduct;
	const rules = rulesOfView(publicState);
	const candidates = enemiesAtSite(unit, units).map((u) => ({
		unit: u,
		hold: livingHold(u),
		magnitude: u.prepared.blowMagnitude,
		speed: u.prepared.speed,
		sentIndex: u.sentIndex,
		hurt: !!(u.entry && u.entry.hurt),
	}));
	if (candidates.length === 0) {
		return null;
	}
	const minBy = (pool, key) => pool.reduce((best, c) => (!best || c[key] < best[key] ? c : best), null);
	const maxBy = (pool, key) => pool.reduce((best, c) => (!best || c[key] > best[key] ? c : best), null);

	const lane = instinctLaneOf(unit.record, rules);
	if (lane === 'keen') {
		const withPower = candidates.map((c) => ({ c, power: attackPower(publicState, unit.record, unit.prepared, c.unit.record) }));
		const downable = withPower.filter((x) => x.power >= x.c.hold);
		const pool = downable.length > 0 ? downable : withPower;
		const key = downable.length > 0 ? (x) => x.c.hold : (x) => Math.min(x.power, x.c.hold);
		const keen = pool.reduce((best, x) => {
			if (!best) {
				return x;
			}
			if (key(x) !== key(best)) {
				return key(x) > key(best) ? x : best;
			}
			return x.c.sentIndex < best.c.sentIndex ? x : best;
		}, null);
		return applyMenacingRedirect(keen ? keen.c.unit : null, units) || null;
	}
	if (lane === 'dull') {
		const dull = minBy(candidates, 'sentIndex');
		return applyMenacingRedirect(dull ? dull.unit : null, units) || null;
	}

	let chosen = null;
	switch (conduct.attacking) {
		case 'weakestEnemyInReach': {
			const hurt = candidates.filter((c) => c.hurt);
			chosen = minBy(hurt.length > 0 ? hurt : candidates, 'hold');
			break;
		}
		case 'strongestEnemyInReach':
			chosen = maxBy(candidates, 'hold');
			break;
		case 'enemySentEarliest':
			chosen = minBy(candidates, 'sentIndex');
			break;
		case 'enemyThreateningWeakestAlly':
			// sealed worlds: the hardest enemy standing here threatens every ally at once
			chosen = maxBy(candidates, 'hold');
			break;
		case 'enemyWithLowestMagnitude':
			chosen = minBy(candidates, 'magnitude');
			break;
		case 'slowerEnemyWeakestFirst': {
			const slower = candidates.filter((c) => c.speed < unit.prepared.speed);
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
			const downable = candidates.filter(
				(c) => attackPower(publicState, unit.record, unit.prepared, c.unit.record) >= c.hold,
			);
			chosen = minBy(downable.length > 0 ? downable : candidates, 'hold');
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
	const redirected = applyMenacingRedirect(chosen ? chosen.unit : null, units);
	return redirected || null;
}

// DEPRECATED alias, one pass only: the old name for pickAttackTargetPreview.
export const pickBlowTargetPreview = pickAttackTargetPreview;

/*
	ghostPlanFor(publicState, record, site, seat, sentIndex) -> {
		hold, role, roleLine, lines: [string], targetRecordId
	}

	The whole of what the table prints under a creature pointed at a world: its hold there
	after strain and any bolster already standing, the role sentence, and one arithmetic
	line saying what the role would actually do to the board as it stands.
*/
export function ghostPlanFor(publicState, record, site, seat, sentIndex) {
	const prepared = prepareWithCompanions(publicState, record, site, sentIndex, seat, record.id);
	const units = flattenBoard(publicState);
	const ghost = {
		recordId: record.id, record, sentIndex, hidden: false, seat, site, entry: null, prepared,
	};
	const role = prepared.role;
	const lines = [];
	let targetRecordId = null;

	if (role === ROLE.STRIKE || role === ROLE.SWEEP) {
		if (role === ROLE.SWEEP) {
			const caught = units.filter((u) => u.site.id === site.id);
			if (caught.length === 0) {
				lines.push('nothing stands here to catch');
			} else {
				caught.forEach((victim) => {
					const amount = attackPower(publicState, record, prepared, victim.record);
					const hold = livingHold(victim);
					const downs = amount >= hold;
					lines.push(`${downs ? 'downs' : `takes ${formatHold(amount)} off`} ${speciesLabel(victim.record)}${victim.seat === seat ? ' (yours)' : ''}`);
				});
			}
		} else {
			const target = pickAttackTargetPreview(publicState, ghost, units);
			if (!target) {
				lines.push('no enemy here to attack');
			} else {
				targetRecordId = target.recordId;
				const amount = attackPower(publicState, record, prepared, target.record);
				const hold = livingHold(target);
				lines.push(amount >= hold
					? `downs ${speciesLabel(target.record)}`
					: `takes ${formatHold(amount)} off ${speciesLabel(target.record)}`);
			}
		}
	} else if (role === ROLE.SHIELD) {
		const enemies = enemiesAtSite(ghost, units);
		let worst = null;
		enemies.forEach((enemy) => {
			if (!enemy.prepared.blow) {
				return;
			}
			// the largest attack declared against your side here is the one a shield cancels
			const allies = [ghost, ...alliesAtSite(ghost, units)];
			const amount = allies.reduce(
				(best, ally) => Math.max(best, attackPower(publicState, enemy.record, enemy.prepared, ally.record)),
				0,
			);
			if (!worst || amount > worst.amount) {
				worst = { enemy, amount };
			}
		});
		if (!worst || worst.amount <= 0) {
			lines.push('nothing here to cancel yet');
		} else {
			targetRecordId = worst.enemy.recordId;
			lines.push(`would cancel ${speciesLabel(worst.enemy.record)}'s ${formatHold(worst.amount)}`);
		}
	} else if (role === ROLE.BOLSTER) {
		const allies = alliesAtSite(ghost, units);
		let restored = 0;
		const scale = prepared.presenceScale;
		allies.forEach((ally) => {
			const lifted = prepare(ally.record, site, null, ally.sentIndex, {
				rules: rulesOfView(publicState), bolstered: true, bolsterScale: scale,
			});
			restored += Math.max(0, lifted.hold - ally.prepared.hold);
		});
		lines.push(allies.length === 0
			? 'no ally here to lift yet'
			: `gives ${formatHold(restored)} hold back to ${allies.length} all${allies.length === 1 ? 'y' : 'ies'} here`);
	}

	return {
		hold: prepared.hold,
		strainLevel: prepared.strainLevel,
		isHome: prepared.isHome,
		bolstered: prepared.bolstered,
		role,
		blowMagnitude: prepared.blowMagnitude,
		roleLine: roleSentence(role, prepared.blowMagnitude),
		lines,
		targetRecordId,
	};
}

// the printed instinct sentence's noun phrase, per the design doc's targeting table
const ATTACKING_PHRASE = {
	weakestEnemyInReach: 'the weakest enemy',
	strongestEnemyInReach: 'the strongest enemy',
	enemySentEarliest: 'the enemy sent earliest',
	enemyThreateningWeakestAlly: 'the enemy threatening its weakest ally',
	enemyWithLowestMagnitude: 'the enemy with the least attack power',
	slowerEnemyWeakestFirst: 'the slowest enemy it can outpace',
	enemyMostVulnerableToElement: 'the enemy its element is most effective against',
	enemyWithHighestMagnitude: 'the enemy with the most attack power',
	enemyRoutableElseWeakest: 'the strongest enemy it can down',
};

const SUPPORTING_PHRASE = {
	allyWithLeastHold: 'the ally with the least hold',
	allyWithMostHold: 'the ally with the most hold',
	allySentEarliest: 'the ally sent earliest',
	self: 'itself',
	fastestAlly: 'the fastest ally',
	allyMostVulnerablePresent: 'the ally most vulnerable to the enemies present',
	allyWithHighestMagnitude: 'the ally with the most attack power',
};

export function conductClause(conduct, kind) {
	if (kind === 'supporting') {
		return SUPPORTING_PHRASE[conduct.supporting] || 'an ally';
	}
	return ATTACKING_PHRASE[conduct.attacking] || 'an enemy';
}

/*
	instinctSentence(prepared, rules) -> the printed targeting line for the dossier.

	Pass 2 gave instinct the targeting job (assumption 17), so what a creature aims at is
	its instinct lane first and its archetype's line only in the middle band.
*/
export function instinctSentence(prepared, rules) {
	const supporting = SUPPORTING_PHRASE[prepared.conduct.supporting] || 'an ally';
	const lane = instinctLaneOf(prepared.record, rules);
	if (lane === 'keen') {
		return `Keen instinct: it picks the enemy this attack can down, and failing that the one it takes the most off. When it stands with its side it favours ${supporting}.`;
	}
	if (lane === 'dull') {
		return `Dull instinct: it hits whatever the enemy sent earliest. When it stands with its side it favours ${supporting}.`;
	}
	const attacking = ATTACKING_PHRASE[prepared.conduct.attacking] || 'an enemy';
	return `When it attacks it chooses ${attacking}. When it stands with its side it favours ${supporting}.`;
}

// DEPRECATED alias, one pass only: the old name for instinctSentence.
export const conductSentence = instinctSentence;

/*
	attributeLanes(prepared, rules) -> [{ key, label, glyph, text }]

	Pass 2's "every attribute a job" (docs/design/reclamation-base-redesign.md), as the
	lines the dossier prints and the plinth's marks carry as their titles. One line per
	lane, in the game's own words, with the record's own number in it. The three hold
	attributes are summarised as one line, since they do one job between them.
*/
export function attributeLanes(prepared, rules) {
	const attrs = (prepared.record && prepared.record.attributes) || {};
	const at = (key) => (typeof attrs[key] === 'number' ? Math.round(attrs[key]) : 0);
	const lanes = [];

	lanes.push({
		key: 'hold',
		label: 'Vitality, resilience, endurance',
		text: `Vitality ${at('vitality')}, resilience ${at('resilience')}, endurance ${at('endurance')}: hold ${formatHold(prepared.hold)} here.`,
	});

	const sweeping = prepared.role === ROLE.SWEEP;
	if (prepared.role === ROLE.STRIKE || sweeping) {
		const governing = sweeping ? 'Intelligence' : 'Strength';
		const value = sweeping ? at('intelligence') : at('strength');
		lanes.push({
			key: 'power',
			label: governing,
			text: `${governing} ${value}: attack power ${formatHold(prepared.blowMagnitude)}${sweeping ? ', spread over everything here' : ''}.`,
		});
	} else {
		lanes.push({
			key: 'power',
			label: 'Strength, intelligence',
			text: `Strength ${at('strength')}, intelligence ${at('intelligence')}: unread, since a presence throws no attack.`,
		});
	}

	lanes.push({
		key: 'speed',
		label: 'Agility, reflex',
		glyph: prepared.swift ? 'swift' : null,
		text: prepared.swift
			? `Speed ${Math.round(prepared.speed)}: swift, attacks early and may move once a round.`
			: `Speed ${Math.round(prepared.speed)}: attacks in speed order, and is not swift enough to move.`,
	});

	lanes.push({
		key: 'willpower',
		label: 'Willpower',
		glyph: prepared.willful ? 'willful' : null,
		text: prepared.willful
			? `Willpower ${at('willpower')}: holds against the world, one grade less strain.`
			: `Willpower ${at('willpower')}: takes the world's strain in full.`,
	});

	lanes.push({
		key: 'charisma',
		label: 'Charisma',
		text: `Charisma ${at('charisma')}: presence at ${Math.round(prepared.presenceScale * 100) / 100}${prepared.role === ROLE.BOLSTER || prepared.role === ROLE.SHIELD ? '' : ', read only where it stands as a presence'}.`,
	});

	const lane = instinctLaneOf(prepared.record, rules);
	lanes.push({
		key: 'instinct',
		label: 'Instinct',
		glyph: lane === 'conduct' ? null : lane,
		text: lane === 'keen'
			? `Instinct ${at('instinct')}: keen, picks the enemy it can down.`
			: lane === 'dull'
				? `Instinct ${at('instinct')}: dull, hits the enemy sent earliest.`
				: `Instinct ${at('instinct')}: follows its archetype's line.`,
	});

	return lanes;
}

/*
	threatsFor(publicState, you) -> { [recordId]: { amount, by, downs } }

	What each of your creatures would lose this round to the worst VISIBLE enemy attack at
	its own world: the engine's own attackPowerAgainst, so the number on the figure is the
	number the round will subtract. `downs` is exact, not a threshold: the attack reaches
	the creature's remaining hold (assumption 5). Hidden enemies are unknown and so are not
	counted; the banner says one is somewhere.
*/
export function threatsFor(publicState, you) {
	const units = flattenBoard(publicState);
	const threats = {};
	units.filter((u) => u.seat === you).forEach((unit) => {
		const hold = livingHold(unit);
		let worst = null;
		enemiesAtSite(unit, units).forEach((enemy) => {
			if (enemy.hidden || !enemy.prepared.blow) {
				return;
			}
			const amount = attackPower(publicState, enemy.record, enemy.prepared, unit.record);
			if (amount <= 0) {
				return;
			}
			if (!worst || amount > worst.amount) {
				worst = { amount, by: enemy, downs: amount >= hold };
			}
		});
		if (worst) {
			threats[unit.recordId] = worst;
		}
	});
	return threats;
}

// one clause for a threat, for the figure's mark and its tooltip
export function threatSentence(threat) {
	if (!threat) {
		return '';
	}
	return `loses ${formatHold(threat.amount)} to ${speciesLabel(threat.by.record)}`;
}

/*
	siteHoldTotal(publicState, siteId, seat) -> the live sum the Ruling will compare. Attacks
	subtract, so a creature that has been hit counts at its `currentHold`; one that has not
	been touched counts at the hold the engine's own prepare() gives it.
*/
export function siteHoldTotal(publicState, siteId, seat) {
	const site = publicState.frame.sites.find((s) => s.id === siteId);
	return (publicState.board[siteId][seat] || [])
		.filter((e) => e.record)
		.reduce((sum, e) => {
			if (typeof e.currentHold === 'number') {
				return sum + e.currentHold;
			}
			const prepared = prepareWithCompanions(publicState, e.record, site, e.sentIndex, seat, e.recordId);
			return sum + prepared.hold;
		}, 0);
}
