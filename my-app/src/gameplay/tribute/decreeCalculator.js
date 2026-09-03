/*
	Tribute — Decree math.

	Implements the "Decrees (the weather layer)" formulas from
	docs/design/tribute-design.md exactly:

		softened(m) = (m == 0) ? 0.25 : m
		multiplier  = (100 * softened(m_primary) + grade * softened(m_secondary)) / (100 + grade)
		contribution = max(1, round(printed * multiplier))

	grade is the creature's secondary affinity VALUE (0 if mono-typed - the primary's own
	100 entry in affinities is never treated as a secondary).

	Orientation: the design doc says every creature "is multiplied by its element matchup
	against the Decree's element", so the creature is the attacker and the Decree's element
	is the defender in the type chart: m = matrix[creatureElement][decreeElement]. Read the
	other way round the softened-immunity rule would punish a creature for being immune
	to the weather, which is backwards. A Fire creature under Poseidas Death Tide (water)
	fights at half strength; a Plant creature under it fights at double.
*/

import { typeEffectivenessMultiplier } from './tributeInterpretation.js';

export function softened(multiplier) {
	return multiplier === 0 ? 0.25 : multiplier;
}

// Picks the graded secondary affinity (if any) out of a card/record's element.affinities.
// affinities always contains the primary duplicated at 100; the secondary, if present, is
// any other key. Mono-typed creatures have no other key, so grade is 0.
function secondaryAffinity(element) {
	if (!element || !element.affinities) {
		return { element: null, grade: 0 };
	}
	const primary = element.primary;
	const keys = Object.keys(element.affinities).filter((key) => key !== primary);
	if (keys.length === 0) {
		return { element: null, grade: 0 };
	}
	// design/record contract: at most one graded secondary
	const secondaryElement = keys[0];
	const grade = element.affinities[secondaryElement];
	return { element: secondaryElement, grade: typeof grade === 'number' ? grade : 0 };
}

/*
	conditionMultiplier(decreeElement, cardElement) -> number

	cardElement is the card-face element shape: { primary, affinities }.
*/
export function conditionMultiplier(decreeElement, cardElement) {
	const primaryElement = cardElement && cardElement.primary;
	const mPrimary = typeEffectivenessMultiplier(primaryElement, decreeElement);

	const { element: secondaryElement, grade } = secondaryAffinity(cardElement);
	const mSecondary = secondaryElement ? typeEffectivenessMultiplier(secondaryElement, decreeElement) : 1;

	const numerator = 100 * softened(mPrimary) + grade * softened(mSecondary);
	const denominator = 100 + grade;
	return numerator / denominator;
}

// contribution = max(1, round(printed * multiplier)); pass decreeElement = null/undefined
// for "no active decree on this row" (multiplier 1).
export function decreeContribution(printed, decreeElement, cardElement) {
	if (!decreeElement) {
		return Math.max(1, Math.round(printed));
	}
	const multiplier = conditionMultiplier(decreeElement, cardElement);
	return Math.max(1, Math.round(printed * multiplier));
}
