import { describe, it, expect } from 'vitest';
import { search } from '../index';

describe('search', () => {
	it('a title query ranks its entry first', () => {
		const results = search('Magmuth');
		expect(results.length).toBeGreaterThan(0);
		expect(results[0].kind).toBe('world');
		expect(results[0].key).toBe('magmuth');
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
});
