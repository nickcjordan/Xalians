/*
	PASS 18. The pin, said out loud.

	Pinning ships on this pass (expeditionInterpretation PINNING, with the measurement that
	decided it). A restraining attack takes its target's swing for the Clash, which means a
	creature the player expected to attack does nothing - and a swing that vanishes without a
	sentence is how a table loses a player's trust.

	So both halves speak: the pin that lands, and the swing it took. These tests pin the two
	sentences and the fact that the pin event is narrated at all.
*/
import { describe, test, expect } from 'vitest';
import { narrateEvent, classifyEvent } from '../reclamationNarration.js';

describe('the pin speaks', () => {
	test('a landed pin says what it did and what it costs', () => {
		const sentence = narrateEvent(
			{ type: 'pin', recordId: 'a', target: 'b', site: 's1' },
			{ actorName: 'your Graviclaw', targetName: "the rival's Voltish" },
		);
		expect(sentence).toBeTruthy();
		// the cause, then the consequence, in that order
		expect(sentence).toContain('restrains');
		expect(sentence).toContain('does not swing');
		expect(sentence).toContain('your Graviclaw');
		expect(sentence).toContain("the rival's Voltish");
	});

	test('the swing the pin took is not silent', () => {
		const sentence = narrateEvent(
			{ type: 'attack', recordId: 'b', role: 'strike', outcome: 'pinned', power: 0, site: 's1' },
			{ actorName: "the rival's Voltish" },
		);
		expect(sentence).toBeTruthy();
		expect(sentence).toContain('restrained');
		expect(sentence).toContain('does not swing');
	});

	test('a pin with no named target still reads as a sentence', () => {
		// the log can name a record the snapshot no longer carries; the table must not print
		// "undefined does not swing"
		const sentence = narrateEvent({ type: 'pin', recordId: 'a', target: 'gone', site: 's1' }, {});
		expect(sentence).toBeTruthy();
		expect(sentence).not.toContain('undefined');
	});

	test('a pin classifies as a pin, so the playback does not drop it', () => {
		expect(classifyEvent({ type: 'pin', recordId: 'a', target: 'b' })).toBe('pin');
	});

	test('the pinned outcome is distinct from lapsed and cancelled', () => {
		/*
			Three different reasons an attack does not land, and the table must not blur them:
			lapsed means downed first, cancelled means a shield took it (said by the shield),
			and pinned means restrained.
		*/
		const ctx = { actorName: 'your Graviclaw' };
		const pinned = narrateEvent({ type: 'attack', recordId: 'a', role: 'strike', outcome: 'pinned' }, ctx);
		const lapsed = narrateEvent({ type: 'attack', recordId: 'a', role: 'strike', outcome: 'lapsed' }, ctx);
		const cancelled = narrateEvent({ type: 'attack', recordId: 'a', role: 'strike', outcome: 'cancelled' }, ctx);
		expect(pinned).not.toBe(lapsed);
		expect(pinned).toContain('restrained');
		expect(lapsed).toContain('falls before it can attack');
		// a cancelled attack is narrated by the shield that cancelled it, not twice
		expect(cancelled).toBe(null);
	});
});
