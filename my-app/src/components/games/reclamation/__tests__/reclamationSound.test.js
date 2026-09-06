import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CUES, describeCue, createSound } from '../reclamationSound';

/*
	Coverage for reclamationSound's contract: sound is off by default, play() is a
	total no-op while disabled or when the Web Audio API is unavailable, and every
	cue schedules its nodes without ever throwing into the caller. A fake AudioContext
	stands in for the real thing so these run headless under jsdom; it records every
	node it is asked to create so we can assert something actually got built.
*/

function makeFakeStorage(initial = {}) {
	const data = { ...initial };
	return {
		getItem(key) {
			return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
		},
		setItem(key, value) {
			data[key] = String(value);
		},
	};
}

function makeThrowingStorage() {
	return {
		getItem() {
			throw new Error('storage is unavailable');
		},
		setItem() {
			throw new Error('storage is unavailable');
		},
	};
}

class FakeAudioParam {
	constructor(value) {
		this.value = value;
		this.calls = [];
	}
	setValueAtTime(value, time) {
		this.value = value;
		this.calls.push(['setValueAtTime', value, time]);
	}
	linearRampToValueAtTime(value, time) {
		this.value = value;
		this.calls.push(['linearRampToValueAtTime', value, time]);
	}
	exponentialRampToValueAtTime(value, time) {
		this.value = value;
		this.calls.push(['exponentialRampToValueAtTime', value, time]);
	}
}

// nodeKind identifies what kind of Web Audio node this fake stands in for (oscillator,
// gain, biquad, bufferSource). It is kept separate from `type`, because real nodes also
// have a `type` property with a different meaning (an oscillator's waveform, a biquad
// filter's mode) that the sound module sets directly, and it must not clobber this.
class FakeNode {
	constructor(ctx, nodeKind) {
		this.ctx = ctx;
		this.nodeKind = nodeKind;
		this.connections = [];
		ctx.nodes.push(this);
	}
	connect(dest) {
		this.connections.push(dest);
		return dest;
	}
}

class FakeOscillator extends FakeNode {
	constructor(ctx) {
		super(ctx, 'oscillator');
		this.frequency = new FakeAudioParam(440);
		this.started = false;
		this.stopped = false;
		this.stopTime = null;
	}
	start(time) {
		this.started = true;
		this.startTime = time;
	}
	stop(time) {
		this.stopped = true;
		this.stopTime = time;
	}
}

class FakeGain extends FakeNode {
	constructor(ctx) {
		super(ctx, 'gain');
		this.gain = new FakeAudioParam(1);
	}
}

class FakeBiquadFilter extends FakeNode {
	constructor(ctx) {
		super(ctx, 'biquad');
		this.frequency = new FakeAudioParam(350);
		this.type = 'lowpass';
	}
}

class FakeBufferSource extends FakeNode {
	constructor(ctx) {
		super(ctx, 'bufferSource');
		this.buffer = null;
		this.started = false;
		this.stopped = false;
	}
	start(time) {
		this.started = true;
		this.startTime = time;
	}
	stop(time) {
		this.stopped = true;
		this.stopTime = time;
	}
}

class FakeAudioBuffer {
	constructor(channels, length, sampleRate) {
		this.numberOfChannels = channels;
		this.length = length;
		this.sampleRate = sampleRate;
		this._data = new Float32Array(length);
	}
	getChannelData() {
		return this._data;
	}
}

class FakeAudioContext {
	constructor() {
		this.nodes = [];
		this.currentTime = 0;
		this.state = 'running';
		this.sampleRate = 44100;
		this.destination = { connected: true };
		this.closed = false;
		FakeAudioContext.instances.push(this);
	}
	createOscillator() {
		return new FakeOscillator(this);
	}
	createGain() {
		return new FakeGain(this);
	}
	createBiquadFilter() {
		return new FakeBiquadFilter(this);
	}
	createBufferSource() {
		return new FakeBufferSource(this);
	}
	createBuffer(channels, length, sampleRate) {
		return new FakeAudioBuffer(channels, length, sampleRate);
	}
	resume() {
		this.state = 'running';
		return Promise.resolve();
	}
	close() {
		this.closed = true;
		return Promise.resolve();
	}
}
FakeAudioContext.instances = [];

