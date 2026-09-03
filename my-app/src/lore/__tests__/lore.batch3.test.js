import { describe, it, expect } from 'vitest';
import { getConnections, getReader, getReaderPart } from '../index';

describe('getConnections', () => {
	it("apex's connections include the-end-wars or vallerii with count > 1, and never include apex itself", () => {
		const rows = getConnections('entry', 'apex');
		expect(rows.length).toBeGreaterThan(0);
		expect(rows.some((r) => r.kind === 'entry' && r.key === 'apex')).toBe(false);
		const candidate = rows.find((r) => r.key === 'the-end-wars' || r.key === 'vallerii');
		expect(candidate).toBeDefined();
		expect(candidate.count).toBeGreaterThan(1);
	});

	it("magmuth's connections include species dromeus or imprit", () => {
		const rows = getConnections('world', 'magmuth');
		expect(rows.length).toBeGreaterThan(0);
		const found = rows.some((r) => r.kind === 'species' && (r.key === 'dromeus' || r.key === 'imprit'));
		expect(found).toBe(true);
	});

	it('every connection has a sample with a non-empty excerpt', () => {
		const rows = [...getConnections('entry', 'apex'), ...getConnections('world', 'magmuth')];
		expect(rows.length).toBeGreaterThan(0);
		for (const row of rows) {
			expect(row.sample).toBeDefined();
			expect(row.sample.label).toBeTruthy();
			expect(row.sample.excerpt).toBeTruthy();
			expect(row.sample.excerpt.length).toBeGreaterThan(0);
		}
	});

	it('respects the limit option', () => {
		const rows = getConnections('entry', 'apex', { limit: 2 });
		expect(rows.length).toBeLessThanOrEqual(2);
	});

	it('rows are sorted by count desc then name', () => {
		const rows = getConnections('world', 'magmuth');
		for (let i = 1; i < rows.length; i++) {
			const prev = rows[i - 1];
			const cur = rows[i];
			expect(
				prev.count > cur.count || (prev.count === cur.count && prev.name.localeCompare(cur.name) <= 0)
			).toBe(true);
		}
	});

	it('returns [] for an unknown subject', () => {
		expect(getConnections('entry', 'not-a-real-key')).toEqual([]);
	});
});

describe('getReader', () => {
	it('has 7 parts in order, and totalParagraphs equals the sum of part paragraph counts', () => {
		const reader = getReader();
		expect(reader.parts.length).toBe(7);
		const orders = reader.parts.map((p) => p.order);
		expect(orders).toEqual([0, 1, 2, 3, 4, 5, 6]);

		let sum = 0;
		for (const part of reader.parts) {
			for (const section of part.sections) {
				sum += section.paragraphs.length;
			}
		}
		expect(reader.totalParagraphs).toBe(sum);
	});

	it('every section paragraph carries a world, index, and text', () => {
		const reader = getReader();
		for (const part of reader.parts) {
			for (const section of part.sections) {
				expect(Array.isArray(section.paragraphs)).toBe(true);
				expect(section.paragraphs.length).toBeGreaterThan(0);
				for (const paragraph of section.paragraphs) {
					expect(paragraph.world).toBeDefined();
					expect(paragraph.world.key).toBeTruthy();
					expect(typeof paragraph.index).toBe('number');
					expect(typeof paragraph.text).toBe('string');
				}
			}
		}
	});

	it('a null head reads as "Elsewhere in the era" content -- head is null, not a placeholder string', () => {
		const reader = getReader();
		const hasNullHead = reader.parts.some((part) => part.sections.some((s) => s.head === null));
		expect(hasNullHead).toBe(true);
	});
});

describe('getReaderPart', () => {
	it("end-wars part's prev is accords and next is present", () => {
		const part = getReaderPart('end-wars');
		expect(part).toBeDefined();
		expect(part.prev).toBe('accords');
		expect(part.next).toBe('present');
	});

	it("deep-past part's prev is null", () => {
		const part = getReaderPart('deep-past');
		expect(part).toBeDefined();
		expect(part.prev).toBeNull();
	});

	it('present part (the last era) has next null', () => {
		const part = getReaderPart('present');
		expect(part).toBeDefined();
		expect(part.next).toBeNull();
	});

	it('returns undefined for an unknown era key', () => {
		expect(getReaderPart('not-a-real-era')).toBeUndefined();
	});
});
