export function bankedSalvage(status, objectiveReached, salvage) {
  if (status === 'aborted') return 0;
  if (status === 'failed') return objectiveReached ? Math.ceil(salvage / 2) : 0;
  return salvage;
}

export function companionFarewell(companion) {
  if (!companion) return '';
  return `Clear of the annex, ${companion.creature.species} pauses beside the crew one last time.${companion.ready ? '' : ' The crossing it helped them through is behind them now.'} Then it takes a path of its own; the crew leaves with a memory of an ally, not another creature aboard.`;
}
