import { describe, test, expect } from 'vitest';
import type { CreatureRecord } from '@xalians/content/creature';
import { createMatch, send, pass, currentFrame, forecastSendBlows, getPublicState } from '../expeditionRules.ts';
import { scoreSends } from '../expeditionBot.ts';
import { ROSTER_SIZE, WORLDS_PER_MATCH, SUPPORT_GUARD } from '../expeditionInterpretation.ts';
import { prepare, roleOf } from '../creatureOnTable.ts';
import type { Seat, World } from '../types.ts';

/*
	PASS 69. What a support creature does for the creatures it covers (Nick, 2026-09-28):
	its guard takes a share off every blow on them, they shrug off weakened and held, and it
	mends the one closest to falling at its own turn in the fight. Design:
	docs/design/reclamation-support-carries-weight.md.
*/

const statusEffect = (status: string) => ({
	key: 'condition', type: 'status', status,
	recipient: 'target', onset: 'instant', persistence: 'lingering', duration: 'prolonged',
	likelihood: 'consistent', removable: ['freeing'],
});
const harmEffect = (intensity = 60) => ({
	key: 'hit', type: 'harm', mechanism: 'impact', recipient: 'target',
	onset: 'instant', persistence: 'resolved', likelihood: 'consistent', intensity,
});
const restoreEffect = (intensity = 60) => ({
	key: 'repair', type: 'restore', recipient: 'target',
	onset: 'instant', persistence: 'resolved', likelihood: 'consistent', intensity,
});
const action = (effects: any[], over: Record<string, unknown> = {}) => ({
	key: 'act', name: 'Act', signature: true, instrument: 'fists', element: 'fire',
	targeting: ['other'],
	activation: { continuity: 'discrete' },
	timing: { preparation: 'brief', recovery: 'brief' },
	delivery: { mode: 'contact', approach: 'direct' },
	spatial: {},
	effects,
	...over,
});

function makeRecord(id: string, over: any = {}): CreatureRecord {
	return {
		id,
		species: 'testling',
		schemaVersion: '5.0.0',
		provenance: { serial: 1, origin: 'magmuth' },
		attributes: {
			strength: 50, vitality: 60, endurance: 70, agility: 50, reflex: 50,
			intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 80,
			...over.attributes,
		},
		element: 'fire',
		physiology: {
			breathes: ['gas'],
			environmentalTolerance: { ambientMedia: ['gas'], temperatureC: { min: -50, max: 200 } },
			protections: [],
		},
		temperament: { boldness: 50, curiosity: 50, energy: 50, aggression: 90, sociability: 50 },
		signature: { type: 'action', key: 'act' },
		actions: over.actions || [action([harmEffect()])],
		passives: [],
	} as unknown as CreatureRecord;
}

const striker = (id: string, over: any = {}) => makeRecord(id, over);
const supporter = (id: string, over: any = {}) => makeRecord(id, {
	actions: [action([restoreEffect()], { key: 'act', name: 'Mend' })],
	attributes: { agility: 5, reflex: 5 },
	...over,
});

function makeWorlds(): World[] {
	const planets = ['Magmuth', 'Poseidas', 'Grimedes', 'Luminax', 'Floria', 'Zolton', 'Phantiri', 'Stonera', 'Drainov'];
	const elements = ['fire', 'water', 'dark', 'light', 'plant', 'electric', 'ghost', 'rock', 'chemical'];
	return Array.from({ length: WORLDS_PER_MATCH }, (_, i) => ({
		planet: planets[i % planets.length],
		element: elements[i % elements.length],
		sites: [0, 1, 2].map((j) => ({
			id: `${planets[i % planets.length].toLowerCase()}-site-${j}`,
			name: `Site ${j}`,
			planet: planets[i % planets.length],
			element: elements[i % elements.length],
			environment: { medium: 'gas', temperatureC: { min: -50, max: 200 } },
		})),
	})) as unknown as World[];
}

// fills a roster of twelve behind the creatures a test names
function roster(prefix: string, named: CreatureRecord[]): CreatureRecord[] {
	return Array.from({ length: ROSTER_SIZE }, (_, i) => named[i] || makeRecord(`${prefix}_${i}`));
}

// sends every named creature of both sides to the one world, then both pass
function clash(mine: CreatureRecord[], theirs: CreatureRecord[], rules: any = {}) {
	let state = createMatch({ rosterA: roster('A', mine), rosterB: roster('B', theirs), worlds: makeWorlds(), seed: 'support-seed', rules: { clashExchanges: 1, ...rules } });
	const siteId = currentFrame(state).sites[0].id;
	const queue: Record<Seat, CreatureRecord[]> = { A: [...mine], B: [...theirs] };
	while (state.phase === 'deploy') {
		const seat = state.turn as Seat;
		const next = queue[seat].shift();
		state = next ? send(state, seat, next.id, siteId, false)! : pass(state, seat)!;
	}
	return state.resolutionLog as any[];
}

