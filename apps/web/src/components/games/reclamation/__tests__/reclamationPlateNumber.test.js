import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ReclamationFigure from '../reclamationFigure';

/*
	PASS 66. The pass 65 critic found Scalatto at 13 on its world and 10 on its card: the plate
	printed the hold now while the card and the world's total counted what the Clash would
	leave, so the plates on a world did not add up to its total. Where the Clash would cut a
	creature and leave it standing, its plate reads now and after, "13→10".
*/

const record = { id: 'r1', species: 'scalatto' };
const hold = (container) => container.querySelector('.rec-figure-hold');

describe('a plate\'s number', () => {
	it('reads now and after where the Clash would cut a creature and leave it standing', () => {
		const { container } = render(<ReclamationFigure record={record} seat="A" you="A" facing="up" hold={13} forecast={10} />);
		expect(hold(container).textContent).toBe('13→10');
		expect(hold(container).getAttribute('data-hold-after')).toBe('10');
	});

	it('keeps a creature the Clash would down as its struck number and cross, with no arrow', () => {
		const { container } = render(<ReclamationFigure record={record} seat="B" you="A" facing="down" hold={13} forecast={0} />);
		expect(hold(container).textContent).toBe('13');
		expect(container.querySelector('[data-threat="downed"]')).not.toBeNull();
	});

	it('reads one number where nothing would change, and during the Clash, which has no forecast', () => {
		expect(hold(render(<ReclamationFigure record={record} seat="A" you="A" facing="up" hold={13} />).container).textContent).toBe('13');
		expect(hold(render(<ReclamationFigure record={record} seat="A" you="A" facing="up" hold={13} forecast={13.02} />).container).textContent).toBe('13');
	});
});
