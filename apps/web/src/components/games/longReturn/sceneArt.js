const ROOT = '/assets/img/games/long-return';

export const BRIEFING_ART = `${ROOT}/briefing-console.webp`;

export const SCENE_ART = {
  'service-throat': { src: `${ROOT}/flooded-service-throat.webp`, tone: 'flood', accent: '#69d7ef' },
  'turbine-hall': { src: `${ROOT}/blind-turbine-hall.webp`, tone: 'machine', accent: '#dd713b' },
  'archive-vestibule': { src: `${ROOT}/archive-vestibule.webp`, tone: 'security', accent: '#b494d7' },
  'null-gallery': { src: `${ROOT}/null-gallery.webp`, tone: 'void', accent: '#a4d5ff' },
  'nemesis-index': { src: `${ROOT}/nemesis-index.webp`, tone: 'objective', accent: '#c7d87d' },
  'core-reservoir': { src: `${ROOT}/core-reservoir.webp`, tone: 'charge', accent: '#55d9ff' },
  'generator-spine': { src: `${ROOT}/generator-spine.webp`, tone: 'spine', accent: '#e8bd5b' }
};

export const sceneArtFor = (scene) => SCENE_ART[scene && scene.id] || SCENE_ART['service-throat'];
