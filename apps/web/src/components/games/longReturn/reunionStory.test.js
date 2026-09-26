import { CREATURES, MISSION } from './longReturnData';
import { applyMissionMemory, scanScene } from './longReturnEngine';
import { encounterRelationship, reunionStory, ARCHIVE_RESCUE, ARCHIVE_ESCAPE } from './reunionStory';
import { expeditionMemories } from './ExpeditionEpilogue';

test('only actually freeing the archive native creates a reunion', () => {
  for (const id of ['release', 'free-native', 'maintenance-release']) expect(encounterRelationship(MISSION.scenes[2], { id })).toBe(ARCHIVE_RESCUE);
  expect(encounterRelationship(MISSION.scenes[2], { id: 'force-arms' })).toBe(ARCHIVE_ESCAPE);
  for (const id of ['pin-rig', 'mark', 'detour']) expect(encounterRelationship(MISSION.scenes[2], { id })).toBeNull();
  expect(encounterRelationship(MISSION.scenes[1], { id: 'release' })).toBeNull();
});

test('the rescued native shares knowledge at the Index, not before arrival', () => {
  for (const scene of MISSION.scenes.filter(scene => scene.id !== 'nemesis-index')) {
    expect(reunionStory(scene, [ARCHIVE_RESCUE])).toBeNull();
    expect(applyMissionMemory(scene, [ARCHIVE_RESCUE]).knownHazardIds).not.toContain('plague-dust');
  }
  const index = applyMissionMemory(MISSION.scenes[4], [ARCHIVE_RESCUE]);
  expect(index.knownHazardIds).toEqual(['plague-dust']);
  expect(scanScene(index, CREATURES[0]).revealedIds).toContain('plague-dust');
  expect(MISSION.scenes[4].knownHazardIds).toBeUndefined();
});

test('forceful escape gives the native a future without inventing a warning or companion', () => {
  const reunion = reunionStory(MISSION.scenes[4], [ARCHIVE_ESCAPE]);
  expect(reunion.text).toContain('sheltered return duct');
  expect(reunion.hazardId).toBeUndefined();
  expect(applyMissionMemory(MISSION.scenes[4], [ARCHIVE_ESCAPE]).knownHazardIds).toEqual([]);
  expect(reunionStory(MISSION.scenes[4], [])).toBeNull();
});

test('an early extraction does not claim a reunion the crew never reached', () => {
  expect(expeditionMemories([{ id: 'archive-vestibule' }], [ARCHIVE_RESCUE], null)).toEqual([]);
  expect(expeditionMemories([{ id: 'nemesis-index' }], [ARCHIVE_RESCUE], null).map(memory => memory.id)).toEqual(['archive-warning']);
});
