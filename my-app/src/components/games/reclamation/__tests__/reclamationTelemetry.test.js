import { describe, it, expect } from 'vitest';
import { createTelemetry } from '../reclamationTelemetry';

/*
	Coverage for reclamationTelemetry's contract: decision timing math (mean, median,
	under-2s share, hovers-before-send), the history cap, the export shape, and notes
	save/load, per docs/design/game-validation-principles.md section 3 and the task
	brief. A fake storage (same shape as reclamationStorage.test.js's) and a fake clock
	(an incrementing counter driven by the test) stand in for the browser and for real
	time so every timing assertion is exact rather than flaky.
*/

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

function makeClock(start = 0) {
	let t = start;
	const now = () => t;
	now.advance = (ms) => { t += ms; };
	now.set = (ms) => { t = ms; };
	return now;
}

describe('createTelemetry: decision timing', () => {
	it('records ms per decision and computes mean/median/under-2s share', () => {
		const storage = makeFakeStorage();
		const now = makeClock(0);
		const telemetry = createTelemetry({ storage, now });

		telemetry.beginMatch({ seed: 1, rivalId: 'proctor', mode: 'simple', draft: 'manual', resumed: false });

		// three deploy decisions: 1000ms, 3000ms, 1500ms -> mean 1833.33, median 1500
		telemetry.decisionStart('deploy', { round: 0 });
		now.advance(1000);
		telemetry.decisionEnd('deploy', 'send');

		telemetry.decisionStart('deploy', { round: 0 });
		now.advance(3000);
		telemetry.decisionEnd('deploy', 'pass');

		telemetry.decisionStart('deploy', { round: 1 });
		now.advance(1500);
		telemetry.decisionEnd('deploy', 'relocate');

		const summary = telemetry.endMatch({ won: true, sitesYou: 5, sitesRival: 3, reason: 'clinched' });

		expect(summary.decisions.deploy.count).toBe(3);
		expect(summary.decisions.deploy.meanMs).toBe(Math.round((1000 + 3000 + 1500) / 3));
		expect(summary.decisions.deploy.medianMs).toBe(1500);
		// two of three are under 2000ms
		expect(summary.decisions.deploy.under2sShare).toBeCloseTo(2 / 3, 5);
	});

	it('hover(kind) is counted for every open decision since the last decisionStart', () => {
		const storage = makeFakeStorage();
		const now = makeClock(0);
		const telemetry = createTelemetry({ storage, now });
		telemetry.beginMatch({ seed: 2, rivalId: 'proctor', mode: 'advanced', draft: 'auto', resumed: false });

		telemetry.decisionStart('deploy', { round: 0 });
		telemetry.hover('site');
		telemetry.hover('record');
		now.advance(500);
		telemetry.decisionEnd('deploy', 'send');

		const summary = telemetry.endMatch({ won: false, sitesYou: 2, sitesRival: 5, reason: 'frames-exhausted' });
		expect(summary.decisions.deploy.hoversBeforeSend).toBe(2);
	});

	it('byRound groups deploy and orders means by round index', () => {
		const storage = makeFakeStorage();
		const now = makeClock(0);
		const telemetry = createTelemetry({ storage, now });
		telemetry.beginMatch({ seed: 3, rivalId: 'proctor', mode: 'simple', draft: 'none', resumed: false });

		telemetry.decisionStart('deploy', { round: 0 });
		now.advance(1000);
		telemetry.decisionEnd('deploy', 'send');

		telemetry.decisionStart('orders', { round: 0 });
		now.advance(2000);
		telemetry.decisionEnd('orders', 'go');

		telemetry.decisionStart('deploy', { round: 1 });
		now.advance(4000);
		telemetry.decisionEnd('deploy', 'pass');

		const summary = telemetry.endMatch({ won: true, sitesYou: 5, sitesRival: 1, reason: 'clinched' });
		expect(summary.byRound).toHaveLength(2);
		const round0 = summary.byRound.find((r) => r.round === 0);
		const round1 = summary.byRound.find((r) => r.round === 1);
		expect(round0.deployMeanMs).toBe(1000);
		expect(round0.ordersMeanMs).toBe(2000);
		expect(round1.deployMeanMs).toBe(4000);
		expect(round1.ordersMeanMs).toBeNull();
	});

	it('a decisionEnd with no matching decisionStart is ignored rather than throwing', () => {
		const storage = makeFakeStorage();
		const telemetry = createTelemetry({ storage, now: makeClock(0) });
		telemetry.beginMatch({ seed: 4, rivalId: 'proctor', mode: 'simple', draft: 'none', resumed: false });
		expect(() => telemetry.decisionEnd('orders', 'go')).not.toThrow();
		const summary = telemetry.endMatch({ won: true, sitesYou: 5, sitesRival: 0, reason: 'clinched' });
		expect(summary.decisions.orders.count).toBe(0);
	});
});

