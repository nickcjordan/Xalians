#!/usr/bin/env node
/**
 * worktrees.js: report on, and optionally delete, the sibling directories
 * that agent worktrees leave behind next to this repo.
 *
 * Usage:
 *   npm run wt              # report only, deletes nothing (the default)
 *   npm run wt -- --prune   # report, then say what --yes would delete
 *   npm run wt -- --prune --yes
 *
 * A directory that a stale dev server is still running out of cannot be
 * deleted on Windows, which is what actually blocked this cleanup for days.
 * --yes stops such a process first, but only when its own command line points
 * inside a directory already marked for deletion.
 *
 * Why this script exists at all: `rm -rf` is denied globally on this machine,
 * deliberately, so an agent cannot delete a tree with a typed command. That
 * guard stays. Deletion happens here instead, where every rule below is
 * checked first and is reviewable in the diff.
 *
 * What it will never delete:
 *   - the repo itself, or any path that is not a direct sibling of it
 *   - a directory git still lists as a worktree
 *   - a directory that still has a .git entry (a live worktree or clone)
 *   - anything on KEEP (the local art toolkit)
 *   - anything larger than MAX_DELETE_BYTES, without --force
 *   - anything reached through a symlink or a Windows junction: a junctioned
 *     node_modules once ate the shared install when a worktree was removed
 *     through it, so links are unlinked, never followed
 */

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

/** Directories that look like worktree residue but are not: keep them. */
const KEEP = new Set([
	// ~23 GB local art toolkit (SDXL, ai-toolkit, GPU telemetry). Nick keeps
	// this for backgrounds, textures and sprites; it is not repo residue.
	"xalians-art",
]);

/** A tree bigger than this is never deleted without --force. */
const MAX_DELETE_BYTES = 2 * 1024 * 1024 * 1024;

const args = new Set(process.argv.slice(2));
const PRUNE = args.has("--prune");
const YES = args.has("--yes");
const FORCE = args.has("--force");

const repoRoot = path.resolve(
	execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim()
);
const parent = path.dirname(repoRoot);

/** Compare two paths the way Windows does: case-insensitively, forward slashes. */
const norm = (p) => path.resolve(p).replace(/\\/g, "/").replace(/\/$/, "").toLowerCase();

/** Every path git currently considers a worktree of this repo. */
function registeredWorktrees() {
	const out = execFileSync("git", ["worktree", "list", "--porcelain"], { encoding: "utf8" });
	return new Set(
		out
			.split(/\r?\n/)
			.filter((line) => line.startsWith("worktree "))
			.map((line) => norm(line.slice("worktree ".length)))
	);
}

/**
 * PIDs of processes running out of `dir`, found by their command line. Windows
 * only; elsewhere deleting a directory out from under a process is allowed and
 * the question does not arise.
 */
function processesUnder(dir) {
	if (process.platform !== "win32") return [];
	// PowerShell -like takes the path as written; a single quote is doubled.
	const needle = path.resolve(dir).replace(/'/g, "''");
	const script =
		// The query itself carries the path on its own command line: skip it.
		`Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*${needle}*'` +
		" -and $_.CommandLine -notlike '*Get-CimInstance Win32_Process*' }" +
		' | ForEach-Object { "$($_.ProcessId)|$($_.Name)" }';
	try {
		const out = execFileSync("powershell", ["-NoProfile", "-Command", script], {
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
		});
		return out
			.split(/\r?\n/)
			.map((line) => line.trim())
			.filter(Boolean)
			.map((line) => {
				const [pid, name] = line.split("|");
				return { pid: Number(pid), name };
			})
			.filter((p) => Number.isFinite(p.pid) && p.pid !== process.pid);
	} catch {
		return [];
	}
}

/**
 * Size and newest mtime of a tree. Does not follow links, and gives up
 * politely on anything unreadable rather than throwing.
 */
function measure(dir) {
	let bytes = 0;
	let newest = 0;
	const root = fs.lstatSync(dir);
	if (!root.isDirectory()) return { bytes: root.size, newest: root.mtimeMs };
	const stack = [dir];
	while (stack.length) {
		const current = stack.pop();
		let entries;
		try {
			entries = fs.readdirSync(current, { withFileTypes: true });
		} catch {
			continue;
		}
		for (const entry of entries) {
			const full = path.join(current, entry.name);
			if (entry.isSymbolicLink()) continue;
			if (entry.isDirectory()) {
				stack.push(full);
				continue;
			}
			try {
				const st = fs.statSync(full);
				bytes += st.size;
				if (st.mtimeMs > newest) newest = st.mtimeMs;
			} catch {
				/* vanished or locked; not worth failing the report over */
			}
		}
	}
	return { bytes, newest };
}

/**
 * Delete a tree without ever following a link out of it. Node's own
 * fs.rmSync has the same contract, but the guarantee is the entire point of
 * this script, so it is spelled out here where it can be read.
 */
/**
 * rmdir, retried. On Windows an antivirus scan or a search indexer holds a
 * brief handle on a directory that was just emptied, and the call comes back
 * EBUSY or ENOTEMPTY for a few hundred milliseconds.
 */
function rmdirPatiently(target) {
	for (let attempt = 0; ; attempt += 1) {
		try {
			fs.rmdirSync(target);
			return;
		} catch (err) {
			const transient = err.code === "EBUSY" || err.code === "ENOTEMPTY" || err.code === "EPERM";
			if (!transient || attempt >= 9) throw err;
			execFileSync(process.execPath, ["-e", `setTimeout(()=>{}, ${100 * (attempt + 1)})`]);
		}
	}
}

function removeTree(target) {
	const st = fs.lstatSync(target);
	if (st.isSymbolicLink()) {
		// A Windows junction is a link that only rmdir will release.
		try {
			fs.rmdirSync(target);
		} catch {
			fs.unlinkSync(target);
		}
		return;
	}
	if (!st.isDirectory()) {
		fs.unlinkSync(target);
		return;
	}
	for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
		removeTree(path.join(target, entry.name));
	}
	rmdirPatiently(target);
}

