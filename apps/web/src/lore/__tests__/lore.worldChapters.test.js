import { describe, expect, it } from 'vitest';
import plans from '@xalians/content/worldChapters.json';
import planets from '@xalians/content/planetRecords.json';
import { getWorld, getWorlds, chapterLabel, passageLabel } from '../index';

describe('editorial world chapters', () => {
    it('covers every source passage exactly once, in its original order and wording', () => {
        expect(Object.keys(plans.worlds).sort()).toEqual(getWorlds().map((w) => w.key).sort());
        for (const source of planets) {
            const world = getWorld(source.key);
            const groups = world.readingChapters;
            expect(groups[0].start).toBe(0);
            expect(groups.length).toBeLessThan(world.chapters.length);
            expect(new Set(groups.map((g) => g.key)).size).toBe(groups.length);
            groups.forEach((group, index) => {
                expect(group.paragraphs.length).toBeGreaterThan(0);
                expect(group.index).toBe(index);
                expect(group.title).not.toMatch(/\u2014/);
                expect(group.key).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
                if (index > 0) expect(group.start).toBeGreaterThan(groups[index - 1].start);
            });
            const passages = groups.flatMap((g) => g.paragraphs);
            expect(passages.map((p) => p.text)).toEqual(source.history);
            expect(passages.map((p) => p.index)).toEqual(source.history.map((_, i) => i));
            expect(passages).toEqual(world.chapters);
            expect(world.illustrationAfter).toBeGreaterThanOrEqual(0);
            expect(world.illustrationAfter).toBeLessThan(source.history.length);
        }
    });

    it('distinguishes Poseidas chapters from persistent source passage numbers', () => {
        const world = getWorld('poseidas');
        expect(world.readingChapters.map((c) => c.paragraphs.length)).toEqual([2, 3, 3, 3, 1]);
        expect(world.readingChapters[2].title).toBe('The Algael boom');
        expect(chapterLabel(world.readingChapters[2].index)).toBe('Ch. 03');
        expect(passageLabel(world.readingChapters[2].paragraphs[0].index)).toBe('Passage 06');
    });
});
