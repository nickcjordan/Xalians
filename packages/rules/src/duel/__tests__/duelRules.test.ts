import { describe, it, expect } from 'vitest';
import * as duelCalculator from '../duelCalculator.ts';
import * as duelConstants from '../duelGameConstants.ts';
import type { BoardState, DuelCtx, DuelFlag, DuelMove, DuelPiece } from '../types.ts';

/*
	Rules coverage for the duel game. The board is 8x8, so cell index = row * 8 + col.

	Fixtures are built by hand rather than through duelPieceBuilder so a test states
	exactly the stats it depends on.
*/

const ctx: DuelCtx = { phase: 'play', currentPlayer: '0' };

function piece(id: string, overrides: Partial<DuelPiece> = {}): DuelPiece {
	return {
		xalianId: id,
		species: { id: '00001', name: 'Testling', planet: 'Floria' },
		elementType: 'Plant',
		elements: { primaryType: 'Plant', secondaryType: null },
		moves: [],
		stats: { attack: 4, defense: 4, speed: 4, range: 1, distance: 3, evasion: 0 },
		state: { health: duelConstants.MAX_HEALTH_POINTS, stamina: duelConstants.MAX_STAMINA_POINTS },
		traits: { canFly: false, attackRange: 'low' },
		...overrides,
	};
}

interface Placement {
	index: number;
	piece: DuelPiece;
	team?: 0 | 1;
}

// places pieces at the given cell indices and puts them all on the requested team
function buildBoard(placements: Placement[], flags: DuelFlag[] = []): BoardState {
	const cells: (string | null)[] = new Array(64).fill(null);
	const xalians: DuelPiece[] = [];
	const teams: [string[], string[]] = [[], []];

	placements.forEach(({ index, piece: p, team = 0 }) => {
		cells[index] = p.xalianId;
		xalians.push(p);
		teams[team].push(p.xalianId);
	});

	return {
		cells,
		xalians,
		flags,
		currentTurnDetails: null,
		currentTurnActions: [],
		playerStates: [
			{ playerID: 0, activeXalianIds: teams[0], inactiveXalianIds: [], unsetXalianIds: [] },
			{ playerID: 1, activeXalianIds: teams[1], inactiveXalianIds: [], unsetXalianIds: [] },
		],
	};
}

function reachableFrom(index: number, mover: DuelPiece, G: BoardState): number[] {
	return duelCalculator.calculateMovablePaths(index, mover, G, ctx).map((path) => path.endIndex);
}

describe('movement: pieces block the ground, flight goes over', () => {
	// row 4: 32 33 34 35 ... - a mover at 32 with blockers at 33 and 34.
	// walking to 35 means detouring through row 3 or 5 (5 spaces); flying is 3.
	const blockedLane = (mover: DuelPiece) =>
		buildBoard([
			{ index: 32, piece: mover, team: 0 },
			{ index: 33, piece: piece('blocker-a'), team: 0 },
			{ index: 34, piece: piece('blocker-b'), team: 0 },
		]);

	it('a walker cannot reach the cell beyond two blockers', () => {
		const walker = piece('walker');
		expect(reachableFrom(32, walker, blockedLane(walker))).not.toContain(35);
	});

	it('a flyer reaches it by passing over them', () => {
		const flyer = piece('flyer', { traits: { canFly: true, attackRange: 'low' } });
		expect(reachableFrom(32, flyer, blockedLane(flyer))).toContain(35);
	});

	it('a flyer still cannot land on an occupied square', () => {
		const flyer = piece('flyer', { traits: { canFly: true, attackRange: 'low' } });
		const reachable = reachableFrom(32, flyer, blockedLane(flyer));
		expect(reachable).not.toContain(33);
		expect(reachable).not.toContain(34);
	});
});

describe('movement: carrying a flag slows a piece down', () => {
	const carrierId = 'carrier';

	function boardWithFlag(holder: boolean) {
		const carrier = piece(carrierId);
		return {
			carrier,
			G: buildBoard([{ index: 32, piece: carrier, team: 0 }], [
				{ index: holder ? null : 40, startIndex: 40, holder: holder ? carrierId : null, player: 0 },
				{ index: 5, startIndex: 5, holder: null, player: 1 },
			]),
		};
	}

	it('moves its full distance when empty-handed', () => {
		const { carrier, G } = boardWithFlag(false);
		const distances = duelCalculator.calculateMovablePaths(32, carrier, G, ctx).map((p) => p.spacesMoved);
		expect(Math.max(...distances)).toBe(3);
	});

	it('is capped while holding a flag', () => {
		const { carrier, G } = boardWithFlag(true);
		const distances = duelCalculator.calculateMovablePaths(32, carrier, G, ctx).map((p) => p.spacesMoved);
		expect(Math.max(...distances)).toBe(duelConstants.FLAG_CARRIER_MAX_SPACES_PER_TURN);
	});

	it('reports who is carrying a flag', () => {
		const { carrier, G } = boardWithFlag(true);
		expect(duelCalculator.isCarryingFlag(carrier, G)).toBe(true);
		expect(duelCalculator.isCarryingFlag(piece('someone-else'), G)).toBe(false);
	});
});

