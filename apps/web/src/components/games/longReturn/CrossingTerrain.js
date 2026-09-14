import React from 'react';
// Foreground props establish contact with the environment plate. These reveal
// only the selected route's visible terrain, never its unrevealed hazards.
export const TERRAIN = {
  gantry: 'span', intake: 'water', catwalk: 'rotor', underdeck: 'tunnel',
  decode: 'console', breach: 'door', 'outer-hull': 'span', conduit: 'tunnel',
  stabilize: 'console', blackbox: 'cradle', harvest: 'console', dive: 'water',
  align: 'rotor', closure: 'rotor'
};
export default function CrossingTerrain({ route, resolved }) {
  const kind = TERRAIN[route?.id];
  if (!kind) return null;
  return <svg className={`lr-crossing-terrain is-${kind}${resolved ? ' is-traversed' : ''}`} viewBox="0 0 800 300" preserveAspectRatio="none" aria-hidden="true">
    {kind === 'span' && <g><path d="M0 245 H260 M440 245 H800 M80 80 Q350 270 700 80 M80 80 V250 M700 80 V250 M200 146 V245 M520 160 V245" /><path d="M260 245 l35 -8 m105 5 40 3" /></g>}
    {kind === 'water' && <g className="lr-terrain-water"><path d="M0 235 Q50 220 100 235 T200 235 T300 235 T400 235 T500 235 T600 235 T700 235 T800 235 M0 267 Q50 252 100 267 T200 267 T300 267 T400 267 T500 267 T600 267 T700 267 T800 267" /><path d="M60 300 V170 H150 V300 M650 300 V170 H740 V300" /></g>}
    {kind === 'rotor' && <g><path d="M0 252 H800" /><g className="lr-terrain-rotor"><circle cx="470" cy="145" r="100" /><circle cx="470" cy="145" r="25" /><path d="M470 45 V120 M470 170 V245 M370 145 H445 M495 145 H570" /></g></g>}
    {kind === 'tunnel' && <g><path d="M0 255 H800 M0 110 H800 M170 110 V255 M340 110 V255 M510 110 V255 M680 110 V255" /><path d="M0 270 H800 M0 94 H800" /></g>}
    {kind === 'console' && <g><path d="M410 250 V100 H600 V250 M400 250 H620 M430 175 H580 M450 195 V225 M480 195 V225 M510 195 V225" /><rect className="lr-terrain-screen" x="430" y="118" width="150" height="45" /></g>}
    {kind === 'door' && <g className="lr-terrain-door"><path d="M350 270 V35 H630 V270 M485 35 V270 M350 85 H630 M350 225 H630" /><path d="M470 105 l22 26 -16 21 20 28 -26 24" /></g>}
    {kind === 'cradle' && <g><path d="M400 250 l30 -90 H560 l30 90 M430 160 V110 H560 V160" /><rect className="lr-terrain-screen" x="454" y="124" width="80" height="48" /></g>}
  </svg>;
}
