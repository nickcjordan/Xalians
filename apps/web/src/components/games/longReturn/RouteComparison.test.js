import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { render, fireEvent } from '@testing-library/react';
import RouteComparison, { comparisonCosts } from './RouteComparison';
import { MISSION } from './longReturnData';

const base = { route: { id: 'a', title: 'Gantry', salvage: 1 }, lead: { species: 'Lead' }, support: { species: 'Support' }, method: { label: 'Climb' }, knownLeadStrain: 1, baseSupportStrain: 0, knownPressure: 1, unresolvedHazards: [], risk: 1 };

test('the next-room comparison states a benefit, while the story term stays in requested analysis', () => {
  const view = render(<RouteComparison scene={MISSION.scenes[0]} plans={MISSION.scenes[0].routes.map(route => ({...base,route}))} />);
  const cues = view.container.querySelectorAll('[data-route-path-cue]');
  expect(cues).toHaveLength(2);
  expect(cues[0].querySelectorAll('path')).toHaveLength(3);
  expect(cues[0].querySelectorAll('path')[2].getAttribute('d')).not.toBe(cues[1].querySelectorAll('path')[2].getAttribute('d'));
  expect(view.container.querySelector('.lr-board-future').textContent).toContain('Easier lower passage');
  expect(view.container.querySelector('.lr-board-future').textContent).not.toContain('Coolant bypass');
  fireEvent.click(view.container.querySelectorAll('.lr-board-analysis')[1]);
  expect(view.container.querySelector('#route-analysis-intake').textContent).toContain('Coolant bypass opened');
  view.unmount();
});

test('shared obstacles keep one passage rather than inventing two route corridors', () => {
  const scene = MISSION.scenes[2];
  const view = render(<RouteComparison scene={scene} plans={scene.routes.map(route => ({ ...base, route }))} />);
  expect(view.container.querySelectorAll('[data-route-path-cue]')).toHaveLength(0);
  view.unmount();
});

test('requested analysis spans both routes and remains separate from selecting a lead', () => {
  const onSelect = vi.fn();
  const view = render(<RouteComparison plans={[base, {...base, route:{id:'b',title:'Intake',salvage:2}}]} onSelect={onSelect} />);
  const buttons = view.container.querySelectorAll('.lr-board-analysis');
  fireEvent.click(buttons[1]);
  const panel = view.container.querySelector('#route-analysis-b');
  expect(panel.closest('tr').hidden).toBe(false);
  expect(panel.closest('td').colSpan).toBe(3);
  expect(buttons[1].getAttribute('aria-expanded')).toBe('true');
  fireEvent.click(buttons[0]);
  expect(panel.closest('tr').hidden).toBe(true);
  expect(buttons[1].getAttribute('aria-expanded')).toBe('false');
  fireEvent.click(buttons[0]);
  expect(view.container.querySelector('#route-analysis-a').closest('tr').hidden).toBe(true);
  expect(onSelect).not.toHaveBeenCalled();
  view.unmount();
});

test('cost cells and analysis controls preview their column without selecting it', () => {
  const onPreview = vi.fn();
  const onSelect = vi.fn();
  const view = render(<RouteComparison plans={[base, {...base,route:{...base.route,id:'b'}}]} selectedId="a" onPreview={onPreview} onSelect={onSelect} />);
  fireEvent.pointerMove(view.container.querySelector('.is-energy [data-route-preview="b"]'));
  expect(onPreview).toHaveBeenLastCalledWith('b');
  fireEvent.focus(view.container.querySelector('.lr-board-footer [data-route-preview="b"] .lr-board-analysis'));
  expect(onPreview).toHaveBeenLastCalledWith('b');
  fireEvent.blur(view.container.querySelector('.lr-board-footer [data-route-preview="b"] .lr-board-analysis'), {relatedTarget:null});
  expect(onPreview).toHaveBeenLastCalledWith('a');
  expect(onSelect).not.toHaveBeenCalled();
  view.container.querySelector('.lr-board-footer [data-route-preview="b"] .lr-board-analysis').focus();
  fireEvent.pointerLeave(view.container.querySelector('.lr-route-board'));
  expect(onPreview).toHaveBeenLastCalledWith('b');
  view.unmount();
});

