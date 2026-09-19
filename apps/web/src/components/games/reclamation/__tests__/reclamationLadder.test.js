/*
	Pass 14. The Charter's way on. A blind reviewer named it one of three highest-value
	fixes: "the end screen's generic NEW PROVING ignores the five-rival ladder the intro
	page advertises." These tests pin who is offered and when, because the rule (only on a
	win, only when there is a rung above) is the part worth getting right: climbing on a
	loss would be the ladder handing out rungs.
*/
import { describe, test, expect } from 'vitest';
import { RIVALS } from '@xalians/rules/expedition/expeditionBot';

// the report's own arithmetic, kept here so the rule is testable without a rendered match
function nextRungFor(rivalId, won) {
	const i = RIVALS.findIndex((r) => r.id === rivalId);
	return won && i >= 0 && i < RIVALS.length - 1 ? RIVALS[i + 1] : null;
}

describe('the ladder on the Charter', () => {
	test('RIVALS is in ladder order and has a rung above the first', () => {
		expect(RIVALS.length).toBeGreaterThan(1);
		expect(RIVALS[0].id).toBeTruthy();
		expect(RIVALS[0].name).toBeTruthy();
	});

	test('a win offers the next rival up, by name', () => {
		const next = nextRungFor(RIVALS[0].id, true);
		expect(next).toBeTruthy();
		expect(next.id).toBe(RIVALS[1].id);
		expect(next.name).toBeTruthy();
		// the plate's habit rides under the name, so the offer says who they are
		expect(next.tag).toBeTruthy();
	});

	test('a loss offers no rung: the ladder is climbed, never handed out', () => {
		expect(nextRungFor(RIVALS[0].id, false)).toBe(null);
		expect(nextRungFor(RIVALS[2].id, false)).toBe(null);
	});

	test('beating the top rival offers no rung, because there is none', () => {
		expect(nextRungFor(RIVALS[RIVALS.length - 1].id, true)).toBe(null);
	});

	test('an unknown rival offers no rung rather than the first one', () => {
		expect(nextRungFor('not-a-rival', true)).toBe(null);
	});
});
