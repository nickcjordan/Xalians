import { buildDraftPools, rateForDraft, botDraft, validateKeep, DRAFT_POOL_SIZE } from '../draft.js';
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
