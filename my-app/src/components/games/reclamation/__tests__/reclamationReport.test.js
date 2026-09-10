import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import { describe, it, expect, afterEach } from 'vitest';
import { createMatch, send, pass, moveSwift, getPublicState, createRngState, nextRandom } from '../../../../gameplay/expedition/expeditionRules';
import { chooseSend } from '../../../../gameplay/expedition/expeditionBot';
import { ROSTER_SIZE } from '../../../../gameplay/expedition/expeditionInterpretation';
import { buildMatchReport, ReclamationReport } from '../reclamationReport';

/*
	Coverage for buildMatchReport, per docs/design/reclamation-play-enhancements.md Pass 1
	item 3. The helpers below (makeRecord/makeRoster/makeWorld/makeWorlds/makeRng) and the
	bot-vs-bot driving loop are copied from expeditionBot.test.js's
	"full bot-vs-bot match" coverage, since the report has to be built from a real played
	match rather than a hand-authored one.
*/

function makeRecord(id, overrides = {}) {
	return {
		id,
		species: overrides.species || 'testling',
		provenance: { serial: 1, origin: overrides.origin || 'magmuth' },
		attributes: {
			strength: 50, vitality: 60, endurance: 70, agility: 50, reflex: 50,
			intelligence: 50, willpower: 50, instinct: 50, charisma: 50, resilience: 80,
			...overrides.attributes,
		},
		element: overrides.element || { primary: 'fire', affinities: { fire: 100 } },
		archetype: overrides.archetype || { key: 'balanced', favors: [] },
		physiology: overrides.physiology || {
			breathes: ['gas'],
			environmentalTolerance: { ambientMedia: ['gas'], temperatureC: { min: -50, max: 200 } },
		},
		traits: overrides.traits || { guaranteed: [], rolled: [] },
		temperament: overrides.temperament || { boldness: 50, curiosity: 50, energy: 50, aggression: 50, sociability: 50 },
		abilities: overrides.abilities || [
			{ name: 'Strike', signature: false, instrument: 'fists', action: 'strike', medium: 'fire', intensity: 60 },
		],
	};
}

function makeRoster(prefix, overridesFn) {
	const roster = [];
	for (let i = 0; i < ROSTER_SIZE; i++) {
		roster.push(makeRecord(`${prefix}_${i}`, overridesFn ? overridesFn(i) : {}));
	}
	return roster;
}

function makeWorld(planet, element) {
	return {
		planet,
		element,
		sites: [0, 1, 2].map((i) => ({
			id: `${planet.toLowerCase()}-site-${i}`,
			name: `${planet} Site ${i}`,
			planet,
			element,
			environment: { medium: 'gas', temperatureC: { min: -50, max: 200 } },
		})),
	};
}

function makeWorlds(count = 9) {
	const planets = [
		'Magmuth', 'Poseidas', 'Grimedes', 'Luminax', 'Floria', 'Zolton', 'Phantiri', 'Stonera', 'Drainov',
	];
	const elements = ['fire', 'water', 'dark', 'light', 'plant', 'electric', 'ghost', 'rock', 'chemical'];
	const worlds = [];
	for (let i = 0; i < count; i++) {
		worlds.push(makeWorld(planets[i % planets.length], elements[i % elements.length]));
	}
	return worlds;
}

function makeRng(seed) {
	let state = createRngState(seed);
	return {
		float() {
			const { value, nextState } = nextRandom(state);
			state = nextState;
			return value;
		},
	};
}

// plays a full bot-vs-bot match to phase 'matchEnd' and returns the final state, exactly
// as expeditionBot.test.js's "full bot-vs-bot match" test does
function playToMatchEnd(seed) {
	const rosterA = makeRoster('A', (i) => (i % 3 === 0 ? { traits: { guaranteed: [], rolled: ['stealthy'] } } : {}));
	const rosterB = makeRoster('B', (i) => (i % 4 === 0 ? { traits: { guaranteed: [], rolled: ['armored'] } } : {}));
	let state = createMatch({ rosterA, rosterB, worlds: makeWorlds(), seed });

	let botRng = makeRng(`${seed}-bot`);
	let guard = 0;
	const GUARD_LIMIT = 5000;

	while (state.phase !== 'matchEnd' && guard < GUARD_LIMIT) {
		guard++;
		if (state.phase === 'deploy') {
			const handler = state.turn;
			const publicState = getPublicState(state, handler);
			const action = chooseSend(publicState, state.players[handler].roster, handler, botRng);
			if (action.type === 'send') {
				state = send(state, handler, action.recordId, action.siteId, action.hidden);
			} else if (action.type === 'move') {
				// a swift move does not spend the turn (assumption 20); if the engine refuses
				// it, fall through to a pass rather than looping on the same action
				state = moveSwift(state, handler, action.recordId, action.siteId) || pass(state, handler);
			} else {
				state = pass(state, handler);
			}
		}
	}
	if (guard >= GUARD_LIMIT) {
		throw new Error('match did not reach matchEnd within the guard limit');
	}
	return { rosterA, rosterB, state };
}

