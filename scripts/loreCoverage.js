// Scans the lore corpus (world histories, species descriptions, encyclopedia
// entry definitions) for candidate proper terms that are not yet backed by an
// encyclopedia entry, world, species, or era, and reports entries that appear
// in none of that prose. Read-only: writes docs/encyclopedia/COVERAGE.md and
// prints the top 30 candidates to stdout.
//
// Run from the repo root:  node scripts/loreCoverage.js
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const docs = path.join(root, 'docs');
const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

const planetRecords = read(path.join(root, 'lambda', 'src', 'json', 'planetRecords.json'));
const encyclopedia = read(path.join(docs, 'encyclopedia', 'encyclopedia.json'));
const chronicle = read(path.join(docs, 'encyclopedia', 'chronicle.json'));
const ratified = read(path.join(docs, 'species-templates', 'RATIFIED.json'));

// ---- gather text units -----------------------------------------------------

const texts = []; // { label, text }

for (const planet of planetRecords) {
	planet.history.forEach((text, index) => {
		texts.push({ label: `${planet.name}, Ch. ${String(index + 1).padStart(2, '0')}`, text });
	});
}

for (const key of ratified.species) {
	const templatePath = path.join(docs, 'species-templates', `${key}.json`);
	if (!fs.existsSync(templatePath)) continue;
	const template = read(templatePath);
	if (template.lore && template.lore.description) {
		texts.push({ label: `Species: ${template.name || key}`, text: template.lore.description });
	}
}

for (const entry of encyclopedia.entries) {
	if (entry.definition) {
		texts.push({ label: `Entry: ${entry.title}`, text: entry.definition });
	}
}

// ---- names already covered by an existing record --------------------------

const knownNames = new Set();
for (const entry of encyclopedia.entries) {
	knownNames.add(entry.title.toLowerCase());
	for (const alias of entry.aliases || []) knownNames.add(alias.toLowerCase());
}
for (const planet of planetRecords) knownNames.add(planet.name.toLowerCase());
for (const key of ratified.species) {
	const templatePath = path.join(docs, 'species-templates', `${key}.json`);
	if (fs.existsSync(templatePath)) {
		const template = read(templatePath);
		if (template.name) knownNames.add(template.name.toLowerCase());
	}
}
for (const era of chronicle.eras) knownNames.add(era.name.toLowerCase());

function singularize(word) {
	return word.endsWith('s') && word.length > 1 ? word.slice(0, -1) : word;
}

function isKnown(term) {
	const lower = term.toLowerCase();
	const candidates = [lower, singularize(lower), lower + 's', `the ${lower}`, lower.replace(/^the /, '')];
	return candidates.some((c) => knownNames.has(c));
}

// ---- candidate extraction --------------------------------------------------
// Sequences of 1-4 Capitalized words (allowing internal "of", "the", "and",
// digits, and hyphenated tokens like "ION-9"), skipping a capitalized word
// only when it is sentence-initial AND in the common-word stoplist, unless
// that same word also appears mid-sentence elsewhere in the corpus (handled
// as a second pass below).

const STOPLIST = new Set([
	'The',
	'A',
	'An',
	'It',
	'Its',
	'They',
	'Their',
	'Them',
	'This',
	'That',
	'These',
	'Those',
	'He',
	'She',
	'His',
	'Her',
	'Him',
	'We',
	'Our',
	'You',
	'Your',
	'I',
	'In',
	'On',
	'At',
	'To',
	'For',
	'With',
	'Without',
	'From',
	'By',
	'Of',
	'As',
	'Into',
	'Onto',
	'Upon',
	'Over',
	'Under',
	'Through',
	'Throughout',
	'During',
	'Amid',
	'Amidst',
	'Against',
	'Within',
	'Across',
	'Around',
	'Among',
	'Between',
	'Beyond',
	'Toward',
	'Towards',
	'Near',
	'Off',
	'Down',
	'Up',
	'Out',
	'Above',
	'Below',
	'Behind',
	'When',
	'While',
	'Today',
	'Now',
	'Once',
	'Even',
	'Still',
	'Soon',
	'Later',
	'Then',
	'Thus',
	'Hence',
	'Therefore',
	'Indeed',
	'Meanwhile',
	'Nevertheless',
	'Nonetheless',
	'Instead',
	'Perhaps',
	'Certainly',
	'Clearly',
	'Ultimately',
	'Eventually',
	'Initially',
	'Finally',
	'Suddenly',
	'Increasingly',
	'Needless',
	'Deep',
	'Deeper',
	'Some',
	'Many',
	'Most',
	'Few',
	'Several',
	'All',
	'Any',
	'Each',
	'Every',
	'Both',
	'Neither',
	'Either',
	'None',
	'No',
	'Not',
	'Only',
	'Just',
	'Also',
	'Together',
	'Alone',
	'After',
	'Before',
	'Despite',
	'Though',
	'Although',
	'However',
	'Whereas',
	'Whereupon',
	'Here',
	'There',
	'What',
	'Where',
	'Why',
	'How',
	'Who',
	'Whose',
	'Which',
	'Whom',
	'Because',
	'Since',
	'If',
	'Unless',
	'Until',
	'But',
	'And',
	'Or',
	'Nor',
	'So',
	'Yet',
]);