test('depleted previews distinguish actual loss from effort demand and do not invent ally savings', () => {
  const depleted = { ...base, knownLeadStrain: 8, baseSupportStrain: 1, leadEnergy: 2, supportEnergy: 1 };
  expect(comparisonCosts(depleted)).toMatchObject({ energy: 3, lead: 2, support: 1, requiredEnergy: 9, exhaustsLead: true });
  expect(comparisonCosts(depleted, { ready: true })).toMatchObject({ energy: 3, saved: 0, assisted: true, requiredEnergy: 8, exhaustsLead: true });
});
function board(hazard) {
  const root = document.createElement('div');
  root.innerHTML = renderToStaticMarkup(<RouteComparison plans={[base, { ...base, route: { id: 'b', title: 'Intake', salvage: 2 }, knownLeadStrain: 0, knownPressure: 0, unresolvedHazards: [hazard] }]} onSelect={() => {}} onPreview={() => {}} />);
  return root;
}
test('unknown costs occupy the same shared rows without presenting zero as the total', () => {
  const root = board({ id: 'concealed', strain: 2 });
  for (const kind of ['energy', 'stability']) {
    const cells = root.querySelectorAll(`.is-${kind} [role="cell"]`);
    expect(cells).toHaveLength(2);
    expect(cells[0].textContent).toContain('1');
    expect(cells[1].querySelector('.lr-board-amount').textContent).toBe('?');
    expect(cells[1].textContent).toContain('total unknown');
  }
  expect(Array.from(root.querySelectorAll('.is-salvage .lr-board-amount'), cell => cell.textContent)).toEqual(['1', '2']);
  expect(root.querySelector('table.lr-route-board')).not.toBeNull();
  expect(root.querySelectorAll('th[scope="row"]')).toHaveLength(4);
  expect(root.querySelectorAll('.lr-board-analysis[aria-expanded="true"]')).toHaveLength(0);
});
test('the board does not expose hidden identities, amounts, or damage ranges', () => {
  expect(board({ id: 'secret-a', strain: 99, pressure: 0 }).innerHTML)
    .toBe(board({ id: 'secret-b', strain: 0, pressure: 99 }).innerHTML);
});
test('the shared energy row includes support and a confirmed companion saving', () => {
  expect(comparisonCosts({ ...base, baseSupportStrain: 1 }, { ready: true }).energy).toBe(1);
  expect(comparisonCosts({ ...base, baseSupportStrain: 1, nativeRisk: true }, { ready: true }).energy).toBe(2);
});

test('confirmed ally savings are explained at the energy value, not only in analysis', () => {
  const root = document.createElement('div');
  root.innerHTML = renderToStaticMarkup(<RouteComparison plans={[base]} companion={{ ready: true, creature: { species: 'Xylum' } }} onSelect={() => {}} onPreview={() => {}} />);
  expect(root.querySelector('.is-energy [role="cell"] small').textContent).toBe('Xylum saves 1 · uses its one help');
});

test('one-use costs share a comparison row only when a plan uses an ability', () => {
  const root=document.createElement('div');
  root.innerHTML=renderToStaticMarkup(<RouteComparison plans={[base,{...base,route:{id:'b'},method:{abilityId:'beam',ability:{name:'Corona Line'}}}]} onSelect={()=>{}} onPreview={()=>{}} />);
  expect(root.querySelector('.lr-board-abilities').textContent).toMatch(/All kept.*Uses Corona Line.*Unavailable afterward/);
  expect(board({id:'hidden'}).querySelector('.lr-board-abilities')).toBeNull();
});