// a recordsById map built from the original rosters, as the UI (which still holds the
// full squads) would build one for buildMatchReport's optional third argument
function recordsByIdFrom(rosterA, rosterB) {
	const map = {};
	[...rosterA, ...rosterB].forEach((r) => { map[r.id] = r; });
	return map;
}

describe('buildMatchReport', () => {
	it('reports a full played match: worlds, who fields, sends, and a non-empty decisive sentence', () => {
		const { rosterA, rosterB, state } = playToMatchEnd('report-seed-1');
		const you = 'A';
		const recordsById = recordsByIdFrom(rosterA, rosterB);
		const report = buildMatchReport(state, you, recordsById);

		expect(report.won).toBe(state.winner === you);
		expect(report.sitesYou).toBe(state.players.A.sitesWon);
		expect(report.sitesRival).toBe(state.players.B.sitesWon);
		expect(Array.isArray(report.worlds)).toBe(true);
		expect(report.worlds.length).toBeGreaterThan(0);
		expect(report.worlds.length).toBeLessThanOrEqual(9);

		// who fields agree with the tallies the engine itself kept (sitesWon)
		const wonByYou = report.worlds.filter((w) => w.who === 'you').length;
		const wonByRival = report.worlds.filter((w) => w.who === 'rival').length;
		const wonByCourt = report.worlds.filter((w) => w.who === 'court').length;
		expect(wonByYou).toBe(state.players.A.sitesWon);
		expect(wonByRival).toBe(state.players.B.sitesWon);
		expect(wonByYou + wonByRival + wonByCourt).toBe(report.worlds.length);

		// worlds are in frame order then site order
		for (let i = 1; i < report.worlds.length; i++) {
			expect(report.worlds[i].frameIndex).toBeGreaterThanOrEqual(report.worlds[i - 1].frameIndex);
		}

		// every world names a planet, a site and an element, and carries creature rows
		report.worlds.forEach((w) => {
			expect(typeof w.planet).toBe('string');
			expect(typeof w.siteName).toBe('string');
			expect(Array.isArray(w.yours)).toBe(true);
			expect(Array.isArray(w.theirs)).toBe(true);
			w.yours.concat(w.theirs).forEach((entry) => {
				expect(entry).toHaveProperty('recordId');
				expect(entry).toHaveProperty('hold');
				expect(entry).toHaveProperty('hurt');
				expect(entry).toHaveProperty('recovered');
				expect(['held', 'withdrew', 'downed']).toContain(entry.fate);
				// with a recordsById map supplied, records resolve rather than staying null
				expect(entry.record).not.toBeNull();
			});
		});

		expect(report.sends.you).toBe(state.players.A.sentCount);
		expect(report.sends.rival).toBe(state.players.B.sentCount);

		expect(typeof report.decisive).toBe('string');
		expect(report.decisive.length).toBeGreaterThan(0);

		expect(['clinched', 'frames-exhausted', 'tiebreak']).toContain(report.reason);
	});

	it('downs and hurts reported are consistent with the resolution log', () => {
		const { rosterA, rosterB, state } = playToMatchEnd('report-seed-2');
		const recordsById = recordsByIdFrom(rosterA, rosterB);
		const report = buildMatchReport(state, 'A', recordsById);

		// THE BASE, with Pass 2's vocabulary: a landing attack is an 'attack' event; the
		// 'sweep' event before a burst announces it and lands nothing itself
		const acts = state.resolutionLog.filter((e) => e && e.type === 'attack');
		const downedCount = acts.filter((e) => e.outcome === 'downed').length;
		const hurtCount = acts.filter((e) => e.outcome === 'hurt').length;
		expect(downedCount + hurtCount).toBeGreaterThan(0);

		expect(report.downs.dealt + report.downs.taken).toBeLessThanOrEqual(downedCount);
		expect(report.hurts.dealt + report.hurts.taken).toBeLessThanOrEqual(hurtCount);
		expect(report.downs.dealt).toBeGreaterThanOrEqual(0);
		expect(report.downs.taken).toBeGreaterThanOrEqual(0);
	});

	// assumption 19: allies recover under a bolster at the Ruling, and the world row says so
	it('carries the hold a bolster gave back, per creature per round', () => {
		const { rosterA, rosterB, state } = playToMatchEnd('report-seed-2');
		const report = buildMatchReport(state, 'A', recordsByIdFrom(rosterA, rosterB));
		const recovered = state.resolutionLog.filter((e) => e && e.type === 'recover');
		const reported = report.worlds
			.flatMap((w) => w.yours.concat(w.theirs))
			.filter((e) => e.recovered > 0);
		if (recovered.length === 0) {
			expect(reported.length).toBe(0);
		} else {
			reported.forEach((e) => expect(e.recovered).toBeGreaterThan(0));
			expect(reported.length).toBeLessThanOrEqual(recovered.length);
		}
	});

	it('champion, when present, is on a world the player won and carries the highest counted hold there', () => {
		const { rosterA, rosterB, state } = playToMatchEnd('report-seed-3');
		const recordsById = recordsByIdFrom(rosterA, rosterB);
		const report = buildMatchReport(state, 'A', recordsById);

		if (report.champion) {
			const wonWorlds = report.worlds.filter((w) => w.who === 'you');
			const allYourHolds = wonWorlds.flatMap((w) => w.yours.map((e) => e.hold));
			expect(report.champion.hold).toBe(Math.max(...allYourHolds));
			expect(report.champion.record).not.toBeNull();
		}
	});

	it('works without a recordsById map, falling back to null records rather than throwing', () => {
		const { state } = playToMatchEnd('report-seed-4');
		expect(() => buildMatchReport(state, 'A')).not.toThrow();
		const report = buildMatchReport(state, 'A');
		expect(report.worlds.length).toBeGreaterThan(0);
		report.worlds.forEach((w) => {
			w.yours.concat(w.theirs).forEach((entry) => {
				expect(entry.record).toBeNull();
			});
		});
	});

	it('handles an empty resolutionLog (partial data) without throwing and reports zero worlds', () => {
		const emptyMatch = {
			frames: [],
			resolutionLog: [],
			players: {
				A: { roster: [], sentCount: 0, holding: [], withdrawn: [], downed: [], sitesWon: 0, firstPasser: false },
				B: { roster: [], sentCount: 0, holding: [], withdrawn: [], downed: [], sitesWon: 0, firstPasser: false },
			},
			winner: null,
			matchEndReason: null,
		};
		expect(() => buildMatchReport(emptyMatch, 'A')).not.toThrow();
		const report = buildMatchReport(emptyMatch, 'A');
		expect(report.worlds).toEqual([]);
		expect(report.sitesYou).toBe(0);
		expect(report.sitesRival).toBe(0);
		expect(report.champion).toBeNull();
		expect(typeof report.decisive).toBe('string');
	});

	it('does not throw on a completely empty match object', () => {
		expect(() => buildMatchReport({}, 'A')).not.toThrow();
		expect(() => buildMatchReport(null, 'A')).not.toThrow();
		expect(() => buildMatchReport(undefined, 'A')).not.toThrow();
	});
});