describe('createTelemetry: skip', () => {
	it('records ms since playback/rival start, by kind', () => {
		const storage = makeFakeStorage();
		const telemetry = createTelemetry({ storage, now: makeClock(0) });
		telemetry.beginMatch({ seed: 5, rivalId: 'proctor', mode: 'simple', draft: 'none', resumed: false });
		telemetry.skip('playback', 300);
		telemetry.skip('playback', 900);
		telemetry.skip('rival', 100);
		const summary = telemetry.endMatch({ won: true, sitesYou: 5, sitesRival: 2, reason: 'clinched' });
		expect(summary.skips.playback.count).toBe(2);
		expect(summary.skips.playback.meanMs).toBe(600);
		expect(summary.skips.rival.count).toBe(1);
		expect(summary.skips.rival.meanMs).toBe(100);
	});
});

describe('createTelemetry: coach and sound', () => {
	it('coachDismissed records whether it was before the first orders', () => {
		const storage = makeFakeStorage();
		const telemetry = createTelemetry({ storage, now: makeClock(0) });
		telemetry.beginMatch({ seed: 6, rivalId: 'proctor', mode: 'simple', draft: 'none', resumed: false });
		telemetry.coachDismissed({ beforeFirstOrders: true });
		const summary = telemetry.endMatch({ won: true, sitesYou: 5, sitesRival: 0, reason: 'clinched' });
		expect(summary.coach).toEqual({ dismissed: true, beforeFirstOrders: true });
	});

	it('soundToggled records the latest value on the summary', () => {
		const storage = makeFakeStorage();
		const telemetry = createTelemetry({ storage, now: makeClock(0) });
		telemetry.beginMatch({ seed: 7, rivalId: 'proctor', mode: 'simple', draft: 'none', resumed: false });
		telemetry.soundToggled(true);
		telemetry.soundToggled(false);
		const summary = telemetry.endMatch({ won: true, sitesYou: 5, sitesRival: 0, reason: 'clinched' });
		expect(summary.soundOn).toBe(false);
	});
});

describe('createTelemetry: endMatch persistence and cap', () => {
	it('appends a compact summary to storage under reclamation.telemetry.v1', () => {
		const storage = makeFakeStorage();
		const telemetry = createTelemetry({ storage, now: makeClock(0) });
		telemetry.beginMatch({ seed: 8, rivalId: 'proctor', mode: 'simple', draft: 'manual', resumed: false });
		telemetry.endMatch({ won: true, sitesYou: 5, sitesRival: 3, reason: 'clinched' });
		const stored = JSON.parse(storage.getItem('reclamation.telemetry.v1'));
		expect(Array.isArray(stored)).toBe(true);
		expect(stored).toHaveLength(1);
		expect(stored[0].seed).toBe(8);
		expect(stored[0].won).toBe(true);
	});

	it('caps at 100 entries, dropping the oldest first', () => {
		const storage = makeFakeStorage();
		const telemetry = createTelemetry({ storage, now: makeClock(0) });
		for (let i = 0; i < 105; i++) {
			telemetry.beginMatch({ seed: i, rivalId: 'proctor', mode: 'simple', draft: 'none', resumed: false });
			telemetry.endMatch({ won: true, sitesYou: 5, sitesRival: 0, reason: 'clinched' });
		}
		const stored = telemetry.loadTelemetry();
		expect(stored).toHaveLength(100);
		expect(stored.find((e) => e.seed === 0)).toBeUndefined();
		expect(stored.find((e) => e.seed === 104)).toBeDefined();
	});

	it('resumed:true and draft carry through to the persisted summary', () => {
		const storage = makeFakeStorage();
		const telemetry = createTelemetry({ storage, now: makeClock(0) });
		telemetry.beginMatch({ seed: 9, rivalId: 'broker', mode: 'advanced', draft: 'none', resumed: true });
		const summary = telemetry.endMatch({ won: false, sitesYou: 1, sitesRival: 5, reason: 'frames-exhausted' });
		expect(summary.resumed).toBe(true);
		expect(summary.draft).toBe('none');
		expect(summary.rivalId).toBe('broker');
		expect(summary.mode).toBe('advanced');
	});
});

