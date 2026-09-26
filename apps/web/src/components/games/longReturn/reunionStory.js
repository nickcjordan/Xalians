export const ARCHIVE_RESCUE = 'archive-native-rescued';
export const ARCHIVE_ESCAPE = 'archive-native-escaped';

export function encounterRelationship(scene, option) {
  if (scene.id !== 'archive-vestibule' || scene.encounter?.archetype !== 'trapped') return null;
  if (['release', 'free-native', 'maintenance-release'].includes(option.id)) return ARCHIVE_RESCUE;
  return option.id === 'force-arms' ? ARCHIVE_ESCAPE : null;
}

export function reunionStory(scene, flags = []) {
  if (scene.id !== 'nemesis-index') return null;
  if (flags.includes(ARCHIVE_RESCUE)) return {
    id: 'archive-warning', title: 'A familiar signal',
    text: 'The Hypnopet you freed waits in a service alcove. It recognizes the crew and sends a sharp impression: dust lifting as the field opens. Its psychic warning draws your attention to the sealed contaminant layer beneath the plates.',
    departure: 'With the warning understood, it slips into the sheltered return duct. The crew knows what opening the field will disturb.',
    hazardId: 'plague-dust'
  };
  if (flags.includes(ARCHIVE_ESCAPE)) return {
    id: 'archive-escape', title: 'Clear of the trap',
    text: 'The Hypnopet that escaped the forced arms crouches in a service alcove. At the crew’s approach it backs into a sheltered return duct. This time it has a way out, and the crew leaves that space open.',
    departure: 'The native is safe from the rig. The chamber ahead still needs investigating.'
  };
  return null;
}
