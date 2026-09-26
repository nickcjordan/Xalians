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
		expect(world.readingChapters.length).toBeGreaterThan(0);
		const chapter = world.readingChapters[0];
		// Named chapter numbers are separate from persistent passage indices.
		const worldPageDisplay = `CH. ${String(chapter.index + 1).padStart(2, '0')}`;
		expect(chapterLabel(chapter.index).toUpperCase()).toBe(worldPageDisplay);
	});

	it('a world lookup by key produces chapters whose displayed numbers start at Ch. 01', () => {
		const world = getWorld(getWorlds()[0].key);
		expect(chapterLabel(world.readingChapters[0].index)).toBe('Ch. 01');
	});
});
