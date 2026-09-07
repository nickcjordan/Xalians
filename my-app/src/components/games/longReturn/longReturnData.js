export const MAX_STRAIN = 6;
export const MAX_PRESSURE = 10;
export const MAX_INSTABILITY = MAX_PRESSURE;

export const CREATURES = [
  {
    id: 'graviclaw-213',
    species: 'Graviclaw',
    planet: 'Grimedes',
    role: 'Cold-water anchor',
    element: { primary: 'dark', affinities: { dark: 100, ghost: 44 } },
    physiology: {
      corporeality: 'corporeal', composition: 'flesh', covering: 'chitin', bodyPlan: 'multiped',
      heightCm: 198, weightKg: 372, diet: 'carnivore', communication: ['vibration'],
      breathes: ['gas', 'liquid'], ambientMedia: ['gas', 'liquid'], temperatureC: { min: -15, max: 20 },
      capabilities: { flight: 0, swim: 52, burrow: 31, climb: 18, sprint: 12, leap: 4, manipulation: 44 },
      senses: { sight: 55, hearing: 28, smell: 47, special: ['tremorsense'] }
    },
    attributes: { strength: 74, vitality: 61, endurance: 65, agility: 14, reflex: 38, intelligence: 42, willpower: 78, instinct: 71, charisma: 19, resilience: 93 },
    traits: ['armored', 'anchored', 'stealthy'],
    temperament: { boldness: 81, curiosity: 48, energy: 25, aggression: 66, sociability: 22 },
    abilities: [
      { id: 'grav-point', name: 'Point of No Return', signature: true, instrument: 'pincers', action: 'snare', medium: 'dark', intensity: 74 },
      { id: 'grav-vise', name: 'Wraith Vise', instrument: 'pincers', action: 'crush', medium: 'ghost', intensity: 48 },
      { id: 'grav-ward', name: 'Event Horizon', instrument: 'pincers', action: 'ward', medium: 'dark', intensity: 41 }
    ]
  },
  {
    id: 'chromocat-088',
    species: 'Chromocat',
    planet: 'Luminax',
    role: 'Fast visual scout',
    element: { primary: 'light', affinities: { light: 100, electric: 38 } },
    physiology: {
      corporeality: 'corporeal', composition: 'flesh', covering: 'fur', bodyPlan: 'quadruped',
      heightCm: 142, weightKg: 75, diet: 'carnivore', communication: ['display', 'vocal'],
      breathes: ['gas'], ambientMedia: ['gas'], temperatureC: { min: -5, max: 52 },
      capabilities: { flight: 22, swim: 14, burrow: 0, climb: 65, sprint: 96, leap: 86, manipulation: 45 },
      senses: { sight: 84, hearing: 67, smell: 54, special: ['heat-sense'] }
    },
    attributes: { strength: 58, vitality: 55, endurance: 72, agility: 96, reflex: 93, intelligence: 48, willpower: 60, instinct: 77, charisma: 38, resilience: 44 },
    traits: ['stealthy', 'foresighted'],
    temperament: { boldness: 76, curiosity: 67, energy: 94, aggression: 61, sociability: 38 },
    abilities: [
      { id: 'chroma-sprint', name: 'The Light Between Moments', signature: true, instrument: 'body', action: 'ambush', medium: 'light', intensity: 92 },
      { id: 'chroma-rake', name: 'Harvesting Horizon', instrument: 'blades', action: 'rake', medium: 'light', intensity: 70 },
      { id: 'chroma-beam', name: 'Corona Line', instrument: 'light-organs', action: 'beam', medium: 'light', intensity: 64 }
    ]
  },
  {
    id: 'hippochamp-041',
    species: 'Hippochamp',
    planet: 'Poseidas',
    role: 'Flooded-site responder',
    element: { primary: 'water', affinities: { water: 100, chemical: 33 } },
    physiology: {
      corporeality: 'corporeal', composition: 'flesh', covering: 'scales', bodyPlan: 'quadruped',
      heightCm: 129, weightKg: 141, diet: 'herbivore', communication: ['vocal'],
      breathes: ['gas', 'liquid'], ambientMedia: ['gas', 'liquid'], temperatureC: { min: -2, max: 44 },
      capabilities: { flight: 0, swim: 92, burrow: 8, climb: 24, sprint: 48, leap: 30, manipulation: 62 },
      senses: { sight: 62, hearing: 70, smell: 64, special: ['electroreception'] }
    },
    attributes: { strength: 61, vitality: 78, endurance: 91, agility: 57, reflex: 66, intelligence: 64, willpower: 72, instinct: 69, charisma: 58, resilience: 76 },
    traits: ['protective', 'resistant', 'healing'],
    temperament: { boldness: 64, curiosity: 41, energy: 76, aggression: 28, sociability: 79 },
    abilities: [
      { id: 'hippo-deluge', name: 'Deluge Emergency Protocol', signature: true, instrument: 'trunk', action: 'spray', medium: 'water', intensity: 88 },
      { id: 'hippo-ward', name: 'Pressure Screen', instrument: 'breath', action: 'ward', medium: 'water', intensity: 72 },
      { id: 'hippo-mend', name: 'Restorative Current', instrument: 'secretion', action: 'mend', medium: 'water', intensity: 68 }
    ]
  },
  {
    id: 'ectoghoul-117',
    species: 'Ectoghoul',
    planet: 'Phantiri',
    role: 'Vacuum infiltrator',
    element: { primary: 'ghost', affinities: { ghost: 100, dark: 57 } },
    physiology: {
      corporeality: 'non-corporeal', composition: 'spectral', covering: 'mist', bodyPlan: 'floating',
      heightCm: 90, weightKg: 3, diet: 'energy-feeder', communication: ['vocal'],
      breathes: [], ambientMedia: ['gas', 'liquid', 'vacuum'], temperatureC: { min: -90, max: 90 },
      capabilities: { flight: 88, swim: 74, burrow: 0, climb: 0, sprint: 79, leap: 0, manipulation: 20 },
      senses: { sight: 65, hearing: 81, smell: 0, special: ['void-sense'] }
    },
    attributes: { strength: 18, vitality: 49, endurance: 42, agility: 88, reflex: 91, intelligence: 70, willpower: 84, instinct: 79, charisma: 45, resilience: 53 },
    traits: ['phasing', 'slippery', 'menacing'],
    temperament: { boldness: 91, curiosity: 86, energy: 71, aggression: 73, sociability: 30 },
    abilities: [
      { id: 'ecto-dirge', name: 'The Laugh Beyond the Hull', signature: true, instrument: 'voice', action: 'terrorize', medium: 'ghost', intensity: 84 },
      { id: 'ecto-cloud', name: 'Ectoplasmic Wake', instrument: 'body', action: 'cloud', medium: 'ghost', intensity: 66 },
      { id: 'ecto-beam', name: 'Grave Current', instrument: 'gaze', action: 'beam', medium: 'ghost', intensity: 58 }
    ]
  },
  {
    id: 'xylum-064',
    species: 'Xylum',
    planet: 'Floria',
    role: 'Subsurface engineer',
    element: { primary: 'plant', affinities: { plant: 100, water: 61 } },
    physiology: {
      corporeality: 'corporeal', composition: 'plant', covering: 'hide', bodyPlan: 'amorphous',
      heightCm: 320, weightKg: 237, diet: 'photosynthetic', communication: ['chemical', 'vibration'],
      breathes: ['gas', 'liquid'], ambientMedia: ['gas', 'liquid'], temperatureC: { min: 2, max: 48 },
      capabilities: { flight: 0, swim: 35, burrow: 92, climb: 54, sprint: 8, leap: 0, manipulation: 79 },
      senses: { sight: 34, hearing: 18, smell: 86, special: ['tremorsense'] }
    },
    attributes: { strength: 79, vitality: 88, endurance: 82, agility: 22, reflex: 25, intelligence: 68, willpower: 73, instinct: 76, charisma: 50, resilience: 86 },
    traits: ['anchored', 'regenerative', 'healing'],
    temperament: { boldness: 43, curiosity: 58, energy: 31, aggression: 16, sociability: 68 },
    abilities: [
      { id: 'xylum-roots', name: 'The World Takes Root', signature: true, instrument: 'roots', action: 'snare', medium: 'plant', intensity: 91 },
      { id: 'xylum-mend', name: 'Green Renewal', instrument: 'tendrils', action: 'mend', medium: 'plant', intensity: 77 },
      { id: 'xylum-ward', name: 'Bramble Shelter', instrument: 'roots', action: 'ward', medium: 'plant', intensity: 69 }
    ]
  },
  {
    id: 'hypnopet-019',
    species: 'Hypnopet',
    planet: 'Telypso',
    role: 'Empathic field medic',
    element: { primary: 'psychic', affinities: { psychic: 100, light: 48 } },
    physiology: {
      corporeality: 'corporeal', composition: 'flesh', covering: 'fur', bodyPlan: 'quadruped',
      heightCm: 35, weightKg: 13, diet: 'herbivore', communication: ['telepathic', 'display'],
      breathes: ['gas'], ambientMedia: ['gas'], temperatureC: { min: 8, max: 36 },
      capabilities: { flight: 0, swim: 22, burrow: 18, climb: 34, sprint: 62, leap: 71, manipulation: 70 },
      senses: { sight: 74, hearing: 76, smell: 69, special: ['psychic'] }
    },
    attributes: { strength: 17, vitality: 64, endurance: 58, agility: 71, reflex: 74, intelligence: 88, willpower: 91, instinct: 83, charisma: 94, resilience: 48 },
    traits: ['healing', 'hypnotic', 'perceptive', 'inspiring'],
    temperament: { boldness: 35, curiosity: 74, energy: 59, aggression: 8, sociability: 94 },
    abilities: [
      { id: 'hypno-mercy', name: 'Mercy of the Quiet Mind', signature: true, instrument: 'aura', action: 'mend', medium: 'psychic', intensity: 90 },
      { id: 'hypno-snare', name: 'Lucid Trance', instrument: 'gaze', action: 'snare', medium: 'psychic', intensity: 73 },
      { id: 'hypno-ward', name: 'Empathic Shelter', instrument: 'mind', action: 'ward', medium: 'psychic', intensity: 80 }
    ]
  }
];

