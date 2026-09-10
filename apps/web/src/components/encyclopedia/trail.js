// Trail and read marks for the Encyclopedia. Per-browser only (localStorage),
// never synced, never sent anywhere. Every storage access is guarded so a
// blocked or empty store renders exactly like a first visit.
// Contract: docs/design/xalian-encyclopedia-ux-pass.md "Trail".

import { useCallback, useEffect, useState } from 'react';

const TRAIL_KEY = 'enc.trail.v1';
const READ_KEY = 'enc.read.v1';
const STORY_POSITION_KEY = 'enc.story.v1';
const TRAIL_LIMIT = 8;
const EVENT = 'enc-trail-change';

function load(key, fallback) {
	try {
		const raw = window.localStorage.getItem(key);
		return raw ? JSON.parse(raw) : fallback;
	} catch (e) {
		return fallback;
	}
}

function save(key, value) {
	try {
		window.localStorage.setItem(key, JSON.stringify(value));
	} catch (e) {
		/* storage unavailable: behave as if nothing is remembered */
	}
	try {
		window.dispatchEvent(new Event(EVENT));
	} catch (e) {
		/* no window */
	}
}

function id(kind, key) {
	return `${kind}:${key}`;
}

export function getTrail() {
	const trail = load(TRAIL_KEY, []);
	return Array.isArray(trail) ? trail : [];
}

export function recordVisit({ kind, key, name, element }) {
	if (!kind || !key) return;
	const visit = { kind, key, name: name || key, element: element || null, at: Date.now() };
	const rest = getTrail().filter((v) => id(v.kind, v.key) !== id(kind, key));
	save(TRAIL_KEY, [visit, ...rest].slice(0, TRAIL_LIMIT));
}

export function clearTrail() {
	save(TRAIL_KEY, []);
}

export function isRead(kind, key) {
	const read = load(READ_KEY, {});
	return Boolean(read && read[id(kind, key)]);
}

export function markRead(kind, key) {
	if (!kind || !key) return;
	const read = load(READ_KEY, {});
	if (read[id(kind, key)]) return;
	read[id(kind, key)] = Date.now();
	save(READ_KEY, read);
}

function useStorageVersion() {
	const [version, setVersion] = useState(0);
	useEffect(() => {
		const bump = () => setVersion((v) => v + 1);
		window.addEventListener(EVENT, bump);
		window.addEventListener('storage', bump);
		return () => {
			window.removeEventListener(EVENT, bump);
			window.removeEventListener('storage', bump);
		};
	}, []);
	return version;
}

/** [trail, clear]; re-renders when any component records a visit. */
export function useTrail() {
	const version = useStorageVersion();
	const [trail, setTrail] = useState(getTrail);
	useEffect(() => {
		setTrail(getTrail());
	}, [version]);
	const clear = useCallback(() => clearTrail(), []);
	return [trail, clear];
}

/**
 * Records a visit and marks the record read on mount. Returns whether the
 * record had already been read before this visit (so a page can show
 * "reviewed" without lighting on the very first open).
 */
export function useVisit({ kind, key, name, element }) {
	const [wasRead] = useState(() => isRead(kind, key));
	useEffect(() => {
		recordVisit({ kind, key, name, element });
		markRead(kind, key);
	}, [kind, key, name, element]);
	return wasRead;
}

/** Read-only check that re-renders when marks change. */
export function useReadMark(kind, key) {
	const version = useStorageVersion();
	const [read, setRead] = useState(() => isRead(kind, key));
	useEffect(() => {
		setRead(isRead(kind, key));
	}, [kind, key, version]);
	return read;
}

// ---- story position (resume) ------------------------------------------
// Remembers the reader's furthest-along part of The Story, per browser.
// Same guards as the rest of this file: a blocked or empty store behaves
// exactly like no position has ever been recorded.

export function recordStoryPosition(eraKey) {
	if (!eraKey) return;
	save(STORY_POSITION_KEY, { eraKey, at: Date.now() });
}

export function getResume() {
	const stored = load(STORY_POSITION_KEY, null);
	if (!stored || !stored.eraKey) return null;
	return { eraKey: stored.eraKey };
}

/** Re-renders when the story position changes (including in another tab). */
export function useResume() {
	const version = useStorageVersion();
	const [resume, setResume] = useState(getResume);
	useEffect(() => {
		setResume(getResume());
	}, [version]);
	return resume;
}
