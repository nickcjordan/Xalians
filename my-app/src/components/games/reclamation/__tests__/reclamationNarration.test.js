import { describe, it, expect } from 'vitest';
import {
	speciesLabel, formatHold, classifyEvent, narrateEvent, cueForEvent, roleSentence,
	roleWord, narrateRelocate, narrateSend, narratePass, narrateJudge, narrateMatchEnd,
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
	// THE BASE: every resolution event carries a `type` now, so the old "has an outcome and
	// no type" workaround is gone with the acts it worked around.
	it('reads each resolution event by its type', () => {
		expect(classifyEvent({ type: 'blow', outcome: 'routed' })).toBe('blow');
		expect(classifyEvent({ type: 'area', hitCount: 3 })).toBe('area');
		expect(classifyEvent({ type: 'shield', cancelled: 'x' })).toBe('shield');
		expect(classifyEvent({ type: 'judge', siteResults: {} })).toBe('judge');
		expect(classifyEvent({ type: 'vanguard-relocate' })).toBe('vanguard-relocate');
	});

	it('reads an event with no type at all as unknown rather than guessing', () => {
		expect(classifyEvent({ recordId: 'x', outcome: 'routed' })).toBe('unknown');
		expect(classifyEvent(null)).toBe('unknown');
	});
});

describe('roleSentence', () => {
	it('gives one sentence per role, naming the number where there is one', () => {
		expect(roleSentence('strike', 4)).toBe('Strikes one enemy here for 4');
		expect(roleSentence('area', 2.5)).toBe('Strikes everyone here for 2.5');
		expect(roleSentence('bolster')).toBe('Bolsters allies here against the world');
		expect(roleSentence('shield')).toBe('Shields allies here from the largest blow');
		expect(roleSentence('none')).toBe('Stands here and throws nothing');
	});

	it('names each role in one word for a chip or a title', () => {
		['strike', 'area', 'bolster', 'shield'].forEach((role) => expect(roleWord(role)).toBe(role));
		expect(roleWord(undefined)).toBe('none');
	});
});

describe('narrateEvent', () => {
	const ctx = { actorName: 'Rakh', targetName: 'Vrix', siteName: 'The Chasm', worldName: 'Stonera' };

	it('narrates a strike that leaves its target standing, with the number and what is left', () => {
		expect(narrateEvent({ type: 'blow', role: 'strike', outcome: 'staggered', amount: 4, remaining: 3 }, ctx))
			.toBe('Rakh strikes Vrix for 4; Vrix stands at 3.');
	});

	it('narrates a rout', () => {
		expect(narrateEvent({ type: 'blow', role: 'strike', outcome: 'routed', amount: 8, remaining: 0 }, ctx))
			.toBe('Rakh strikes Vrix for 8 and routs Vrix.');
	});

	it('says a hidden blow came from hiding', () => {
		expect(narrateEvent({ type: 'blow', role: 'strike', outcome: 'staggered', amount: 4, remaining: 3, hidden: true }, ctx))
			.toBe('Rakh, from hiding, strikes Vrix for 4; Vrix stands at 3.');
	});

	it('leaves a cancelled blow to the shield that cancelled it', () => {
		expect(narrateEvent({ type: 'blow', role: 'strike', outcome: 'cancelled', amount: 4 }, ctx)).toBeNull();
		expect(narrateEvent({ type: 'shield', cancelled: 'v', amount: 4 }, { actorName: 'Yetimoth', targetName: 'Voltish' }))
			.toBe("Yetimoth shields: Voltish's blow of 4 is cancelled.");
	});

	it('says a shield with nothing to cancel, and a blow with nothing to hit', () => {
		expect(narrateEvent({ type: 'shield', cancelled: null, amount: 0 }, { actorName: 'Yetimoth' }))
			.toBe('Yetimoth shields, and nothing is thrown at its side.');
		expect(narrateEvent({ type: 'blow', role: 'strike', outcome: 'no-target', amount: 0 }, ctx))
			.toBe('Rakh finds no target.');
	});

	it('says a blow lapsed when its striker was routed first', () => {
		expect(narrateEvent({ type: 'blow', role: 'strike', outcome: 'lapsed', amount: 0 }, ctx))
			.toBe("Rakh's blow lapses, routed first.");
	});

	it('announces an area over the world, then tells each victim as its own blow', () => {
		expect(narrateEvent({ type: 'area', role: 'area', amount: 2, hitCount: 3 }, ctx))
			.toBe('Rakh bursts over Stonera for 2 each, catching 3 creatures.');
		expect(narrateEvent({ type: 'blow', role: 'area', outcome: 'staggered', amount: 2, remaining: 5 }, ctx))
			.toBe('Rakh catches Vrix for 2; Vrix stands at 5.');
		// an area alone at a world declares and hits nobody; "catching 0 creatures" is not
		// a sentence anyone should read
		expect(narrateEvent({ type: 'area', role: 'area', amount: 2, hitCount: 0 }, ctx))
			.toBe('Rakh bursts over Stonera, and catches nothing.');
	});

	it('never prints undefined when the event gives it nothing', () => {
		const sentence = narrateEvent({ type: 'blow', role: 'strike', outcome: 'staggered' }, {});
		expect(sentence).not.toMatch(/undefined/);
	});
});

describe('cueForEvent', () => {
	it('maps a blow to the strike and rout cues by its outcome, and nothing else', () => {
		expect(cueForEvent({ type: 'blow', outcome: 'routed' })).toEqual({ name: 'rout' });
		expect(cueForEvent({ type: 'blow', outcome: 'staggered' }).name).toBe('strike');
		expect(cueForEvent({ type: 'blow', outcome: 'cancelled' })).toBeNull();
		expect(cueForEvent({ type: 'shield', cancelled: 'x' })).toBeNull();
		expect(cueForEvent({ type: 'judge' })).toBeNull();
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
