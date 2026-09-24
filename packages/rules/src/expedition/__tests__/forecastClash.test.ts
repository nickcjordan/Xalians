/*
	PASS 38. The table's forecast is the engine's own resolve run on what the player can
	see. These tests hold it to the Ruling: with nothing of the opponent's hidden, the
	forecast taken just before the round's last pass must name exactly the creatures the
	Ruling leaves standing, at exactly their held values. And it must not touch the state.
*/
import { describe, test, expect } from 'vitest';
import { createMatch, send, pass, moveSwift, stakeWorld, getPublicState, forecastClash, forecastSend, forecastMove, movableRecordIdsFor, createRngState, nextRandom } from '../expeditionRules.ts';
import { chooseSend, chooseStake } from '../expeditionBot.ts';
import { buildRosters } from '../roster.ts';
import { getWorlds } from '../sites.ts';
import type { MatchState, Seat } from '../types.ts';

function botRng(seed: string) {
	let state = createRngState(seed);
	return {
		float: () => {
			const { value, nextState } = nextRandom(state);
			state = nextState;
			return value;
		},
	};
}

// plays bot against bot, calling `onLastPass` with the state just before each round's resolving pass
function playMatch(seed: string, onLastPass: (state: MatchState) => void) {
	const { rosterA, rosterB } = buildRosters(seed);
	let state = createMatch({ rosterA, rosterB, worlds: getWorlds(), seed });
	const rng = botRng(`${seed}-bot`);
	let guard = 0;
	while (state.phase === 'deploy' && guard < 2000) {
		guard += 1;
		const handler = state.turn as Seat;
		let view = getPublicState(state, handler);
		if ((view.players[handler].stakeableSiteIds || []).length > 0) {
			const wanted = chooseStake(view, state.players[handler].roster, handler, null);
			const staked = wanted ? stakeWorld(state, handler, wanted.siteId) : null;
			if (staked) {
				state = staked;
				view = getPublicState(state, handler);
			}
		}
		let action = chooseSend(view, state.players[handler].roster, handler, rng, null);
		if (action.type === 'move') {
			const moved = moveSwift(state, handler, action.recordId, action.siteId);
			if (moved) {
				state = moved;
			}
			action = chooseSend(getPublicState(state, handler), state.players[handler].roster, handler, rng, null);
		}
		if (action.type === 'send') {
			const next = send(state, handler, action.recordId, action.siteId, false, (action as any).chosenRole || null);
			if (!next) {
				throw new Error(`illegal send ${JSON.stringify(action)}`);
			}
			state = next;
			continue;
		}
		const other = handler === 'A' ? 'B' : 'A';
		if (state.players[other].passed) {
			onLastPass(state);
		}
		state = pass(state, handler) as MatchState;
	}
	return state;
}

describe('forecastClash', () => {
	test('names the survivors and their holds exactly when nothing is hidden', () => {
		let checked = 0;
		['f1', 'f2', 'f3', 'f4', 'f5', 'f6'].forEach((seed) => {
			playMatch(seed, (before) => {
				(['A', 'B'] as Seat[]).forEach((handler) => {
					const opponent = handler === 'A' ? 'B' : 'A';
					const hidden = Object.values(before.board).some((site: any) => site[opponent].some((e: any) => e.hidden));
					if (hidden) {
						return;
					}
					const forecast = forecastClash(before, handler) as Record<string, { hold: number; downed: boolean }>;
					const last = before.turn as Seat;
					const after = pass(before, last) as MatchState;
					const judge = [...after.resolutionLog].reverse().find((e: any) => e.type === 'judge') as any;
					Object.keys(judge.siteResults).forEach((siteId) => {
						(['A', 'B'] as Seat[]).forEach((seat) => {
							const standing = judge.siteResults[siteId].entries[seat];
							const onBoard = (before.board[siteId][seat] || []).map((e: any) => e.recordId);
							onBoard.forEach((id: string) => {
								const survivor = standing.find((e: any) => e.recordId === id);
								expect(forecast[id].downed).toBe(!survivor);
								if (survivor) {
									expect(forecast[id].hold).toBeCloseTo(survivor.hold, 5);
								}
							});
						});
					});
					checked += 1;
				});
			});
		});
		expect(checked).toBeGreaterThan(10);
	});

	test('leaves the state it reads untouched', () => {
		playMatch('f7', (before) => {
			const snapshot = JSON.stringify(before);
			forecastClash(before, 'A');
			forecastClash(before, 'B');
			expect(JSON.stringify(before)).toBe(snapshot);
		});
	});

	test('never counts a hidden send of the opponent', () => {
		let seen = 0;
		playMatch('h1', (before) => {
			// hide one of B's creatures by hand: stealthy arrivals are rare in a bot match
			const siteId = Object.keys(before.board).find((id) => before.board[id].B.length > 0);
			if (!siteId) {
				return;
			}
			const board = { ...before.board, [siteId]: { ...before.board[siteId], B: before.board[siteId].B.map((e, i) => (i === 0 ? { ...e, hidden: true } : e)) } };
			const withHidden = { ...before, board } as MatchState;
			const hiddenId = board[siteId].B[0].recordId;
			expect(forecastClash(withHidden, 'A')![hiddenId]).toBeUndefined();
			expect(forecastClash(withHidden, 'B')![hiddenId]).toBeDefined();
			seen += 1;
		});
		expect(seen).toBeGreaterThan(0);
	});

	test('is null outside Deploy', () => {
		const state = playMatch('f8', () => {});
		expect(forecastClash(state, 'A')).toBe(null);
	});

	// pass 54: a world's standing draws the hold going in and what the Clash leaves of it
	test('gives each creature the hold it goes into the Clash with, never less than it keeps', () => {
		let checked = 0;
		playMatch('f9', (before) => {
			const forecast = forecastClash(before, 'A') as Record<string, { hold: number; downed: boolean; before: number }>;
			Object.values(forecast).forEach((f) => {
				expect(f.before).toBeGreaterThan(0);
				expect(f.hold).toBeLessThanOrEqual(f.before + 1e-9);
				checked += 1;
			});
		});
		expect(checked).toBeGreaterThan(10);
	});
});

