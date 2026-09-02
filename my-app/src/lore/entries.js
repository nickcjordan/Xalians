// Encyclopedia entry index: lookup, filtering, related resolution, and
// appears-in scanning (world histories + species descriptions).

import { allEntries, entriesByKey, planetsInOrder, legacySpeciesList, templateRecordsByKey } from './loaders';
import { encyclopediaData } from './loaders';
import { getWorld } from './worlds';

export function getMasthead() {
	return { title: encyclopediaData.masthead, version: encyclopediaData.version };
}

export function getCategories() {
	return [...encyclopediaData.categories];
}

export function getEntry(key) {
	return entriesByKey.get(key);
}

export function getEntries({ category, element } = {}) {
	let list = allEntries;
	if (category) list = list.filter((e) => e.category === category);
	if (element) list = list.filter((e) => e.element === element);
	return [...list].sort((a, b) => a.title.localeCompare(b.title));
}

export function getRelated(key) {
	const entry = entriesByKey.get(key);
	if (!entry || !entry.related) return [];
	return entry.related.map((k) => entriesByKey.get(k)).filter(Boolean);
}

// Whole-word, case-insensitive search for `title` inside `text`; returns the
// index of the first match or -1.
function findWholeWord(text, title) {
	const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const re = new RegExp(`\\b${escaped}\\b`, 'i');
	const match = re.exec(text);
	return match ? match.index : -1;
}

function excerptAround(text, index, matchLength, radius = 80) {
	const start = Math.max(0, index - radius);
	const end = Math.min(text.length, index + matchLength + radius);
	let excerpt = text.slice(start, end).trim();
	if (start > 0) excerpt = '…' + excerpt;
	if (end < text.length) excerpt = excerpt + '…';
	return excerpt;
}

// Scans planet history paragraphs and species descriptions for the entry's
// title (whole word, case-insensitive) and returns ~160-char excerpts around
// the first hit in each place it appears.
export function getAppearances(key) {
	const entry = entriesByKey.get(key);
	if (!entry) return [];
	const title = entry.title;
	const appearances = [];

	for (const planet of planetsInOrder) {
		planet.history.forEach((paragraph, index) => {
			const idx = findWholeWord(paragraph, title);
			if (idx >= 0) {
				appearances.push({
					kind: 'world',
					key: planet.key,
					name: planet.name,
					paragraph: index,
					excerpt: excerptAround(paragraph, idx, title.length),
				});
			}
		});
	}

	for (const species of legacySpeciesList) {
		const template = templateRecordsByKey.get(species.key);
		const description = template ? template.lore.description : species.raw.description;
		const idx = findWholeWord(description, title);
		if (idx >= 0) {
			appearances.push({
				kind: 'species',
				key: species.key,
				name: species.name,
				excerpt: excerptAround(description, idx, title.length),
			});
		}
	}

	return appearances;
}

// Demonyms for getPowers().peoples, ratified in the Chronicle doc (§4 of the
// contract). Only Magmuthites, The Zolto, and Veridians have encyclopedia
// entries; the rest carry only their world. No demonym is invented for the
// other seven worlds.
const PEOPLES = [
	{ name: 'Magmuthites', planet: 'magmuth', entryKey: 'magmuthites' },
	{ name: 'Grimedites', planet: 'grimedes', entryKey: null },
	{ name: 'Luminarii', planet: 'luminax', entryKey: null },
	{ name: 'Zolto', planet: 'zolton', entryKey: 'the-zolto' },
	{ name: 'Krystians', planet: 'krystos', entryKey: null },
	{ name: 'Veridians', planet: 'veridium', entryKey: 'veridians' },
	{ name: 'Phantiri', planet: 'phantiri', entryKey: null },
];

export function getPowers() {
	const factions = getEntries({ category: 'factions' });
	const people = getEntries({ category: 'people' });
	const peoples = PEOPLES.map(({ name, planet, entryKey }) => ({
		name,
		planet: getWorld(planet),
		entry: entryKey ? entriesByKey.get(entryKey) : undefined,
	}));
	return { factions, people, peoples };
}
