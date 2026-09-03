/*
	Tribute — card derivation.

	buildCard(record) turns a creature record into a read-only card view per
	docs/design/tribute-design.md ("Card derivation: how a creature becomes a card").
	Nothing is ever stored back on the record; the card is recomputed from the record
	every time it is needed.
*/

import {
	getRangeClassForAction,
	getGoverningAttributeForAction,
	ROW,
} from './tributeInterpretation.js';

// printed(ability) = max(1, round((intensity / 10) * (0.5 + governingAttr / 100)))
function printedPower(intensity, governingAttrValue) {
	const attr = typeof governingAttrValue === 'number' ? governingAttrValue : 50;
	const raw = (intensity / 10) * (0.5 + attr / 100);
	return Math.max(1, Math.round(raw));
}

// the bare-body Close fallback: a virtual intensity-30 effort governed by strength
function bareBodyPower(strength) {
	const attr = typeof strength === 'number' ? strength : 50;
	return Math.max(1, Math.round(3 * (0.5 + attr / 100)));
}

function abilitiesOf(record) {
	return Array.isArray(record.abilities) ? record.abilities : [];
}

// best printed power among a creature's abilities of a given range class, or null if it
// has none of that class
function bestPowerForRow(record, row) {
	let best = null;
	abilitiesOf(record).forEach((ability) => {
		const rangeClass = getRangeClassForAction(ability.action);
		if (rangeClass !== row) {
			return;
		}
		const governingAttribute = getGoverningAttributeForAction(ability.action);
		const attrValue = governingAttribute ? record.attributes && record.attributes[governingAttribute] : undefined;
		const power = printedPower(ability.intensity, attrValue);
		if (best === null || power > best) {
			best = power;
		}
	});
	return best;
}

// element.affinities carries the primary duplicated at 100 plus at most one graded
// secondary. This normalizes it into { primary, affinities } for the card face.
function buildElement(record) {
	const primary = record.element && record.element.primary;
	const affinities = (record.element && record.element.affinities) || {};
	return {
		primary,
		affinities: { ...affinities },
	};
}

function displayName(record) {
	if (record.species && record.provenance && typeof record.provenance.serial === 'number') {
		const species = record.species.charAt(0).toUpperCase() + record.species.slice(1);
		return `${species} #${record.provenance.serial}`;
	}
	if (record.species) {
		return record.species.charAt(0).toUpperCase() + record.species.slice(1);
	}
	return record.id;
}

/*
	buildCard(record) -> {
		id, name,
		element: { primary, affinities },
		archetype,
		eligibleRows: [ROW.CLOSE, ...],
		powerByRow: { close, mid, far }  // only rows the card is eligible for
	}

	Row eligibility and power, per the design doc:
	- Every creature is Close-eligible. If it has a contact-class ability, Close power is
	  the best printed contact ability; otherwise it uses the bare-body fallback.
	- Mid/Far require at least one ability of that range class; power is the best printed
	  ability of that class (signature abilities included in the search).
*/
export function buildCard(record) {
	if (!record || typeof record !== 'object') {
		throw new TypeError('buildCard requires a creature record');
	}

	const strength = record.attributes && record.attributes.strength;

	const closeAbilityPower = bestPowerForRow(record, ROW.CLOSE);
	const midPower = bestPowerForRow(record, ROW.MID);
	const farPower = bestPowerForRow(record, ROW.FAR);

	const closePower = closeAbilityPower !== null ? closeAbilityPower : bareBodyPower(strength);

	const eligibleRows = [ROW.CLOSE];
	const powerByRow = { [ROW.CLOSE]: closePower };

	if (midPower !== null) {
		eligibleRows.push(ROW.MID);
		powerByRow[ROW.MID] = midPower;
	}
	if (farPower !== null) {
		eligibleRows.push(ROW.FAR);
		powerByRow[ROW.FAR] = farPower;
	}

	return {
		id: record.id,
		name: displayName(record),
		element: buildElement(record),
		archetype: record.archetype ? { ...record.archetype } : null,
		eligibleRows,
		powerByRow,
	};
}

export function isRowEligible(card, row) {
	return !!card && Array.isArray(card.eligibleRows) && card.eligibleRows.includes(row);
}

export { printedPower, bareBodyPower };
