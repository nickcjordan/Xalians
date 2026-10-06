// SpeciesView: builds the encyclopedia's view of each species from its v5
// template (canonicalSpeciesCatalog.json) and resolves registry vocabularies
// to display names.

import { speciesList, templateRecordsByKey, registries, lookupInstrument } from './loaders';
import { getEntry } from './entries';
import { getWorld, _attachNativeSpecies } from './worlds';

// Display rows for v5 vocabulary that registries.json does not carry yet:
// that file is still pinned by the legacy v4 generator, whose schema enums are
// generated from it. Sources: lowlight, docs/design/creature-model-current.md;
// fins, docs/design/creature-derived-acts.md; temperament axes,
// docs/design/xalian-creature-system-redesign.md; traversal,
// creature-model-current.md. Fold these into registries.json when v4 retires.
const V5_ONLY_ROWS = {
	lowlight: { name: 'Lowlight', nature: 'Sees in dim light. Not vision in total darkness, and not heat sense.' },
	fins: { name: 'Fins', nature: 'Fins that steer and drive the body, and can strike or shove at contact.' },
	phase: { name: 'Phases through walls', nature: 'Passes through solid walls and barriers.' },
	seep: { name: 'Seeps through openings', nature: 'Flows through cracks and openings too small for its body.' },
};

const TRIGGER_TEXT = { contact: 'When touched', harmed: 'When harmed', 'ally-harmed': 'When an ally is harmed' };

const TEMPERAMENT_AXES = ['boldness', 'curiosity', 'energy', 'aggression', 'sociability'];

function resolveRegistry(map, key) {
	const item = map.get(key) || V5_ONLY_ROWS[key];
	return item ? { key, name: item.name, nature: item.nature } : { key, name: capitalize(key), nature: '' };
}

