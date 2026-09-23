/*
	PASS 38. The table's forecast is the engine's own resolve run on what the player can
	see. These tests hold it to the Ruling: with nothing of the opponent's hidden, the
	forecast taken just before the round's last pass must name exactly the creatures the
	Ruling leaves standing, at exactly their held values. And it must not touch the state.
*/
import { describe, test, expect } from 'vitest';
import { createMatch, send, pass, moveSwift, stakeWorld, getPublicState, forecastClash, createRngState, nextRandom } from '../expeditionRules.ts';
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
});
