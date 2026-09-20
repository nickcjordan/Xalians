/*
	PASS 25. ACT FLIP: the second decision axis.

	Pass 24 diagnosed the engagement problem as a decay: near-best options per decision ran
	3.9 / 2.8 / 2.05 across the three rounds, and by round three half of all decisions had one
	dominant answer. The round that decides the Charter was the least interesting one, and
	neither more send budget nor a per-round cap fixed it, because the game had ONE axis -
	which creature at which world - and by the last round there were few of each.

	Act flip is the base redesign's own lever pool entry (choosing among a creature's acts at
	send, if one blow per creature measures as too little expression), brought back on the
	condition it names. Every creature has three or four usable acts and 72.3 percent can offer
	two or more genuinely different behaviours, so the table was reading 1519 acts and using 435.

	It works BECAUSE IT DOES NOT DEPLETE: the third creature of a spent roster still asks which
	of its behaviours the world needs. Round three goes from 2.05 near-best options to 3.53 and
	from 50 percent dominant to 30.
*/
import { describe, test, expect } from 'vitest';
import { createMatch, send, getPublicState } from '../expeditionRules.ts';
import { flippableRolesOf, naturalRoleOf, prepare } from '../creatureOnTable.ts';
import { ACT_FLIP, ROLE } from '../expeditionInterpretation.ts';
import type { World } from '../types.ts';

function makeWorlds(): World[] {
	const planets = ['Magmuth', 'Poseidas', 'Grimedes', 'Luminax', 'Floria', 'Zolton',
		'Phantiri', 'Stonera', 'Drainov', 'Saiphus', 'Telypso', 'Krystos', 'Veridium', 'Endessa'];
	return planets.map((planet) => ({
		planet, element: 'metal',
		sites: [0, 1, 2].map((k) => ({
			id: planet.toLowerCase() + '-site-' + k,
			name: planet + ' Site ' + k,
			planet, element: 'metal',
			environment: { medium: 'gas', temperatureC: { min: -80, max: 220 } },
		})),
	})) as unknown as World[];
}

let uid = 0;
// a creature with BOTH an attacking action and a protecting one, so it has a real choice
function twoWay(): any {
	uid += 1;
	return {
		id: 'af' + uid, species: 'graviclaw',
		provenance: { schemaVersion: '1.0.0', origin: 'nowhere' },
		element: { primary: 'metal', affinities: { metal: 100 } },
		archetype: { key: 'predator', favors: [] },
		attributes: { strength: 60, vitality: 55, endurance: 55, agility: 30, reflex: 30,
			intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 55 },
		physiology: { environmentalTolerance: { ambientMedia: ['gas'], temperatureC: { min: -80, max: 220 } }, breathes: ['gas'], capabilities: {}, senses: {} },
		traits: [],
		temperament: { boldness: 50, curiosity: 50, energy: 50, aggression: 50, sociability: 50 },
		abilities: [
			{ name: 'Hit', signature: true, instrument: 'fists', action: 'strike', medium: 'metal', intensity: 60,
				effects: [{ kind: 'harm', emphasis: 'primary' }], delivery: { mode: 'contact' }, spatial: { range: 'contact' } },
			{ name: 'Ward', instrument: 'hide', action: 'ward', medium: 'metal', intensity: 50,
				effects: [{ kind: 'protect', emphasis: 'primary' }], delivery: { mode: 'contact' }, spatial: { range: 'contact' } },
		],
	};
}
const roster = () => Array.from({ length: 12 }, () => twoWay());
const match = (rules: any) => createMatch({ rosterA: roster(), rosterB: roster(), worlds: makeWorlds(), seed: 'act-flip', rules });

describe('act flip: the roles a record can support', () => {
	test('is shipped on', () => {
		expect(ACT_FLIP).toBe(true);
	});

	test('a creature that can both attack and protect offers both', () => {
		const rec = twoWay();
		const roles = flippableRolesOf(rec);
		expect(roles.length).toBeGreaterThan(1);
		expect(roles).toContain(ROLE.SHIELD);
		// the natural role is always first, so the list doubles as "what happens by default"
		expect(roles[0]).toBe(naturalRoleOf(rec));
	});

	test('a creature is never offered a behaviour its record cannot produce', () => {
		// the whole safety of the feature: the handler chooses among real acts, not any role
		const rec = twoWay();
		const roles = flippableRolesOf(rec);
		expect(roles).not.toContain(ROLE.BOLSTER);
		expect(roles).not.toContain(ROLE.NONE);
	});
});

describe('act flip: the choice is honoured, and gated', () => {
	test('prepare takes the chosen role when the lever is on', () => {
		const rec = twoWay();
		const site: any = makeWorlds()[0].sites[0];
		const alt = flippableRolesOf(rec).find((r) => r !== naturalRoleOf(rec));
		expect(alt).toBeTruthy();
		const on: any = prepare(rec, site, null, 0, { rules: { actFlip: true } as any, chosenRole: alt });
		expect(on.role).toBe(alt);
	});

	test('prepare ignores the chosen role when the lever is off', () => {
		const rec = twoWay();
		const site: any = makeWorlds()[0].sites[0];
		const alt = flippableRolesOf(rec).find((r) => r !== naturalRoleOf(rec));
		const off: any = prepare(rec, site, null, 0, { rules: { actFlip: false } as any, chosenRole: alt });
		expect(off.role).toBe(naturalRoleOf(rec));
	});

	test('an illegal choice falls back to the natural role rather than failing', () => {
		// a stale saved choice, or a caller that does not know about the lever
		const rec = twoWay();
		const site: any = makeWorlds()[0].sites[0];
		const bad: any = prepare(rec, site, null, 0, { rules: { actFlip: true } as any, chosenRole: 'nonsense' });
		expect(bad.role).toBe(naturalRoleOf(rec));
	});

	/*
		THE BUG THE PAINT CHECK CAUGHT, pinned so it cannot come back.

		The choice was stored on the board entry and honoured by prepare, and then
		recomputeHoldsAtSite called roleOfEntry on every company change and wrote the NATURAL
		role straight back over it. The picker registered the press, the send carried the
		choice, and the board still showed the old role. Reading the send path did not find it;
		printing the board entry after the send did.
	*/
	test('the chosen role survives on the board, not just in prepare', () => {
		let state: any = match(null);
		const seat = state.turn;
		const rec = state.players[seat].roster[0];
		const alt = flippableRolesOf(rec, state.rules).find((r: any) => r !== naturalRoleOf(rec));
		expect(alt).toBeTruthy();
		const siteId = state.frames[0].sites[0].id;
		state = send(state, seat, rec.id, siteId, false, alt);
		expect(state).not.toBe(null);
		const entry = state.board[siteId][seat].find((e: any) => e.recordId === rec.id);
		expect(entry).toBeTruthy();
		expect(entry.chosenRole).toBe(alt);
		// and the role the board reports, which is what every reading downstream uses
		expect(entry.role).toBe(alt);
		const view: any = getPublicState(state, seat);
		expect(view.board[siteId][seat][0].role).toBe(alt);
	});

	test('a send with no choice still takes the natural role', () => {
		let state: any = match(null);
		const seat = state.turn;
		const rec = state.players[seat].roster[0];
		const siteId = state.frames[0].sites[0].id;
		state = send(state, seat, rec.id, siteId);
		const entry = state.board[siteId][seat].find((e: any) => e.recordId === rec.id);
		expect(entry.role).toBe(naturalRoleOf(rec));
	});
});