function capitalize(text) {
	return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

function buildAttributes(attributes) {
	// attributes in registry order (per contract), not record-object order.
	return [...registries.attributes.keys()]
		.filter((key) => attributes[key] !== undefined)
		.map((key) => ({ ...resolveRegistry(registries.attributes, key), band: attributes[key] }));
}

function buildCapabilities(capabilities) {
	return [...registries.capabilities.keys()]
		.filter((key) => capabilities[key] !== undefined)
		.map((key) => ({ ...resolveRegistry(registries.capabilities, key), band: capabilities[key] }));
}

function buildSenses(senses) {
	const graded = [...registries.senses.keys()]
		.filter((key) => senses[key] !== undefined)
		.map((key) => ({ ...resolveRegistry(registries.senses, key), band: senses[key] }));
	const special = (senses.special || []).map((key) => resolveRegistry(registries.senses, key));
	return { graded, special };
}

function buildPhysiology(physiology) {
	const result = {};
	for (const [field, registryMap] of Object.entries(registries.physiology)) {
		if (field === 'composition') continue; // handled below: {primary, secondary}
		const value = physiology[field];
		if (value === undefined) continue;
		if (Array.isArray(value)) {
			result[field] = value.map((key) => resolveRegistry(registryMap, key));
		} else if (typeof value === 'string') {
			result[field] = resolveRegistry(registryMap, value);
		} else {
			result[field] = value;
		}
	}
	if (physiology.composition) {
		const compositionMap = registries.physiology.composition;
		result.composition = {
			primary: resolveRegistry(compositionMap, physiology.composition.primary),
			secondary: physiology.composition.secondary
				? resolveRegistry(compositionMap, physiology.composition.secondary)
				: undefined,
		};
	}
	// Nested fields whose leaves are registry keys: resolve the leaves, keep the shape.
	const media = registries.physiology.media;
	if (physiology.breathes) result.breathes = physiology.breathes.map((key) => resolveRegistry(media, key));
	if (physiology.environmentalTolerance) {
		const tol = physiology.environmentalTolerance;
		result.environmentalTolerance = {
			ambientMedia: (tol.ambientMedia || []).map((key) => resolveRegistry(media, key)),
			temperatureC: tol.temperatureC,
		};
	}
	if (physiology.genome) {
		result.genome = { chirality: resolveRegistry(registries.physiology.chirality, physiology.genome.chirality) };
	}
	if (physiology.size !== undefined) result.size = physiology.size;
	result.protections = (physiology.protections || []).map(describeProtection);
	result.traversal = (physiology.traversal || []).map((key) => resolveRegistry(new Map(), key));
	return result;
}

function describeProtection(p) {
	const against = p.mechanism === 'elemental' && p.element ? capitalize(p.element) : capitalize(p.mechanism || p.status || p.type);
	return `${capitalize(p.degree)} to ${against.toLowerCase()} harm`;
}

function buildTemperament(temperament) {
	return TEMPERAMENT_AXES
		.filter((key) => temperament && temperament[key] !== undefined)
		.map((key) => ({ key, name: capitalize(key), band: temperament[key] }));
}

function instrumentName(key) {
	const item = lookupInstrument(key) || V5_ONLY_ROWS[key];
	return item ? item.name : capitalize(key);
}

// One plain phrase per effect, in the v5 effect vocabulary.
function describeEffect(effect) {
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

function intensityText(effects) {
	const values = effects
		.map((e) => e.intensity)
		.filter((v) => v !== undefined)
		.map((v) => (Array.isArray(v) ? `${v[0]} to ${v[1]}` : String(v)));
	return values.length > 0 ? values.join(', ') : undefined;
}

// A guaranteed action or passive, flattened for display.
function buildAbility(ability, kind, signatureKey) {
	return {
		key: ability.key,
		name: ability.name,
		description: ability.description,
		kind,
		signature: ability.key === signatureKey,
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

function buildAbilities(template) {
	const signatureKey = template.signature && template.signature.key;
	const abilities = [
		...template.actions.map((a) => buildAbility(a, 'action', signatureKey)),
		...template.passives.map((a) => buildAbility(a, 'passive', signatureKey)),
	];
	// Signature first, then the other guaranteed abilities in authored order.
	return [...abilities.filter((a) => a.signature), ...abilities.filter((a) => !a.signature)];
}

function buildConduits(conduits) {
	return Object.entries(conduits || {}).map(([instrument, element]) => ({
		key: instrument,
		name: instrumentName(instrument),
		element,
	}));
}

function buildTemplateView(species, template) {
	return {
		key: species.key,
		name: template.name,
		nameOrigin: template.nameOrigin,
		element: template.element,
		homePlanet: template.homePlanet,
		get planet() {
			return getWorld(template.homePlanet);
		},
		source: 'template',
		portrait: { svgName: species.key },
		description: template.lore.description,
		appearance: template.lore.appearance,
		fields: ['origin', 'habitat', 'feeding', 'behavior', 'company'].filter((k) => template.lore[k]).map((k) => ({ key: k, label: k.charAt(0).toUpperCase() + k.slice(1), text: template.lore[k] })),
		entry: getEntry(species.key),
		record: {
			physiology: buildPhysiology(template.physiology),
			attributes: buildAttributes(template.attributes),
			temperament: buildTemperament(template.temperament),
			capabilities: buildCapabilities(template.physiology.capabilities),
			senses: buildSenses(template.physiology.senses),
			anatomy: (template.physiology.anatomy || []).map((key) => ({ key, name: instrumentName(key) })),
			channels: (template.channels || []).map((key) => ({ key, name: instrumentName(key) })),
			conduits: buildConduits(template.conduits),
			abilities: buildAbilities(template),
		},
	};
}

const speciesViewsByKey = new Map();

for (const species of speciesList) {
	speciesViewsByKey.set(species.key, buildTemplateView(species, templateRecordsByKey.get(species.key)));
}

const speciesViewsSortedByName = [...speciesViewsByKey.values()].sort((a, b) =>
	a.name.localeCompare(b.name)
);

// Fill PlanetView.nativeSpecies now that every SpeciesView exists.
_attachNativeSpecies(speciesViewsSortedByName);

export function getSpeciesList() {
	return speciesViewsSortedByName;
}

export function getSpecies(key) {
	return speciesViewsByKey.get(key);
}
