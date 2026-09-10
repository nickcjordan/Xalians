/*
	Reclamation: synthesized sound module for the console. The site is styled as the
	control panel of a Xalian Generator (enamelled steel, brass, bakelite, a CRT); the
	sound design follows the same rule as the visuals: dry and mechanical, no reverb
	tails, no musical stings. Every cue is built from oscillators, gain envelopes, a
	biquad filter, and a short noise buffer, all through the Web Audio API. No audio
	files are loaded (the repo's asset policy is synthesize in code, no fetches).

	Sound is off by default; the player turns it on. `enabled` is read from and written
	to an injected storage object (default `window.localStorage`) so this can be tested
	without a real browser and works the same way as reclamationStorage.js.

	The AudioContext is created lazily, on the first play while enabled, because browsers
	require a user gesture before audio can start. `play` is written to never throw: no
	AudioContext constructor, a context that fails to construct, or being disabled all
	just do nothing.
*/

const STORAGE_KEY = 'reclamation.sound';

export const CUES = [
	'lift',    // a plinth is pressed: a small relay click
	'send',    // a figure lands on a tray: a soft thunk, two short filtered noise bursts
	'pass',    // the handler passes: a lever pulled, click then a lower click
	'rival',   // the rival moved: a single low relay click, quieter than lift
	'seal',    // the round is sealed and the worlds clash: a latch
	'strike',  // an attack lands: a short dull impact, pitched by a magnitude 0..1 option
	'rout',    // a creature is downed: a descending two-note buzz, 120 ms (cue id kept)
	'stamp',   // the Court's stamp comes down: a heavy thud with a short brass ring, 200 ms
	'charter', // the match ends: three ascending relay clicks then a low hum fading over 600 ms
];

const CUE_DESCRIPTIONS = {
	lift: 'A small relay click as a plinth is pressed.',
	send: 'A soft thunk as a figure lands on its tray.',
	pass: 'A lever pulled: click then a lower click, for a passed turn.',
	rival: 'A single low relay click, quieter, marking the rival’s move.',
	seal: 'A latch closing as the round seals and the worlds clash.',
	strike: 'A short dull impact as an attack lands.',
	rout: 'A descending two-note buzz as a creature is downed.',
	stamp: 'A heavy thud with a short brass ring as the Court’s stamp comes down.',
	charter: 'Three ascending relay clicks, then a low hum fading out, as the match ends.',
};

function resolveStorage(storage) {
	if (storage) {
		return storage;
	}
	if (typeof window === 'undefined') {
		return null;
	}
	try {
		return window.localStorage;
	} catch (err) {
		return null;
	}
}

function readEnabled(storage) {
	const store = resolveStorage(storage);
	if (!store) {
		return false;
	}
	try {
		return store.getItem(STORAGE_KEY) === 'on';
	} catch (err) {
		return false;
	}
}

function writeEnabled(storage, value) {
	const store = resolveStorage(storage);
	if (!store) {
		return;
	}
	try {
		store.setItem(STORAGE_KEY, value ? 'on' : 'off');
	} catch (err) {
		// quota exceeded, private window, or no storage at all: sound state just
		// does not persist, it still works for the rest of the session
	}
}

function getContextClass() {
	if (typeof window === 'undefined') {
		return null;
	}
	return window.AudioContext || window.webkitAudioContext || null;
}

// A short burst of white noise, generated once per context and reused by every cue
// that wants a filtered thunk instead of a tone (send, stamp). Cached on the context
// itself so a second createSound() with the same context does not regenerate it.
function getNoiseBuffer(ctx) {
	if (ctx._reclamationNoiseBuffer) {
		return ctx._reclamationNoiseBuffer;
	}
	const duration = 0.2;
	const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
	const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
	const data = buffer.getChannelData(0);
	for (let i = 0; i < length; i++) {
		data[i] = Math.random() * 2 - 1;
	}
	ctx._reclamationNoiseBuffer = buffer;
	return buffer;
}

