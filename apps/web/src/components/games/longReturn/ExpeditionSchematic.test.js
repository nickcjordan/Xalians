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
  expect(container.querySelector('[data-map-key]').textContent).toContain(crew[0].species);
  expect(container.querySelector('[data-expedition-map]').getAttribute('data-map-record')).toBe('true');
});

test('the compact choice inset reuses the room geometry without repeating campaign chrome', () => {
  const scene = MISSION.scenes[0];
  const { container } = render(<ExpeditionSchematic scene={scene} crew={CREATURES.slice(0, 3)} routeId={scene.routes[1].id} preview decisionInset />);
  const inset = container.querySelector('[data-route-schematic]');
  expect(inset).toBeTruthy();
  expect(inset.hasAttribute('data-expedition-map')).toBe(false);
  expect(inset.querySelectorAll('[data-map-connection="route"]')).toHaveLength(2);
  expect(inset.querySelector('[data-map-route="intake"] [data-map-direction]')).toBeTruthy();
  expect(inset.querySelector('[data-site-overview]')).toBeNull();
  expect(inset.querySelector('[data-map-route-caption]')).toBeNull();
  expect(inset.querySelector('[data-expedition-reserves]')).toBeNull();
});

test('the field record uses a fixed scouting trace and reveals contact only at contact', () => {
  const crew = CREATURES.slice(0, 3);
  const scene = MISSION.scenes[2];
  const scout = crew[0];
  const { container, rerender } = render(<ExpeditionSchematic scene={scene} crew={crew} scout={scout} readingRecord position={{ crew: 'entry', scout: 'survey' }} />);
  expect(container.querySelector('[data-map-scout-path]')).toBeTruthy();
  expect(container.querySelector('[data-map-native]')).toBeNull();
  expect(container.querySelector('[data-map-key]').textContent).toContain(`${scout.species} · ahead`);
  rerender(<ExpeditionSchematic scene={scene} crew={crew} scout={scout} readingRecord position={{ crew: 'entry', scout: 'survey', encounter: true }} native={{ species: 'Hypnopet' }} />);
  expect(container.querySelector('[data-map-native]')).toBeTruthy();
  expect(container.querySelector('[data-map-key]').textContent).toContain('◇ Hypnopet');
});

test('an accompanying native has its own key, distinct from crew and contact', () => {
  const scene = MISSION.scenes[2];
  const { container } = render(<ExpeditionSchematic scene={scene} crew={CREATURES.slice(0, 3)} companion={{ species: 'Xylum' }} native={{ species: 'Hypnopet' }} readingRecord />);
  expect(container.querySelector('[data-map-key]').textContent).toContain('◇ Hypnopet');
  expect(container.querySelector('[data-map-key]').textContent).toContain('◆ Xylum · ally');
});
