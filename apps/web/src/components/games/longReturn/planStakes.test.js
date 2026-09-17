import { planStakes } from './planStakes';
const crew = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
const plan = { route: { salvage: 1 }, lead: crew[0], support: crew[1], knownLeadStrain: 1, baseSupportStrain: 0, knownPressure: 1, unresolvedHazards: [] };
test('only warns when known costs force an ending', () => {
  expect(planStakes(plan, crew, {}, 0)).toBeNull();
  expect(planStakes(plan, crew, {}, 9).kind).toBe('stability');
  expect(planStakes(plan, crew, { a: 5, c: 6 }, 0).kind).toBe('energy');
});
test('confirmed companion help can preserve an active crew member', () => {
  expect(planStakes(plan, crew, { a: 5, c: 6 }, 0, { ready: true })).toBeNull();
});
test('concealed hazard magnitudes cannot influence the warning', () => {
  expect(planStakes({ ...plan, unresolvedHazards: [{ strain: 99 }] }, crew, {}, 0)).toBeNull();
});
