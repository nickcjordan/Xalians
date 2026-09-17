// Historical reserve movement, separate from the effort demanded by the rules.
export function crossingReceipt(result) {
  if (!result) return null;
  const crew = result.crewChanges.map(change => ({ ...change, added: Math.max(0, change.after - change.before) }));
  const stability = { ...result.instabilityChange, added: Math.max(0, result.instabilityChange.after - result.instabilityChange.before) };
  return { crew, stability, energy: crew.reduce((sum, change) => sum + change.added, 0) };
}
