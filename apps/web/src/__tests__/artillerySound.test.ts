import { describe, expect, it } from 'vitest';

import { createArtillerySound } from '../arcade/artillerySound';

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const values = new Map(Object.entries(initial));
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => { values.set(key, value); },
  };
}

describe('Crater Command sound', () => {
  it('starts muted and persists an explicit preference', () => {
    const storage = memoryStorage();
    const sound = createArtillerySound(storage);
    expect(sound.enabled()).toBe(false);
    expect(() => sound.play('launch', 'bore')).not.toThrow();

    sound.setEnabled(true);
    expect(sound.enabled()).toBe(true);
    expect(storage.getItem('xalians.arcade.artillery.sound')).toBe('on');

    sound.setEnabled(false);
    expect(storage.getItem('xalians.arcade.artillery.sound')).toBe('off');
    sound.dispose();
  });

  it('restores the saved setting and tolerates unavailable browser audio', () => {
    const sound = createArtillerySound(memoryStorage({ 'xalians.arcade.artillery.sound': 'on' }));
    expect(sound.enabled()).toBe(true);
    expect(() => sound.play('hit', 'shell')).not.toThrow();
    expect(() => sound.play('win')).not.toThrow();
    sound.dispose();
  });
});
