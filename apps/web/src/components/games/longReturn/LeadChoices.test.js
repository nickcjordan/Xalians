import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import LeadChoices from './LeadChoices';

vi.mock('../../xalianImage', () => ({ default: () => <span /> }));
const plan = { lead: { id: 'lead', species: 'Scout', element: { primary: 'Water' } }, support: { species: 'Helper' }, method: { label: 'Swim' }, leadEnergy: 1, knownLeadStrain: 1, baseSupportStrain: 0, knownPressure: 1, unresolvedHazards: [] };
const markup = (entry = plan, companion) => renderToStaticMarkup(<LeadChoices plans={[{ route: { salvage: 1 }, ...entry }]} companion={companion} selectedId="lead" onSelect={() => {}} />);

test('warns when a chosen lead would spend its last energy', () => {
  expect(markup()).toContain('No lead energy left afterward');
  expect(markup({ ...plan, leadEnergy: 2 })).not.toContain('No lead energy left afterward');
});
test('uses the same confirmed companion saving as the route comparison', () => {
  const html = markup(plan, { ready: true });
  expect(html).toContain('0 known energy cost');
  expect(html).not.toContain('No lead energy left afterward');
});
test('does not disclose unknown hazard severity in the lead chooser', () => {
  expect(markup({ ...plan, unresolvedHazards: [{ strain: 99 }] }))
    .toBe(markup({ ...plan, unresolvedHazards: [{ strain: 1 }] }));
});

test('attributes shared effort to the actual lead and supporter, including companion saving', () => {
  const shared = { ...plan, knownLeadStrain: 2, baseSupportStrain: 1 };
  expect(markup(shared)).toContain('Energy shared: Scout 2 · Helper 1');
  expect(markup(shared, { ready: true })).toContain('Energy shared: Scout 1 · Helper 1');
  expect(markup()).not.toContain('Energy shared:');
});
