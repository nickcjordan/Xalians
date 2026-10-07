// SpeciesView: builds the encyclopedia's view of each species from its v5
// template (canonicalSpeciesCatalog.json) and resolves registry vocabularies
// to display names.

import { speciesList, templateRecordsByKey, registries } from './loaders';
import { getEntry } from './entries';
import { getWorld, _attachNativeSpecies } from './worlds';
import {
	TEMPERAMENT_AXES, buildAbility, capitalize, describeProtection, instrumentName, resolveRegistry,
} from './vocabulary';

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

function buildTemperament(temperament) {
	return TEMPERAMENT_AXES
		.filter((key) => temperament && temperament[key] !== undefined)
		.map((key) => ({ key, name: capitalize(key), band: temperament[key] }));
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
