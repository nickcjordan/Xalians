import { CREATURES, MISSION } from './longReturnData';
import { encounterOptions } from './longReturnEngine';
import { encounterChoicePresentation } from './encounterPresentation';

test('every authored encounter response has a concise action and aftermath identity', () => {
  const validActions = ['Assist', 'Communicate', 'Report', 'Avoid', 'Confront'];
  const validOutcomes = ['Possible ally', 'Crew gains safe approach', 'Route still occupied', 'Choose another route', 'Passage opens'];
  MISSION.scenes.filter((scene) => scene.encounter).forEach((scene) => {
    ['scout', 'group'].forEach((mode) => {
      const options = encounterOptions(scene, CREATURES[0], CREATURES, mode, mode === 'group');
      expect(options.length).toBeGreaterThanOrEqual(2);
      options.forEach((option) => {
        const presentation = encounterChoicePresentation(option);
        expect(validActions).toContain(presentation.identity.label);
        expect(validOutcomes).toContain(presentation.outcome.label);
        expect(presentation.identity.icon).toMatch(/^bi-/);
        expect(presentation.outcome.icon).toMatch(/^bi-/);
      });
    });
  });
});

test('the marked-controls response previews the future crew advantage, not a cleared route', () => {
  const mark = encounterChoicePresentation({ id: 'mark', resolution: 'unresolved' });
  expect(mark.outcome.label).toBe('Crew gains safe approach');
  expect(mark.outcome.label).not.toBe('Passage opens');
});
