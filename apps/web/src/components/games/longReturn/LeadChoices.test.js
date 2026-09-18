import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import LeadChoices from './LeadChoices';

vi.mock('../../xalianImage', () => ({ default: () => <span /> }));
const plan = { lead: { id: 'lead', species: 'Scout', element: { primary: 'Water' } }, support: { species: 'Helper' }, method: { label: 'Swim' }, leadEnergy: 1, knownLeadStrain: 1, baseSupportStrain: 0, knownPressure: 1, unresolvedHazards: [] };
const markup = (entry = plan, companion) => renderToStaticMarkup(<LeadChoices plans={[{ route: { salvage: 1 }, ...entry }]} companion={companion} selectedId="lead" onSelect={() => {}} />);

test('low energy is explained where it actually weakens the chosen lead', () => {
  expect(markup({...plan, readiness:{lead:{scorePenalty:4}}})).toContain('Weakened by low energy');
  expect(markup({...plan, readiness:{lead:{scorePenalty:0}}})).not.toContain('Weakened by low energy');
  expect(markup({...plan, readiness:{support:{scorePenalty:4}}})).not.toContain('Weakened by low energy');
  expect(markup({...plan, readiness:{lead:{scorePenalty:9}}})).not.toContain("Can't scout");
});

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

test('keeps the primary comparison focused on total cost rather than repeating the energy split', () => {
  const shared = { ...plan, leadEnergy: 3, knownLeadStrain: 2, baseSupportStrain: 1 };
  expect(markup(shared)).toContain('Spend 3 energy');
  expect(markup(shared)).not.toContain('Energy shared:');
  expect(markup(shared, { ready: true })).toContain('Spend 2 energy');
});
