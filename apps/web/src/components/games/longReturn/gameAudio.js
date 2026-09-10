const SOUND_KEY = 'xalians.long-return.sound.v1';
let context;

export function readSoundEnabled() {
  if (typeof window === 'undefined') return true;
  try { return !window.localStorage || window.localStorage.getItem(SOUND_KEY) !== 'off'; }
  catch (_) { return true; }
}

export function writeSoundEnabled(enabled) {
  if (typeof window === 'undefined') return false;
  try { if (window.localStorage) window.localStorage.setItem(SOUND_KEY, enabled ? 'on' : 'off'); return true; }
  catch (_) { return false; }
}

function tone(ctx, destination, frequency, when, duration, volume = .035, type = 'sine', endFrequency) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, when);
  if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, when + duration);
  gain.gain.setValueAtTime(.0001, when);
  gain.gain.exponentialRampToValueAtTime(volume, when + .015);
  gain.gain.exponentialRampToValueAtTime(.0001, when + duration);
  oscillator.connect(gain).connect(destination);
  oscillator.start(when); oscillator.stop(when + duration + .02);
}

export function playGameSound(cue, enabled = true) {
  if (!enabled || typeof window === 'undefined') return false;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return false;
  try {
    context ||= new AudioContext();
    if (context.state === 'suspended') context.resume();
    const now = context.currentTime + .01;
    const patterns = {
      select: [[420, .055, .025, 'square'], [610, .04, .018, 'square', .055]],
      commit: [[125, .16, .045, 'triangle'], [92, .2, .04, 'triangle', .12]],
      move: [[150, .35, .03, 'sine', 0, 260]], depart: [[180, .26, .025, 'triangle', 0, 320]], return: [[320, .3, .026, 'triangle', 0, 150]],
      observe: [[720, .12, .028, 'sine'], [1040, .16, .02, 'sine', .1]], signal: [[510, .08, .025, 'square'], [760, .11, .02, 'square', .1]], silence: [[90, .07, .025, 'square']],
      hazard: [[120, .32, .05, 'sawtooth', 0, 66]], encounter: [[155, .4, .04, 'sawtooth'], [207, .42, .035, 'sawtooth']],
      energy: [[360, .12, .028, 'triangle', 0, 250], [245, .15, .025, 'triangle', .12]], stability: [[86, .45, .052, 'sawtooth', 0, 58]],
      salvage: [[520, .1, .025, 'triangle'], [730, .14, .026, 'triangle', .09]], support: [[310, .2, .02, 'sine'], [465, .22, .018, 'sine']], companion: [[260, .18, .02, 'sine'], [390, .2, .02, 'sine', .08], [520, .22, .018, 'sine', .16]],
      complete: [[390, .14, .025, 'triangle'], [585, .2, .028, 'triangle', .12]], decision: [[280, .08, .025, 'square'], [350, .08, .02, 'square', .07]], recover: [[440, .12, .023, 'sine'], [554, .16, .025, 'sine', .1]]
    };
    (patterns[cue] || patterns.select).forEach(([frequency, duration, volume, type, delay = 0, endFrequency]) => tone(context, context.destination, frequency, now + delay, duration, volume, type, endFrequency));
    return true;
  } catch (_) { return false; }
}