describe('the support creature', () => {
	test('reads as a support creature, and mends for its heal', () => {
		const record = supporter('A_s');
		expect(roleOf(record)).toBe('bolster');
		expect(prepare(record, null, null, 0).mendMagnitude).toBeGreaterThan(0);
		expect(prepare(striker('A_x'), null, null, 0).mendMagnitude).toBe(0);
	});

	test('its guard takes a quarter off a blow on a creature it covers, and says so', () => {
		const log = clash([striker('A_x'), supporter('A_s')], [striker('B_x')]);
		const blow = log.find((e) => e.type === 'attack' && e.target === 'A_x' && e.power > 0);
		expect(blow.guarded).toBe('A_s');
		expect(blow.power).toBeCloseTo(Math.round(blow.unguarded * SUPPORT_GUARD * 10) / 10, 5);
	});

	test('no support creature, no guard', () => {
		const log = clash([striker('A_x')], [striker('B_x')]);
		const blow = log.find((e) => e.type === 'attack' && e.target === 'A_x' && e.power > 0);
		expect(blow.guarded).toBeUndefined();
	});

	test('the creatures it covers shrug off weakened and held, and the log names who steadied them', () => {
		const binder = striker('B_x', { actions: [action([harmEffect(), statusEffect('restrained')])] });
		const log = clash([striker('A_x'), supporter('A_s')], [binder]);
		const shrugged = log.filter((e) => e.type === 'status' && e.target === 'A_x');
		expect(shrugged.length).toBeGreaterThan(0);
		expect(shrugged.every((e) => e.shrugged === 'A_s')).toBe(true);
		expect(log.some((e) => e.type === 'attack' && e.recordId === 'A_x' && e.outcome === 'pinned')).toBe(false);
	});

	test('without it, the same bind takes the swing', () => {
		const binder = striker('B_x', { actions: [action([harmEffect(), statusEffect('restrained')])], attributes: { agility: 95, reflex: 95 } });
		const log = clash([striker('A_x')], [binder]);
		expect(log.some((e) => e.type === 'status' && e.target === 'A_x' && !e.shrugged)).toBe(true);
	});

	test('it mends the creature it covers that is closest to falling, at its own turn, never past what it lost', () => {
		const log = clash([striker('A_x'), supporter('A_s')], [striker('B_x')], { clashExchanges: 3 });
		const mends = log.filter((e) => e.type === 'recover' && e.mend);
		expect(mends.length).toBeGreaterThan(0);
		mends.forEach((m) => {
			expect(m.bolster).toBe('A_s');
			expect(m.amount).toBeGreaterThan(0);
			// it comes after a blow that hurt the creature it mends
			const index = log.indexOf(m);
			expect(log.slice(0, index).some((e) => e.type === 'attack' && e.target === m.recordId && e.power > 0)).toBe(true);
		});
	});

	test('with the mend off, the support creature takes no turn', () => {
		const log = clash([striker('A_x'), supporter('A_s')], [striker('B_x')], { clashExchanges: 3, supportMend: 0 });
		expect(log.some((e) => e.type === 'recover' && e.mend)).toBe(false);
	});

	test('the forecast says what its guard takes off, and whose guard it is', () => {
		// alone against a striker, the support creature is the only target, and it guards itself
		let state = createMatch({ rosterA: roster('A', [supporter('A_s')]), rosterB: roster('B', [striker('B_x')]), worlds: makeWorlds(), seed: 'support-seed', rules: { clashExchanges: 1 } });
		state = { ...state, starter: 'B', turn: 'B' } as typeof state;
		const siteId = currentFrame(state).sites[0].id;
		state = send(state, 'B', 'B_x', siteId, false)!;
		expect(state.turn).toBe('A');
		const blows = forecastSendBlows(state, 'A', 'A_s', siteId);
		expect(blows!.taken.length).toBeGreaterThan(0);
		expect(blows!.guardBy).toBe('A_s');
		expect(blows!.guardedOff).toBeGreaterThan(0);
	});

	/*
		PASS 70. The bot's spread bias priced company as a cost, and support creatures went to
		stand alone (95 percent arrived first at their world, 73 to 84 percent stood alone).
	*/
	test('the bot does not discount a support creature for joining its own side', () => {
		let state = createMatch({ rosterA: roster('A', [striker('A_x'), supporter('A_s'), striker('A_y')]), rosterB: roster('B', [striker('B_x')]), worlds: makeWorlds(), seed: 'support-seed', rules: { clashExchanges: 1 } });
		state = { ...state, starter: 'A', turn: 'A' } as typeof state;
		const sites = currentFrame(state).sites;
		state = send(state, 'A', 'A_x', sites[0].id, false)!;
		state = send(state, 'B', 'B_x', sites[1].id, false)!;
		const view = getPublicState(state, 'A');
		const at = (weights: any, id: string) => scoreSends(view, state.players.A.roster, 'A', weights ? { id: 'test', weights } as any : null)
			.candidates.find((c) => c.record.id === id && c.site.id === sites[0].id)!;
		const joins = at(null, 'A_s');
		const spreads = at({ supportJoins: false }, 'A_s');
		expect(joins.value).toBeGreaterThan(spreads.value);
		// everyone else still pays for the crowd
		expect(at(null, 'A_y').value).toBeCloseTo(at({ supportJoins: false }, 'A_y').value, 6);
	});
});
