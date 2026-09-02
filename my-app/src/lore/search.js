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
			text: entry.definition,
			route: routeFor('entry', entry.key),
		});
	}

	for (const planet of planetsInOrder) {
		docs.push({
			id: `world:${planet.key}`,
			kind: 'world',
			key: planet.key,
			title: planet.name,
			text: [
				planet.physical && planet.physical.terrainLabel,
				planet.report && JSON.stringify(planet.report),
				planet.history.join(' '),
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
			title: `${paragraph.planet} ${paragraph.index}`,
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
	fields: ['title', 'text'],
	storeFields: ['kind', 'key', 'title', 'text', 'route'],
	searchOptions: {
		boost: { title: 3 },
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
	const rawResults = miniSearch.search(query, { boost: { title: 3 }, prefix: true, fuzzy: 0.2 });
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
