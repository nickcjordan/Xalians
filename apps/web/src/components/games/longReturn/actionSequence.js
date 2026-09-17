import { MAX_INSTABILITY, MAX_STRAIN } from './longReturnData';

const beat = (kind, title, icon, message, detail = {}) => ({ kind, title, icon, message, ...detail });

export function buildActionSequence(action) {
  if (action.type === 'encounter') {
    return [
      beat('move', 'The crew approaches', 'bi-signpost-2-fill', action.route ? `${action.lead.species} follows the chosen passage, with the rest of the crew close behind.` : `${action.lead.species} scouts ahead alone.`, { actorId: action.lead.id }),
      beat('encounter', 'Something is in the way', 'bi-eye', `${action.encounter.species} emerges ahead. The crew stops before moving closer.`, { creatureId: action.encounter.id }),
      beat('decision', 'A way through, not a crossing yet', 'bi-signpost-2-fill', 'Choose how to approach the native before continuing along this route.')
    ];
  }

  const { result, lead, support, method } = action;
  const paragraphs = result.paragraphs;
  const movement = method.ability
    ? `${lead.species} uses ${method.ability.name} through its ${method.ability.instrument.replaceAll('-', ' ')}.`
    : `${lead.species} uses ${method.label.toLowerCase()}, with ${support?.species || 'the crew'} backing the effort.`;
  const costs = result.crewChanges.flatMap(change => {
    const amount = change.after - change.before;
    return amount > 0 ? [{ kind: 'energy', creatureId: change.creature.id, amount,
      before: MAX_STRAIN - change.before, after: MAX_STRAIN - change.after,
      text: `${change.creature.species}: −${amount} energy` }] : [];
  });
  const stability = result.instabilityChange.after - result.instabilityChange.before;
  if (stability > 0) costs.push({ kind: 'stability', amount: stability,
    before: MAX_INSTABILITY - result.instabilityChange.before, after: MAX_INSTABILITY - result.instabilityChange.after,
    text: `Annex: −${stability} stability` });
  const tools = result.abilityId ? [{ kind: 'ability', abilityId: result.abilityId,
    text: `${method.ability?.name || 'One-use ability'} used; unavailable for the rest of this expedition` }] : [];
  const haul = result.salvage > 0 ? [{ kind: 'salvage', amount: result.salvage,
    before: result.salvageAfter - result.salvage, after: result.salvageAfter,
    text: `+${result.salvage} salvage carried` }] : [];

  // The resolved story owns the account. Resource ticks annotate its causes;
  // they are not extra events the player must mentally fit back into it.
  return [
    beat('move', 'Into the passage', 'bi-signpost-2-fill', paragraphs?.[0] || movement, { actorId: lead.id }),
    beat(result.unseenHazards.length ? 'hazard' : 'method', 'Making a way through', 'bi-people', paragraphs?.[1] || [movement, ...result.unseenHazards.map(hazard => `${hazard.label} interrupts the crossing.`)].join(' '), { actorId: lead.id, costs: tools }),
    beat('effort', costs.length ? 'The cost of getting through' : 'Keeping the crew moving', 'bi-lightning-charge', paragraphs?.[2] || [result.supportHelp || (result.supportStrain > 0 ? `${support.species} takes over part of the work to keep the crew moving.` : `${lead.species} brings the others through.`), result.companionHelp].filter(Boolean).join(' '), { costs, supportId: support?.id, companionId: action.companion?.id }),
    beat('complete', 'The crew regroups', 'bi-check-circle', paragraphs?.[3] || result.story || result.impactLabel, { costs: haul })
  ];
}

export function eventIndexFor(events, kind, id) {
  return events.findIndex(event => (event.kind === kind && (!id || event.creatureId === id))
    || event.costs?.some(cost => cost.kind === kind && (!id || cost.creatureId === id)));
}
