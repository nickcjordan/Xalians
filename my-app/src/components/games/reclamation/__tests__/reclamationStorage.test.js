import { describe, it, expect, beforeEach } from 'vitest';
import {
	saveMatch, loadMatch, clearMatch,
	recordResult, loadHistory, recordAgainst, clearHistory,
	loadRivalId, saveRivalId,
} from '../reclamationStorage';
import { GENERATOR_VERSION } from '../../../../gameplay/generator/constants.js';

/*
	Coverage for reclamationStorage's contract: every read/write degrades to a safe
	default rather than throwing, per docs/design/reclamation-play-enhancements.md Pass 1
	item 2 ("the match is saved to the browser after every engine step... a history of
	results per rival is kept locally").
*/

// a fake storage object standing in for window.localStorage, so tests never touch the
// real browser storage and can also simulate corruption a real Storage object could not
// hand back on its own (see the "corrupt JSON" tests below).
function makeFakeStorage(initial = {}) {
	const data = { ...initial };
	return {
		getItem(key) {
			return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
		},
		setItem(key, value) {
			data[key] = String(value);
		},
		removeItem(key) {
			delete data[key];
		},
		_raw: data,
	};
}

describe('saveMatch / loadMatch / clearMatch', () => {
	it('round-trips a payload through save and load', () => {
		const storage = makeFakeStorage();
		const payload = { match: { phase: 'deploy' }, seed: 'abc', rivalId: 'proctor', log: [], squadIds: ['a', 'b'], mode: 'simple' };
		saveMatch(payload, storage);
		expect(loadMatch(storage)).toEqual(payload);
	});

	it('returns null when nothing is saved', () => {
		const storage = makeFakeStorage();
		expect(loadMatch(storage)).toBeNull();
	});

	it('returns null on a version mismatch', () => {
		const storage = makeFakeStorage();
		storage.setItem('reclamation.match.v3', JSON.stringify({ version: 2, generatorVersion: GENERATOR_VERSION, payload: { anything: true } }));
		expect(loadMatch(storage)).toBeNull();
	});

	it('returns null on a generator version mismatch', () => {
		// hardening Decision 8: a save stores seeds, so a new generator would regenerate
		// different creatures than the saved log names; discard rather than misread
		const storage = makeFakeStorage();
		storage.setItem('reclamation.match.v3', JSON.stringify({ version: 1, generatorVersion: '0.0.1-not-this-one', payload: { anything: true } }));
		expect(loadMatch(storage)).toBeNull();
	});

	it('discards a save written before the generator version was recorded', () => {
		const storage = makeFakeStorage();
		storage.setItem('reclamation.match.v3', JSON.stringify({ version: 1, payload: { anything: true } }));
		expect(loadMatch(storage)).toBeNull();
	});

	it('stamps the current generator version onto the save', () => {
		const storage = makeFakeStorage();
		saveMatch({ seed: 'abc' }, storage);
		const wrapper = JSON.parse(storage.getItem('reclamation.match.v3'));
		expect(wrapper.generatorVersion).toBe(GENERATOR_VERSION);
	});

	it('drops a save under either older key rather than offering it (Pass 3 bumped to v3)', () => {
		// the stake put `stakes` on every frame and `stakeUsed` on every player, so a v2
		// save resumes into a match the table cannot read the Charter arithmetic off
		const storage = makeFakeStorage();
		storage.setItem('reclamation.match.v1', JSON.stringify({ version: 1, generatorVersion: GENERATOR_VERSION, payload: { old: true } }));
		storage.setItem('reclamation.match.v2', JSON.stringify({ version: 1, generatorVersion: GENERATOR_VERSION, payload: { old: true } }));
		expect(loadMatch(storage)).toBeNull();
		expect(storage.getItem('reclamation.match.v1')).toBeNull();
		expect(storage.getItem('reclamation.match.v2')).toBeNull();
	});

	it('returns null on corrupt JSON rather than throwing', () => {
		const storage = makeFakeStorage();
		storage.setItem('reclamation.match.v3', '{not valid json');
		expect(() => loadMatch(storage)).not.toThrow();
		expect(loadMatch(storage)).toBeNull();
	});

	it('clearMatch removes the saved match', () => {
		const storage = makeFakeStorage();
		saveMatch({ some: 'thing' }, storage);
		clearMatch(storage);
		expect(loadMatch(storage)).toBeNull();
	});

	it('never throws when storage.setItem or getItem throw (quota exceeded, private window)', () => {
		const storage = {
			getItem() { throw new Error('blocked'); },
			setItem() { throw new Error('blocked'); },
			removeItem() { throw new Error('blocked'); },
		};
		expect(() => saveMatch({ a: 1 }, storage)).not.toThrow();
		expect(() => loadMatch(storage)).not.toThrow();
		expect(loadMatch(storage)).toBeNull();
		expect(() => clearMatch(storage)).not.toThrow();
	});

	it('returns defaults when window is undefined and no storage is injected', () => {
		// this test environment does define window (jsdom), so this exercises the
		// "no storage object and no usable global" branch by passing an explicitly falsy
		// storage that resolveStorage cannot use; the important contract is "never throws"
		expect(() => loadMatch(null)).not.toThrow();
	});
});

