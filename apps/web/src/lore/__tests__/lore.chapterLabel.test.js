import { describe, it, expect } from 'vitest';
import { chapterLabel } from '../chapterLabel';
import { getWorld, getWorlds } from '../index';

describe('chapterLabel', () => {
	it('formats a zero-based index as a one-based, zero-padded chapter number', () => {
		expect(chapterLabel(0)).toBe('Ch. 01');
		expect(chapterLabel(1)).toBe('Ch. 02');
		expect(chapterLabel(9)).toBe('Ch. 10');
		expect(chapterLabel(10)).toBe('Ch. 11');
	});

	it('agrees with the world page chapter numbering for the same chapter', () => {
		const world = getWorlds()[0];
		expect(world.chapters.length).toBeGreaterThan(0);
		const chapter = world.chapters[0];
		// The world page renders `CH. {String(index + 1).padStart(2, '0')}` for
		// chapter.index -- chapterLabel must produce the same number (modulo
		// case) so the story part, the world page, and search results never
		// disagree about which chapter is which.
		const worldPageDisplay = `CH. ${String(chapter.index + 1).padStart(2, '0')}`;
		expect(chapterLabel(chapter.index).toUpperCase()).toBe(worldPageDisplay);
	});

	it('a world lookup by key produces chapters whose displayed numbers start at Ch. 01', () => {
		const world = getWorld(getWorlds()[0].key);
		expect(chapterLabel(world.chapters[0].index)).toBe('Ch. 01');
	});
});
