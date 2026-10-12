import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { creatureDir } from './store.ts';
import { KIND_DIR, NoteSchema, type Note } from './schema.ts';

/** One line for a review or decision note by Nick, or undefined for any other note. */
export function noteLine(note: Note, aliasOf: (id: string | undefined) => string): string | undefined {
	if (note.by !== 'nick') return undefined;
	const text = note.text.replace(/\s+/g, ' ').trim();
	if (note.kind === 'review') return `REVIEW ${aliasOf(note.about?.build ?? note.about?.part)} ${note.verdict ?? 'comment'}: ${text}`;
	if (note.kind === 'decision') return `DECISION ${aliasOf(note.about?.build ?? note.about?.part)}: ${text}`;
	return undefined;
}

function readNotes(dir: string): Note[] {
	const notesDir = join(dir, KIND_DIR.note);
	if (!existsSync(notesDir)) return [];
	const out: Note[] = [];
	for (const f of readdirSync(notesDir)) {
		if (!f.endsWith('.json')) continue;
		try {
			out.push(NoteSchema.parse(JSON.parse(readFileSync(join(notesDir, f), 'utf8'))));
		} catch {
			// A half-written or invalid file is picked up on the next poll or reported by `studio verify`.
		}
	}
	return out.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function aliasLookup(dir: string): (id: string | undefined) => string {
	const map = new Map<string, string>();
	for (const sub of [KIND_DIR.build, KIND_DIR.part]) {
		const d = join(dir, sub);
		if (!existsSync(d)) continue;
		for (const f of readdirSync(d)) {
			if (!f.endsWith('.json')) continue;
			try {
				const r = JSON.parse(readFileSync(join(d, f), 'utf8')) as { id: string; alias: string };
				map.set(r.id, r.alias);
			} catch {
				// ignore
			}
		}
	}
	return (id) => (id ? (map.get(id) ?? id) : '-');
}

/** Scans once. `seen` holds the ids already reported; it is updated in place. Returns the new lines, oldest first. */
export function scanNewReviews(repoRoot: string, key: string, seen: Set<string>): string[] {
	const dir = creatureDir(repoRoot, key);
	const lines: string[] = [];
	let alias: ((id: string | undefined) => string) | undefined;
	for (const note of readNotes(dir)) {
		if (seen.has(note.id)) continue;
		seen.add(note.id);
		alias ??= aliasLookup(dir);
		const line = noteLine(note, alias);
		if (line) lines.push(line);
	}
	return lines;
}

export interface WatchOptions {
	intervalMs?: number;
	/** Report notes that already exist when the watch starts. Off by default: only new ones print. */
	includeExisting?: boolean;
}

/** Polls the notes folder (every 2 seconds by default) and calls `onLine` for each new review or decision by Nick. Returns a stop function. */
export function watchReviews(repoRoot: string, key: string, onLine: (line: string) => void, opts: WatchOptions = {}): () => void {
	const seen = new Set<string>();
	if (!opts.includeExisting) scanNewReviews(repoRoot, key, seen);
	const timer = setInterval(() => {
		for (const line of scanNewReviews(repoRoot, key, seen)) onLine(line);
	}, opts.intervalMs ?? 2000);
	return () => clearInterval(timer);
}
