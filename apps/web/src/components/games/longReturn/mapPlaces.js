// Named thresholds join neighboring scenes without inventing a scaled floor plan.
export const MAP_PLACES = {
  'service-throat': { entry: ['Outer', 'seal'], exit: ['Turbine', 'hall'], landmark: 'flood', description: 'Water fills the gap beneath the suspended bridge.' },
  'turbine-hall': { entry: ['Turbine', 'hall'], exit: ['Archive', 'door'], landmark: 'machinery', description: 'The routes pass above or below a bank of turbines.' },
  'archive-vestibule': { entry: ['Archive', 'door'], exit: ['Null', 'gallery'], landmark: 'door', description: 'A sealed door separates the crew from the gallery.' },
  'null-gallery': { entry: ['Null', 'gallery'], exit: ['Index', 'chamber'], landmark: 'hull', description: 'The damaged hull separates an exposed crossing from a sheltered tunnel.' },
  'nemesis-index': { entry: ['Index', 'chamber'], exit: ['Extraction', 'fork'], landmark: 'archive', description: 'Archive plates surround the container holding the Index.' },
  'core-reservoir': { entry: ['Extraction', 'fork'], exit: ['Spine', 'approach'], landmark: 'reservoir', description: 'The crew can work from the reservoir rim or descend below its surface.' },
  'generator-spine': { entry: ['Spine', 'approach'], exit: ['Surface', 'lift'], landmark: 'rings', description: 'Concentric machinery stands between the crew and the extraction lift.' }
};

// These choices act on the same obstacle, not on two corridors around it.
// Outlines identify the intervention; they do not simulate its performance.
export const SHARED_PASSAGES = {
  'archive-vestibule': { location: 'Crew at the door', targets: {
    decode: 'M276 64 H364 V132 H276 Z',
    breach: 'M315 70 V126 M325 70 V126'
  } },
  'nemesis-index': { location: 'Crew in the archive', targets: {
    stabilize: 'M260 72 H381 V126 H260 Z',
    blackbox: 'M294 72 H348 V126 H294 Z'
  } },
  'generator-spine': { location: 'Crew at the rings', targets: {
    align: 'M260 98 a60 32 0 1 0 120 0 a60 32 0 1 0 -120 0',
    closure: 'M282 88 H358 M282 108 H358'
  } }
};
