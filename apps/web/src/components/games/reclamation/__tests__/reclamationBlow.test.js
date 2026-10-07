import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ReclamationFigure from '../reclamationFigure';

/*
	PASS 64, THE BLOW (docs/design/reclamation-the-blow.md). The blow's number or word stood above
	the creature it landed on, where the rank clipped it for the rival's creatures ("DOWNED" read as
	half its letters). It now stands on the creature's piece, and says whose creature took it: red
	on yours (what the Clash takes from you), ink on the rival's.
*/

const record = { id: 'r1', species: 'frackworm' };

describe('the blow on a figure', () => {
	it('stands over the piece it lands on, not above the figure', () => {
		const { container } = render(<ReclamationFigure record={record} seat="A" you="A" facing="up" hit flash={{ kind: 'rout', text: 'downed' }} beat={3} />);
		const flash = container.querySelector('.rec-figure-flash');
		expect(flash).not.toBeNull();
		expect(flash.parentElement.classList.contains('rec-piece-stage')).toBe(true);
		expect(flash.classList.contains('rec-figure-flash--on-mine')).toBe(true);
	});

	it('says whose creature took it', () => {
		const { container } = render(<ReclamationFigure record={record} seat="B" you="A" facing="down" hit flash={{ kind: 'stagger', text: '-5' }} beat={4} />);
		expect(container.querySelector('.rec-figure-flash').classList.contains('rec-figure-flash--on-theirs')).toBe(true);
	});
});
