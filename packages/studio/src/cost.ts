import { closeSync, existsSync, openSync, readdirSync, readFileSync, readSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export interface TokenTotals {
	input: number;
	output: number;
	cacheRead: number;
	cacheWrite: number;
}

export interface AgentCost {
	file: string;
	description: string;
	model?: string;
	tokens: TokenTotals;
	minutes: number;
}

export interface BuildCost {
	agents: AgentCost[];
	/** Sum over matched subagents only. */
	tokens: TokenTotals;
	agentMinutes: number;
	/** Main-session spend in the window. Approximate: a session may do other work in it. */
	orchestrator: { tokens: TokenTotals; messages: number; approximate: true };
	/** Assistant messages (unique by id) that carried no usage, so their spend is unknown. */
	uncovered: { subagentMessages: number; orchestratorMessages: number };
}

export interface CollectOptions {
	/** The build alias, for example `B-k3f9`; matched as `[B-k3f9]`. */
	buildTag: string;
	since: string | Date;
	until: string | Date;
	/** Defaults to ~/.claude/projects. */
	projectsDir?: string;
	/** 'bracket' (default) matches `[tag]`; 'substring' matches the tag text anywhere. */
	match?: 'bracket' | 'substring';
}

export const zeroTokens = (): TokenTotals => ({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0 });

export function addTokens(a: TokenTotals, b: TokenTotals): TokenTotals {
	return { input: a.input + b.input, output: a.output + b.output, cacheRead: a.cacheRead + b.cacheRead, cacheWrite: a.cacheWrite + b.cacheWrite };
}

export function formatTokens(t: TokenTotals): string {
	return `in ${t.input}, out ${t.output}, cache read ${t.cacheRead}, cache write ${t.cacheWrite}`;
}

interface Tally {
	byId: Map<string, TokenTotals>;
	missing: Set<string>;
	first?: number;
	last?: number;
	model?: string;
}

function usageOf(u: any): TokenTotals | undefined {
	if (!u || typeof u !== 'object') return undefined;
	const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
	return { input: n(u.input_tokens), output: n(u.output_tokens), cacheRead: n(u.cache_read_input_tokens), cacheWrite: n(u.cache_creation_input_tokens) };
}

/** Streams a JSONL file line by line (real transcripts exceed the 512 MB string limit). Return true from `fn` to stop. */
function eachLine(file: string, fn: (value: any) => boolean | void): void {
	const fd = openSync(file, 'r');
	try {
		const chunk = Buffer.allocUnsafe(1 << 20);
		let carry: Buffer[] = [];
		const emit = (parts: Buffer[]): boolean => {
			const text = Buffer.concat(parts).toString('utf8');
			if (!text.trim()) return false;
			let value: any;
			try {
				value = JSON.parse(text);
			} catch {
				return false; // A partially written final line is normal for a live session.
			}
			return fn(value) === true;
		};
		for (;;) {
			const n = readSync(fd, chunk, 0, chunk.length, null);
			if (n === 0) break;
			let start = 0;
			for (let i = 0; i < n; i++) {
				if (chunk[i] !== 0x0a) continue;
				carry.push(Buffer.from(chunk.subarray(start, i)));
				start = i + 1;
				const stop = emit(carry);
				carry = [];
				if (stop) return;
			}
			if (start < n) carry.push(Buffer.from(chunk.subarray(start, n)));
		}
		if (carry.length) emit(carry);
	} finally {
		closeSync(fd);
	}
}

/**
 * The same message appears on several lines (one per content block). Usage repeats on each,
 * and a streamed message can show a smaller output count on an earlier line, so per id we keep
 * the largest value seen in each category.
 */
function tally(file: string, keep: (line: any, ms: number) => boolean): Tally {
	const t: Tally = { byId: new Map(), missing: new Set() };
	let anon = 0;
	eachLine(file, (line) => {
		const ms = Date.parse(line.timestamp ?? '');
		if (!keep(line, ms)) return;
		if (Number.isFinite(ms)) {
			t.first = t.first === undefined ? ms : Math.min(t.first, ms);
			t.last = t.last === undefined ? ms : Math.max(t.last, ms);
		}
		if (line.type !== 'assistant' || !line.message) return;
		if (typeof line.message.model === 'string' && line.message.model !== '<synthetic>') t.model = line.message.model;
		const id: string = typeof line.message.id === 'string' ? line.message.id : `anon-${anon++}`;
		const u = usageOf(line.message.usage);
		if (!u) {
			if (!t.byId.has(id)) t.missing.add(id);
			return;
		}
		t.missing.delete(id);
		const prev = t.byId.get(id);
		t.byId.set(id, prev ? { input: Math.max(prev.input, u.input), output: Math.max(prev.output, u.output), cacheRead: Math.max(prev.cacheRead, u.cacheRead), cacheWrite: Math.max(prev.cacheWrite, u.cacheWrite) } : u);
	});
	return t;
}

function sum(t: Tally): TokenTotals {
	let total = zeroTokens();
	for (const u of t.byId.values()) total = addTokens(total, u);
	return total;
}

function firstUserText(file: string): string {
	let text = '';
	eachLine(file, (line) => {
		if (line.type !== 'user' || !line.message) return;
		const c = line.message.content;
		text = typeof c === 'string' ? c : Array.isArray(c) ? c.map((p: any) => (typeof p === 'string' ? p : typeof p?.text === 'string' ? p.text : '')).join('\n') : '';
		return true;
	});
	return text;
}

function readMeta(file: string): { description?: string; model?: string } {
	if (!existsSync(file)) return {};
	try {
		const m = JSON.parse(readFileSync(file, 'utf8'));
		return { ...(typeof m.description === 'string' ? { description: m.description } : {}), ...(typeof m.model === 'string' ? { model: m.model } : {}) };
	} catch {
		return {};
	}
}

export function defaultProjectsDir(): string {
	return join(process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), '.claude'), 'projects');
}

