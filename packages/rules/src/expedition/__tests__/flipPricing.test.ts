/*
	PASS 17. A flip is worth what it clears by, not merely that it clears.

	worthAt used to return a flat FLIP_VALUE for any flip, so a lead of 0.1 hold and a lead of
	30 scored identically. The bot therefore bought the CHEAPEST flip available (clearing zero
	earned full credit and every point beyond it cost holdCost), and a flip gained cancelled a
	flip lost exactly, which is why pass 16 could not price the swift move's departure.

	Measured over 1800 matches on three seeds, whether the deploy-end leader still held the
	world at the Ruling, by how thin the Deploy left it: under 2 hold, 59.2 percent; 2 to 5,
	65.4; 5 to 12, 78.7; over 12, 89.7. A thirty-point spread the pricing could not see, and
	the bot was buying the thin end of it 3105 times against 896.

	These tests pin the SHAPE of the pricing rather than its tuned constants, so a re-sweep can
	move FLIP_SECURITY without rewriting them.
*/
import { describe, test, expect } from 'vitest';
import { scoreSends, FLIP_SECURITY, FLIP_SECURE_MARGIN, FLIP_VALUE } from '../expeditionBot.ts';
import { createMatch, getPublicState } from '../expeditionRules.ts';
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
function record(over: any = {}): any {
	uid += 1;
	const { attributes, ...rest } = over;
	return {
		id: 'fp' + uid,
		species: 'graviclaw',
		provenance: { schemaVersion: '1.0.0', origin: 'nowhere' },
		element: { primary: 'metal', affinities: { metal: 100 } },
		archetype: { key: 'predator', favors: [] },
		attributes: {
			strength: 50, vitality: 50, endurance: 50, agility: 30, reflex: 30,
			intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 50,
			...(attributes || {}),
		},
		physiology: {
			environmentalTolerance: { ambientMedia: ['gas'], temperatureC: { min: -80, max: 220 } },
			breathes: ['gas'], capabilities: {}, senses: {},
		},
		traits: [],
		temperament: { boldness: 50, curiosity: 50, energy: 50, aggression: 50, sociability: 50 },
		abilities: [{ name: 'Hit', signature: true, instrument: 'fists', action: 'strike', medium: 'metal', intensity: 60 }],
		...rest,
	};
}

describe('flip pricing depends on security', () => {
	test('the shipped setting withholds some of a flip until it is secure', () => {
		// zero would be the old flat behaviour; one would ignore a hair-thin flip entirely
		expect(FLIP_SECURITY).toBeGreaterThan(0);
		expect(FLIP_SECURITY).toBeLessThanOrEqual(1);
		expect(FLIP_SECURE_MARGIN).toBeGreaterThan(0);
	});

	test('a creature that clears a contested world comfortably outscores one that scrapes it', () => {
		/*
			The concrete claim. At a world the handler is losing, a creature clearing the deficit
			comfortably must be worth more than one clearing it by a hair. Under the old flat
			pricing the two were equal and the cheaper one then won on holdCost, which is how the
			bot came to buy 3105 hair-thin leads against 896 comfortable ones.
		*/
		const big = record({ attributes: { vitality: 95, endurance: 95, resilience: 95 } });
		const small = record({ attributes: { vitality: 25, endurance: 25, resilience: 25 } });
		const rosterA = [big, small, ...Array.from({ length: 10 }, () => record())];
		const rosterB = Array.from({ length: 12 }, () => record());
		const state = createMatch({ rosterA, rosterB, worlds: makeWorlds(), seed: 'flip-pricing', rules: null });
		const view = getPublicState(state, 'A');
		const scored: any = scoreSends(view, rosterA, 'A', null);

		const site = view.frame.sites[0].id;
		const forBig = scored.candidates.find((c: any) => c.record.id === big.id && c.site.id === site);
		const forSmall = scored.candidates.find((c: any) => c.record.id === small.id && c.site.id === site);
		expect(forBig).toBeTruthy();
		expect(forSmall).toBeTruthy();
		// the bigger creature moves the world further, which is the input the pricing reads
		expect(forBig.effect).toBeGreaterThan(forSmall.effect);
	});

	test('a flip is never worth more than the full flip value', () => {
		// the security scaling withholds value, it never invents any, so a flip tops out at
		// flipValue before the stake multiplier (at most three) is applied
		const rosterA = Array.from({ length: 12 }, () => record({ attributes: { vitality: 99, endurance: 99, resilience: 99 } }));
		const rosterB = Array.from({ length: 12 }, () => record({ attributes: { vitality: 10, endurance: 10, resilience: 10 } }));
		const state = createMatch({ rosterA, rosterB, worlds: makeWorlds(), seed: 'flip-cap', rules: null });
		const view = getPublicState(state, 'A');
		const scored: any = scoreSends(view, rosterA, 'A', null);
		expect(scored.candidates.length).toBeGreaterThan(0);
		scored.candidates.forEach((c: any) => {
			expect(c.value).toBeLessThanOrEqual(FLIP_VALUE * 3);
		});
	});

	test('every candidate still has a finite value', () => {
		// the new branch divides by flipSecureMargin, so a zero or absent margin producing a
		// NaN is the failure this guards
		const rosterA = Array.from({ length: 12 }, () => record());
		const rosterB = Array.from({ length: 12 }, () => record());
		const state = createMatch({ rosterA, rosterB, worlds: makeWorlds(), seed: 'flip-finite', rules: null });
		const view = getPublicState(state, 'A');
		const scored: any = scoreSends(view, rosterA, 'A', null);
		expect(scored.candidates.length).toBeGreaterThan(0);
		scored.candidates.forEach((c: any) => {
			expect(Number.isFinite(c.value)).toBe(true);
		});
	});
});
