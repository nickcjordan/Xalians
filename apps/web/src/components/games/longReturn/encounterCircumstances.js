export const BEACON_LOOP = 'gallery-beacon-loop';
export const COOLANT_HOLD = 'underdeck-coolant-hold';

// A saved local circumstance changes the situation, not the creature's facts.
export function encounterCircumstance(scene, flags) {
  if (scene.id === 'turbine-hall' && flags.includes(COOLANT_HOLD)) return { ...scene,
    encounterHint: 'Coolant taps against the underdeck supports. Fresh roots bind a split pipe sleeve.',
    encounter: { ...scene.encounter, archetype: 'coolant', title: 'Holding back the flow', disposition: 'occupied with a failing coolant sleeve',
      description: 'A Xylum holds a split coolant sleeve together. Whenever its grip shifts, a jet sweeps the narrow passage. It needs a way to let go.',
      firstContact: 'The scout finds Xylum braced around a split coolant sleeve. A jet crosses the passage whenever the roots shift. The native is holding the failure back.',
      crewContact: 'The crew stops as coolant cuts across the underdeck. Xylum tightens its roots around the split sleeve, briefly holding the jet back.'
    }
  };
  if (scene.id !== 'null-gallery' || !flags.includes(BEACON_LOOP)) return scene;
  return { ...scene,
    arrival: 'Beyond the iris, loose fragments hang motionless in a chamber open to the stars. A worn beacon sweeps light across the conduit mouth, pauses, and begins again.',
    encounterHint: 'A damaged inspection beacon sweeps the service tunnel. Something moves each time its light returns.',
    encounter: { ...scene.encounter, archetype: 'beacon', title: 'The repeating beacon', disposition: 'following the repeated sweep of a beacon',
      description: 'An Ectoghoul follows the sweep of a damaged inspection beacon, returning to the conduit mouth with every pass. The crew can change the light or try to pass between its returns.',
      firstContact: 'A damaged beacon sweeps the conduit mouth. An Ectoghoul follows its light, circling back each time the mechanism repeats.',
      crewContact: 'The crew stops at the conduit as a beacon swings toward them. An Ectoghoul follows the light into their path, then drifts back with the beam.'
    }
  };
}
