// Presentation only. Positions describe mission phases, not simulated movement.
export function expeditionPosition({ phase, scout, scan, encounterMode, resolution, beat, actionType }) {
  if (actionType === 'scout-return') return { crew: 'entry', scout: beat === 'complete' ? 'entry' : 'survey', signal: false };
  if (actionType === 'scout') return { crew: 'entry', scout: 'survey', signal: beat === 'signal' || (beat === 'encounter' && scan?.relay) };
  if (actionType === 'crossing') return { crew: beat === 'complete' ? 'exit' : 'crossing', scout: null, signal: false };
  if (actionType === 'encounter' || actionType === 'encounter-response' || phase === 'encounter') {
    const retreat = resolution === 'detour';
    return encounterMode === 'scout'
      ? { crew: 'entry', scout: retreat ? 'entry' : 'survey', signal: false }
      : { crew: retreat ? 'entry' : 'crossing', scout: null, signal: false };
  }
  if (phase === 'result') return { crew: 'exit', scout: null, signal: false };
  const ahead = scout && scan?.mode === 'scan';
  return { crew: 'entry', scout: ahead ? 'survey' : null, signal: !!(ahead && scan?.relay) };
}

export const MAP_ROUTES = {
  gantry: 'Suspended bridge', intake: 'Flooded passage', catwalk: 'Above the machinery', underdeck: 'Below the machinery',
  decode: 'Sealed doorway', breach: 'Crack in the door', 'outer-hull': 'Outside the hull', conduit: 'Sheltered tunnel',
  stabilize: 'Archive chamber', blackbox: 'Index container', harvest: 'Reservoir rim', dive: 'Below the surface',
  align: 'Between the rings', closure: 'Closing passage'
};
