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
  'quiet-entry': { icon: 'bi-moon-stars', label: 'Machinery dormant', className: 'is-quiet-entry' },
  'coolant-bypass': { icon: 'bi-water', label: 'Underdeck drained', className: 'is-coolant-bypass' },
  'security-pulse': { icon: 'bi-broadcast', label: 'Security awake', className: 'is-security-pulse' },
  'maintenance-codes': { icon: 'bi-key', label: 'Protocol recovered', className: 'is-maintenance-codes' }
};

export function visibleWorldFlags(scene, runFlags = []) {
  const relevant = new Set();
  scene?.routes?.forEach((route) => {
    if (route.consequence) relevant.add(route.consequence.id);
    route.activeEffects?.forEach((effect) => relevant.add(effect.flag));
  });
  return runFlags.filter((id) => relevant.has(id)).map((id) => ({ id, ...WORLD_FLAGS[id] })).filter((entry) => entry.label);
}