/*
	ReclamationReport / the Proving notes panel.

	@testing-library/react is not a devDependency here (see reclamationDraft.test.js's
	file header for the same note), but react-dom 17 is a direct dependency, so this
	file mounts the component with plain ReactDOM.render + react-dom/test-utils' act,
	against a real jsdom container, and drives it with native DOM events. No new
	dependency is added.

	Storage is injected via the `storage` prop (a fake object, the same shape used
	throughout this test suite and in reclamationStorage.test.js / reclamationTelemetry.
	test.js): ReclamationReport passes it straight into createTelemetry({ storage })
	when no `telemetry` prop is given, so the panel's save/export calls land on the fake
	rather than the real window.localStorage. See reclamationReport.js's
	ReclamationProvingNotes class comment for the two supported injection points.
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

function minimalReport(won) {
	return {
		won,
		sitesYou: won ? 5 : 2,
		sitesRival: won ? 2 : 5,
		sitesCourt: 0,
		reason: 'clinched',
		worlds: [],
		sends: { you: 3, rival: 4 },
		downs: { dealt: 1, taken: 0 },
		hurts: { dealt: 0, taken: 1 },
		decisive: 'You clinched the Charter in round 3, taking Magmuth by 4.',
		champion: null,
	};
}

describe('ReclamationReport / Proving notes panel', () => {
	let container;

	function mount(props) {
		container = document.createElement('div');
		document.body.appendChild(container);
		act(() => {
			ReactDOM.render(<ReclamationReport {...props} />, container);
		});
		return container;
	}

	afterEach(() => {
		if (container) {
			act(() => {
				ReactDOM.unmountComponentAtNode(container);
			});
			container.remove();
			container = null;
		}
	});

	function setInputValue(input, value) {
		const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
		setter.call(input, value);
		input.dispatchEvent(new window.Event('input', { bubbles: true }));
	}

	it('renders the notes panel with the three questions and the expected data attributes', () => {
		const storage = makeFakeStorage();
		mount({
			report: minimalReport(true), onNewProving: () => {}, rivalName: 'Broker', seed: 42, rivalId: 'proctor', storage,
		});
		expect(container.querySelector('[data-notes]')).toBeTruthy();
		expect(container.querySelector('[data-notes-tension]')).toBeTruthy();
		expect(container.querySelector('[data-notes-obvious]')).toBeTruthy();
		expect(container.querySelector('[data-notes-earned="earned"]')).toBeTruthy();
		expect(container.querySelector('[data-notes-earned="handed"]')).toBeTruthy();
		expect(container.querySelector('[data-notes-earned="unsure"]')).toBeTruthy();
		expect(container.querySelector('[data-notes-save]')).toBeTruthy();
		expect(container.querySelector('[data-notes-export]')).toBeTruthy();
		expect(container.querySelector('[data-notes-count]')).toBeTruthy();
		// "Unsure" is the default segment
		expect(container.querySelector('[data-notes-earned="unsure"]').getAttribute('aria-pressed')).toBe('true');
	});

	it('typing into the two text rows and choosing a segment, then saving, calls saveNotes with the seed and the answers', () => {
		const storage = makeFakeStorage();
		mount({
			report: minimalReport(true), onNewProving: () => {}, rivalName: 'Broker', seed: 42, rivalId: 'proctor', storage,
		});

		const tensionInput = container.querySelector('[data-notes-tension]');
		const obviousInput = container.querySelector('[data-notes-obvious]');
		act(() => { setInputValue(tensionInput, 'Round 3, the last world'); });
		act(() => { setInputValue(obviousInput, 'Orders, every time'); });
		act(() => {
			container.querySelector('[data-notes-earned="handed"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
		});
		act(() => {
			container.querySelector('[data-notes-save]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
		});

		const saved = JSON.parse(storage.getItem('reclamation.notes.v1'));
		expect(saved).toHaveLength(1);
		expect(saved[0].seed).toBe(42);
		expect(saved[0].rivalId).toBe('proctor');
		expect(saved[0].won).toBe(true);
		expect(saved[0].tension).toBe('Round 3, the last world');
		expect(saved[0].obvious).toBe('Orders, every time');
		expect(saved[0].earned).toBe('handed');

		// the button shows Saved and disables, with the confirmation lamp visible
		const saveBtn = container.querySelector('[data-notes-save]');
		expect(saveBtn.textContent).toBe('Saved');
		expect(saveBtn.disabled).toBe(true);
		expect(container.querySelector('[data-notes-saved-lamp]')).toBeTruthy();
	});

	it('New Proving still works without saving notes first (saving is optional)', () => {
		const storage = makeFakeStorage();
		let clicked = false;
		mount({
			report: minimalReport(false), onNewProving: () => { clicked = true; }, rivalName: 'Broker', seed: 7, rivalId: 'broker', storage,
		});
		act(() => {
			container.querySelector('[data-new-proving]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
		});
		expect(clicked).toBe(true);
		expect(storage.getItem('reclamation.notes.v1')).toBeNull();
	});

	it('Export notes calls exportAll and reveals a read-only textarea with the JSON', () => {
		const storage = makeFakeStorage();
		mount({
			report: minimalReport(true), onNewProving: () => {}, rivalName: 'Broker', seed: 5, rivalId: 'proctor', storage,
		});
		expect(container.querySelector('[data-notes-export-text]')).toBeFalsy();
		act(() => {
			container.querySelector('[data-notes-export]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
		});
		const textarea = container.querySelector('[data-notes-export-text]');
		expect(textarea).toBeTruthy();
		expect(textarea.readOnly).toBe(true);
		const parsed = JSON.parse(textarea.value);
		expect(typeof parsed.exportedAt).toBe('string');
		expect(Array.isArray(parsed.notes)).toBe(true);
		expect(Array.isArray(parsed.telemetry)).toBe(true);
	});

	it('the count line reads N Provings noted, M recorded and updates after a save', () => {
		const storage = makeFakeStorage();
		storage.setItem('reclamation.telemetry.v1', JSON.stringify([{ seed: 1 }, { seed: 2 }]));
		mount({
			report: minimalReport(true), onNewProving: () => {}, rivalName: 'Broker', seed: 9, rivalId: 'proctor', storage,
		});
		expect(container.querySelector('[data-notes-count]').textContent).toBe('0 Provings noted, 2 recorded');
		act(() => {
			container.querySelector('[data-notes-save]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
		});
		expect(container.querySelector('[data-notes-count]').textContent).toBe('1 Proving noted, 2 recorded');
	});
});
