import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

import RecordView from '../RecordView';
import { sampleRecord } from '../sampleRecord';
import { CreatureRecordSchema } from '@xalians/content/creature';

/**
 * The record view against a real v5 record (the current generator with a
 * fixed seed, see ../sampleRecord.ts). These assert what the document says
 * about the creature, not how it is styled.
 */

const sampleGraviclaw = sampleRecord();

function renderRecord(record = sampleGraviclaw, props = {}) {
	return render(
		<MemoryRouter>
			<RecordView record={record} {...props} />
		</MemoryRouter>
	);
}

describe('RecordView', () => {
	it('renders a record that passes the v5 schema', () => {
		expect(CreatureRecordSchema.safeParse(sampleGraviclaw).success).toBe(true);
	});

	it('leads with the designation from the v5 template and the element in scope', () => {
		const { container } = renderRecord();

		expect(screen.getByRole('heading', { level: 2, name: 'Graviclaw' })).toBeInTheDocument();
		expect(container.querySelector('.el-dark')).not.toBeNull();
	});

	it('prints the provenance line', () => {
		renderRecord();

		expect(screen.getByText(sampleGraviclaw.id)).toBeInTheDocument();
		expect(screen.getByText(sampleGraviclaw.provenance.seed)).toBeInTheDocument();
		expect(screen.getByText('Grimedes')).toBeInTheDocument();
		expect(screen.getByText('No. 1')).toBeInTheDocument();
		expect(screen.getByText('Full spectrum')).toBeInTheDocument();
	});

	it('omits the serial row for an unowned preview', () => {
		renderRecord(sampleGraviclaw, { kicker: 'Unowned preview' });

		expect(screen.getByText('Unowned preview')).toBeInTheDocument();
		expect(screen.queryByText('Serial')).not.toBeInTheDocument();
	});

	it('keeps the serial row for an owned record', () => {
		renderRecord(sampleGraviclaw, { kicker: 'Yours' });

		expect(screen.getByText('Serial')).toBeInTheDocument();
		expect(screen.getByText('No. 1')).toBeInTheDocument();
	});

	it('heads every layer of the record, most permanent first, with no v4 layers', () => {
		renderRecord();

		const headings = screen.getAllByRole('heading', { level: 3 }).map((node) => node.textContent);
		expect(headings).toEqual(['Physiology', 'Attributes', 'Capabilities', 'Senses', 'Appearance', 'Actions', 'Temperament']);
		const text = document.body.textContent;
		expect(text).not.toMatch(/Traits|Affinity|Corporeality|Archetype/);
	});

	it('draws a meter for every rating and temperament axis', () => {
		const { container } = renderRecord();

		// ten attributes, seven capabilities, three graded senses, five temperament axes
		expect(container.querySelectorAll('[data-slot="meter"]').length).toBe(25);
		['Strength', 'Vitality', 'Endurance', 'Agility', 'Reflex', 'Intelligence', 'Willpower', 'Instinct', 'Charisma', 'Resilience']
			.forEach((name) => expect(screen.getByText(name)).toBeInTheDocument());
		['Boldness', 'Curiosity', 'Energy', 'Aggression', 'Sociability']
			.forEach((name) => expect(screen.getAllByText(name).length).toBeGreaterThan(0));
	});

	it('draws a rating above 100 against a longer scale instead of capping it', () => {
		const record = { ...sampleGraviclaw, attributes: { ...sampleGraviclaw.attributes, strength: 140 } };
		const { container } = renderRecord(record);

		expect(screen.getByText('140')).toBeInTheDocument();
		const fills = [...container.querySelectorAll('[data-slot="meter"]')]
			.slice(0, 10)
			.map((meter) => meter.querySelector('.bg-el').style.width);
		// 140 on a scale of 140 is full; 100 would no longer be.
		expect(fills[0]).toBe('100%');
		expect(fills.slice(1).every((width) => parseInt(width, 10) < 100)).toBe(true);
	});

	it('names all four actions, marks the signature, and says which are drawn', () => {
		renderRecord();

		sampleGraviclaw.actions.forEach((ability) => {
			expect(screen.getAllByText(ability.name).length).toBeGreaterThan(0);
		});
		expect(screen.getByText('Signature ability')).toBeInTheDocument();
		expect(screen.getAllByText('Guaranteed action').length).toBe(2);
		expect(screen.getAllByText('Drawn action').length).toBe(1);
	});

	it('names v5-only vocabulary instead of printing raw keys', () => {
		const record = {
			...sampleGraviclaw,
			physiology: {
				...sampleGraviclaw.physiology,
				senses: { ...sampleGraviclaw.physiology.senses, special: ['lowlight'] },
				traversal: ['phase'],
			},
		};
		renderRecord(record);

		expect(screen.getByText('Lowlight')).toBeInTheDocument();
		expect(screen.getByText('Phases through walls')).toBeInTheDocument();
		expect(screen.getByText('Levo')).toBeInTheDocument();
	});

	it('prints mass and every dimension the record carries, in both units', () => {
		renderRecord();

		expect(screen.getByText('523 lb / 237 kg')).toBeInTheDocument();
		expect(screen.getByText('79 in / 201 cm')).toBeInTheDocument();
		expect(screen.queryByText('Weight')).not.toBeInTheDocument();
		expect(screen.queryByText('Length')).not.toBeInTheDocument();
	});

	it('shows a registry distinction from the v5 grade', () => {
		renderRecord();

		expect(screen.getByText(/More distinctive than \d+% of records/)).toBeInTheDocument();
	});

	it('carries no game numbers and nothing undefined', () => {
		const { container } = renderRecord();
		const text = container.textContent;

		expect(text).not.toMatch(/\bHP\b/);
		expect(text).not.toMatch(/health/i);
		expect(text).not.toMatch(/damage/i);
		expect(text).not.toMatch(/undefined|NaN/);
	});

	it('says so plainly when the creature is mute', () => {
		renderRecord();

		expect(screen.getByText('Mute')).toBeInTheDocument();
	});

	it('prints the seed on its own full-width row, kept to one line', () => {
		renderRecord();

		const seedValue = screen.getByText('Seed').nextElementSibling;
		expect(seedValue.tagName).toBe('DD');
		expect(seedValue).toHaveAttribute('title', sampleGraviclaw.provenance.seed);
		expect(seedValue.className).toMatch(/whitespace-nowrap/);
		expect(seedValue.className).toMatch(/text-ellipsis/);
	});

	it('states the finish sentence only for a non-standard finish', () => {
		renderRecord();
		expect(screen.queryByText(/came out of the Generator wearing it/)).not.toBeInTheDocument();
	});

	it('states the finish sentence for a non-standard finish', () => {
		renderRecord({ ...sampleGraviclaw, appearance: { finish: 'prismatic' } });

		const sentence = screen
			.getAllByText(/came out of the Generator wearing it/)
			.map((el) => el.textContent.replace(/\s+/g, ' ').trim());
		expect(sentence).toContain('Prismatic finish: this one came out of the Generator wearing it.');
	});

	it('tells a signed-out or unowned viewer to sign in before it can be used elsewhere', () => {
		renderRecord(sampleGraviclaw, { kicker: 'Unowned preview' });

		expect(screen.getByText(/Sign in to keep this Xalian/)).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Duel' })).toHaveAttribute('href', '/duel');
	});

	it('tells an owner it can be fielded directly, with no sign-in prompt', () => {
		renderRecord(sampleGraviclaw, { kicker: 'Yours' });

		expect(screen.getByText(/^Field it in/)).toBeInTheDocument();
		expect(screen.queryByText(/Sign in to keep this Xalian/)).not.toBeInTheDocument();
	});
});
