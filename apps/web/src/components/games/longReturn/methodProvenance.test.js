import { CREATURES, MISSION } from './longReturnData';
import { methodOptions } from './longReturnEngine';
import { methodIdentity, approachExplanation } from './methodProvenance';
import { TERRAIN } from './CrossingTerrain';
test('all fourteen routes have terrain and every available method retains its real source', () => {
  MISSION.scenes.forEach(scene => scene.routes.forEach(route => {
    expect(TERRAIN[route.id]).toBeTruthy();
    CREATURES.forEach(creature => methodOptions(creature, route).forEach(method => {
      const identity = methodIdentity(method);
      expect(identity.action).toBeTruthy();
      expect(identity.limited).toBe(!!method.ability);
      const explanation = approachExplanation(method);
      expect(explanation).not.toMatch(/undefined|NaN/);
      if (method.kind === 'trait') expect(explanation).toMatch(/^Innate /);
      if (method.kind === 'fallback') expect(explanation).toContain('No matching specialty');
      if (method.ability) expect(explanation).toContain(method.ability.name);
      if (method.ability) expect(identity.source).toContain(method.ability.instrument.replaceAll('-', ' '));
      if (method.kind === 'capability') expect(creature.physiology.capabilities[method.key]).toBeGreaterThan(0);
    }));
  }));
});

test('skill descriptions do not promise a cost or outcome from one stat alone', () => {
  expect(approachExplanation({ kind: 'capability', key: 'swim', sourceValue: 20, label: 'Swim' })).toBe('Swimming: a weak skill');
  expect(approachExplanation({ kind: 'capability', key: 'swim', sourceValue: 85, label: 'Swim' })).toBe('Swimming: a strong skill');
  expect(approachExplanation({ kind: 'fallback', label: 'Careful advance' })).toBe('No matching specialty — advances carefully');
});
test('unknown methods keep their action without invented anatomy or power', () => {
  expect(methodIdentity({ key: 'future-key', kind: 'fallback', label: 'Take care' })).toEqual({ source: 'Careful movement', action: 'Take care', strength: 'Improvised approach', limited: false });
});
