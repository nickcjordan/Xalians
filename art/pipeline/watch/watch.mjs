// Codex run watcher: a small local page that follows builder runs under the codex-stream folder.
//   node art/pipeline/watch/watch.mjs [--port 4791] [--lan] [--root C:\dev\art-data\pipeline\codex-stream]
// Reads only files the runs already write (the Codex log, iter* files, renders, the slot lock), polls nothing
// heavier than a directory listing, and sends the browser a few hundred bytes of JSON plus one thumbnail.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : dflt; };
const PORT = Number(opt("--port", 4791));
const HOST = args.includes("--lan") ? "0.0.0.0" : "127.0.0.1";
const ROOT = path.resolve(opt("--root", "C:\\dev\\art-data\\pipeline\\codex-stream"));
const LOCKS = path.resolve(opt("--locks", "C:\\dev\\art-data\\pipeline\\locks"));

const stat = (p) => { try { return fs.statSync(p); } catch { return null; } };
const ls = (p) => { try { return fs.readdirSync(p); } catch { return []; } };
const read = (p) => { try { return fs.readFileSync(p); } catch { return null; } };

// The Codex log is written by PowerShell Tee-Object (UTF-16LE) and carries UTF-8 text that was decoded as cp437 on
// the way in ("I’m" arrives as "IΓÇÖm"); undo both.
const CP437 = "ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ ";
const fromCp437 = (s) => {
  if (!/[ΓÇÖ├┬]/.test(s)) return s;
  const bytes = [];
  for (const ch of s) {
    const c = ch.codePointAt(0);
    if (c < 128) { bytes.push(c); continue; }
    const k = CP437.indexOf(ch);
    if (k < 0) return s;
    bytes.push(128 + k);
  }
  try { return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(bytes)); } catch { return s; }
};
function decodeLog(buf) {
  if (!buf) return "";
  const utf16 = buf.length > 1 && buf[0] === 0xff && buf[1] === 0xfe;
  const text = utf16 ? buf.toString("utf16le").slice(1) : buf.toString("utf8");
  return text.split(/\r?\n/).map(fromCp437).join("\n");
}

// First time this server saw each message, so the running log can show when a line appeared (lines that were
// already in the log when the server started carry no time).
const firstSeen = new Map();
const BOOT = Date.now();

// One image per iteration for the running log: the newest full-size image whose name starts iter<N>_,
// preferring a side view.
function iterationImages(dir) {
  const per = new Map();
  const consider = (p, f) => {
    const m = /^(?:composite_)?iter(\d+)_/i.exec(f);
    if (!m || !/\.(png|jpg)$/i.test(f) || /sprite|_192/i.test(f)) return;
    const st = stat(p); if (!st) return;
    const n = Number(m[1]);
    const score = (/composite/i.test(f) ? 0 : 2) + (/side/i.test(f) && !/rear|front/i.test(f) ? 1 : 0);
    const cur = per.get(n);
    if (!cur || score > cur.score || (score === cur.score && st.mtimeMs > cur.mtime)) per.set(n, { iter: n, path: path.relative(ROOT, p), mtime: st.mtimeMs, score });
  };
  for (const f of ls(dir)) consider(path.join(dir, f), f);
  for (const f of ls(path.join(dir, "renders"))) consider(path.join(dir, "renders", f), f);
  return [...per.values()].sort((a, b) => a.iter - b.iter).map(({ iter, path: p, mtime }) => ({ iter, path: p, mtime }));
}

function agentMessages(text, n = 3) {
  const L = text.split("\n");
  const out = [];
  for (let i = 0; i < L.length; i++) {
    if (L[i].trim() !== "codex") continue;
    const msg = [];
    for (let j = i + 1; j < L.length; j++) {
      const t = L[j].trim();
      if (t === "exec" || t === "codex" || t === "tokens used" || t.startsWith("diff --git")) break;
      msg.push(L[j]);
    }
    const s = msg.join(" ").replace(/\s+/g, " ").trim();
    if (s) out.push(s);
  }
  return out.slice(-n);
}

function newestMatching(dir, re, depth = 1) {
  let best = null;
  const walk = (d, lvl) => {
    for (const f of ls(d)) {
      const p = path.join(d, f);
      const st = stat(p);
      if (!st) continue;
      if (st.isDirectory()) { if (lvl < depth && !/^(work|inputs|references|__pycache__|stale)$/.test(f)) walk(p, lvl + 1); continue; }
      if (re.test(f) && (!best || st.mtimeMs > best.mtime)) best = { path: p, mtime: st.mtimeMs };
    }
  };
  walk(dir, 0);
  return best;
}

function maxIteration(dir) {
  let max = 0;
  const walk = (d, lvl) => {
    for (const f of ls(d)) {
      const m = /iter(?:ation)?[_-]?(\d+)/i.exec(f);
      if (m) max = Math.max(max, Number(m[1]));
      if (lvl < 1 && stat(path.join(d, f))?.isDirectory()) walk(path.join(d, f), lvl + 1);
    }
  };
  walk(dir, 0);
  // A builder may also keep notes as a JSON list; count it when it runs ahead of the file names.
  const notes = read(path.join(dir, "iter_notes.json"));
  if (notes) { try { const j = JSON.parse(notes); if (Array.isArray(j)) max = Math.max(max, j.length); } catch {} }
  return max;
}

