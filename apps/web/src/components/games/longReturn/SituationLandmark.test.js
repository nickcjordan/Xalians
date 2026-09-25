import React from 'react';
import { render, cleanup, screen } from '@testing-library/react';
import ExpeditionSchematic from './ExpeditionSchematic';
import { applyMissionMemory } from './longReturnEngine';
import { MISSION, CREATURES } from './longReturnData';

afterEach(cleanup);

test('the cable leaves its original frame and visibly supports the later bearing without revealing a native', () => {
  const props = { scene: MISSION.scenes[0], crew: CREATURES.slice(0, 3) };
  const { container, rerender } = render(<ExpeditionSchematic {...props} />);
  expect(screen.getByRole('img', { name: 'Loose service cable along the frame' })).toBeTruthy();
  rerender(<ExpeditionSchematic {...props} runFlags={['gantry-service-line']} />);
  expect(container.querySelector('[data-map-service-line]')).toBeNull();
  rerender(<ExpeditionSchematic {...props} runFlags={['gantry-line-broken']} />);
  expect(screen.getByRole('img', { name: 'Broken service cable along the frame' })).toBeTruthy();
  rerender(<ExpeditionSchematic {...props} scene={MISSION.scenes[1]} runFlags={['underdeck-bearing-lifted']} />);
  expect(screen.getByRole('img', { name: 'Cable holding the bearing above the lower passage' })).toBeTruthy();
  expect(container.querySelector('[data-map-native]')).toBeNull();
});

test('the beacon changes visually without revealing its native or moving the crew', () => {
  const flags = ['gallery-beacon-loop'];
  const scene = applyMissionMemory(MISSION.scenes[3], flags);
  const props = { scene, crew: CREATURES.slice(0, 3), runFlags: flags };
  const { container, rerender } = render(<ExpeditionSchematic {...props} />);
  expect(screen.getByRole('img', { name: 'Repeating beacon' })).toBeTruthy();
  expect(container.querySelector('[data-map-native]')).toBeNull();
  rerender(<ExpeditionSchematic {...props} runFlags={[...flags, 'gallery-beacon-redirected']} />);
  expect(screen.getByRole('img', { name: 'Light turned outward' })).toBeTruthy();
  expect(container.querySelector('[data-crew-position]').dataset.crewPosition).toBe('entry');
  rerender(<ExpeditionSchematic {...props} runFlags={[...flags, 'gallery-beacon-stopped']} />);
  expect(screen.getByRole('img', { name: 'Beacon stopped' })).toBeTruthy();
  expect(container.querySelector('[fill-opacity]')).toBeNull();
  rerender(<ExpeditionSchematic {...props} scene={MISSION.scenes[3]} />);
  expect(container.querySelector('[data-map-beacon]')).toBeNull();
});
