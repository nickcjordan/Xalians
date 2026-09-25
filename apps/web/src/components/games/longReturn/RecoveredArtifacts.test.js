import { recoveredArtifacts } from './RecoveredArtifacts';
import { MISSION } from './longReturnData';

test('different objective and final approaches retain different physical objects', () => {
  expect(recoveredArtifacts([{ id: 'nemesis-index', routeId: 'stabilize' }, { id: 'generator-spine', routeId: 'align' }], 'complete').map(item => item.id)).toEqual(['plates', 'core']);
  expect(recoveredArtifacts([{ id: 'nemesis-index', routeId: 'blackbox' }, { id: 'generator-spine', routeId: 'closure' }], 'extracted').map(item => item.id)).toEqual(['blackbox', 'spindle']);
});

test('early departure invents no prize and forced extraction only guarantees the Index', () => {
  expect(recoveredArtifacts([{ id: 'service-throat', routeId: 'gantry' }], 'aborted')).toEqual([]);
  expect(recoveredArtifacts([{ id: 'nemesis-index', routeId: 'stabilize' }, { id: 'generator-spine', routeId: 'align' }], 'failed').map(item => item.id)).toEqual(['plates']);
});

test('old checkpoints use their recorded route title while current identifiers survive copy changes', () => {
  const route = MISSION.scenes[6].routes.find(item => item.id === 'closure');
  expect(recoveredArtifacts([{ id: 'generator-spine', route: route.title }], 'complete')[0].id).toBe('spindle');
  expect(recoveredArtifacts([{ id: 'generator-spine', routeId: 'align', route: route.title }], 'complete')[0].id).toBe('core');
});
