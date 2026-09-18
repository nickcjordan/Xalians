import { MISSION } from './longReturnData';
import { sceneOrientation, routeSetting } from './sceneOrientation';

test('every scene and route has physical orientation without relying on analysis', () => {
  for (const scene of MISSION.scenes) {
    expect(sceneOrientation(scene).length).toBeGreaterThan(100);
    for (const route of scene.routes) expect(routeSetting[route.id]).toBeTruthy();
  }
});

test('the next door carries forward the actual discovery rather than both alternatives', () => {
  const scene = MISSION.scenes[2];
  const codes = sceneOrientation(scene, ['maintenance-codes']);
  const alert = sceneOrientation(scene, ['security-pulse']);
  expect(codes).toContain('markings you copied');
  expect(codes).not.toContain('tightened');
  expect(alert).toContain('locking ring has tightened');
  expect(alert).not.toContain('markings you copied');
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
    expect(text).toContain('Two passages lead there');
  }
  expect(routeSetting.catwalk).toContain('above the machines');
  expect(routeSetting.underdeck).toContain('beneath the machines');
});

test('the optional rooms continue from the archive fork and reservoir junction', () => {
  expect(sceneOrientation(MISSION.scenes[5])).toContain('archive junction');
  expect(sceneOrientation(MISSION.scenes[5])).toContain('descends the service stair');
  expect(sceneOrientation(MISSION.scenes[6])).toContain('reservoir junction');
  expect(sceneOrientation(MISSION.scenes[6])).toContain('dry passage');
});