/*
	PASS 52. The bench's fit strip prints what each creature would do at each world, so the
	forecast of a send must be the send: the same board forecastClash() reads after send().
*/
describe('forecastSend', () => {
	test('equals forecastClash after the real send, for every creature in hand at every world', () => {
		let checked = 0;
		playMatch('s1', (before) => {
			const handler = before.turn as Seat;
			const frame = before.frames[before.frameIndex];
			before.players[handler].roster.slice(0, 4).forEach((record) => {
				frame.sites.forEach((site: any) => {
					const real = send({ ...before, players: { ...before.players, [handler]: { ...before.players[handler], passed: false } } }, handler, record.id, site.id);
					if (!real) {
						return;
					}
					// A legal final send can resolve the round immediately, leaving no
					// Deploy state for forecastClash to read after the real send.
					if (real.phase !== 'deploy') {
						expect(forecastSend(before, handler, record.id, site.id)).not.toBeNull();
						return;
					}
					const expected = forecastClash(real, handler);
					expect(forecastSend(before, handler, record.id, site.id)).toEqual(expected);
					checked += 1;
				});
			});
		});
		expect(checked).toBeGreaterThan(20);
	});

	test('ignores whose turn it is and leaves the state untouched', () => {
		playMatch('s2', (before) => {
			const handler = before.turn as Seat;
			const other = handler === 'A' ? 'B' : 'A';
			const record = before.players[other].roster[0];
			const site = before.frames[before.frameIndex].sites[0];
			if (!record) {
				return;
			}
			const snapshot = JSON.stringify(before);
			const forecast = forecastSend(before, other, record.id, site.id);
			expect(forecast && forecast[record.id]).toBeDefined();
			expect(JSON.stringify(before)).toBe(snapshot);
		});
	});

	test('is null for a creature not in hand, a site not in the round, or outside Deploy', () => {
		const state = playMatch('s3', () => {});
		expect(forecastSend(state, 'A', 'nope', 'nope')).toBe(null);
	});
});

/*
	PASS 55. A swift creature's card shows what stepping to another world would do, so the
	forecast of a move must be the move: forecastClash() after the real moveSwift().
*/
describe('forecastMove', () => {
	test('equals forecastClash after the real move, and refuses what moveSwift refuses', () => {
		let checked = 0;
		['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8'].forEach((seed) => {
			playMatch(seed, (before) => {
				const handler = before.turn as Seat;
				movableRecordIdsFor(before, handler).forEach((id) => {
					before.frames[before.frameIndex].sites.forEach((site: any) => {
						const moved = moveSwift(before, handler, id, site.id);
						const forecast = forecastMove(before, handler, id, site.id);
						if (!moved) {
							expect(forecast).toBe(null);
							return;
						}
						expect(forecast).toEqual(forecastClash(moved, handler));
						checked += 1;
					});
				});
			});
		});
		expect(checked).toBeGreaterThan(0);
	});
});
