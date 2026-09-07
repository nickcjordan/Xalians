/*
	Reclamation: quiet local instrumentation (docs/design/game-validation-principles.md
	section 3, "Quiet instrumentation" — decision timing by phase and round, how often
	previews are consulted before committing, when skip is pressed and how far into the
	thing being skipped, whether first-time guidance is dismissed before or after its
	lesson is used, and the setup choices). Everything here is local, exportable, never
	sent anywhere.

	Same discipline as reclamationStorage.js: pure functions, no React, storage and clock
	injected so tests can pass fakes (createTelemetry({ storage, now })). Every read and
	write is wrapped so a missing or throwing storage degrades to safe defaults rather
	than throwing into the caller — the table must never break because a private window
	blocked localStorage.
*/

const TELEMETRY_KEY = 'reclamation.telemetry.v1';
const NOTES_KEY = 'reclamation.notes.v1';
const TELEMETRY_CAP = 100;
const NOTES_CAP = 100;

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

function readList(storage, key) {
	const list = readJSON(storage, key);
	return Array.isArray(list) ? list : [];
}

function appendCapped(storage, key, entry, cap) {
	const list = readList(storage, key);
	const next = [...list, entry];
	const capped = next.length > cap ? next.slice(next.length - cap) : next;
	writeJSON(storage, key, capped);
	return capped;
}

function mean(values) {
	if (!values || values.length === 0) {
		return 0;
	}
	return values.reduce((a, b) => a + b, 0) / values.length;
}

