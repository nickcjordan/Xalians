import { MAX_STRAIN, MAX_INSTABILITY } from './longReturnData';

// Field work happens once between crossings. It cannot undo forced extraction.
export function fieldOptions({ crew, strain, pressure, salvage, commands = 2, used = false }) {
  if (used || pressure >= MAX_INSTABILITY || crew.filter(c => (strain[c.id] || 0) < MAX_STRAIN).length < 2) return [];
  const options = [];
  for (const creature of crew) {
    const load = strain[creature.id] || 0;
    if (load > 0 && load < MAX_STRAIN) {
      const restored = Math.min(2, load);
      options.push({ id: `recover-${creature.id}`, kind: 'recover', creature, cost: 2,
        energy: -restored, stability: 0, before: MAX_STRAIN - load, after: MAX_STRAIN - load + restored,
        title: `Resupply ${creature.species}`, reason: 'Turn recovered supplies into a short recovery stop.',
        result: `${creature.species} uses recovered supplies to regain ${restored} energy. The annex loses no extra stability.`,
        disabled: salvage < 2 ? 'Needs 2 salvage' : null });
    }
    const manipulation = creature.physiology.capabilities.manipulation || 0;
    const armored = creature.traits.includes('armored') || creature.traits.includes('anchored');
    if (pressure > 0 && load < MAX_STRAIN - 1 && (manipulation >= 60 || armored)) {
      const restored = Math.min(2, pressure);
      options.push({ id: `brace-${creature.id}`, kind: 'brace', creature, cost: 3,
        energy: 1, stability: -restored, before: MAX_INSTABILITY - pressure, after: MAX_INSTABILITY - pressure + restored,
        title: `Brace the annex with ${creature.species}`, reason: armored ? 'Its anchored or armored body can hold a brace in place.' : 'Its precise manipulation can secure recovered supports.',
        result: `${creature.species} secures recovered supports, restoring ${restored} stability and spending 1 energy.`,
        disabled: salvage < 3 ? 'Needs 3 salvage' : null });
    }
  }
  if (commands < 2) {
    const engineer = [...crew]
      .filter((creature) => (strain[creature.id] || 0) < MAX_STRAIN - 1)
      .sort((a, b) => ((b.attributes.intelligence || 0) + (b.physiology.capabilities.manipulation || 0)) - ((a.attributes.intelligence || 0) + (a.physiology.capabilities.manipulation || 0)))[0];
    if (engineer) options.push({ id: `relay-${engineer.id}`, kind: 'command', creature: engineer, cost: 2,
      energy: 1, stability: 0, commands: 1, before: commands, after: Math.min(2, commands + 1),
      title: `Build a command relay`, reason: `${engineer.species} can turn recovered signal parts into one new override.` ,
      result: `${engineer.species} builds a field relay, restoring 1 command override and spending 1 energy.`,
      disabled: salvage < 2 ? 'Needs 2 salvage' : null });
  }
  return options;
}

export function performFieldOperation(state, optionId) {
  const option = fieldOptions(state).find(entry => entry.id === optionId);
  if (!option || option.disabled) return null;
  return { ...state, used: true, salvage: state.salvage - option.cost,
    strain: { ...state.strain, [option.creature.id]: (state.strain[option.creature.id] || 0) + option.energy },
    pressure: state.pressure + option.stability, commands: Math.min(2, (state.commands == null ? 2 : state.commands) + (option.commands || 0)), option };
}
