import { MAX_INSTABILITY, MAX_STRAIN } from './longReturnData';

const beat = (kind, title, icon, message, detail = {}) => ({ kind, title, icon, message, ...detail });

// Headings orient the field record without asking the player to translate a
// generic "crossing" into door work, salvage recovery, or an actual passage.
const ROUTE_BEATS = {
  gantry: ['At the hanging gantry', 'Across the broken frame', 'The far landing'],
  intake: ['At the flooded intake', 'Beneath the wreckage', 'The far steps'],
  catwalk: ['Above the turbines', 'Across the catwalk', 'At the archive door'],
  underdeck: ['Beneath the machines', 'Through the repair passage', 'At the archive door'],
  decode: ['Before the sealed door', 'Working the old controls', 'Inside the gallery'],
  breach: ['Before the sealed door', 'Opening the fracture', 'Inside the gallery'],
  'outer-hull': ['At the broken gallery', 'Across the exposed hull', 'At the archive-side seal'],
  conduit: ['At the broken gallery', 'Through the narrow conduit', 'At the archive'],
  stabilize: ['At the archive chamber', 'Steadying the Index', 'The Index is secured'],
  blackbox: ['At the archive chamber', 'Freeing the blackbox', 'The Index is secured'],
  harvest: ['At the charged reservoir', 'Working the collector valves', 'Charge secured'],
  dive: ['At the charged reservoir', 'Reaching the submerged cell', 'The cell is recovered'],
  align: ['At the turning rings', 'Aligning the core', 'At the extraction lift'],
  closure: ['At the turning rings', 'Reaching for the spindle', 'At the extraction lift']
};

export function buildActionSequence(action) {
  if (action.type === 'encounter') {
    return [
      beat('move', action.route ? 'The crew approaches' : 'The scout goes ahead', 'bi-signpost-2-fill', action.route ? `${action.lead.species} follows the chosen passage, with the rest of the crew close behind.` : `${action.lead.species} scouts ahead alone.`, { actorId: action.lead.id }),
      beat('encounter', 'Contact ahead', 'bi-eye', action.scene?.encounter?.crewContact || `${action.encounter.species} is ahead of the crew. They stop before moving closer.`, { creatureId: action.encounter.id }),
      beat('decision', 'Choose a response', 'bi-signpost-2-fill', action.route ? 'Choose how the crew responds before continuing along this route.' : 'Choose what the lone scout does before reporting back to the crew.')
    ];
  }

  const { result, lead, support, method } = action;
  const titles = ROUTE_BEATS[action.route?.id];
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
    beat(action.continuingFromEncounter ? 'resume' : 'move', action.continuingFromEncounter ? 'Picking up where we stopped' : titles?.[0] || 'At the obstacle', 'bi-signpost-2-fill', action.continuingFromEncounter ? `The encounter is behind them. ${lead.species} resumes the work with ${support.species}, while the crew stays together.` : paragraphs?.[0] || movement, { actorId: lead.id }),
    beat(result.unseenHazards.length ? 'hazard' : 'method', titles?.[1] || 'Making a way through', 'bi-people', paragraphs?.[1] || [movement, ...result.unseenHazards.map(hazard => `${hazard.label} interrupts the crossing.`)].join(' '), { actorId: lead.id, costs: tools }),
    beat('effort', costs.length ? 'The cost of the effort' : 'The effort holds', 'bi-lightning-charge', paragraphs?.[2] || [result.supportHelp || (result.supportStrain > 0 ? `${support.species} takes over part of the work to keep the crew moving.` : `${lead.species} brings the others through.`), result.companionHelp].filter(Boolean).join(' '), { costs, supportId: support?.id, companionId: action.companion?.id }),
    beat('complete', titles?.[2] || 'The crew regroups', 'bi-check-circle', paragraphs?.[3] || result.story || result.impactLabel, { costs: haul })
  ];
}

export function eventIndexFor(events, kind, id) {
  return events.findIndex(event => (event.kind === kind && (!id || event.creatureId === id))
    || event.costs?.some(cost => cost.kind === kind && (!id || cost.creatureId === id)));
}
