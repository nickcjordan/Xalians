// Structural validation for the Codex builder (scripts/buildCodex.js).
// Contract: docs/design/xalian-lore-codex.md, section "Tests".
//
// The builder lives outside my-app/ (repo-root scripts/), so it is loaded
// with createRequire rather than a Vite import -- it is plain CommonJS Node
// code with no bundler-specific syntax, and createRequire resolves relative
// to this test file without needing it to sit inside src/.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { build } = require('../../../../scripts/buildCodex.js');

const result = build();
const { markdown, html, json, llms, warnings } = result;

const bundle = JSON.parse(json);

// Heading hierarchy: title h1; the seven sections (machine note, Foreword,
// Chronicle, Worlds, Encyclopedia, Bestiary, Index of Names) h2; items under
// a section (tour beats, eras, worlds, encyclopedia categories, species) h3;
// sub-items (History of World, Native species, Encyclopedia entries about
// World, individual encyclopedia entries) h4.
describe('Codex builder (scripts/buildCodex.js)', () => {
	it('every entry title appears in the Markdown at least once as a heading', () => {
		for (const section of bundle.entries) {
			for (const entry of section.entries) {
				const re = new RegExp(`^#### ${escapeRegExp(entry.title)}$`, 'm');
				expect(re.test(markdown), `entry heading "${entry.title}"`).toBe(true);
			}
		}
	});

	it('every world name appears in the Markdown at least once as a heading', () => {
		for (const world of bundle.worlds) {
			const re = new RegExp(`^### ${escapeRegExp(world.planet.name)}$`, 'm');
			expect(re.test(markdown), `world heading "${world.planet.name}"`).toBe(true);
		}
	});

	it('every species name appears in the Markdown at least once as a heading', () => {
		for (const species of bundle.species) {
			const re = new RegExp(`^### ${escapeRegExp(species.name)}$`, 'm');
			expect(re.test(markdown), `species heading "${species.name}"`).toBe(true);
		}
	});

	it('every era name appears in the Markdown at least once as a heading', () => {
		for (const section of bundle.chronicle) {
			const re = new RegExp(`^### ${escapeRegExp(section.era.name)}$`, 'm');
			expect(re.test(markdown), `era heading "${section.era.name}"`).toBe(true);
		}
	});

	it('no species heading, world heading, or entry heading appears twice', () => {
		const speciesHeadings = bundle.species.map((s) => s.name);
		const worldHeadings = bundle.worlds.map((w) => w.planet.name);
		const entryHeadings = bundle.entries.flatMap((section) => section.entries.map((e) => e.title));

		for (const list of [speciesHeadings, worldHeadings, entryHeadings]) {
			const counts = new Map();
			for (const name of list) counts.set(name, (counts.get(name) || 0) + 1);
			const dupes = [...counts.entries()].filter(([, count]) => count > 1);
			expect(dupes, `duplicate headings: ${JSON.stringify(dupes)}`).toEqual([]);
		}
	});

	it('every tour beat title appears once, in tour order', () => {
		// Scoped to the First Survey section: two tour beats are deliberately
		// named after the era they retell ("The Age of Unbirth", "The End
		// Wars" -- docs/encyclopedia/tour.json vs chronicle.json eras), so
		// those exact titles legitimately recur later as Chronicle era
		// headings. The "once" guarantee is about the tour section itself,
		// not global heading uniqueness across the whole document.
		const tourStart = markdown.indexOf('## Foreword: The First Survey');
		const chronicleStart = markdown.indexOf('## The Chronicle');
		expect(tourStart).toBeGreaterThanOrEqual(0);
		expect(chronicleStart).toBeGreaterThan(tourStart);
		const tourText = markdown.slice(tourStart, chronicleStart);

		const beatTitles = bundle.tour.beats.map((b) => b.title);
		let searchFrom = 0;
		for (const title of beatTitles) {
			const idx = tourText.indexOf(`### ${title}`, searchFrom);
			expect(idx, `tour beat "${title}" in order after position ${searchFrom}`).toBeGreaterThanOrEqual(0);
			searchFrom = idx + 1;
		}
		for (const title of beatTitles) {
			const re = new RegExp(`^### ${escapeRegExp(title)}$`, 'gm');
			const matches = tourText.match(re) || [];
			expect(matches.length, `tour beat "${title}" heading count within the First Survey`).toBe(1);
		}
	});

	it('the Markdown contains no undefined, [object Object], NaN, or null tokens', () => {
		expect(/\bundefined\b/.test(markdown)).toBe(false);
		expect(markdown.includes('[object Object]')).toBe(false);
		expect(/\bNaN\b/.test(markdown)).toBe(false);
		// "null" appears once in authored canon prose (the Phantiri
		// environmental report: "null acoustic and trace signature",
		// lambda/src/json/planetRecords.json), not as a stray JS token. Assert
		// there is exactly that one occurrence rather than banning the word
		// outright, so a real bug producing a stray `null` still fails this test.
		const nullMatches = markdown.match(/\bnull\b/g) || [];
		expect(nullMatches.length, 'unexpected null token(s) in Markdown').toBe(1);
	});

	it('the preamble and the machine note contain no em dash, en dash, or double hyphen, and no digits other than the four counts', () => {
		const preamble = bundle.preamble;
		const machineNote = bundle.machineNote;
		for (const text of [preamble, machineNote]) {
			expect(/[—–]/.test(text), 'no em dash or en dash').toBe(false);
			expect(/--/.test(text), 'no double hyphen').toBe(false);
		}
		// The preamble may state exactly the four counts as digits; the
		// machine note carries no digits at all. "Entries" is every
		// encyclopedia entry including species (category xalians) -- the
		// Codex's own Encyclopedia section excludes xalians (species are the
		// Bestiary instead), so the true total is read from the source file
		// rather than bundle.entries, which is already filtered.
		const encyclopediaData = require('../../../../docs/encyclopedia/encyclopedia.json');
		const preambleDigits = (preamble.match(/\d+/g) || []).map(Number).sort((a, b) => a - b);
		const expectedCounts = [
			bundle.worlds.length,
			bundle.species.length,
			encyclopediaData.entries.length,
			bundle.chronicle.length,
		].sort((a, b) => a - b);
		expect(preambleDigits).toEqual(expectedCounts);
		expect(machineNote.match(/\d+/g)).toBeNull();
	});

	it('no raw registry key appears in the Bestiary section outside of code spans', () => {
		const require = createRequire(import.meta.url);
		const registriesData = require('../../../../docs/species-templates/registries.json');
		const keys = new Set();
		for (const list of ['attributes', 'archetypes', 'traits', 'elements', 'capabilities', 'senses', 'anatomy', 'channels', 'actions']) {
			for (const item of registriesData[list] || []) keys.add(item.key);
		}
		for (const list of Object.values(registriesData.physiology || {})) {
			for (const item of list) keys.add(item.key);
		}
		const hyphenKeys = [...keys].filter((k) => /^[a-z0-9]+(-[a-z0-9]+)+$/.test(k));
		expect(hyphenKeys.length, 'expected at least one hyphenated registry key to test against').toBeGreaterThan(0);

		const bestiaryStart = markdown.indexOf('## The Bestiary');
		const indexStart = markdown.indexOf('## Index of Names');
		expect(bestiaryStart).toBeGreaterThanOrEqual(0);
		expect(indexStart).toBeGreaterThan(bestiaryStart);
		const bestiaryText = markdown.slice(bestiaryStart, indexStart);

		// A code span is `like this`; strip those before checking, so a
		// legitimately-quoted key would be exempt (none are expected here).
		const withoutCodeSpans = bestiaryText.replace(/`[^`]*`/g, '');
		const leaked = hyphenKeys.filter((k) => withoutCodeSpans.includes(k));
		expect(leaked, `leaked registry keys: ${JSON.stringify(leaked)}`).toEqual([]);
	});

	it('warnings is empty (every history paragraph carries an era)', () => {
		expect(warnings).toEqual([]);
	});

	it('the HTML contains no <script, no <link, exactly one <style, and the same set of h2 headings as the Markdown', () => {
		expect(html.includes('<script')).toBe(false);
		expect(html.includes('<link')).toBe(false);
		const styleMatches = html.match(/<style/g) || [];
		expect(styleMatches.length).toBe(1);

		const mdH2s = [...markdown.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
		const htmlH2s = [...html.matchAll(/<h2>(.+?)<\/h2>/g)].map((m) => decodeHtmlEntities(m[1]));
		expect(new Set(htmlH2s)).toEqual(new Set(mdH2s));
		expect(htmlH2s.length).toBe(mdH2s.length);
	});

	it('llms.txt names all four URLs', () => {
		expect(llms.includes('https://xalians.com/lore/xalia.md')).toBe(true);
		expect(llms.includes('https://xalians.com/lore/xalia.txt')).toBe(true);
		expect(llms.includes('https://xalians.com/lore/xalia.html')).toBe(true);
		expect(llms.includes('https://xalians.com/lore/xalia.json')).toBe(true);
	});

	it('build() is deterministic: two calls return identical strings', () => {
		const second = build();
		expect(second.markdown).toBe(markdown);
		expect(second.text).toBe(result.text);
		expect(second.html).toBe(html);
		expect(second.json).toBe(json);
		expect(second.llms).toBe(llms);
		expect(second.warnings).toEqual(warnings);
	});
});

function escapeRegExp(text) {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function decodeHtmlEntities(text) {
	return text
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"');
}