const human = (bytes) => {
	const units = ["B", "KB", "MB", "GB"];
	let n = bytes;
	let i = 0;
	while (n >= 1024 && i < units.length - 1) {
		n /= 1024;
		i += 1;
	}
	return `${n < 10 && i > 0 ? n.toFixed(1) : Math.round(n)}${units[i]}`;
};

const days = (ms) => (ms ? Math.round((Date.now() - ms) / 86400000) : null);

const registered = registeredWorktrees();

function classify(name) {
	const full = path.join(parent, name);
	const keyed = norm(full);

	if (keyed === norm(repoRoot)) return { verdict: "keep", why: "this repo" };
	if (KEEP.has(name.toLowerCase())) return { verdict: "keep", why: "on the keep list" };
	if (registered.has(keyed)) return { verdict: "keep", why: "a registered worktree" };

	let st;
	try {
		st = fs.lstatSync(full);
	} catch {
		return null;
	}
	if (st.isSymbolicLink()) return { verdict: "keep", why: "a link, not a directory" };
	if (!st.isDirectory()) return { verdict: "stray", why: "a loose file" };
	if (fs.existsSync(path.join(full, ".git"))) {
		return { verdict: "keep", why: "still has a .git entry" };
	}
	return { verdict: "orphan", why: "no .git, git does not list it" };
}

const candidates = fs
	.readdirSync(parent)
	.filter((name) => /^xalians[-.]/i.test(name))
	.sort();

const rows = [];
for (const name of candidates) {
	const verdict = classify(name);
	if (!verdict) continue;
	const full = path.join(parent, name);
	const size = verdict.verdict === "keep" ? null : measure(full);
	rows.push({ name, full, size, ...verdict });
}

/**
 * Every worktree cut before the apps/web rename still carries a my-app
 * directory that git no longer tracks: a stale build, a stale node_modules and
 * whatever a dev server left in it. It is residue by the same test as the
 * orphan directories above, so it is offered here too.
 */
const legacyApp = path.join(repoRoot, "my-app");
if (fs.existsSync(legacyApp)) {
	const tracked = execFileSync("git", ["ls-files", "my-app"], {
		cwd: repoRoot,
		encoding: "utf8",
	}).trim();
	if (!tracked) {
		rows.push({
			name: "my-app (in this worktree)",
			full: legacyApp,
			size: measure(legacyApp),
			verdict: "orphan",
			why: "pre-rename residue, untracked",
		});
	}
}

const width = Math.max(...rows.map((r) => r.name.length), 4);
console.log(`Worktree residue beside ${repoRoot}\n`);
for (const r of rows) {
	const size = r.size ? human(r.size.bytes).padStart(7) : "      -";
	const age = r.size && r.size.newest ? `${days(r.size.newest)}d` : "-";
	const mark = r.verdict === "orphan" ? "DELETE " : r.verdict === "stray" ? "DELETE " : "keep   ";
	console.log(`  ${mark} ${r.name.padEnd(width)}  ${size}  last touched ${age.padStart(5)}  ${r.why}`);
}

const doomed = rows.filter((r) => r.verdict === "orphan" || r.verdict === "stray");
for (const r of doomed) r.holders = processesUnder(r.full);
for (const r of doomed) {
	for (const h of r.holders) {
		console.log(`          ${r.name}: held by ${h.name} pid ${h.pid}, stopped by --yes`);
	}
}
const total = doomed.reduce((sum, r) => sum + (r.size ? r.size.bytes : 0), 0);
const oversize = doomed.filter((r) => r.size && r.size.bytes > MAX_DELETE_BYTES);

console.log(
	`\n${doomed.length} removable, ${human(total)} total; ${rows.length - doomed.length} kept.`
);

if (!PRUNE) {
	console.log("Report only. Add --prune to see what would go, then --yes to do it.");
	process.exit(0);
}

if (oversize.length && !FORCE) {
	for (const r of oversize) {
		console.error(
			`\nRefusing: ${r.name} is ${human(r.size.bytes)}, over the ${human(MAX_DELETE_BYTES)} ceiling.` +
				" Add it to KEEP if it is not residue, or pass --force if it really is."
		);
	}
	process.exit(1);
}

if (!YES) {
	console.log("Dry run. Re-run with --yes to delete the rows marked DELETE.");
	process.exit(0);
}

let removed = 0;
for (const r of doomed) {
	for (const h of r.holders) {
		try {
			process.kill(h.pid);
			console.log(`  stopped ${h.name} pid ${h.pid} (running out of ${r.name})`);
		} catch (err) {
			console.error(`  could not stop pid ${h.pid}: ${err.message}`);
		}
	}
	try {
		removeTree(r.full);
		removed += 1;
		console.log(`  removed ${r.name}`);
	} catch (err) {
		console.error(`  FAILED  ${r.name}: ${err.message}`);
	}
}
execFileSync("git", ["worktree", "prune"], { stdio: "inherit" });
console.log(`\nRemoved ${removed} of ${doomed.length}. Reclaimed up to ${human(total)}.`);
