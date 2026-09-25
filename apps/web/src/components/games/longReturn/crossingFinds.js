export const SERVICE_LINE = 'gantry-service-line';

export function crossingFind(route, method, quality) {
  if (route.id !== 'gantry' || method.kind !== 'capability' || method.key !== 'climb') return null;
  return quality === 'rough' || quality === 'critical'
    ? { id: 'gantry-line-broken', title: 'The line gives way', detail: 'Along the frame, a loose service cable takes the crew’s weight and snaps. It steadies their first steps, but there is no intact length to carry onward.' }
    : { id: SERVICE_LINE, title: 'A cable from the frame', detail: 'Following the suspension frame brings the crew alongside a loose service cable. They unhook its intact length and carry it across, leaving the gantry’s load-bearing cables in place.' };
}

export function serviceLineResponse(scene, mode, baseSurprise) {
  if (!scene.serviceLineAvailable || scene.id !== 'turbine-hall' || mode !== 'group') return [];
  const coolant = scene.encounter?.archetype === 'coolant';
  return [{ id: coolant ? 'lash-sleeve' : 'lift-bearing',
    label: coolant ? 'Lash the sleeve with the recovered cable' : 'Lift the bearing with the recovered cable',
    summary: coolant ? 'Use the line from the gantry to hold the sleeve while Xylum secures its collar. Leave the cable in the repair.' : 'Loop the gantry cable around the bearing and take its weight off the trapped roots. Xylum can withdraw to shelter; this does not treat its injury.',
    scoutStrain: mode === 'scout' ? baseSurprise + 1 : 0,
    crewStrain: mode === 'group' ? baseSurprise + 1 : 0,
    instability: 0, companion: coolant, resolution: coolant ? 'befriended' : 'cleared',
    consumesFlag: SERVICE_LINE, worldFlag: coolant ? 'underdeck-sleeve-secured' : 'underdeck-bearing-lifted'
  }];
}
