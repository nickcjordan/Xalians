import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ArchivePlay, ArchiveScreen } from '../archiveScreen';

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

	it('offers Play while it stands by, and only then', () => {
		const onPlay = vi.fn();
		const { rerender } = render(<ArchivePlay state="standby" rec="01" onPlay={onPlay} />);
		fireEvent.click(screen.getByRole('button', { name: 'Play recording 01' }));
		expect(onPlay).toHaveBeenCalledTimes(1);
		for (const state of ['search', 'lock', 'on', 'out', 'off'] as const) {
			rerender(<ArchivePlay state={state} rec="01" onPlay={onPlay} />);
			expect(screen.queryByRole('button', { name: /Play/ })).toBeNull();
		}
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
