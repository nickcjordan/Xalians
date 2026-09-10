import { describe, test, expect } from 'vitest';
import { recommendSend } from '../reclamationAdvice';
import { buildRosters } from '@xalians/rules/expedition/roster';
import { createMatch, send, pass, moveSwift, getPublicState } from '@xalians/rules/expedition/expeditionRules';
import { getWorlds } from '@xalians/rules/expedition/sites';

/*
	Simple mode's recommendation: the bot's own pick for the handler's seat, with a
	reason built from the engine's numbers.
*/
function freshMatch(seed) {
	const { rosterA, rosterB } = buildRosters(seed);
	return createMatch({ rosterA, rosterB, worlds: getWorlds(), seed });
}

describe('recommendSend', () => {
	test('on your turn it names a creature in your roster and a site on the world, with a reason', () => {
		const match = freshMatch('advice-1');
		const you = match.turn;
		const view = getPublicState(match, you);
		const rec = recommendSend(view, match.players[you].roster, you);
		expect(rec.type).toBe('send');
		expect(match.players[you].roster.some((r) => r.id === rec.recordId)).toBe(true);
		expect(view.frame.sites.some((s) => s.id === rec.siteId)).toBe(true);
		expect(rec.label).toMatch(/^Send .+ to /);
		expect(rec.reason).toMatch(/holds [0-9.]+ at .+, which nobody has claimed yet\./);
		// the reason ends on the role sentence, the one sentence the whole table prints
		expect(rec.reason).toMatch(/(Attacks one enemy here for [0-9.]+|Sweeps everyone here for [0-9.]+|Bolsters allies here against the world, and recovers what they lose|Shields allies here from the largest attack|Stands here and throws nothing)\.$/);
	});

	test('the recommended send is legal', () => {
		const match = freshMatch('advice-2');
		const you = match.turn;
		const view = getPublicState(match, you);
		const rec = recommendSend(view, match.players[you].roster, you);
		expect(send(match, you, rec.recordId, rec.siteId, rec.hidden)).not.toBeNull();
	});

	test('it is deterministic for the same board', () => {
		const match = freshMatch('advice-3');
		const you = match.turn;
		const view = getPublicState(match, you);
		const a = recommendSend(view, match.players[you].roster, you);
		const b = recommendSend(view, match.players[you].roster, you);
		expect(a).toEqual(b);
	});

	test('off your turn it says to wait; after you pass it recommends nothing new', () => {
		const match = freshMatch('advice-4');
		const you = match.turn;
		const other = you === 'A' ? 'B' : 'A';
		expect(recommendSend(getPublicState(match, other), match.players[other].roster, other).type).toBe('wait');
		const passed = pass(match, you);
		// after the pass the turn is the rival's; from the passer's seat the advice is to wait
		const rec = recommendSend(getPublicState(passed, you), passed.players[you].roster, you);
		expect(['wait', 'pass']).toContain(rec.type);
	});

	test('a pass recommendation carries a plain-language reason', () => {
		// exhaust the sendable count quickly by walking the bot's own advice for both seats
		let match = freshMatch('advice-5');
		let steps = 0;
		let sawPass = false;
		while (match.phase === 'deploy' && steps < 40) {
			steps += 1;
			const seat = match.turn;
			const rec = recommendSend(getPublicState(match, seat), match.players[seat].roster, seat);
			if (rec.type === 'pass') {
				sawPass = true;
				expect(rec.reason.length).toBeGreaterThan(10);
				expect(rec.label).toBe('Pass this round');
				match = pass(match, seat);
			} else if (rec.type === 'send') {
				match = send(match, seat, rec.recordId, rec.siteId, rec.hidden);
			} else if (rec.type === 'move') {
				// assumption 20: a swift move does not spend the turn
				match = moveSwift(match, seat, rec.recordId, rec.siteId) || match;
			} else {
				break;
			}
		}
		expect(sawPass).toBe(true);
		// THE BASE: the second pass resolves and judges inside pass(), so the round is over
		// the moment both seats have passed - there is no Orders phase to land in
		expect(['deploy', 'matchEnd']).toContain(match.phase);
	});
});
