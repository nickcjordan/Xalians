import { crossingCosts } from './crossingCosts';
import { CREATURES, MISSION } from './longReturnData';
import { methodOptions, resolveScene } from './longReturnEngine';

test('receipt contributions reconcile with the engine across every route and crew pairing', () => {
  for (const scene of MISSION.scenes) for (const route of scene.routes) for (const lead of CREATURES) for (const support of CREATURES.filter(c => c.id !== lead.id)) {
    for (const method of methodOptions(lead, route, [])) for (const revealed of [[], scene.hazards.map(h => h.id)]) {
      const result = resolveScene({ scene, route, lead, support, method, scan: { revealedIds: revealed }, useCommand: false });
      const costs = crossingCosts(route, result);
      const sum = entries => entries.reduce((total, entry) => total + entry.amount, 0);
      expect(sum(costs.energy)).toBe(result.leadStrain);
      expect(sum(costs.support)).toBe(result.supportStrain);
      expect(sum(costs.stability)).toBe(result.pressure);
    }
  }
});

test('careful archive recovery has a visible effort cost that a quick backup pull avoids', () => {
  const scene = MISSION.scenes.find(entry => entry.id === 'nemesis-index');
  const stabilize = scene.routes.find(route => route.id === 'stabilize');
  const blackbox = scene.routes.find(route => route.id === 'blackbox');
  expect(stabilize.sustainedWork).toBe(2);
  expect(blackbox.sustainedWork || 0).toBe(0);
  const lead = CREATURES.find(entry => entry.species === 'Graviclaw');
  const support = CREATURES.find(entry => entry.species === 'Hippochamp');
  for (const route of [stabilize, blackbox]) {
    const method = methodOptions(lead, route, [])[0];
    const result = resolveScene({ scene, route, lead, support, method, scan: { revealedIds: scene.hazards.map(hazard => hazard.id) }, useCommand: false });
    const costs = crossingCosts(route, result);
    expect(costs.energy.find(entry => entry.label === 'Careful plate recovery')?.amount || 0).toBe(route.sustainedWork || 0);
  }
});
