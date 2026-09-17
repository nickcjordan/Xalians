export function buildEncounterResolutionSequence(action) {
  const option = action.option;
  const actor = action.actor?.species || 'The crew';
  const affected = action.affected?.species || actor;
  const paragraphs = action.result?.narrative?.split('\n\n').filter(Boolean);
  const energy = Math.max(0, action.energyBefore - action.energyAfter);
  const stability = Math.max(0, action.stabilityBefore - action.stabilityAfter);
  const costs = [];
  if (energy > 0) costs.push({ kind: 'energy', creatureId: action.affected?.id, amount: energy, text: `${affected}: −${energy} energy` });
  if (stability > 0) costs.push({ kind: 'stability', amount: stability, text: `Annex: −${stability} stability` });
  const outcome = option.companion ? 'companion' : option.resolution === 'unresolved' ? 'warning' : option.resolution === 'detour' ? 'detour' : 'clear';
  const titles = { companion: 'An unexpected companion', warning: 'The route is still occupied', detour: 'Back at the junction', clear: 'Room to pass' };
  const aftermath = option.companion ? `${action.native.species} chooses to follow the expedition.`
    : option.resolution === 'unresolved' ? `${action.native.species} remains in the route.`
      : option.resolution === 'detour' ? 'The crew withdraws to choose another route.'
        : `${action.native.species} no longer blocks the passage.`;
  return [
    { kind: 'response', title: option.label, icon: 'bi-people', message: paragraphs?.[0] || `${actor} approaches ${action.native.species}.`, actorId: action.actor?.id, costs },
    { kind: outcome, title: titles[outcome], icon: option.companion ? 'bi-person-check-fill' : 'bi-signpost-2-fill', message: paragraphs?.slice(1).join('\n\n') || aftermath }
  ];
}

export function encounterEventIndex(events, kind) {
  return events.findIndex(event => event.kind === kind || event.costs?.some(cost => cost.kind === kind));
}
