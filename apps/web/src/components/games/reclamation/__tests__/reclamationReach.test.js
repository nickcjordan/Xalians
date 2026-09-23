/*
	Pass 12. "What is still reachable", the one line in the status strip that answers the
	rubric critic's lowest score (a reason to keep playing, 4 of 10): shut out on every
	world of round 3, nothing on the screen gave a reason to take the turn.

	It is arithmetic, not a gift: worlds still to be ruled on, against each side's distance
	from the clinch. These tests pin each of the four cases, including the two that say
	nothing, because a line that appears when the score already speaks is noise.
*/
import { describe, test, expect } from 'vitest';
import { reachabilityLine } from '../reclamationMatch.js';

// the shape the line reads: a view with a frame and a phase, and the two players' scores
const view = (frameIndex, phase = 'deploy', worlds = 3) => ({
	frameIndex,
	phase,
	frame: { sites: Array.from({ length: worlds }, (_, i) => ({ id: `s${i}` })) },
});
const side = (sitesWon) => ({ sitesWon });

describe('what is still reachable', () => {
	test('says nothing while the Proving is live for both sides', () => {
		// round 1, level: the score already says everything there is to say
		expect(reachabilityLine(view(0), side(0), side(0))).toBe(null);
		// round 3, three all, two of the three remaining clinches for either: still a contest
		expect(reachabilityLine(view(2), side(3), side(3))).toBe(null);
	});

	test('tells a player who is behind exactly what it would take', () => {
		const line = reachabilityLine(view(0), side(0), side(2));
		expect(line).toBeTruthy();
		expect(line.tone).toBe('behind');
		// five worlds clinch, so from nothing it names five, out of the nine still to come
		expect(line.text).toContain('5 more of the 9');
		expect(line.text).toContain('worlds left');
	});

	test('says plainly when the Charter can no longer be taken', () => {
		// last round, one world's worth of hope against a rival needing only one
		const line = reachabilityLine(view(2), side(0), side(4));
		expect(line).toBeTruthy();
		expect(line.tone).toBe('lost');
		expect(line.text).toContain('out of reach');
		// and it still gives the player a reason to play the round out
		expect(line.text).toContain('count toward the record');
	});

	test('says when the rival can no longer clinch', () => {
		const line = reachabilityLine(view(2), side(2), side(0));
		expect(line).toBeTruthy();
		expect(line.tone).toBe('won');
		expect(line.text).toContain('no longer clinch');
	});

	/*
		The worlds of THIS round stop counting once the Court has ruled on them, or the line
		would tell a player a world is still winnable after it has been awarded. This was a
		real bug in the first version, caught by paint before it shipped.
	*/
	test('stops counting this round once the Court has ruled', () => {
		const duringDeploy = reachabilityLine(view(2, 'deploy'), side(0), side(4));
		const afterRuling = reachabilityLine(view(2, 'judge'), side(0), side(4));
		expect(duringDeploy).toBeTruthy();
		// with the last round settled there is nothing left to count, so nothing to say
		expect(afterRuling).toBe(null);
	});

	test('never speaks at the end of the Proving, where the Charter speaks', () => {
		expect(reachabilityLine(view(2, 'matchEnd'), side(1), side(5))).toBe(null);
		expect(reachabilityLine(null, side(0), side(0))).toBe(null);
	});

	/*
		PASS 39. Every world won needs a creature on it, and sends are a budget for the whole
		game. A critic reached round three needing three worlds with two sends left while the
		line still said three of the three were there to take.
	*/
	test('calls the game lost when there are not enough sends left to take the worlds needed', () => {
		const me = { sitesWon: 2, sentCount: 9, roster: [{}, {}, {}], stakeUsed: true, passed: false };
		const line = reachabilityLine({ ...view(2), rules: { sendable: 11, trailingBonus: 0 }, board: {} }, me, side(2));
		expect(line).toBeTruthy();
		expect(line.tone).toBe('lost');
		expect(line.text).toContain('only 2 more creatures');
	});

	test('does not call it lost while an unused stake could still make up the difference', () => {
		const me = { sitesWon: 2, sentCount: 9, roster: [{}, {}, {}], stakeUsed: false, stakeableSiteIds: ['s0'], passed: false };
		const line = reachabilityLine({ ...view(2), rules: { sendable: 11, trailingBonus: 0 }, board: {} }, me, side(2));
		expect(line === null || line.tone !== 'lost').toBe(true);
	});

	test('counts a world you already stand on as still winnable without a send', () => {
		const me = { sitesWon: 2, sentCount: 10, roster: [{}], stakeUsed: true, passed: false };
		const board = { s0: { A: [{ record: {}, downed: false }], B: [] }, s1: { A: [{ record: {}, downed: false }], B: [] }, s2: { A: [], B: [] } };
		const line = reachabilityLine({ ...view(2), rules: { sendable: 11, trailingBonus: 0 }, board, players: { A: me } }, me, side(2));
		expect(line === null || line.tone !== 'lost').toBe(true);
	});

	/*
		PASS 47. A pass closes this round only. The line used to count no new worlds at all
		once you had passed, so every Clash of round one at 0 to 0 read "out of reach".
	*/
	test('after a pass in round one, the rounds to come still count', () => {
		const me = { sitesWon: 0, sentCount: 4, roster: new Array(8).fill({}), stakeUsed: false, stakeableSiteIds: [], passed: true };
		const board = { s0: { A: [{ record: {}, downed: false }], B: [] }, s1: { A: [], B: [] }, s2: { A: [], B: [] } };
		const line = reachabilityLine({ ...view(0, 'resolve'), rules: { sendable: 11, trailingBonus: 0 }, board, players: { A: me } }, me, side(0));
		expect(line === null || line.tone !== 'lost').toBe(true);
	});

	test('but a pass does close this round: its empty worlds are not counted', () => {
		// round three, passed, standing on one world, needing three more: lost, whatever is in hand
		const me = { sitesWon: 2, sentCount: 8, roster: [{}, {}, {}], stakeUsed: true, passed: true };
		const board = { s0: { A: [{ record: {}, downed: false }], B: [] }, s1: { A: [], B: [] }, s2: { A: [], B: [] } };
		const line = reachabilityLine({ ...view(2), rules: { sendable: 11, trailingBonus: 0 }, board, players: { A: me } }, me, side(2));
		expect(line && line.tone).toBe('lost');
	});
});

