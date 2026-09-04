import { describe, it, expect } from 'vitest';
import {
	speciesLabel, formatHold, classifyEvent, narrateAct, narrateRelocate,
	narrateSend, narratePass, narrateJudge, narrateMatchEnd,
} from '../reclamationNarration';

describe('speciesLabel', () => {
	it('title-cases the species, since provisional records carry no name', () => {
		expect(speciesLabel({ species: 'stonebrawler' })).toBe('Stonebrawler');
		expect(speciesLabel({ species: 'ash-walker' })).toBe('Ash Walker');
	});

	it('prefers an explicit name when the record grows one', () => {
		expect(speciesLabel({ name: 'Rakh', species: 'stonebrawler' })).toBe('Rakh');
	});

	it('degrades rather than printing undefined', () => {
		expect(speciesLabel(null)).toBe('a creature');
	});
});

describe('formatHold', () => {
	it('prints whole numbers plainly and fractions to one decimal', () => {
		expect(formatHold(7)).toBe('7');
		expect(formatHold(6.55)).toBe('6.6');
		expect(formatHold(6.04)).toBe('6');
	});

	it('does not print NaN', () => {
		expect(formatHold(undefined)).toBe('?');
	});
});

describe('classifyEvent', () => {
	// the engine's act events carry no `type` field, only `outcome` — this is the
	// workaround documented at the top of reclamationNarration.js.
	it('reads a bare act event as an act', () => {
		expect(classifyEvent({ recordId: 'x', action: 'strike', outcome: 'routed' })).toBe('act');
	});

	it('passes structural events through by their type', () => {
		expect(classifyEvent({ type: 'judge', siteResults: {} })).toBe('judge');
		expect(classifyEvent({ type: 'vanguard-relocate' })).toBe('vanguard-relocate');
	});
});

describe('narrateAct', () => {
	it('narrates a rout as one plain sentence', () => {
		const sentence = narrateAct(
			{ recordId: 'a', action: 'strike', target: 'b', outcome: 'routed' },
			{ actorName: 'Rakh', targetName: 'Vrix', targetHold: 6, magnitude: 8 },
		);
		expect(sentence).toBe('Vrix (hold 6) is struck by Rakh for 8 and is routed.');
	});

	it('narrates a stagger', () => {
		const sentence = narrateAct(
			{ action: 'crush', outcome: 'staggered' },
			{ actorName: 'Gorrel', targetName: 'Vrix', targetHold: 9.5, magnitude: 5 },
		);
		expect(sentence).toBe('Vrix (hold 9.5) is crushed by Gorrel for 5 and is staggered.');
	});

	it('narrates a hold with the site named', () => {
		expect(narrateAct({ action: 'hold', outcome: 'held' }, { actorName: 'Gorrel', siteName: 'The Chasm' }))
			.toBe('Gorrel holds its ground at The Chasm.');
	});

	it('narrates an area act with its hit count', () => {
		expect(narrateAct(
			{ action: 'burst', outcome: 'area-struck', hitCount: 3 },
			{ actorName: 'Neph', siteName: 'The Reef' },
		)).toBe('Neph bursts over The Reef, catching 3 creatures on both sides.');
	});

	it('narrates a ward absorbing a blow', () => {
		expect(narrateAct({ action: 'strike', outcome: 'warded-absorbed' }, { actorName: 'Rakh', targetName: 'Vrix' }))
			.toBe('Rakh strikes Vrix, and the ward absorbs it entirely.');
	});

	it('reads a passive outcome with a past participle, never the third-person form', () => {
		const sentence = narrateAct(
			{ action: 'ambush', outcome: 'routed' },
			{ actorName: 'Gravenmaw', targetName: 'Shockstrider', targetHold: 2.3, magnitude: 14 },
		);
		expect(sentence).toBe('Shockstrider (hold 2.3) is ambushed by Gravenmaw for 14 and is routed.');
		expect(sentence).not.toContain('is ambushes');
	});

	it('never prints undefined when the log gives it nothing', () => {
		const sentence = narrateAct({ action: 'strike', outcome: 'shrugged' }, {});
		expect(sentence).not.toMatch(/undefined/);
	});
});

describe('narrateRelocate / narrateSend / narratePass', () => {
	it('says where the vanguard fell back to', () => {
		expect(narrateRelocate({}, { actorName: 'Rakh', fromSiteName: 'The Chasm', toSiteName: 'The Reef' }))
			.toBe('Rakh falls back from The Chasm to The Reef.');
	});

	it('keeps the rival’s hidden send anonymous', () => {
		expect(narrateSend({ you: false, hidden: true, actorName: 'Rakh', siteName: 'The Reef' }))
			.toBe('The rival sends something, hidden.');
	});

	it('names your own hidden send, since you know what you sent', () => {
		expect(narrateSend({ you: true, hidden: true, actorName: 'Rakh', siteName: 'The Reef' }))
			.toBe('You send Rakh to The Reef, hidden.');
	});

	it('marks the pass as permanent', () => {
		expect(narratePass({ you: true })).toMatch(/out of this round/);
	});
});

describe('narrateJudge', () => {
	const event = {
		type: 'judge',
		siteResults: {
			s1: { holdA: 12, holdB: 7, winner: 'A' },
			s2: { holdA: 4, holdB: 9, winner: 'B' },
			s3: { holdA: 5, holdB: 5, winner: null },
		},
	};
	const ctx = { you: 'A', siteNames: { s1: 'The Chasm', s2: 'The Reef', s3: 'The Dreadscape' } };

	it('gives one sentence per site, from the handler’s point of view', () => {
		const lines = narrateJudge(event, ctx);
		expect(lines).toEqual([
			'The Chasm is yours, 12 against 7.',
			'The Reef goes to the rival, 9 against 4.',
			'The Dreadscape reverts to the Court, 5 against 5.',
		]);
	});

	it('flips the point of view for seat B', () => {
		const lines = narrateJudge(event, { ...ctx, you: 'B' });
		expect(lines[0]).toBe('The Chasm goes to the rival, 12 against 7.');
	});
});

describe('narrateMatchEnd', () => {
	it('names the reason a clinch ended it', () => {
		expect(narrateMatchEnd({ winner: 'A', you: 'A', sitesYou: 5, sitesThem: 2, reason: 'clinched' }))
			.toBe('You take the Charter, 5 worlds to 2, clinched at five worlds.');
	});

	it('says "1 world", not "1 worlds"', () => {
		expect(narrateMatchEnd({ winner: 'A', you: 'A', sitesYou: 1, sitesThem: 0, reason: 'frames-exhausted' }))
			.toBe('You take the Charter, 1 world to 0, after the third frame.');
	});

	it('names the loss', () => {
		expect(narrateMatchEnd({ winner: 'B', you: 'A', sitesYou: 3, sitesThem: 4, reason: 'frames-exhausted' }))
			.toBe('The rival takes the Charter, 4 worlds to 3, after the third frame.');
	});
});
