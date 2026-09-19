import { describe, it, expect } from 'vitest';
import { getSpeciesList, getSpecies } from '../index';

// Issue #437: the species page used to render `view.description` as both an
// unheaded lead paragraph and again lower on the page. The fix renders it
// once, under "In brief". This test guards against any sentence from the
// lead reappearing verbatim in Feeding or Behavior, across every species --
// not a sample -- so a future content or UI change can't reintroduce the
// duplication silently.

function normalizeSentence(sentence) {
	return sentence
		.toLowerCase()
		.replace(/[.,!?;:'"()]/g, '')
		.replace(/\s+/g, ' ')
		.trim();
}

function splitSentences(text) {
	if (!text) return [];
	return text
		.split(/(?<=[.!?])\s+/)
		.map(normalizeSentence)
		.filter(Boolean);
}

describe('species lead does not duplicate Feeding or Behavior (issue #437)', () => {
	const species = getSpeciesList();

	it('covers all 32 species', () => {
		expect(species.length).toBe(32);
	});

	it.each(species.map((s) => [s.key, s.name]))('%s (%s): lead sentences do not repeat in Feeding or Behavior', (key) => {
		const view = getSpecies(key);
		const leadSentences = new Set(splitSentences(view.description));
		const fields = Array.isArray(view.fields) ? view.fields : [];

		for (const field of fields) {
			if (field.key !== 'feeding' && field.key !== 'behavior') continue;
			const fieldSentences = splitSentences(field.text);
			for (const sentence of fieldSentences) {
				expect(leadSentences.has(sentence)).toBe(false);
			}
		}
	});
});
