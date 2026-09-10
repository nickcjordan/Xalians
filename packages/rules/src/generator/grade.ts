/*
	Rarity grade (Decision 11, docs/design/xalian-creature-system-hardening.md WP4): an
	information-theoretic score over one generated record, turned into a percentile
	against a calibration batch and a purely cosmetic tier label.

	This is a lens over a record, never a field on it: gradeRecord never writes to the
	record it is given, and nothing in the pipeline (generate.ts) should ever call it. A
	grade is only ever computed on demand, by whatever caller wants to display one.

	gradeRecord(record, template, calibration) -> { score, percentile, tier, components }
	  record:      a generated record, shaped by generate.ts's generateXalian()
	  template:    the species template the record was generated from (one entry of
	               speciesRecords.json's records array)
	  calibration: { quantiles: [[percentile, score], ...] }, one pair per whole
	               percentile 0..100, sorted ascending by score (gradeCalibration.json's
	               shape). Pass null/undefined to get score and components with no
	               percentile or tier — used by the simulator while it is still building
	               the calibration table, before one exists to grade against.

	gradeWithBundledCalibration(record, template) grades against the checked-in
	@xalians/content gradeCalibration.json, for callers that just want a percentile
	without carrying the calibration table themselves.

	Every number in GRADE_WEIGHTS is a tuned lever (CLAUDE.md, "levers, not stone"), not a
	fixed law. Moving one changes what every score means against an older calibration
	table, so a change here should be paired with a recalibration
	(devtools/simulateGenerator.ts --calibrate) before the new numbers mean anything.
*/
import { ATTRIBUTE_KEYS, FINISH_ODDS } from './constants.ts';
// the checked-in calibration table is validated JSON, not a typed structure this package
// owns; cast at the boundary (a zod schema for it lives in packages/content/src/schema,
// branch content/schemas, landing separately)
import bundledCalibrationJson from '@xalians/content/gradeCalibration.json';
import type { Band, SpeciesTemplate, XalianRecord } from './types.ts';

export interface GradeCalibration {
	generatorVersion?: string;
	seed?: string;
	n?: number;
	quantiles: Array<[number, number]>;
}

export interface GradeComponents {
	traits: number;
	affinity: number;
	finish: number;
	attributes: number;
	size: number;
	abilities: number;
}

export interface ScoreResult {
	score: number;
	components: GradeComponents;
}

export interface GradeResult extends ScoreResult {
	percentile: number | null;
	tier: string | null;
}

const bundledCalibration = bundledCalibrationJson as unknown as GradeCalibration;

export const GRADE_WEIGHTS = {
	// traits: sum over the template's trait pool of -log2(p) for a landed entry below
	// 100 percent, -log2(1 - p) for a missed one; entries at 100 contribute 0.
	traits: 1,
	// affinity: 0 with no secondary, else affinityBase + affinityStrengthScale * (strength / 100).
	affinityBase: 2,
	affinityStrengthScale: 2,
	// finish: finishScale * log2(1 / odds) for the record's finish, read off FINISH_ODDS.
	finishScale: 1,
	// attributes: attributesMeanScale * (mean band position - 0.5), floored at 0, plus
	// attributesTopTenthBonus per attribute at or above attributesTopTenthThreshold.
	attributesMeanScale: 4,
	attributesTopTenthBonus: 1,
	attributesTopTenthThreshold: 0.9,
	// size: sizeOuterBonus once if height or weight sits within sizeOuterMargin of either
	// edge of its band (the outer 5 percent on either side by default).
	sizeOuterBonus: 1,
	sizeOuterMargin: 0.05,
	// abilities: abilitiesIntensityScale * (mean rolled intensity / 100), plus
	// abilitiesHighBonus per rolled ability at or above abilitiesHighThreshold.
	abilitiesIntensityScale: 0.5,
	abilitiesHighBonus: 1,
	abilitiesHighThreshold: 90,
};

// display-only: percentile -> tier label. Never stored, never used to gate anything;
// purely a friendlier way to show a percentile to a player.
const TIER_TABLE: Array<{ max: number; tier: string }> = [
	{ max: 50, tier: 'standard' },
	{ max: 90, tier: 'select' },
	{ max: 99, tier: 'prime' },
	{ max: 100, tier: 'apex' },
];

function clamp(n: number, lo: number, hi: number): number {
	return Math.max(lo, Math.min(hi, n));
}

function band(value: unknown, fallback: Band): Band {
	if (Array.isArray(value) && value.length === 2 && typeof value[0] === 'number' && typeof value[1] === 'number') {
		return [Math.min(value[0], value[1]), Math.max(value[0], value[1])];
	}
	return fallback;
}

// where a value sits in its band, 0 at the bottom and 1 at the top
function bandPosition(value: number, [lo, hi]: Band): number {
	if (hi <= lo) {
		return 0.5;
	}
	return clamp((value - lo) / (hi - lo), 0, 1);
}

function traitsScore(record: XalianRecord, template: SpeciesTemplate): number {
	const pool = (template.traits && template.traits.pool) || {};
	const traits = record.traits || [];
	let score = 0;
	Object.keys(pool).forEach((key) => {
		const percent = pool[key];
		if (percent >= 100) {
			return;
		}
		const p = percent / 100;
		score += traits.includes(key) ? -Math.log2(p) : -Math.log2(1 - p);
	});
	return score;
}

