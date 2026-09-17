import { CREATURES, MISSION } from './longReturnData';
import { methodOptions, resolveScene } from './longReturnEngine';
// Pareto audit, not a win-rate simulation. Counts a route as viable when some
// plan cannot be beaten in every measured dimension by the other route.
test('each scene offers a non-dominated route for at least one crew/readiness state', () => {
  const audit = [];
  for (const scene of MISSION.scenes) {
    const viable = [0, 0];
    for (let a=0;a<4;a++) for (let b=a+1;b<5;b++) for (let c=b+1;c<6;c++) {
      const crew=[CREATURES[a],CREATURES[b],CREATURES[c]];
      for (const load of [0, 2, 4]) {
        const plans=scene.routes.map(route => crew.flatMap(lead => crew.filter(s => s.id!==lead.id).flatMap(support => methodOptions(lead,route).map(method => {
          const result=resolveScene({scene,route,lead,support,method,scan:{revealedIds:scene.hazards.map(h=>h.id)},leadLoad:load,supportLoad:load,useCommand:false});
          return [result.leadStrain+result.supportStrain,result.pressure,-result.salvage,method.abilityId?1:0];
        }))));
        plans.forEach((options,index) => {
          if(options.some(option => !plans[1-index].some(other => other.every((value,i)=>value<=option[i]) && other.some((value,i)=>value<option[i])))) viable[index]++;
        });
      }
    }
    audit.push({scene:scene.id,viable});
    // Known future effects and different native encounters are additional
    // strategic dimensions, deliberately not collapsed into an invented score.
    scene.routes.forEach((route,index)=>expect(viable[index]>0 || !!route.consequence || scene.encounter?.routeId===route.id, route.id).toBe(true));
  }
  process.stdout.write('ROUTE CHOICE AUDIT '+JSON.stringify(audit)+'\n');
});
