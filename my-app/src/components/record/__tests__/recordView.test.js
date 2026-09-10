import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import RecordView from '../RecordView';
import sampleGraviclaw from '../../../../../docs/design/sample-record-graviclaw.json';

/**
 * The record view against the checked-in sample record (real generator output,
 * see docs/design/sample-record-graviclaw.md). These assert what the document
 * says about the creature, not how it is styled.
 */

function renderRecord(record = sampleGraviclaw) {
	return render(
		<MemoryRouter>
			<RecordView record={record} />
		</MemoryRouter>
	);
}

describe('RecordView', () => {
	it('leads with the designation and the element in scope', () => {
		const { container } = renderRecord();

		expect(screen.getByRole('heading', { level: 2, name: 'Graviclaw' })).toBeInTheDocument();
		expect(container.querySelector('.el-dark')).not.toBeNull();
	});

	it('prints the provenance line', () => {
		renderRecord();

		expect(screen.getByText(sampleGraviclaw.id)).toBeInTheDocument();
		expect(screen.getByText(sampleGraviclaw.provenance.seed)).toBeInTheDocument();
		expect(screen.getByText('v' + sampleGraviclaw.provenance.generatorVersion)).toBeInTheDocument();
		expect(screen.getByText('Grimedes')).toBeInTheDocument();
		expect(screen.getByText('No. 1')).toBeInTheDocument();
	});

	it('heads every layer of the record, in the record\'s own order', () => {
		renderRecord();

		const headings = screen
			.getAllByRole('heading', { level: 3 })
			.map((node) => node.textContent);

		expect(headings).toEqual([
			'Physiology',
			'Attributes',
			'Capabilities',
			'Senses',
			'Affinity',
			'Traits',
			'Appearance',
			'Abilities',
			'Temperament',
		]);
	});

	it('draws a meter for each of the ten frozen attributes', () => {
		const { container } = renderRecord();

		const attributeCard = container.querySelectorAll('[data-slot="meter"]');
		// ten attributes, seven capabilities, three graded senses, five temperament axes
		expect(attributeCard.length).toBe(25);

		['Strength', 'Vitality', 'Endurance', 'Agility', 'Reflex', 'Intelligence', 'Willpower', 'Instinct', 'Charisma', 'Resilience']
			.forEach((name) => {
				expect(screen.getByText(name)).toBeInTheDocument();
			});
		expect(screen.getByText(String(sampleGraviclaw.attributes.strength))).toBeInTheDocument();
	});

	it('names every ability, marks the signature one, and says how each is performed', () => {
		renderRecord();

		sampleGraviclaw.abilities.forEach((ability) => {
			expect(screen.getByRole('heading', { level: 4, name: ability.name })).toBeInTheDocument();
		});
		expect(screen.getByText('Signature')).toBeInTheDocument();
		expect(screen.getAllByText('pincers').length).toBeGreaterThan(0);
	});

	it('shows the rolled traits as chips', () => {
		renderRecord();

		expect(screen.getAllByText('Armored').length).toBeGreaterThan(0);
		expect(screen.getAllByText('Stealthy').length).toBeGreaterThan(0);
	});

	it('prints height and weight in both units', () => {
		renderRecord();

		expect(screen.getByText('80 in / 204 cm')).toBeInTheDocument();
		expect(screen.getByText('536 lb / 243 kg')).toBeInTheDocument();
	});

	it('carries no game numbers: no HP, no stat total, no damage', () => {
		const { container } = renderRecord();
		const text = container.textContent;

		expect(text).not.toMatch(/\bHP\b/);
		expect(text).not.toMatch(/health/i);
		expect(text).not.toMatch(/damage/i);
		expect(text).not.toMatch(/stat (score|total|points)/i);
	});

	it('says so plainly when the creature is mute', () => {
		renderRecord();

		// the sample has communication: []
		expect(screen.getByText('Mute')).toBeInTheDocument();
	});
});