describe('setup: flag row placement', () => {
	it('gives both sides a flag row that is symmetric on an 8x8 board', () => {
		const { playerFlagRow, opponentFlagRow } = duelCalculator.getFlagRowIndices(duelConstants.BOARD_COLUMN_SIZE);
		expect(playerFlagRow).toBe(6);
		expect(opponentFlagRow).toBe(1);
	});

	it('stays symmetric (equidistant from each side\'s home row) for other board sizes', () => {
		expect(duelCalculator.getFlagRowIndices(10)).toEqual({ playerFlagRow: 8, opponentFlagRow: 1 });
		expect(duelCalculator.getFlagRowIndices(6)).toEqual({ playerFlagRow: 4, opponentFlagRow: 1 });
	});
});

describe('combat', () => {
	const CEILING = duelConstants.MAX_SINGLE_HIT_HEALTH_FRACTION * duelConstants.MAX_HEALTH_POINTS;

	function attackResult(attacker: DuelPiece, defender: DuelPiece, move: DuelMove | null = null) {
		const G = buildBoard([
			{ index: 32, piece: attacker, team: 0 },
			{ index: 33, piece: defender, team: 1 },
		]);
		// simulate = true pins the random factor to 1 so damage is deterministic
		return duelCalculator.calculateAttackResult(attacker, defender, G, ctx, true, move);
	}

	// damage is floored to one decimal, so ratio assertions use a heavy hitter
	// where that 0.1 granularity is negligible
	const heavyAttacker = piece('heavy', { stats: { ...piece('x').stats, attack: 400 } });

	it('evasion reduces incoming damage without ever nullifying it', () => {
		const slippery = piece('slippery', { stats: { ...piece('x').stats, evasion: 10 } });
		const sitting = piece('sitting-duck');

		const baseline = attackResult(heavyAttacker, sitting).damage;
		const mitigated = attackResult(heavyAttacker, slippery).damage;

		expect(mitigated).toBeLessThan(baseline);
		expect(mitigated).toBeGreaterThan(0);
		// 10 evasion x 2% = 20% off, which is under the cap
		expect(mitigated / baseline).toBeCloseTo(0.8, 2);
	});

	it('caps the evasion reduction so a high-evasion piece is not immune', () => {
		const absurd = piece('absurd', { stats: { ...piece('x').stats, evasion: 1000 } });

		const baseline = attackResult(heavyAttacker, piece('plain')).damage;
		const mitigated = attackResult(heavyAttacker, absurd).damage;

		expect(mitigated / baseline).toBeCloseTo(1 - duelConstants.MAX_EVASION_DAMAGE_REDUCTION, 2);
	});

	it('applies STAB when the move type matches the attacker', () => {
		const attacker = piece('attacker');
		const defender = piece('defender');
		const offType: DuelMove = { name: 'Off Type Jab', type: 'Water', rating: 10 };
		const stabbed: DuelMove = { name: 'On Type Jab', type: 'Plant', rating: 10 };

		const plain = attackResult(attacker, defender, offType).damage;
		const boosted = attackResult(attacker, defender, stabbed).damage;

		expect(boosted).toBeGreaterThan(plain);
	});

	it('never lets a single hit take a full health bar', () => {
		// the worst case the generator can produce: a big attacker, a high-rating STAB
		// move, and a defender weak to it on both types
		const brute = piece('brute', { stats: { ...piece('x').stats, attack: 400 } });
		// Plant hits Water for 2x and Rock for 1.5x, so this defender takes a 3x product
		const doublyWeak = piece('doubly-weak', {
			elementType: 'Water',
			elements: { primaryType: 'Water', secondaryType: 'Rock' },
			stats: { ...piece('x').stats, defense: 1 },
		});
		const heavyStab: DuelMove = { name: 'Overkill', type: 'Plant', rating: 15 };

		const result = attackResult(brute, doublyWeak, heavyStab);

		expect(result.uncappedDamage).toBeGreaterThan(duelConstants.MAX_HEALTH_POINTS);
		expect(result.damage).toBeLessThan(duelConstants.MAX_HEALTH_POINTS);
		// damage is floored to one decimal, so the capped value sits just under the ceiling
		expect(result.damage).toBeLessThanOrEqual(CEILING);
		expect(result.damage).toBeGreaterThan(CEILING - 0.1);
	});

	it('keeps evasion meaningful against a capped hit', () => {
		const brute = piece('brute', { stats: { ...piece('x').stats, attack: 400 } });
		const plain = piece('plain', { stats: { ...piece('x').stats, defense: 1 } });
		const slippery = piece('slippery', { stats: { ...piece('x').stats, defense: 1, evasion: 10 } });

		const hit = attackResult(brute, plain).damage;
		const dodged = attackResult(brute, slippery).damage;

		expect(hit).toBeGreaterThan(CEILING - 0.1);
		expect(dodged).toBeLessThan(hit);
	});

	it('leaves an immune matchup at zero damage', () => {
		const attacker = piece('attacker');
		// Electric is listed as doing 0 against Rock in typeEffectivenessMatrix.json
		const grounded = piece('grounded', {
			elementType: 'Rock',
			elements: { primaryType: 'Rock', secondaryType: null },
		});
		const zap: DuelMove = { name: 'Zap', type: 'Electric', rating: 15 };

		expect(attackResult(attacker, grounded, zap).damage).toBe(0);
	});

	it('treats a typeless move as neutral rather than crashing', () => {
		const result = attackResult(piece('attacker'), piece('defender'), { name: 'Plain Whack', rating: 10 });
		expect(result.typeEffectiveness).toBe(1);
		expect(result.damage).toBeGreaterThan(0);
	});
});
