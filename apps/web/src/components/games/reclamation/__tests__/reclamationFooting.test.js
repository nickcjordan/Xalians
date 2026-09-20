import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { WorldFooting } from '../reclamationWorld';

/*
	PASS 29. The footing is what an empty world says about THIS handler's squad, in place
	of the single word "unclaimed" that used to sit in a 264px panel body. A blind critic
	scored "reason to keep playing" 4 of 10 on that emptiness.

	The copy branches on how the squad is split, and every branch below is a case the
	game actually produces: measured over five seeds and every site, the comfortable
	count ranges 0 to 11 of 12, and 61% of worlds offer at least one native.
*/
const world = { planet: 'Zolton' };

describe('WorldFooting', () => {
	it('says how many of the squad can stand here, and how many cannot', () => {
		render(<WorldFooting world={world} footing={{ comfortable: 8, strained: 4, severe: 0, native: 0, of: 12 }} />);
		expect(document.querySelector('[data-footing-ease]').textContent).toContain('8');
		expect(document.querySelector('[data-footing-ease]').textContent).toContain('at ease here');
		expect(document.querySelector('[data-footing-cost]').textContent).toContain('the other 4 are strained');
		// no native, so no home line at all rather than a line saying zero
		expect(document.querySelector('[data-footing-home]')).toBeNull();
	});

	it('names home ground when the squad has a native, since it is worth half again', () => {
		render(<WorldFooting world={world} footing={{ comfortable: 9, strained: 3, severe: 0, native: 2, of: 12 }} />);
		const home = document.querySelector('[data-footing-home]');
		expect(home.textContent).toContain('2');
		expect(home.textContent).toContain('Zolton');
		expect(home.textContent).toContain('half again');
	});

	/*
		The Magmuth case, which seed 21 round 1 produces: nothing in the squad can stand
		here. "the other 12 are strained, 12 severely" is the arithmetic talking, so when
		every strained creature is severely strained it is said once.
	*/
	it('says it once when every creature is severely strained', () => {
		render(<WorldFooting world={{ planet: 'Magmuth' }} footing={{ comfortable: 0, strained: 0, severe: 12, native: 0, of: 12 }} />);
		const cost = document.querySelector('[data-footing-cost]').textContent;
		expect(cost).toContain('every one of them is');
		expect(cost).toContain('severely');
		expect(cost).not.toContain('12 severely');
	});

	it('counts a mixed split without collapsing the severe ones', () => {
		render(<WorldFooting world={world} footing={{ comfortable: 6, strained: 4, severe: 2, native: 0, of: 12 }} />);
		const cost = document.querySelector('[data-footing-cost]').textContent;
		expect(cost).toContain('the other 6 are strained');
		expect(cost).toContain('2');
		expect(cost).toContain('severely');
	});

	it('reads as singular when exactly one creature is strained', () => {
		render(<WorldFooting world={world} footing={{ comfortable: 11, strained: 1, severe: 0, native: 0, of: 12 }} />);
		expect(document.querySelector('[data-footing-cost]').textContent).toContain('the other is strained');
	});

	it('says nothing arithmetic when there is no bench to measure', () => {
		render(<WorldFooting world={world} footing={null} />);
		expect(document.querySelector('.rec-site-unclaimed')).not.toBeNull();
		expect(document.querySelector('[data-world-footing]')).toBeNull();
	});

	// a world every creature is comfortable on prints no cost line rather than "the other 0"
	it('prints no cost line when the whole squad is at ease', () => {
		render(<WorldFooting world={world} footing={{ comfortable: 12, strained: 0, severe: 0, native: 1, of: 12 }} />);
		expect(document.querySelector('[data-footing-cost]')).toBeNull();
		expect(document.querySelector('[data-footing-home]')).not.toBeNull();
	});
});
