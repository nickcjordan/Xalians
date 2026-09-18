import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ArrivalTrace from './ArrivalTrace';
import { CREATURES, MISSION } from './longReturnData';
import { MAP_PLACES } from './mapPlaces';

test('every resolved room traces the whole crew from its actual entrance to the next threshold', () => {
  for (const scene of MISSION.scenes) for (const route of scene.routes) {
    const root = document.createElement('div');
    root.innerHTML = renderToStaticMarkup(<ArrivalTrace scene={scene} route={route} crew={CREATURES.slice(0, 3)} />);
    const trace = root.querySelector('[data-arrival-trace]');
    expect(trace.getAttribute('aria-label')).toContain(`from ${MAP_PLACES[scene.id].entry.join(' ')} to ${MAP_PLACES[scene.id].exit.join(' ')}`);
    expect(trace.querySelector('figcaption').textContent).toBe(route.title);
    expect(Array.from(trace.querySelectorAll('.lr-arrival-trace-party b'), node => node.textContent)).toEqual(['1', '2', '3']);
    expect(trace.querySelector('animate, animateTransform')).toBeNull();
  }
});

test('a temporary companion appears beside the crew, not as a fourth controlled member', () => {
  const root = document.createElement('div');
  root.innerHTML = renderToStaticMarkup(<ArrivalTrace scene={MISSION.scenes[2]} route={MISSION.scenes[2].routes[0]} crew={CREATURES.slice(0, 3)} companion={{ creature: { species: 'Xylum' } }} />);
  expect(root.querySelectorAll('.lr-arrival-trace-party b:not(.is-ally)')).toHaveLength(3);
  expect(root.querySelector('.lr-arrival-trace-party .is-ally').getAttribute('title')).toBe('Xylum');
  expect(root.querySelector('[data-arrival-trace]').getAttribute('aria-label')).toContain('Xylum is with them');
});