function median(values) {
	if (!values || values.length === 0) {
		return 0;
	}
	const sorted = values.slice().sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function under2sShare(values) {
	if (!values || values.length === 0) {
		return 0;
	}
	const under = values.filter((v) => v < 2000).length;
	return under / values.length;
}

function summarizeDecisions(records) {
	const ms = records.map((r) => r.ms);
	return {
		count: records.length,
		meanMs: Math.round(mean(ms)),
		medianMs: Math.round(median(ms)),
		under2sShare: under2sShare(ms),
		hoversBeforeSend: Math.round(mean(records.map((r) => r.hovers || 0)) * 100) / 100,
	};
}

function summarizeByRound(deployRecords, ordersRecords) {
	const rounds = new Map();
	const touch = (round) => {
		if (!rounds.has(round)) {
			rounds.set(round, { round, deployMs: [], ordersMs: [], hovers: [] });
		}
		return rounds.get(round);
	};
	deployRecords.forEach((r) => {
		const bucket = touch(r.round);
		bucket.deployMs.push(r.ms);
		bucket.hovers.push(r.hovers || 0);
	});
	ordersRecords.forEach((r) => {
		const bucket = touch(r.round);
		bucket.ordersMs.push(r.ms);
	});
	return [...rounds.values()]
		.sort((a, b) => a.round - b.round)
		.map((bucket) => ({
			round: bucket.round,
			deployMeanMs: bucket.deployMs.length ? Math.round(mean(bucket.deployMs)) : null,
			ordersMeanMs: bucket.ordersMs.length ? Math.round(mean(bucket.ordersMs)) : null,
			hovers: bucket.hovers.reduce((a, b) => a + b, 0),
		}));
}

function summarizeSkips(records) {
	const ms = records.map((r) => r.ms);
	return { count: records.length, meanMs: Math.round(mean(ms)) };
}

/*
	createTelemetry({ storage, now }) -> the instrumentation object described in the task
	brief. `now` defaults to Date.now and is injected so tests can control elapsed time
	exactly; `storage` defaults to window.localStorage (see resolveStorage above).

	The object tracks one in-progress match's counters in memory (never persisted until
	endMatch), plus hover counts since the last decisionStart, so hover('site'|'record'|
	'inspect') attributes each preview consulted to the decision it happened during.
*/
export function createTelemetry({ storage, now } = {}) {
	const clock = typeof now === 'function' ? now : () => Date.now();

	let matchMeta = null; // { seed, rivalId, mode, draft, resumed, startedAt }
	let deployRecords = [];
	let ordersRecords = [];
	let skipRecords = { playback: [], rival: [] };
	let coachInfo = { dismissed: false, beforeFirstOrders: null };
	let soundOn = null;
	let marks = [];

	// { phase, round, startedAt, hovers } for the decision currently open, per phase
	let openDecisions = {};

	function beginMatch({ seed, rivalId, mode, draft, resumed }) {
		matchMeta = {
			seed, rivalId, mode, draft: draft || 'none', resumed: !!resumed, startedAt: clock(),
		};
		deployRecords = [];
		ordersRecords = [];
		skipRecords = { playback: [], rival: [] };
		coachInfo = { dismissed: false, beforeFirstOrders: null };
		soundOn = null;
		marks = [];
		openDecisions = {};
	}

	function mark(name, data) {
		marks.push({ name, data: data || null, at: clock() });
	}

	// decisionStart(phase, data): data is optional, e.g. { round }, kept only to attach
	// the round index to the decision recorded at decisionEnd.
	function decisionStart(phase, data) {
		openDecisions[phase] = { startedAt: clock(), hovers: 0, round: data && typeof data.round === 'number' ? data.round : undefined };
	}

	// decisionEnd(phase, choice, data): data is optional and can override/supply the
	// round index if it was not known at decisionStart.
	function decisionEnd(phase, choice, data) {
		const open = openDecisions[phase];
		if (!open) {
			return;
		}
		const ms = Math.max(0, clock() - open.startedAt);
		const round = data && typeof data.round === 'number' ? data.round : open.round;
		const record = { ms, hovers: open.hovers, choice, round };
		if (phase === 'deploy') {
			deployRecords.push(record);
		} else if (phase === 'orders') {
			ordersRecords.push(record);
		}
		delete openDecisions[phase];
	}

	function hover(kind) {
		Object.keys(openDecisions).forEach((phase) => {
			openDecisions[phase].hovers += 1;
		});
		mark('hover', { kind });
	}

	function skip(kind, msSincePlaybackStart) {
		const ms = typeof msSincePlaybackStart === 'number' && msSincePlaybackStart >= 0 ? msSincePlaybackStart : 0;
		if (kind === 'playback' || kind === 'rival') {
			skipRecords[kind].push({ ms });
		}
		mark('skip', { kind, ms });
	}

	function coachDismissed({ beforeFirstOrders }) {
		coachInfo = { dismissed: true, beforeFirstOrders: !!beforeFirstOrders };
		mark('coachDismissed', { beforeFirstOrders: !!beforeFirstOrders });
	}

	function soundToggled(on) {
		soundOn = !!on;
		mark('soundToggled', { on: !!on });
	}

	// the in-progress counters, for the debug hook (window.__reclamationDebug.telemetry())
	function snapshot() {
		return {
			match: matchMeta,
			decisions: {
				deploy: summarizeDecisions(deployRecords),
				orders: summarizeDecisions(ordersRecords),
			},
			byRound: summarizeByRound(deployRecords, ordersRecords),
			skips: {
				playback: summarizeSkips(skipRecords.playback),
				rival: summarizeSkips(skipRecords.rival),
			},
			coach: { ...coachInfo },
			soundOn,
			marks: marks.slice(),
		};
	}

	function endMatch({ won, sitesYou, sitesRival, reason }) {
		const endedAt = clock();
		const meta = matchMeta || { seed: null, rivalId: null, mode: null, draft: 'none', resumed: false, startedAt: endedAt };
		const summary = {
			seed: meta.seed,
			rivalId: meta.rivalId,
			mode: meta.mode,
			draft: meta.draft,
			resumed: meta.resumed,
			startedAt: meta.startedAt,
			endedAt,
			won: !!won,
			sitesYou: sitesYou || 0,
			sitesRival: sitesRival || 0,
			reason: reason || null,
			decisions: {
				deploy: summarizeDecisions(deployRecords),
				orders: summarizeDecisions(ordersRecords),
			},
			byRound: summarizeByRound(deployRecords, ordersRecords),
			skips: {
				playback: summarizeSkips(skipRecords.playback),
				rival: summarizeSkips(skipRecords.rival),
			},
			coach: { ...coachInfo },
			soundOn,
		};
		appendCapped(storage, TELEMETRY_KEY, summary, TELEMETRY_CAP);
		return summary;
	}

	function saveNotes({ seed, rivalId, won, tension, obvious, earned }) {
		const entry = {
			seed: seed != null ? seed : null,
			rivalId: rivalId || null,
			won: !!won,
			tension: tension || '',
			obvious: obvious || '',
			earned: earned || 'unsure',
			at: new Date(clock()).toISOString(),
		};
		return appendCapped(storage, NOTES_KEY, entry, NOTES_CAP);
	}

	function loadNotes() {
		return readList(storage, NOTES_KEY);
	}

	function loadTelemetry() {
		return readList(storage, TELEMETRY_KEY);
	}

	function exportAll() {
		const payload = {
			exportedAt: new Date(clock()).toISOString(),
			notes: loadNotes(),
			telemetry: loadTelemetry(),
		};
		return JSON.stringify(payload, null, 2);
	}

	function clearAll() {
		writeJSON(storage, NOTES_KEY, []);
		writeJSON(storage, TELEMETRY_KEY, []);
	}

	return {
		beginMatch,
		mark,
		decisionStart,
		decisionEnd,
		hover,
		skip,
		coachDismissed,
		soundToggled,
		endMatch,
		saveNotes,
		loadNotes,
		loadTelemetry,
		exportAll,
		clearAll,
		snapshot,
	};
}

export default createTelemetry;
