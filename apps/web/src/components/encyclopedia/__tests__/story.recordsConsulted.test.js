import { describe, it, expect } from 'vitest';
import { dedupeRecordsConsulted } from '../Story';
import { getStory } from '../../../lore';

describe('dedupeRecordsConsulted', () => {
	it('drops an entry chip whose name matches a world chip, keeping the world link', () => {
		const worlds = [{ key: 'stonera', name: 'Stonera' }];
		const entries = [{ key: 'stonera', title: 'Stonera' }, { key: 'jorian-belt', title: 'Jorian Belt' }];
		const result = dedupeRecordsConsulted(worlds, entries);
		expect(result.worlds).toEqual(worlds);
		expect(result.entries.map((e) => e.title)).toEqual(['Jorian Belt']);
	});

	it('leaves worlds and entries alone when no names collide', () => {
		const worlds = [{ key: 'floria', name: 'Floria' }];
		const entries = [{ key: 'apex', title: 'APEX' }];
		const result = dedupeRecordsConsulted(worlds, entries);
		expect(result.worlds).toEqual(worlds);
		expect(result.entries).toEqual(entries);
	});

	it("regression: deep-past's before-the-vallerii beat no longer shows Stonera, Telypso or Veridium twice", () => {
		const part = getStory().parts.find((p) => p.era.key === 'deep-past');
		const beat = part.beats.find((b) => b.key === 'before-the-vallerii');
		expect(beat).toBeDefined();

		// The raw data does duplicate these three names between worlds and
		// entries -- that duplication is the bug (issue #428); the dedupe must
		// collapse each pair to a single chip.
		const rawNames = [...beat.worlds.map((w) => w.name), ...beat.entries.map((e) => e.title)];
		expect(rawNames.filter((n) => n === 'Stonera').length).toBeGreaterThan(1);

		const { worlds, entries } = dedupeRecordsConsulted(beat.worlds, beat.entries);
		const names = [...worlds.map((w) => w.name), ...entries.map((e) => e.title)];
		const seen = new Set();
		for (const name of names) {
			expect(seen.has(name), `duplicate chip label: ${name}`).toBe(false);
			seen.add(name);
		}
		expect(names).toContain('Stonera');
		expect(names).toContain('Telypso');
		expect(names).toContain('Veridium');
	});
});
