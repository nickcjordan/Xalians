import { MAX_STRAIN } from './longReturnData';
import { scoutProfile } from './longReturnEngine';

// A lone scout owns its encounter, even if contact has exhausted it. A group
// response must use a crew member who can still act, consistently in every view.
export function encounterActor(scene, crew, strain, scout) {
  if (scout) return scout;
  return crew.filter(member => (strain[member.id] || 0) < MAX_STRAIN)
    .sort((a, b) => scoutProfile(scene, b).hold - scoutProfile(scene, a).hold)[0] || null;
}