export const MISSION = {
  id: 'black-archive-7',
  title: 'The Black Archive',
  location: 'Krystos / End-Wars Containment Annex 7',
  objective: 'Recover the Nemesis Index before the annex folds into the ice shelf.',
  briefing: 'The annex has been without power for two centuries. Old emergency systems are waking in the wrong order. Reach the archive, secure its plague research, and decide how much of the deeper Generator spine you are willing to salvage on the way out.',
  dangerClock: {
    label: 'Annex stability',
    failure: 'At 0 stability, the annex collapses and forces extraction.',
    cause: 'Noise, delays, awakened machinery, and destructive actions destabilize the annex.'
  },
  objectiveScene: 4,
  scenes: [
    {
      id: 'service-throat', title: 'Flooded Service Throat', trackLabel: 'Flooded Entry', deck: 'ACCESS 01',
      description: 'Black water turns beneath a collapsed maintenance gantry. The annex begins on the far side.',
      arrival: 'The exterior seal grinds shut behind the crew. Ahead, black water and a broken gantry are the only ways into the annex.',
      goal: 'Move all three crew members from the exterior access seal to the intact annex corridor.',
      destination: 'the Blind Turbine Hall on the far side of the flood',
      surveyFocus: 'the waterline, hanging gantry, and intake channel',
      relayChannels: ['vibration', 'telepathic'],
      hazards: [
        { id: 'conductive-brine', label: 'Conductive brine', detail: 'The flood carries a dormant Electric charge.', sense: 'smell', threshold: 58, special: 'electroreception', strain: 1, pressure: 1 }
      ],
      routes: [
        { id: 'gantry', title: 'Cross the hanging gantry', description: 'Stay dry, move lightly, and trust the old suspension bolts.', difficulty: 63, pressure: 1, salvage: 1,
          consequence: { id: 'quiet-entry', label: 'Quiet entry', detail: 'The turbine bank ahead remains dormant.', future: 'Makes the upper catwalk easier in the next scene.' },
          outcomes: {
            clean: 'The gantry bows once, then settles. The crew reaches the far seal without waking the machinery beyond it.',
            costly: 'Old bolts tear free behind the lead, but support holds the span long enough for everyone to cross.',
            rough: 'The gantry folds into the flood. The crew scrambles onto the far ledge as the impact wakes machinery deeper inside.'
          },
          environment: { medium: 'gas', temperatureC: 5, element: 'metal' }, hazardIds: [],
          reaction: { axis: 'boldness', direction: 'low', label: 'A cautious lead tests each span.' },
          methods: [
            { kind: 'capability', key: 'climb', attribute: 'agility', label: 'Climb the suspension frame' },
            { kind: 'capability', key: 'leap', attribute: 'reflex', label: 'Leap between intact sections' },
            { kind: 'action', key: 'beam', attribute: 'intelligence', label: 'Cut a controlled path' }
          ] },
        { id: 'intake', title: 'Ride the intake current', description: 'Enter the flood and pass beneath the wreckage.', difficulty: 58, pressure: 0, salvage: 2,
          consequence: { id: 'coolant-bypass', label: 'Coolant bypass opened', detail: 'The current drains frozen fill from the underdeck ahead.', future: 'Makes the maintenance underdeck easier in the next scene.' },
          outcomes: {
            clean: 'The crew slips beneath the wreckage and rises inside the annex. Their wake pulls frozen debris out of a maintenance bypass.',
            costly: 'The current throws the lead against the intake wall, but the crew surfaces together as the bypass begins to drain.',
            rough: 'The intake churns the crew through metal and ice. They emerge scattered, while released floodwater tears open a lower service route.'
          },
          environment: { medium: 'liquid', temperatureC: 3, element: 'electric' }, hazardIds: ['conductive-brine'],
          reaction: { axis: 'boldness', direction: 'high', label: 'A bold lead commits before the current turns.' },
          methods: [
            { kind: 'capability', key: 'swim', attribute: 'endurance', label: 'Swim the intake' },
            { kind: 'action', key: 'snare', attribute: 'strength', label: 'Tow the crew through' },
            { kind: 'action', key: 'ward', attribute: 'willpower', label: 'Screen the crossing' }
          ] }
      ]
    },
    {
      id: 'turbine-hall', title: 'Blind Turbine Hall', trackLabel: 'Turbine Hall', deck: 'ACCESS 02',
      description: 'Frozen turbines fill a chamber with blind corners and intermittent motion.',
      arrival: 'The access seal opens onto a forest of frozen turbine housings. Somewhere in the dark, one mechanism completes a slow, silent turn.',
      goal: 'Cross the dormant machinery without letting a waking turbine divide the crew.',
      destination: 'the sealed Archive Vestibule beyond the turbine bank',
      surveyFocus: 'the turbine housings, catwalk joints, and maintenance underdeck',
      relayChannels: ['vibration', 'display', 'telepathic'],
      encounterHint: 'Fresh root scoring on the underdeck suggests another Xalian may be sheltering inside the machinery.',
      encounter: {
        id: 'underdeck-xylum', creatureId: 'xylum-064', routeId: 'underdeck',
        title: 'Stranded Xylum', disposition: 'injured and defensive',
        description: 'A Xylum survivor has rooted itself around a cracked turbine bearing. It is hurt, frightened, and blocking the maintenance underdeck.',
        concealment: 62, threat: 72,
        companionBenefit: 'Once this mission, Xylum can brace a crossing and preserve 1 crew energy.'
      },
      hazards: [
        { id: 'servo-cycle', label: 'Live servo cycle', detail: 'One turbine still completes a silent rotation every forty seconds.', sense: 'hearing', threshold: 60, special: 'tremorsense', strain: 1, pressure: 1 }
      ],
      routes: [
        { id: 'catwalk', title: 'Race the upper catwalk', description: 'A fast crossing before the turbine completes its cycle.', difficulty: 68, pressure: 1, salvage: 2,
          legacyAdjustments: [{ flag: 'quiet-entry', difficulty: -5, label: 'Quiet entry', detail: 'Because the crew entered quietly, the turbine starts later and the catwalk window is wider.' }],
          consequence: { id: 'security-pulse', label: 'Security pulse transmitted', detail: 'The fast crossing wakes authentication systems ahead.', future: 'Makes forcing the next security door harder.' },
          outcomes: {
            clean: 'The crew crosses between turbine pulses. Only their footfalls reach the security wing ahead.',
            costly: 'The turbine starts early. The lead clears the final gap as support drags the reserve out of the sweep.',
            rough: 'The crew outruns the turning assembly by moments, triggering a security pulse beyond the hall.'
          },
          environment: { medium: 'gas', temperatureC: -12, element: 'ice' }, hazardIds: ['servo-cycle'],
          reaction: { axis: 'energy', direction: 'high', label: 'An energetic lead keeps moving when the machinery wakes.' },
          methods: [
            { kind: 'capability', key: 'sprint', attribute: 'reflex', label: 'Outrun the servo cycle' },
            { kind: 'capability', key: 'leap', attribute: 'agility', label: 'Clear the turbine gap' },
            { kind: 'action', key: 'ambush', attribute: 'reflex', label: 'Close the interval in a burst' }
          ] },
        { id: 'underdeck', title: 'Enter the maintenance underdeck', description: 'Slow, cramped, and insulated from the main machinery.', difficulty: 61, pressure: 0, salvage: 1,
          legacyAdjustments: [{ flag: 'coolant-bypass', difficulty: -4, label: 'Drained underdeck', detail: 'The opened coolant bypass has washed frozen fill out of this route.' }],
          consequence: { id: 'maintenance-codes', label: 'Maintenance codes recovered', detail: 'Old service markings reveal part of the archive protocol.', future: 'Makes rebuilding the next security protocol easier.' },
          outcomes: {
            clean: 'The crew follows faded service marks beneath the turbine and copies a surviving maintenance code from the wall.',
            costly: 'The underdeck narrows to a crawl. The lead forces a passage and still recovers a strip of maintenance notation.',
            rough: 'The frozen fill gives way around the crew, but the collapse exposes an old maintenance code before they climb free.'
          },
          environment: { medium: 'gas', temperatureC: -6, element: 'metal' }, hazardIds: [],
          reaction: { axis: 'curiosity', direction: 'low', label: 'A disciplined lead ignores branching service ducts.' },
          methods: [
            { kind: 'capability', key: 'burrow', attribute: 'strength', label: 'Open a route through frozen fill' },
            { kind: 'trait', key: 'phasing', attribute: 'willpower', label: 'Pass through the service bulkhead' },
            { kind: 'attribute', key: 'intelligence', secondary: 'manipulation', label: 'Trace the maintenance diagram' }
          ] }
      ]
    },
    {
      id: 'archive-vestibule', title: 'Archive Vestibule', trackLabel: 'Vestibule', deck: 'SECURITY 01',
      description: 'A sealed iris door waits behind a forest of dead authentication arms.',
      arrival: 'The turbine noise dies behind the crew. A many-armed authentication rig unfolds from the wall and asks for credentials that vanished centuries ago.',
      goal: 'Open the archive iris while preserving enough crew strength for the containment wing.',
      destination: 'the Null Gallery inside archive security',
      surveyFocus: 'the authentication arms, iris seam, and dormant security field',
      relayChannels: ['vocal', 'display', 'telepathic'],
      encounterHint: 'A small psychic distress pattern is repeating from inside the authentication rig.',
      encounter: {
        id: 'vestibule-hypnopet', creatureId: 'hypnopet-019', routeId: 'decode', archetype: 'trapped',
        title: 'Trapped Signal-Mimic', disposition: 'confused and entangled',
        description: 'A feral Hypnopet is caught between the rig’s moving authentication arms. Its panic is feeding false commands into the lock.',
        concealment: 68, threat: 48
      },
      hazards: [
        { id: 'countermeasure', label: 'Cognitive countermeasure', detail: 'The lock projects an obsolete interrogation pattern.', sense: 'sight', threshold: 72, special: 'psychic', strain: 1, pressure: 2 }
      ],
      routes: [
        { id: 'decode', title: 'Wake the authentication rig', description: 'Reconstruct enough of the dead protocol to make the door open itself.', difficulty: 71, pressure: 0, salvage: 3,
          legacyAdjustments: [{ flag: 'maintenance-codes', difficulty: -6, label: 'Recovered codes', detail: 'The underdeck markings supply the missing opening sequence.' }],
          outcomes: {
            clean: 'The rebuilt protocol ripples through the authentication arms. The iris recognizes a maintenance identity and opens without alarm.',
            costly: 'The rig accepts the improvised sequence, but its interrogation pattern leaves the lead visibly shaken.',
            rough: 'The crew floods the rig with contradictory credentials until the iris opens in self-defense.'
          },
          environment: { medium: 'gas', temperatureC: -4, element: 'psychic' }, hazardIds: ['countermeasure'],
          reaction: { axis: 'curiosity', direction: 'high', label: 'A curious lead follows the machine\'s incomplete logic.' },
          methods: [
            { kind: 'attribute', key: 'intelligence', secondary: 'manipulation', label: 'Rebuild the protocol' },
            { kind: 'action', key: 'beam', attribute: 'intelligence', label: 'Feed the optical reader' },
            { kind: 'action', key: 'snare', attribute: 'manipulation', label: 'Move the authentication arms remotely' }
          ] },
        { id: 'breach', title: 'Open the pressure seam', description: 'Ignore the lock and force the iris along its oldest fracture.', difficulty: 72, pressure: 2, salvage: 1,
          legacyAdjustments: [{ flag: 'security-pulse', difficulty: 5, label: 'Alerted lock', detail: 'The turbine hall’s security pulse has fully engaged the locking collar.' }],
          outcomes: {
            clean: 'The lead finds the old fracture and opens the iris before the locking collar can answer.',
            costly: 'The seam opens one grinding segment at a time, showering the crew in brittle alloy.',
            rough: 'The iris tears sideways. Alarms stutter through the security wing as the crew forces itself through.'
          },
          environment: { medium: 'gas', temperatureC: -9, element: 'metal' }, hazardIds: [],
          reaction: { axis: 'boldness', direction: 'high', label: 'A bold lead keeps force on the seam as it shifts.' },
          methods: [
            { kind: 'action', key: 'crush', attribute: 'strength', label: 'Crush the locking collar' },
            { kind: 'action', key: 'rake', attribute: 'agility', label: 'Cut along the fracture' },
            { kind: 'trait', key: 'phasing', attribute: 'willpower', label: 'Cross the iris and release it inside' }
          ] }
      ]
    },
    {
      id: 'null-gallery', title: 'The Null Gallery', trackLabel: 'Null Gallery', deck: 'SECURITY 02',
      description: 'The shortest way to the archive crosses a gallery open to vacuum and Grimedes-dark containment residue.',
      arrival: 'Beyond the iris, loose fragments hang motionless in a chamber open to the stars. A territorial cry moves through the hull instead of the air.',
      goal: 'Reach the primary archive chamber without losing a crew member to the broken hull.',
      destination: 'the Nemesis Index chamber at the end of the security wing',
      surveyFocus: 'the exposed centerline, inner conduit, and drifting containment residue',
      relayChannels: ['display', 'telepathic'],
      encounterHint: 'Fresh scoring around the conduit mouth marks the boundary of a territorial void-dweller.',
      encounter: {
        id: 'gallery-ectoghoul', creatureId: 'ectoghoul-117', routeId: 'conduit', archetype: 'territorial',
        title: 'Territorial Ectoghoul', disposition: 'watchful and defensive',
        description: 'A native Ectoghoul has claimed the shielded conduit as shelter. It wants distance, not prey, but it will defend the only pressurized route.',
        concealment: 74, threat: 70
      },
      hazards: [
        { id: 'void-shear', label: 'Local gravity shear', detail: 'The centerline is slowly pulling loose material toward the outer hull.', sense: 'sight', threshold: 78, special: 'void-sense', strain: 2, pressure: 1 }
      ],
      routes: [
        { id: 'outer-hull', title: 'Cross the exposed hull', description: 'Fast and direct, with nothing between the crew and vacuum.', difficulty: 73, pressure: 1, salvage: 3,
          environment: { medium: 'vacuum', temperatureC: -35, element: 'dark' }, hazardIds: ['void-shear'],
          reaction: { axis: 'sociability', direction: 'high', label: 'A social lead stays close enough to relay corrections.' },
          methods: [
            { kind: 'capability', key: 'flight', attribute: 'agility', label: 'Fly the broken centerline' },
            { kind: 'trait', key: 'phasing', attribute: 'willpower', label: 'Follow the intact inner skin' },
            { kind: 'action', key: 'ward', attribute: 'resilience', label: 'Carry a protected crossing bubble' }
          ] },
        { id: 'conduit', title: 'Crawl the shielded conduit', description: 'A longer route with intact atmosphere and no room to turn around.', difficulty: 67, pressure: 1, salvage: 1,
          environment: { medium: 'gas', temperatureC: -18, element: 'ice' }, hazardIds: [],
          reaction: { axis: 'sociability', direction: 'low', label: 'An independent lead works ahead without regrouping.' },
          methods: [
            { kind: 'attribute', key: 'manipulation', secondary: 'intelligence', label: 'Disassemble the conduit braces' },
            { kind: 'action', key: 'snare', attribute: 'manipulation', label: 'Pull the crew through in sequence' },
            { kind: 'capability', key: 'climb', attribute: 'endurance', label: 'Climb the conduit spine' }
          ] }
      ]
    },
    {
      id: 'nemesis-index', title: 'The Nemesis Index', trackLabel: 'Nemesis Index', deck: 'OBJECTIVE', objective: true,
      description: 'The archive hangs in a failed stasis field. Its blackbox contains the only surviving index of the plague work done here.',
      goal: 'Secure the Nemesis Index—the mission succeeds if this record leaves the annex.',
      destination: 'the extraction fork, with optional access to the deeper Core Reservoir',
      surveyFocus: 'the stasis membrane, blackbox cradle, and contaminant layer',
      relayChannels: ['vocal', 'display', 'vibration', 'telepathic'],
      hazards: [
        { id: 'plague-dust', label: 'Dormant plague dust', detail: 'Opening the field will disturb a sealed contaminant layer.', sense: 'smell', threshold: 64, special: 'psychic', strain: 2, pressure: 1 }
      ],
      routes: [
        { id: 'stabilize', title: 'Stabilize the archive', description: 'Preserve the chamber and recover every readable index plate.', difficulty: 76, pressure: 1, salvage: 5,
          environment: { medium: 'gas', temperatureC: -5, element: 'chemical' }, hazardIds: ['plague-dust'],
          reaction: { axis: 'aggression', direction: 'low', label: 'A gentle lead avoids rupturing the stasis membrane.' },
          methods: [
            { kind: 'action', key: 'ward', attribute: 'willpower', label: 'Contain the collapsing field' },
            { kind: 'action', key: 'mend', attribute: 'intelligence', label: 'Repair the stasis web' },
            { kind: 'attribute', key: 'intelligence', secondary: 'manipulation', label: 'Rebuild the index cradle' }
          ] },
        { id: 'blackbox', title: 'Pull the archive blackbox', description: 'Take the essential index and let the rest of the chamber collapse.', difficulty: 70, pressure: 3, salvage: 3,
          environment: { medium: 'gas', temperatureC: -5, element: 'chemical' }, hazardIds: ['plague-dust'],
          reaction: { axis: 'boldness', direction: 'high', label: 'A bold lead holds position through the collapse.' },
          methods: [
            { kind: 'action', key: 'snare', attribute: 'strength', label: 'Pull the blackbox free' },
            { kind: 'action', key: 'crush', attribute: 'strength', label: 'Break the cradle around it' },
            { kind: 'attribute', key: 'manipulation', secondary: 'reflex', label: 'Release the live catches by hand' }
          ] }
      ]
    },
    {
      id: 'core-reservoir', title: 'Core Reservoir', trackLabel: 'Core Reservoir', deck: 'OPTIONAL 01', optional: true,
      description: 'The objective is secure. Below it, a reservoir still holds a century of captured Generator charge.',
      goal: 'Recover optional Generator charge without sacrificing the secured Index or the remaining crew.',
      destination: 'the final Generator Spine or the extraction route',
      surveyFocus: 'the charged surface, collector valves, and submerged storage cells',
      relayChannels: ['vibration', 'telepathic'],
      hazards: [
        { id: 'charge-bloom', label: 'Charge bloom', detail: 'The reservoir discharges when its surface is broken.', sense: 'hearing', threshold: 68, special: 'electroreception', strain: 2, pressure: 2 }
      ],
      routes: [
        { id: 'harvest', title: 'Harvest the surface charge', description: 'Work from the rim and bleed the reservoir slowly.', difficulty: 74, pressure: 1, salvage: 6,
          environment: { medium: 'gas', temperatureC: -8, element: 'electric' }, hazardIds: ['charge-bloom'],
          reaction: { axis: 'energy', direction: 'low', label: 'A patient lead waits between discharge cycles.' },
          methods: [
            { kind: 'action', key: 'ward', attribute: 'resilience', label: 'Screen each discharge' },
            { kind: 'attribute', key: 'manipulation', secondary: 'intelligence', label: 'Bleed the collector valves' },
            { kind: 'trait', key: 'resistant', attribute: 'resilience', label: 'Work inside the contaminated rim' }
          ] },
        { id: 'dive', title: 'Dive for the intact cell', description: 'The richest cell is below the charged liquid surface.', difficulty: 80, pressure: 2, salvage: 9,
          environment: { medium: 'liquid', temperatureC: -8, element: 'electric' }, hazardIds: ['charge-bloom'],
          reaction: { axis: 'boldness', direction: 'high', label: 'A bold lead commits before the bloom peaks.' },
          methods: [
            { kind: 'capability', key: 'swim', attribute: 'resilience', label: 'Dive through the charged layer' },
            { kind: 'action', key: 'snare', attribute: 'strength', label: 'Retrieve the cell from the rim' },
            { kind: 'action', key: 'spray', attribute: 'intelligence', label: 'Displace the surface charge' }
          ] }
      ]
    },
    {
      id: 'generator-spine', title: 'Generator Spine', trackLabel: 'Generator Spine', deck: 'OPTIONAL 02', optional: true,
      description: 'One last chamber: concentric machinery turning around a view of the white planet below.',
      goal: 'Take the final recovery prize and leave the annex before its pressure reaches collapse.',
      destination: 'the surface extraction lift—this is the last crossing',
      surveyFocus: 'the closing rings, control core, and exposed memory spindle',
      relayChannels: ['display', 'telepathic'],
      hazards: [
        { id: 'ring-closure', label: 'Asymmetric ring closure', detail: 'The inner ring locks three seconds before the outer assembly.', sense: 'sight', threshold: 76, special: 'foresight', strain: 2, pressure: 2 }
      ],
      routes: [
        { id: 'align', title: 'Realign the spine', description: 'Stop the rings and recover a complete Vallerii control core.', difficulty: 82, pressure: 2, salvage: 10,
          environment: { medium: 'vacuum', temperatureC: 38, element: 'light' }, hazardIds: ['ring-closure'],
          reaction: { axis: 'sociability', direction: 'high', label: 'A social lead keeps every brace synchronized.' },
          methods: [
            { kind: 'action', key: 'snare', attribute: 'strength', label: 'Hold the rings in alignment' },
            { kind: 'attribute', key: 'manipulation', secondary: 'intelligence', label: 'Reset the core governors' },
            { kind: 'trait', key: 'anchored', attribute: 'strength', label: 'Brace against the turning spine' }
          ] },
        { id: 'closure', title: 'Take the closing interval', description: 'Abandon the machinery and snatch its exposed memory spindle.', difficulty: 78, pressure: 3, salvage: 8,
          environment: { medium: 'vacuum', temperatureC: 38, element: 'light' }, hazardIds: ['ring-closure'],
          reaction: { axis: 'energy', direction: 'high', label: 'An energetic lead commits to the full interval.' },
          methods: [
            { kind: 'capability', key: 'sprint', attribute: 'reflex', label: 'Run the closing ring' },
            { kind: 'capability', key: 'leap', attribute: 'agility', label: 'Leap through the inner assembly' },
            { kind: 'action', key: 'ambush', attribute: 'reflex', label: 'Cross in a single burst' }
          ] }
      ]
    }
  ]
};

export const ATTRIBUTE_LABELS = {
  strength: 'Strength', vitality: 'Vitality', endurance: 'Endurance', agility: 'Agility', reflex: 'Reflex',
  intelligence: 'Intelligence', willpower: 'Willpower', instinct: 'Instinct', charisma: 'Charisma', resilience: 'Resilience', manipulation: 'Manipulation'
};

export const CAPABILITY_LABELS = {
  flight: 'Flight', swim: 'Swim', burrow: 'Burrow', climb: 'Climb', sprint: 'Sprint', leap: 'Leap', manipulation: 'Manipulation'
};
