/*
	PASS 15. The frame width as a real lever.

	`worldsPerFrame` has been a key in DEFAULT_RULES since pass 9, but nothing read it:
	drawFrames dealt from the module constant, and the clinch was a hard five wherever it
	was asked for. So a narrower frame could not be measured, and the untried half of the
	sends-per-world ratio stayed untried.

	These tests pin the wiring, one per place the width has to reach. The point of each is
	that the shipped 3 x 3 is unchanged while a 2 x 3 frame is a coherent game rather than
	a half-applied setting: six worlds dealt, a bar of four, and a bot that plays to four.
*/
import { describe, test, expect } from 'vitest';
import { createMatch, getPublicState } from '../expeditionRules.ts';
import {
	clinchFor, WORLDS_PER_FRAME, FRAMES_PER_MATCH, SITES_TO_CLINCH,
} from '../expeditionInterpretation.ts';
import type { World } from '../types.ts';

function makeWorlds(count: number): World[] {
	const planets = ['Magmuth', 'Poseidas', 'Grimedes', 'Luminax', 'Floria', 'Zolton',
		'Phantiri', 'Stonera', 'Drainov', 'Saiphus', 'Telypso', 'Krystos', 'Veridium', 'Endessa'];
	const elements = ['fire', 'water', 'dark', 'light', 'plant', 'electric', 'ghost', 'rock',
		'chemical', 'air', 'psychic', 'ice', 'metal', 'sand'];
	return Array.from({ length: count }, (_, i) => ({
		planet: planets[i % planets.length],
		element: elements[i % elements.length],
		sites: [0, 1, 2].map((k) => ({
			id: `${planets[i % planets.length].toLowerCase()}-site-${k}`,
			name: `${planets[i % planets.length]} Site ${k}`,
			planet: planets[i % planets.length],
			element: elements[i % elements.length],
			environment: { medium: 'gas', temperatureC: { min: -50, max: 200 } },
		})),
	})) as unknown as World[];
}

// a plain creature, enough to fill a roster; this pass is about the frame, not the record
let uid = 0;
function record(seat: string) {
	uid += 1;
	return {
		id: `${seat}-${uid}`,
		species: 'graviclaw',
		provenance: { schemaVersion: '1.0.0', origin: 'nowhere' },
		element: { primary: 'metal', affinities: { metal: 100 } },
		archetype: { key: 'predator', favors: [] },
		attributes: {
			strength: 50, vitality: 50, endurance: 50, agility: 50, reflex: 50,
			intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 50,
		},
		physiology: {
			environmentalTolerance: { ambientMedia: ['gas'], temperatureC: { min: -60, max: 90 } },
			breathes: ['gas'], capabilities: {}, senses: {},
		},
		traits: [],
		temperament: { boldness: 50, curiosity: 50, energy: 50, aggression: 50, sociability: 50 },
		abilities: [
			{ name: 'Hit', signature: true, instrument: 'fists', action: 'strike', medium: 'metal', intensity: 60 },
		],
	} as any;
}

const roster = (seat: string) => Array.from({ length: 12 }, () => record(seat));

const match = (rules: any = null) => createMatch({
	rosterA: roster('A'), rosterB: roster('B'), worlds: makeWorlds(14), seed: 'frame-width', rules,
});

describe('the clinch is a majority of the worlds on offer', () => {
	test('the shipped frame still clinches at five, so nothing moved under the game', () => {
		expect(clinchFor(WORLDS_PER_FRAME, FRAMES_PER_MATCH)).toBe(SITES_TO_CLINCH);
		expect(clinchFor(3, 3)).toBe(5);
	});

	test('a narrower frame clinches sooner rather than becoming unreachable', () => {
		// six worlds on offer: four is a majority, and five of six would be reachable only
		// by taking all but one, which is not the game the shipped nine plays
		expect(clinchFor(2, 3)).toBe(4);
		// and a wider one raises the bar with it
		expect(clinchFor(4, 3)).toBe(7);
	});

	test('the bar is always takeable and always decisive', () => {
		// a majority can be reached, and two sides cannot both reach it
		for (const width of [1, 2, 3, 4, 5]) {
			const worlds = width * FRAMES_PER_MATCH;
			const bar = clinchFor(width, FRAMES_PER_MATCH);
			expect(bar).toBeLessThanOrEqual(worlds);
			expect(bar * 2).toBeGreaterThan(worlds);
		}
	});
});

describe('the frame width reaches the deal', () => {
	test('the shipped default deals three worlds a round, nine distinct in all', () => {
		const state = match();
		expect(state.frames.length).toBe(FRAMES_PER_MATCH);
		state.frames.forEach((f: any) => expect(f.sites.length).toBe(3));
		const planets = state.frames.flatMap((f: any) => f.sites.map((s: any) => s.world.planet));
		expect(planets.length).toBe(9);
		expect(new Set(planets).size).toBe(9);
	});

	test('a width of two deals two worlds a round, six distinct in all', () => {
		const state = match({ worldsPerFrame: 2 });
		expect(state.rules.worldsPerFrame).toBe(2);
		state.frames.forEach((f: any) => expect(f.sites.length).toBe(2));
		const planets = state.frames.flatMap((f: any) => f.sites.map((s: any) => s.world.planet));
		expect(planets.length).toBe(6);
		// a world still never repeats within a match, which is what makes each round new
		expect(new Set(planets).size).toBe(6);
	});

	test('the board is built for the narrower frame, with no phantom worlds', () => {
		const state = match({ worldsPerFrame: 2 });
		expect(Object.keys(state.board).length).toBe(2);
		const view = getPublicState(state, 'A');
		expect(view.frame.sites.length).toBe(2);
		expect(Object.keys(view.board).length).toBe(2);
	});
});

describe('the frame width reaches the view the bot reads', () => {
	test('the rules travel, so the bot can derive the bar it is playing to', () => {
		const view = getPublicState(match({ worldsPerFrame: 2 }), 'A');
		expect(view.rules.worldsPerFrame).toBe(2);
		expect(clinchFor(view.rules.worldsPerFrame, FRAMES_PER_MATCH)).toBe(4);
	});

	test('the next round is still revealed at the narrower width', () => {
		// passing early is only informed if the frame ahead is visible, whatever its width
		const view = getPublicState(match({ worldsPerFrame: 2 }), 'A');
		expect(view.nextFrame).not.toBe(null);
		expect(view.nextFrame!.length).toBe(2);
	});
});
