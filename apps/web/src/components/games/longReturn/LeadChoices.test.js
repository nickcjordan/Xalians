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

test('explains support crossing a performance threshold and temperament reducing effort', () => {
  const helped = { ...plan, route: { reaction: { axis: 'energy', direction: 'high' } }, leadScore: 59, difficulty: 63, margin: 3, naturalReaction: true, baseLeadStrain: 1, environment: { strain: 0 } };
  expect(markup(helped)).toContain('Helper closes the gap · Energetic pace saves 1 energy');
  expect(markup({ ...helped, leadScore: 70, naturalReaction: false })).not.toContain('closes the gap');
  expect(markup({ ...helped, baseLeadStrain: 0 })).not.toContain('saves 1 energy');
  expect(markup({ ...helped, leadScore: 70, margin: 15 })).toContain('Helper eases the effort');
});
test('uses the same confirmed companion saving as the route comparison', () => {
  const html = markup(plan, { ready: true, creature: { species: 'Xylum' } });
  expect(html).toContain('0 known energy cost');
  expect(html).toContain('Xylum saves 1 · uses its one help');
  expect(html).not.toContain('No lead energy left afterward');
});

test('does not promise ally savings for uncertain, free or already-assisted crossings', () => {
  const companion = { ready: true, creature: { species: 'Xylum' } };
  expect(markup({ ...plan, knownLeadStrain: 0 }, companion)).not.toContain('uses its one help');
  expect(markup({ ...plan, nativeRisk: true }, companion)).not.toContain('uses its one help');
  expect(markup(plan, { ...companion, ready: false })).not.toContain('uses its one help');
});
test('does not disclose unknown hazard severity in the lead chooser', () => {
  expect(markup({ ...plan, unresolvedHazards: [{ strain: 99 }] }))
    .toBe(markup({ ...plan, unresolvedHazards: [{ strain: 1 }] }));
});

test('attributes shared effort to the actual lead and supporter, including companion saving', () => {
  const shared = { ...plan, leadEnergy: 3, knownLeadStrain: 2, baseSupportStrain: 1 };
  expect(markup(shared)).toContain('Energy shared: Scout 2 · Helper 1');
  expect(markup(shared, { ready: true })).toContain('Energy shared: Scout 1 · Helper 1');
  expect(markup()).not.toContain('Energy shared:');
});
