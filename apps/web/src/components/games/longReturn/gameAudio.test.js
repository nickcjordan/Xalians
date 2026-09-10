import { afterEach, describe, expect, test } from 'vitest';
import { playGameSound, readSoundEnabled, writeSoundEnabled } from './gameAudio';

describe('Long Return sound language', () => {
  afterEach(() => window.localStorage.clear());

  test('persists the player sound preference', () => {
    writeSoundEnabled(false);
    expect(readSoundEnabled()).toBe(false);
    writeSoundEnabled(true);
    expect(readSoundEnabled()).toBe(true);
  });

  test('fails safely when Web Audio is unavailable', () => {
    expect(playGameSound('select')).toBe(false);
  });

  test('never initializes audio when the player has muted the game', () => {
    const context = vi.fn();
    window.AudioContext = context;
    expect(playGameSound('select', false)).toBe(false);
    expect(context).not.toHaveBeenCalled();
    delete window.AudioContext;
  });

  test('keeps play available when sound preference storage fails', () => {
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(readSoundEnabled()).toBe(true);
    expect(writeSoundEnabled(false)).toBe(false);
    get.mockRestore(); set.mockRestore();
  });
});
