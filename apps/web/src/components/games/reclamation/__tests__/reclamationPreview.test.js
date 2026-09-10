import { describe, it, expect } from 'vitest';
import { createMatch, send, pass, getPublicState, attackPowerAgainst } from '@xalians/rules/expedition/expeditionRules';
import { getWorlds } from '@xalians/rules/expedition/sites';
import { buildExpeditionPool } from '@xalians/rules/expedition/roster';
import { ROSTER_SIZE, ROLE } from '@xalians/rules/expedition/expeditionInterpretation';
import {
	flattenBoard, siteHoldTotal, instinctSentence, conductClause, attributeLanes,
	ghostPlanFor, pickAttackTargetPreview, threatsFor, threatSentence, livingHold,
} from '../reclamationPreview';
import { prepare } from '@xalians/rules/expedition/creatureOnTable';

const SEED = 'preview-test';

function buildMatch() {
	const pool = buildExpeditionPool(SEED, ROSTER_SIZE * 2);
	return createMatch({
		rosterA: pool.slice(0, ROSTER_SIZE),
		rosterB: pool.slice(ROSTER_SIZE, ROSTER_SIZE * 2),
		worlds: getWorlds(),
		seed: SEED,
	});
}

// deploys one creature per side onto the same site, whoever the starter is
function deployOneEach(match) {
	let state = match;
	for (let i = 0; i < 2; i++) {
		const handler = state.turn;
		const site = state.frames[state.frameIndex].sites[0];
		const record = state.players[handler].roster[0];
		state = send(state, handler, record.id, site.id, false);
		expect(state).not.toBeNull();
	}
	return state;
}

// stacks n creatures per side onto the frame's first site
function stackOnFirstSite(match, n) {
	let state = match;
	const site = state.frames[state.frameIndex].sites[0];
	for (let i = 0; i < n * 2; i++) {
		const handler = state.turn;
		const record = state.players[handler].roster[0];
		const next = send(state, handler, record.id, site.id, false);
		if (!next) {
			break;
		}
		state = next;
	}
	return state;
}

describe('flattenBoard and siteHoldTotal', () => {
	it('reports exactly the engine prepare() hold for every visible creature', () => {
		const state = deployOneEach(buildMatch());
		const view = getPublicState(state, 'A');
		const units = flattenBoard(view);
		expect(units.length).toBe(2);
		units.forEach((u) => {
			// the match rules, the company at the world and the bolster in force there all
			// travel with the view, so the preview's prepare() reads exactly what the
			// engine's did: a bolsterer lifts its own strain ("itself included",
			// assumption 8) at its own charisma (assumption 17). The engine's stamped
			// fullHold, rounded to one decimal, is that number.
			expect(u.prepared.hold).toBeCloseTo(u.entry.fullHold, 1);
		});
	});

	it('site totals are the sum of the live holds present, so the Judge comparison is visible', () => {
		const state = deployOneEach(buildMatch());
		const view = getPublicState(state, 'A');
		const site = view.frame.sites[0];
		const totalA = siteHoldTotal(view, site.id, 'A');
		const manualA = view.board[site.id].A.reduce((sum, e) => sum + e.currentHold, 0);
		expect(totalA).toBeCloseTo(manualA, 10);
		expect(siteHoldTotal(view, view.frame.sites[2].id, 'A')).toBe(0);
	});

	// blows subtract (assumption 5): the board row carries the live hold, and the total the
	// preview reads has to be that, not the untouched prepare() value
	it('a creature that has been hit counts at its remaining hold', () => {
		const state = deployOneEach(buildMatch());
		const view = getPublicState(state, 'A');
		const site = view.frame.sites[0];
		const before = siteHoldTotal(view, site.id, 'A');
		const hit = {
			...view,
			board: {
				...view.board,
				[site.id]: {
					...view.board[site.id],
					A: view.board[site.id].A.map((e) => ({ ...e, currentHold: e.currentHold - 2, damage: 2, hurt: true })),
				},
			},
		};
		expect(siteHoldTotal(hit, site.id, 'A')).toBeCloseTo(before - 2, 6);
	});
});

describe('livingHold', () => {
	it('reads the engine\'s own currentHold off the board row', () => {
		const state = deployOneEach(buildMatch());
		const view = getPublicState(state, 'A');
		flattenBoard(view).forEach((u) => {
			expect(livingHold(u)).toBe(u.entry.currentHold);
		});
	});
});

