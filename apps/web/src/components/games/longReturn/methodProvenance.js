// Game interpretation only: never invent anatomy or mutate creature records.
const names = { swim: 'Swimming', flight: 'Flight', climb: 'Climbing', burrow: 'Burrowing', leap: 'Leaping', sprint: 'Speed', intelligence: 'Problem solving', manipulation: 'Fine control', phasing: 'Phasing', resistant: 'Resistance', anchored: 'Anchoring' };
export function methodIdentity(method) {
  if (!method) return { source: 'Choose a method', action: '', limited: false };
  const action = method.ability ? method.label.split(' — ').slice(1).join(' — ') || method.label : method.label;
  if (method.ability) return { source: `${method.ability.instrument.replaceAll('-', ' ')} · ${method.ability.medium}`, action, limited: true };
  const strength = method.kind === 'capability' || method.kind === 'attribute'
    ? method.sourceValue >= 80 ? 'Natural strength' : method.sourceValue >= 50 ? 'Practiced' : 'Stretching its limits' : method.kind === 'trait' ? 'Innate trait' : 'Improvised approach';
  return { source: names[method.key] || 'Careful movement', action, strength, limited: false };
}
