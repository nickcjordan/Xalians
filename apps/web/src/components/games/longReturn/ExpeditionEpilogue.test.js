import { expeditionMemories } from './ExpeditionEpilogue';
import { CREATURES } from './longReturnData';

test('the ending recalls the console only when the crew actually used it', () => {
  const flags = ['archive-controls-preserved'];
  expect(expeditionMemories([], flags, null).some(memory => memory.id === 'control-link')).toBe(false);
  const memories = expeditionMemories([{ id: 'core-reservoir', story: 'Graviclaw works at the dry console.' }], flags, { creature: CREATURES[4] });
  expect(memories.map(memory => memory.id)).toEqual(['companion', 'control-link']);
  expect(memories[0].text).toContain('Xylum');
});

test('the ending does not invent encounters or an objective recovery for an early abort', () => {
  expect(expeditionMemories([{ id: 'service-throat', story: 'The crew crosses.' }], ['quiet-entry'], null)).toEqual([]);
  expect(expeditionMemories([], ['archive-controls-lost'], null)[0].text).toContain('blackbox');
});

test('stopping the beacon has its own memory without claiming it was redirected', () => {
  const memories = expeditionMemories([{ id: 'null-gallery', encounterId: 'stop-beacon' }], ['gallery-beacon-stopped'], null);
  expect(memories.map(memory => memory.id)).toEqual(['beacon-stopped']);
  expect(memories[0].text).toContain('let its light fade');
  expect(memories[0].text).not.toContain('adjustment');
});

test('current outcomes survive prose edits and take precedence over legacy phrases', () => {
  const journal = [
    { id: 'core-reservoir', methodMemoryId: 'surviving-console', story: 'Revised account.' },
    { id: 'null-gallery', encounterId: 'redirect-beacon', encounter: 'Revised account.' }
  ];
  expect(expeditionMemories(journal, [], null).map(memory => memory.id)).toEqual(['control-link', 'beacon']);
  expect(expeditionMemories([
    { id: 'core-reservoir', methodMemoryId: null, story: 'They passed the dry console.' },
    { id: 'null-gallery', encounterId: null, encounter: 'Nobody turns the beacon.' }
  ], [], null)).toEqual([]);
});

test('a linked rescue does not erase a later gallery decision from the ending', () => {
  expect(expeditionMemories([
    { id: 'archive-vestibule', encounterId: 'maintenance-release' },
    { id: 'null-gallery', encounterId: 'stop-beacon' }
  ], [], null).map(memory => memory.id)).toEqual(['release', 'beacon-stopped']);
});
