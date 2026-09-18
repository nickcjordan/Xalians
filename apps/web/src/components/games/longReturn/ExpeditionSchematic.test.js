import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import ExpeditionSchematic from './ExpeditionSchematic';
import { CREATURES, MISSION } from './longReturnData';

afterEach(cleanup);

test('the field record shows a received report as a stationary diagram state', () => {
  const crew = CREATURES.slice(0, 3);
  const { container } = render(<ExpeditionSchematic scene={MISSION.scenes[1]} crew={crew} scout={crew[1]} position={{ crew: 'entry', scout: 'survey', signal: true }} />);
  expect(screen.getByText('Report received · scout ahead')).toBeTruthy();
  expect(container.querySelector('[data-map-signal]')).toBeTruthy();
  expect(container.querySelector(`[data-map-creature="${crew[1].id}"]`).getAttribute('data-location')).toBe('survey');
  expect(container.querySelectorAll('[data-map-creature].transition-transform')).toHaveLength(0);
  expect(container.querySelectorAll('[data-map-route-label]')).toHaveLength(2);
  expect(container.querySelector('svg[role="img"]').getAttribute('aria-label')).toContain('scouting ahead');
});

test('without a report, the map keeps the crew waiting and omits the signal', () => {
  const crew = CREATURES.slice(0, 3);
  const { container } = render(<ExpeditionSchematic scene={MISSION.scenes[1]} crew={crew} scout={crew[1]} position={{ crew: 'entry', scout: 'survey' }} />);
  expect(screen.getByText('Scout ahead · crew waiting')).toBeTruthy();
  expect(container.querySelector('[data-map-signal]')).toBeNull();
});

test('the decision map names approaches on phones, while the reading record leaves them to the story', () => {
  const crew = CREATURES.slice(0, 3);
  const { container, rerender } = render(<ExpeditionSchematic scene={MISSION.scenes[0]} crew={crew} compact />);
  expect(container.querySelectorAll('[data-map-route-caption]')).toHaveLength(2);
  rerender(<ExpeditionSchematic scene={MISSION.scenes[0]} crew={crew} readingRecord />);
  expect(container.querySelectorAll('[data-map-route-caption]')).toHaveLength(0);
});
