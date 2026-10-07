import speciesCatalog from '@xalians/content/canonicalSpeciesCatalog.json';
import type { CreatureRecord, Species } from '@xalians/content/creature';
import * as lore from '../../lore';

/**
 * Display vocabulary for one v5 creature record (CreatureRecord).
 *
 * Every controlled key in a record is a registry key, and registries.json
 * carries its display name and one-line nature; v5 keys that file does not
 * carry yet (lowlight, fins, phase, seep, the temperament axes, an
 * individual's chirality) come from lore's V5_ONLY_ROWS. The resolution lives
 * in lore/vocabulary.js, shared with the encyclopedia's species pages; this
 * module only types it for the record components. Nothing here invents a
 * label: an unknown key falls back to a title-cased key.
 */

export type Term = { key: string; name: string; nature: string };

const templates = new Map(
	(Object.values(speciesCatalog) as unknown as Species[]).map((species) => [species.key, species])
);

/** The v5 species template a record was generated from. */
export function speciesTemplate(key: string): Species | undefined {
	return templates.get(key);
}

/** The species' display name, from its v5 template. */
export function speciesName(key: string): string {
	return templates.get(key)?.name ?? capitalize(key);
}

const termOf = (vocabulary: string) => (key: string): Term => lore.term(vocabulary, key);

export const attributeTerm = termOf('attributes');
export const elementTerm = termOf('elements');
export const capabilityTerm = termOf('capabilities');
export const senseTerm = termOf('senses');
export const physiologyTerm = (field: string, key: string): Term => lore.term(`physiology.${field}`, key);
export const temperamentTerm = (key: string): Term => lore.term('temperament', key);
export const instrumentTerm = (key: string): Term => lore.resolveInstrument(key);

/** Registry order, not record-object order. */
export const ATTRIBUTE_ORDER: string[] = lore.vocabularyOrder('attributes');
export const CAPABILITY_ORDER: string[] = lore.vocabularyOrder('capabilities');
export const GRADED_SENSES = ['sight', 'hearing', 'smell'] as const;
export const TEMPERAMENT_ORDER: string[] = lore.TEMPERAMENT_AXES;

export const TERM_DEFS = lore.TERM_DEFS as Record<string, string>;

/**
 * The scale a group of open-ended ratings is drawn against: 100 unless a
 * rating in the group passes it, so a creature rated above 100 shows a bar
 * that is longer than one at 100 instead of two full bars. Ratings compare
 * creatures (50 is the standard reference); 100 is not a ceiling.
 */
export function ratingScale(values: number[]): number {
	const top = Math.max(100, ...values);
	return top <= 100 ? 100 : Math.ceil(top / 10) * 10;
}

/** The highest-rated keys of a ratings map, in the order given. */
export function strongest<T extends string>(order: readonly T[], values: Partial<Record<T, number>>, count: number) {
	return order
		.filter((key) => typeof values[key] === 'number')
		.map((key) => ({ key, value: values[key] as number }))
		.sort((a, b) => b.value - a.value)
		.slice(0, count);
}

/** The overall dimensions a record carries, in a fixed order, each in both units. */
export function dimensions(physiology: CreatureRecord['physiology']): Array<{ key: string; label: string; value: string }> {
	return ([['heightCm', 'Height'], ['lengthCm', 'Length'], ['widthCm', 'Width']] as const)
		.filter(([field]) => typeof physiology[field] === 'number')
		.map(([field, label]) => ({ key: field, label, value: lengthBoth(physiology[field] as number) }));
}

const round = (n: number) => (n < 10 ? Math.round(n * 10) / 10 : Math.round(n));

/** `204 cm` as `80 in / 204 cm`, the two-unit form the species pages use. */
export function lengthBoth(cm: number): string {
	return `${round(cm / 2.54).toLocaleString()} in / ${round(cm).toLocaleString()} cm`;
}

/** `243 kg` as `536 lb / 243 kg`; a small body keeps one decimal. */
export function massBoth(kg: number): string {
	return `${round(kg * 2.2046).toLocaleString()} lb / ${round(kg).toLocaleString()} kg`;
}

/** An absolute date, per the content rules (docs/DESIGN_SYSTEM.md section 9). */
export function generatedOn(iso: string): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return iso;
	return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

/** The same date with the month abbreviated, for a tile that cannot spare two lines. */
export function generatedOnShort(iso: string): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return iso;
	return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function capitalize(text: string): string {
	return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

/** The record's actions and passives flattened for AbilityCard, signature first. */
export function recordAbilities(record: CreatureRecord) {
	const template = speciesTemplate(record.species);
	const guaranteed = new Set([...(template?.actions ?? []), ...(template?.passives ?? [])].map((a) => a.key));
	const abilities = [
		...record.actions.map((a) => lore.buildAbility(a, 'action', record.signature.key, guaranteed.has(a.key))),
		...record.passives.map((a) => lore.buildAbility(a, 'passive', record.signature.key, true)),
	];
	return [...abilities.filter((a) => a.signature), ...abilities.filter((a) => !a.signature)];
}

/** The signature ability, actions or passives, as the record names it. */
export function signatureAbility(record: CreatureRecord) {
	const list = record.signature.type === 'action' ? record.actions : record.passives;
	return list.find((ability) => ability.key === record.signature.key);
}
