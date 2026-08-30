import * as duelCalculator from '../duelCalculator';
import * as duelConstants from '../duelGameConstants';

/*
	Rules coverage for the duel game. The board is 8x8, so cell index = row * 8 + col.

	Fixtures are built by hand rather than through duelPieceBuilder so a test states
	exactly the stats it depends on.
*/

const ctx = { phase: 'play', currentPlayer: '0' };

function piece(id, overrides = {}) {
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

// places pieces at the given cell indices and puts them all on the requested team
function buildBoard(placements, flags = []) {
	const cells = new Array(64).fill(null);
	const xalians = [];
	const teams = [[], []];

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

function reachableFrom(index, mover, G) {
	return duelCalculator.calculateMovablePaths(index, mover, G, ctx).map((path) => path.endIndex);
}

describe('movement: pieces block the ground, flight goes over', () => {
	// row 4: 32 33 34 35 ... - a mover at 32 with blockers at 33 and 34.
	// walking to 35 means detouring through row 3 or 5 (5 spaces); flying is 3.
	const blockedLane = (mover) =>
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

	function boardWithFlag(holder) {
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

describe('combat', () => {
	function attackResult(attacker, defender, move = null) {
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
		const offType = { name: 'Off Type Jab', type: 'Water', rating: 10 };
		const stabbed = { name: 'On Type Jab', type: 'Plant', rating: 10 };

		const plain = attackResult(attacker, defender, offType).damage;
		const boosted = attackResult(attacker, defender, stabbed).damage;

		expect(boosted).toBeGreaterThan(plain);
	});

	it('treats a typeless move as neutral rather than crashing', () => {
		const result = attackResult(piece('attacker'), piece('defender'), { name: 'Plain Whack', rating: 10 });
		expect(result.typeEffectiveness).toBe(1);
		expect(result.damage).toBeGreaterThan(0);
	});
});
