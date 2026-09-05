/*
	Expedition — the creature on the table.

	Per docs/design/reclamation-design.md ("The creature on the table"): everything a
	creature is on the table is derived from its record; nothing is stored on the record.
	`prepare(record, site, world, sentIndex)` builds that derived view once per creature
	per site, and `magnitudeAgainst(actor, act, target)` computes an act's magnitude
	against a specific target at resolution time (type chart + target's secondary +
	actor's strain).
*/

import { conditionMultiplier } from './elementMatchup.js';
import { typeEffectivenessMultiplier } from './expeditionInterpretation.js';
import {
	HOLD_DIVISOR,
	HOME_GROUND_MULTIPLIER,
	STRAIN_MULTIPLIER,
	SEVERE_STRAIN_MULTIPLIER,
	getActClass,
	getGoverningAttributeForAction,
	getFavoredActSpec,
	getConductSpec,
	ACT_CLASS,
	TEMPERAMENT_HIGH_THRESHOLD,
	TEMPERAMENT_LOW_THRESHOLD,
} from './expeditionInterpretation.js';

// ---------------------------------------------------------------------------
// element helpers — the ratified record shape carries element as { primary, affinities }
// (affinities always includes the primary at 100, plus at most one graded secondary).
// conditionMultiplier (elementMatchup.js) is the blend this design's "world matchup" and
// "magnitude against a target" paragraphs both call for: softened(0 -> 0.25) primary
// blended with a graded secondary, read against the WORLD's element or the TARGET's.
// ---------------------------------------------------------------------------

function recordElement(record) {
	return (record && record.element) || { primary: null, affinities: {} };
}

// world matchup: matrix[creature][world], softened + blended, creature as attacker
export function worldMatchupMultiplier(record, worldElement) {
	return conditionMultiplier(worldElement, recordElement(record));
}

// magnitude scaling: matrix[creature][target], softened + blended with the TARGET's
// secondary (per the design doc: "scaled by the type chart, creature against target's
// element, blended with the target's secondary affinity")
export function targetMatchupMultiplier(actorRecord, targetRecord) {
	const actorPrimary = recordElement(actorRecord).primary;
	// conditionMultiplier(againstElement, creatureElement) computes matrix[creatureElement.primary][againstElement]
	// blended with cardElement's OWN secondary. Here we want matrix[actorPrimary][x] blended
	// with the TARGET's secondary, so we build a synthetic "cardElement" whose primary is
	// the actor's element but whose affinities carry the target's secondary grade, and pass
	// the target's primary as the "decree" (defender) element.
	const targetElement = recordElement(targetRecord);
	const targetPrimary = targetElement.primary;
	const targetSecondaryKey = Object.keys(targetElement.affinities || {}).find((k) => k !== targetPrimary);
	const syntheticCardElement = {
		primary: actorPrimary,
		affinities: targetSecondaryKey
			? { [actorPrimary]: 100, [targetSecondaryKey]: targetElement.affinities[targetSecondaryKey] }
			: { [actorPrimary]: 100 },
	};
	return conditionMultiplier(targetPrimary, syntheticCardElement);
}

// ---------------------------------------------------------------------------
// physiology / strain
// ---------------------------------------------------------------------------

/*
	Trait keys of a record. The ratified record stores the keys that landed as a flat
	array (`traits: ["armored", "stealthy"]`, docs/design/xalian-creature-system-redesign.md
	section 2). Older provisional records used `{ guaranteed, rolled }` and the handoff
	reference sketches `{ keys }`; all three read the same here so no consumer breaks on
	the shape.
*/
export function traitKeywordsOf(record) {
	const traits = record && record.traits;
	if (Array.isArray(traits)) {
		return [...new Set(traits)];
	}
	if (!traits || typeof traits !== 'object') {
		return [];
	}
	if (Array.isArray(traits.keys)) {
		return [...new Set(traits.keys)];
	}
	const guaranteed = Array.isArray(traits.guaranteed) ? traits.guaranteed : [];
	const rolled = Array.isArray(traits.rolled) ? traits.rolled : [];
	return [...new Set([...guaranteed, ...rolled])];
}

function hasAnyTraitKeyword(record, keyword) {
	return traitKeywordsOf(record).includes(keyword);
}

// A site band is "covered" when the creature's band contains it; the rule below grades
// the shortfall when it is not. Both are levers (see STRAIN_* in expeditionInterpretation).
export const STRAIN_OVERLAP_COMFORT = 0.5; // share of the site band the creature must cover to be comfortable
export const STRAIN_GAP_SEVERE_C = 30; // a gap wider than this between the two bands is severe

