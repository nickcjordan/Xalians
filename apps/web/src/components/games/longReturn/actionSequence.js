const beat = (kind, message, detail = {}) => ({ kind, message, ...detail });

export function buildActionSequence(action) {
  if (action.type === 'encounter') {
    return [
      beat('move', action.route ? `${action.lead.species} enters ${action.route.title.toLowerCase()}.` : `${action.lead.species} scouts ahead alone.`, { actorId: action.lead.id }),
      beat('encounter', `${action.encounter.species} emerges from the annex.`, { creatureId: action.encounter.id }),
      beat('decision', 'The next move belongs to the crew.')
    ];
  }

  const events = [beat('move', `${action.lead.species} uses ${action.method.label.toLowerCase()}.`, { actorId: action.lead.id })];
  if (action.result.supportHelp) events.push(beat('support', action.result.supportHelp, { actorId: action.support.id }));
  action.result.unseenHazards.forEach((hazard) => events.push(beat('hazard', `${hazard.label} strikes during the crossing.`, { hazardId: hazard.id })));
  if (action.result.companionHelp) events.push(beat('companion', action.result.companionHelp, { actorId: action.companion && action.companion.id }));
  action.result.crewChanges.filter((change) => change.added > 0).forEach((change) => events.push(beat('energy', `${change.creature.species} spends ${change.added} energy.`, {
    creatureId: change.creature.id, before: MAX_STRAIN - change.before, after: MAX_STRAIN - change.after, amount: change.added
  })));
  if (action.result.instabilityChange.added > 0) events.push(beat('stability', `The annex loses ${action.result.instabilityChange.added} stability.`, {
    before: MAX_INSTABILITY - action.result.instabilityChange.before, after: MAX_INSTABILITY - action.result.instabilityChange.after, amount: action.result.instabilityChange.added
  }));
  if (action.result.salvage > 0) events.push(beat('salvage', `${action.result.salvage} salvage recovered.`, {
    before: action.result.salvageAfter - action.result.salvage, after: action.result.salvageAfter, amount: action.result.salvage
  }));
  events.push(beat('complete', action.result.impactLabel));
  return events;
}

export function eventIndexFor(events, kind, id) {
  return events.findIndex((event) => event.kind === kind && (!id || event.creatureId === id));
}
import { MAX_INSTABILITY, MAX_STRAIN } from './longReturnData';
