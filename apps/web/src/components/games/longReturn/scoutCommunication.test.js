import { scoutCommunication, reportDeliveryLabel } from './scoutCommunication';

test('communication becomes physical behavior without spoken Xalian language', () => {
  expect(scoutCommunication('display')).toMatchObject({label:'Visual signals',action:expect.stringContaining('visible gestures')});
  expect(scoutCommunication('vibration').action).toContain('through the structure');
  expect(scoutCommunication('vocal').action).toContain('pattern of calls');
  expect(scoutCommunication('telepathic').action).toContain('images and feelings, without a spoken word');
  expect(scoutCommunication('chemical').action).toContain('scent signal');
  expect(scoutCommunication('unknown').action).not.toContain('unknown');
});

test('the report distinguishes remote delivery, physical return and absent delivery', () => {
  expect(reportDeliveryLabel({channel:'display'})).toBe('Visual signals received');
  expect(reportDeliveryLabel({channel:'physical return'})).toBe('Back with the crew');
  expect(reportDeliveryLabel({channel:null,outcome:'trapped'})).toBe('Waiting for the scout');
  expect(reportDeliveryLabel({channel:null,outcome:'blind'})).toBe('No scout sent');
});
