/*
	Tests for the decision-quality validation devtool.

	These do not assert numbers - the whole point of the tool is that its numbers move
	when the game moves. They assert SHAPE (every section returns the fields the report
	renders) and DETERMINISM (the same seed gives byte-identical output twice), which are
	the two properties a designer relies on when diffing two runs. Batch sizes are tiny on
	purpose: a shape test does not need statistical power, and the ablation section runs
	nine configurations by five rivals, so four matches per cell is already 180 matches.

	Nothing here prints.
*/

import { describe, it, expect } from 'vitest';
import {
	runValidation, sectionRegret, sectionSpread, sectionDecided, sectionAblation, sectionDraft,
	buildSections, toMarkdown, decidedRoundOf, lockedRoundOf, matchShapeOf, rate,
	ALL_SECTIONS, NAIVE_POLICIES, ABLATIONS, parseSweep, sweepRulesOf, runSweep,
	sectionLanes, RECORD_ATTRIBUTES,
} from '../devtools/expeditionValidation.js';
import { buildExpeditionPool } from '../roster.js';
import { RIVALS } from '../expeditionBot.js';

const MATCHES = 4;
const SEED = 3;

// one pool built once and shared by the per-section tests, the same way runValidation
// builds one pool for the whole run
const pool = buildExpeditionPool(SEED, 87);

function isRate(r) {
	return r === null || (typeof r.p === 'number' && typeof r.n === 'number' && typeof r.halfWidth === 'number');
}

describe('rate', () => {
	it('returns null for zero trials and a bounded interval otherwise', () => {
		expect(rate(0, 0)).toBeNull();
		const r = rate(5, 10);
		expect(r.p).toBe(0.5);
		expect(r.lo).toBeGreaterThanOrEqual(0);
		expect(r.hi).toBeLessThanOrEqual(1);
	});
});

describe('decidedRoundOf', () => {
	it('is round 1 when the winner led from the first judge and never lost the lead', () => {
		const score = [{ A: 2, B: 1 }, { A: 4, B: 2 }, { A: 5, B: 4 }];
		expect(decidedRoundOf(score, 'A')).toBe(1);
	});

	it('is round 2 when the winner only took the lead at the second judge', () => {
		const score = [{ A: 1, B: 2 }, { A: 3, B: 2 }, { A: 5, B: 4 }];
		expect(decidedRoundOf(score, 'A')).toBe(2);
	});

	it('is null when the winner only led at the final judge', () => {
		const score = [{ A: 1, B: 2 }, { A: 2, B: 3 }, { A: 5, B: 4 }];
		expect(decidedRoundOf(score, 'A')).toBeNull();
	});

	it('is null when the sites finished level (the match went to the tiebreak)', () => {
		const score = [{ A: 1, B: 2 }, { A: 3, B: 3 }, { A: 4, B: 4 }];
		expect(decidedRoundOf(score, 'A')).toBeNull();
	});
});

describe('lockedRoundOf', () => {
	it('names the first round after which the winner held five worlds', () => {
		expect(lockedRoundOf([{ A: 3, B: 0 }, { A: 6, B: 1 }], 'A')).toBe(2);
	});

	it('is null when nobody ever reached five', () => {
		expect(lockedRoundOf([{ A: 2, B: 1 }, { A: 4, B: 3 }], 'A')).toBeNull();
	});
});

describe('matchShapeOf', () => {
	it('ignores errored matches and reports every shape field', () => {
		const results = [
			{ error: 'boom', winner: null, scoreByRound: [], downs: 0, sends: 0, hiddenSends: 0, returnedSends: 0 },
			{ error: null, winner: 'A', scoreByRound: [{ A: 2, B: 1 }, { A: 4, B: 2 }, { A: 5, B: 4 }], downs: 3, sends: 10, hiddenSends: 2, returnedSends: 1 },
		];
		const shape = matchShapeOf(results);
		expect(shape.n).toBe(1);
		expect(shape.decidedCounts[1]).toBe(1);
		expect(shape.downsPerMatch).toBe(3);
		expect(shape.hiddenSendRate.p).toBeCloseTo(0.2);
	});
});

describe('sectionRegret', () => {
	const result = sectionRegret({ matches: MATCHES, seed: SEED, pool });

	it('returns one row per naive policy with both win rates and a sends column', () => {
		expect(result.rows).toHaveLength(NAIVE_POLICIES.length);
		result.rows.forEach((row) => {
			expect(typeof row.id).toBe('string');
			expect(isRate(row.vsProctor)).toBe(true);
			expect(isRate(row.vsRandom)).toBe(true);
			expect(typeof row.sendsPerMatch).toBe('number');
			expect(typeof row.flag).toBe('string');
		});
	});

	it('carries the proctor baselines and at least one reading', () => {
		expect(isRate(result.baselines.proctorVsProctor)).toBe(true);
		expect(isRate(result.baselines.proctorVsRandom)).toBe(true);
		expect(result.readings.length).toBeGreaterThan(0);
	});

	it('plays every naive policy without an illegal action', () => {
		result.rows.forEach((row) => {
			expect(row.errors).toBe(0);
		});
	});
});

