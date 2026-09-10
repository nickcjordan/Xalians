import registriesData from '@xalians/content/registries.json';

/**
 * Display vocabulary for one ratified creature record.
 *
 * Every controlled key in a record (an anatomy part, an action, a trait, a
 * covering) is a registry key, and `registries.json` carries the one
 * canonical display name and one-line nature for each
 * (docs/design/xalian-creature-data-structure.md section 4). Nothing here
 * invents a label: an unknown key falls back to the key itself, so a
 * vocabulary addition shows up as a raw key rather than breaking the page.
 */

type RegistryEntry = { key: string; name: string; nature?: string };
type Registry = Map<string, RegistryEntry>;

const data = registriesData as unknown as {
	attributes: RegistryEntry[];
	archetypes: Array<RegistryEntry & { favors?: string[] }>;
	traits: RegistryEntry[];
	elements: RegistryEntry[];
	capabilities: RegistryEntry[];
	senses: Array<RegistryEntry & { special?: boolean }>;
	anatomy: RegistryEntry[];
	channels: RegistryEntry[];
	actions: RegistryEntry[];
	physiology: Record<string, RegistryEntry[]>;
};

const toMap = (list: RegistryEntry[] | undefined): Registry =>
	new Map((list || []).map((item) => [item.key, item]));

const REGISTRY = {
	attributes: toMap(data.attributes),
	archetypes: toMap(data.archetypes),
	traits: toMap(data.traits),
	elements: toMap(data.elements),
	capabilities: toMap(data.capabilities),
	senses: toMap(data.senses),
	anatomy: toMap(data.anatomy),
	channels: toMap(data.channels),
	actions: toMap(data.actions),
	physiology: Object.fromEntries(
		Object.entries(data.physiology || {}).map(([field, list]) => [field, toMap(list)])
	) as Record<string, Registry>,
};

export type Term = { key: string; name: string; nature: string };

// A key with no registry row still gets a readable label rather than a bare
// slug: the record's instance-level chirality values (levo, dextro, achiral)
// are the live case, since registries.json's chirality vocabulary describes the
// species template's roll mode, not the individual's value.
function titleCase(key: string): string {
	return key
		.split(/[-_]/)
		.map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
		.join(' ');
}

function fromRegistry(registry: Registry | undefined, key: string): Term {
	const entry = registry && registry.get(key);
	return { key, name: entry ? entry.name : titleCase(key), nature: entry && entry.nature ? entry.nature : '' };
}

export const attributeTerm = (key: string) => fromRegistry(REGISTRY.attributes, key);
export const archetypeTerm = (key: string) => fromRegistry(REGISTRY.archetypes, key);
export const traitTerm = (key: string) => fromRegistry(REGISTRY.traits, key);
export const elementTerm = (key: string) => fromRegistry(REGISTRY.elements, key);
export const capabilityTerm = (key: string) => fromRegistry(REGISTRY.capabilities, key);
export const senseTerm = (key: string) => fromRegistry(REGISTRY.senses, key);
export const actionTerm = (key: string) => fromRegistry(REGISTRY.actions, key);
export const physiologyTerm = (field: string, key: string) => fromRegistry(REGISTRY.physiology[field], key);

/** An instrument is an anatomy part or one of the seven innate channels. */
export const instrumentTerm = (key: string): Term =>
	REGISTRY.anatomy.has(key) ? fromRegistry(REGISTRY.anatomy, key) : fromRegistry(REGISTRY.channels, key);

/** Registry order, not record-object order, for the ten frozen attributes. */
export const ATTRIBUTE_ORDER: string[] = (data.attributes || []).map((a) => a.key);
export const CAPABILITY_ORDER: string[] = (data.capabilities || []).map((c) => c.key);

/** The five temperament axes, in the order the record and the design doc list them. */
export const TEMPERAMENT_ORDER = ['boldness', 'curiosity', 'energy', 'aggression', 'sociability'];

const TEMPERAMENT_NATURE: Record<string, string> = {
	boldness: 'How readily it faces what it does not know.',
	curiosity: 'How much the unfamiliar draws it in.',
	energy: 'How restless it is when nothing is happening.',
	aggression: 'How quickly it answers a challenge with force.',
	sociability: 'How much it seeks the company of others.',
};

export const temperamentTerm = (key: string): Term => ({
	key,
	name: key.charAt(0).toUpperCase() + key.slice(1),
	nature: TEMPERAMENT_NATURE[key] || '',
});

/**
 * A word for an ability's intensity. Intensity is 1 to 100 and describes how
 * forcefully the creature performs the act, so the record view leads with the
 * word and prints the number beside it. Display only, and a tuned lever: no
 * rule reads these cuts.
 */
export function intensityBand(intensity: number): string {
	if (intensity <= 20) return 'Faint';
	if (intensity <= 40) return 'Slight';
	if (intensity <= 60) return 'Measured';
	if (intensity <= 80) return 'Strong';
	return 'Overwhelming';
}

/** `204 cm` as `80 in / 204 cm`, the two-unit form the species pages use. */
export function heightBoth(cm: number): string {
	return `${Math.round(cm / 2.54)} in / ${Math.round(cm)} cm`;
}

/** `243 kg` as `536 lb / 243 kg`. */
export function weightBoth(kg: number): string {
	return `${Math.round(kg * 2.2046).toLocaleString()} lb / ${Math.round(kg).toLocaleString()} kg`;
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