// A short click: an oscillator dropped through a fast gain envelope. Used for lift,
// pass, rival, and the relay clicks in charter.
function scheduleClick(ctx, dest, { time, freq, gain, duration }) {
	const osc = ctx.createOscillator();
	osc.type = 'square';
	osc.frequency.setValueAtTime(freq, time);

	const env = ctx.createGain();
	env.gain.setValueAtTime(0.0001, time);
	env.gain.linearRampToValueAtTime(gain, time + 0.002);
	env.gain.exponentialRampToValueAtTime(0.0001, time + duration);

	osc.connect(env);
	env.connect(dest);
	osc.start(time);
	osc.stop(time + duration + 0.01);
}

// A filtered noise burst: the cached noise buffer through a biquad filter and a gain
// envelope. Used for the thunks in send and stamp.
function scheduleNoiseBurst(ctx, dest, { time, filterFreq, filterType, gain, duration }) {
	const source = ctx.createBufferSource();
	source.buffer = getNoiseBuffer(ctx);

	const filter = ctx.createBiquadFilter();
	filter.type = filterType || 'lowpass';
	filter.frequency.setValueAtTime(filterFreq, time);

	const env = ctx.createGain();
	env.gain.setValueAtTime(0.0001, time);
	env.gain.linearRampToValueAtTime(gain, time + 0.005);
	env.gain.exponentialRampToValueAtTime(0.0001, time + duration);

	source.connect(filter);
	filter.connect(env);
	env.connect(dest);
	source.start(time);
	source.stop(time + duration + 0.01);
}

// A dull tone: a sine or triangle oscillator through a lowpass filter and gain
// envelope. Used for strike, the downed cue, stamp's ring, and charter's closing hum.
function scheduleTone(ctx, dest, { time, freq, endFreq, type, filterFreq, gain, duration }) {
	const osc = ctx.createOscillator();
	osc.type = type || 'sine';
	osc.frequency.setValueAtTime(freq, time);
	if (endFreq != null) {
		osc.frequency.linearRampToValueAtTime(endFreq, time + duration);
	}

	const filter = ctx.createBiquadFilter();
	filter.type = 'lowpass';
	filter.frequency.setValueAtTime(filterFreq || 1200, time);

	const env = ctx.createGain();
	env.gain.setValueAtTime(0.0001, time);
	env.gain.linearRampToValueAtTime(gain, time + 0.01);
	env.gain.exponentialRampToValueAtTime(0.0001, time + duration);

	osc.connect(filter);
	filter.connect(env);
	env.connect(dest);
	osc.start(time);
	osc.stop(time + duration + 0.01);
}

