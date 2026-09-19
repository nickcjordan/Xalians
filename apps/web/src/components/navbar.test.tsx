import * as React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { vi } from 'vitest';

vi.mock('aws-amplify/utils', () => ({
	Hub: { listen: vi.fn(() => () => {}), remove: vi.fn() },
}));

vi.mock('../utils/authUtil', () => ({
	currentUser: vi.fn().mockResolvedValue(null),
	buildAuthState: vi.fn(),
	confirmSignUp: vi.fn(),
	resendConfirmationCode: vi.fn(),
	signIn: vi.fn(),
	signOut: vi.fn().mockResolvedValue(true),
	signUp: vi.fn(),
}));

import XalianNavbar from './navbar';

// jsdom implements neither PointerEvent capture nor scrollIntoView, both of
// which Radix's DropdownMenu reaches for when it opens; without stubs the
// interaction hangs rather than failing loudly.
beforeAll(() => {
	if (!Element.prototype.hasPointerCapture) {
		Element.prototype.hasPointerCapture = () => false;
	}
	if (!Element.prototype.setPointerCapture) {
		Element.prototype.setPointerCapture = () => {};
	}
	if (!Element.prototype.releasePointerCapture) {
		Element.prototype.releasePointerCapture = () => {};
	}
	if (!Element.prototype.scrollIntoView) {
		Element.prototype.scrollIntoView = () => {};
	}
});

function renderNavbar(initialPath = '/') {
	return render(
		<MemoryRouter initialEntries={[initialPath]}>
			<XalianNavbar />
		</MemoryRouter>
	);
}

describe('XalianNavbar', () => {
	it('renders the three section links, not the games, in the primary nav', () => {
		renderNavbar();
		const primary = screen.getByRole('navigation', { name: 'Primary' });
		expect(within(primary).getByRole('link', { name: 'Home' })).toBeInTheDocument();
		expect(within(primary).getByRole('link', { name: 'Encyclopedia' })).toBeInTheDocument();
		expect(within(primary).getByRole('link', { name: 'Generator' })).toBeInTheDocument();
		expect(within(primary).queryByRole('link', { name: 'Duel' })).not.toBeInTheDocument();
	});

	// Radix's DropdownMenu is genuinely slow to settle against jsdom here.
	// `delay: null` removes userEvent's inter-event waits and takes this from
	// about 57s (which timed out at 30s on CI's slower runner) to about 12s,
	// but it cannot go lower: a bare fireEvent click or keyDown leaves Radix
	// closed, so the full pointer sequence is required. Hence an explicit
	// generous timeout on this one test rather than a race that passes locally
	// and fails on CI.
	it('opens the Play menu with all five games and their taglines', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0, delay: null });
		renderNavbar();
		const primary = screen.getByRole('navigation', { name: 'Primary' });
		const trigger = within(primary).getByRole('button', { name: /play/i });
		await user.click(trigger);

		const menu = await screen.findByRole('menu');
		['Duel', 'Reclamation', 'Expedition', 'Powerworks', 'Arcade'].forEach((label) => {
			expect(within(menu).getByText(label)).toBeInTheDocument();
		});
		expect(within(menu).getByText(/Squad tactics on an 8 by 8 board/)).toBeInTheDocument();
		expect(within(menu).getByText(/Send creatures into three worlds a round/)).toBeInTheDocument();
		expect(within(menu).getByText(/Push a crew of your Xalians across hazardous worlds/)).toBeInTheDocument();
		expect(within(menu).getByText(/Take a squad of four through four encounters/)).toBeInTheDocument();
		expect(within(menu).getByText(/Familiar games that turn a quick win/)).toBeInTheDocument();
	}, 60000);

	it('marks the Play trigger current when on a game route', () => {
		renderNavbar('/duel');
		const primary = screen.getByRole('navigation', { name: 'Primary' });
		expect(within(primary).getByRole('button', { name: /play/i })).toHaveAttribute('aria-current', 'page');
	});

	it('does not mark the Play trigger current off a game route', () => {
		renderNavbar('/encyclopedia');
		const primary = screen.getByRole('navigation', { name: 'Primary' });
		expect(within(primary).getByRole('button', { name: /play/i })).not.toHaveAttribute('aria-current', 'page');
	});

	// Same reason as the Play menu above: a plain click through userEvent is
	// far too slow against Radix in jsdom, so the trigger is activated directly.
	it('opens the mobile sheet with the three links, a Play legend, and the five games', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0, delay: null });
		renderNavbar();
		const opener = screen.getByRole('button', { name: 'Open menu' });
		await user.click(opener);

		const dialog = await screen.findByRole('dialog');
		expect(within(dialog).getByText('Play')).toBeInTheDocument();
		['Home', 'Encyclopedia', 'Generator', 'Duel', 'Reclamation', 'Expedition', 'Powerworks', 'Arcade'].forEach((label) => {
			expect(within(dialog).getByRole('link', { name: label })).toBeInTheDocument();
		});
	});
});
