import { buildDraftPools, rateForDraft, botDraft, validateKeep, poolMeanBlowOf, DRAFT_POOL_SIZE, MAX_PER_SPECIES, AREA_EXPECTED_CREATURES, BOLSTER_EXPECTED_ALLIES } from '../draft.js';
import { roleOf } from '../creatureOnTable.js';
import { ROLE, AREA_DISCOUNT, BOLSTER_FLOOR } from '../expeditionInterpretation.js';
import { RIVALS } from '../expeditionBot.js';
import { ROSTER_SIZE, WORLDS_PER_MATCH } from '../expeditionInterpretation.js';

/*
	Coverage for the pre-match draft (docs/design/reclamation-play-enhancements.md
	"Pass 3, the draft"): disjoint deterministic pools, a nine-world frame draw with no
	repeated planet, a per-world rating for every pool creature, and a bot draft that
	keeps exactly twelve distinct ids for every rival style.
*/

describe('buildDraftPools', () => {
	it('deals two disjoint pools of DRAFT_POOL_SIZE', () => {
		const { poolA, poolB } = buildDraftPools(1);
		expect(poolA.length).toBe(DRAFT_POOL_SIZE);
		expect(poolB.length).toBe(DRAFT_POOL_SIZE);
		const idsA = new Set(poolA.map((r) => r.id));
		const idsB = new Set(poolB.map((r) => r.id));
		expect(idsA.size).toBe(DRAFT_POOL_SIZE);
		expect(idsB.size).toBe(DRAFT_POOL_SIZE);
		idsA.forEach((id) => expect(idsB.has(id)).toBe(false));
	});

	it('is deterministic under the seed', () => {
		const first = buildDraftPools(42);
		const second = buildDraftPools(42);
		expect(first.poolA.map((r) => r.id)).toEqual(second.poolA.map((r) => r.id));
		expect(first.poolB.map((r) => r.id)).toEqual(second.poolB.map((r) => r.id));
		expect(first.frames.map((f) => f.sites.map((s) => s.id))).toEqual(second.frames.map((f) => f.sites.map((s) => s.id)));
	});

	it('differs under a different seed', () => {
		const a = buildDraftPools(7);
		const b = buildDraftPools(8);
		expect(a.poolA.map((r) => r.id)).not.toEqual(b.poolA.map((r) => r.id));
	});

	it('draws nine worlds with no planet repeated', () => {
		const { frames } = buildDraftPools(11);
		const planets = frames.flatMap((f) => f.sites.map((s) => s.world.planet));
		expect(planets.length).toBe(WORLDS_PER_MATCH);
		expect(new Set(planets).size).toBe(WORLDS_PER_MATCH);
	});

	it('shows the first frame with three worlds', () => {
		const { frames } = buildDraftPools(3);
		expect(frames[0].sites.length).toBe(3);
		expect(frames[0].index).toBe(0);
	});
});

describe('rateForDraft', () => {
	it('returns nine byWorld rows with hold, planet, element, isHome and strainLevel', () => {
		const { poolA, frames } = buildDraftPools(5);
		const rating = rateForDraft(poolA[0], frames);
		expect(rating.byWorld.length).toBe(WORLDS_PER_MATCH);
		rating.byWorld.forEach((row) => {
			expect(typeof row.planet).toBe('string');
			expect(typeof row.element).toBe('string');
			expect(typeof row.hold).toBe('number');
			expect(typeof row.isHome).toBe('boolean');
			expect(['none', 'strained', 'severe']).toContain(row.strainLevel);
		});
		expect(rating.best).toBeGreaterThanOrEqual(0);
		expect(rating.mean).toBeGreaterThanOrEqual(0);
		expect(rating.homes).toBeGreaterThanOrEqual(0);
	});

	it('best is the maximum of byWorld holds', () => {
		const { poolB, frames } = buildDraftPools(9);
		const rating = rateForDraft(poolB[3], frames);
		const maxHold = rating.byWorld.reduce((m, w) => Math.max(m, w.hold), 0);
		expect(rating.best).toBeCloseTo(maxHold);
	});
});

describe('botDraft', () => {
	RIVALS.forEach((rival) => {
		it(`returns ${ROSTER_SIZE} distinct ids from the pool for ${rival.id}`, () => {
			const { poolA, frames } = buildDraftPools(21);
			const kept = botDraft(poolA, frames, rival);
			expect(kept.length).toBe(ROSTER_SIZE);
			expect(new Set(kept).size).toBe(ROSTER_SIZE);
			const poolIds = new Set(poolA.map((r) => r.id));
			kept.forEach((id) => expect(poolIds.has(id)).toBe(true));
		});
	});

	it('falls back to plain mean for an unrecognized rival id', () => {
		const { poolA, frames } = buildDraftPools(21);
		const kept = botDraft(poolA, frames, { id: 'unknown-handler' });
		expect(kept.length).toBe(ROSTER_SIZE);
		expect(new Set(kept).size).toBe(ROSTER_SIZE);
	});

	it('is deterministic under the same pool, frames and rival', () => {
		const { poolA, frames } = buildDraftPools(13);
		const proctor = RIVALS.find((r) => r.id === 'proctor');
		const first = botDraft(poolA, frames, proctor);
		const second = botDraft(poolA, frames, proctor);
		expect(first).toEqual(second);
	});
});

