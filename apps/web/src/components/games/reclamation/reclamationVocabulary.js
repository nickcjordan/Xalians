/*
	Display vocabulary for the Reclamation table: registry keys resolved to the names and
	one-line natures the Encyclopedia uses, plus the species facts a dossier quotes.

	Everything here reads the bundled registry data (registries.json) and the current
	species catalog (canonicalSpeciesCatalog.json, through the generator's
	getSpeciesTemplates); nothing is spelled out twice. Unknown keys fall back to the key itself, per the registry contract ("games
	ignore unknown keys").
*/

import registries from '@xalians/content/registries.json';
import { getSpeciesTemplates } from '@xalians/rules/generator/canonicalCreatureRelease';

function toMap(list) {
	return new Map((list || []).map((item) => [item.key, item]));
}

const TEMPLATES_BY_KEY = new Map(getSpeciesTemplates().map((template) => [template.key, template]));

// the species template for a key, or undefined for a key the catalog does not carry
export function getSpeciesTemplate(key) {
	return TEMPLATES_BY_KEY.get(key);
}

// display name for a species key ("graviclaw" -> "Graviclaw"); falls back to the key
export function speciesDisplayName(key) {
	const template = TEMPLATES_BY_KEY.get(key);
	return template ? template.name : key;
}

const ELEMENTS = toMap(registries.elements);
const MEDIA = toMap(registries.physiology && registries.physiology.media);
const COVERINGS = toMap(registries.physiology && registries.physiology.covering);
const BODY_PLANS = toMap(registries.physiology && registries.physiology.bodyPlan);

function nameOf(map, key) {
	const item = map.get(key);
	return item ? item.name : String(key || '');
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
		habitat: template.lore ? template.lore.habitat : '',
	};
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

// pass 62: a record stores its measures to the full float; the dossier printed "height 102.36373238265514 cm"
const cm = (n) => `${Math.round(n)} cm`;
const kg = (n) => `${n >= 100 ? Math.round(n) : Math.round(n * 10) / 10} kg`;

// A record carries mass and whichever overall dimensions describe its body plan.
export function sizeLine(physiology) {
	if (!physiology) {
		return '';
	}
	const parts = [];
	if (typeof physiology.heightCm === 'number') {
		parts.push(`height ${cm(physiology.heightCm)}`);
	}
	if (typeof physiology.lengthCm === 'number') {
		parts.push(`length ${cm(physiology.lengthCm)}`);
	}
	if (typeof physiology.widthCm === 'number') {
		parts.push(`width ${cm(physiology.widthCm)}`);
	}
	if (typeof physiology.massKg === 'number') {
		parts.push(`mass ${kg(physiology.massKg)}`);
	}
	return parts.join(', ');
}

export function toleranceLine(physiology) {
	if (!physiology || !physiology.environmentalTolerance) {
		return '';
	}
	const t = physiology.environmentalTolerance;
	const media = (t.ambientMedia || []).map((m) => mediumName(m).toLowerCase()).join(' or ');
	const band = t.temperatureC ? `${t.temperatureC.min} to ${t.temperatureC.max}°C` : '';
	return [band, media ? `in ${media}` : ''].filter(Boolean).join(' ');
}

export function breathesLine(physiology) {
	const list = (physiology && physiology.breathes) || [];
	if (list.length === 0) {
		return 'does not breathe';
	}
	return `breathes ${list.map((m) => mediumName(m).toLowerCase()).join(' and ')}`;
}

// A record's element is a bare key ('ice'); null when it carries none.
export function elementOf(record) {
	return (record && record.element) || null;
}
