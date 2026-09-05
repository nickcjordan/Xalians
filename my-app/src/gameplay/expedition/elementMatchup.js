/*
	Expedition: the element matchup blend.

	One creature element ({ primary, affinities }) read against one other element (a
	world's, or a target's): the type chart with the creature as attacker, softened so a
	0 becomes 0.25, blended with the creature's graded secondary affinity. The rulebook's
	"world matchup" and "magnitude against a target" paragraphs both call for exactly this
	blend. It first lived in the row game's decree calculator; that game is gone and the
	blend lives here.
*/

import { typeEffectivenessMultiplier } from './expeditionInterpretation.js';

// a 0 on the chart would zero a creature out of a world entirely; the design softens it
export function softened(multiplier) {
	return multiplier === 0 ? 0.25 : multiplier;
}

// Picks the graded secondary affinity (if any) out of a record's element.affinities.
// affinities always contains the primary duplicated at 100; the secondary, if present, is
// any other key. Mono-typed creatures have no other key, so grade is 0.
export function secondaryAffinity(element) {
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
	conditionMultiplier(againstElement, creatureElement) -> number

	creatureElement is the record's element shape: { primary, affinities }. againstElement
	is the single element being matched against (the world's, or the target's primary).
*/
export function conditionMultiplier(againstElement, creatureElement) {
	const primaryElement = creatureElement && creatureElement.primary;
	const mPrimary = typeEffectivenessMultiplier(primaryElement, againstElement);

	const { element: secondaryElement, grade } = secondaryAffinity(creatureElement);
	const mSecondary = secondaryElement ? typeEffectivenessMultiplier(secondaryElement, againstElement) : 1;

	const numerator = 100 * softened(mPrimary) + grade * softened(mSecondary);
	const denominator = 100 + grade;
	return numerator / denominator;
}
