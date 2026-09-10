import { buildActionSequence, eventIndexFor } from './actionSequence';

const creature = (id, species) => ({ id, species });

test('turns a crossing result into causal, ordered beats', () => {
  const lead = creature('lead', 'Chromocat');
  const support = creature('support', 'Hippochamp');
  const events = buildActionSequence({ type: 'crossing', lead, support, method: { label: 'Leap the gap' }, result: {
    unseenHazards: [{ id: 'arc', label: 'Dormant arc' }], companionHelp: null,
    crewChanges: [{ creature: lead, added: 1, before: 0, after: 1 }, { creature: support, added: 0, before: 0, after: 0 }],
    instabilityChange: { added: 2, before: 0, after: 2 }, salvage: 1, salvageAfter: 1, impactLabel: 'Costly success'
  }});
  expect(events.map((event) => event.kind)).toEqual(['move', 'hazard', 'energy', 'stability', 'salvage', 'complete']);
  expect(eventIndexFor(events, 'energy', 'lead')).toBe(2);
  expect(events[2]).toMatchObject({ before: 6, after: 5, amount: 1 });
});

test('encounter sequence reveals the native before returning control', () => {
  const events = buildActionSequence({ type: 'encounter', lead: creature('scout', 'Chromocat'), route: null, encounter: creature('native', 'Xylum') });
  expect(events.map((event) => event.kind)).toEqual(['move', 'encounter', 'decision']);
  expect(events[1].message).toContain('Xylum');
});

test('credits crew support and a field companion as separate performers', () => {
  const lead = creature('lead', 'Chromocat');
  const support = creature('support', 'Hippochamp');
  const companion = creature('native', 'Xylum');
  const events = buildActionSequence({ type: 'crossing', lead, support, companion, method: { label: 'Leap the gap' }, result: {
    unseenHazards: [], supportHelp: 'Hippochamp makes the passage possible.', companionHelp: 'Xylum preserves 1 energy.',
    crewChanges: [{ creature: lead, added: 0, before: 0, after: 0 }, { creature: support, added: 0, before: 0, after: 0 }],
    instabilityChange: { added: 0, before: 0, after: 0 }, salvage: 0, salvageAfter: 0, impactLabel: 'Clean success'
  }});
  expect(events.map((event) => event.kind)).toEqual(['move', 'support', 'companion', 'complete']);
  expect(events[1]).toMatchObject({ actorId: 'support' });
  expect(events[2]).toMatchObject({ actorId: 'native' });
});
