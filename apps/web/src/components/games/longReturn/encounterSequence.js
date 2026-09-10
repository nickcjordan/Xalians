export function buildEncounterResolutionSequence(action) {
  const option = action.option;
  const actor = action.actor ? action.actor.species : 'The crew';
  const affected = action.affected ? action.affected.species : actor;
  const energy = option.scoutStrain || option.crewStrain || 0;
  const stability = option.instability || 0;
  const responseMessage = option.companion
    ? `${actor} moves to aid ${action.native.species}.`
    : option.resolution === 'unresolved'
      ? `${actor} breaks contact and prepares a warning.`
      : option.resolution === 'detour'
        ? `${actor} signals the crew to withdraw.`
        : `${actor} acts to open the passage.`;
  const events = [
    { kind: 'response', message: responseMessage, actorId: action.actor && action.actor.id }
  ];
  if (energy) events.push({ kind: 'energy', message: `${affected} spends ${energy} energy.`, actorId: action.affected && action.affected.id, amount: energy });
  if (stability) events.push({ kind: 'stability', message: `The response consumes ${stability} annex stability.`, amount: stability });
  if (!energy && !stability) events.push({ kind: 'preserve', message: 'The crew preserves its energy and annex stability.' });
  events.push({
    kind: option.companion ? 'companion' : option.resolution === 'unresolved' ? 'warning' : option.resolution === 'detour' ? 'detour' : 'clear',
    message: option.companion
      ? `${action.native.species} chooses to follow the expedition.`
      : option.resolution === 'unresolved'
        ? `${action.native.species} remains in the route.`
        : option.resolution === 'detour'
          ? 'The crew withdraws to choose another route.'
          : `${action.native.species} yields the passage.`
  });
  return events;
}

export function encounterEventIndex(events, kind) {
  return events.findIndex((event) => event.kind === kind);
}
