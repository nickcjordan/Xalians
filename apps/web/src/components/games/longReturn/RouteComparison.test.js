import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { render, fireEvent } from '@testing-library/react';
import RouteComparison, { comparisonCosts } from './RouteComparison';
import ExpeditionSchematic from './ExpeditionSchematic';
import { MISSION } from './longReturnData';

const base = { route: { id: 'a', title: 'Gantry', salvage: 1 }, lead: { species: 'Lead' }, support: { species: 'Support' }, method: { label: 'Climb' }, knownLeadStrain: 1, baseSupportStrain: 0, knownPressure: 1, unresolvedHazards: [], risk: 1 };

test('the next-room comparison states a benefit, while the story term stays in requested analysis', () => {
  const view = render(<RouteComparison scene={MISSION.scenes[0]} plans={MISSION.scenes[0].routes.map(route => ({...base,route}))} map={<ExpeditionSchematic scene={MISSION.scenes[0]} decisionInset />} />);
  expect(view.container.querySelector('.lr-board-context').textContent).toContain('Get everyone across the flood to the turbine hall.');
  expect(view.container.querySelectorAll('[data-route-path-cue]')).toHaveLength(0);
  expect(view.container.querySelector('.lr-board-context [data-route-schematic]')).toBeTruthy();
  expect(view.container.querySelectorAll('[data-route-schematic] [data-map-connection="route"]')).toHaveLength(2);
  expect(Array.from(view.container.querySelectorAll('[data-route-schematic] [data-map-choice-tag]'), node => node.getAttribute('data-map-choice-tag'))).toEqual(['A', 'B']);
  expect(Array.from(view.container.querySelectorAll('.lr-board-route-tag'), node => node.textContent)).toEqual(['A', 'B']);
  expect(view.container.querySelector('.lr-board-future').textContent).toContain('Easier lower passage');
  expect(view.container.querySelector('.lr-board-future').textContent).not.toContain('Coolant bypass');
  fireEvent.click(view.container.querySelectorAll('.lr-board-analysis')[1]);
  expect(view.container.querySelector('#route-analysis-intake').textContent).toContain('Coolant bypass opened');
  view.unmount();
});

test('shared obstacles keep one passage rather than inventing two route corridors', () => {
  const scene = MISSION.scenes[2];
  const view = render(<RouteComparison scene={scene} plans={scene.routes.map(route => ({ ...base, route }))} map={<ExpeditionSchematic scene={scene} decisionInset />} />);
  expect(view.container.querySelectorAll('[data-route-schematic] [data-map-shared-passage]')).toHaveLength(1);
  expect(view.container.querySelectorAll('[data-route-schematic] [data-map-connection="intervention"]')).toHaveLength(2);
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
  expect(view.container.querySelectorAll('.lr-board-pick')).toHaveLength(2);
  expect(view.container.querySelector('.lr-board-footer .lr-board-pick')).toBeNull();
  expect(view.container.querySelectorAll('.lr-board-next')).toHaveLength(2);
  fireEvent.click(view.container.querySelectorAll('.lr-board-pick')[1]);
  expect(onSelect).toHaveBeenCalledTimes(1);
  expect(onSelect).toHaveBeenCalledWith('b');
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

test('each projected column identifies the lead whose plan produced its numbers', () => {
  const crew = [{ id: 'a', species: 'Graviclaw' }, { id: 'b', species: 'Chromocat' }, { id: 'c', species: 'Hippochamp' }];
  const plans = [{ ...base, lead: crew[1] }, { ...base, route: { id: 'b', title: 'Intake', salvage: 2 }, lead: crew[2] }];
  const root = document.createElement('div');
  root.innerHTML = renderToStaticMarkup(<RouteComparison plans={plans} crew={crew} />);
  expect(Array.from(root.querySelectorAll('.lr-board-plan-lead'), node => node.textContent)).toEqual(['2Chromocat leads', '3Hippochamp leads']);
  expect(root.querySelectorAll('.lr-board-pick')[0].getAttribute('aria-label')).toContain('Preview: Chromocat leads');
  expect(root.querySelector('.is-energy').textContent).not.toContain('fixed cost');
});
test('a known forced ending attaches to its cause in one route column, not a new warning panel', () => {
  const root = document.createElement('div');
  root.innerHTML = renderToStaticMarkup(<RouteComparison plans={[base, {...base, route:{id:'b',title:'Intake',salvage:2}}]} stakes={[{kind:'energy', detail:'Only one crew member can act afterward.'}, null]} />);
  const energy = root.querySelectorAll('.is-energy [role="cell"]');
  expect(energy[0].querySelector('.lr-board-ending').textContent).toBe('Forced extraction afterward');
  expect(energy[1].querySelector('.lr-board-ending')).toBeNull();
  expect(root.querySelectorAll('.lr-board-ending')).toHaveLength(1);
  expect(root.querySelectorAll('tr:not([hidden])')).toHaveLength(5);
});

test('the archive comparison ties its energy cost to the physical recovery work', () => {
  const scene = MISSION.scenes.find(entry => entry.id === 'nemesis-index');
  const [stabilize, blackbox] = scene.routes;
  const plans = [
    { ...base, route: stabilize, knownLeadStrain: 2, knownPressure: 1 },
    { ...base, route: blackbox, knownLeadStrain: 0, knownPressure: 3 }
  ];
  const root = document.createElement('div');
  root.innerHTML = renderToStaticMarkup(<RouteComparison scene={scene} plans={plans} />);
  const energy = root.querySelectorAll('.is-energy [role="cell"]');
  expect(energy[0].textContent).toContain('2Careful plate recovery');
  expect(energy[1].textContent).toContain('none spent');
  expect(Array.from(root.querySelectorAll('.is-stability [role="cell"] .lr-board-amount'), cell => cell.textContent)).toEqual(['1', '3']);
  expect(Array.from(root.querySelectorAll('.is-stability [role="cell"] small'), cell => cell.textContent)).toEqual(['Wavering field', 'Cradle gives way']);
  expect(Array.from(root.querySelectorAll('.is-salvage [role="cell"] .lr-board-amount'), cell => cell.textContent)).toEqual(['5', '3']);
});

test('one-use costs share a comparison row only when a plan uses an ability', () => {
  const root=document.createElement('div');
  root.innerHTML=renderToStaticMarkup(<RouteComparison plans={[base,{...base,route:{id:'b'},method:{abilityId:'beam',ability:{name:'Corona Line'}}}]} onSelect={()=>{}} onPreview={()=>{}} />);
  expect(root.querySelector('.lr-board-abilities').textContent).toMatch(/All kept.*Uses Corona Line.*Unavailable afterward/);
  expect(board({id:'hidden'}).querySelector('.lr-board-abilities')).toBeNull();
});
