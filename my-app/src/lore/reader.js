// getReader(): the whole Chronicle as one continuous read, built from
// getEraStory() for each era, grouped into sections by consecutive
// eventTitle (a null eventTitle groups as "Elsewhere in the era").

import { erasInOrder } from './loaders';
import { getEra, getEraStory } from './chronicle';

// Groups rows into sections by consecutive eventTitle, merging any run of
// adjacent sections that share the same head (including null) into one --
// so a head never appears twice in a row, and a lone null-head section can
// be told apart, downstream, from a part that has real named sections too.
function buildSections(rows) {
	const sections = [];
	for (const row of rows) {
		const head = row.eventTitle === null ? null : row.eventTitle;
		const last = sections[sections.length - 1];
		if (last && last.head === head) {
			last.paragraphs.push({ world: row.world, index: row.index, text: row.text });
		} else {
			sections.push({
				head,
				paragraphs: [{ world: row.world, index: row.index, text: row.text }],
			});
		}
	}
	return sections;
}

function buildPart(era, order) {
	const rows = getEraStory(era.key);
	const sections = buildSections(rows);
	const paragraphCount = sections.reduce((sum, section) => sum + section.paragraphs.length, 0);
	return { era: getEra(era.key), order, sections, paragraphCount };
}

const partsInOrder = erasInOrder.map((era, index) => buildPart(era, index));

export function getReader() {
	const totalParagraphs = partsInOrder.reduce((sum, part) => sum + part.paragraphCount, 0);
	return {
		parts: partsInOrder.map(({ paragraphCount, ...part }) => part),
		totalParagraphs,
	};
}

export function getReaderPart(eraKey) {
	const index = partsInOrder.findIndex((part) => part.era.key === eraKey);
	if (index === -1) return undefined;
	const { paragraphCount, ...part } = partsInOrder[index];
	const prev = index > 0 ? partsInOrder[index - 1].era.key : null;
	const next = index < partsInOrder.length - 1 ? partsInOrder[index + 1].era.key : null;
	return { ...part, prev, next };
}
