import { nativeRemains } from './nativePresence';
test.each([null, {resolution:'unresolved'}, {resolution:'detour'}])('unresolved contact remains on the route: %j', resolution => expect(nativeRemains(resolution)).toBe(true));
test.each(['cleared','befriended'])('%s opens the route', resolution => expect(nativeRemains({resolution})).toBe(false));
