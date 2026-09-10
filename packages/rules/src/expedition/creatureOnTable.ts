/*
	Expedition - the creature on the table.

	Per docs/design/reclamation-design.md ("The creature on the table"): everything a
	creature is on the table is derived from its record; nothing is stored on the record.
	`prepare(record, site, world, sentIndex)` builds that derived view once per creature
	per site, and `magnitudeAgainst(actor, act, target)` computes an act's magnitude
	against a specific target at resolution time (type chart + target's secondary +
	actor's strain).
*/

import type { XalianRecord } from '@xalians/content/schema';
import { conditionMultiplier } from './elementMatchup.ts';
import { typeEffectivenessMultiplier } from './expeditionInterpretation.ts';
import {
	RAW_ATTRIBUTE_MIN,
	RAW_ATTRIBUTE_MAX,
	HOLD_FLOOR,
	HOLD_CEILING,
	HOME_GROUND_MULTIPLIER,
	STRAIN_MULTIPLIER,
	SEVERE_STRAIN_MULTIPLIER,
	BOLSTER_FLOOR,
	MAGNITUDE_SCALE,
	MIN_BLOW_MAGNITUDE,
	ROLE,
	PRESENCE_BY_ARCHETYPE,
	SWEEP_ABILITY_ACTIONS,
	WARD_ABILITY_ACTION,
	MEND_ABILITY_ACTION,
	getActClass,
	getGoverningAttributeForAction,
	getFavoredActSpec,
	getConductSpec,
	ACT_CLASS,
	TEMPERAMENT_HIGH_THRESHOLD,
	TEMPERAMENT_LOW_THRESHOLD,
	WILLFUL_THRESHOLD,
	SWIFT_SPEED,
	presenceScaleOf,
} from './expeditionInterpretation.ts';
import type {
	Act, ActClass, AuthoredSite, Conduct, FrameSite, HoldResult, PrepareOptions,
	PreparedCreature, Role, Rules, StrainLevel, WorldFacts,
} from './types.ts';

type AnySite = (AuthoredSite & { world?: WorldFacts }) | FrameSite;

// ---------------------------------------------------------------------------
// element helpers - the ratified record shape carries element as { primary, affinities }
// (affinities always includes the primary at 100, plus at most one graded secondary).
// conditionMultiplier (elementMatchup.ts) is the blend this design's "world matchup" and
// "magnitude against a target" paragraphs both call for: softened(0 -> 0.25) primary
// blended with a graded secondary, read against the WORLD's element or the TARGET's.
// ---------------------------------------------------------------------------

function recordElement(record: XalianRecord | null | undefined): XalianRecord['element'] {
	return (record && record.element) || { primary: '', affinities: {} };
}

// world matchup: matrix[creature][world], softened + blended, creature as attacker
export function worldMatchupMultiplier(record: XalianRecord, worldElement: string | null | undefined): number {
	return conditionMultiplier(worldElement, recordElement(record));
}

