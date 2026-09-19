import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getStoryPart } from '../../../lore';

vi.mock('../../navbar', () => ({ default: () => null }));

import Story from '../Story';

// RecordsByWorld reads the *actual* window.location (not react-router's
// MemoryRouter state) to decide which fold opens on first render, on
// purpose: it must agree with what the page's own hash-scroll effect in
// encyclopediaPage.js sees on the very first pass, and that effect also
// reads window.location via useLocation()'s underlying history, which is
// the real browser history outside a test. MemoryRouter deliberately keeps
// window.location untouched, so the test drives both: it pushes the same
// path onto jsdom's real history before rendering, matching what happens
// in the browser when the page loads at that URL.
function renderPart(path) {
	window.history.pushState({}, '', path);
	return render(
		<MemoryRouter initialEntries={[path]}>
			<Routes>
				<Route path="/encyclopedia/story/:era" element={<Story />} />
			</Routes>
		</MemoryRouter>
	);
}

beforeEach(() => {
	window.localStorage.clear();
	window.history.pushState({}, '', '/');
	vi.stubGlobal('IntersectionObserver', class {
		observe() {}
		disconnect() {}
	});
});

describe('story part: records folded by world, deep links open on first render', () => {
	it('a #chapter-<world>-<index> hash opens that world\'s fold before the first paint, so the page\'s own hash-scroll effect finds the element', () => {
		const part = getStoryPart('end-wars');
		const group = part.sections.flatMap((s) => s.paragraphs).find((p) => p.world.key === 'magmuth');
		expect(group, 'expected at least one Magmuth paragraph in end-wars').toBeDefined();

		renderPart(`/encyclopedia/story/end-wars#chapter-magmuth-${group.index}`);

		const target = document.getElementById(`chapter-magmuth-${group.index}`);
		expect(target).not.toBeNull();
		// The fold's AccordionContent only mounts its children (via
		// data-state="open") when open -- an element found in the DOM at all
		// on first render is the proof the fold opened synchronously from the
		// URL, not only after a later effect.
		expect(target.offsetParent !== null || target.closest('[data-state="open"]')).toBeTruthy();
	});

	it('a ?world=<key> query also opens that world\'s fold on first render', () => {
		const part = getStoryPart('end-wars');
		const group = part.sections.flatMap((s) => s.paragraphs).find((p) => p.world.key === 'magmuth');
		expect(group).toBeDefined();

		renderPart(`/encyclopedia/story/end-wars?world=magmuth`);

		const target = document.getElementById(`chapter-magmuth-${group.index}`);
		expect(target).not.toBeNull();
	});

	it('with no hash or query, records groups render closed (only the fold triggers, not the paragraph rows)', () => {
		renderPart('/encyclopedia/story/end-wars');
		expect(screen.getByText('From the records')).toBeInTheDocument();
		// Magmuth's fold trigger (its chip label) is present as a button...
		expect(screen.getAllByText('Magmuth').length).toBeGreaterThan(0);
		// ...but its first chapter row is not in the document, since the
		// fold's Radix Accordion only renders open content.
		const part = getStoryPart('end-wars');
		const group = part.sections.flatMap((s) => s.paragraphs).find((p) => p.world.key === 'magmuth');
		expect(document.getElementById(`chapter-magmuth-${group.index}`)).toBeNull();
	});
});
