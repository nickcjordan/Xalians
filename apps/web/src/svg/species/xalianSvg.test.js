import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import species from '@xalians/content/species.json';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import XalianImage from '../../components/xalianImage';
import XalianSVG, { portraitLoaderBySpecies, speciesArtNames, tokenLoaderBySpecies } from './xalianSvg';

const canonicalSpeciesNames = species.map(({ name }) => name.toLowerCase()).sort();

describe('species art registry', () => {
	test('has matching portrait and token art for every canonical species', () => {
		expect(speciesArtNames).toEqual(canonicalSpeciesNames);
		expect(Object.keys(tokenLoaderBySpecies).sort()).toEqual(canonicalSpeciesNames);
		expect(Object.keys(portraitLoaderBySpecies).sort()).toEqual(canonicalSpeciesNames);
		expect(speciesArtNames).toEqual(expect.arrayContaining(['avilily', 'frackworm', 'vespersyn']));
		expect(speciesArtNames).not.toContain('tetrahive');
	});

	test('keeps every compact asset inside the portable token contract', () => {
		const tokenDirectory = resolve(process.cwd(), 'src/svg/species/token');
		for (const filename of readdirSync(tokenDirectory).filter((name) => name.endsWith('.svg'))) {
			const source = readFileSync(`${tokenDirectory}/${filename}`, 'utf8');
			expect(source, filename).toContain('viewBox="0 0 64 64"');
			expect(source, filename).toContain('fill="currentColor"');
			expect(source, filename).not.toMatch(/<(?:defs|style|filter|mask|text)\b|\bid=|transform=/);
		}
	});

	test('loads the compact 64-unit asset when a surface requests token art', async () => {
		const { container } = render(<XalianSVG name="Terragoyle" variant="token" data-testid="species-art" />);

		await waitFor(() => expect(screen.getByTestId('species-art')).toHaveAttribute('viewBox', '0 0 64 64'));
		const svg = screen.getByTestId('species-art');
		expect(svg).toHaveAttribute('aria-hidden', 'true');
		expect(container.querySelectorAll('svg')).toHaveLength(1);
	});

	test('loads only the requested authored portrait', async () => {
		const { container } = render(<XalianSVG name="Frackworm" data-testid="species-art" />);

		await waitFor(() => expect(container.querySelector('svg')).toHaveAttribute('viewBox', '0 0 1254 1254'));
		expect(container.querySelector('svg')).not.toHaveAttribute('id');
	});

	test('keeps legacy presentation props without losing zero values or wrapper classes', async () => {
		const { container } = render(
			<XalianImage
				variant="token"
				speciesName="Dromeus"
				primaryType="fire"
				className="animate-state"
				moreClasses="game-piece"
				padding="0px"
				fill="rebeccapurple"
				opacity={0}
			/>,
		);

		await waitFor(() => expect(container.querySelector('svg')).toHaveAttribute('viewBox', '0 0 64 64'));
		const wrapper = container.firstElementChild;
		const svg = wrapper.querySelector('svg');
		expect(wrapper).toHaveClass('animate-state', 'game-piece');
		expect(wrapper).toHaveAttribute('aria-hidden', 'true');
		expect(svg.style.padding).toBe('0px');
		expect(svg.style.color).toBe('rebeccapurple');
		expect(svg.style.opacity).toBe('0');
	});

	test('gives a deliberately labelled image an accessible name', () => {
		render(<XalianImage variant="token" speciesName="Avilily" primaryType="plant" alt="Avilily silhouette" />);
		expect(screen.getByRole('img', { name: 'Avilily silhouette' })).toBeInTheDocument();
	});
});
