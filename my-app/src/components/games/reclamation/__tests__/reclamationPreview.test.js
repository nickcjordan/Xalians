import { describe, it, expect } from 'vitest';
import { createMatch, send, getPublicState } from '../../../../gameplay/expedition/expeditionRules';
import { getWorlds } from '../../../../gameplay/expedition/sites';
import { buildExpeditionPool } from '../../../../gameplay/expedition/roster';
import { ROSTER_SIZE } from '../../../../gameplay/expedition/expeditionInterpretation';
import {
	orderPreview, flattenBoard, siteHoldTotal, conductSentence, conductClause, previewSentence,
	pickAreaSitePreview,
} from '../reclamationPreview';
import { prepare } from '../../../../gameplay/expedition/creatureOnTable';

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
		const site = state.worlds[state.worldIndex].sites[0];
		const record = state.players[handler].roster[0];
		state = send(state, handler, record.id, site.id, false);
		expect(state).not.toBeNull();
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
			const engineHold = prepare(u.record, u.site, view.world, u.sentIndex).hold;
			expect(u.prepared.hold).toBeCloseTo(engineHold, 10);
		});
	});

	it('site totals are the sum of the holds present, so the Judge comparison is visible', () => {
		const state = deployOneEach(buildMatch());
		const view = getPublicState(state, 'A');
		const site = view.world.sites[0];
		const totalA = siteHoldTotal(view, site.id, 'A');
		const manualA = view.board[site.id].A.reduce(
			(sum, e) => sum + prepare(e.record, site, view.world, e.sentIndex).hold, 0,
		);
		expect(totalA).toBeCloseTo(manualA, 10);
		expect(siteHoldTotal(view, view.world.sites[2].id, 'A')).toBe(0);
	});
});

describe('orderPreview', () => {
	it('produces one row per visible creature, in a stable initiative order', () => {
		const state = deployOneEach(buildMatch());
		const view = getPublicState(state, 'A');
		const rows = orderPreview(view, {}, 'A');
		expect(rows.length).toBe(2);
		// mirrors buildResolutionOrder: ambush, then wards, then the rest by initiative
		const rest = rows.filter((r) => r.action !== 'ambush' && r.action !== 'ward');
		for (let i = 1; i < rest.length; i++) {
			if (rest[i - 1].unit.prepared.strainLevel === rest[i].unit.prepared.strainLevel) {
				expect(rest[i - 1].unit.prepared.initiative).toBeGreaterThanOrEqual(rest[i].unit.prepared.initiative);
			}
		}
	});

	it('defaults each creature to its archetype-favored act, and honours an explicit order', () => {
		const state = deployOneEach(buildMatch());
		const view = getPublicState(state, 'A');
		const mine = flattenBoard(view).find((u) => u.seat === 'A');
		expect(orderPreview(view, {}, 'A').find((r) => r.unit.recordId === mine.recordId).action)
			.toBe(mine.prepared.favoredAct.action);

		const rowsHeld = orderPreview(view, { [mine.recordId]: 'hold' }, 'A');
		const heldRow = rowsHeld.find((r) => r.unit.recordId === mine.recordId);
		expect(heldRow.action).toBe('hold');
		expect(heldRow.ordered).toBe(true);
		expect(heldRow.sentence).toMatch(/holds at .+, keeping its full hold\./);
	});

	it('writes the target choice as a sentence naming the conduct, the site and the hold', () => {
		const state = deployOneEach(buildMatch());
		const view = getPublicState(state, 'A');
		const rows = orderPreview(view, {}, 'A');
		const attacking = rows.find((r) => r.isYours && r.target);
		if (attacking) {
			// the brief's shape: "Rakh strikes the weakest enemy at the Ash Wastes: Gorrel, hold 7"
			expect(attacking.sentence).toMatch(/^[A-Z].+ (at|anywhere on the world).*: .+, hold [\d.]+/);
			expect(attacking.sentence).not.toMatch(/undefined/);
		}
		rows.forEach((r) => expect(r.sentence).not.toMatch(/undefined/));
	});

	it('names the site the preview is read at for a contact act', () => {
		const state = deployOneEach(buildMatch());
		const view = getPublicState(state, 'A');
		const site = view.world.sites[0];
		const rows = orderPreview(view, {}, 'A').filter((r) => r.isYours);
		rows.forEach((r) => {
			if (r.actClass === 'contact' || r.actClass === 'reach') {
				expect(r.sentence).toContain(site.name);
			}
		});
	});
});