function isDir(p: string): boolean {
	try {
		return statSync(p).isDirectory();
	} catch {
		return false;
	}
}

export function collectBuildCost(opts: CollectOptions): BuildCost {
	const projects = opts.projectsDir ?? defaultProjectsDir();
	const since = new Date(opts.since).getTime();
	const until = new Date(opts.until).getTime();
	const needle = opts.match === 'substring' ? opts.buildTag : `[${opts.buildTag.replace(/^\[|\]$/g, '')}]`;

	const agents: AgentCost[] = [];
	let tokens = zeroTokens();
	let agentMinutes = 0;
	let orch = zeroTokens();
	let orchMessages = 0;
	const uncovered = { subagentMessages: 0, orchestratorMessages: 0 };

	const slugs = existsSync(projects) ? readdirSync(projects).filter((n) => n.toLowerCase().includes('xalians') && isDir(join(projects, n))) : [];
	for (const slug of slugs) {
		const slugDir = join(projects, slug);
		for (const name of readdirSync(slugDir)) {
			const full = join(slugDir, name);
			if (name.endsWith('.jsonl')) {
				// A session file last written before the window cannot hold messages inside it.
				if (statSync(full).mtimeMs < since) continue;
				const t = tally(full, (line, ms) => line.isSidechain !== true && line.type === 'assistant' && ms >= since && ms <= until && /xalians/i.test(String(line.cwd ?? '')));
				orch = addTokens(orch, sum(t));
				orchMessages += t.byId.size;
				uncovered.orchestratorMessages += t.missing.size;
			} else if (isDir(full)) {
				const subDir = join(full, 'subagents');
				if (!isDir(subDir)) continue;
				for (const f of readdirSync(subDir)) {
					if (!/^agent-.*\.jsonl$/.test(f)) continue;
					const file = join(subDir, f);
					const meta = readMeta(join(subDir, f.replace(/\.jsonl$/, '.meta.json')));
					const description = meta.description ?? '';
					if (!description.includes(needle) && !firstUserText(file).includes(needle)) continue;
					const t = tally(file, () => true);
					const model = meta.model ?? t.model;
					const row: AgentCost = {
						file: `${slug}/${name}/subagents/${f}`,
						description,
						...(model ? { model } : {}),
						tokens: sum(t),
						minutes: t.first !== undefined && t.last !== undefined ? Math.round(((t.last - t.first) / 60000) * 100) / 100 : 0,
					};
					agents.push(row);
					tokens = addTokens(tokens, row.tokens);
					agentMinutes += row.minutes;
					uncovered.subagentMessages += t.missing.size;
				}
			}
		}
	}
	agents.sort((a, b) => a.file.localeCompare(b.file));
	return { agents, tokens, agentMinutes: Math.round(agentMinutes * 100) / 100, orchestrator: { tokens: orch, messages: orchMessages, approximate: true }, uncovered };
}

export function uncoveredText(c: BuildCost): string | undefined {
	const parts: string[] = [];
	if (c.uncovered.subagentMessages) parts.push(`${c.uncovered.subagentMessages} subagent message(s) had no usage`);
	if (c.uncovered.orchestratorMessages) parts.push(`${c.uncovered.orchestratorMessages} orchestrator message(s) had no usage`);
	return parts.length ? `${parts.join('; ')}; their spend is not counted` : undefined;
}