function runInfo(runDir) {
  const name = path.basename(runDir);
  const logs = ls(runDir).filter((f) => /^pass\w*-codex\.log$/.test(f));
  if (!logs.length) return null;
  const log = logs.map((f) => ({ f, st: stat(path.join(runDir, f)) })).sort((a, b) => b.st.mtimeMs - a.st.mtimeMs)[0];
  const pass = log.f.replace(/-codex\.log$/, "");
  const passDir = path.join(runDir, pass);
  const brief = (read(path.join(runDir, "BRIEF.md")) || "").toString();
  // A follow-up pass carries its own addendum (PASS2.md for pass2); its cap, build id and heading win.
  const addendum = (read(path.join(runDir, pass.toUpperCase() + ".md")) || "").toString();
  const capOf = (t) => Number((/Cap (\d+) minutes/i.exec(t) || /after (\d+) minutes of wall time/i.exec(t) || [])[1]) || null;
  const buildOf = (t) => (/\(build (B-[a-z0-9]{4})\)/.exec(t) || /Codex stream build id: (B-[a-z0-9]{4})/.exec(t)
    || /\b(B-[a-z0-9]{4})\b/.exec(t) || [])[1] || null;
  const cap = capOf(addendum) || capOf(brief);
  const build = buildOf(addendum) || buildOf(brief);
  const head = (t) => ((/^# (.+)$/m.exec(t) || [])[1] || "").replace(/\s*\(build B-[a-z0-9]{4}\)/, "");
  const title = [head(brief) || name, head(addendum)].filter(Boolean).join(" / ");
  const launch = stat(path.join(runDir, `${pass}-launch.log`)) || log.st;
  const started = Math.min(launch.birthtimeMs || launch.ctimeMs, log.st.birthtimeMs || log.st.ctimeMs);
  const wallFile = read(path.join(runDir, `${pass}-wall.txt`));
  const done = !!wallFile;
  const text = decodeLog(read(path.join(runDir, log.f)));
  const tokens = (/tokens used\s*\n\s*([\d,]+)/.exec(text) || [])[1] || null;
  const wall = wallFile ? Number((/([\d.]+)/.exec(decodeLog(wallFile)) || [])[1]) : null;
  // Prefer the newest full-size image; the 192 px sprite is too small to follow along with.
  const render = newestMatching(passDir, /^(?!.*(sprite|_192)).*\.(png|jpg)$/i, 1) || newestMatching(passDir, /\.(png|jpg)$/i, 1);
  return {
    name, pass, title, build, cap, started, done, tokens,
    elapsedMin: done && wall ? wall : (Date.now() - started) / 60000,
    lastActivity: log.st.mtimeMs,
    iteration: maxIteration(passDir),
    messages: agentMessages(text, Infinity).map((m, i) => {
      const key = `${runDir}|${pass}|${i}|${m.slice(0, 60)}`;
      if (!firstSeen.has(key)) firstSeen.set(key, Date.now() - BOOT < 15000 ? null : Date.now());
      return { text: m, seen: firstSeen.get(key) };
    }),
    iterations: iterationImages(passDir),
    report: !!stat(path.join(passDir, "report.json")),
    image: render ? path.relative(ROOT, render.path) : null,
    imageTime: render ? render.mtime : null,
  };
}

function locks() {
  const out = [];
  for (const cls of ["blender", "gpu"]) {
    for (const f of ls(path.join(LOCKS, cls))) {
      if (!f.endsWith(".json")) continue;
      try { const r = JSON.parse(read(path.join(LOCKS, cls, f))); out.push({ cls, owner: r.owner, started: r.started }); } catch {}
    }
  }
  return out;
}

function status() {
  const runs = ls(ROOT).map((d) => path.join(ROOT, d)).filter((p) => stat(p)?.isDirectory()).map(runInfo).filter(Boolean)
    .sort((a, b) => b.lastActivity - a.lastActivity);
  return { now: Date.now(), runs, locks: locks() };
}

const PAGE = fs.readFileSync(new URL("./watch.html", import.meta.url));

http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/api/status") {
    res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
    return res.end(JSON.stringify(status()));
  }
  if (url.pathname === "/img") {
    const p = path.resolve(ROOT, url.searchParams.get("p") || "");
    if (!p.startsWith(ROOT + path.sep) || !/\.(png|jpg)$/i.test(p)) { res.writeHead(404); return res.end(); }
    const buf = read(p);
    if (!buf) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "content-type": p.endsWith(".png") ? "image/png" : "image/jpeg", "cache-control": "max-age=3600" });
    return res.end(buf);
  }
  if (url.pathname === "/") { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); return res.end(PAGE); }
  res.writeHead(404); res.end();
}).listen(PORT, HOST, () => console.log(`watching ${ROOT} at http://${HOST === "0.0.0.0" ? "<this-pc>" : "localhost"}:${PORT}`));