const LOWER_LINKERS = new Set(['of', 'the', 'and']);

// A small set of function words that are never proper nouns no matter where
// they appear (a stray capitalization -- quoted dialogue, a title fragment
// embedded mid-sentence -- should not exempt these from the stoplist the way
// a genuine proper noun's occasional sentence-initial position should).
const HARD_STOPLIST = new Set(['The', 'A', 'An', 'It', 'Its', 'This', 'That', 'These', 'Those', 'And', 'But', 'Or']);

const POSSESSIVE_RE = /['’]s?$/;
function isPossessive(word) {
	return POSSESSIVE_RE.test(word);
}
function stripPossessive(word) {
	return word.replace(POSSESSIVE_RE, '');
}

// Word token: Capitalized word (letters/apostrophes), a number, or a
// hyphenated Capitalized-alnum token like "ION-9" or "Source-Code".
const WORD_RE = /[A-Z][A-Za-z'’]*(?:-[A-Za-z0-9]+)*|\d[\d,]*(?:-\d+)?/;

function splitSentences(text) {
	// Simple sentence splitter on . ! ? followed by whitespace + capital, good
	// enough for candidate extraction (not used for anything user-facing).
	return text.split(/(?<=[.!?])\s+(?=[A-Z"“])/);
}

function extractFromSentence(sentence, midSentenceCapitals) {
	const tokens = sentence.split(/\s+/);
	const candidates = [];
	let i = 0;
	while (i < tokens.length) {
		const raw = tokens[i];
		const clean = stripPossessive(raw.replace(/^["“'(]+|["”').,;:!?]+$/g, ''));
		const isSentenceStart = i === 0;
		const looksCapitalized = WORD_RE.test(clean) && /^[A-Z0-9]/.test(clean);
		if (!looksCapitalized) {
			i++;
			continue;
		}
		if (isSentenceStart && HARD_STOPLIST.has(clean)) {
			i++;
			continue;
		}
		if (isSentenceStart && STOPLIST.has(clean) && !midSentenceCapitals.has(clean)) {
			i++;
			continue;
		}
		// Grow the run: Capitalized word, digit token, or a lowercase linker
		// followed by another Capitalized/digit word.
		const run = [clean];
		let j = i + 1;
		while (run.length < 4 && j < tokens.length) {
			const nextRaw = tokens[j];
			const nextCleanRaw = nextRaw.replace(/^["“'(]+|["”').,;:!?]+$/g, '');
			const nextIsPossessive = isPossessive(nextCleanRaw);
			const nextClean = stripPossessive(nextCleanRaw);
			if (WORD_RE.test(nextClean) && /^[A-Z0-9]/.test(nextClean)) {
				run.push(nextClean);
				j++;
				// A possessive ends the run here -- "APEX's Terracannon" is two
				// terms ("APEX", "Terracannon"), not one run.
				if (nextIsPossessive) break;
				continue;
			}
			if (LOWER_LINKERS.has(nextClean.toLowerCase()) && j + 1 < tokens.length) {
				const afterRaw = tokens[j + 1];
				const afterClean = stripPossessive(afterRaw.replace(/^["“'(]+|["”').,;:!?]+$/g, ''));
				if (WORD_RE.test(afterClean) && /^[A-Z0-9]/.test(afterClean) && run.length + 2 <= 4) {
					run.push(nextClean.toLowerCase(), afterClean);
					j += 2;
					continue;
				}
			}
			break;
		}
		// Emit progressively shorter trailing trims are not needed; take the
		// longest run found, then continue scanning after it.
		if (run.length > 0) {
			// Drop a trailing lowercase linker if the run ends on one (dangling
			// "of"/"and"/"the" with nothing capitalized following).
			while (run.length > 0 && LOWER_LINKERS.has(run[run.length - 1])) run.pop();
			if (run.length > 0) candidates.push(run.join(' '));
		}
		i = j;
	}
	return candidates;
}

// First pass: collect every capitalized word that appears NOT at a sentence
// start anywhere in the corpus, so the second pass can keep proper nouns that
// happen to open a sentence elsewhere.
const midSentenceCapitals = new Set();
for (const { text } of texts) {
	for (const sentence of splitSentences(text)) {
		const tokens = sentence.split(/\s+/);
		tokens.forEach((raw, idx) => {
			if (idx === 0) return;
			const clean = raw.replace(/^["“'(]+|["”').,;:!?]+$/g, '');
			if (/^[A-Z]/.test(clean)) midSentenceCapitals.add(clean);
		});
	}
}

// term -> { count, texts: Set(label), samples: [{label, excerpt}] }
const candidates = new Map();

function excerptAround(text, term, radius = 70) {
	const re = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
	const match = re.exec(text);
	if (!match) return text.slice(0, Math.min(text.length, 140));
	const start = Math.max(0, match.index - radius);
	const end = Math.min(text.length, match.index + term.length + radius);
	let excerpt = text.slice(start, end).trim();
	if (start > 0) excerpt = '…' + excerpt;
	if (end < text.length) excerpt = excerpt + '…';
	return excerpt;
}

for (const unit of texts) {
	const seenInThisUnit = new Set();
	for (const sentence of splitSentences(unit.text)) {
		const found = extractFromSentence(sentence, midSentenceCapitals);
		for (const term of found) {
			if (isKnown(term)) continue;
			// Require at least one actually-capitalized word token (reject
			// pure-number or pure-linker leftovers).
			if (!/[A-Z]/.test(term)) continue;
			if (!candidates.has(term)) {
				candidates.set(term, { count: 0, texts: new Set(), samples: [] });
			}
			const entry = candidates.get(term);
			entry.count += 1;
			entry.texts.add(unit.label);
			if (!seenInThisUnit.has(term)) {
				seenInThisUnit.add(term);
				if (entry.samples.length < 2) {
					entry.samples.push({ label: unit.label, excerpt: excerptAround(unit.text, term) });
				}
			}
		}
	}
}

const sortedCandidates = [...candidates.entries()]
	.map(([term, data]) => ({ term, count: data.count, textCount: data.texts.size, samples: data.samples }))
	.sort((a, b) => b.count - a.count || a.term.localeCompare(b.term));

// ---- entries nothing links to ----------------------------------------------
// An entry whose title AND every alias appear (whole word, case-insensitive,
// singular or plural) in zero history paragraphs and zero species
// descriptions. An entry only reachable through an alias (e.g. a history
// paragraph that only says "Kozrak", never "King Kozrak") is not an orphan --
// the alias is exactly what makes it reachable.

function findWholeWord(text, title) {
	const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const re = new RegExp(`\\b(?:${escaped}s?)\\b`, 'i');
	return re.test(text);
}

const historyAndSpeciesTexts = texts.filter((t) => !t.label.startsWith('Entry: ')).map((t) => t.text);

const orphanEntries = encyclopedia.entries.filter((entry) => {
	const names = [entry.title, ...(entry.aliases || [])];
	return !historyAndSpeciesTexts.some((text) => names.some((name) => findWholeWord(text, name)));
});

// ---- write COVERAGE.md ------------------------------------------------------

const lines = [];
lines.push('# Lore Coverage Report');
lines.push('');
lines.push(
	'This file is generated by `node scripts/loreCoverage.js`, run from the repo root. It scans every world history paragraph (`lambda/src/json/planetRecords.json`), every ratified species lore description (`docs/species-templates/<key>.json`), and every encyclopedia entry definition (`docs/encyclopedia/encyclopedia.json`) for capitalized multi-word terms that are not already backed by an entry, world, species, or era name. It also lists existing entries that no history paragraph or species description currently mentions.'
);
lines.push('');
lines.push(
	'Regenerate after adding lore: `node scripts/loreCoverage.js`. This file is a report, not a source of truth -- do not hand-edit it.'
);
lines.push('');
lines.push('## Candidate terms not yet covered by an entry');
lines.push('');
lines.push('| Term | Count | Texts | First sample |');
lines.push('|---|---|---|---|');
for (const { term, count, textCount, samples } of sortedCandidates) {
	const sample = samples[0] ? `${samples[0].label}: ${samples[0].excerpt.replace(/\|/g, '\\|')}` : '';
	lines.push(`| ${term} | ${count} | ${textCount} | ${sample} |`);
}
lines.push('');
lines.push('## Entries nothing links to');
lines.push('');
lines.push('Entries whose title appears in zero world history paragraphs and zero species descriptions.');
lines.push('');
lines.push('| Entry | Category |');
lines.push('|---|---|');
for (const entry of orphanEntries) {
	lines.push(`| ${entry.title} | ${entry.category} |`);
}
lines.push('');

fs.writeFileSync(path.join(docs, 'encyclopedia', 'COVERAGE.md'), lines.join('\n'));
console.log('wrote docs/encyclopedia/COVERAGE.md');
console.log(`${sortedCandidates.length} candidate terms, ${orphanEntries.length} orphan entries`);
console.log('');
console.log('Top 30 candidates:');
for (const { term, count, textCount } of sortedCandidates.slice(0, 30)) {
	console.log(`  ${String(count).padStart(3)}  (${textCount} texts)  ${term}`);
}
