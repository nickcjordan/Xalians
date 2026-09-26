export const WORLD_FLAGS = {
  'underdeck-flow-isolated': { icon: 'bi-tools', label: 'Pressure line isolated', mapLabel: 'Service release accessible' },
  'reservoir-cell-recovered': { icon: 'bi-battery-charging', label: 'Service cell carried', mapLabel: 'Service controls available' },
  'reservoir-timing-diagram': { icon: 'bi-clock', label: 'Ring timing known', mapLabel: 'Early inner closure known' },
  'archive-controls-preserved': { icon: 'bi-toggles', label: 'Control link intact', className: 'is-controls-preserved', preview: 'Reservoir console available', mapLabel: 'Working control console' },
  'archive-controls-lost': { icon: 'bi-plug', label: 'Control link severed', className: 'is-controls-lost', preview: 'Reservoir console lost', mapLabel: 'Severed control link' },
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