/*
	strainLevel(record, site, world) -> 'none' | 'strained' | 'severe'

	Per the design doc: a creature outside a site's environment is strained; one that
	cannot breathe the site's medium at all is severely strained. With the real species
	records (tolerance bands of 30 to 60 C on worlds 100 C apart) the binary reading of
	"outside" strained four sends in five and stopped meaning anything, so the temperature
	test is graded by how far off the creature is (2026-09-03, recorded in
	docs/design/reclamation-design.md):

	- none:     the creature's band covers the site band, or overlaps at least half of it
	- strained: the bands overlap less than that, or miss each other by up to
	            STRAIN_GAP_SEVERE_C, or the site's medium is outside what the body
	            tolerates around it
	- severe:   the bands miss by more than STRAIN_GAP_SEVERE_C (a fire creature on an ice
	            world), or the creature cannot breathe the site's medium

	Nocturnal creatures are never strained on Grimedes; luminous creatures are never
	strained on Luminax (the site table has no dark-side flag yet, so the doc's "Luminax's
	dark side" reads as "on Luminax" until it does).
*/
// Since the frame (2026-09-04) a site carries its own world, so callers may pass the
// frame, or nothing, as `world`; the site's world wins whenever it is there.
export function worldOfSite(site, world) {
	return site && site.world ? site.world : world;
}

export function strainLevel(record, site, worldArg) {
	const world = worldOfSite(site, worldArg);
	const physiology = (record && record.physiology) || {};
	const tolerance = physiology.environmentalTolerance || {};
	const breathes = Array.isArray(physiology.breathes) ? physiology.breathes : [];
	const ambientMedia = Array.isArray(tolerance.ambientMedia) ? tolerance.ambientMedia : [];
	const tempBand = tolerance.temperatureC || {};

	const planetName = world && world.planet;
	if (planetName === 'Grimedes' && hasAnyTraitKeyword(record, 'nocturnal')) {
		return 'none';
	}
	if (planetName === 'Luminax' && hasAnyTraitKeyword(record, 'luminous')) {
		return 'none';
	}

	const siteEnvironment = (site && site.environment) || {};
	const siteMedium = siteEnvironment.medium;
	const siteTemp = siteEnvironment.temperatureC || {};

	const cannotBreathe = siteMedium && breathes.length > 0 && !breathes.includes(siteMedium);
	if (cannotBreathe) {
		return 'severe';
	}

	const toleratesMedium = siteMedium ? ambientMedia.includes(siteMedium) : true;
	const min = typeof tempBand.min === 'number' ? tempBand.min : -Infinity;
	const max = typeof tempBand.max === 'number' ? tempBand.max : Infinity;
	const siteMin = typeof siteTemp.min === 'number' ? siteTemp.min : min;
	const siteMax = typeof siteTemp.max === 'number' ? siteTemp.max : max;

	let temperature = 'none';
	if (!(siteMin >= min && siteMax <= max)) {
		const overlap = Math.min(max, siteMax) - Math.max(min, siteMin);
		if (overlap > 0) {
			const siteSpan = Math.max(1, siteMax - siteMin);
			temperature = overlap / siteSpan >= STRAIN_OVERLAP_COMFORT ? 'none' : 'strained';
		} else {
			const gap = -overlap;
			temperature = gap > STRAIN_GAP_SEVERE_C ? 'severe' : 'strained';
		}
	}

	if (temperature === 'severe') {
		return 'severe';
	}
	if (!toleratesMedium || temperature === 'strained') {
		return 'strained';
	}
	return 'none';
}

export function strainMultiplierFor(level) {
	if (level === 'severe') {
		return SEVERE_STRAIN_MULTIPLIER;
	}
	if (level === 'strained') {
		return STRAIN_MULTIPLIER;
	}
	return 1;
}

// ---------------------------------------------------------------------------
// hold
// ---------------------------------------------------------------------------

export function baseHold(record) {
	const attrs = (record && record.attributes) || {};
	const vitality = typeof attrs.vitality === 'number' ? attrs.vitality : 0;
	const resilience = typeof attrs.resilience === 'number' ? attrs.resilience : 0;
	const endurance = typeof attrs.endurance === 'number' ? attrs.endurance : 0;
	const mean = (vitality + resilience + endurance) / 3;
	return mean / HOLD_DIVISOR;
}

