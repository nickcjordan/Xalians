import { describe, expect, it } from 'vitest';

import { ArcadeCompleteBodySchema } from '../src/lib/schemas.ts';

describe('arcade completion schema', () => {
  it('preserves every deterministic artillery decision for server replay', () => {
    const parsed = ArcadeCompleteBodySchema.parse({
      gameId: 'artillery',
      sessionId: 'session-12345678',
      seed: 'daily-artillery',
      difficulty: 'rookie',
      creature: 'terragoyle',
      mapSize: 'wide',
      world: 'endessa',
      actions: [{ type: 'move', direction: 1, mobility: 'jet' }, {
        angle: 47,
        power: 73,
        payload: 'cluster',
        move: 1,
        system: 'anchor',
      }],
    });

    expect(parsed.gameId).toBe('artillery');
    if (parsed.gameId !== 'artillery') throw new Error('Expected artillery completion');
    expect(parsed.difficulty).toBe('rookie');
    expect(parsed.creature).toBe('terragoyle');
    expect(parsed.mapSize).toBe('wide');
    expect(parsed.world).toBe('endessa');
    expect(parsed.actions[0]).toEqual({ type: 'move', direction: 1, mobility: 'jet' });
    expect(parsed.actions[1]).toEqual({
      angle: 47,
      power: 73,
      payload: 'cluster',
      move: 1,
      system: 'anchor',
    });
  });
});
