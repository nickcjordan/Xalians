/*
	Display vocabulary for the Reclamation table: registry keys resolved to the names and
	one-line natures the Encyclopedia uses, plus the species facts a dossier quotes.

	Everything here reads the bundled registry data (registries.json) and species records
	(speciesRecords.json) through the generator and lore layers; nothing is spelled out
	twice. Unknown keys fall back to the key itself, per the registry contract ("games
	ignore unknown keys").
*/

import registries from '../../../json/registries.json';
import { speciesDisplayName, getSpeciesTemplate } from '../../../gameplay/generator/index.js';

function toMap(list) {
	return new Map((list || []).map((item) => [item.key, item]));
}

const TRAITS = toMap(registries.traits);
const ARCHETYPES = toMap(registries.archetypes);
const ACTIONS = toMap(registries.actions);
const ATTRIBUTES = toMap(registries.attributes);
const ELEMENTS = toMap(registries.elements);
const ANATOMY = toMap(registries.anatomy);
const CHANNELS = toMap(registries.channels);
const MEDIA = toMap(registries.physiology && registries.physiology.media);
const COVERINGS = toMap(registries.physiology && registries.physiology.covering);
const BODY_PLANS = toMap(registries.physiology && registries.physiology.bodyPlan);

function nameOf(map, key) {
	const item = map.get(key);
	return item ? item.name : String(key || '');
}

function natureOf(map, key) {
	const item = map.get(key);
	return item ? item.nature : '';
}

export function speciesName(record) {
	if (!record) {
		return 'a creature';
	}
	return speciesDisplayName(record.species || record.name || record.id);
}

export function speciesFacts(record) {
	const template = record ? getSpeciesTemplate(record.species) : null;
	if (!template) {
		return null;
	}
	return {
		name: template.name,
		homePlanet: template.homePlanet,
		homePlanetName: template.homePlanet ? template.homePlanet.charAt(0).toUpperCase() + template.homePlanet.slice(1) : '',
		description: template.lore ? template.lore.description : '',
		biomeNiche: template.lore ? template.lore.biomeNiche : '',
	};
}

export function traitName(key) {
	return nameOf(TRAITS, key);
}

export function traitNature(key) {
	return natureOf(TRAITS, key);
}

// "Juggernaut, built with high strength and resilience" (Nick's binder rule: the favored
// attributes always travel with the archetype name)
export function archetypeLabel(archetype) {
	if (!archetype) {
		return '';
	}
	const key = typeof archetype === 'string' ? archetype : archetype.key;
	const row = ARCHETYPES.get(key);
	const favors = (typeof archetype === 'object' && Array.isArray(archetype.favors) && archetype.favors.length > 0)
		? archetype.favors
		: (row && row.favors) || [];
	const name = row ? row.name : String(key || '');
	if (favors.length === 0) {
		return `${name}, favoring nothing in particular`;
	}
	const words = favors.map((k) => nameOf(ATTRIBUTES, k).toLowerCase());
	return `${name}, built with high ${words.join(' and ')}`;
}

export function archetypeName(key) {
	return nameOf(ARCHETYPES, key);
}

export function actionName(key) {
	return nameOf(ACTIONS, key);
}

export function actionNature(key) {
	return natureOf(ACTIONS, key);
}

export function instrumentName(key) {
	const item = ANATOMY.get(key) || CHANNELS.get(key);
	return item ? item.name : String(key || '');
}

export function elementName(key) {
	return nameOf(ELEMENTS, key);
}

export function mediumName(key) {
	return nameOf(MEDIA, key);
}

export function coveringName(key) {
	return nameOf(COVERINGS, key);
}

export function bodyPlanName(key) {
	return nameOf(BODY_PLANS, key);
}

// "165 to 215 cm, 180 to 260 kg" style is the template's; a record has one of each
export function sizeLine(physiology) {
	if (!physiology) {
		return '';
	}
	const parts = [];
	if (typeof physiology.heightCm === 'number') {
		parts.push(`${physiology.heightCm} cm`);
	}
	if (typeof physiology.weightKg === 'number') {
		parts.push(`${physiology.weightKg} kg`);
	}
	return parts.join(', ');
}

export function toleranceLine(physiology) {
	if (!physiology || !physiology.environmentalTolerance) {
		return '';
	}
	const t = physiology.environmentalTolerance;
	const media = (t.ambientMedia || []).map((m) => mediumName(m).toLowerCase()).join(' or ');
	const band = t.temperatureC ? `${t.temperatureC.min} to ${t.temperatureC.max} C` : '';
	return [band, media ? `in ${media}` : ''].filter(Boolean).join(' ');
}

export function breathesLine(physiology) {
	const list = (physiology && physiology.breathes) || [];
	if (list.length === 0) {
		return 'does not breathe';
	}
	return `breathes ${list.map((m) => mediumName(m).toLowerCase()).join(' and ')}`;
}