function affinityScore(record: XalianRecord): number {
	const affinities = (record.element && record.element.affinities) || {};
	const primary = record.element && record.element.primary;
	const secondaryKey = Object.keys(affinities).find((k) => k !== primary);
	if (!secondaryKey) {
		return 0;
	}
	const strength = affinities[secondaryKey as keyof typeof affinities] || 0;
	return GRADE_WEIGHTS.affinityBase + GRADE_WEIGHTS.affinityStrengthScale * (strength / 100);
}

function finishScore(record: XalianRecord): number {
	const finish = record.appearance && record.appearance.finish;
	const row = FINISH_ODDS.find(([name]) => name === finish);
	if (!row) {
		return 0;
	}
	const [, odds] = row;
	return GRADE_WEIGHTS.finishScale * Math.log2(1 / odds);
}

function attributesScore(record: XalianRecord, template: SpeciesTemplate): number {
	const positions = ATTRIBUTE_KEYS.map((key) => {
		const b = band(template.attributes && template.attributes[key], [30, 70]);
		return bandPosition(record.attributes[key], b);
	});
	const mean = positions.reduce((a, b) => a + b, 0) / positions.length;
	const meanPart = Math.max(0, GRADE_WEIGHTS.attributesMeanScale * (mean - 0.5));
	const topTenth = positions.filter((p) => p >= GRADE_WEIGHTS.attributesTopTenthThreshold).length;
	return meanPart + topTenth * GRADE_WEIGHTS.attributesTopTenthBonus;
}

function sizeScore(record: XalianRecord, template: SpeciesTemplate): number {
	const size = (template.physiology && template.physiology.size) || ({} as SpeciesTemplate['physiology']['size']);
	const heightBand = band(size.heightCm, [100, 200]);
	const weightBand = band(size.weightKg, [50, 150]);
	const heightP = bandPosition(record.physiology.heightCm, heightBand);
	const weightP = bandPosition(record.physiology.weightKg, weightBand);
	const margin = GRADE_WEIGHTS.sizeOuterMargin;
	const isOuter = (p: number) => p <= margin || p >= 1 - margin;
	return isOuter(heightP) || isOuter(weightP) ? GRADE_WEIGHTS.sizeOuterBonus : 0;
}

function abilitiesScore(record: XalianRecord): number {
	const rolled = (record.abilities || []).filter((a) => !a.signature);
	if (rolled.length === 0) {
		return 0;
	}
	const meanIntensity = rolled.reduce((sum, a) => sum + a.intensity, 0) / rolled.length;
	const highCount = rolled.filter((a) => a.intensity >= GRADE_WEIGHTS.abilitiesHighThreshold).length;
	return GRADE_WEIGHTS.abilitiesIntensityScale * (meanIntensity / 100) + highCount * GRADE_WEIGHTS.abilitiesHighBonus;
}

// the score and its components, with no percentile lookup — used both by gradeRecord and
// by the simulator while it builds the calibration table those percentiles come from
export function scoreRecord(record: XalianRecord, template: SpeciesTemplate): ScoreResult {
	const components: GradeComponents = {
		traits: GRADE_WEIGHTS.traits * traitsScore(record, template),
		affinity: affinityScore(record),
		finish: finishScore(record),
		attributes: attributesScore(record, template),
		size: sizeScore(record, template),
		abilities: abilitiesScore(record),
	};
	const score = Object.values(components).reduce((a, b) => a + b, 0);
	return { score, components };
}

function percentileOf(score: number, calibration: GradeCalibration | null | undefined): number | null {
	const quantiles = calibration && Array.isArray(calibration.quantiles) ? calibration.quantiles : null;
	if (!quantiles || quantiles.length === 0) {
		return null;
	}
	const sorted = quantiles.slice().sort((a, b) => a[1] - b[1]);
	if (score <= sorted[0][1]) {
		return sorted[0][0];
	}
	const last = sorted[sorted.length - 1];
	if (score >= last[1]) {
		return last[0];
	}
	for (let i = 1; i < sorted.length; i++) {
		const [pHi, sHi] = sorted[i];
		const [pLo, sLo] = sorted[i - 1];
		if (score <= sHi) {
			if (sHi === sLo) {
				return pHi;
			}
			const t = (score - sLo) / (sHi - sLo);
			return pLo + t * (pHi - pLo);
		}
	}
	return last[0];
}

// display-only label from a percentile. Never stored, never used to gate anything.
function tierOf(percentile: number | null): string | null {
	if (percentile == null) {
		return null;
	}
	const row = TIER_TABLE.find((r) => percentile <= r.max);
	return row ? row.tier : 'apex';
}

export function gradeRecord(record: XalianRecord, template: SpeciesTemplate, calibration: GradeCalibration | null | undefined): GradeResult {
	const { score, components } = scoreRecord(record, template);
	const percentile = percentileOf(score, calibration);
	const tier = tierOf(percentile);
	return { score, percentile, tier, components };
}

export function gradeWithBundledCalibration(record: XalianRecord, template: SpeciesTemplate): GradeResult {
	return gradeRecord(record, template, bundledCalibration);
}
