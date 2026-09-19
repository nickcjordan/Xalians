import * as React from 'react';
import { render, cleanup } from '@testing-library/react';
import { describe, expect, it, afterEach } from 'vitest';
import { usePageTitle } from '../components/system/head';

function Page({ title, description }: { title?: string; description?: string }) {
	usePageTitle(title, description);
	return <div>page</div>;
}

function getDescriptionMeta() {
	return document.querySelector('meta[name="description"]');
}

describe('usePageTitle', () => {
	afterEach(() => {
		cleanup();
		document.title = '';
		const meta = getDescriptionMeta();
		if (meta) meta.remove();
	});

	it('sets the document title with the " · Xalians" suffix', () => {
		render(<Page title="Generate a Xalian" />);
		expect(document.title).toBe('Generate a Xalian · Xalians');
	});

	it('gives home (no title) the plain site name, not doubled', () => {
		render(<Page />);
		expect(document.title).toBe('Xalians');
	});

	it('writes the meta description when one is given', () => {
		render(<Page title="Worlds" description="Every world on file." />);
		expect(getDescriptionMeta()?.getAttribute('content')).toBe('Every world on file.');
	});

	it('restores the previous title and description on unmount', () => {
		document.title = 'Previous title';
		const meta = document.createElement('meta');
		meta.setAttribute('name', 'description');
		meta.setAttribute('content', 'Previous description');
		document.head.appendChild(meta);

		const { unmount } = render(<Page title="Bestiary" description="The catalogue." />);
		expect(document.title).toBe('Bestiary · Xalians');
		expect(getDescriptionMeta()?.getAttribute('content')).toBe('The catalogue.');

		unmount();

		expect(document.title).toBe('Previous title');
		expect(getDescriptionMeta()?.getAttribute('content')).toBe('Previous description');
	});

	it('removes a meta tag it created itself once unmounted', () => {
		expect(getDescriptionMeta()).toBeNull();
		const { unmount } = render(<Page title="Index" description="Every entry." />);
		expect(getDescriptionMeta()).not.toBeNull();
		unmount();
		expect(getDescriptionMeta()).toBeNull();
	});

	it('clears the content attribute on unmount when the pre-existing tag had none', () => {
		const meta = document.createElement('meta');
		meta.setAttribute('name', 'description');
		document.head.appendChild(meta);
		expect(getDescriptionMeta()?.hasAttribute('content')).toBe(false);

		const { unmount } = render(<Page title="Trade" description="Propose a trade." />);
		expect(getDescriptionMeta()?.getAttribute('content')).toBe('Propose a trade.');

		unmount();

		const restored = getDescriptionMeta();
		expect(restored).not.toBeNull();
		expect(restored?.hasAttribute('content')).toBe(false);
	});
});
