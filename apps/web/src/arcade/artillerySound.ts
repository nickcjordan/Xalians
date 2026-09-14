export type ArtillerySoundCue = 'select' | 'launch' | 'impact' | 'hit' | 'win' | 'loss';
export type ArtillerySoundPayload = 'shell' | 'barb' | 'bore' | 'cluster' | 'bloom' | 'lance';

const STORAGE_KEY = 'xalians.arcade.artillery.sound';

type ExtendedWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

export function createArtillerySound(storage: Storage | undefined = globalThis.localStorage) {
  let enabled = storage?.getItem(STORAGE_KEY) === 'on';
  let context: AudioContext | null = null;

  const audioContext = () => {
    if (context) return context;
    const Constructor = globalThis.window
      ? globalThis.window.AudioContext ?? (globalThis.window as ExtendedWindow).webkitAudioContext
      : undefined;
    if (!Constructor) return null;
    try {
      context = new Constructor();
      return context;
    } catch {
      return null;
    }
  };

  const tone = (frequency: number, duration: number, volume: number, delay = 0, type: OscillatorType = 'sine') => {
    const audio = audioContext();
    if (!audio) return;
    const starts = audio.currentTime + delay;
    const gain = audio.createGain();
    const oscillator = audio.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, starts);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, frequency * 0.62), starts + duration);
    gain.gain.setValueAtTime(0.0001, starts);
    gain.gain.exponentialRampToValueAtTime(volume, starts + Math.min(0.025, duration / 3));
    gain.gain.exponentialRampToValueAtTime(0.0001, starts + duration);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(starts);
    oscillator.stop(starts + duration + 0.02);
  };

  const noise = (duration: number, volume: number, delay = 0) => {
    const audio = audioContext();
    if (!audio) return;
    const starts = audio.currentTime + delay;
    const buffer = audio.createBuffer(1, Math.ceil(audio.sampleRate * duration), audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) data[index] = (Math.random() * 2 - 1) * (1 - index / data.length);
    const source = audio.createBufferSource();
    const gain = audio.createGain();
    const filter = audio.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    gain.gain.setValueAtTime(volume, starts);
    gain.gain.exponentialRampToValueAtTime(0.0001, starts + duration);
    source.buffer = buffer;
    source.connect(filter).connect(gain).connect(audio.destination);
    source.start(starts);
  };

  const play = (cue: ArtillerySoundCue, payload: ArtillerySoundPayload = 'shell') => {
    if (!enabled) return;
    try {
      if (cue === 'select') tone(420, 0.055, 0.025, 0, 'square');
      if (cue === 'launch') {
        noise(payload === 'barb' || payload === 'cluster' ? 0.11 : 0.18, 0.035);
        const launchPitch = payload === 'bore' ? 72 : payload === 'barb' ? 170 : payload === 'lance' ? 360 : payload === 'bloom' ? 125 : 105;
        tone(launchPitch, payload === 'bore' ? 0.32 : 0.2, 0.07, 0, payload === 'bloom' ? 'triangle' : 'sawtooth');
        if (payload === 'barb') {
          tone(310, 0.12, 0.025, 0.045, 'triangle');
          tone(390, 0.1, 0.02, 0.085, 'triangle');
        }
        if (payload === 'cluster') [240, 290, 340].forEach((frequency, index) => tone(frequency, 0.09, 0.018, index * 0.035, 'square'));
        if (payload === 'lance') tone(620, 0.1, 0.035, 0.02, 'sine');
      }
      if (cue === 'impact' || cue === 'hit') {
        noise(cue === 'hit' ? 0.32 : 0.22, cue === 'hit' ? 0.09 : 0.055);
        tone(payload === 'bore' ? 48 : 64, cue === 'hit' ? 0.42 : 0.28, cue === 'hit' ? 0.1 : 0.065, 0, 'sawtooth');
        if (payload === 'bore') tone(135, 0.38, 0.035, 0.06, 'triangle');
        if (payload === 'bloom') [120, 155, 190].forEach((frequency, index) => tone(frequency, 0.22, 0.025, index * 0.04, 'triangle'));
      }
      if (cue === 'win') [262, 330, 392, 523].forEach((frequency, index) => tone(frequency, 0.18, 0.045, index * 0.09, 'triangle'));
      if (cue === 'loss') [180, 145, 110].forEach((frequency, index) => tone(frequency, 0.24, 0.04, index * 0.12, 'sawtooth'));
    } catch {
      // Audio is enhancement only; browser audio failures never interrupt the match.
    }
  };

  return {
    enabled: () => enabled,
    setEnabled(next: boolean) {
      enabled = next;
      try { storage?.setItem(STORAGE_KEY, next ? 'on' : 'off'); } catch { /* storage is optional */ }
      if (next) {
        void audioContext()?.resume?.();
        play('select');
      }
    },
    play,
    dispose() {
      try { void context?.close(); } catch { /* closing audio is best effort */ }
      context = null;
    },
  };
}
