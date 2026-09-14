export function bankedSalvage(status, objectiveReached, salvage) {
  if (status === 'aborted') return 0;
  if (status === 'failed') return objectiveReached ? Math.ceil(salvage / 2) : 0;
  return salvage;
}
