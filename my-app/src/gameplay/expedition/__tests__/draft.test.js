import { buildDraftPools, rateForDraft, botDraft, validateKeep, poolMeanBlowOf, draftOptionsFromRules, DRAFT_POOL_SIZE, MAX_PER_SPECIES, SWEEP_EXPECTED_CREATURES, BOLSTER_EXPECTED_ALLIES } from '../draft.js';
import { DEFAULT_RULES } from '../expeditionRules.js';
import { roleOf } from '../creatureOnTable.js';
import { ROLE, SWEEP_DISCOUNT, BOLSTER_FLOOR } from '../expeditionInterpretation.js';
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

	it('prices a strike at its mean attack and a sweep at the discounted attack times the expected count', () => {
		const { poolA, frames } = buildDraftPools('rating-seed');
		const meanBlowOf = (r) => r.byWorld.reduce((sum, w) => sum + w.blowMagnitude, 0) / r.byWorld.length;
		const strike = poolA.find((x) => roleOf(x, null) === ROLE.STRIKE);
		const area = poolA.find((x) => roleOf(x, null) === ROLE.SWEEP);
		if (strike) {
			const r = rateForDraft(strike, frames);
			expect(r.roleValue).toBeCloseTo(meanBlowOf(r), 5);
		}
		if (area) {
			const r = rateForDraft(area, frames);
			expect(r.roleValue).toBeCloseTo(meanBlowOf(r) * SWEEP_DISCOUNT * SWEEP_EXPECTED_CREATURES, 5);
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


/*
	PASS 3, the draft's shape (docs/design/reclamation-base-redesign.md assumption 23). Both
	levers are rules keys carried on the match's rules object, so one --rules flag moves the
	draft the same way it moves every other lever.
*/
describe('pass 3: the draft\'s shape', () => {
	it('deals a pool of the requested size, still disjoint and still deterministic', () => {
		const a = buildDraftPools(31, { poolSize: 15 });
		const b = buildDraftPools(31, { poolSize: 15 });
		expect(a.poolA.length).toBe(15);
		expect(a.poolB.length).toBe(15);
		const idsB = new Set(a.poolB.map((r) => r.id));
		a.poolA.forEach((r) => expect(idsB.has(r.id)).toBe(false));
		expect(a.poolA.map((r) => r.id)).toEqual(b.poolA.map((r) => r.id));
	});

	it('the species-distinct deal gives each pool one creature per species', () => {
		const { poolA, poolB } = buildDraftPools(37, { distinctSpecies: true });
		[poolA, poolB].forEach((pool) => {
			expect(pool.length).toBe(DRAFT_POOL_SIZE);
			const species = pool.map((r) => r.species);
			expect(new Set(species).size).toBe(species.length);
		});
		const idsB = new Set(poolB.map((r) => r.id));
		poolA.forEach((r) => expect(idsB.has(r.id)).toBe(false));
	});

	it('a pool larger than the species list repeats species, and the distinct deal falls back to distinct-as-far-as-possible', () => {
		// the generator deals from twenty-nine species, so a pool of thirty-five cannot be
		// species-distinct: the fallback tops the pool up rather than dealing short
		const plain = buildDraftPools(19, { poolSize: 35, distinctSpecies: false }).poolA.map((r) => r.species);
		expect(plain.length).toBe(35);
		expect(new Set(plain).size).toBeLessThan(plain.length);

		const distinct = buildDraftPools(19, { poolSize: 35, distinctSpecies: true }).poolA.map((r) => r.species);
		expect(distinct.length).toBe(35);
		// as many distinct species as the species list can supply, and no more
		expect(new Set(distinct).size).toBeGreaterThan(new Set(plain).size);
	});

	it('a keep from a smaller pool is still exactly ROSTER_SIZE distinct ids', () => {
		const { poolA, frames } = buildDraftPools(41, { poolSize: 15 });
		const keep = botDraft(poolA, frames, RIVALS[0]);
		expect(validateKeep(poolA, keep)).toBe(true);
	});

	it('draftOptionsFromRules reads both levers off a match rules object', () => {
		expect(draftOptionsFromRules(DEFAULT_RULES)).toEqual({
			poolSize: DEFAULT_RULES.draftPoolSize,
			distinctSpecies: DEFAULT_RULES.draftDistinctSpecies,
		});
		expect(draftOptionsFromRules({ draftPoolSize: 15, draftDistinctSpecies: true }))
			.toEqual({ poolSize: 15, distinctSpecies: true });
		// a caller with no rules in hand gets the module defaults, never undefined
		expect(draftOptionsFromRules(null)).toEqual({ poolSize: DRAFT_POOL_SIZE, distinctSpecies: false });
	});
});
