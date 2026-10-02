import React from 'react';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import LongReturnGame from './longReturnGame';
import { readCheckpoint } from './expeditionSave';

vi.mock('../../xalianImage', () => ({ default: () => <div data-testid="creature-portrait" /> }));
beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.spyOn(Math, 'random').mockReturnValue(.1);
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const click = name => fireEvent.click(screen.getByRole('button', { name }));
const start = () => { const view = render(<LongReturnGame />); click(/seal crew/i); return view; };
const play = () => {
  for (let i = 0; i < 6 && screen.queryByRole('button', { name: 'Pause story' }); i++) act(() => vi.advanceTimersByTime(16000));
  expect(screen.queryByRole('button', { name: 'Pause story' })).toBeNull();
};

test('a remote report unfolds into route choices in the same scene without acknowledgement', () => {
  const { container } = start();
  const stage = container.querySelector('[data-expedition-map]');
  click('Select Graviclaw as scout'); click('Send Graviclaw');
  expect(container.querySelector('[data-visible-brine]')).toBeNull();
  click('Pause story'); act(() => vi.advanceTimersByTime(60000));
  expect(container.querySelectorAll('[data-story-event]')).toHaveLength(1);
  click('Resume story'); screen.getByRole('button', { name: 'Pause story' }).focus(); play();
  expect(document.activeElement).toBe(container.querySelector('[data-opening-decision]'));
  expect(container.querySelector('[data-expedition-map]')).toBe(stage);
  expect(screen.getByRole('region', { name: 'Choose a creature action' })).toBeTruthy();
  expect(screen.queryByRole('region', { name: 'Scout report' })).toBeNull();
  expect(container.querySelectorAll('[data-story-event]')).toHaveLength(3);
  expect(container.querySelector('[data-map-signal]')).toBeTruthy();
});

test('automatic handoff preserves reading focus and keyboard traversal skips closed details', () => {
  const { container } = start();
  click('Select Graviclaw as scout'); click('Send Graviclaw');
  const account = screen.getByRole('log', { name: 'Adventure account' });
  account.focus(); play();
  expect(document.activeElement).toBe(account);
  fireEvent.click(container.querySelector('[data-route-preview="gantry"] .lr-intention'));
  const commit = screen.getByRole('button', { name: /Go with / });
  commit.focus(); fireEvent.keyDown(commit, { key: 'Tab' });
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Log' }));
  fireEvent.keyDown(document.activeElement, { key: 'Tab', shiftKey: true });
  expect(document.activeElement).toBe(commit);
  expect(document.activeElement).not.toBe(screen.getByRole('button', { name: 'Compare previous opening', hidden: true }));
});

test('an isolated scout keeps findings concealed until its paid return, then the crew can act', () => {
  const { container } = start();
  click('Select Hippochamp as scout'); click('Send Hippochamp'); play();
  expect(container.querySelector('[data-visible-brine]')).toBeNull();
  expect(screen.queryByText(/The flood carries a dormant Electric charge/)).toBeNull();
  click('Wait for Hippochamp to return');
  expect(container.querySelector('[data-map-creature="hippochamp-041"][data-location="returning"]')).toBeTruthy();
  expect(container.querySelector('[data-visible-brine]')).toBeNull();
  play();
  expect(container.querySelector('[data-visible-brine]')).toBeTruthy();
  expect(screen.getByRole('region', { name: 'Choose a creature action' })).toBeTruthy();
  expect(container.querySelectorAll('[data-story-event]')).toHaveLength(5);
  expect(container.querySelectorAll('[data-map-creature][data-location="entry"]')).toHaveLength(3);
  expect(screen.getByRole('group', { name: /Hippochamp: 4 of 6 energy/ })).toBeTruthy();
});

test.each(['gantry', 'intake'])('%s visibly changes the scene and reaches the next room without a duplicate result', route => {
  const { container } = start();
  const stage = container.querySelector('[data-expedition-map]');
  click('Stay together');
  const routeButton = container.querySelector(`[data-route-preview="${route}"] .lr-intention`);
  fireEvent.click(routeButton);
  click(/Go with /); play();
  expect(container.querySelector('[data-expedition-map]')).toBe(stage);
  expect(container.querySelectorAll('[data-map-creature][data-location="exit"]')).toHaveLength(3);
  expect(container.querySelector(`[data-corridor-consequence="${route === 'gantry' ? 'quiet-entry' : 'coolant-bypass'}"]`)).toBeTruthy();
  expect(screen.queryByRole('button', { name: /continue to result/i })).toBeNull();
  expect(readCheckpoint().phase).toBe('result');
  click('Wait and read the signal');
  expect(container.querySelector('[data-corridor-signal="read"]')).toBeTruthy();
  click('Continue mission');
  expect(container.querySelector('[data-opening-adventure]')).toBeNull();
  expect(container.textContent).toContain('Blind Turbine Hall');
  expect(container.querySelectorAll('[data-site-overview]')).toHaveLength(0);
});

test('a long landing passage keeps its reading allowance before automatic handoff', () => {
  const { container } = start(); click('Stay together');
  fireEvent.click(container.querySelector('[data-route-preview="gantry"] .lr-intention'));
  click(/Go with /);
  for (let i = 0; i < 3; i++) act(() => vi.advanceTimersByTime(16000));
  expect(container.querySelectorAll('[data-story-event]')).toHaveLength(4);
  act(() => vi.advanceTimersByTime(12000));
  expect(screen.getByRole('button', { name: 'Pause story' })).toBeTruthy();
  act(() => vi.advanceTimersByTime(12000));
  expect(screen.getByRole('button', { name: 'Continue mission' })).toBeTruthy();
});

test('optional repairs keep their real exchange and the anchored travel action', () => {
  const { container } = start();
  click('Select Hippochamp as scout'); click('Send Hippochamp'); play();
  click('Wait for Hippochamp to return'); play();
  fireEvent.click(container.querySelector('[data-route-preview="intake"] .lr-intention'));
  click(/Go with /); click('Show outcome now');
  fireEvent.click(screen.getByText('Repair with salvage', { exact: true }));
  click(/Resupply Hippochamp 2 salvage/); click(/Spend 2 salvage & repair/i);
  expect(screen.getByRole('region', { name: 'Field work complete' })).toBeTruthy();
  expect(screen.getByRole('group', { name: /Hippochamp: 6 of 6 energy/ })).toBeTruthy();
  expect(readCheckpoint().salvage).toBe(0);
  expect(screen.getAllByRole('button', { name: 'Continue mission' })).toHaveLength(1);
  click('Continue mission');
  expect(container.textContent).toContain('Blind Turbine Hall');
});

test('help and log close back to their opening controls', () => {
  start(); click('Rules');
  expect(screen.getByRole('dialog', { name: 'How every crossing works' })).toBeTruthy();
  click('Close crossing rules'); act(() => vi.advanceTimersByTime(16));
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Rules' }));
  click('Log'); click('Close expedition log'); act(() => vi.advanceTimersByTime(16));
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Log' }));
});

test('resuming a completed opening restores the landing, discoveries, and next travel action', () => {
  let view = start(); click('Stay together');
  fireEvent.click(view.container.querySelector('[data-route-preview="gantry"] .lr-intention'));
  click(/Go with /); click('Show outcome now');
  view.unmount(); view = render(<LongReturnGame />); click('Resume expedition');
  expect(view.container.querySelectorAll('[data-map-creature][data-location="exit"]')).toHaveLength(3);
  expect(view.container.querySelector('[data-corridor-consequence="quiet-entry"]')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Pause story' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Continue mission' })).toBeTruthy();
});
