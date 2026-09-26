import React from 'react';
import { render, screen, act, cleanup, fireEvent } from '@testing-library/react';
import ActionTransition from './ActionTransition';
import { CREATURES, MISSION } from './longReturnData';
vi.mock('../../xalianImage', () => ({ default: () => <span /> }));
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });
test('causal story advances, keeps both creatures costs, and never dismisses itself', () => {
  vi.useFakeTimers();
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  const lead = CREATURES[0], support = CREATURES[1], reserve = CREATURES[2];
  const onComplete = vi.fn();
  render(<ActionTransition soundEnabled={false} onComplete={onComplete} action={{ type: 'crossing', scene: MISSION.scenes[0], route: MISSION.scenes[0].routes[0], lead, support, crew:[lead,support,reserve],crewStrain:{[reserve.id]:3}, method: { label: 'Cross', kind: 'capability', key: 'agility' }, result: {
    unseenHazards: [], leadStrain: 1, supportStrain: 1, pressure: 1, salvage: 1, salvageAfter: 1, impactLabel: 'Costly success',
    crewChanges: [lead, support].map(creature => ({ creature, added: 1, before: 0, after: 1 })), instabilityChange: { before: 0, after: 1, added: 1 }
  } }} />);
  const first = document.querySelector('.lr-story-current');
  expect(document.querySelector('[data-field-record] [data-expedition-map]')).toBeTruthy();
  expect(document.querySelectorAll('[data-field-record] [data-map-creature]')).toHaveLength(3);
  expect(document.querySelector('[data-field-record] [data-expedition-map]').getAttribute('data-crew-position')).toBe('approach');
  expect(document.querySelector('[data-field-record] .lr-scene-stage')).toBeNull();
  expect(screen.getByLabelText(`${reserve.species} energy: 3 of 6`)).toBeTruthy();
  expect(screen.getByLabelText(`${lead.species} energy: 6 of 6`)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Pause story' }));
  act(() => vi.advanceTimersByTime(30000));
  expect(document.querySelectorAll('.lr-story-current')).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: /Next event/ }));
  expect(document.querySelectorAll('.lr-story-current')).toHaveLength(1);
  expect(document.querySelectorAll('.lr-story-steps button')).toHaveLength(2);
  expect(document.querySelector('[data-field-record] [data-expedition-map]').getAttribute('data-crew-position')).toBe('crossing');
  expect(document.querySelector('.lr-story-current')).not.toBe(first);
  fireEvent.click(screen.getByRole('button', { name: 'Resume story' }));
  for (let i = 0; i < 10; i++) act(() => vi.advanceTimersByTime(2500));
  expect(screen.getByRole('button', { name: /Continue to result/ })).toBeTruthy();
  expect(onComplete).not.toHaveBeenCalled();
  expect(document.querySelectorAll('.lr-story-steps button')).toHaveLength(4);
  fireEvent.click(screen.getByRole('button', { name: /Read event 3/ }));
  const costBeat = document.querySelector('.lr-story-current');
  expect(costBeat.textContent).toContain(`${lead.species}: −1 energy`);
  expect(costBeat.textContent).toContain(`${support.species}: −1 energy`);
  expect(costBeat.querySelectorAll('.is-energy')).toHaveLength(2);
  expect(screen.getByLabelText(`${lead.species} energy: 5 of 6`)).toBeTruthy();
  expect(screen.getByLabelText(`${reserve.species} energy: 3 of 6`)).toBeTruthy();
  act(() => vi.advanceTimersByTime(60000));
  expect(document.querySelectorAll('.lr-story-current')).toHaveLength(1);
  expect(onComplete).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: /Continue to result/ }));
  expect(onComplete).toHaveBeenCalledTimes(1);
});
