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
