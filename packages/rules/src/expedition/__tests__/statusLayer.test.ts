import { describe, it, expect } from 'vitest';
import { STATUS_CATALOG, Status } from '@xalians/content/creature';
import {
	CONCEPT, STATUS_CONCEPT, conceptOf, DIMINISHED_FACTOR, ATTRITION_TICK, MENDING_TICK,
	roundsFor, applicationFrom, isHeld, powerFactor, tickAmount, advanceStatuses, attritionBite, ATTRITION_BITE,
	cosmeticStatuses, statusDefinition, type StatusApplication,
} from '../statusLayer.ts';

/** the catalog's own key list, so the tests read the source of truth, not a copy */
const STATUS_KEYS = Status.options;

const app = (status: string, over: Partial<StatusApplication> = {}): StatusApplication => ({
	status,
	concept: conceptOf(status)!,
	sourceId: 'source',
	rounds: 1,
	maintained: false,
	removable: [],
	...over,
});

describe('the concept map covers the catalog exactly', () => {
	it('sorts every catalog status into a concept', () => {
		for (const key of STATUS_KEYS) {
			expect(conceptOf(key), `${key} is not sorted into a concept`).not.toBeNull();
		}
	});

	it('invents no status the catalog does not have', () => {
		for (const key of Object.keys(STATUS_CONCEPT)) {
			expect(STATUS_KEYS as readonly string[], `${key} is not a catalog status`).toContain(key);
		}
	});

	/*
		THIS IS THE TEST THAT WOULD HAVE CAUGHT THE DESIGN MISTAKE. Attrition membership is
		not a judgement call: it is exactly the set of statuses STATUS_CATALOG gives a `harm`
		field. An earlier draft of this layer put `chilled` in the attrition bucket by family
		resemblance to burning and frozen, and the catalog says chilled has no harm at all.
		Sorting by feel is how that happens, so the assertion reads the data instead.
	*/
	it('puts exactly the harm-bearing statuses in attrition', () => {
		const harmful = STATUS_KEYS.filter((key) => 'harm' in STATUS_CATALOG[key]);
		const attrition = Object.entries(STATUS_CONCEPT)
			.filter(([, concept]) => concept === CONCEPT.ATTRITION)
			.map(([key]) => key)
			.sort();
		expect(attrition).toEqual([...harmful].sort());
	});

	it('keeps slowed out of held, because movement remains possible', () => {
		// catalog.ts: 'Movement remains possible but is impaired.' That is a reduction.
		expect(conceptOf('slowed')).toBe(CONCEPT.DIMINISHED);
		expect(STATUS_CATALOG.slowed.definition).toMatch(/remains possible/i);
	});

	it('holds only the four statuses that describe prevented movement', () => {
		const held = Object.entries(STATUS_CONCEPT)
			.filter(([, concept]) => concept === CONCEPT.HELD)
			.map(([key]) => key)
			.sort();
		expect(held).toEqual(['buried', 'frozen', 'pinned', 'restrained']);
	});
});

describe('rounds come from the record', () => {
	it('treats a source-bound sustained status as maintained, not timed', () => {
		expect(roundsFor({ persistence: 'sustained', bound: 'source' })).toBeNull();
	});

	it('gives an area-bound sustained status a fixed life', () => {
		expect(roundsFor({ persistence: 'sustained', bound: 'area' })).toBe(2);
	});

	it('reads lingering duration', () => {
		expect(roundsFor({ persistence: 'lingering', duration: 'brief' })).toBe(1);
		expect(roundsFor({ persistence: 'lingering', duration: 'prolonged' })).toBe(2);
	});

	it('persists nothing for a resolved effect', () => {
		expect(roundsFor({ persistence: 'resolved' })).toBe(0);
		expect(applicationFrom({ status: 'burning', persistence: 'resolved' }, 'a')).toBeNull();
	});

	it('builds a maintained application from a source-bound restraint', () => {
		const built = applicationFrom(
			{ status: 'restrained', persistence: 'sustained', bound: 'source', removable: ['freeing'] },
			'holder',
		);
		expect(built).toMatchObject({
			status: 'restrained', concept: CONCEPT.HELD, sourceId: 'holder',
			rounds: null, maintained: true, removable: ['freeing'],
		});
	});

	it('refuses a status it cannot sort', () => {
		expect(applicationFrom({ status: 'invented', persistence: 'lingering', duration: 'brief' }, 'a')).toBeNull();
	});
});

