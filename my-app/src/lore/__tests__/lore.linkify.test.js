import { describe, it, expect } from 'vitest';
import { linkify } from '../index';

describe('linkify', () => {
	it('longest title wins: "Operation Phantiri" is not double-linked with "Phantiri"', () => {
		const text = 'Operation Phantiri uncovered ancient ruins.';
		const segments = linkify(text);
		const links = segments.filter((s) => s.key);
		expect(links.length).toBe(1);
		expect(links[0].key).toBe('operation-phantiri');
		expect(links[0].text).toBe('Operation Phantiri');
		// No leftover segment contains a second, separate link to "phantiri".
		expect(links.some((l) => l.key === 'phantiri')).toBe(false);
	});

	it('matches whole words only', () => {
		// "Grimedes" should not match inside a longer unrelated word.
		const text = 'The Grimedesian outpost was abandoned.';
		const segments = linkify(text);
		const links = segments.filter((s) => s.key);
		expect(links.length).toBe(0);
	});

	it('links a real whole-word occurrence', () => {
		const text = 'Deep beneath Grimedes the shadows gathered.';
		const segments = linkify(text);
		const links = segments.filter((s) => s.key);
		expect(links.some((l) => l.key === 'grimedes')).toBe(true);
	});

	it('one link per distinct title per call', () => {
		const text = 'Magmuth is hostile. Magmuth is also rich in ore.';
		const segments = linkify(text);
		const links = segments.filter((s) => s.key === 'magmuth');
		expect(links.length).toBe(1);
	});

	it('except suppresses self-links', () => {
		const text = 'Magmuth is an inhospitable world.';
		const segments = linkify(text, { except: 'magmuth' });
		const links = segments.filter((s) => s.key);
		expect(links.some((l) => l.key === 'magmuth')).toBe(false);
	});

	it('returns plain-text segments for unmatched prose', () => {
		const segments = linkify('Nothing here matches anything at all.');
		expect(segments.every((s) => !s.key)).toBe(true);
		expect(segments.map((s) => s.text).join('')).toBe('Nothing here matches anything at all.');
	});

	it('reconstructs the original text when segments are concatenated', () => {
		const text = 'Magmuth and Grimedes are both hostile worlds.';
		const segments = linkify(text);
		expect(segments.map((s) => s.text).join('')).toBe(text);
	});
});
