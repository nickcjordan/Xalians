import { describe, it, expect } from 'vitest';
import { linkify } from '../index';
import { assertNoAliasCollisions } from '../loaders';

describe('alias linking', () => {
	it('an alias links in prose: "the Vallerii Empire" links to vallerii once, not twice', () => {
		const text = 'Luminax became one of the largest exporters of food and energy to the rest of the Vallerii Empire.';
		const segments = linkify(text);
		const links = segments.filter((s) => s.key === 'vallerii');
		expect(links.length).toBe(1);
		expect(links[0].text).toBe('Vallerii Empire');
		// The shorter title "Vallerii" never sneaks in a second link inside the
		// span "Vallerii Empire" already claimed.
		expect(links.length).toBe(segments.filter((s) => s.key === 'vallerii').length);
	});

	it('"Kozrak" links to king-kozrak', () => {
		const text = 'They fought to replenish their numbers using the prized Scrambler Tokens of King Kozrak.';
		const segments = linkify(text);
		const links = segments.filter((s) => s.key === 'king-kozrak');
		expect(links.length).toBe(1);
	});

	it('a bare alias mention (no title present) still links', () => {
		const text = 'Kozrak runs the arena tournaments alone.';
		const segments = linkify(text);
		const links = segments.filter((s) => s.key === 'king-kozrak');
		expect(links.length).toBe(1);
		expect(links[0].text).toBe('Kozrak');
	});

	it('an alias never links inside its own entry\'s definition (except suppresses it like a title)', () => {
		const text = 'Kozrak is a tyrant.';
		const segments = linkify(text, { except: 'king-kozrak' });
		const links = segments.filter((s) => s.key);
		expect(links.some((l) => l.key === 'king-kozrak')).toBe(false);
	});
});

describe('assertNoAliasCollisions', () => {
	const planets = [{ name: 'Magmuth' }];
	const species = [{ name: 'Dromeus' }];
	const eras = [{ name: 'The End Wars' }];

	it('passes for a clean fixture with no collisions', () => {
		const entries = [
			{ key: 'a', title: 'Entry A', aliases: ['Alias One'] },
			{ key: 'b', title: 'Entry B', aliases: ['Alias Two'] },
		];
		expect(() => assertNoAliasCollisions({ entries, planets, species, eras })).not.toThrow();
	});

	it('throws when an alias collides with another entry\'s title', () => {
		const entries = [
			{ key: 'a', title: 'Entry A', aliases: [] },
			{ key: 'b', title: 'Entry B', aliases: ['Entry A'] },
		];
		expect(() => assertNoAliasCollisions({ entries, planets, species, eras })).toThrow(/collision/i);
	});

	it('throws when two entries declare the same alias', () => {
		const entries = [
			{ key: 'a', title: 'Entry A', aliases: ['Shared Name'] },
			{ key: 'b', title: 'Entry B', aliases: ['Shared Name'] },
		];
		expect(() => assertNoAliasCollisions({ entries, planets, species, eras })).toThrow(/collision/i);
	});

	it('throws when an alias collides with a world name', () => {
		const entries = [{ key: 'a', title: 'Entry A', aliases: ['Magmuth'] }];
		expect(() => assertNoAliasCollisions({ entries, planets, species, eras })).toThrow(/collision/i);
	});

	it('throws when an alias collides with a species name', () => {
		const entries = [{ key: 'a', title: 'Entry A', aliases: ['Dromeus'] }];
		expect(() => assertNoAliasCollisions({ entries, planets, species, eras })).toThrow(/collision/i);
	});

	it('throws when an alias collides with an era name', () => {
		const entries = [{ key: 'a', title: 'Entry A', aliases: ['The End Wars'] }];
		expect(() => assertNoAliasCollisions({ entries, planets, species, eras })).toThrow(/collision/i);
	});

	it('is case-insensitive when detecting collisions', () => {
		const entries = [{ key: 'a', title: 'Entry A', aliases: ['magmuth'] }];
		expect(() => assertNoAliasCollisions({ entries, planets, species, eras })).toThrow(/collision/i);
	});

	it('the real encyclopedia data loads without throwing (loaders.js runs the assertion at import time)', async () => {
		await expect(import('../loaders')).resolves.toBeDefined();
	});
});