describe('what statuses do in the Clash', () => {
	it('holds a creature out of the exchange', () => {
		expect(isHeld([app('frozen')])).toBe(true);
		expect(isHeld([app('blinded')])).toBe(false);
		expect(isHeld([])).toBe(false);
	});

	it('halves the power of a diminished creature', () => {
		expect(powerFactor([app('blinded')])).toBe(DIMINISHED_FACTOR);
		expect(powerFactor([])).toBe(1);
	});

	/*
		Non-stacking is load bearing. If diminishment compounded, three cheap conditions would
		remove a creature by arithmetic, and removal is supposed to cost somebody an act.
	*/
	it('does not stack diminishment', () => {
		const many = [app('blinded'), app('deafened'), app('stunned'), app('entranced')];
		expect(powerFactor(many)).toBe(DIMINISHED_FACTOR);
	});

	it('lets a boon cancel a diminishment but never exceed full power', () => {
		expect(powerFactor([app('blinded'), app('focused')])).toBe(1);
		expect(powerFactor([app('stimulated')])).toBe(1);
	});

	it('ticks attrition down and mending up, once each', () => {
		expect(tickAmount([app('burning')])).toBe(-ATTRITION_TICK);
		expect(tickAmount([app('burning'), app('corroding'), app('poisoned')])).toBe(-ATTRITION_TICK);
		expect(tickAmount([app('mending')])).toBe(MENDING_TICK);
		expect(tickAmount([app('burning'), app('mending')])).toBe(MENDING_TICK - ATTRITION_TICK);
		expect(tickAmount([app('blinded')])).toBe(0);
	});
});

describe('a harmful status makes the blow that carries it hurt more', () => {
	const effect = (status: string, recipient = 'target') => ({
		status, concept: conceptOf(status)!, recipient,
	});

	it('bites for a blow that leaves a harmful status', () => {
		expect(attritionBite([effect('corroding')])).toBe(ATTRITION_BITE);
	});

	it('does not bite for a blow that leaves no harmful status', () => {
		expect(attritionBite([effect('blinded')])).toBe(0);
		expect(attritionBite([effect('frozen')])).toBe(0);
		expect(attritionBite([])).toBe(0);
	});

	/*
		ONE BITE, NOT ONE PER STATUS. Same reasoning as non-stacking diminishment: an
		accumulation of conditions must not become a removal mechanic by arithmetic.
	*/
	it('does not stack across several harmful statuses', () => {
		expect(attritionBite([effect('burning'), effect('corroding'), effect('poisoned')])).toBe(ATTRITION_BITE);
	});

	it('ignores a harmful status an act puts on its own performer', () => {
		expect(attritionBite([effect('burning', 'self')])).toBe(0);
	});

	/*
		The balance constraint Nick set ("make sure attacks with statuses don't get too OP"),
		as an assertion rather than a memory. Measured at 400 matches on three seeds, the
		three species carrying such an act sit BELOW the field average even at a 0.40 bite,
		so the shipped size has real headroom. This pins the size so raising it is a
		deliberate act with a re-measurement attached, not a quiet edit.
	*/
	it('keeps the bite at the measured size', () => {
		expect(ATTRITION_BITE).toBe(0.25);
	});
});

describe('statuses age and expire', () => {
	const live = () => true;

	it('expires a brief application after one round', () => {
		expect(advanceStatuses([app('blinded', { rounds: 1 })], live)).toEqual([]);
	});

	it('carries a prolonged application into the next round', () => {
		const next = advanceStatuses([app('blinded', { rounds: 2 })], live);
		expect(next).toHaveLength(1);
		expect(next[0].rounds).toBe(1);
	});

	it('keeps a maintained hold while its source stands', () => {
		const held = [app('restrained', { rounds: null, maintained: true, sourceId: 'holder' })];
		expect(advanceStatuses(held, (id) => id === 'holder')).toHaveLength(1);
	});

	/*
		The reason a maintained hold is worth building rather than faking with a long duration:
		removing the holder frees the held. That is a real tactical decision at the table.
	*/
	it('frees the held creature when its holder goes down', () => {
		const held = [app('restrained', { rounds: null, maintained: true, sourceId: 'holder' })];
		expect(advanceStatuses(held, () => false)).toEqual([]);
	});
});

describe('presentation', () => {
	it('reports the cosmetic statuses and nothing else', () => {
		const mixed = [app('concealed'), app('phased'), app('burning'), app('frozen')];
		expect(cosmeticStatuses(mixed).sort()).toEqual(['concealed', 'phased']);
	});

	it('shows the catalog definition rather than words of its own', () => {
		expect(statusDefinition('burning')).toBe(STATUS_CATALOG.burning.definition);
		expect(statusDefinition('invented')).toBeNull();
	});
});
