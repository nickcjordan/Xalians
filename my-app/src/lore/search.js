// MiniSearch index over entries, worlds, species, chronicle paragraphs, and
// eras. Returns results with a ~140-char snippet and a route.

import MiniSearch from 'minisearch';
import { allEntries, planetsInOrder, legacySpeciesList, chronicleData, erasInOrder } from './loaders';
import { getSpeciesList } from './species';
import { routeFor } from './routeFor';

function buildDocuments() {
	const docs = [];

	for (const entry of allEntries) {
		docs.push({
			id: `entry:${entry.key}`,
			kind: 'entry',
			key: entry.key,
			title: entry.title,
			// Aliases are indexed in their own lower-weighted field so a search for
			// "Kozrak" or "the Vallerii Empire" still finds the entry, but a title
			// match still outranks an alias-only match (see the `boost` below).
			aliases: (entry.aliases || []).join(' '),
			text: entry.definition,
			route: routeFor('entry', entry.key),
		});
	}

	const planetNames = new Map(planetsInOrder.map((p) => [p.key, p.name]));

function flattenWords(value) {
	if (value == null) return '';
	if (typeof value === 'string') return value;
	if (Array.isArray(value)) return value.map(flattenWords).join(' ');
	if (typeof value === 'object') return Object.values(value).map(flattenWords).join(' ');
	return String(value);
}

	for (const planet of planetsInOrder) {
		docs.push({
			id: `world:${planet.key}`,
			kind: 'world',
			key: planet.key,
			title: planet.name,
			// History first so snippets read as prose; the report's values are
			// flattened to words (never JSON) and indexed after it.
			text: [
				planet.history.join(' '),
				planet.physical && planet.physical.terrainLabel,
				planet.report && flattenWords(planet.report),
			]
				.filter(Boolean)
				.join(' '),
			route: routeFor('world', planet.key),
		});
	}

	for (const species of getSpeciesList()) {
		docs.push({
			id: `species:${species.key}`,
			kind: 'species',
			key: species.key,
			title: species.name,
			text: species.description,
			route: routeFor('species', species.key),
		});
	}

	for (const paragraph of chronicleData.paragraphs) {
		const key = `${paragraph.planet}:${paragraph.index}`;
		docs.push({
			id: `paragraph:${key}`,
			kind: 'paragraph',
			key,
			title: `${planetNames.get(paragraph.planet) || paragraph.planet}, Ch. ${String(paragraph.index).padStart(2, '0')}`,
			text: [paragraph.summary, paragraph.planet].join(' '),
			route: routeFor('paragraph', key),
		});
	}

	for (const era of erasInOrder) {
		docs.push({
			id: `era:${era.key}`,
			kind: 'era',
			key: era.key,
			title: era.name,
			text: era.definition,
			route: routeFor('era', era.key),
		});
	}

	return docs;
}

const documents = buildDocuments();
const documentsById = new Map(documents.map((d) => [d.id, d]));

const miniSearch = new MiniSearch({
	fields: ['title', 'text', 'aliases'],
	storeFields: ['kind', 'key', 'title', 'text', 'route'],
	searchOptions: {
		boost: { title: 3, aliases: 2, text: 1 },
		prefix: true,
		fuzzy: 0.2,
	},
});
miniSearch.addAll(documents);

function buildSnippet(text, query, radius = 70) {
	if (!text) return '';
	const terms = query.split(/\s+/).filter(Boolean);
	let index = -1;
	for (const term of terms) {
		const re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
		const match = re.exec(text);
		if (match) {
			index = match.index;
			break;
		}
	}
	if (index < 0) {
		return text.length > radius * 2 ? text.slice(0, radius * 2).trim() + '…' : text;
	}
	const start = Math.max(0, index - radius);
	const end = Math.min(text.length, index + radius);
	let snippet = text.slice(start, end).trim();
	if (start > 0) snippet = '…' + snippet;
	if (end < text.length) snippet = snippet + '…';
	return snippet;
}

export function search(query, { limit = 20 } = {}) {
	if (!query || !query.trim()) return [];
	const rawResults = miniSearch.search(query, { boost: { title: 3, aliases: 2, text: 1 }, prefix: true, fuzzy: 0.2 });
	return rawResults.slice(0, limit).map((result) => {
		const doc = documentsById.get(result.id);
		return {
			kind: doc.kind,
			key: doc.key,
			title: doc.title,
			snippet: buildSnippet(doc.text, query),
			score: result.score,
			route: doc.route,
		};
	});
}

export { documents as _searchDocuments };
