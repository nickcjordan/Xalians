/*
	Reclamation: browser persistence (docs/design/reclamation-play-enhancements.md, Pass 1,
	item 2: "the match is saved to the browser after every engine step... a history of
	results per rival is kept locally; no server, no account").

	Every read and write is wrapped in try/catch and returns a safe default on failure (no
	storage, a private window, quota exceeded, corrupt or foreign JSON in the key, and so
	on all read the same as "nothing saved" rather than throwing into the caller). Pure
	functions, no React; the storage object is an injected dependency so tests can pass a
	fake and the functions still work with no `window` at all (returns defaults).
*/

import { GENERATOR_VERSION } from '../../../gameplay/generator/constants.js';

/*
	THE BASE (docs/design/reclamation-base-redesign.md): the saved match shape changed
	with the round (no orders, no committed map, a mutable currentHold on every board
	row), so the key is bumped to v2. A v1 save cannot be resumed and is not offered: it
	is removed the first time this module is asked for a match.
*/
const MATCH_KEY = 'reclamation.match.v2';
const LEGACY_MATCH_KEYS = ['reclamation.match.v1'];
const HISTORY_KEY = 'reclamation.history.v1';
const RIVAL_KEY = 'reclamation.rival';
const MATCH_VERSION = 1;
const HISTORY_CAP = 100;

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

function readJSON(storage, key) {
	const store = resolveStorage(storage);
	if (!store) {
		return null;
	}
	try {
		const raw = store.getItem(key);
		if (raw == null) {
			return null;
		}
		return JSON.parse(raw);
	} catch (err) {
		return null;
	}
}

function writeJSON(storage, key, value) {
	const store = resolveStorage(storage);
	if (!store) {
		return false;
	}
	try {
		store.setItem(key, JSON.stringify(value));
		return true;
	} catch (err) {
		return false;
	}
}

function removeKey(storage, key) {
	const store = resolveStorage(storage);
	if (!store) {
		return false;
	}
	try {
		store.removeItem(key);
		return true;
	} catch (err) {
		return false;
	}
}

// ---------------------------------------------------------------------------
// the match itself
// ---------------------------------------------------------------------------

/*
	saveMatch(payload, storage): payload is whatever JSON the caller gives (match state,
	seed, rivalId, log, squadIds, mode, ...); this wraps it with version 1 so a later
	shape change can tell an old save apart and discard it rather than misread it.

	The wrapper also records the generator version (hardening Decision 8). A saved match
	stores seeds, not creatures, so a resumed match regenerates its rosters; under a new
	generator those seeds expand into different creatures than the saved log names. That
	is worse than losing the save, so a generator mismatch discards exactly like a storage
	version mismatch does.
*/
export function saveMatch(payload, storage) {
	return writeJSON(storage, MATCH_KEY, { version: MATCH_VERSION, generatorVersion: GENERATOR_VERSION, payload });
}

/*
	loadMatch(storage) -> the saved payload, or null when there is nothing saved, the JSON
	is corrupt, or the saved storage version or generator version does not match what this
	build expects.
*/
export function loadMatch(storage) {
	// a Proving saved under the pre-base rules can never be resumed; drop it rather than
	// leaving it to be offered forever
	LEGACY_MATCH_KEYS.forEach((key) => removeKey(storage, key));
	const wrapper = readJSON(storage, MATCH_KEY);
	if (!wrapper || typeof wrapper !== 'object') {
		return null;
	}
	if (wrapper.version !== MATCH_VERSION) {
		return null;
	}
	if (wrapper.generatorVersion !== GENERATOR_VERSION) {
		return null;
	}
	if (!Object.prototype.hasOwnProperty.call(wrapper, 'payload')) {
		return null;
	}
	return wrapper.payload;
}

export function clearMatch(storage) {
	return removeKey(storage, MATCH_KEY);
}

// ---------------------------------------------------------------------------
// match history (a record of results per rival, kept locally)
// ---------------------------------------------------------------------------

/*
	recordResult({rivalId, won, sitesYou, sitesRival, seed, reason}, storage): appends one
	entry with an ISO `at` timestamp, capped at HISTORY_CAP entries (oldest dropped first).
*/
export function recordResult(result, storage) {
	const history = loadHistory(storage);
	const entry = { ...result, at: new Date().toISOString() };
	const next = [...history, entry];
	const capped = next.length > HISTORY_CAP ? next.slice(next.length - HISTORY_CAP) : next;
	writeJSON(storage, HISTORY_KEY, capped);
	return capped;
}

export function loadHistory(storage) {
	const history = readJSON(storage, HISTORY_KEY);
	if (!Array.isArray(history)) {
		return [];
	}
	return history;
}

/*
	recordAgainst(rivalId, storage) -> { played, won } tallied from the saved history.
*/
export function recordAgainst(rivalId, storage) {
	const history = loadHistory(storage);
	let played = 0;
	let won = 0;
	history.forEach((entry) => {
		if (!entry || entry.rivalId !== rivalId) {
			return;
		}
		played++;
		if (entry.won) {
			won++;
		}
	});
	return { played, won };
}

export function clearHistory(storage) {
	return removeKey(storage, HISTORY_KEY);
}

// ---------------------------------------------------------------------------
// the remembered rival choice
// ---------------------------------------------------------------------------

export function loadRivalId(storage) {
	const store = resolveStorage(storage);
	if (!store) {
		return null;
	}
	try {
		return store.getItem(RIVAL_KEY);
	} catch (err) {
		return null;
	}
}

export function saveRivalId(id, storage) {
	const store = resolveStorage(storage);
	if (!store) {
		return false;
	}
	try {
		store.setItem(RIVAL_KEY, id);
		return true;
	} catch (err) {
		return false;
	}
}
