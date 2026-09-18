// Presentation only. Positions describe mission phases, not simulated movement.
export function nativeMapState(resolution) {
  if (!resolution || ['unresolved', 'detour'].includes(resolution.resolution)) return 'contact';
  return resolution.id === 'pin-rig' ? 'bypassed' : null;
}

const location = (crew, scout = null, signal = false, encounter = false) => ({ crew, scout, signal, encounter });

export function expeditionPosition({ phase, scout, scan, encounterMode, resolution, beat, actionType }) {
  if (actionType === 'scout-return') return location('entry', beat === 'complete' ? 'entry' : 'survey');
  if (actionType === 'scout') return location('entry', 'survey', beat === 'signal' || !!(beat === 'encounter' && scan?.relay), beat === 'encounter');
  if (actionType === 'crossing') return location(beat === 'complete' ? 'exit' : 'crossing');
  if (actionType === 'encounter') return location('approach', null, false, beat !== 'move');
  if (actionType === 'encounter-response' || phase === 'encounter') {
    const retreat = resolution === 'detour';
    const contact = !resolution || resolution === 'unresolved';
    return encounterMode === 'scout'
      ? location('entry', retreat ? 'entry' : 'survey', false, contact)
      : location(retreat ? 'entry' : 'crossing', null, false, contact);
  }
  if (phase === 'result') return location('exit');
  if (encounterMode === 'group' && resolution && resolution !== 'detour') return location('crossing', null, false, resolution === 'unresolved');
  const ahead = scout && scan?.mode === 'scan';
  return location('entry', ahead ? 'survey' : null, !!(ahead && scan?.relay), !!(encounterMode && (!resolution || resolution === 'unresolved')));
}

export const MAP_ROUTES = {
  gantry: 'Suspended bridge', intake: 'Flooded passage', catwalk: 'Above the machinery', underdeck: 'Below the machinery',
  decode: 'Unlock the door', breach: 'Force the seam', 'outer-hull': 'Outside the hull', conduit: 'Sheltered tunnel',
  stabilize: 'Preserve the archive', blackbox: 'Take the container', harvest: 'Reservoir rim', dive: 'Below the surface',
  align: 'Align the rings', closure: 'Time the opening'
};
