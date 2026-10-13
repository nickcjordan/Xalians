// Creature Studio review screen: the server half.
//
// A plain request router over the studio library (packages/studio). It is
// mounted by studio/plugin.js as Vite dev-server middleware and is never part
// of the site bundle. Reads and writes the records under <repoRoot>/art/creatures
// and streams blobs from the studio blob store.
//
// Every write is made as Nick, through the library, so the engine's review
// rules apply (an approval needs a presented build, a preview cannot be
// approved, only Nick strikes a hold).

import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';

let libPromise;
export function loadLibrary() {
	// A literal path, so the bundler that loads vite.config.js resolves it relative to this file.
	libPromise ??= import('../../../packages/studio/src/index.ts');
	return libPromise;
}

const TYPES = {
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.webp': 'image/webp',
	'.gif': 'image/gif',
	'.svg': 'image/svg+xml',
};

/** Content type from the extension of an output's name; PNG when there is none we know. */
export function contentTypeFor(name) {
	return TYPES[path.extname(name ?? '').toLowerCase()] ?? 'image/png';
}

const json = (status, body) => ({ status, json: body });
const fail = (status, message) => json(status, { error: message });

class HttpError extends Error {
	constructor(status, message) {
		super(message);
		this.status = status;
	}
}

function need(cond, message, status = 400) {
	if (!cond) throw new HttpError(status, message);
}

/**
 * Build the router. `repoRoot` is where art/creatures lives.
 * route(method, pathname, { body, headers }) resolves to { status, json } or
 * { status, file, contentType }.
 */