const CUE_BUILDERS = {
	lift(ctx, dest, now) {
		scheduleClick(ctx, dest, { time: now, freq: 900, gain: 0.9, duration: 0.05 });
	},

	send(ctx, dest, now) {
		scheduleNoiseBurst(ctx, dest, { time: now, filterFreq: 500, gain: 0.8, duration: 0.06 });
		scheduleNoiseBurst(ctx, dest, { time: now + 0.05, filterFreq: 380, gain: 0.6, duration: 0.07 });
	},

	pass(ctx, dest, now) {
		scheduleClick(ctx, dest, { time: now, freq: 800, gain: 0.85, duration: 0.045 });
		scheduleClick(ctx, dest, { time: now + 0.09, freq: 420, gain: 0.7, duration: 0.06 });
	},

	rival(ctx, dest, now) {
		scheduleClick(ctx, dest, { time: now, freq: 500, gain: 0.4, duration: 0.05 });
	},

	seal(ctx, dest, now) {
		scheduleClick(ctx, dest, { time: now, freq: 260, gain: 0.7, duration: 0.05 });
		scheduleClick(ctx, dest, { time: now + 0.04, freq: 700, gain: 0.5, duration: 0.03 });
	},

	strike(ctx, dest, now, opts) {
		const magnitude = clamp01(opts && opts.magnitude != null ? opts.magnitude : 0.5);
		const freq = 160 + magnitude * 140;
		scheduleTone(ctx, dest, {
			time: now,
			freq,
			endFreq: freq * 0.6,
			type: 'triangle',
			filterFreq: 900,
			gain: 0.5 + magnitude * 0.3,
			duration: 0.09,
		});
		scheduleNoiseBurst(ctx, dest, { time: now, filterFreq: 700, gain: 0.3 + magnitude * 0.2, duration: 0.05 });
	},

	rout(ctx, dest, now) {
		scheduleTone(ctx, dest, {
			time: now,
			freq: 420,
			type: 'sawtooth',
			filterFreq: 800,
			gain: 0.5,
			duration: 0.06,
		});
		scheduleTone(ctx, dest, {
			time: now + 0.06,
			freq: 220,
			type: 'sawtooth',
			filterFreq: 600,
			gain: 0.5,
			duration: 0.06,
		});
	},

	stamp(ctx, dest, now) {
		scheduleNoiseBurst(ctx, dest, { time: now, filterFreq: 300, gain: 0.9, duration: 0.12 });
		scheduleTone(ctx, dest, {
			time: now,
			freq: 90,
			type: 'sine',
			filterFreq: 400,
			gain: 0.8,
			duration: 0.2,
		});
		scheduleTone(ctx, dest, {
			time: now + 0.02,
			freq: 1400,
			type: 'triangle',
			filterFreq: 3000,
			gain: 0.25,
			duration: 0.15,
		});
	},

	charter(ctx, dest, now) {
		scheduleClick(ctx, dest, { time: now, freq: 500, gain: 0.7, duration: 0.05 });
		scheduleClick(ctx, dest, { time: now + 0.1, freq: 650, gain: 0.7, duration: 0.05 });
		scheduleClick(ctx, dest, { time: now + 0.2, freq: 820, gain: 0.7, duration: 0.05 });
		scheduleTone(ctx, dest, {
			time: now + 0.25,
			freq: 130,
			type: 'sine',
			filterFreq: 500,
			gain: 0.4,
			duration: 0.6,
		});
	},
};

function clamp01(value) {
	if (typeof value !== 'number' || Number.isNaN(value)) {
		return 0;
	}
	return Math.min(1, Math.max(0, value));
}

export function describeCue(cue) {
	return CUE_DESCRIPTIONS[cue] || '';
}

export function createSound({ storage } = {}) {
	let ctx = null;
	let masterGain = null;
	let on = readEnabled(storage);

	function ensureContext() {
		if (ctx) {
			return ctx;
		}
		const ContextClass = getContextClass();
		if (!ContextClass) {
			return null;
		}
		try {
			ctx = new ContextClass();
			masterGain = ctx.createGain();
			masterGain.gain.value = 0.25;
			masterGain.connect(ctx.destination);
		} catch (err) {
			ctx = null;
			masterGain = null;
		}
		return ctx;
	}

	function enabled() {
		return on;
	}

	function setEnabled(value) {
		on = !!value;
		writeEnabled(storage, on);
	}

	function toggle() {
		setEnabled(!on);
		return on;
	}

	function play(cue, opts) {
		if (!on) {
			return;
		}
		const builder = CUE_BUILDERS[cue];
		if (!builder) {
			return;
		}
		const activeCtx = ensureContext();
		if (!activeCtx || !masterGain) {
			return;
		}
		try {
			if (activeCtx.state === 'suspended' && typeof activeCtx.resume === 'function') {
				activeCtx.resume();
			}
			const now = activeCtx.currentTime;
			builder(activeCtx, masterGain, now, opts);
		} catch (err) {
			// synthesis failures never propagate to the caller: at worst the cue is silent
		}
	}

	function dispose() {
		if (ctx) {
			try {
				ctx.close();
			} catch (err) {
				// already closed, or close() unsupported: nothing left to clean up
			}
		}
		ctx = null;
		masterGain = null;
	}

	return { play, enabled, setEnabled, toggle, dispose };
}