describe('sectionSpread', () => {
	const result = sectionSpread({ matches: MATCHES, seed: SEED, pool });

	it('histograms near-best counts per round and overall', () => {
		[0, 1, 2].forEach((r) => {
			const round = result.byRound[r];
			expect(Object.keys(round.histogram)).toEqual(['1', '2', '3', '4', '5+']);
			expect(isRate(round.dominantShare)).toBe(true);
			expect(isRate(round.passShare)).toBe(true);
			expect(typeof round.meanGap).toBe('number');
		});
		expect(result.overall.n).toBeGreaterThan(0);
	});

	it('never counts more near-best candidates than candidates offered', () => {
		const total = Object.values(result.overall.histogram).reduce((a, b) => a + b, 0);
		expect(total).toBe(result.overall.n);
	});
});

describe('sectionDecided', () => {
	const result = sectionDecided({ matches: MATCHES, seed: SEED, pool });

	it('returns the proctor mirror in full and one row per rival', () => {
		expect(result.proctor.n).toBeGreaterThan(0);
		expect(result.byRival).toHaveLength(RIVALS.length);
		result.byRival.forEach((row) => {
			expect(isRate(row.shape.decidedAfterRound1)).toBe(true);
			expect(isRate(row.shape.comebackRate)).toBe(true);
			expect(typeof row.shape.downsPerMatch).toBe('number');
		});
	});

	it('accounts for every match across the decided buckets', () => {
		const c = result.proctor.decidedCounts;
		expect(c[1] + c[2] + c.end).toBe(result.proctor.n);
	});
});

describe('sectionAblation', () => {
	const result = sectionAblation({ matches: MATCHES, seed: SEED, pool });

	it('returns the baseline first and one row per ablation, each with every rival', () => {
		expect(result.rows).toHaveLength(ABLATIONS.length);
		expect(result.rows[0].id).toBe('baseline');
		result.rows.forEach((row) => {
			RIVALS.forEach((rival) => {
				expect(isRate(row.rivalWinRates[rival.id])).toBe(true);
			});
			expect(Array.isArray(row.moved)).toBe(true);
		});
	});

	it('reports the hidden send rate as zero under the hiddenSends ablation', () => {
		const noHidden = result.rows.find((r) => r.id === 'noHidden');
		expect(noHidden.shape.hiddenSendRate.p).toBe(0);
	});

	it('reports the returned send rate as zero under the lokiLine ablation', () => {
		const noLoki = result.rows.find((r) => r.id === 'noLoki');
		expect(noLoki.shape.returnedSendRate.p).toBe(0);
	});

	it('gives one reading per non-baseline row', () => {
		expect(result.readings).toHaveLength(ABLATIONS.length - 1);
	});
});

describe('sectionDraft', () => {
	const result = sectionDraft({ matches: MATCHES, seed: SEED });

	it('returns species and element rows with keep and keeper win rates', () => {
		expect(result.bySpecies.length).toBeGreaterThan(0);
		expect(result.byElement.length).toBeGreaterThan(0);
		result.bySpecies.forEach((row) => {
			expect(row.kept).toBeLessThanOrEqual(row.dealt);
			expect(isRate(row.keepRate)).toBe(true);
			expect(isRate(row.keeperWinRate)).toBe(true);
			expect(typeof row.meanHold).toBe('number');
		});
	});

	it('returns at most ten rows in each of the top and bottom lists', () => {
		expect(result.topKeep.length).toBeLessThanOrEqual(10);
		expect(result.bottomKeep.length).toBeLessThanOrEqual(10);
	});
});

describe('runValidation', () => {
	it('runs only the sections asked for', () => {
		const report = runValidation({ matches: MATCHES, seed: SEED, only: ['regret'] });
		expect(report.regret).toBeDefined();
		expect(report.spread).toBeUndefined();
		expect(report.ablation).toBeUndefined();
		expect(report.meta.sections).toEqual(['regret']);
	});

	it('runs every section by default', () => {
		const report = runValidation({ matches: 2, seed: SEED });
		ALL_SECTIONS.forEach((id) => {
			expect(report[id]).toBeDefined();
		});
	});

	it('is deterministic: the same seed gives identical markdown twice', () => {
		const a = runValidation({ matches: MATCHES, seed: SEED, only: ['regret', 'spread', 'decided'] });
		const b = runValidation({ matches: MATCHES, seed: SEED, only: ['regret', 'spread', 'decided'] });
		expect(toMarkdown(b)).toBe(toMarkdown(a));
	});

	it('a different seed gives a different report', () => {
		const a = runValidation({ matches: MATCHES, seed: SEED, only: ['regret'] });
		const b = runValidation({ matches: MATCHES, seed: SEED + 1, only: ['regret'] });
		expect(toMarkdown(b)).not.toBe(toMarkdown(a));
	});
});

