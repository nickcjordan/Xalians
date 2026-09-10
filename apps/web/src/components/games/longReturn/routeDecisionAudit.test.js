import { MISSION } from './longReturnData';

const compare = (left, right, scene) => {
  const axes = [
    ['difficulty', left.difficulty, right.difficulty, 'lower'],
    ['stability', left.pressure, right.pressure, 'lower'],
    ['salvage', left.salvage, right.salvage, 'higher'],
    ['known hazards', left.hazardIds.length, right.hazardIds.length, 'lower'],
    ['native contact', scene.encounter?.routeId === left.id ? 1 : 0, scene.encounter?.routeId === right.id ? 1 : 0, 'lower']
  ];
  const wins = { left: [], right: [] };
  axes.forEach(([label, a, b, direction]) => {
    if (a === b) return;
    const leftWins = direction === 'lower' ? a < b : a > b;
    wins[leftWins ? 'left' : 'right'].push(label);
  });
  return wins;
};

test('every route pair gives each side at least one legible strategic advantage', () => {
  MISSION.scenes.forEach((scene) => {
    expect(scene.routes).toHaveLength(2);
    const [left, right] = scene.routes;
    const wins = compare(left, right, scene);
    expect(wins.left.length, `${scene.title}: ${left.title} has no advantage over ${right.title}`).toBeGreaterThan(0);
    expect(wins.right.length, `${scene.title}: ${right.title} has no advantage over ${left.title}`).toBeGreaterThan(0);
  });
});

test('every route changes at least two player-facing stakes', () => {
  MISSION.scenes.forEach((scene) => {
    const [left, right] = scene.routes;
    const wins = compare(left, right, scene);
    expect(wins.left.length + wins.right.length, `${scene.title} routes are too similar`).toBeGreaterThanOrEqual(2);
  });
});
