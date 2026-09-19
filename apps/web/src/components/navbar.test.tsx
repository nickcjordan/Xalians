import * as React from 'react';
import { render, screen, within } from '@testing-library/react';
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

	// Radix's DropdownMenu genuinely takes several real seconds to settle
	// under userEvent + jsdom in this environment (confirmed in isolation,
	// independent of anything added here), so this interaction gets a longer
	// per-test timeout rather than a flaky race.
	it('opens the Play menu with all five games and their taglines', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
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
	}, 30000);

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

	it('opens the mobile sheet with the three links, a Play legend, and the five games', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		renderNavbar();
		await user.click(screen.getByRole('button', { name: 'Open menu' }));

		const dialog = await screen.findByRole('dialog');
		expect(within(dialog).getByText('Play')).toBeInTheDocument();
		['Home', 'Encyclopedia', 'Generator', 'Duel', 'Reclamation', 'Expedition', 'Powerworks', 'Arcade'].forEach((label) => {
			expect(within(dialog).getByRole('link', { name: label })).toBeInTheDocument();
		});
	}, 30000);
});
