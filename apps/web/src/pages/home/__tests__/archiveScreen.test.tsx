import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ArchiveScreen } from '../archiveScreen';

// The archive's playback screen: its power state is data, the CSS does the rest.
describe('ArchiveScreen', () => {
	it('stands by with its readout and holds the picture under the glass', () => {
		const { container } = render(
			<ArchiveScreen state="standby" rec="01" place="Floria" start={3725}>
				<p>Picture</p>
			</ArchiveScreen>
		);
		expect(container.querySelector('.archive')).toHaveAttribute('data-screen', 'standby');
		expect(container.textContent).toContain('Standby');
		expect(container.textContent).toContain('Rec 01 · Floria');
		expect(container.textContent).toContain('01:02:05');
		expect(screen.getByText('Picture')).toBeInTheDocument();
	});

	it('reads Playback while it plays', () => {
		const { container } = render(
			<ArchiveScreen state="on" rec="03" place="Genome record">
				<p>Picture</p>
			</ArchiveScreen>
		);
		expect(container.querySelector('.archive')).toHaveAttribute('data-screen', 'on');
		expect(container.textContent).toContain('Playback');
	});
});