/*
	holdAtSite(record, site, world, options) -> number

	options: { originWorldPlanet, isSelfHomeGround (bool, precomputed) } — home ground is
	a straight lowercase compare of record.provenance.origin against the world's planet
	name (design doc: "home ground: hold is multiplied by 1.5 on the creature's origin
	world"). packBondedKinAtSite / solitaryAlliesAtSite let callers (the rules engine, which
	knows who else stands at the site) fold in the trait bonuses/penalties; they default to
	0 so this function is usable standalone (e.g. by tests and the card-inspection panel).
*/
export function holdAtSite(record, site, worldArg, opts = {}) {
	const world = worldOfSite(site, worldArg);
	const base = baseHold(record);
	const matchup = worldMatchupMultiplier(record, world && world.element);
	const origin = record && record.provenance && record.provenance.origin;
	const isHome = !!origin && !!(world && world.planet) && String(origin).toLowerCase() === String(world.planet).toLowerCase();
	const homeGround = isHome ? HOME_GROUND_MULTIPLIER : 1;
	const level = strainLevel(record, site, world);
	const strain = strainMultiplierFor(level);

	let value = base * matchup * homeGround * strain;

	const kinAtSite = typeof opts.packBondedKinAtSite === 'number' ? opts.packBondedKinAtSite : 0;
	const alliesAtSite = typeof opts.solitaryAlliesAtSite === 'number' ? opts.solitaryAlliesAtSite : 0;
	if (kinAtSite > 0 && hasAnyTraitKeyword(record, 'pack-bonded')) {
		value += kinAtSite; // PACK_BOND_HOLD_BONUS_PER_KIN = 1, folded in directly here
	}
	if (alliesAtSite > 0 && hasAnyTraitKeyword(record, 'solitary')) {
		value -= alliesAtSite; // SOLITARY_HOLD_PENALTY_PER_ALLY = 1
	}

	return { value, level, isHome, matchup };
}

// ---------------------------------------------------------------------------
// initiative
// ---------------------------------------------------------------------------

export function initiativeOf(record) {
	const attrs = (record && record.attributes) || {};
	const reflex = typeof attrs.reflex === 'number' ? attrs.reflex : 0;
	const agility = typeof attrs.agility === 'number' ? attrs.agility : 0;
	return (reflex + agility) / 2;
}

// ---------------------------------------------------------------------------
// acts
// ---------------------------------------------------------------------------

// printed(ability) = max(1, round((intensity / 10) * (0.5 + governingAttr / 100))) — same
// formula the first design's tributeCardBuilder.js uses (printedPower), governing
// attribute looked up per this design's own action table since the action vocabulary and
// its class groupings differ from the first design.
export function magnitudeOf(intensity, governingAttrValue) {
	const attr = typeof governingAttrValue === 'number' ? governingAttrValue : 50;
	const raw = (intensity / 10) * (0.5 + attr / 100);
	return Math.max(1, Math.round(raw));
}

function abilitiesOf(record) {
	return Array.isArray(record && record.abilities) ? record.abilities : [];
}

/*
	buildActs(record, strainMult) -> [{ name, action, class, magnitude, instrument,
	signature }] — one act per ability, magnitude computed against strain only (the
	type-chart-vs-target scaling happens later, per-target, in magnitudeAgainst).
*/
export function buildActs(record, strainMult) {
	return abilitiesOf(record).map((ability) => {
		const governingAttribute = getGoverningAttributeForAction(ability.action);
		const attrs = (record && record.attributes) || {};
		const attrValue = governingAttribute ? attrs[governingAttribute] : undefined;
		const baseMagnitude = magnitudeOf(ability.intensity, attrValue);
		return {
			name: ability.name,
			action: ability.action,
			class: getActClass(ability.action),
			magnitude: Math.max(1, Math.round(baseMagnitude * strainMult)),
			instrument: ability.instrument,
			signature: !!ability.signature,
		};
	});
}

/*
	magnitudeAgainst(actor, act, target) -> number

	actor/target are prepared creature-on-table views (from prepare()) or raw records +
	strain level; act is one entry from buildActs(). Applies the type chart (actor
	element vs target element, blended target secondary) on top of the act's own
	strain-scaled base magnitude. Strain is already folded into act.magnitude by
	buildActs(), so this only adds the target matchup.
*/
export function magnitudeAgainst(actorRecord, act, targetRecord) {
	const matchup = targetMatchupMultiplier(actorRecord, targetRecord);
	return Math.max(1, Math.round(act.magnitude * matchup));
}

// ---------------------------------------------------------------------------
// favored act (used when a creature is not given an order)
// ---------------------------------------------------------------------------

