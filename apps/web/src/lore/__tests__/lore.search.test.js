import { describe, it, expect } from 'vitest';
import { search } from '../index';

describe('search', () => {
	it('a title query ranks its world among the top results', () => {
		const results = search('Magmuth');
		expect(results.length).toBeGreaterThan(0);
		const worldResult = results.find((r) => r.kind === 'world');
		expect(worldResult).toBeDefined();
		expect(worldResult.key).toBe('magmuth');
		expect(results.every((r) => r.key === 'magmuth' || r.kind !== 'world')).toBe(true);
	});

	it('a history phrase finds its paragraph', () => {
		const results = search('Magmuth Massacre');
		expect(results.length).toBeGreaterThan(0);
		expect(results.some((r) => r.kind === 'paragraph' || r.kind === 'entry')).toBe(true);
	});

	it('results carry a route and a snippet', () => {
		const results = search('Vallerii');
		expect(results.length).toBeGreaterThan(0);
		for (const result of results) {
			expect(result.route).toMatch(/^\/encyclopedia\//);
			expect(typeof result.snippet).toBe('string');
		}
	});

	it('returns no results for an empty query', () => {
		expect(search('')).toEqual([]);
	});

	it('respects the limit option', () => {
		const results = search('the', { limit: 3 });
		expect(results.length).toBeLessThanOrEqual(3);
	});

	const WORLD_KEYS = [
		'magmuth', 'poseidas', 'grimedes', 'luminax', 'floria', 'zolton',
		'phantiri', 'stonera', 'drainov', 'saiphus', 'telypso', 'krystos',
		'veridium', 'endessa',
	];

	it('a chapter snippet for "kozrak" does not end with the raw world key', () => {
		const results = search('kozrak');
		const chapterResults = results.filter((r) => r.kind === 'paragraph');
		expect(chapterResults.length).toBeGreaterThan(0);
		for (const result of chapterResults) {
			const trimmed = result.snippet.replace(/…$/, '').trim();
			const lastWord = trimmed.split(/\s+/).pop();
			expect(WORLD_KEYS).not.toContain(lastWord);
			expect(trimmed).toMatch(/[a-zA-Z.,!?]$/);
		}
	});

	it('a world-name query still finds that world\'s chapters', () => {
		const results = search('zolton');
		const chapterResults = results.filter((r) => r.kind === 'paragraph');
		expect(chapterResults.length).toBeGreaterThan(0);
	});
});
