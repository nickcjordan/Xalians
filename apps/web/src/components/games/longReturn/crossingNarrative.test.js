import { crossingNarrative } from './crossingNarrative';
import { MISSION } from './longReturnData';

const result = { quality: 'clean', rawMethodScore: 90, margin: 20, naturalReaction: false, environment: { strain: 0 }, unseenHazards: [] };
const narrate = (route, changes = {}) => crossingNarrative({ route, lead: { species: 'Lead' }, support: { species: 'Support' }, method: { label: 'Swim' }, result: { ...result, ...changes } });
test('every route and outcome has a location-specific account', () => {
  for (const scene of MISSION.scenes) for (const route of scene.routes) for (const quality of ['clean', 'costly', 'rough', 'critical']) {
    const { story } = narrate(route, { quality });
    expect(story.length).toBeGreaterThan(60);
    expect(story).not.toContain('brings the crew through');
  }
});
test('credits support only when it crosses an actual performance threshold', () => {
  const route = { id: 'conduit', difficulty: 70 };
  expect(narrate(route, { rawMethodScore: 65, margin: 2 }).turningPoint).toContain('support made the difference');
  expect(narrate(route, { rawMethodScore: 75, margin: 16 }).turningPoint).toContain('without spending energy on the crossing itself');
  expect(narrate(route, { rawMethodScore: 90, margin: 25 }).turningPoint).not.toContain('made the difference');
  expect(narrate(route, { rawMethodScore: 40, margin: -20 }).turningPoint).toContain('forced a passage');
});
test('does not claim temperament saved energy when there was none to save', () => {
  const route = { id: 'conduit', difficulty: 70 };
  expect(narrate(route, { naturalReaction: true }).turningPoint).not.toContain('preserving 1 energy');
  expect(narrate(route, { naturalReaction: true, rawMethodScore: 75, margin: 8 }).turningPoint).toContain('preserving 1 energy');
});

test('explains hazard and exposure costs before celebrating an easy technique', () => {
  const route = { id: 'dive', difficulty: 80 };
  const hidden = narrate(route, { rawMethodScore: 85, margin: 16, leadStrain: 3, unseenHazards: [{ label: 'Charge bloom', strain: 2, pressure: 2 }] });
  expect(hidden.turningPoint).toContain('Charge bloom went undetected');
  expect(hidden.turningPoint).toContain('energy and annex stability');
  expect(hidden.turningPoint).not.toContain('without spending energy');
  expect(narrate(route, { environment: { strain: 1 } }).turningPoint).toContain('environment itself');
  const absorbed = narrate(route, { leadStrain: 0, unseenHazards: [{ label: 'Charge bloom', strain: 1, pressure: 0 }] });
  expect(absorbed.turningPoint).toContain('without losing energy');
});