describe('recordResult / loadHistory / recordAgainst / clearHistory', () => {
	it('appends a result with an ISO timestamp', () => {
		const storage = makeFakeStorage();
		recordResult({ rivalId: 'proctor', won: true, sitesYou: 6, sitesRival: 3, seed: 'x', reason: 'clinched' }, storage);
		const history = loadHistory(storage);
		expect(history).toHaveLength(1);
		expect(history[0].rivalId).toBe('proctor');
		expect(history[0].won).toBe(true);
		expect(typeof history[0].at).toBe('string');
		expect(() => new Date(history[0].at).toISOString()).not.toThrow();
	});

	it('caps history at 100 entries, dropping the oldest first', () => {
		const storage = makeFakeStorage();
		for (let i = 0; i < 105; i++) {
			recordResult({ rivalId: 'proctor', won: i % 2 === 0, sitesYou: i, sitesRival: 0, seed: `seed-${i}`, reason: 'clinched' }, storage);
		}
		const history = loadHistory(storage);
		expect(history).toHaveLength(100);
		// the oldest five (seed-0..seed-4) should have been dropped
		expect(history.find((e) => e.seed === 'seed-0')).toBeUndefined();
		expect(history.find((e) => e.seed === 'seed-104')).toBeDefined();
	});

	it('loadHistory returns an empty array when nothing is saved or the JSON is corrupt', () => {
		const storage = makeFakeStorage();
		expect(loadHistory(storage)).toEqual([]);
		storage.setItem('reclamation.history.v1', 'not json at all');
		expect(loadHistory(storage)).toEqual([]);
	});

	it('loadHistory returns an empty array when the saved value is not an array', () => {
		const storage = makeFakeStorage();
		storage.setItem('reclamation.history.v1', JSON.stringify({ not: 'an array' }));
		expect(loadHistory(storage)).toEqual([]);
	});

	it('recordAgainst tallies played and won for one rival only', () => {
		const storage = makeFakeStorage();
		recordResult({ rivalId: 'proctor', won: true, sitesYou: 6, sitesRival: 2, seed: 'a', reason: 'clinched' }, storage);
		recordResult({ rivalId: 'proctor', won: false, sitesYou: 3, sitesRival: 6, seed: 'b', reason: 'clinched' }, storage);
		recordResult({ rivalId: 'broker', won: true, sitesYou: 5, sitesRival: 4, seed: 'c', reason: 'frames-exhausted' }, storage);
		expect(recordAgainst('proctor', storage)).toEqual({ played: 2, won: 1 });
		expect(recordAgainst('broker', storage)).toEqual({ played: 1, won: 1 });
		expect(recordAgainst('nobody', storage)).toEqual({ played: 0, won: 0 });
	});

	it('clearHistory empties the saved history', () => {
		const storage = makeFakeStorage();
		recordResult({ rivalId: 'proctor', won: true, sitesYou: 6, sitesRival: 2, seed: 'a', reason: 'clinched' }, storage);
		clearHistory(storage);
		expect(loadHistory(storage)).toEqual([]);
	});
});

describe('loadRivalId / saveRivalId', () => {
	it('round-trips the remembered rival choice', () => {
		const storage = makeFakeStorage();
		expect(loadRivalId(storage)).toBeNull();
		saveRivalId('windsailor', storage);
		expect(loadRivalId(storage)).toBe('windsailor');
	});

	it('never throws when the injected storage throws', () => {
		const storage = {
			getItem() { throw new Error('blocked'); },
			setItem() { throw new Error('blocked'); },
		};
		expect(() => saveRivalId('proctor', storage)).not.toThrow();
		expect(() => loadRivalId(storage)).not.toThrow();
		expect(loadRivalId(storage)).toBeNull();
	});
});