/*
	favoredAct(record, acts) -> one entry of `acts`, or a synthetic { action: 'hold' }.

	Resolves the archetype's FAVORED_ACT_BY_ARCHETYPE spec against the creature's actual
	ability list (see expeditionInterpretation.js's long comment on that table for the
	reasoning). Falls back to 'hold' if the archetype favors a specific action the
	creature does not have, or if the creature has no acts of the preferred classes.
*/
export function favoredAct(record, acts) {
	const archetypeKey = record && record.archetype && record.archetype.key;
	const spec = getFavoredActSpec(archetypeKey);
	if (!spec || acts.length === 0) {
		return { action: 'hold', class: null, magnitude: 0, name: 'Hold' };
	}

	if (spec.prefer === 'hold') {
		return { action: 'hold', class: null, magnitude: 0, name: 'Hold' };
	}

	if (spec.prefer === 'specificAction') {
		const found = acts.find((a) => a.action === spec.action);
		if (found) {
			return found;
		}
		return { action: 'hold', class: null, magnitude: 0, name: 'Hold' };
	}

	if (spec.prefer === 'strongestOverall') {
		return acts.reduce((best, a) => (!best || a.magnitude > best.magnitude ? a : best), null);
	}

	if (spec.prefer === 'strongestOfClass') {
		const inClass = acts.filter((a) => spec.classes.includes(a.class));
		if (inClass.length === 0) {
			return { action: 'hold', class: null, magnitude: 0, name: 'Hold' };
		}
		if (Array.isArray(spec.actionPriority)) {
			for (const preferredAction of spec.actionPriority) {
				const found = inClass.filter((a) => a.action === preferredAction);
				if (found.length > 0) {
					return found.reduce((best, a) => (!best || a.magnitude > best.magnitude ? a : best));
				}
			}
		}
		return inClass.reduce((best, a) => (!best || a.magnitude > best.magnitude ? a : best));
	}

	return { action: 'hold', class: null, magnitude: 0, name: 'Hold' };
}

// ---------------------------------------------------------------------------
// conduct
// ---------------------------------------------------------------------------

export function conductOf(record) {
	const archetypeKey = record && record.archetype && record.archetype.key;
	const spec = getConductSpec(archetypeKey);
	const temperament = (record && record.temperament) || {};
	return {
		attacking: spec ? spec.attacking : 'enemySentEarliest',
		supporting: spec ? spec.supporting : 'allySentEarliest',
		boldness: typeof temperament.boldness === 'number' ? temperament.boldness : 50,
		curiosity: typeof temperament.curiosity === 'number' ? temperament.curiosity : 50,
		energy: typeof temperament.energy === 'number' ? temperament.energy : 50,
		aggression: typeof temperament.aggression === 'number' ? temperament.aggression : 50,
		sociability: typeof temperament.sociability === 'number' ? temperament.sociability : 50,
		isHighBoldness: (typeof temperament.boldness === 'number' ? temperament.boldness : 50) >= TEMPERAMENT_HIGH_THRESHOLD,
		isLowBoldness: (typeof temperament.boldness === 'number' ? temperament.boldness : 50) <= TEMPERAMENT_LOW_THRESHOLD,
		isHighSociability: (typeof temperament.sociability === 'number' ? temperament.sociability : 50) >= TEMPERAMENT_HIGH_THRESHOLD,
		isHighCuriosity: (typeof temperament.curiosity === 'number' ? temperament.curiosity : 50) >= TEMPERAMENT_HIGH_THRESHOLD,
		isHighAggression: (typeof temperament.aggression === 'number' ? temperament.aggression : 50) >= TEMPERAMENT_HIGH_THRESHOLD,
	};
}

// ---------------------------------------------------------------------------
// prepare() — the full derived view
// ---------------------------------------------------------------------------

/*
	prepare(record, site, world, sentIndex, opts) -> {
		record, id, site, world, sentIndex,
		baseHold, hold, holdMultiplier, isHome,
		initiative, strainLevel, strainMultiplier,
		acts, favoredAct, conduct, traitKeywords,
		stealthy, anchored, armored, resilient, menacing, packBonded, solitary,
	}

	`opts` may carry { packBondedKinAtSite, solitaryAlliesAtSite } for the trait hold
	adjustments (the rules engine recomputes these whenever the board at a site changes).
*/
export function prepare(record, site, worldArg, sentIndex, opts = {}) {
	const world = worldOfSite(site, worldArg);
	const level = strainLevel(record, site, world);
	const strainMult = strainMultiplierFor(level);
	const { value: hold, isHome, matchup } = holdAtSite(record, site, world, opts);
	const acts = buildActs(record, strainMult);
	const traitKeywords = traitKeywordsOf(record);

	return {
		record,
		id: record.id,
		site,
		world,
		sentIndex,
		baseHold: baseHold(record),
		hold,
		holdMultiplier: matchup,
		isHome,
		initiative: initiativeOf(record),
		strainLevel: level,
		strainMultiplier: strainMult,
		acts,
		favoredAct: favoredAct(record, acts),
		conduct: conductOf(record),
		traitKeywords,
		stealthy: traitKeywords.includes('stealthy'),
		anchored: traitKeywords.includes('anchored'),
		armored: traitKeywords.includes('armored'),
		resilient: traitKeywords.includes('resilient'),
		menacing: traitKeywords.includes('menacing'),
		packBonded: traitKeywords.includes('pack-bonded'),
		solitary: traitKeywords.includes('solitary'),
	};
}
