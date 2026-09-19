import { describe, it, expect } from 'vitest';
import { groupEvents } from '../Story';
import { getStory } from '../../../lore';

describe('FixedPoints count', () => {
	it('the displayed count is the number of point cards (events), not the number of groups', () => {
		const story = getStory();
		// A part whose fixed points contain at least one contemporaneous group
		// (more than one event at the same order) is the case that exposed the
		// bug: grouping collapses that group to a single card slot, so counting
		// groups undercounts the actual points shown.
		const partWithGroup = story.parts.find((part) => {
			const groups = groupEvents(part.fixedPoints);
			return groups.some((g) => g.kind === 'contemporaneous' && g.events.length > 1);
		});
		expect(partWithGroup, 'expected at least one part with a contemporaneous group of size > 1').toBeDefined();

		const groups = groupEvents(partWithGroup.fixedPoints);
		expect(groups.length).not.toBe(partWithGroup.fixedPoints.length);
		// The correct count (what Story.js now passes to SectionHead) equals
		// fixedPoints.length, i.e. the number of individual point cards.
		const renderedCardCount = groups.reduce((sum, g) => sum + g.events.length, 0);
		expect(partWithGroup.fixedPoints.length).toBe(renderedCardCount);
	});

	it('every part: fixedPoints.length always equals the total number of cards across all groups', () => {
		const story = getStory();
		for (const part of story.parts) {
			const groups = groupEvents(part.fixedPoints);
			const cardCount = groups.reduce((sum, g) => sum + g.events.length, 0);
			expect(part.fixedPoints.length, `${part.era.key} fixedPoints vs rendered cards`).toBe(cardCount);
		}
	});
});
