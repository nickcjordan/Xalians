export const ROUTE_VISUALS = {
  gantry: { icon: 'bi-bezier2', lane: 'upper', verb: 'Across the suspended frame' },
  intake: { icon: 'bi-water', lane: 'lower', verb: 'Through the flooded intake' },
  catwalk: { icon: 'bi-speedometer2', lane: 'upper', verb: 'Over the turbine bank' },
  underdeck: { icon: 'bi-ladder', lane: 'lower', verb: 'Below the machinery' },
  decode: { icon: 'bi-key', lane: 'center', verb: 'Through the sealed iris' },
  breach: { icon: 'bi-hammer', lane: 'edge', verb: 'Along the fractured seam' },
  'outer-hull': { icon: 'bi-stars', lane: 'upper', verb: 'Across the exposed hull' },
  conduit: { icon: 'bi-diagram-3', lane: 'lower', verb: 'Inside the shielded conduit' },
  stabilize: { icon: 'bi-shield-check', lane: 'center', verb: 'Secure the archive chamber' },
  blackbox: { icon: 'bi-box-arrow-down', lane: 'edge', verb: 'Extract the index core' },
  harvest: { icon: 'bi-lightning-charge', lane: 'upper', verb: 'Skim the charged rim' },
  dive: { icon: 'bi-water', lane: 'lower', verb: 'Descend beneath the surface' },
  align: { icon: 'bi-bullseye', lane: 'center', verb: 'Enter the moving rings' },
  closure: { icon: 'bi-hourglass-split', lane: 'edge', verb: 'Cross during the closing interval' }
};

export const routeVisualFor = (route) => ROUTE_VISUALS[route?.id] || { icon: 'bi-arrow-right', lane: 'center', verb: route?.title || 'Cross the route' };

export const WORLD_FLAGS = {
  'quiet-entry': { icon: 'bi-moon-stars', label: 'Machinery dormant', className: 'is-quiet-entry', preview: 'Easier upper walkway', mapLabel: 'Quiet upper walkway' },
  'coolant-bypass': { icon: 'bi-water', label: 'Underdeck drained', className: 'is-coolant-bypass', preview: 'Easier lower passage', mapLabel: 'Drained lower passage' },
  'security-pulse': { icon: 'bi-broadcast', label: 'Security awake', className: 'is-security-pulse', preview: 'Door harder to force', mapLabel: 'Tightened door seam' },
  'maintenance-codes': { icon: 'bi-key', label: 'Protocol recovered', className: 'is-maintenance-codes', preview: 'Door easier to unlock', mapLabel: 'Controls with a code' }
};

export const consequencePreview = route => WORLD_FLAGS[route.consequence?.id]?.preview || route.consequence?.future || route.consequence?.label || 'No lasting change';

// Only an earned effect already applied to this route can change its diagram.
export function routeMemory(route, runFlags = []) {
  const effect = route.activeEffects?.find(effect => runFlags.includes(effect.flag) && WORLD_FLAGS[effect.flag]?.mapLabel);
  return effect ? { ...WORLD_FLAGS[effect.flag], ...effect } : null;
}

export function visibleWorldFlags(scene, runFlags = []) {
  const relevant = new Set();
  scene?.routes?.forEach((route) => {
    if (route.consequence) relevant.add(route.consequence.id);
    route.activeEffects?.forEach((effect) => relevant.add(effect.flag));
  });
  return runFlags.filter((id) => relevant.has(id)).map((id) => ({ id, ...WORLD_FLAGS[id] })).filter((entry) => entry.label);
}
