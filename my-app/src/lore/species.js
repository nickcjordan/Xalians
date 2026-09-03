// SpeciesView: builds a unified view from a ratified template
// (speciesRecords.json) when one exists, or from the legacy species.json
// stub otherwise. Also resolves registry vocabularies to display names.

import { legacySpeciesList, templateRecordsByKey, registries, lookupInstrument } from './loaders';
import { getEntry } from './entries';
import { getWorld, _attachNativeSpecies } from './worlds';

function resolveRegistry(map, key) {
	const item = map.get(key);
	return item ? { key, name: item.name, nature: item.nature } : { key, name: key, nature: '' };
}

function buildLegacyView(species) {
	const raw = species.raw;
	return {
		key: species.key,
		name: species.name,
		element: species.element,
		homePlanet: species.homePlanet,
		get planet() {
			return getWorld(species.homePlanet);
		},
		source: 'legacy',
		portrait: { svgName: species.key },
		description: raw.description,
		biomeNiche: undefined,
		entry: getEntry(species.key),
		legacy: {
			height: raw.height,
			weight: raw.weight,
			statRatings: raw.statRatings,
			traits: {
				attackRange: raw.traits.attackRange,
				canFly: raw.traits.canFly,
			},
		},
	};
}

function buildTraits(pool) {
	return Object.entries(pool)
		.filter(([, percent]) => percent > 0)
		.map(([key, percent]) => ({ ...resolveRegistry(registries.traits, key), percent }))
		.sort((a, b) => b.percent - a.percent);
}

function buildArchetypes(weights) {
	return Object.entries(weights)
		.map(([key, weight]) => ({ ...resolveRegistry(registries.archetypes, key), weight }))
		.sort((a, b) => b.weight - a.weight);
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

function buildInstruments(instrumentKeys) {
	return (instrumentKeys || []).map((key) => {
		const item = lookupInstrument(key);
		return item ? { key, name: item.name } : { key, name: key };
	});
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
	return result;
}

function buildSignature(signatureAbility) {
	if (!signatureAbility) return undefined;
	const instrument = lookupInstrument(signatureAbility.instrument);
	const action = registries.actions.get(signatureAbility.action);
	return {
		name: signatureAbility.name,
		instrument: instrument ? instrument.name : signatureAbility.instrument,
		action: action ? action.name : signatureAbility.action,
		medium: signatureAbility.medium,
		intensity: signatureAbility.intensity,
		description: signatureAbility.description,
	};
}

function buildTemplateView(species, template) {
	return {
		key: species.key,
		name: template.name,
		element: template.element,
		homePlanet: template.homePlanet,
		get planet() {
			return getWorld(template.homePlanet);
		},
		source: 'template',
		portrait: { svgName: species.key },
		description: template.lore.description,
		biomeNiche: template.lore.biomeNiche,
		entry: getEntry(species.key),
		record: {
			physiology: buildPhysiology(template.physiology),
			traits: buildTraits(template.traits.pool),
			archetypes: buildArchetypes(template.archetypeWeights),
			attributes: buildAttributes(template.attributes),
			capabilities: buildCapabilities(template.physiology.capabilities),
			senses: buildSenses(template.physiology.senses),
			instruments: buildInstruments(template.instruments),
			signature: buildSignature(template.signatureAbility),
		},
	};
}

const speciesViewsByKey = new Map();

for (const species of legacySpeciesList) {
	const template = templateRecordsByKey.get(species.key);
	const view = template ? buildTemplateView(species, template) : buildLegacyView(species);
	speciesViewsByKey.set(species.key, view);
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
