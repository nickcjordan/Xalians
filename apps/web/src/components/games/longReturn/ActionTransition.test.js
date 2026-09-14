import React from 'react';
import { render, screen, act, cleanup } from '@testing-library/react';
import ActionTransition from './ActionTransition';
import { CREATURES, MISSION } from './longReturnData';
vi.mock('../../xalianImage', () => ({ default: () => <span /> }));
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });
test('consecutive energy events advance and the final result does not dismiss itself', () => {
  vi.useFakeTimers();
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  const lead = CREATURES[0], support = CREATURES[1];
  const onComplete = vi.fn();
  render(<ActionTransition soundEnabled={false} onComplete={onComplete} action={{ type: 'crossing', scene: MISSION.scenes[0], route: MISSION.scenes[0].routes[0], lead, support, method: { label: 'Cross', kind: 'capability', key: 'agility' }, result: {
    unseenHazards: [], leadStrain: 1, supportStrain: 1, pressure: 1, salvage: 1, salvageAfter: 1, impactLabel: 'Costly success',
    crewChanges: [lead, support].map(creature => ({ creature, added: 1, before: 0, after: 1 })), instabilityChange: { before: 0, after: 1, added: 1 }
  } }} />);
  for (let i = 0; i < 10; i++) act(() => vi.advanceTimersByTime(2500));
  expect(screen.getByRole('button', { name: /Continue to result/ })).toBeTruthy();
  expect(onComplete).not.toHaveBeenCalled();
});
