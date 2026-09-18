import { CREATURES, MISSION } from './longReturnData';
import { methodOptions, resolveScene, applyMissionMemory, decisionForecast } from './longReturnEngine';

test('the reservoir offers structural safety at the rim against a larger submerged haul', () => {
  const scene = MISSION.scenes.find(entry => entry.id === 'core-reservoir');
  const [rim, dive] = scene.routes;
  expect(rim.pressure).toBeLessThan(dive.pressure);
  expect(rim.salvage).toBeLessThan(dive.salvage);
  expect(rim.hazardIds).toEqual(dive.hazardIds);
});

// Controlled crossing-only baseline: mapped versus blind intelligence; no
// scouting expense, encounters or repairs. These are not player win rates.
test('different crew and route policies produce distinct expedition costs', () => {
  const runs = [];
  for (let a = 0; a < CREATURES.length - 2; a++) for (let b = a + 1; b < CREATURES.length - 1; b++) for (let c = b + 1; c < CREATURES.length; c++) {
    const crew = [CREATURES[a], CREATURES[b], CREATURES[c]];
    for (const intel of ['mapped', 'blind']) for (const policy of ['conserve', 'haul']) {
      let stability = 10, haul = 0, crossed = 0;
      const strain = {}, spent = [], flags = [];
      for (const source of MISSION.scenes) {
        const scene = applyMissionMemory(source, flags);
        const choices = [];
        for (const route of scene.routes) for (const lead of crew.filter(c => (strain[c.id] || 0) < 6)) for (const support of crew.filter(c => c.id !== lead.id && (strain[c.id] || 0) < 6)) {
          for (const method of methodOptions(lead, route, spent)) {
            const args = { scene, route, lead, support, method, scan: { revealedIds: intel === 'mapped' ? scene.hazards.map(h => h.id) : [] }, useCommand: false, leadLoad: strain[lead.id] || 0, supportLoad: strain[support.id] || 0 };
            const result = resolveScene(args);
            const forecast = decisionForecast(args);
            const knownEnergy = Math.max(0, forecast.baseLeadStrain + forecast.environment.strain - (forecast.naturalReaction ? 1 : 0));
            const cost = knownEnergy + forecast.baseSupportStrain + (route.pressure + (forecast.naturalReaction ? 0 : 1)) * 2;
            expect(Number.isFinite(cost)).toBe(true);
            choices.push({ route, lead, support, result, cost });
          }
        }
        choices.sort((x,y) => policy === 'haul' ? y.result.salvage - x.result.salvage || x.cost - y.cost : x.cost - y.cost || y.result.salvage - x.result.salvage);
        const best = choices[0];
        if (!best) break;
        stability -= best.result.pressure;
        strain[best.lead.id] = Math.min(6, (strain[best.lead.id] || 0) + best.result.leadStrain);
        strain[best.support.id] = Math.min(6, (strain[best.support.id] || 0) + best.result.supportStrain);
        if (best.result.abilityId) spent.push(best.result.abilityId);
        if (best.route.consequence) flags.push(best.route.consequence.id);
        haul += best.result.salvage; crossed++;
        if (stability <= 0) break;
      }
      runs.push({ crew: crew.map(c => c.species).join('/'), intel, policy, crossed, haul, stability });
    }
  }
  const distinctPairs = runs.filter((run,i) => i % 2 === 0 && JSON.stringify([run.crossed,run.haul,run.stability]) !== JSON.stringify([runs[i+1].crossed,runs[i+1].haul,runs[i+1].stability])).length;
  process.stdout.write('CROSSING BASELINE ' + JSON.stringify({ runs: runs.length, distinctPairs, policies: ['conserve','haul'].map(policy => { const rows = runs.filter(r => r.policy === policy); return { policy, minCrossed: Math.min(...rows.map(r=>r.crossed)), maxCrossed: Math.max(...rows.map(r=>r.crossed)), averageHaul: rows.reduce((sum,r)=>sum+r.haul,0)/rows.length }; }) }) + '\n');
  expect(runs).toHaveLength(80);
  expect(distinctPairs).toBeGreaterThan(0);
});