// magnitude scaling: matrix[creature][target], softened + blended with the TARGET's
// secondary (per the design doc: "scaled by the type chart, creature against target's
// element, blended with the target's secondary affinity")
export function targetMatchupMultiplier(actorRecord: XalianRecord, targetRecord: XalianRecord): number {
	const actorPrimary = recordElement(actorRecord).primary;
	// conditionMultiplier(againstElement, creatureElement) computes matrix[creatureElement.primary][againstElement]
	// blended with cardElement's OWN secondary. Here we want matrix[actorPrimary][x] blended
	// with the TARGET's secondary, so we build a synthetic "cardElement" whose primary is
	// the actor's element but whose affinities carry the target's secondary grade, and pass
	// the target's primary as the "decree" (defender) element.
	const targetElement = recordElement(targetRecord);
	const targetPrimary = targetElement.primary;
	const targetAffinities = (targetElement.affinities || {}) as Record<string, number>;
	const targetSecondaryKey = Object.keys(targetAffinities).find((k) => k !== targetPrimary);
	const syntheticCardElement = {
		primary: actorPrimary,
		affinities: targetSecondaryKey
			? { [actorPrimary]: 100, [targetSecondaryKey]: targetAffinities[targetSecondaryKey] }
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
	the shape. XalianRecord['traits'] is always TraitKey[] under the ratified schema, so the
	object-shaped branches below are read through `unknown` -- they are defensive against
	pre-ratification fixtures (draft.ts's placeholderRoster, older devtools pool captures),
	not a case the current schema can produce.
*/
export function traitKeywordsOf(record: XalianRecord | null | undefined): string[] {
	const traits: unknown = record && record.traits;
	if (Array.isArray(traits)) {
		return [...new Set(traits)];
	}
	if (!traits || typeof traits !== 'object') {
		return [];
	}
	const shaped = traits as { keys?: unknown; guaranteed?: unknown; rolled?: unknown };
	if (Array.isArray(shaped.keys)) {
		return [...new Set(shaped.keys)];
	}
	const guaranteed = Array.isArray(shaped.guaranteed) ? shaped.guaranteed : [];
	const rolled = Array.isArray(shaped.rolled) ? shaped.rolled : [];
	return [...new Set([...guaranteed, ...rolled])];
}

function hasAnyTraitKeyword(record: XalianRecord, keyword: string): boolean {
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
export function worldOfSite(site: AnySite | null | undefined, world: WorldFacts | null | undefined): WorldFacts | null | undefined {
	return site && (site as FrameSite).world ? (site as FrameSite).world : world;
}

export function strainLevel(record: XalianRecord, site: AnySite | null | undefined, worldArg?: WorldFacts | null): StrainLevel {
	const world = worldOfSite(site, worldArg);
	const physiology = (record && record.physiology) || ({} as Partial<XalianRecord['physiology']>);
	const tolerance = physiology.environmentalTolerance || ({} as Partial<XalianRecord['physiology']['environmentalTolerance']>);
	const breathes: string[] = Array.isArray(physiology.breathes) ? physiology.breathes : [];
	const ambientMedia: string[] = Array.isArray(tolerance.ambientMedia) ? tolerance.ambientMedia : [];
	const tempBand = tolerance.temperatureC || ({} as { min?: number; max?: number });

	const planetName = world && world.planet;
	if (planetName === 'Grimedes' && hasAnyTraitKeyword(record, 'nocturnal')) {
		return 'none';
	}
	if (planetName === 'Luminax' && hasAnyTraitKeyword(record, 'luminous')) {
		return 'none';
	}

	const siteEnvironment = (site && (site as AuthoredSite).environment) || ({} as Partial<AuthoredSite['environment']>);
	const siteMedium = siteEnvironment.medium;
	const siteTemp = siteEnvironment.temperatureC || ({} as { min?: number; max?: number });

	const cannotBreathe = !!siteMedium && breathes.length > 0 && !breathes.includes(siteMedium);
	if (cannotBreathe) {
		return 'severe';
	}

	const toleratesMedium = siteMedium ? ambientMedia.includes(siteMedium) : true;
	const min = typeof tempBand.min === 'number' ? tempBand.min : -Infinity;
	const max = typeof tempBand.max === 'number' ? tempBand.max : Infinity;
	const siteMin = typeof siteTemp.min === 'number' ? siteTemp.min : min;
	const siteMax = typeof siteTemp.max === 'number' ? siteTemp.max : max;

	let temperature: StrainLevel = 'none';
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

export function strainMultiplierFor(level: StrainLevel): number {
	if (level === 'severe') {
		return SEVERE_STRAIN_MULTIPLIER;
	}
	if (level === 'strained') {
		return STRAIN_MULTIPLIER;
	}
	return 1;
}

/*
	liftedStrainLevel(level) -> the grade one step up the ladder.

	Bolster (docs/design/reclamation-base-redesign.md assumption 8) lifts every ally at
	its world one grade of strain: severe to strained, strained to comfortable. A
	comfortable ally has no grade left to gain, so it takes rules.bolsterFloor hold
	instead, applied by holdAtSite below. Bolsters do not stack: two bolsterers at a world
	lift exactly one grade, the same as one.
*/
export function liftedStrainLevel(level: StrainLevel): StrainLevel {
	if (level === 'severe') {
		return 'strained';
	}
	if (level === 'strained') {
		return 'none';
	}
	return 'none';
}

// ---------------------------------------------------------------------------
// hold
// ---------------------------------------------------------------------------

/*
	baseHold(record, rules) -> number

	Hold compression (docs/design/reclamation-base-redesign.md assumption 11): the raw
	mean of vitality, resilience and endurance is read against the registry's attribute
	range and mapped onto [floor, ceiling]. Raising the floor compresses the species
	spread without touching a single creature record, which is the whole point: fairness
	lives here, never in the records.

		hold = floor + (raw - RAW_ATTRIBUTE_MIN) * (ceiling - floor) / (RAW_ATTRIBUTE_MAX - RAW_ATTRIBUTE_MIN)

	`rules` is optional and only needs to name holdFloor/holdCeiling; a caller with no
	rules object (a bench panel, a test, the draft rater) gets the module constants, which
	are the shipped first settings.
*/
export function baseHold(record: XalianRecord, rules?: Partial<Rules> | null): number {
	const attrs = (record && record.attributes) || ({} as Partial<XalianRecord['attributes']>);
	const vitality = typeof attrs.vitality === 'number' ? attrs.vitality : 0;
	const resilience = typeof attrs.resilience === 'number' ? attrs.resilience : 0;
	const endurance = typeof attrs.endurance === 'number' ? attrs.endurance : 0;
	const raw = (vitality + resilience + endurance) / 3;
	const floor = rules && typeof rules.holdFloor === 'number' ? rules.holdFloor : HOLD_FLOOR;
	const ceiling = rules && typeof rules.holdCeiling === 'number' ? rules.holdCeiling : HOLD_CEILING;
	const span = RAW_ATTRIBUTE_MAX - RAW_ATTRIBUTE_MIN;
	return floor + ((raw - RAW_ATTRIBUTE_MIN) * (ceiling - floor)) / span;
}

/*
	holdAtSite(record, site, world, options) -> number

	options: { originWorldPlanet, isSelfHomeGround (bool, precomputed) } - home ground is
	a straight lowercase compare of record.provenance.origin against the world's planet
	name (design doc: "home ground: hold is multiplied by 1.5 on the creature's origin
	world"). packBondedKinAtSite / solitaryAlliesAtSite let callers (the rules engine, which
	knows who else stands at the site) fold in the trait bonuses/penalties; they default to
	0 so this function is usable standalone (e.g. by tests and the card-inspection panel).
*/
export function holdAtSite(
	record: XalianRecord,
	site: AnySite | null | undefined,
	worldArg: WorldFacts | null | undefined,
	opts: PrepareOptions & { bolstered?: boolean; bolsterScale?: number } = {},
): HoldResult {
	const world = worldOfSite(site, worldArg);
	const rules = opts.rules as Partial<Rules> | undefined;
	const base = baseHold(record, rules);
	const matchup = worldMatchupMultiplier(record, world && world.element);
	const origin = record && record.provenance && record.provenance.origin;
	const isHome = !!origin && !!(world && world.planet) && String(origin).toLowerCase() === String(world.planet).toLowerCase();
	const homeGround = isHome ? HOME_GROUND_MULTIPLIER : 1;
	const level = strainLevel(record, site, world);
	// willpower's job (assumption 17): a willful creature holds against the world, one
	// grade less strain, applied BEFORE bolster so the two never stack past comfortable.
	const willful = isWillful(record, rules);
	const heldLevel = willful ? liftedStrainLevel(level) : level;
	// bolster (assumption 8): one more grade of strain relief while a bolsterer stands
	// here, and a flat bolsterFloor for a creature that is already comfortable. Charisma
	// scales what the bolsterer restores (assumption 17): opts.bolsterScale is the
	// bolsterer's presence scale, 1 for a caller that does not know who is bolstering.
	const bolstered = !!opts.bolstered;
	const bolsterScale = typeof opts.bolsterScale === 'number' ? opts.bolsterScale : 1;
	const effectiveLevel = bolstered ? liftedStrainLevel(heldLevel) : heldLevel;
	const strain = strainMultiplierFor(effectiveLevel);

	// the lift is priced as a delta so the bolsterer's charisma can scale exactly what the
	// bolster added and nothing else
	const unlifted = base * matchup * homeGround * strainMultiplierFor(heldLevel);
	let value = unlifted + (base * matchup * homeGround * strain - unlifted) * bolsterScale;
	if (bolstered && heldLevel === 'none') {
		const floorBonus = rules && typeof rules.bolsterFloor === 'number' ? rules.bolsterFloor : BOLSTER_FLOOR;
		value += floorBonus * bolsterScale;
	}

	const kinAtSite = typeof opts.packBondedKinAtSite === 'number' ? opts.packBondedKinAtSite : 0;
	const alliesAtSite = typeof opts.solitaryAlliesAtSite === 'number' ? opts.solitaryAlliesAtSite : 0;
	if (kinAtSite > 0 && hasAnyTraitKeyword(record, 'pack-bonded')) {
		value += kinAtSite; // PACK_BOND_HOLD_BONUS_PER_KIN = 1, folded in directly here
	}
	if (alliesAtSite > 0 && hasAnyTraitKeyword(record, 'solitary')) {
		value -= alliesAtSite; // SOLITARY_HOLD_PENALTY_PER_ALLY = 1
	}

	// `level` is the creature's own strain grade, as the plinth prints it; `effectiveLevel`
	// is the grade actually used for the arithmetic once willpower and a bolsterer have
	// lifted it.
	return { value, level, heldLevel, effectiveLevel, willful, bolstered, isHome, matchup };
}

// ---------------------------------------------------------------------------
// speed, willpower, presence (assumption 17: every attribute a job)
// ---------------------------------------------------------------------------

/*
	speedOf(record) -> the mean of reflex and agility.

	Named `initiative` until Pass 2's vocabulary ruling. Speed orders the attacks at a
	world and, at or above rules.swiftSpeed, lets the creature move once per round during
	Deploy (assumption 20).
*/
export function speedOf(record: XalianRecord): number {
	const attrs = (record && record.attributes) || ({} as Partial<XalianRecord['attributes']>);
	const reflex = typeof attrs.reflex === 'number' ? attrs.reflex : 0;
	const agility = typeof attrs.agility === 'number' ? attrs.agility : 0;
	return (reflex + agility) / 2;
}

// DEPRECATED, one pass only: the old name for speedOf. Callers outside this package are
// being moved to speedOf; do not add new uses.
export const initiativeOf = speedOf;

export function isSwift(record: XalianRecord, rules?: Partial<Rules> | null): boolean {
	if (rules && rules.swiftMove === false) {
		return false;
	}
	const threshold = rules && typeof rules.swiftSpeed === 'number' ? rules.swiftSpeed : SWIFT_SPEED;
	return speedOf(record) >= threshold;
}

export function isWillful(record: XalianRecord, rules?: Partial<Rules> | null): boolean {
	if (rules && rules.willful === false) {
		return false;
	}
	const threshold = rules && typeof rules.willfulThreshold === 'number' ? rules.willfulThreshold : WILLFUL_THRESHOLD;
	const attrs = (record && record.attributes) || ({} as Partial<XalianRecord['attributes']>);
	const willpower = typeof attrs.willpower === 'number' ? attrs.willpower : 0;
	return willpower >= threshold;
}

// ---------------------------------------------------------------------------
// acts
// ---------------------------------------------------------------------------

// printed(ability) = max(1, round((intensity / 10) * (0.5 + governingAttr / 100))) - same
// formula the first design's tributeCardBuilder.js uses (printedPower), governing
// attribute looked up per this design's own action table since the action vocabulary and
// its class groupings differ from the first design.
export function magnitudeOf(intensity: number, governingAttrValue: number | undefined): number {
	const attr = typeof governingAttrValue === 'number' ? governingAttrValue : 50;
	const raw = (intensity / 10) * (0.5 + attr / 100);
	return Math.max(1, Math.round(raw));
}

function abilitiesOf(record: XalianRecord | null | undefined): XalianRecord['abilities'] {
	return Array.isArray(record && record.abilities) ? (record as XalianRecord).abilities : [];
}

/*
	buildActs(record, strainMult) -> [{ name, action, class, magnitude, instrument,
	signature }] - one act per ability, magnitude computed against strain only (the
	type-chart-vs-target scaling happens later, per-target, in magnitudeAgainst).
*/
export function buildActs(record: XalianRecord, strainMult: number, magnitudeScale?: number): Act[] {
	// the global magnitude rescale (assumption 12) is applied here, once, so every
	// downstream reading of an act's magnitude is already in the game's own units
	const scale = typeof magnitudeScale === 'number' ? magnitudeScale : MAGNITUDE_SCALE;
	return abilitiesOf(record).map((ability) => {
		const governingAttribute = getGoverningAttributeForAction(ability.action);
		const attrs = (record && record.attributes) as unknown as Record<string, number> || {};
		const attrValue = governingAttribute ? attrs[governingAttribute] : undefined;
		const printed = magnitudeOf(ability.intensity, attrValue);
		return {
			name: ability.name,
			action: ability.action,
			class: getActClass(ability.action) as ActClass | null,
			// the printed magnitude the record would carry on a plate, before strain and
			// before the game's own rescale, kept for the dossier
			printedMagnitude: printed,
			magnitude: round1(Math.max(0, printed * strainMult * scale)),
			instrument: ability.instrument,
			signature: !!ability.signature,
		};
	});
}

// one decimal place everywhere a magnitude or a hold is shown or subtracted, so the
// balance bar moves by a number a handler can read off the plinth
export function round1(value: number): number {
	return Math.round(value * 10) / 10;
}

/*
	magnitudeAgainst(actor, act, target) -> number

	actor/target are prepared creature-on-table views (from prepare()) or raw records +
	strain level; act is one entry from buildActs(). Applies the type chart (actor
	element vs target element, blended target secondary) on top of the act's own
	strain-scaled base magnitude. Strain is already folded into act.magnitude by
	buildActs(), so this only adds the target matchup.
*/
export function magnitudeAgainst(actorRecord: XalianRecord, act: Act, targetRecord: XalianRecord): number {
	const matchup = targetMatchupMultiplier(actorRecord, targetRecord);
	return round1(Math.max(0.1, act.magnitude * matchup));
}

// ---------------------------------------------------------------------------
// favored act (used when a creature is not given an order)
// ---------------------------------------------------------------------------

const HOLD_ACT: Act = { action: 'hold', class: null, magnitude: 0, printedMagnitude: 0, name: 'Hold' };

/*
	favoredAct(record, acts) -> one entry of `acts`, or a synthetic { action: 'hold' }.

	Resolves the archetype's FAVORED_ACT_BY_ARCHETYPE spec against the creature's actual
	ability list (see expeditionInterpretation.ts's long comment on that table for the
	reasoning). Falls back to 'hold' if the archetype favors a specific action the
	creature does not have, or if the creature has no acts of the preferred classes.
*/
export function favoredAct(record: XalianRecord, acts: Act[]): Act {
	const archetypeKey = record && record.archetype && record.archetype.key;
	const spec = getFavoredActSpec(archetypeKey);
	if (!spec || acts.length === 0) {
		return HOLD_ACT;
	}

	if (spec.prefer === 'hold') {
		return HOLD_ACT;
	}

	if (spec.prefer === 'specificAction') {
		const found = acts.find((a) => a.action === spec.action);
		if (found) {
			return found;
		}
		return HOLD_ACT;
	}

	if (spec.prefer === 'strongestOverall') {
		return acts.reduce((best: Act | null, a) => (!best || a.magnitude > best.magnitude ? a : best), null) as Act;
	}

	if (spec.prefer === 'strongestOfClass') {
		const classes = spec.classes || [];
		const inClass = acts.filter((a) => a.class !== null && classes.includes(a.class));
		if (inClass.length === 0) {
			return HOLD_ACT;
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

	return HOLD_ACT;
}

// ---------------------------------------------------------------------------
// roles (docs/design/reclamation-base-redesign.md assumption 4)
// ---------------------------------------------------------------------------

/*
	roleOf(record, rules) -> 'strike' | 'sweep' | 'bolster' | 'shield' | 'none'

	Every creature is a hold and exactly one role. The rule, written down once:

	1. The four PRESENCE archetypes (survivor, bulwark, stalwart, sage) are presences.
	   Between the two presences the default is shield for bulwark and stalwart, bolster
	   for survivor and sage (PRESENCE_BY_ARCHETYPE). "Unless the record's abilities
	   clearly say otherwise" is read as: a presence that carries a ward ability and no
	   mend ability is a shield whatever its archetype says, and one that carries a mend
	   and no ward is a bolster. Carrying both, or neither, leaves the archetype's default
	   standing, since nothing in the record then points one way.
	2. Everyone else is a blow: a SWEEP if it carries any of the sweep abilities
	   (burst, spray, cloud), else a STRIKE.

	`rules.roles` is the ablation switch (assumption 15): a role turned off degrades the
	creature to a plain strike if it was a sweep, and to a plain holder (ROLE.NONE) if it
	was a presence, so a batch can measure what each role actually carries.
*/
export function roleOf(record: XalianRecord, rules?: Partial<Rules> | null): Role {
	const natural = naturalRoleOf(record);
	const toggles = (rules && rules.roles) || null;
	if (!toggles) {
		return natural;
	}
	if (natural === ROLE.SWEEP && toggles.sweep === false) {
		return ROLE.STRIKE as Role;
	}
	if (natural === ROLE.BOLSTER && toggles.bolster === false) {
		return ROLE.NONE as Role;
	}
	if (natural === ROLE.SHIELD && toggles.shield === false) {
		return ROLE.NONE as Role;
	}
	return natural;
}

// the role before any ablation switch is applied
export function naturalRoleOf(record: XalianRecord): Role {
	const archetypeKey = record && record.archetype && record.archetype.key
		? String(record.archetype.key).toLowerCase()
		: null;
	const abilityActions = abilitiesOf(record).map((a) => a.action);

	const presenceDefault = archetypeKey
		? (PRESENCE_BY_ARCHETYPE as Record<string, Role>)[archetypeKey]
		: undefined;
	if (presenceDefault) {
		const hasWard = abilityActions.includes(WARD_ABILITY_ACTION);
		const hasMend = abilityActions.includes(MEND_ABILITY_ACTION);
		if (hasWard && !hasMend) {
			return ROLE.SHIELD as Role;
		}
		if (hasMend && !hasWard) {
			return ROLE.BOLSTER as Role;
		}
		return presenceDefault;
	}

	return abilityActions.some((a) => (SWEEP_ABILITY_ACTIONS as string[]).includes(a)) ? (ROLE.SWEEP as Role) : (ROLE.STRIKE as Role);
}

/*
	blowActOf(record, acts, role) -> one entry of `acts`, or a synthetic minimum strike.

	A blow creature throws one blow: the magnitude of its favored ATTACKING ability
	(assumption 4 keeps the existing favoredAct machinery), rescaled by the magnitude
	scale that buildActs has already folded in. A sweep throws its strongest sweep
	ability, since that is what made it a sweep in the first place. A blow creature with
	no attacking ability at all strikes at MIN_BLOW_MAGNITUDE; `fallback` marks that case
	so the simulator can count how often it fires.
*/
export function blowActOf(record: XalianRecord, acts: Act[], role: Role): Act | null {
	const minimum: Act = {
		name: 'Blow',
		action: 'strike',
		class: ACT_CLASS.CONTACT as ActClass,
		printedMagnitude: MIN_BLOW_MAGNITUDE,
		magnitude: MIN_BLOW_MAGNITUDE,
		fallback: true,
	};
	if (role !== ROLE.STRIKE && role !== ROLE.SWEEP) {
		return null;
	}
	const attacking = acts.filter((a) => a.class !== (ACT_CLASS.SUPPORT as ActClass));
	if (role === ROLE.SWEEP) {
		const sweeps = acts.filter((a) => (SWEEP_ABILITY_ACTIONS as string[]).includes(a.action));
		if (sweeps.length > 0) {
			return sweeps.reduce((best, a) => (!best || a.magnitude > best.magnitude ? a : best));
		}
	}
	if (attacking.length === 0) {
		return minimum;
	}
	const favored = favoredAct(record, acts);
	if (favored && favored.action !== 'hold' && favored.class !== (ACT_CLASS.SUPPORT as ActClass)
		&& attacking.some((a) => a.action === favored.action && a.name === favored.name)) {
		return favored;
	}
	return attacking.reduce((best, a) => (!best || a.magnitude > best.magnitude ? a : best));
}

// ---------------------------------------------------------------------------
// conduct
// ---------------------------------------------------------------------------

export function conductOf(record: XalianRecord): Conduct {
	const archetypeKey = record && record.archetype && record.archetype.key;
	const spec = getConductSpec(archetypeKey);
	const temperament = (record && record.temperament) || ({} as Partial<XalianRecord['temperament']>);
	const at = (v: number | undefined) => (typeof v === 'number' ? v : 50);
	return {
		attacking: spec ? spec.attacking : 'enemySentEarliest',
		supporting: spec ? spec.supporting : 'allySentEarliest',
		boldness: at(temperament.boldness),
		curiosity: at(temperament.curiosity),
		energy: at(temperament.energy),
		aggression: at(temperament.aggression),
		sociability: at(temperament.sociability),
		isHighBoldness: at(temperament.boldness) >= TEMPERAMENT_HIGH_THRESHOLD,
		isLowBoldness: at(temperament.boldness) <= TEMPERAMENT_LOW_THRESHOLD,
		isHighSociability: at(temperament.sociability) >= TEMPERAMENT_HIGH_THRESHOLD,
		isHighCuriosity: at(temperament.curiosity) >= TEMPERAMENT_HIGH_THRESHOLD,
		isHighAggression: at(temperament.aggression) >= TEMPERAMENT_HIGH_THRESHOLD,
	};
}

// ---------------------------------------------------------------------------
// prepare() - the full derived view
// ---------------------------------------------------------------------------

/*
	prepare(record, site, world, sentIndex, opts) -> the full derived view of one creature
	standing at one site:

		record, id, site, world, sentIndex,
		baseHold, hold, holdMultiplier, isHome, bolstered,
		speed, willful, swift, presenceScale, strainLevel, effectiveStrainLevel, strainMultiplier,
		acts, favoredAct, role, blow, blowMagnitude, blowIsFallback,
		conduct, traitKeywords,
		stealthy, armored, resilient, menacing, packBonded, solitary

	`opts` may carry { packBondedKinAtSite, solitaryAlliesAtSite } for the trait hold
	adjustments, { bolstered: true } when a bolsterer stands at this site
	(docs/design/reclamation-base-redesign.md assumption 8), and { rules } so the hold
	compression, the magnitude scale and the role ablations travel with the match rather
	than being read off the module constants. The rules engine recomputes all of these
	whenever the company at a site changes.
*/
export function prepare(
	record: XalianRecord,
	site: AnySite | null | undefined,
	worldArg: WorldFacts | null | undefined,
	sentIndex: number,
	opts: PrepareOptions = {},
): PreparedCreature {
	const world = worldOfSite(site, worldArg);
	const rules = opts.rules as Partial<Rules> | undefined;
	const level = strainLevel(record, site, world);
	// willpower first, then bolster, and never past comfortable (assumption 17)
	const willful = isWillful(record, rules);
	const heldLevel = willful ? liftedStrainLevel(level) : level;
	const bolstered = !!opts.bolstered;
	const effectiveLevel = bolstered ? liftedStrainLevel(heldLevel) : heldLevel;
	const strainMult = strainMultiplierFor(effectiveLevel);
	const { value: hold, isHome, matchup } = holdAtSite(record, site, world, opts);
	const magnitudeScale = rules && typeof rules.magnitudeScale === 'number' ? rules.magnitudeScale : MAGNITUDE_SCALE;
	const acts = buildActs(record, strainMult, magnitudeScale);
	const traitKeywords = traitKeywordsOf(record);
	const role = roleOf(record, rules);
	const blow = blowActOf(record, acts, role);

	return {
		record,
		id: record.id,
		site: site || null,
		world,
		sentIndex,
		baseHold: baseHold(record, rules),
		hold,
		holdMultiplier: matchup,
		isHome,
		bolstered,
		// Pass 2 vocabulary (assumption 17): initiative is speed everywhere the table can
		// read it. `willful`, `swift` and `presenceScale` are the other three attribute
		// jobs, exposed so the plinth and the preview can print them.
		speed: speedOf(record),
		willful,
		swift: isSwift(record, rules),
		presenceScale: presenceScaleOf(record, rules),
		strainLevel: level,
		heldStrainLevel: heldLevel,
		effectiveStrainLevel: effectiveLevel,
		strainMultiplier: strainMult,
		acts,
		favoredAct: favoredAct(record, acts),
		// the base redesign's four roles (assumption 4); `blow` is null for a presence and
		// for a creature whose role has been switched off by a rules ablation
		role,
		blow,
		blowMagnitude: blow ? blow.magnitude : 0,
		blowIsFallback: !!(blow && blow.fallback),
		conduct: conductOf(record),
		traitKeywords,
		stealthy: traitKeywords.includes('stealthy'),
		armored: traitKeywords.includes('armored'),
		resilient: traitKeywords.includes('resilient'),
		menacing: traitKeywords.includes('menacing'),
		packBonded: traitKeywords.includes('pack-bonded'),
		solitary: traitKeywords.includes('solitary'),
	};
}
