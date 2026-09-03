// getConnections: co-occurrence links between encyclopedia records (entries,
// worlds, species) computed from the text units they appear in together --
// world history paragraphs, species descriptions, entry definitions, and
// tour beat prose. The index is built once at module load.

import { allEntries, planetsInOrder, legacySpeciesList, templateRecordsByKey, tourData } from './loaders';
import { getEntry } from './entries';
import { getWorld } from './worlds';
import { getSpecies } from './species';

function escapeRegExp(text) {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Whole-word, case-insensitive match of `title` (optionally with a trailing
// "s") inside `text`. Returns { index, length } for the first match, or null.
function findMention(text, title) {
	const escaped = escapeRegExp(title);
	const re = new RegExp(`\\b(?:${escaped}s?)\\b`, 'i');
	const match = re.exec(text);
	return match ? { index: match.index, length: match[0].length } : null;
}

function excerptAround(text, index, matchLength, radius = 70) {
	const start = Math.max(0, index - radius);
	const end = Math.min(text.length, index + matchLength + radius);
	let excerpt = text.slice(start, end).trim();
	if (start > 0) excerpt = '…' + excerpt;
	if (end < text.length) excerpt = excerpt + '…';
	return excerpt;
}

// ---- subjects: every record that can appear in, or be found by, the index -

const subjects = [];

for (const entry of allEntries) {
	subjects.push({
		kind: 'entry',
		key: entry.key,
		name: entry.title,
		aliases: entry.aliases || [],
		element: entry.element || null,
	});
}
for (const planet of planetsInOrder) {
	subjects.push({ kind: 'world', key: planet.key, name: planet.name, element: planet.element || null });
}
for (const species of legacySpeciesList) {
	const template = templateRecordsByKey.get(species.key);
	subjects.push({
		kind: 'species',
		key: species.key,
		name: species.name,
		element: template ? template.element : species.element || null,
	});
}

// Generic entries excluded from connections: single common words, except the
// three allow-listed ones which are fine to include even though they are
// single words.
const GENERIC_ENTRY_ALLOW = new Set(['Xalians', 'Xalia', 'Vallerii']);
function isGenericEntry(subject) {
	if (subject.kind !== 'entry') return false;
	if (GENERIC_ENTRY_ALLOW.has(subject.name)) return false;
	return subject.name.trim().split(/\s+/).length === 1;
}

// ---- text units: every place proper-noun mentions can co-occur -----------
// Each unit carries the record it belongs to (kind/key/label) and its text.

const textUnits = [];

for (const planet of planetsInOrder) {
	planet.history.forEach((text, index) => {
		textUnits.push({
			kind: 'world',
			key: planet.key,
			label: `${planet.name}, Ch. ${String(index + 1).padStart(2, '0')}`,
			text,
		});
	});
}

for (const species of legacySpeciesList) {
	const template = templateRecordsByKey.get(species.key);
	const description = template ? template.lore.description : species.raw.description;
	if (description) {
		textUnits.push({ kind: 'species', key: species.key, label: `Species: ${species.name}`, text: description });
	}
}

for (const entry of allEntries) {
	if (entry.definition) {
		textUnits.push({ kind: 'entry', key: entry.key, label: `Entry: ${entry.title}`, text: entry.definition });
	}
}

for (const beat of tourData.beats || []) {
	if (beat.prose) {
		textUnits.push({ kind: 'tour', key: beat.key, label: `First Survey: ${beat.title}`, text: beat.prose });
	}
}

// ---- build the co-occurrence index once ----------------------------------
// index.get(subjectId) -> Map<otherSubjectId, { subject, count, sample }>
// `sample` is centered on *that subject's* mention in one shared text unit.

function subjectId(subject) {
	return `${subject.kind}:${subject.key}`;
}

const cooccurrence = new Map();

function addLink(from, to, unit, toMention) {
	const fromId = subjectId(from);
	if (!cooccurrence.has(fromId)) cooccurrence.set(fromId, new Map());
	const forFrom = cooccurrence.get(fromId);
	const toId = subjectId(to);
	if (!forFrom.has(toId)) {
		forFrom.set(toId, {
			subject: to,
			count: 0,
			sample: {
				kind: unit.kind,
				key: unit.key,
				label: unit.label,
				excerpt: excerptAround(unit.text, toMention.index, toMention.length),
			},
		});
	}
	forFrom.get(toId).count += 1;
}

// A subject is "present" in a text unit when its name OR any of its aliases
// is mentioned. When several of a subject's names match, the earliest
// mention in the text wins (so the excerpt reads naturally around whichever
// name the prose actually used first).
function findSubjectMention(text, subject) {
	let best = null;
	for (const name of [subject.name, ...(subject.aliases || [])]) {
		const mention = findMention(text, name);
		if (mention && (!best || mention.index < best.index)) best = mention;
	}
	return best;
}

// documentFrequency: how many text units mention each subject, across the
// whole corpus -- used to weight raw co-occurrence count by specificity
// (a subject mentioned everywhere, e.g. Vallerii or Xalians, contributes
// less to a connection's rank than one mentioned narrowly).
const documentFrequency = new Map();

for (const unit of textUnits) {
	const present = [];
	for (const subject of subjects) {
		const mention = findSubjectMention(unit.text, subject);
		if (mention) present.push({ subject, mention });
	}
	for (const { subject } of present) {
		const id = subjectId(subject);
		documentFrequency.set(id, (documentFrequency.get(id) || 0) + 1);
	}
	if (present.length < 2) continue;
	for (const a of present) {
		for (const b of present) {
			if (a.subject.kind === b.subject.kind && a.subject.key === b.subject.key) continue;
			// Link a.subject -> b.subject, sample centered on b's mention (the
			// "other" record being surfaced in a's connections list).
			addLink(a.subject, b.subject, unit, b.mention);
		}
	}
}

const totalUnits = textUnits.length;

// Specificity score: count * log(totalUnits / documentFrequency). A subject
// mentioned in most text units (Vallerii, Xalians, Xalia, Xalian Generator)
// has documentFrequency close to totalUnits, so its log term collapses
// toward zero and it naturally falls to the bottom of the ranking without
// needing a hard exclusion list.
function specificityScore(subject, count) {
	const df = documentFrequency.get(subjectId(subject)) || 1;
	return count * Math.log(totalUnits / df);
}

export function getConnections(kind, key, { limit = 12 } = {}) {
	const forSubject = cooccurrence.get(`${kind}:${key}`);
	if (!forSubject) return [];

	const rows = [...forSubject.values()]
		.filter(({ subject }) => !isGenericEntry(subject))
		.map((row) => ({ ...row, score: specificityScore(row.subject, row.count) }));

	rows.sort((a, b) => {
		if (b.score !== a.score) return b.score - a.score;
		if (b.count !== a.count) return b.count - a.count;
		return a.subject.name.localeCompare(b.subject.name);
	});

	return rows.slice(0, limit).map(({ subject, count, score, sample }) => ({
		kind: subject.kind,
		key: subject.key,
		name: subject.name,
		element: subject.element,
		count,
		score,
		sample,
	}));
}

// Exposed for reader.js / other lore modules that may want to resolve a
// connection's full record view without re-deriving kind dispatch.
export function resolveConnection({ kind, key }) {
	if (kind === 'entry') return getEntry(key);
	if (kind === 'world') return getWorld(key);
	if (kind === 'species') return getSpecies(key);
	return undefined;
}
