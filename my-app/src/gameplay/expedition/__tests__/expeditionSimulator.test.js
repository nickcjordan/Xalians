import { runSimulation, runSimulationRaw } from '../devtools/expeditionSimulator.js';

/*
	Coverage for the devtools simulator's report shape (docs/design/reclamation-design.md
	"Tuning" open item: the simulator is how balance gets measured). This does NOT
	re-verify game rules - expeditionRules.test.js and expeditionBot.test.js own that -
	it only asserts the aggregated report object has every section, with sane shapes
	(rates in [0,1], counts that sum correctly), and that --mirror actually gives both
	sides the same roster.

	5 matches is enough to exercise every code path in summarize() without the test suite
	itself taking meaningfully longer.
*/

function isRateOrNull(r) {
	if (r === null) {
		return true;
	}
	return (
		typeof r === 'object'
		&& typeof r.p === 'number' && r.p >= 0 && r.p <= 1
		&& typeof r.n === 'number' && r.n >= 0
		&& typeof r.lo === 'number' && r.lo >= 0 && r.lo <= 1
		&& typeof r.hi === 'number' && r.hi >= 0 && r.hi <= 1
		&& r.lo <= r.p && r.p <= r.hi
	);
}

describe('expeditionSimulator report shape', () => {
	const report = runSimulation({ matches: 5, seed: 'sim-test-seed' });

	test('meta section is present and sane', () => {
		expect(report.meta.matches).toBe(5);
		expect(report.meta.completedMatches).toBeGreaterThanOrEqual(0);
		expect(report.meta.completedMatches).toBeLessThanOrEqual(5);
		expect(report.meta.seed).toBe('sim-test-seed');
		expect(report.meta.mirror).toBe(false);
		expect(report.meta.random).toBeNull();
	});

	test('every top-level section is present', () => {
		['seatFairness', 'matchShape', 'siteEconomy', 'rosterEconomy', 'combat', 'creatureBalance', 'worlds', 'errors'].forEach((key) => {
			expect(report).toHaveProperty(key);
		});
	});

	test('section 1 (seat fairness): rates are valid rate objects or null', () => {
		const sf = report.seatFairness;
		expect(isRateOrNull(sf.starterWinRate)).toBe(true);
		Object.values(sf.perWorldStarterSiteWinRate).forEach((r) => expect(isRateOrNull(r)).toBe(true));
		expect(isRateOrNull(sf.finalPasserWinRate)).toBe(true);
		expect(typeof sf.relocationsPerMatch).toBe('number');
		expect(sf.relocationsPerMatch).toBeGreaterThanOrEqual(0);
		expect(isRateOrNull(sf.starterWinRateWithRelocation)).toBe(true);
		expect(isRateOrNull(sf.starterWinRateWithoutRelocation)).toBe(true);
		expect(isRateOrNull(sf.relocationFlipRate)).toBe(true);
	});

	test('section 2 (match shape): worlds-played counts sum to completed matches', () => {
		const ms = report.matchShape;
		const total = Object.values(ms.worldsPlayedCounts).reduce((a, b) => a + b, 0);
		expect(total).toBe(report.meta.completedMatches);
		const endReasonTotal = Object.values(ms.endReasonCounts).reduce((a, b) => a + b, 0);
		expect(endReasonTotal).toBe(report.meta.completedMatches);
		const scoreTotal = Object.values(ms.finalScoreCounts).reduce((a, b) => a + b, 0);
		expect(scoreTotal).toBe(report.meta.completedMatches);
		expect(isRateOrNull(ms.comebackWinRate)).toBe(true);
		expect(typeof ms.decisionsPerMatch).toBe('number');
	});

	test('section 3 (site economy): rates valid, quartiles ordered', () => {
		const se = report.siteEconomy;
		expect(isRateOrNull(se.tieToCourtRate)).toBe(true);
		expect(isRateOrNull(se.uncontestedRate)).toBe(true);
		expect(isRateOrNull(se.emptyRate)).toBe(true);
		expect(se.contestedMarginQ1).toBeLessThanOrEqual(se.contestedMarginMedian + 1e-9);
		expect(se.contestedMarginMedian).toBeLessThanOrEqual(se.contestedMarginQ3 + 1e-9);
		expect(isRateOrNull(se.resolveMatteredRate)).toBe(true);
		[0, 1, 2].forEach((w) => {
			expect(se.perWorldPosition[w]).toBeTruthy();
			expect(isRateOrNull(se.perWorldPosition[w].tieRate)).toBe(true);
			expect(isRateOrNull(se.perWorldPosition[w].contestedRate)).toBe(true);
		});
	});

	test('section 4 (roster economy): non-negative counts', () => {
		const re = report.rosterEconomy;
		[0, 1, 2].forEach((w) => {
			expect(re.sentPerWorldPositionPerSide[w].A).toBeGreaterThanOrEqual(0);
			expect(re.sentPerWorldPositionPerSide[w].B).toBeGreaterThanOrEqual(0);
		});
		expect(re.unsentAtMatchEnd.A).toBeGreaterThanOrEqual(0);
		expect(re.unsentAtMatchEnd.B).toBeGreaterThanOrEqual(0);
	});

	test('section 5 (combat): outcome histogram counts are non-negative, per-act rates valid', () => {
		const c = report.combat;
		Object.values(c.outcomeHistogram).forEach((count) => expect(count).toBeGreaterThanOrEqual(0));
		Object.values(c.perAct).forEach((a) => {
			expect(a.timesOrdered).toBeGreaterThanOrEqual(0);
			expect(a.averageMagnitude).toBeGreaterThanOrEqual(0);
			expect(isRateOrNull(a.staggerRate)).toBe(true);
			expect(isRateOrNull(a.routRate)).toBe(true);
			expect(isRateOrNull(a.noTargetRate)).toBe(true);
		});
		['none', 'strained', 'severe'].forEach((level) => {
			expect(c.strainIncidence[level]).toBeTruthy();
			expect(isRateOrNull(c.strainIncidence[level].sendShare)).toBe(true);
			expect(isRateOrNull(c.strainIncidence[level].siteWinRate)).toBe(true);
		});
		expect(isRateOrNull(c.homeGround.incidenceRate)).toBe(true);
		expect(isRateOrNull(c.homeGround.siteWinRate)).toBe(true);
		expect(isRateOrNull(c.hiddenSendStats.rate)).toBe(true);
	});

	test('section 6 (creature balance): per-archetype/element/trait rates valid, top/bottom 5 well-formed', () => {
		const cb = report.creatureBalance;
		Object.values(cb.byArchetype).forEach((a) => {
			expect(a.sent).toBeGreaterThanOrEqual(0);
			expect(isRateOrNull(a.siteWinRate)).toBe(true);
		});
		Object.values(cb.byElement).forEach((e) => {
			expect(e.sent).toBeGreaterThanOrEqual(0);
			expect(isRateOrNull(e.siteWinRate)).toBe(true);
			expect(isRateOrNull(e.strainedShare)).toBe(true);
		});
		Object.values(cb.byTrait).forEach((t) => {
			expect(t.present).toBeGreaterThanOrEqual(0);
			expect(isRateOrNull(t.siteWinRate)).toBe(true);
		});
		[...cb.top5ByWinRate, ...cb.bottom5ByWinRate].forEach((entry) => {
			expect(entry.sent).toBeGreaterThanOrEqual(10);
			expect(entry.siteWinRate).toBeGreaterThanOrEqual(0);
			expect(entry.siteWinRate).toBeLessThanOrEqual(1);
			expect(entry.holdRank).toBeGreaterThanOrEqual(1);
			expect(entry.holdRank).toBeLessThanOrEqual(entry.poolSize);
		});
		expect(isRateOrNull(cb.higherMeanHoldWinRate)).toBe(true);
		expect(isRateOrNull(cb.higherMeanInitiativeWinRate)).toBe(true);
		// every one of the 14 canon elements appears as a row, even if empty ("-" in the
		// printed report, null in the object) for elements absent from this pool/seed
		const elementRows = Object.keys(cb.elementWorldStrainTable);
		expect(elementRows.length).toBe(14);
		elementRows.forEach((el) => {
			Object.values(cb.elementWorldStrainTable[el]).forEach((v) => {
				expect(v === null || (typeof v === 'number' && v >= 0 && v <= 1)).toBe(true);
			});
		});
	});

	test('section 7 (worlds): per-planet rates valid', () => {
		Object.values(report.worlds).forEach((w) => {
			expect(w.timesDrawn).toBeGreaterThanOrEqual(0);
			expect(isRateOrNull(w.tieRate)).toBe(true);
			expect(typeof w.homeElementPresent).toBe('boolean');
			expect(isRateOrNull(w.homeElementSiteWinRate)).toBe(true);
		});
	});

	test('section 8 (errors): an array', () => {
		expect(Array.isArray(report.errors)).toBe(true);
	});
});

describe('--mirror gives identical roster ids on both sides', () => {
	test('every match has A and B rosters with the same record ids', () => {
		const matchResults = runSimulationRaw({ matches: 5, seed: 'mirror-test-seed', mirror: true });
		matchResults.forEach((m) => {
			expect(m.error).toBeNull();
			expect(m.rosterAIds).toEqual(m.rosterBIds);
		});
	});

	test('without --mirror, rosters are not (reliably) identical', () => {
		const matchResults = runSimulationRaw({ matches: 5, seed: 'no-mirror-test-seed', mirror: false });
		const anyDifferent = matchResults.some((m) => JSON.stringify(m.rosterAIds) !== JSON.stringify(m.rosterBIds));
		expect(anyDifferent).toBe(true);
	});
});

describe('--random=A|B plays only legal actions', () => {
	test('a match with --random=B completes without errors', () => {
		const report = runSimulation({ matches: 5, seed: 'random-b-seed', random: 'B' });
		expect(report.errors.length).toBe(0);
		expect(report.meta.random).toBe('B');
	});
});