export function createStudioApi({ repoRoot }) {
	async function openStore(lib, key) {
		need(/^[a-z0-9][a-z0-9-]*$/.test(key ?? ''), 'bad creature key');
		try {
			return lib.openCreature(repoRoot, key);
		} catch (e) {
			throw new HttpError(404, e.message);
		}
	}

	async function blobName(lib, sha) {
		for (const key of lib.listCreatureKeys(repoRoot)) {
			try {
				const store = lib.openCreature(repoRoot, key);
				const intake = store.load().creature.intake;
				if (intake && intake.silhouette.blob === sha) return intake.silhouette.fileName;
				for (const r of store.list('reference')) if (r.blob === sha) return r.fileName;
				for (const b of store.list('build')) {
					const out = b.outputs.find((o) => o.blob === sha);
					if (out) return out.name;
				}
			} catch {
				// A creature with an invalid record must not break image serving.
			}
		}
		return undefined;
	}

	async function route(method, pathname, { body, headers = {} } = {}) {
		const lib = await loadLibrary();
		const parts = pathname.split('/').filter(Boolean).map(decodeURIComponent);
		try {
			if (method === 'POST') {
				// A custom header cannot be sent cross-origin without a preflight we never answer,
				// so a page on another origin cannot write records through the dev server.
				need(headers['x-studio-request'] === '1', 'missing X-Studio-Request header', 403);
			}

			if (method === 'GET' && parts[0] === 'blob' && parts.length === 2) {
				const sha = parts[1];
				need(/^[0-9a-f]{64}$/.test(sha), 'bad blob hash');
				const file = lib.blobPath(sha);
				if (!existsSync(file) || !statSync(file).isFile()) return fail(404, 'no such blob');
				return { status: 200, file, contentType: contentTypeFor(await blobName(lib, sha)) };
			}

			if (parts[0] !== 'creatures') return fail(404, 'not found');

			if (method === 'GET' && parts.length === 1) {
				const out = [];
				for (const key of lib.listCreatureKeys(repoRoot)) {
					try {
						const data = lib.openCreature(repoRoot, key).load();
						out.push({ key, name: data.creature.name, alias: data.creature.alias, parts: data.parts.length, needs: lib.needsNick(data).length });
					} catch (e) {
						out.push({ key, name: key, alias: '', parts: 0, needs: 0, error: e.message });
					}
				}
				return json(200, out);
			}

			const store = await openStore(lib, parts[1]);

			if (method === 'GET' && parts.length === 2) {
				const data = store.load();
				return json(200, { ...lib.creatureBoard(data, lib.liveTemplateSha(repoRoot)), needs: lib.needsNick(data) });
			}

			if (method === 'GET' && parts[2] === 'references' && parts.length === 3) {
				return json(200, lib.referenceViews(store.load()));
			}

			if (method === 'GET' && parts[2] === 'vision' && parts.length === 3) {
				return json(200, lib.visionView(store.load()));
			}

			if (method === 'GET' && parts[2] === 'sheet' && parts.length === 3) {
				return json(200, lib.sheetView(store.load()));
			}

			if (method === 'GET' && parts[2] === 'blockout' && parts.length === 3) {
				return json(200, lib.blockoutView(store.load()));
			}

			if (method === 'POST' && parts[2] === 'blockout-marks' && parts.length === 3) {
				need(body && typeof body === 'object', 'expected a JSON body');
				need(Array.isArray(body.marks), 'marks must be a list');
				const defects = lib.markBlockoutBuild(store, { build: String(body.build ?? ''), marks: body.marks });
				return json(200, { defects });
			}

			if (method === 'POST' && parts[2] === 'pick' && parts.length === 3) {
				need(body && typeof body === 'object', 'expected a JSON body');
				const result = lib.pickImage(store, { build: String(body.build ?? ''), text: typeof body.text === 'string' ? body.text : '' });
				return json(200, { note: result.note, reference: result.reference });
			}

			if (method === 'POST' && parts[2] === 'unpick' && parts.length === 3) {
				need(body && typeof body === 'object', 'expected a JSON body');
				const result = lib.unpickImage(store, { element: String(body.element ?? '') }, { actor: 'nick' });
				return json(200, { note: result.note, builds: result.builds.map((b) => b.alias) });
			}

			if (method === 'POST' && parts[2] === 'element-adjust' && parts.length === 3) {
				need(body && typeof body === 'object', 'expected a JSON body');
				const note = lib.adjustElement(store, { element: String(body.element ?? ''), text: typeof body.text === 'string' ? body.text : '' });
				return json(200, { note });
			}

			if (method === 'POST' && parts[2] === 'sheet-marks' && parts.length === 3) {
				need(body && typeof body === 'object', 'expected a JSON body');
				need(Array.isArray(body.marks), 'marks must be a list');
				const defects = lib.markSheetImage(store, { build: String(body.build ?? ''), marks: body.marks });
				return json(200, { defects });
			}

			if (method === 'POST' && parts[2] === 'stage-review' && parts.length === 3) {
				need(body && typeof body === 'object', 'expected a JSON body');
				const result = lib.recordStageReview(store, { stage: String(body.stage ?? ''), verdict: body.verdict, text: typeof body.text === 'string' ? body.text : '' });
				return json(200, { note: result.note, applied: result.applied });
			}

			if (method === 'GET' && parts[2] === 'needs' && parts.length === 3) {
				return json(200, lib.needsNick(store.load()));
			}

			if (method === 'GET' && parts[2] === 'parts' && parts.length === 3) {
				const data = store.load();
				const report = lib.status(data, lib.liveTemplateSha(repoRoot));
				const names = new Map(data.parts.map((p) => [p.id, p.name]));
				return json(200, report.parts.map((p) => ({ ...p, name: names.get(p.id) ?? p.key })));
			}

			if (method === 'GET' && parts[2] === 'parts' && parts.length === 4) {
				try {
					return json(200, lib.partView(store.load(), parts[3]));
				} catch (e) {
					throw new HttpError(404, e.message);
				}
			}

			if (method === 'POST' && parts[2] === 'review' && parts.length === 3) {
				need(body && typeof body === 'object', 'expected a JSON body');
				const marks = Array.isArray(body.marks) ? body.marks : [];
				const result = lib.recordReview(store, {
					build: String(body.build ?? ''),
					verdict: body.verdict,
					text: typeof body.text === 'string' ? body.text : '',
					holdsStruck: Array.isArray(body.holdsStruck) ? body.holdsStruck : [],
					defectsClosed: Array.isArray(body.defectsClosed) ? body.defectsClosed : [],
					marks,
				});
				return json(200, { note: result.note, defects: result.defects, applied: result.applied });
			}

			if (method === 'POST' && parts[2] === 'holds' && parts[4] === 'strike' && parts.length === 5) {
				need(body && typeof body === 'object', 'expected a JSON body');
				const hold = lib.strikeHold(store, parts[3], typeof body.reason === 'string' ? body.reason : '');
				return json(200, { hold });
			}

			if (method === 'POST' && parts[2] === 'choose' && parts.length === 3) {
				need(body && typeof body === 'object', 'expected a JSON body');
				need(Array.isArray(body.builds), 'builds must be a list');
				const result = lib.recordChoice(store, { builds: body.builds, chosen: String(body.chosen ?? ''), text: typeof body.text === 'string' ? body.text : '' });
				return json(200, { note: result.note, chosen: result.chosen });
			}

			return fail(404, 'not found');
		} catch (e) {
			if (e instanceof HttpError) return fail(e.status, e.message);
			// The library throws StudioError for every rule it enforces: those are 409s, the rest are bugs.
			if (e && e.name === 'StudioError') return fail(409, e.message);
			if (e && e.name === 'ZodError') return fail(400, e.issues?.[0]?.message ?? 'invalid input');
			return fail(500, e instanceof Error ? e.message : String(e));
		}
	}

	return { route };
}

const PREFIX = '/__studio/api/';

/** Connect-style middleware around a router. */
export function studioMiddleware(api) {
	return async (req, res, next) => {
		const url = req.url ?? '';
		if (!url.startsWith(PREFIX)) return next();
		const [pathname] = url.slice(PREFIX.length).split('?');
		let body;
		if (req.method === 'POST') {
			const chunks = [];
			for await (const c of req) chunks.push(c);
			const text = Buffer.concat(chunks).toString('utf8');
			if (text) {
				try {
					body = JSON.parse(text);
				} catch {
					res.statusCode = 400;
					res.setHeader('Content-Type', 'application/json');
					res.end(JSON.stringify({ error: 'body is not valid JSON' }));
					return;
				}
			}
		}
		const result = await api.route(req.method ?? 'GET', pathname, { body, headers: req.headers ?? {} });
		res.statusCode = result.status;
		res.setHeader('Cache-Control', 'no-store');
		if (result.file) {
			res.setHeader('Content-Type', result.contentType);
			res.setHeader('X-Content-Type-Options', 'nosniff');
			// A blob is addressed by its hash, so it never changes.
			res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
			createReadStream(result.file).pipe(res);
			return;
		}
		res.setHeader('Content-Type', 'application/json');
		res.end(JSON.stringify(result.json));
	};
}
