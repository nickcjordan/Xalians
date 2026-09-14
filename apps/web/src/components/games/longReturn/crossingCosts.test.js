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
