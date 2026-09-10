import { describe, expect, test } from 'vitest';
import { methodPerformance, scoutPerformance } from './performanceVisuals';
import { MISSION } from './longReturnData';

describe('Long Return performance vocabulary', () => {
  test.each([['swim', 'swim'], ['flight', 'flight'], ['beam', 'beam'], ['ward', 'ward'], ['phasing', 'phase']])('%s has a distinct motion', (key, id) => {
    expect(methodPerformance({ key }).id).toBe(id);
  });

  test.each([['Quiet scout', 'quiet'], ['Defensive scout', 'defensive'], ['Contact scout', 'contact']])('%s has a distinct scouting posture', (role, id) => {
    expect(scoutPerformance({ role }).id).toBe(id);
  });

  test('every authored crossing method has an intentional visual vocabulary', () => {
    const methods = MISSION.scenes.flatMap((scene) => scene.routes.flatMap((route) => route.methods));
    methods.forEach((method) => expect(methodPerformance(method).id, `${method.key} fell back to generic advance`).not.toBe('advance'));
  });
});
