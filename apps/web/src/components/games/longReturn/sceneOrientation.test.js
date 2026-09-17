import { MISSION } from './longReturnData';
import { sceneOrientation, routeSetting } from './sceneOrientation';

test('every scene and route has physical orientation without relying on analysis', () => {
  for (const scene of MISSION.scenes) {
    expect(sceneOrientation(scene).length).toBeGreaterThan(100);
    for (const route of scene.routes) expect(routeSetting[route.id]).toBeTruthy();
  }
});

test('the turbine hall remembers only the entrance actually taken', () => {
  const scene = MISSION.scenes[1];
  const flooded = sceneOrientation(scene, ['coolant-bypass']);
  const quiet = sceneOrientation(scene, ['quiet-entry']);
  expect(flooded).toContain('side channel your crossing cleared');
  expect(flooded).not.toContain('quiet crossing');
  expect(quiet).toContain('quiet crossing');
  expect(quiet).not.toContain('channel');
  for (const text of [quiet, flooded]) {
    expect(text).toContain('sealed door');
    expect(text).toContain('Both paths');
  }
  expect(routeSetting.catwalk).toContain('above the machines');
  expect(routeSetting.underdeck).toContain('beneath the machines');
});