describe('validateKeep', () => {
	it('is true for exactly twelve distinct ids from the pool', () => {
		const { poolA } = buildDraftPools(2);
		const keepIds = poolA.slice(0, ROSTER_SIZE).map((r) => r.id);
		expect(validateKeep(poolA, keepIds)).toBe(true);
	});

	it('is false with too few or too many ids', () => {
		const { poolA } = buildDraftPools(2);
		expect(validateKeep(poolA, poolA.slice(0, ROSTER_SIZE - 1).map((r) => r.id))).toBe(false);
		expect(validateKeep(poolA, poolA.slice(0, ROSTER_SIZE + 1).map((r) => r.id))).toBe(false);
	});

	it('is false with a duplicate id', () => {
		const { poolA } = buildDraftPools(2);
		const ids = poolA.slice(0, ROSTER_SIZE - 1).map((r) => r.id);
		ids.push(ids[0]);
		expect(validateKeep(poolA, ids)).toBe(false);
	});

	it('is false with an id not in the pool', () => {
		const { poolA } = buildDraftPools(2);
		const ids = poolA.slice(0, ROSTER_SIZE - 1).map((r) => r.id);
		ids.push('not-in-the-pool');
		expect(validateKeep(poolA, ids)).toBe(false);
	});
});

describe('the rating is hold plus role value', () => {
	it('rates every creature as mean hold plus what its role is worth', () => {
		const { poolA, frames } = buildDraftPools('rating-seed');
		const poolMeanBlow = poolMeanBlowOf(poolA, frames, null);
		poolA.forEach((record) => {
			const r = rateForDraft(record, frames, { poolMeanBlow });
			expect(r.role).toBe(roleOf(record, null));
			expect(r.roleValue).toBeGreaterThanOrEqual(0);
			expect(r.rating).toBeCloseTo(r.mean + r.roleValue, 5);
		});
	});

	it('prices a strike at its mean blow and an area at the discounted blow times the expected count', () => {
		const { poolA, frames } = buildDraftPools('rating-seed');
		const meanBlowOf = (r) => r.byWorld.reduce((sum, w) => sum + w.blowMagnitude, 0) / r.byWorld.length;
		const strike = poolA.find((x) => roleOf(x, null) === ROLE.STRIKE);
		const area = poolA.find((x) => roleOf(x, null) === ROLE.AREA);
		if (strike) {
			const r = rateForDraft(strike, frames);
			expect(r.roleValue).toBeCloseTo(meanBlowOf(r), 5);
		}
		if (area) {
			const r = rateForDraft(area, frames);
			expect(r.roleValue).toBeCloseTo(meanBlowOf(r) * AREA_DISCOUNT * AREA_EXPECTED_CREATURES, 5);
		}
	});

	it('prices a bolster from its own grade lift and a shield from the pool mean blow', () => {
		const { poolA, frames } = buildDraftPools('rating-seed');
		const poolMeanBlow = poolMeanBlowOf(poolA, frames, null);
		expect(poolMeanBlow).toBeGreaterThan(0);
		const bolster = poolA.find((x) => roleOf(x, null) === ROLE.BOLSTER);
		const shield = poolA.find((x) => roleOf(x, null) === ROLE.SHIELD);
		if (bolster) {
			const r = rateForDraft(bolster, frames);
			const meanLift = r.byWorld.reduce((sum, w) => sum + w.bolsterLift, 0) / r.byWorld.length;
			expect(r.roleValue).toBeCloseTo(meanLift * BOLSTER_EXPECTED_ALLIES + BOLSTER_FLOOR, 5);
		}
		if (shield) {
			// the shipped shieldCap is 'half', so a cancel nets half a typical blow
			expect(rateForDraft(shield, frames, { poolMeanBlow }).roleValue).toBeCloseTo(poolMeanBlow / 2, 5);
			expect(rateForDraft(shield, frames, { poolMeanBlow, rules: { shieldCap: 'none' } }).roleValue).toBeCloseTo(poolMeanBlow, 5);
		}
	});
});

describe('the draft spread rule', () => {
	it('never keeps more than MAX_PER_SPECIES of one species', () => {
		for (let i = 0; i < 20; i++) {
			const { poolA, frames } = buildDraftPools(`spread-${i}`);
			const kept = botDraft(poolA, frames, null);
			const counts = {};
			kept.forEach((id) => {
				const species = poolA.find((r) => r.id === id).species;
				counts[species] = (counts[species] || 0) + 1;
			});
			Object.values(counts).forEach((n) => expect(n).toBeLessThanOrEqual(MAX_PER_SPECIES));
		}
	});

	it('keeps at least one of every role the pool can offer', () => {
		for (let i = 0; i < 20; i++) {
			const { poolA, frames } = buildDraftPools(`spread-role-${i}`);
			const poolRoles = new Set(poolA.map((r) => roleOf(r, null)));
			const kept = botDraft(poolA, frames, null);
			const keptRoles = new Set(kept.map((id) => roleOf(poolA.find((r) => r.id === id), null)));
			poolRoles.forEach((role) => expect(keptRoles.has(role)).toBe(true));
		}
	});
});
