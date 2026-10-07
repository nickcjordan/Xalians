/*
	Rarity grade for v5 creature records (the v5 port of grade.ts, Decision 11 of
	docs/design/xalian-creature-system-hardening.md): an information-theoretic score over
	one generated CreatureRecord, turned into a percentile against a calibration batch and
	a purely cosmetic tier label.

	Same method as the v4 grade minus the components the v5 model retired (traits and
	secondary affinity). What is left is everything the v5 generator actually rolls that
	can be rare:

	  finish      how unlikely the record's finish was, read off CREATURE_FINISH_ODDS
	  attributes  where the attribute rolls landed in the species' bands
	  size        whether the one size roll (it scales mass and every dimension together)
	              landed in the outer edge of the species' size band
	  abilities   where each rolled ability intensity landed in its band

	Capabilities, senses and temperament are also rolled from bands, but they describe
	the body and the character rather than how exceptional this individual is, so they
	stay out of the score, as they were in v4. Adding them is a lever, not a schema change.

	This is a lens over a record, never a field on it: gradeCreature never writes to the
	record it is given and the generator never calls it.

	Ability band positions come from replaying the record's ability draw
	(intensityRolls in prototypeCreature.ts), because an ordinary action's band lives on
	the mechanism it was drawn from, which the record does not name. A roll only counts
	when the replayed intensity equals the stored one, so a record generated under an
	older species catalog grades on the rolls that still reproduce instead of on wrong
	bands.

	Every number in CREATURE_GRADE_WEIGHTS is a tuned lever (CLAUDE.md, "levers, not
	stone"). Moving one changes what every score means against the checked-in calibration,
	so pair a change with a recalibration (npm run simulate:creatures -- --calibrate).
*/
import type { CreatureRecord, Species } from '@xalians/content/creature';
import bundledCalibrationJson from '@xalians/content/creatureGradeCalibration.json';
import { CREATURE_FINISH_ODDS, getSpeciesTemplates, intensityRolls } from './canonicalCreatureRelease.ts';
import type { IntensityRoll } from './prototypeCreature.ts';

export interface CreatureGradeCalibration {
	seed: string;
	n: number;
	quantiles: Array<[number, number]>;
}

export interface CreatureGradeComponents {
	finish: number;
	attributes: number;
	size: number;
	abilities: number;
}

export interface CreatureScore {
	score: number;
	components: CreatureGradeComponents;
}

export interface CreatureGrade extends CreatureScore {
	percentile: number | null;
	tier: string | null;
}

/** The tuned levers. Values carried over from the v4 grade where the component survived. */
export const CREATURE_GRADE_WEIGHTS = {
	// finish: finishScale * log2(1 / odds) for a rare finish; standard scores 0.
	finishScale: 1,
	// attributes: attributesMeanScale * (mean band position - 0.5), floored at 0, plus
	// attributesTopTenthBonus per attribute at or above attributesTopTenthThreshold.
	attributesMeanScale: 4,
	attributesTopTenthBonus: 1,
	attributesTopTenthThreshold: 0.9,
	// size: sizeOuterBonus once if the size roll sits within sizeOuterMargin of either
	// edge of the species' mass band.
	sizeOuterBonus: 1,
	sizeOuterMargin: 0.05,
	// abilities: abilitiesMeanScale * (mean band position - 0.5) over every rolled ability,
	// floored at 0, plus abilitiesHighBonus per ability whose mean roll position is at or
	// above abilitiesHighThreshold. v4 scored raw intensity out of 100; v5 intensities are
	// open-ended ratings, so the band position is the comparable measure.
	abilitiesMeanScale: 2,
	abilitiesHighBonus: 1,
	abilitiesHighThreshold: 0.9,
};

// Display only: percentile to tier label. Never stored, never used to gate anything.
const TIER_TABLE: Array<{ max: number; tier: string }> = [
	{ max: 50, tier: 'standard' },
	{ max: 90, tier: 'select' },
	{ max: 99, tier: 'prime' },
	{ max: 100, tier: 'apex' },
];

const bundledCalibration = bundledCalibrationJson as unknown as CreatureGradeCalibration;

function clamp(n: number, lo: number, hi: number): number {
	return Math.max(lo, Math.min(hi, n));
}

// where a value sits in its band, 0 at the bottom and 1 at the top
function bandPosition(value: number, [lo, hi]: readonly [number, number]): number {
	if (hi <= lo) {
		return 0.5;
	}
	return clamp((value - lo) / (hi - lo), 0, 1);
}

