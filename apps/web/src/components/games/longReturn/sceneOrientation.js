// Shared by arrival and route choice: the place does not disappear when the
// player starts comparing costs. Only refer to consequences already earned.
export function sceneOrientation(scene, flags = []) {
  if (scene.id === 'turbine-hall') {
    const entry = flags.includes('coolant-bypass')
      ? 'The crew climbs out of the flood into a vast hall of ice-crusted machines. Water trickles out of the passage below them, draining through the side channel your crossing cleared.'
      : flags.includes('quiet-entry')
        ? 'Beyond the broken walkway, the crew steps into a vast machinery hall. Your quiet crossing has left the great machines still—for now.'
        : 'Beyond the flooded entrance lies a vast machinery hall, its great machines crusted with ice.';
    return `${entry} Across the room, a sealed door leads toward the archive. Two passages lead there: one above the machines, one beneath them.`;
  }
  if (scene.id === 'archive-vestibule') {
    const memory = flags.includes('maintenance-codes')
      ? 'The markings you copied beneath the machines match symbols on its controls—a starting point for opening it.'
      : flags.includes('security-pulse')
        ? 'The signal sent by your crossing has reached it first: its locking ring has tightened around the plates.'
        : 'Its old controls are still waiting for someone who knows how to open it.';
    return `The crew reaches the door at the far end of the machinery hall. Overlapping metal plates close it like a shutter. ${memory} Beyond it lies the way to the archive.`;
  }
  return {
    'service-throat': 'Black water fills the entrance corridor. Across the flood, steps lead into the machinery hall—the first stretch of your journey to the lost archive. A broken walkway hangs above the water; below it, a current slips through the wreckage.',
    'null-gallery': 'Beyond the door, the corridor has been torn open to space. The archive entrance waits across the gap. An exposed strip of hull leads straight there; an enclosed service tunnel bends around the damage.',
    'nemesis-index': 'Beyond the broken gallery, thin record plates hang in a flickering field of light. This is the Nemesis Index—the surviving record of the plague research done here, and the reason you came. A sealed backup sits at its center. Save the plates or take the backup; either puts the record in your crew’s keeping.',
    'core-reservoir': 'At the archive junction, the crew turns away from the marked return route and descends the service stair. It ends at a pool of charged liquid. More salvage lies here, but every recovery spends reserves the crew may need to get home.',
    'generator-spine': 'From the reservoir junction, the crew follows a dry passage into the last chamber. Huge rings turn around a view of the white planet below. The extraction lift waits on the far side. Stop the rings for the whole control core, or take the smaller spindle between their turns and get out.'
  }[scene.id] || scene.arrival || scene.description;
}

export const routeSetting = {
  gantry: 'Keep above the flood on the broken, suspended walkway.',
  intake: 'Enter the water and follow its current beneath the fallen metal.',
  catwalk: 'Take the narrow metal walkway above the machines to the archive door.',
  underdeck: 'Follow the cramped repair passage beneath the machines to the same door.',
  decode: 'Use the door’s old control arms to unlock the overlapping plates.',
  breach: 'Force apart a cracked section of the door instead of unlocking it.',
  'outer-hull': 'Cross the exposed metal ledge with open space beside you.',
  conduit: 'Crawl around the breach inside an enclosed service tunnel.',
  stabilize: 'Steady the failing field so the crew can lift out the record plates.',
  blackbox: 'Pull the sealed backup from its cradle and leave the failing chamber.',
  harvest: 'Stay at the pool’s edge and collect charge through its valves.',
  dive: 'Go beneath the charged liquid to retrieve an intact power cell.',
  align: 'Bring the turning rings to a halt and remove the control core.',
  closure: 'Reach between the moving rings and grab the exposed memory spindle.'
};