describe('rendering', () => {
	const report = runValidation({ matches: 2, seed: SEED });

	it('builds one section per section run, in report order', () => {
		const sections = buildSections(report);
		expect(sections.map((s) => s.id)).toEqual(ALL_SECTIONS);
	});

	it('writes markdown tables with a header row and a separator for every table block', () => {
		const md = toMarkdown(report);
		const headerLines = md.split('\n').filter((l) => l.startsWith('| ---'));
		const tableCount = buildSections(report).reduce((n, s) => n + s.blocks.filter((b) => b.type === 'table').length, 0);
		expect(headerLines).toHaveLength(tableCount);
	});

	it('uses no em-dashes anywhere in the markdown', () => {
		expect(toMarkdown(report)).not.toContain(String.fromCharCode(8212));
	});
});

describe('the base redesign additions', () => {
	it('offers the always-presence-first policy the base redesign asks for', () => {
		expect(NAIVE_POLICIES.map((p) => p.id)).toContain('alwaysPresenceFirst');
	});

	it('ablates every rule AND every role', () => {
		const ids = ABLATIONS.map((a) => a.id);
		['baseline', 'noHidden', 'noLoki', 'noSpeed', 'noHiddenFirst', 'noSweep', 'noBolster', 'noShield', 'noHurtAttacksLess', 'noBolsterRecovery', 'noWillful', 'noPresenceScale', 'noInstinctLanes', 'noSwiftMove', 'trailingBonusBack']
			.forEach((id) => expect(ids).toContain(id));
		expect(ABLATIONS.find((a) => a.id === 'noSweep').rules).toEqual({ roles: { sweep: false } });
	});

	it('parses a single-lever sweep and a paired-lever sweep', () => {
		expect(parseSweep('magnitudeScale=0.5,1')).toEqual({ rules: ['magnitudeScale'], values: [[0.5], [1]] });
		const paired = parseSweep('holdFloor:holdCeiling=2.8:17.6,6:14.9');
		expect(paired.rules).toEqual(['holdFloor', 'holdCeiling']);
		expect(sweepRulesOf(paired, paired.values[0])).toEqual({ holdFloor: 2.8, holdCeiling: 17.6 });
		expect(parseSweep('nonsense')).toBeNull();
	});

	it('runs a sweep and returns one row per value, each carrying the gauges', () => {
		const sweep = parseSweep('magnitudeScale=0.5,1.5');
		const report = runSweep({ matches: 2, seed: SEED, only: ['decided'], sweep });
		expect(report.rows.length).toBe(2);
		report.rows.forEach((row) => {
			expect(typeof row.label).toBe('string');
			expect(typeof row.downsPerMatch).toBe('number');
			expect(isRate(row.resolveChangedLeaderRate)).toBe(true);
		});
		// a bigger magnitude scale must move the routs, or the lever is doing nothing
		expect(report.rows[1].downsPerMatch).toBeGreaterThan(report.rows[0].downsPerMatch);
	});
});

/*
	Section 6, the per-attribute lanes (docs/design/reclamation-base-redesign.md assumption
	17). Shape only, like every other section here: the numbers are the thing that is meant
	to move between runs.
*/
describe('sectionLanes', () => {
	const result = sectionLanes({ matches: MATCHES, seed: SEED, pool });

	it('returns one row per record attribute, each with both quartile readings', () => {
		expect(result.rows.map((r) => r.attribute)).toEqual(RECORD_ATTRIBUTES);
		expect(RECORD_ATTRIBUTES.length).toBe(10);
		result.rows.forEach((row) => {
			expect(typeof row.q1).toBe('number');
			expect(typeof row.q3).toBe('number');
			expect(row.q3).toBeGreaterThanOrEqual(row.q1);
			expect(row.topN).toBeGreaterThan(0);
			expect(row.bottomN).toBeGreaterThan(0);
			expect(isRate(row.topWinRate)).toBe(true);
			expect(isRate(row.bottomWinRate)).toBe(true);
			expect(typeof row.gap).toBe('number');
		});
		expect(result.readings.length).toBeGreaterThan(0);
	});

	it('is included in the full run and renders a table into the markdown', () => {
		expect(ALL_SECTIONS).toContain('lanes');
		const report = runValidation({ matches: 2, seed: SEED, only: ['lanes'] });
		expect(report.lanes).toBeTruthy();
		const section = buildSections(report).find((s) => s.id === 'lanes');
		expect(section).toBeTruthy();
		expect(section.blocks.some((b) => b.type === 'table')).toBe(true);
		expect(toMarkdown(report)).toContain('Per-attribute lanes');
	});
});
