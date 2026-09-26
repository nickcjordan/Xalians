import React from 'react';

export function situationLabel(scene, flags = []) {
  if (scene.id === 'turbine-hall' && flags.includes('underdeck-bearing-lifted')) return 'The recovered cable holds the bearing clear';
  if (scene.id === 'turbine-hall' && scene.encounter?.archetype === 'coolant') return flags.includes('underdeck-flow-isolated') ? 'Coolant line isolated' : flags.includes('underdeck-sleeve-secured') ? 'Coolant sleeve secured' : 'Coolant sprays across the lower passage';
  if (scene.id === 'null-gallery' && scene.encounter?.archetype === 'beacon') return flags.includes('gallery-beacon-stopped') ? 'The inspection beacon is dark' : flags.includes('gallery-beacon-redirected') ? 'The beacon now points toward the open hull' : 'The beacon sweeps the tunnel entrance';
  return null;
}

// Environmental state only. This diagram never reveals an undiscovered native.
export default function SituationLandmark({ scene, flags = [] }) {
  if (scene.id === 'service-throat') {
    if (flags.includes('gantry-service-line')) return null;
    const broken = flags.includes('gantry-line-broken');
    return <g data-map-service-line={broken ? 'broken' : 'loose'} role="img" aria-label={broken ? 'Broken service cable along the frame' : 'Loose service cable along the frame'}>
      <path d={broken ? 'M345 48 V60 L352 66 M371 72 L379 77' : 'M345 48 V61 C345 85 380 85 380 65 C380 52 356 52 356 65 C356 76 369 76 369 65'} fill="none" stroke="var(--color-caution)" strokeWidth="3" />
    </g>;
  }
  if (scene.id === 'turbine-hall' && flags.includes('underdeck-bearing-lifted')) return <g data-map-bearing="lifted" role="img" aria-label="Cable holding the bearing above the lower passage">
    <path d="M285 112 H350 M302 112 L313 127 M334 112 L327 127" fill="none" stroke="var(--color-viable)" strokeWidth="3" />
    <circle cx="320" cy="131" r="10" fill="var(--color-s0)" stroke="var(--color-ink-2)" strokeWidth="3" />
    <circle cx="320" cy="131" r="4" fill="none" stroke="var(--color-ink-2)" strokeWidth="2" />
  </g>;
  if (scene.id === 'turbine-hall' && scene.encounter?.archetype === 'coolant') {
    const isolated = flags.includes('underdeck-flow-isolated');
    const secured = flags.includes('underdeck-sleeve-secured');
    const label = isolated ? 'Pressure isolated' : secured ? 'Sleeve secured' : 'Coolant jet';
    return <g data-map-coolant={isolated ? 'isolated' : secured ? 'secured' : 'leaking'} role="img" aria-label={label}>
      <path d="M265 128 H310 M330 128 H380" stroke="var(--color-ink-2)" strokeWidth="4" />
      <rect x="310" y="122" width="20" height="12" fill="var(--color-s0)" stroke={secured ? 'var(--color-viable)' : 'var(--color-ink-2)'} strokeWidth="2" />
      {!isolated && !secured && <path d="M317 134 L307 148 M321 134 V151 M325 134 L335 148" stroke="var(--color-caution)" strokeWidth="2" />}
      {isolated && <path d="M277 119 L289 137 M289 119 L277 137" stroke="var(--color-caution)" strokeWidth="2" />}
    </g>;
  }
  if (scene.id !== 'null-gallery' || scene.encounter?.archetype !== 'beacon') return null;
  const stopped = flags.includes('gallery-beacon-stopped');
  const redirected = flags.includes('gallery-beacon-redirected');
  const label = stopped ? 'Beacon stopped' : redirected ? 'Light turned outward' : 'Repeating beacon';
  return <g data-map-beacon={stopped ? 'stopped' : redirected ? 'redirected' : 'sweeping'} role="img" aria-label={label}>
    {!stopped && <path d={redirected ? 'M280 115 L330 65 L358 82 Z' : 'M280 115 L360 127 L352 143 Z'} fill="var(--color-caution)" fillOpacity="0.2" stroke="var(--color-caution)" strokeWidth="1" />}
    <circle cx="280" cy="115" r="7" fill="var(--color-s0)" stroke={stopped ? 'var(--color-ink-3)' : 'var(--color-caution)'} strokeWidth="2" />
    {stopped && <path d="M275 110 L285 120" stroke="var(--color-ink-3)" strokeWidth="2" />}
  </g>;
}
