// Tier: immersive. Stationary diagram geometry identifies terrain, not creature action.
import React from 'react';

const outlines = {
  flood: 'M260 82 q12 -8 24 0 t24 0 t24 0 t24 0 t24 0 M260 98 q12 -8 24 0 t24 0 t24 0 t24 0 t24 0 M260 114 q12 -8 24 0 t24 0 t24 0 t24 0 t24 0',
  machinery: 'M257 98 a19 19 0 1 0 38 0 a19 19 0 1 0 -38 0 M276 79 V117 M257 98 H295 M303 98 a19 19 0 1 0 38 0 a19 19 0 1 0 -38 0 M322 79 V117 M303 98 H341 M349 98 a19 19 0 1 0 38 0 a19 19 0 1 0 -38 0 M368 79 V117 M349 98 H387',
  door: 'M282 70 H358 V126 H282 Z M320 70 V126 M302 92 v12 M338 92 v12 M273 70 V126 M367 70 V126',
  hull: 'M260 82 H300 l12 12 12 -24 12 12 H380 M260 114 H380 M260 122 H380 M290 65 l8 -4 M344 57 l6 6',
  archive: 'M300 78 H342 V120 H300 Z M312 87 H330 M312 96 H330 M312 105 H324 M266 79 H283 V119 H266 Z M358 79 H375 V119 H358 Z M271 90 H278 M363 90 H370',
  reservoir: 'M260 75 V120 H380 V75 M266 86 q12 -8 24 0 t24 0 t24 0 t24 0 t12 0 M312 102 H330 V114 H312 Z',
  rings: 'M264 98 a56 28 0 1 0 112 0 a56 28 0 1 0 -112 0 M284 98 a36 18 0 1 0 72 0 a36 18 0 1 0 -72 0 M304 98 a16 8 0 1 0 32 0 a16 8 0 1 0 -32 0 M254 98 H386'
};

export default function MapLandmark({ kind }) {
  return <path data-map-landmark={kind} aria-hidden="true" d={outlines[kind]} fill="none" stroke="var(--color-ink-3)" strokeWidth="2" />;
}
