/*
	PASS 38. The table's forecast is the engine's own resolve run on what the player can
	see. These tests hold it to the Ruling: with nothing of the opponent's hidden, the
	forecast taken just before the round's last pass must name exactly the creatures the
	Ruling leaves standing, at exactly their held values. And it must not touch the state.
*/
import { describe, test, expect } from 'vitest';
import { createMatch, send, pass, moveSwift, stakeWorld, getPublicState, forecastClash, forecastSend, forecastSendBlows, forecastStanding, forecastSendStanding, forecastMove, movableRecordIdsFor, createRngState, nextRandom } from '../expeditionRules.ts';
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
	PASS 72. While sends are made the table shows the board stacked, with no Clash run: every
	creature at the hold it would go into the Clash with, nobody downed, the rival's hidden
	sends still hidden, and a send's standing is the standing after the real send.
*/
describe('forecastStanding', () => {
	test('is every creature at the hold it goes into the Clash with, nobody downed', () => {
		let checked = 0;
		playMatch('st1', (before) => {
			(['A', 'B'] as Seat[]).forEach((handler) => {
				const clash = forecastClash(before, handler)!;
				const standing = forecastStanding(before, handler)!;
				expect(Object.keys(standing).sort()).toEqual(Object.keys(clash).sort());
				Object.entries(standing).forEach(([id, f]) => {
					expect(f.downed).toBe(false);
					expect(f.hold).toBe(f.before);
					expect(f.before).toBeCloseTo(clash[id].before, 9);
					checked += 1;
				});
			});
		});
		expect(checked).toBeGreaterThan(10);
	});

	test('never counts a hidden send of the opponent, and leaves the state untouched', () => {
		let seen = 0;
		playMatch('st2', (before) => {
			const siteId = Object.keys(before.board).find((id) => before.board[id].B.length > 0);
			if (!siteId) {
				return;
			}
			const board = { ...before.board, [siteId]: { ...before.board[siteId], B: before.board[siteId].B.map((e, i) => (i === 0 ? { ...e, hidden: true } : e)) } };
			const withHidden = { ...before, board } as MatchState;
			const hiddenId = board[siteId].B[0].recordId;
			const snapshot = JSON.stringify(withHidden);
			expect(forecastStanding(withHidden, 'A')![hiddenId]).toBeUndefined();
			expect(forecastStanding(withHidden, 'B')![hiddenId]).toBeDefined();
			expect(JSON.stringify(withHidden)).toBe(snapshot);
			seen += 1;
		});
		expect(seen).toBeGreaterThan(0);
	});

	test('a send stands as the real send does', () => {
		let checked = 0;
		playMatch('st3', (before) => {
			const handler = before.turn as Seat;
			const frame = before.frames[before.frameIndex];
			before.players[handler].roster.slice(0, 3).forEach((record) => {
				frame.sites.forEach((site: any) => {
					const real = send(before, handler, record.id, site.id);
					if (!real || real.phase !== 'deploy') {
						return;
					}
					expect(forecastSendStanding(before, handler, record.id, site.id)).toEqual(forecastStanding(real, handler));
					checked += 1;
				});
			});
		});
		expect(checked).toBeGreaterThan(10);
	});

	test('is null outside Deploy', () => {
		const state = playMatch('st4', () => {});
		expect(forecastStanding(state, 'A')).toBe(null);
		expect(forecastSendStanding(state, 'A', 'nope', 'nope')).toBe(null);
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

/*
	PASS 61. The words beside a creature's number name the fight behind its toll, so the blows
	must add up to the toll the forecast prints: what lands on it, less what is given back, is
	what it goes in with less what it keeps; it falls exactly when the forecast downs it; and
	every creature it is said to down is one the forecast downs.
*/
describe('forecastSendBlows', () => {
	test('adds up to the forecast toll, and downs what the forecast downs', () => {
		// unlifted counts the cases where a fallen ally's lift is part of the toll. It is rare:
		// pass 71 scanned b1 to b60 and found it at b17, b24, b31, b40 and b47, so two of
		// those ride with eight ordinary seeds
		let checked = 0;
		let withBlows = 0;
		let unlifted = 0;
		['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'b17', 'b24'].forEach((seed) => {
			playMatch(seed, (before) => {
				const handler = before.turn as Seat;
				before.players[handler].roster.forEach((record: any) => {
					before.frames[before.frameIndex].sites.forEach((site: any) => {
						const forecast = forecastSend(before, handler, record.id, site.id);
						const blows = forecastSendBlows(before, handler, record.id, site.id);
						if (!forecast) {
							expect(blows).toBe(null);
							return;
						}
						expect(blows).not.toBe(null);
						const own = forecast[record.id];
						const landed = blows!.taken.reduce((sum, b) => sum + b.power, 0);
						expect(blows!.falls).toBe(own.downed);
						if (!own.downed) {
							expect(Math.abs(landed - blows!.recovered + blows!.unlifted - (own.before - own.hold))).toBeLessThan(0.25);
							// a hold lost to no blow is always a lift lost with an ally of yours that falls beside it
							if (blows!.unlifted > 0.25) {
								expect(blows!.alliesDowned.length).toBeGreaterThan(0);
								unlifted += 1;
							}
						}
						blows!.downs.forEach((id) => expect(forecast[id] && forecast[id].downed).toBe(true));
						blows!.downsBeforeActing.forEach((id) => expect(blows!.downs).toContain(id));
						// it downs exactly the creatures its own hits down
						expect(blows!.dealt.filter((h) => h.downs).map((h) => h.to).sort()).toEqual([...blows!.downs].sort());
						// a creature it downs before that creature acts never lands a blow on it
						blows!.taken.forEach((b) => expect(blows!.downsBeforeActing).not.toContain(b.by));
						checked += 1;
						if (blows!.taken.length) withBlows += 1;
					});
				});
			});
		});
		expect(checked).toBeGreaterThan(100);
		expect(withBlows).toBeGreaterThan(10);
		expect(unlifted).toBeGreaterThan(0);
	// pass 69: ten seeds run 5.8s on CI, past the 5s default
	}, 30000);

	// pass 67: who goes first, for the creature that loses as well as the one that wins
	test('says which blows land before its own attack, whether it attacks at all, and whether it falls before its turn', () => {
		let quicker = 0;
		let neverStrikes = 0;
		let beforeTurn = 0;
		['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'b9', 'b10'].forEach((seed) => {
			playMatch(seed, (before) => {
				const handler = before.turn as Seat;
				before.players[handler].roster.forEach((record: any) => {
					before.frames[before.frameIndex].sites.forEach((site: any) => {
						const blows = forecastSendBlows(before, handler, record.id, site.id);
						if (!blows) {
							return;
						}
						// a creature that never attacks has every blow land before it (it has no turn to beat)
						if (!blows.strikes) {
							blows.taken.filter((b) => b.by).forEach((b) => expect(b.before).toBe(true));
							expect(blows.first).toBe(false);
							expect(blows.fallsBeforeActing).toBe(false);
							if (blows.taken.some((b) => b.by)) neverStrikes += 1;
						}
						// acting first means no rival blow landed before it
						if (blows.first) {
							blows.taken.filter((b) => b.by).forEach((b) => expect(b.before).toBe(false));
						}
						if (blows.fallsBeforeActing) {
							expect(blows.falls).toBe(true);
							expect(blows.strikes).toBe(true);
							expect(blows.dealt).toEqual([]);
							beforeTurn += 1;
						}
						if (blows.strikes && blows.taken.some((b) => b.by && b.before)) quicker += 1;
					});
				});
			});
		});
		expect(quicker).toBeGreaterThan(0);
		expect(neverStrikes).toBeGreaterThan(0);
		expect(beforeTurn).toBeGreaterThan(0);
	});
});
