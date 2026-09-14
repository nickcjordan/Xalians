// A receipt of actual rule contributions, never a prediction or hidden-route leak.
export function crossingCosts(route, result, companionHelp) {
  const effort = result.margin >= 14 ? 0 : result.margin >= 0 ? 1 : result.margin >= -14 ? 2 : 3;
  const energy = [];
  const stability = [];
  const add = (list, label, amount) => { if (amount) list.push({ label, amount }); };
  add(energy, 'Crossing effort', effort);
  add(energy, 'Environmental exposure', result.environment.strain);
  for (const hazard of result.unseenHazards) {
    add(energy, hazard.label, hazard.strain);
    add(stability, hazard.label, hazard.pressure);
  }
  const gross = energy.reduce((sum, entry) => sum + entry.amount, 0);
  add(energy, 'Instinct suited the route', result.naturalReaction && gross > 0 ? -1 : 0);
  add(energy, 'Companion helped', companionHelp ? -1 : 0);
  add(stability, 'Route disturbance', route.pressure);
  add(stability, 'Off-plan reaction', result.reactionControlled ? 0 : 1);
  return { energy, support: result.supportStrain ? [{ label: 'Support intervention', amount: result.supportStrain }] : [], stability };
}
