import { CREATURES, MISSION } from './longReturnData';
import { methodOptions } from './longReturnEngine';
import { methodIdentity } from './methodProvenance';
import { TERRAIN } from './CrossingTerrain';
test('all fourteen routes have terrain and every available method retains its real source', () => {
  MISSION.scenes.forEach(scene => scene.routes.forEach(route => {
    expect(TERRAIN[route.id]).toBeTruthy();
    CREATURES.forEach(creature => methodOptions(creature, route).forEach(method => {
      const identity = methodIdentity(method);
      expect(identity.action).toBeTruthy();
      expect(identity.limited).toBe(!!method.ability);
      if (method.ability) expect(identity.source).toContain(method.ability.instrument.replaceAll('-', ' '));
      if (method.kind === 'capability') expect(creature.physiology.capabilities[method.key]).toBeGreaterThan(0);
    }));
  }));
});
test('unknown methods keep their action without invented anatomy or power', () => {
  expect(methodIdentity({ key: 'future-key', kind: 'fallback', label: 'Take care' })).toEqual({ source: 'Careful movement', action: 'Take care', strength: 'Improvised approach', limited: false });
});
