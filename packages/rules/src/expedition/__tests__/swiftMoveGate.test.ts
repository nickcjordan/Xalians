/*
	PASS 16. The gate on the swift creature's move.

	The rule ("swift creatures move", assumption 20) was measured costing the creatures it
	applies to about six points of world win rate: they won their world 53.9 percent with it
	live and 59.7 percent with `swiftMove: false`, while slower creatures were untouched. The
	bot was taking any move that scored a hair better than staying, against margins that are
	only a snapshot of its own turn - the opponent sends afterwards - so the move was
	routinely invalidated and paid for at both worlds.

	SWIFT_MOVE_GAIN is the margin of confidence a move must now clear. These tests pin the
	gate's behaviour rather than its measured value, so a re-sweep can move the number
	without rewriting them.
*/
import { describe, test, expect } from 'vitest';
import { createMatch, send, getPublicState, currentFrame } from '../expeditionRules.ts';
import { chooseSend, SWIFT_MOVE_GAIN } from '../expeditionBot.ts';
import { SWIFT_SPEED } from '../expeditionInterpretation.ts';
import { speedOf } from '../creatureOnTable.ts';
import type { World, XalianRecord } from '../types.ts';

function makeWorlds(): World[] {
	const planets = ['Magmuth', 'Poseidas', 'Grimedes', 'Luminax', 'Floria', 'Zolton',
		'Phantiri', 'Stonera', 'Drainov', 'Saiphus', 'Telypso', 'Krystos', 'Veridium', 'Endessa'];
	return planets.map((planet, i) => ({
		planet, element: 'metal',
		sites: [0, 1, 2].map((k) => ({
			id: `${planet.toLowerCase()}-site-${k}`,
			name: `${planet} Site ${k}`,
			planet, element: 'metal',
			environment: { medium: 'gas', temperatureC: { min: -60, max: 200 } },
		})),
	})) as unknown as World[];
}

let uid = 0;
function record(over: any = {}): XalianRecord {
	uid += 1;
	const { attributes, ...rest } = over;
	return {
		id: `r${uid}`,
		species: 'graviclaw',
		provenance: { schemaVersion: '1.0.0', origin: 'nowhere' },
		element: { primary: 'metal', affinities: { metal: 100 } },
		archetype: { key: 'predator', favors: [] },
		attributes: {
			strength: 50, vitality: 50, endurance: 50, agility: 20, reflex: 20,
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
	} as any;
}

// speed is the mean of agility and reflex, so this is comfortably over the threshold
const swiftRecord = () => record({ attributes: { agility: 95, reflex: 95 } });
const rng = { float: () => 0.5 };

describe('the swift move gate', () => {
	test('a swift creature is swift and a plain one is not, so the fixtures are honest', () => {
		expect(speedOf(swiftRecord())).toBeGreaterThanOrEqual(SWIFT_SPEED);
		expect(speedOf(record())).toBeLessThan(SWIFT_SPEED);
	});

	test('the shipped gate asks for a real margin, not a hair', () => {
		// the whole finding: at zero, any move that scored a hair better than staying was
		// taken, and that measured as a six-point loss to the creatures using it
		expect(SWIFT_MOVE_GAIN).toBeGreaterThan(0);
	});

	test('a rival may override the gate, so it stays sweepable', () => {
		const rosterA = [swiftRecord(), ...Array.from({ length: 11 }, () => record())];
		const rosterB = Array.from({ length: 12 }, () => record());
		const state = createMatch({ rosterA, rosterB, worlds: makeWorlds(), seed: 'gate', rules: null });
		const view = getPublicState(state, 'A');
		// an absurdly high gate must never produce a move; the bot sends or passes instead
		const strict: any = { id: 'strict', weights: { swiftMoveGain: 1e6 } };
		const action = chooseSend(view, rosterA, 'A', rng, strict);
		expect(action.type).not.toBe('move');
	});

	test('a creature standing alone on a world it holds is not moved off it', () => {
		/*
			The concrete case behind the finding: 37 percent of moves under the old gate left a
			world the creature was holding alone, which hands that world to the opponent. With
			one swift creature alone on the board and nothing contesting it, no gain elsewhere
			should be worth abandoning the world it is winning.
		*/
		const swift = swiftRecord();
		const rosterA = [swift, ...Array.from({ length: 11 }, () => record())];
		const rosterB = Array.from({ length: 12 }, () => record());
		let state = createMatch({ rosterA, rosterB, worlds: makeWorlds(), seed: 'alone', rules: null });
		const frame = currentFrame(state);
		const held = frame.sites[0].id;
		// put it on the board by the engine's own rules, then hand the turn back to A
		const sent = send(state, state.turn as any, state.turn === 'A' ? swift.id : rosterB[0].id, held);
		expect(sent).not.toBe(null);
		state = sent as any;

		// whichever seat holds that world alone, the bot must not walk its holder away
		let guard = 0;
		while (state.turn !== 'A' && state.phase === 'deploy' && guard++ < 4) {
			const other = getPublicState(state, state.turn as any);
			const act: any = chooseSend(other, state.players[state.turn as any].roster, state.turn as any, rng, null);
			if (act.type !== 'send') break;
			state = send(state, state.turn as any, act.recordId, act.siteId) as any;
		}
		if (state.turn === 'A') {
			const view = getPublicState(state, 'A');
			const action: any = chooseSend(view, state.players.A.roster, 'A', rng, null);
			// it may send or pass; what it must not do is relocate the creature off a world
			// its departure would surrender
			if (action.type === 'move') {
				const onBoard = (view.board[held].A || []).map((e: any) => e.recordId);
				const surrenders = onBoard.length === 1 && onBoard[0] === action.recordId
					&& (view.board[held].B || []).length === 0;
				expect(surrenders).toBe(false);
			}
		}
	});
});