describe('createTelemetry: notes', () => {
	it('saveNotes appends an entry and loadNotes returns it', () => {
		const storage = makeFakeStorage();
		const telemetry = createTelemetry({ storage, now: makeClock(0) });
		telemetry.saveNotes({
			seed: 10, rivalId: 'proctor', won: true, tension: 'round 3', obvious: 'orders every time', earned: 'earned',
		});
		const notes = telemetry.loadNotes();
		expect(notes).toHaveLength(1);
		expect(notes[0].seed).toBe(10);
		expect(notes[0].tension).toBe('round 3');
		expect(notes[0].earned).toBe('earned');
		expect(typeof notes[0].at).toBe('string');
	});

	it('caps notes at 100 entries', () => {
		const storage = makeFakeStorage();
		const telemetry = createTelemetry({ storage, now: makeClock(0) });
		for (let i = 0; i < 105; i++) {
			telemetry.saveNotes({ seed: i, rivalId: 'proctor', won: true, tension: '', obvious: '', earned: 'unsure' });
		}
		const notes = telemetry.loadNotes();
		expect(notes).toHaveLength(100);
		expect(notes.find((n) => n.seed === 0)).toBeUndefined();
		expect(notes.find((n) => n.seed === 104)).toBeDefined();
	});
});

describe('createTelemetry: exportAll', () => {
	it('returns pretty JSON with exportedAt, notes and telemetry', () => {
		const storage = makeFakeStorage();
		const telemetry = createTelemetry({ storage, now: makeClock(0) });
		telemetry.saveNotes({ seed: 1, rivalId: 'proctor', won: true, tension: 'x', obvious: 'y', earned: 'earned' });
		telemetry.beginMatch({ seed: 1, rivalId: 'proctor', mode: 'simple', draft: 'manual', resumed: false });
		telemetry.endMatch({ won: true, sitesYou: 5, sitesRival: 1, reason: 'clinched' });

		const json = telemetry.exportAll();
		expect(typeof json).toBe('string');
		// pretty-printed with 2 spaces
		expect(json).toContain('\n  "');
		const parsed = JSON.parse(json);
		expect(typeof parsed.exportedAt).toBe('string');
		expect(parsed.notes).toHaveLength(1);
		expect(parsed.telemetry).toHaveLength(1);
	});
});

describe('createTelemetry: never throws with no storage', () => {
	it('every call is a safe no-op when storage is unavailable', () => {
		const telemetry = createTelemetry({ storage: { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } }, now: makeClock(0) });
		expect(() => {
			telemetry.beginMatch({ seed: 1, rivalId: 'proctor', mode: 'simple', draft: 'none', resumed: false });
			telemetry.decisionStart('deploy', { round: 0 });
			telemetry.hover('site');
			telemetry.decisionEnd('deploy', 'send');
			telemetry.skip('playback', 100);
			telemetry.coachDismissed({ beforeFirstOrders: false });
			telemetry.soundToggled(true);
			telemetry.endMatch({ won: true, sitesYou: 5, sitesRival: 0, reason: 'clinched' });
			telemetry.saveNotes({ seed: 1, rivalId: 'proctor', won: true, tension: '', obvious: '', earned: 'unsure' });
			telemetry.loadNotes();
			telemetry.loadTelemetry();
			telemetry.exportAll();
			telemetry.clearAll();
		}).not.toThrow();
		expect(telemetry.loadNotes()).toEqual([]);
		expect(telemetry.loadTelemetry()).toEqual([]);
	});
});