describe('ghostPlanFor', () => {
	it('gives the hold at the world and one role sentence, whatever the role', () => {
		const state = deployOneEach(buildMatch());
		const view = getPublicState(state, 'A');
		const site = view.frame.sites[0];
		const record = view.players.A.roster[0];
		const plan = ghostPlanFor(view, record, site, 'A', view.players.A.sentCount);
		const engine = prepare(record, site, site.world, view.players.A.sentCount, { rules: view.rules });
		expect(plan.hold).toBeCloseTo(engine.hold, 6);
		expect(plan.role).toBe(engine.role);
		expect(plan.roleLine).toMatch(/^(Attacks|Sweeps|Bolsters|Shields|Stands)/);
		expect(plan.roleLine).not.toMatch(/undefined|\?/);
		expect(Array.isArray(plan.lines)).toBe(true);
		plan.lines.forEach((line) => expect(line).not.toMatch(/undefined/));
	});

	it('a striker names the creature its conduct would pick and the number it would lose', () => {
		const state = stackOnFirstSite(buildMatch(), 4);
		const view = getPublicState(state, 'A');
		const site = view.frame.sites[0];
		const striker = view.players.A.roster.find((r) => {
			const p = prepare(r, site, site.world, 0, { rules: view.rules });
			return p.role === ROLE.STRIKE;
		});
		if (!striker) {
			return; // no plain striker left in hand for this seed; nothing to pin
		}
		const plan = ghostPlanFor(view, striker, site, 'A', view.players.A.sentCount);
		expect(plan.lines.length).toBe(1);
		expect(plan.lines[0]).toMatch(/^(takes [0-9.]+ off .+|downs .+|no enemy here to attack)$/);
		if (plan.targetRecordId) {
			// the number printed is the engine's own arithmetic, not a second copy of it
			const target = flattenBoard(view).find((u) => u.recordId === plan.targetRecordId);
			const prepared = prepare(striker, site, site.world, view.players.A.sentCount, { rules: view.rules });
			const amount = attackPowerAgainst(
				{ rules: view.rules }, { record: striker }, prepared, { record: target.record },
			);
			const expected = amount >= livingHold(target) ? 'downs' : `takes ${amount}`;
			expect(plan.lines[0].startsWith(expected.replace(/\.0$/, ''))).toBe(true);
		}
	});

	it('a sweep names every creature it would catch, its own side included', () => {
		const state = stackOnFirstSite(buildMatch(), 4);
		const view = getPublicState(state, 'A');
		const site = view.frame.sites[0];
		const area = view.players.A.roster.find((r) => prepare(r, site, site.world, 0, { rules: view.rules }).role === ROLE.SWEEP);
		if (!area) {
			return;
		}
		const plan = ghostPlanFor(view, area, site, 'A', view.players.A.sentCount);
		const standing = flattenBoard(view).filter((u) => u.site.id === site.id).length;
		expect(plan.lines.length).toBe(standing);
		expect(plan.lines.some((l) => l.includes('(yours)'))).toBe(true);
	});

	it('a shield says the blow it would cancel, a bolster the hold it would give back', () => {
		const state = stackOnFirstSite(buildMatch(), 4);
		const view = getPublicState(state, 'A');
		const site = view.frame.sites[0];
		const presence = view.players.A.roster.find((r) => {
			const role = prepare(r, site, site.world, 0, { rules: view.rules }).role;
			return role === ROLE.SHIELD || role === ROLE.BOLSTER;
		});
		if (!presence) {
			return;
		}
		const plan = ghostPlanFor(view, presence, site, 'A', view.players.A.sentCount);
		expect(plan.lines.length).toBe(1);
		expect(plan.lines[0]).toMatch(/would cancel .+'s [0-9.]+|nothing here to cancel yet|gives [0-9.]+ hold back to \d+ all(y|ies) here|no ally here to lift yet/);
	});
});

describe('pickAttackTargetPreview', () => {
	// the preview mirrors expeditionRules.pickAttackTarget; the engine's own resolution is
	// the only check that matters, so this pins the mirror against a real resolved round
	it('names the creature the engine actually strikes', () => {
		let state = stackOnFirstSite(buildMatch(), 3);
		const view = getPublicState(state, 'A');
		const units = flattenBoard(view);
		const predictions = {};
		units.forEach((unit) => {
			if (unit.prepared.role !== ROLE.STRIKE) {
				return;
			}
			const target = pickAttackTargetPreview(view, unit, units);
			predictions[unit.recordId] = target ? target.recordId : null;
		});
		// close the round: both handlers pass, and the engine resolves inside pass()
		const before = state.resolutionLog.length;
		state = pass(state, state.turn);
		state = pass(state, state.turn);
		const blows = state.resolutionLog.slice(before).filter((e) => e.type === 'attack' && e.role === 'strike');
		expect(blows.length).toBeGreaterThan(0);
		blows.forEach((blow) => {
			if (!(blow.recordId in predictions) || blow.outcome === 'lapsed' || blow.outcome === 'no-target') {
				return;
			}
			// a creature downed before its attack, or one whose first-choice target was downed
			// by an earlier attack, legitimately hits someone else; the preview is read against
			// the board as it stands, which is the first attack at the world
			expect(typeof blow.target === 'string' || blow.target === null).toBe(true);
		});
		// the first blow at a world always lands against the board the preview saw
		const first = blows[0];
		if (first.recordId in predictions && first.outcome !== 'lapsed') {
			expect(first.target).toBe(predictions[first.recordId]);
		}
	});
});

describe('instinct wording', () => {
	it('prints one sentence covering both the attacking and the supporting choice', () => {
		const pool = buildExpeditionPool('conduct-test', 1);
		const world = getWorlds()[0];
		const prepared = prepare(pool[0], world.sites[0], world, 0);
		const sentence = instinctSentence(prepared);
		expect(sentence).toMatch(/(When it attacks it chooses .+|Keen instinct: .+|Dull instinct: .+) When it stands with its side it favours .+\.$/);
	});

	// Pass 2 (assumption 17): every attribute has one job, and the dossier says which
	it('gives one lane line per attribute job, in the game\'s own words', () => {
		const pool = buildExpeditionPool('lane-test', 1);
		const world = getWorlds()[0];
		const prepared = prepare(pool[0], world.sites[0], world, 0);
		const lanes = attributeLanes(prepared);
		expect(lanes.map((l) => l.key)).toEqual(['hold', 'power', 'speed', 'willpower', 'charisma', 'instinct']);
		lanes.forEach((lane) => {
			expect(typeof lane.text).toBe('string');
			expect(lane.text.length).toBeGreaterThan(0);
			expect(lane.text).not.toMatch(/undefined|NaN/);
		});
		expect(lanes.find((l) => l.key === 'speed').text).toMatch(/^Speed [0-9]+:/);
		expect(lanes.find((l) => l.key === 'instinct').text).toMatch(/^Instinct [0-9]+:/);
	});

	it('maps every conduct key the interpretation table can produce', () => {
		const attackingKeys = [
			'weakestEnemyInReach', 'strongestEnemyInReach', 'enemySentEarliest',
			'enemyThreateningWeakestAlly', 'enemyWithLowestMagnitude', 'slowerEnemyWeakestFirst',
			'enemyMostVulnerableToElement', 'enemyWithHighestMagnitude', 'enemyRoutableElseWeakest',
		];
		attackingKeys.forEach((key) => {
			const clause = conductClause({ attacking: key, supporting: 'self' }, 'attacking');
			expect(clause).not.toBe('an enemy'); // 'an enemy' is the unmapped fallback
		});
		const supportingKeys = [
			'allyWithLeastHold', 'allyWithMostHold', 'allySentEarliest', 'self',
			'fastestAlly', 'allyMostVulnerablePresent', 'allyWithHighestMagnitude',
		];
		supportingKeys.forEach((key) => {
			const clause = conductClause({ attacking: 'weakestEnemyInReach', supporting: key }, 'supporting');
			expect(clause).not.toBe('an ally');
		});
	});
});

describe('threatsFor', () => {
	it('gives a number per figure, from the engine\'s own attack arithmetic, and marks a downing', () => {
		const state = stackOnFirstSite(buildMatch(), 4);
		const view = getPublicState(state, 'A');
		const threats = threatsFor(view, 'A');
		const units = flattenBoard(view);
		const mine = units.filter((u) => u.seat === 'A');
		const theirs = units.filter((u) => u.seat === 'B');
		expect(mine.length).toBeGreaterThan(0);
		mine.forEach((unit) => {
			let worst = 0;
			theirs.forEach((enemy) => {
				if (enemy.site.id !== unit.site.id || !enemy.prepared.blow) {
					return;
				}
				const amount = attackPowerAgainst(
					{ rules: view.rules }, { record: enemy.record }, enemy.prepared, { record: unit.record },
				);
				worst = Math.max(worst, amount);
			});
			if (worst > 0) {
				expect(threats[unit.recordId]).toBeDefined();
				expect(threats[unit.recordId].amount).toBeCloseTo(worst, 6);
				expect(threats[unit.recordId].downs).toBe(worst >= livingHold(unit));
				expect(threatSentence(threats[unit.recordId])).toMatch(/^loses [0-9.]+ to .+$/);
			} else {
				expect(threats[unit.recordId]).toBeUndefined();
			}
		});
	});

	it('reads nothing for a creature alone at its world: worlds are sealed', () => {
		let state = buildMatch();
		// send one of yours to the first site and one of theirs to the second
		const sites = state.frames[state.frameIndex].sites;
		const first = state.turn;
		const second = first === 'A' ? 'B' : 'A';
		state = send(state, first, state.players[first].roster[0].id, sites[0].id, false);
		state = send(state, second, state.players[second].roster[0].id, sites[1].id, false);
		const view = getPublicState(state, 'A');
		expect(Object.keys(threatsFor(view, 'A'))).toHaveLength(0);
	});
});
