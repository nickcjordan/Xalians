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

	// Opened with a keyboard Enter and read synchronously. Radix puts the menu
	// in the DOM 29ms after the event; it was `findByRole` that took about 11
	// SECONDS to hand back an element already present -- its waitFor polling is
	// pathologically slow in this environment, while `getByRole` on the same
	// settled tree costs 1ms. That, not Radix and not the pointer sequence, was
	// the cost: this test ran ~11s locally and timed out at 60s on CI's slower
	// runner, blocking a merge. Synchronously it runs in about 90ms.
	//
	// So: no `userEvent` pointer sequence (Enter opens it just as well and
	// exercises the keyboard path), and no `findBy*`/`waitFor` anywhere in the
	// menu assertions. If this ever needs to await something again, measure
	// first -- a `findBy*` here costs four orders of magnitude more than a
	// `getBy*`.
	it('opens the Play menu with all five games and their taglines', () => {
		renderNavbar();
		const primary = screen.getByRole('navigation', { name: 'Primary' });
		const trigger = within(primary).getByRole('button', { name: /play/i });
		fireEvent.keyDown(trigger, { key: 'Enter', code: 'Enter' });

		const menu = screen.getByRole('menu');
		['Duel', 'Reclamation', 'Expedition', 'Powerworks', 'Arcade'].forEach((label) => {
			expect(within(menu).getByText(label)).toBeInTheDocument();
		});
		expect(within(menu).getByText(/Squad tactics on an 8 by 8 board/)).toBeInTheDocument();
		expect(within(menu).getByText(/Send creatures into three worlds a round/)).toBeInTheDocument();
		expect(within(menu).getByText(/Push a crew of your Xalians across hazardous worlds/)).toBeInTheDocument();
		expect(within(menu).getByText(/Take a squad of four through four encounters/)).toBeInTheDocument();
		expect(within(menu).getByText(/Familiar games that turn a quick win/)).toBeInTheDocument();
	});

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

	// The Sheet opens on click rather than on Enter (unlike the dropdown
	// above), but the same rule applies once it is open: it is in the DOM
	// synchronously, so the assertions read it with `getByRole`, never a
	// `findBy*`.
	it('opens the mobile sheet with the three links, a Play legend, and the five games', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0, delay: null });
		renderNavbar();
		const opener = screen.getByRole('button', { name: 'Open menu' });
		await user.click(opener);

		const dialog = screen.getByRole('dialog');
		expect(within(dialog).getByText('Play')).toBeInTheDocument();
		['Home', 'Encyclopedia', 'Generator', 'Duel', 'Reclamation', 'Expedition', 'Powerworks', 'Arcade'].forEach((label) => {
			expect(within(dialog).getByRole('link', { name: label })).toBeInTheDocument();
		});
	});
});
