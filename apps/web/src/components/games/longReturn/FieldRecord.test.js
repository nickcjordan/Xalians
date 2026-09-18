import React from 'react';
import { act, cleanup, render } from '@testing-library/react';
import FieldRecord from './FieldRecord';
import ExpeditionSchematic from './ExpeditionSchematic';
import { CREATURES, MISSION } from './longReturnData';

afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

const scene = MISSION.scenes[0];
const crew = CREATURES.slice(0, 3);
const mapAt = crewPosition => <ExpeditionSchematic scene={scene} crew={crew} routeId={scene.routes[0].id} readingRecord position={{ crew: crewPosition }} />;

test('each station change brings the instrument map forward, moves its markers, then restores the reading layout', () => {
  vi.useFakeTimers();
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  const { container, rerender } = render(<FieldRecord scene={scene} title="Cross the gantry" label="Crossing" mapFocusLabel="At the flood" map={mapAt('entry')}><div>Story</div></FieldRecord>);
  expect(container.querySelector('[data-map-focus="active"]')).toBeTruthy();
  expect(container.querySelector('[data-map-attention]')).toBeTruthy();
  expect(container.querySelector('[data-map-creature]').getAttribute('data-location')).toBe('entry');

  rerender(<FieldRecord scene={scene} title="Cross the gantry" label="Crossing" mapFocusLabel="On the bridge" map={mapAt('crossing')}><div>Story</div></FieldRecord>);
  expect(container.querySelector('[data-map-focus="active"] .lr-field-map-head').textContent).toContain('On the bridge');
  expect(container.querySelector('[data-map-creature]').getAttribute('data-location')).toBe('crossing');
  expect(container.querySelectorAll('[data-map-creature]')).toHaveLength(3);
  act(() => vi.advanceTimersByTime(1750));
  expect(container.querySelector('[data-map-focus="active"]')).toBeNull();
  expect(container.querySelector('[data-map-creature]').getAttribute('data-location')).toBe('crossing');
  expect(container.textContent).toContain('Story');
});

test('reduced-motion readers get the final stationary map without an overlay', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  const { container } = render(<FieldRecord scene={scene} title="Cross the gantry" label="Crossing" map={mapAt('exit')}><div>Story</div></FieldRecord>);
  expect(container.querySelector('[data-map-focus="active"]')).toBeNull();
  expect(container.querySelector('[data-map-creature]').getAttribute('data-location')).toBe('exit');
});

test('the first action visibly departs from the entry station', () => {
  vi.useFakeTimers();
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  const { container } = render(<FieldRecord scene={scene} title="Cross the gantry" label="Crossing" map={mapAt('approach')} animateInitialTravel><div>Story</div></FieldRecord>);
  expect(container.querySelectorAll('.lr-map-token-depart')).toHaveLength(3);
  expect(container.querySelector('[data-map-focus="active"]')).toBeTruthy();
  act(() => vi.advanceTimersByTime(1750));
  expect(container.querySelectorAll('.lr-map-token-depart')).toHaveLength(0);
});