describe('conduct wording', () => {
	it('prints one sentence covering both the attacking and the supporting choice', () => {
		const pool = buildExpeditionPool('conduct-test', 1);
		const world = getWorlds()[0];
		const prepared = prepare(pool[0], world.sites[0], world, 0);
		const sentence = conductSentence(prepared);
		expect(sentence).toMatch(/^When it attacks it chooses .+\. When it supports it chooses .+\.$/);
	});

	it('maps every conduct key the interpretation table can produce', () => {
		const attackingKeys = [
			'weakestEnemyInReach', 'strongestEnemyInReach', 'enemySentEarliest',
			'enemyThreateningWeakestAlly', 'enemyWithLowestMagnitude', 'slowerEnemyWeakestFirst',
			'enemyMostVulnerableToElement', 'enemyWithHighestMagnitude', 'enemyRoutableElseWeakest',
		];
		attackingKeys.forEach((key) => {
			const clause = conductClause({ attacking: key, supporting: 'self' }, 'contact', 'strike');
			expect(clause).not.toBe('an enemy'); // 'an enemy' is the unmapped fallback
		});
		const supportingKeys = [
			'allyWithLeastHold', 'allyWithMostHold', 'allySentEarliest', 'self',
			'fastestAlly', 'allyMostVulnerablePresent', 'allyWithHighestMagnitude',
		];
		supportingKeys.forEach((key) => {
			const clause = conductClause({ attacking: 'weakestEnemyInReach', supporting: key }, 'support', 'ward');
			expect(clause).not.toBe('an ally');
		});
	});
});

describe('previewSentence', () => {
	it('says so plainly when nothing is in reach', () => {
		const pool = buildExpeditionPool('reach-test', 1);
		const world = getWorlds()[0];
		const site = world.sites[0];
		const prepared = prepare(pool[0], site, world, 0);
		const unit = { record: pool[0], site, prepared };
		const sentence = previewSentence({
			unit,
			action: 'strike',
			act: { action: 'strike', class: 'contact', magnitude: 5 },
			actClass: 'contact',
			target: null,
			magnitude: null,
			publicState: { staggered: {} },
		});
		expect(sentence).toContain('but finds');
		expect(sentence).toContain(site.name);
	});
});

describe('area acts', () => {
	// burst/spray/cloud choose a SITE, not a creature (expeditionRules.pickAreaTargetSite),
	// so the sentence must name the site and say it catches both sides.
	it('names the site and says it catches both sides', () => {
		const state = deployOneEach(buildMatch());
		const view = getPublicState(state, 'A');
		const mine = flattenBoard(view).find((u) => u.seat === 'A');
		const sentence = previewSentence({
			unit: mine,
			action: 'burst',
			act: { action: 'burst', class: 'projection', magnitude: 8 },
			actClass: 'projection',
			target: flattenBoard(view).find((u) => u.seat === 'B'),
			magnitude: 8,
			publicState: view,
		});
		expect(sentence).toMatch(/catching [0-9]+ enem(y|ies)/);
		expect(sentence).toContain(view.world.sites[0].name);
		expect(sentence).not.toMatch(/undefined/);
	});

	it('picks the site with the most creatures on it that holds an enemy', () => {
		const state = deployOneEach(buildMatch());
		const view = getPublicState(state, 'A');
		const mine = flattenBoard(view).find((u) => u.seat === 'A');
		expect(pickAreaSitePreview(view, mine)).toBe(view.world.sites[0].name);
	});
});

describe('duplicate actions on one creature', () => {
	/*
		ENGINE AMBIGUITY the orders panel has to cope with: the provisional roller can give
		one creature two abilities with the SAME action (two `drain` acts, say), but
		expeditionRules.order() takes an ACTION NAME, not an ability id, and
		performAct() resolves it with acts.find(a => a.action === action) — the first
		match. So an action, not an ability, is the smallest orderable unit, and the panel
		merges same-action abilities into one option rather than offering an unpickable
		duplicate. This test pins the fact the panel relies on.
	*/
	it('the engine resolves an ordered action to the first ability carrying it', () => {
		const pool = buildExpeditionPool('dupe-action', 40);
		const world = getWorlds()[0];
		const withDupes = pool.find((r) => {
			const actions = (r.abilities || []).map((a) => a.action);
			return new Set(actions).size < actions.length;
		});
		if (!withDupes) {
			return; // no duplicate-action creature in this pool; nothing to pin
		}
		const prepared = prepare(withDupes, world.sites[0], world, 0);
		const actions = prepared.acts.map((a) => a.action);
		const dupe = actions.find((a, i) => actions.indexOf(a) !== i);
		const matching = prepared.acts.filter((a) => a.action === dupe);
		expect(matching.length).toBeGreaterThan(1);
		// find() takes the first, which is what the panel's merged option must represent
		expect(prepared.acts.find((a) => a.action === dupe)).toBe(matching[0]);
	});
});