describe('CUES and describeCue', () => {
	it('lists the nine expected cues', () => {
		expect(CUES).toEqual([
			'lift', 'send', 'pass', 'rival', 'seal', 'strike', 'rout', 'stamp', 'charter',
		]);
	});

	it('describes every cue with a non-empty sentence', () => {
		CUES.forEach((cue) => {
			expect(typeof describeCue(cue)).toBe('string');
			expect(describeCue(cue).length).toBeGreaterThan(0);
		});
	});

	it('returns an empty string for an unknown cue', () => {
		expect(describeCue('not-a-cue')).toBe('');
	});
});

describe('enabled state', () => {
	let originalAudioContext;

	beforeEach(() => {
		FakeAudioContext.instances = [];
		originalAudioContext = window.AudioContext;
		window.AudioContext = FakeAudioContext;
	});

	afterEach(() => {
		window.AudioContext = originalAudioContext;
	});

	it('is disabled by default when nothing is saved', () => {
		const storage = makeFakeStorage();
		const sound = createSound({ storage });
		expect(sound.enabled()).toBe(false);
	});

	it('reads a previously saved "on" state', () => {
		const storage = makeFakeStorage({ 'reclamation.sound': 'on' });
		const sound = createSound({ storage });
		expect(sound.enabled()).toBe(true);
	});

	it('setEnabled persists the new value to storage', () => {
		const storage = makeFakeStorage();
		const sound = createSound({ storage });
		sound.setEnabled(true);
		expect(sound.enabled()).toBe(true);
		expect(storage.getItem('reclamation.sound')).toBe('on');

		sound.setEnabled(false);
		expect(sound.enabled()).toBe(false);
		expect(storage.getItem('reclamation.sound')).toBe('off');
	});

	it('toggle flips the state and returns the new value', () => {
		const storage = makeFakeStorage();
		const sound = createSound({ storage });
		expect(sound.toggle()).toBe(true);
		expect(sound.enabled()).toBe(true);
		expect(sound.toggle()).toBe(false);
		expect(sound.enabled()).toBe(false);
	});

	it('swallows a storage that throws on getItem, defaulting to disabled', () => {
		const storage = makeThrowingStorage();
		const sound = createSound({ storage });
		expect(sound.enabled()).toBe(false);
	});

	it('swallows a storage that throws on setItem', () => {
		const storage = makeThrowingStorage();
		const sound = createSound({ storage });
		expect(() => sound.setEnabled(true)).not.toThrow();
	});
});

describe('play() while disabled or without AudioContext', () => {
	let originalAudioContext;

	beforeEach(() => {
		FakeAudioContext.instances = [];
		originalAudioContext = window.AudioContext;
	});

	afterEach(() => {
		window.AudioContext = originalAudioContext;
	});

	it('creates no context and does nothing when disabled', () => {
		window.AudioContext = FakeAudioContext;
		const storage = makeFakeStorage();
		const sound = createSound({ storage });
		expect(sound.enabled()).toBe(false);
		expect(() => sound.play('lift')).not.toThrow();
		expect(FakeAudioContext.instances.length).toBe(0);
	});

	it('does not throw when AudioContext is entirely unavailable, even if enabled', () => {
		delete window.AudioContext;
		delete window.webkitAudioContext;
		const storage = makeFakeStorage({ 'reclamation.sound': 'on' });
		const sound = createSound({ storage });
		expect(sound.enabled()).toBe(true);
		expect(() => sound.play('lift')).not.toThrow();
	});

	it('does not throw when the AudioContext constructor itself fails', () => {
		window.AudioContext = function () {
			throw new Error('no audio hardware');
		};
		const storage = makeFakeStorage({ 'reclamation.sound': 'on' });
		const sound = createSound({ storage });
		expect(() => sound.play('lift')).not.toThrow();
	});

	it('does nothing for an unknown cue name', () => {
		window.AudioContext = FakeAudioContext;
		const storage = makeFakeStorage({ 'reclamation.sound': 'on' });
		const sound = createSound({ storage });
		expect(() => sound.play('not-a-cue')).not.toThrow();
		expect(FakeAudioContext.instances.length).toBe(0);
	});
});