function finishScore(record: CreatureRecord): number {
	const row = CREATURE_FINISH_ODDS.find(([name]) => name === record.appearance.finish);
	return row ? CREATURE_GRADE_WEIGHTS.finishScale * Math.log2(1 / row[1]) : 0;
}

function attributesScore(record: CreatureRecord, species: Species): number {
	const positions = Object.entries(species.attributes).flatMap(([key, band]) => {
		const value = record.attributes[key as keyof typeof record.attributes];
		return typeof value === 'number' ? [bandPosition(value, band)] : [];
	});
	if (positions.length === 0) {
		return 0;
	}
	const mean = positions.reduce((a, b) => a + b, 0) / positions.length;
	const meanPart = Math.max(0, CREATURE_GRADE_WEIGHTS.attributesMeanScale * (mean - 0.5));
	const topTenth = positions.filter((p) => p >= CREATURE_GRADE_WEIGHTS.attributesTopTenthThreshold).length;
	return meanPart + topTenth * CREATURE_GRADE_WEIGHTS.attributesTopTenthBonus;
}

function sizeScore(record: CreatureRecord, species: Species): number {
	const p = bandPosition(record.physiology.massKg, species.physiology.size.massKg);
	const margin = CREATURE_GRADE_WEIGHTS.sizeOuterMargin;
	return p <= margin || p >= 1 - margin ? CREATURE_GRADE_WEIGHTS.sizeOuterBonus : 0;
}

/** The replayed rolls that still match the stored record, grouped by ability. */
function matchingRolls(record: CreatureRecord): IntensityRoll[] {
	return intensityRolls(record.species, record.provenance.seed).filter((roll) => {
		const abilities = roll.kind === 'action' ? record.actions : record.passives;
		const effect = abilities.find((a) => a.key === roll.ability)?.effects.find((e) => e.key === roll.effect);
		return !!effect && 'intensity' in effect && effect.intensity === roll.intensity;
	});
}

function abilitiesScore(record: CreatureRecord): number {
	const byAbility = new Map<string, number[]>();
	matchingRolls(record).forEach((roll) => {
		const key = `${roll.kind}/${roll.ability}`;
		byAbility.set(key, [...(byAbility.get(key) ?? []), roll.position]);
	});
	const perAbility = [...byAbility.values()].map((positions) => positions.reduce((a, b) => a + b, 0) / positions.length);
	if (perAbility.length === 0) {
		return 0;
	}
	const mean = perAbility.reduce((a, b) => a + b, 0) / perAbility.length;
	const meanPart = Math.max(0, CREATURE_GRADE_WEIGHTS.abilitiesMeanScale * (mean - 0.5));
	const high = perAbility.filter((p) => p >= CREATURE_GRADE_WEIGHTS.abilitiesHighThreshold).length;
	return meanPart + high * CREATURE_GRADE_WEIGHTS.abilitiesHighBonus;
}

function speciesOf(record: CreatureRecord): Species {
	const species = getSpeciesTemplates().find((s) => s.key === record.species);
	if (!species) {
		throw new Error(`Unknown creature species: ${record.species}`);
	}
	return species;
}

/** The score and its components with no percentile lookup; the simulator calibrates from this. */
export function scoreCreature(record: CreatureRecord, species: Species = speciesOf(record)): CreatureScore {
	const components: CreatureGradeComponents = {
		finish: finishScore(record),
		attributes: attributesScore(record, species),
		size: sizeScore(record, species),
		abilities: abilitiesScore(record),
	};
	const score = Object.values(components).reduce((a, b) => a + b, 0);
	return { score, components };
}

function percentileOf(score: number, calibration: CreatureGradeCalibration | null | undefined): number | null {
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
			return pLo + ((score - sLo) / (sHi - sLo)) * (pHi - pLo);
		}
	}
	return last[0];
}

function tierOf(percentile: number | null): string | null {
	if (percentile == null) {
		return null;
	}
	const row = TIER_TABLE.find((r) => percentile <= r.max);
	return row ? row.tier : 'apex';
}

export function gradeCreature(record: CreatureRecord, calibration: CreatureGradeCalibration | null | undefined = bundledCalibration, species?: Species): CreatureGrade {
	const { score, components } = scoreCreature(record, species ?? speciesOf(record));
	const percentile = percentileOf(score, calibration);
	return { score, percentile, tier: tierOf(percentile), components };
}
