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
// UX-pass contract). Every one of the seven now has an entryKey; the four
// new entries (grimedites, luminarii, krystians, phantiri-xalians) are being
// written by another agent concurrently, so lookups must tolerate a missing
// entry (entry comes back undefined, never throws).
const PEOPLES = [
	{ name: 'Magmuthites', planet: 'magmuth', entryKey: 'magmuthites' },
	{ name: 'Grimedites', planet: 'grimedes', entryKey: 'grimedites' },
	{ name: 'Luminarii', planet: 'luminax', entryKey: 'luminarii' },
	{ name: 'Zolto', planet: 'zolton', entryKey: 'the-zolto' },
	{ name: 'Krystians', planet: 'krystos', entryKey: 'krystians' },
	{ name: 'Veridians', planet: 'veridium', entryKey: 'veridians' },
	{ name: 'Phantiri', planet: 'phantiri', entryKey: 'phantiri-xalians' },
];

// Demonym entry keys that render only under Xalian Peoples, never under
// Factions, even though they are still categorized 'factions' in
// encyclopedia.json (append-only categories; the page regroups them).
const PEOPLES_ENTRY_KEYS = new Set(['magmuthites', 'the-zolto', 'veridians']);

// The Vallerii, rendered under their own "The Vallerii" section.
const VALLERII_KEYS = ['vallerii', 'king-kozrak'];

export function getPowers() {
	const factions = getEntries({ category: 'factions' }).filter((e) => !PEOPLES_ENTRY_KEYS.has(e.key));
	const vallerii = VALLERII_KEYS.map((key) => entriesByKey.get(key)).filter(Boolean);
	const peoples = PEOPLES.map(({ name, planet, entryKey }) => ({
		name,
		planet: getWorld(planet),
		entry: entryKey ? entriesByKey.get(entryKey) : undefined,
	}));
	return { factions, vallerii, peoples };
}