describe('play() for every cue while enabled', () => {
	beforeEach(() => {
		FakeAudioContext.instances = [];
		window.AudioContext = FakeAudioContext;
	});

	afterEach(() => {
		delete window.AudioContext;
	});

	CUES.forEach((cue) => {
		it(`schedules nodes for "${cue}" without throwing`, () => {
			const storage = makeFakeStorage({ 'reclamation.sound': 'on' });
			const sound = createSound({ storage });
			expect(() => sound.play(cue, { magnitude: 0.7 })).not.toThrow();

			expect(FakeAudioContext.instances.length).toBe(1);
			const ctx = FakeAudioContext.instances[FakeAudioContext.instances.length - 1];
			expect(ctx.nodes.length).toBeGreaterThan(0);

			// every node that can start/stop should have been scheduled, and every
			// gain node should have at least one ramp call recorded on its envelope
			const startables = ctx.nodes.filter((n) => n.nodeKind === 'oscillator' || n.nodeKind === 'bufferSource');
			expect(startables.length).toBeGreaterThan(0);
			startables.forEach((n) => {
				expect(n.started).toBe(true);
				expect(n.stopped).toBe(true);
			});

			// the first gain node created on the context is the master gain, set once
			// with a plain value and never ramped; every envelope gain a cue builds
			// after that should carry at least one ramp call
			const envelopeGains = ctx.nodes.filter((n) => n.nodeKind === 'gain').slice(1);
			expect(envelopeGains.length).toBeGreaterThan(0);
			envelopeGains.forEach((g) => {
				expect(g.gain.calls.length).toBeGreaterThan(0);
			});
		});
	});

	it('reuses a single context and noise buffer across many plays in a row', () => {
		const storage = makeFakeStorage({ 'reclamation.sound': 'on' });
		const sound = createSound({ storage });
		expect(() => {
			for (let i = 0; i < 20; i++) {
				sound.play(CUES[i % CUES.length]);
			}
		}).not.toThrow();
		expect(FakeAudioContext.instances.length).toBe(1);
	});

	it('resumes a suspended context before playing', () => {
		const storage = makeFakeStorage({ 'reclamation.sound': 'on' });
		const sound = createSound({ storage });
		sound.play('lift');
		const ctx = FakeAudioContext.instances[0];
		ctx.state = 'suspended';
		expect(() => sound.play('seal')).not.toThrow();
		expect(ctx.state).toBe('running');
	});
});

describe('dispose', () => {
	beforeEach(() => {
		FakeAudioContext.instances = [];
		window.AudioContext = FakeAudioContext;
	});

	afterEach(() => {
		delete window.AudioContext;
	});

	it('closes the underlying context once one has been created', () => {
		const storage = makeFakeStorage({ 'reclamation.sound': 'on' });
		const sound = createSound({ storage });
		sound.play('lift');
		const ctx = FakeAudioContext.instances[0];
		expect(ctx.closed).toBe(false);
		sound.dispose();
		expect(ctx.closed).toBe(true);
	});

	it('does not throw when disposing without ever having created a context', () => {
		const storage = makeFakeStorage();
		const sound = createSound({ storage });
		expect(() => sound.dispose()).not.toThrow();
	});
});
