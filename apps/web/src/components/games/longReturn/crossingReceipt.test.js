import { crossingReceipt } from './crossingReceipt';

test('settles lead, support and stability without counting loss beyond zero', () => {
  const result = {crewChanges:[{creature:{id:'lead'},before:5,after:6,added:4},{creature:{id:'support'},before:4,after:6,added:3}],instabilityChange:{before:9,after:10,added:4}};
  const receipt = crossingReceipt(result);
  expect(receipt.crew.map(change=>change.added)).toEqual([1,2]);
  expect(receipt.energy).toBe(3);
  expect(receipt.stability.added).toBe(1);
  expect(result.crewChanges[0].added).toBe(4);
  expect(result.instabilityChange.added).toBe(4);
});

test('unchanged reserves do not invent a loss and absent results have no receipt', () => {
  expect(crossingReceipt(null)).toBeNull();
  const result = {crewChanges:[{before:2,after:2,added:0}],instabilityChange:{before:4,after:4,added:0}};
  expect(crossingReceipt(result)).toMatchObject({energy:0,stability:{added:0}});
});
