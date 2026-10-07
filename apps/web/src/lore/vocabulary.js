// Display vocabulary for the v5 creature model, shared by the encyclopedia's
// species pages (lore/species.js) and the registry's record view
// (components/record). React-free, like the rest of lore/.
//
// Registry keys resolve through registries.json; the rows below cover v5
// vocabulary that file does not carry yet.

import { registries, lookupInstrument } from './loaders';

// Display rows for v5 vocabulary that registries.json does not carry yet:
// that file is still pinned by the legacy v4 generator, whose schema enums are
// generated from it. Sources: lowlight, docs/design/creature-model-current.md;
// fins, docs/design/creature-derived-acts.md; temperament axes,
// docs/design/xalian-creature-system-redesign.md; traversal,
// creature-model-current.md. Fold these into registries.json when v4 retires.
export const V5_ONLY_ROWS = {
	lowlight: { name: 'Lowlight', nature: 'Sees in dim light. Not vision in total darkness, and not heat sense.' },
	fins: { name: 'Fins', nature: 'Fins that steer and drive the body, and can strike or shove at contact.' },
	phase: { name: 'Phases through walls', nature: 'Passes through solid walls and barriers.' },
	seep: { name: 'Seeps through openings', nature: 'Flows through cracks and openings too small for its body.' },
	boldness: { name: 'Boldness', nature: 'How readily it faces what it does not know.' },
	curiosity: { name: 'Curiosity', nature: 'How much the unfamiliar draws it in.' },
	energy: { name: 'Energy', nature: 'How restless it is when nothing is happening.' },
	aggression: { name: 'Aggression', nature: 'How quickly it answers a challenge with force.' },
	sociability: { name: 'Sociability', nature: 'How much it seeks the company of others.' },
	// An individual's rolled chirality; the registry's chirality rows describe the species' roll mode.
	levo: { name: 'Levo', nature: 'Left-handed molecular chirality.' },
	dextro: { name: 'Dextro', nature: 'Right-handed molecular chirality.' },
};

/**
 * Definitions for internal vocabulary that reaches the visitor undefined
 * (site audit issue #438). Registry fields quote
 * docs/species-templates/REGISTRY-DEFINITIONS.md's own one-line field
 * meaning where the doc states one; the rest are the ratified non-registry
 * text. One copy for the species page and the record view.
 */
export const TERM_DEFS = {
	composition: 'What the body is made of at rest.',
	bodyPlan: 'How the creature presents in the field and moves through it at rest.',
	covering: 'The outer surface of the resting body.',
	communication: 'Outward signaling to other creatures.',
	ambientMedia: 'The phases of matter the creature can sustain activity in: atmosphere, liquid, or vacuum.',
	lifespan: 'How long a working life this body has, from a season to something that never wears out.',
	chirality: "Which molecular handedness this individual's genome rolled, or whether its body has none to roll.",
	protections: 'Harm this body resists by nature, whatever it is doing.',
	traversal: 'Ways this body passes walls and openings that stop others.',
	registryDistinction: 'How far this record sits from a typical print of its species, measured against calibrated generations. Not combat power.',
	finish: 'The surface treatment this record was printed with. Most are standard.',
	rating: 'Ratings compare creatures: 50 is a standard reference, and values above 100 are allowed.',
	temperament: 'Character on five axes, each from 0 to 100. Not a measure of power.',
};

export const TRIGGER_TEXT = { contact: 'When touched', harmed: 'When harmed', 'ally-harmed': 'When an ally is harmed' };

export const TEMPERAMENT_AXES = ['boldness', 'curiosity', 'energy', 'aggression', 'sociability'];

export function capitalize(text) {
	return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

/** A registry key as { key, name, nature }, falling back to the v5-only rows, then to the key. */
export function resolveRegistry(map, key) {
	const item = (map && map.get(key)) || V5_ONLY_ROWS[key];
	return item ? { key, name: item.name, nature: item.nature || '' } : { key, name: capitalize(key), nature: '' };
}

/** An instrument: an anatomy part or a channel. */
export function resolveInstrument(key) {
	const item = lookupInstrument(key) || V5_ONLY_ROWS[key];
	return item ? { key, name: item.name, nature: item.nature || '' } : { key, name: capitalize(key), nature: '' };
}

export function instrumentName(key) {
	return resolveInstrument(key).name;
}

export function describeProtection(p) {
	const against = p.mechanism === 'elemental' && p.element ? capitalize(p.element) : capitalize(p.mechanism || p.status || p.type);
	return `${capitalize(p.degree)} to ${against.toLowerCase()} harm`;
}

// One plain phrase per effect, in the v5 effect vocabulary.
export function describeEffect(effect) {
	switch (effect.type) {
		case 'harm':
			return effect.mechanism === 'elemental' ? 'Elemental harm' : `${capitalize(effect.mechanism)} harm`;
		case 'status':
			return capitalize(effect.status);
		case 'restore':
			return 'Restores';
		case 'protect':
			return 'Protects';
		case 'displace':
			return effect.direction ? `Displaces ${effect.direction}` : 'Displaces';
		case 'remove':
			return `Removes (${(effect.methods || []).join(', ')})`;
		default:
			return capitalize(effect.type);
	}
}

// A species shows each effect's band; one creature shows its rolled number.
function intensityText(effects) {
	const values = effects
		.map((e) => e.intensity)
		.filter((v) => v !== undefined)
		.map((v) => (Array.isArray(v) ? `${v[0]} to ${v[1]}` : String(v)));
	return values.length > 0 ? values.join(', ') : undefined;
}

/**
 * An action or passive, from a species template or a generated record,
 * flattened for display. `guaranteed` is false for a record's drawn actions,
 * the ones its species does not always have.
 */
export function buildAbility(ability, kind, signatureKey, guaranteed = true) {
	return {
		key: ability.key,
		name: ability.name,
		description: ability.description,
		kind,
		signature: ability.key === signatureKey,
		guaranteed,
		instrument: instrumentName(ability.instrument),
		activation: ability.activation.trigger ? TRIGGER_TEXT[ability.activation.trigger] : ability.activation.continuity,
		delivery: ability.delivery.mode,
		// A contact range only restates contact delivery, so it is left out.
		range: ability.spatial && ability.spatial.range !== 'contact' ? ability.spatial.range : undefined,
		element: ability.element,
		effects: ability.effects.map(describeEffect).join(', '),
		intensity: intensityText(ability.effects),
	};
}

function vocabularyMap(vocabulary) {
	return vocabulary.startsWith('physiology.') ? registries.physiology[vocabulary.slice('physiology.'.length)] : registries[vocabulary];
}

/**
 * One key of a named vocabulary as { key, name, nature }: 'attributes',
 * 'capabilities', 'senses', 'elements', or 'physiology.<field>' (composition,
 * bodyPlan, covering, diet, communication, media, lifespan, chirality).
 */
export function term(vocabulary, key) {
	return resolveRegistry(vocabularyMap(vocabulary), key);
}

/** The keys of a vocabulary in registry order, so displays never follow record-object order. */
export function vocabularyOrder(vocabulary) {
	const map = vocabularyMap(vocabulary);
	return map ? [...map.keys()] : [];
}
