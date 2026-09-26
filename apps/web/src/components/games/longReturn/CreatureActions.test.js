import React from 'react';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import CreatureActions from './CreatureActions';
import { MISSION, CREATURES } from './longReturnData';
import { applyMissionMemory, methodOptions, decisionForecast } from './longReturnEngine';

vi.mock('../../xalianImage', () => ({ default: () => <span /> }));
afterEach(cleanup);

function plansFor(scene) {
  return scene.routes.flatMap(route => methodOptions(CREATURES[2], route).map(method => ({
    ...decisionForecast({ route, lead: CREATURES[2], support: CREATURES[0], method, scan: { revealedIds: [] } }),
    route, lead: CREATURES[2], support: CREATURES[0], method,
    knownLeadStrain: 1, knownPressure: route.pressure, baseSupportStrain: 0
  })));
}

test('discovery previews show observable clues without announcing their unrecovered payoff', () => {
  const scene = MISSION.scenes[5], choices = plansFor(scene);
  const plans = scene.routes.map(route => choices.find(plan => plan.route.id === route.id));
  const { container } = render(<CreatureActions scene={scene} plans={plans} choices={Object.fromEntries(scene.routes.map(route => [route.id, choices.filter(plan => plan.route.id === route.id)]))} selectedId="harvest" stakes={[]} />);
  expect(container.textContent).toContain('Faint markings');
  expect(container.textContent).toContain('connector still sealed');
  expect(container.textContent).not.toMatch(/inner ring closing|recognize its uneven|power the ring controls in the final chamber/);
  expect(container.textContent).toContain('Recover the submerged cell');
});

test('an earned technique sits beside ordinary techniques without a duplicate menu', () => {
  const scene = applyMissionMemory(MISSION.scenes[6], ['reservoir-cell-recovered']);
  const choices = plansFor(scene).filter(plan => plan.route.id === 'align');
  const onChange = vi.fn();
  render(<CreatureActions scene={scene} plans={[choices[0]]} choices={{ align: choices }} selectedId="align" stakes={[]} onChange={onChange} />);
  fireEvent.click(screen.getByRole('button', { name: /From an earlier discovery Power the ring controls with the recovered cell/ }));
  expect(onChange).toHaveBeenCalledWith(choices.find(plan => plan.method.memoryId === 'powered-ring-controls'));
  expect(screen.queryByRole('combobox')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Reset the core governors', exact: true }));
  expect(onChange).toHaveBeenLastCalledWith(choices.find(plan => plan.method.label === 'Reset the core governors'));
});

test('ordinary alternatives expose a physical clue before the player chooses that technique', () => {
  const scene = MISSION.scenes[0];
  const choices = plansFor(scene).filter(plan => plan.route.id === 'gantry');
  const leap = choices.find(plan => plan.method.key === 'leap');
  const climb = choices.find(plan => plan.method.key === 'climb');
  const onChange = vi.fn();
  render(<CreatureActions scene={scene} plans={[leap]} choices={{ gantry: choices }} selectedId="gantry" stakes={[]} onChange={onChange} />);
  const climbing = screen.getByRole('button', { name: /Climb the suspension frame A loose service cable/ });
  expect(climbing.getAttribute('aria-pressed')).toBe('false');
  fireEvent.click(climbing);
  expect(onChange).toHaveBeenCalledWith(climb);
  expect(screen.queryByRole('combobox')).toBeNull();
});

test('powered controls replace the closing-ring warning only for the powered technique', () => {
  const scene = applyMissionMemory(MISSION.scenes[6], ['reservoir-cell-recovered']);
  const choices = plansFor(scene).filter(plan => plan.route.id === 'align');
  const powered = choices.find(plan => plan.method.memoryId === 'powered-ring-controls');
  const manual = choices.find(plan => !plan.method.memoryId);
  const props = { scene, choices: { align: choices }, selectedId: 'align', stakes: [], knownHazards: scene.hazards };
  const { rerender } = render(<CreatureActions {...props} plans={[powered]} />);
  expect(screen.queryByText(/^Known danger:/)).toBeNull();
  expect(screen.getByText(/The powered motors hold the rings open/)).toBeTruthy();
  rerender(<CreatureActions {...props} plans={[manual]} />);
  expect(screen.getByText(/^Known danger:/)).toBeTruthy();
});
