#!/usr/bin/env node
/*
  Powerworks turn screen capture tool (docs/design/powerworks-turn-screen.md, "Validation").
  Loads a saved-run scenario into the page's localStorage, reloads /powerworks, then runs a
  small script of steps against it, capturing frame sequences and per-frame hook readouts.

  Plain Node (CommonJS), no new dependencies: playwright-core is required from apps/web's
  own node_modules the same way geomcheck.cjs does.

  Usage:
    node scripts/powerworks-turns/flow.cjs --scenario=<name> --scenario-file=<path> \
      --steps=<path-to-json-or-inline> --out=<dir> [--base=http://localhost:3108] \
      [--sizes=1920x1080,1366x768]

  Or run a whole plan file (see plan.json) with:
    node scripts/powerworks-turns/flow.cjs --plan=scripts/powerworks-turns/plan.json \
      --scenario-dir=<dir with scenario JSON files> --out=<dir>

  Steps (a JSON array), each one of:
    { "op": "shot" }
    { "op": "act", "key": 1, "target": "A" }         // move index 1..4, target letter/name/"now"
    { "op": "frames", "ms": 2000, "every": 100 }
    { "op": "waitIdle" }
    { "op": "key", "key": "Escape" }
    { "op": "hover", "target": "cell:A" | "figure:A" }  // hovers a key cell or an enemy figure
    { "op": "hover", "key": 2, "target": "cell:C" | "cell:*" }  // restricts the cell search to key 2; * is its first button
    { "op": "click", "text": "Guide" }                   // clicks the first button whose text or aria-label contains it
    { "op": "framesUntilIdle", "every": 100, "max": 20000 }  // frames until data-busy is false, then one idle frame
    { "op": "wait", "ms": 500 }                          // pause without capturing
  --only-size=844x390 limits a --plan run to entries that include that size.
  A plan entry may set "sizes": ["844x390"] to override --sizes for that entry, and "fresh": true to
  clear localStorage instead of loading a scenario (a first visit).

  Frames land at <out>/<scenario>-<size>/NNN-<ms>.png, with a contact sheet sheet.png per
  sequence and a hooks.json recording, per captured frame, data-turn-banner text and
  data-side/data-spotlight/data-busy, the rail's data-slot/data-state list and every
  data-delta on the page. The page is being rebuilt while this tool is used: hooks may be
  absent, in which case their fields come back null rather than throwing.
*/
const fs = require("fs");
const path = require("path");
const { chromium } = require(require.resolve("playwright-core", { paths: [process.cwd() + "/apps/web"] }));

const arg = (k, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${k}=`));
  return hit ? hit.slice(k.length + 3) : d;
};
const BASE = arg("base", "http://localhost:3108");
const SIZES = arg("sizes", "1920x1080,1366x768")
  .split(",")
  .map((s) => s.split("x").map(Number));
const SIZE_LIST = arg("sizes", "1920x1080,1366x768").split(",");
const SAVE_KEY = "xalians.powerworks.turns.v1";

/** A phone-sized landscape screen (height 500 or less) is driven as a touch device: taps, not
    clicks. Round 4 of UX pass 2: a key cell answers the first tap with a preview and the second
    with the move, so act() taps twice and hover() taps once. */
let TOUCH = false;
const isPhoneSize = (w, h) => w > h && h <= 500;
const press = async (loc) => (TOUCH ? loc.tap() : loc.click());

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

/** Reads every page hook this tool knows about, tolerating any that are missing. The
    turn banner element itself carries data-turn-banner as a bare marker attribute (its
    text lives in child spans), so its "text" reading is the element's own textContent. */
async function readHooks(page) {
  return page.evaluate(() => {
    const attr = (sel, name) => {
      const el = document.querySelector(sel);
      return el ? el.getAttribute(name) : null;
    };
    const bannerEl = document.querySelector("[data-turn-banner]");
    const root = document.querySelector("[data-busy]") || document.querySelector("main");
    const slots = [...document.querySelectorAll("[data-slot]")].map((el) => ({
      slot: el.getAttribute("data-slot"),
      state: el.getAttribute("data-state"),
    }));
    const deltas = [...document.querySelectorAll("[data-delta]")].map((el) => ({
      unit: el.closest("[data-unit]")?.getAttribute("data-unit") ?? null,
      value: el.getAttribute("data-delta"),
    }));
    return {
      turnBanner: bannerEl ? bannerEl.textContent.trim() : null,
      side: attr("[data-turn-banner]", "data-side") ?? attr("[data-side]", "data-side"),
      spotlight: attr("[data-spotlight]", "data-spotlight"),
      busy: root ? root.getAttribute("data-busy") : null,
      slots,
      deltas,
    };
  });
}

/** Finds and clicks the cell for a key index (1-based, as the docs' keyboard scheme) and a target. */
async function act(page, keyIndex, target) {
  // Keys are role="group" with aria-label = the move's name; buttons inside carry aria-label
  // describing the target. We locate the Nth key group (1-based) and click a button whose
  // aria-label matches the target: a bare letter (A-F), an ally name, or "now" for a self/now key.
  // The key bar can still be mounting right after a scenario load; wait for at least one
  // group rather than racing the first paint.
  await page
    .waitForSelector('[role="group"]', { timeout: 4000 })
    .catch(() => {
      /* fall through: the error below reports the real count for a clearer message */
    });
  const groups = await page.locator('[role="group"]').all();
  const group = groups[keyIndex - 1];
  if (!group) throw new Error(`act: no key at index ${keyIndex} (found ${groups.length} key groups)`);
  const buttons = await group.locator("button").all();
  if (!buttons.length) throw new Error(`act: key ${keyIndex} has no buttons`);
  const commit = async (b) => {
    if (TOUCH) {
      await b.tap(); // first tap previews
      await page.waitForTimeout(120);
      await b.tap(); // second tap uses it
    } else await b.click();
  };
  if (target === "now" || buttons.length === 1) {
    await commit(buttons[0]);
    return;
  }
  // Prefer a button whose aria-label contains " on <target>," (letter or ally name).
  for (const b of buttons) {
    const label = (await b.getAttribute("aria-label")) || "";
    if (label.includes(`on ${target},`) || label.includes(`on ${target}:`) || label.toLowerCase().includes(`on ${target.toLowerCase()}`)) {
      await commit(b);
      return;
    }
  }
  // Fall back to a same-letter button (letter-only keys, e.g. the "every enemy" band).
  for (const b of buttons) {
    const text = (await b.textContent()) || "";
    if (text.trim() === target) {
      await commit(b);
      return;
    }
  }
  throw new Error(`act: no button in key ${keyIndex} matches target "${target}"`);
}

/** Hovers a key cell (by target letter/name) or an enemy/ally figure on the stage. */
async function hover(page, target, keyIndex) {
  const [kind, who] = target.split(":");
  if (kind === "figure") {
    const el = await page.locator(`[data-unit] .pwt-figure`).all();
    // Prefer a figure whose plate shows the matching letter or name.
    for (const f of el) {
      const plate = await f.locator("xpath=ancestor::*[@data-unit][1]").first();
      const unitId = await plate.getAttribute("data-unit");
      if (unitId && unitId.toUpperCase().startsWith(who.toUpperCase())) {
        await (TOUCH ? f.tap() : f.hover());
        return;
      }
    }
    if (el[0]) await (TOUCH ? el[0].tap() : el[0].hover());
    return;
  }
  // kind === "cell": hover a key's cell button the same way act() finds it.
  let groups = await page.locator('[role="group"]').all();
  if (keyIndex) groups = groups.slice(keyIndex - 1, keyIndex);
  for (const g of groups) {
    const buttons = await g.locator("button").all();
    if (who === "*" && buttons[0]) {
      await (TOUCH ? buttons[0].tap() : buttons[0].hover());
      return;
    }
    for (const b of buttons) {
      const label = (await b.getAttribute("aria-label")) || "";
      if (label.toLowerCase().includes(`on ${who.toLowerCase()}`)) {
        await (TOUCH ? b.tap() : b.hover());
        return;
      }
    }
  }
}

async function isIdle(page) {
  return page.evaluate(() => {
    const root = document.querySelector("[data-busy]");
    if (root) return root.getAttribute("data-busy") === "false";
    // No hook yet: fall back to "no active playback caption visible".
    return !document.querySelector(".pwt-playback, .pwt-caption");
  });
}

async function waitIdle(page, timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isIdle(page)) return;
    await page.waitForTimeout(50);
  }
  // Tolerate: the hook may not exist yet on this build. Proceed rather than throwing.
}

/** Loads a scenario's saved-run JSON into localStorage and reloads the page onto it. A null
    file is a first visit: storage is cleared and the page loaded cold. */
async function loadScenario(page, url, scenarioFile) {
  await page.goto(url, { waitUntil: "networkidle" });
  if (!scenarioFile) {
    await page.evaluate(() => localStorage.clear());
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    return;
  }
  const raw = fs.readFileSync(scenarioFile, "utf8");
  await page.evaluate((s) => localStorage.setItem("xalians.powerworks.turns.v1", s), raw);
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForSelector(".pwt-stage", { timeout: 8000 }).catch(() => {
    /* an older build without this class: the step below still gives React a moment to mount */
  });
  await page.waitForTimeout(500);
}

/** Runs one script of steps against a loaded page, writing frames + hooks.json into outDir. */
async function runSteps(page, steps, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const hooksLog = [];
  let frameNo = 0;
  const t0 = Date.now();

  async function capture(tag) {
    const ms = Date.now() - t0;
    const file = path.join(outDir, `${String(frameNo).padStart(3, "0")}-${ms}.png`);
    await page.screenshot({ path: file });
    const hooks = await readHooks(page).catch(() => null);
    hooksLog.push({ frame: frameNo, file: path.basename(file), ms, tag: tag || null, hooks });
    frameNo++;
    return file;
  }

  for (const step of steps) {
    if (step.op === "shot") {
      await capture("shot");
    } else if (step.op === "act") {
      await act(page, step.key, step.target);
      await page.waitForTimeout(80);
      await capture("act");
    } else if (step.op === "frames") {
      const every = step.every ?? 100;
      const total = step.ms ?? 1000;
      const steps_n = Math.max(1, Math.round(total / every));
      for (let i = 0; i < steps_n; i++) {
        await capture("frame");
        await page.waitForTimeout(every);
      }
    } else if (step.op === "waitIdle") {
      await waitIdle(page);
      await capture("idle");
    } else if (step.op === "key") {
      await page.keyboard.press(step.key);
      await page.waitForTimeout(80);
      await capture("key");
    } else if (step.op === "hover") {
      await hover(page, step.target, step.key);
      await page.waitForTimeout(80);
      await capture("hover");
    } else if (step.op === "click" && TOUCH && ["Guide", "Record", "Restart"].includes(step.text)) {
      // Phone: the three tools live in one Menu button.
      await press(page.locator("button.pwt-menu-btn"));
      await page.waitForTimeout(150);
      await press(page.locator('[role="menuitem"]', { hasText: step.text }));
      await page.waitForTimeout(step.settle ?? 300);
      await capture("click:" + step.text);
    } else if (step.op === "click") {
      const loc = page.locator("button", { hasText: step.text }).first();
      const byLabel = page.locator(`button[aria-label*="${step.text}"]`).first();
      if (await loc.count()) await press(loc);
      else await press(byLabel);
      await page.waitForTimeout(step.settle ?? 300);
      await capture("click:" + step.text);
    } else if (step.op === "framesUntilIdle") {
      const every = step.every ?? 100;
      const max = step.max ?? 20000;
      const start = Date.now();
      await page.waitForTimeout(40);
      while (Date.now() - start < max) {
        await capture("frame");
        if (await isIdle(page)) break;
        await page.waitForTimeout(every);
      }
      await page.waitForTimeout(400);
      await capture("idle");
    } else if (step.op === "wait") {
      await page.waitForTimeout(step.ms ?? 500);
    } else {
      console.warn(`unknown step op "${step.op}", skipping`);
    }
  }

  fs.writeFileSync(path.join(outDir, "hooks.json"), JSON.stringify(hooksLog, null, 2));
  return hooksLog;
}

/** Builds a labeled contact sheet from the frame PNGs in a directory, using sharp if available,
    else a pure-Node PNG compositor (no new dependency: sharp/PIL are optional; the fallback
    just tiles raw PNGs into a naive strip using the 'pngjs' style manual decode is overkill, so
    the fallback instead writes an HTML contact sheet, which is just as reviewable). */
async function buildContactSheet(outDir, hooksLog) {
  const files = hooksLog.map((h) => h.file);
  if (!files.length) return null;
  // Try Python + PIL first (repo already uses Python-adjacent tooling in some devtools).
  const pyOk = await tryPil(outDir, hooksLog);
  if (pyOk) return path.join(outDir, "sheet.png");
  // Fallback: an HTML contact sheet (no extra dependency, opens in any browser, still one
  // artifact per sequence and still labeled with index + time).
  const html = [
    "<!doctype html><html><head><meta charset='utf-8'><style>",
    "body{background:#111;color:#eee;font-family:sans-serif;margin:0;padding:12px;}",
    ".row{display:flex;flex-wrap:wrap;gap:8px;}",
    ".cell{width:280px;}",
    ".cell img{width:100%;display:block;border:1px solid #333;}",
    ".cell p{margin:4px 0 0;font-size:12px;}",
    "</style></head><body><div class='row'>",
    ...hooksLog.map((h) => `<div class="cell"><img src="${h.file}"><p>#${h.frame} @ ${h.ms}ms ${h.tag ? `(${h.tag})` : ""}</p></div>`),
    "</div></body></html>",
  ].join("\n");
  const file = path.join(outDir, "sheet.html");
  fs.writeFileSync(file, html);
  return file;
}

/** Attempts a PIL-based contact sheet via `python3 -c ...`; returns true on success. */
async function tryPil(outDir, hooksLog) {
  const { spawnSync } = require("child_process");
  const script = `
import sys, json
from PIL import Image, ImageDraw
frames = json.loads(sys.argv[1])
out_dir = sys.argv[2]
imgs = [Image.open(f"{out_dir}/{f['file']}") for f in frames]
if not imgs:
    sys.exit(1)
cols = min(6, len(imgs))
rows = (len(imgs) + cols - 1) // cols
scale = 0.25
tw, th = int(imgs[0].width * scale), int(imgs[0].height * scale)
sheet = Image.new("RGB", (tw * cols, (th + 20) * rows), (17, 17, 17))
draw = ImageDraw.Draw(sheet)
for i, (im, meta) in enumerate(zip(imgs, frames)):
    small = im.resize((tw, th))
    x = (i % cols) * tw
    y = (i // cols) * (th + 20)
    sheet.paste(small, (x, y))
    draw.text((x + 4, y + th + 2), f"#{meta['frame']} {meta['ms']}ms", fill=(230, 230, 230))
sheet.save(f"{out_dir}/sheet.png")
`;
  const res = spawnSync("python3", ["-c", script, JSON.stringify(hooksLog), outDir], { encoding: "utf8" });
  if (res.status === 0 && fs.existsSync(path.join(outDir, "sheet.png"))) return true;
  const res2 = spawnSync("python", ["-c", script, JSON.stringify(hooksLog), outDir], { encoding: "utf8" });
  return res2.status === 0 && fs.existsSync(path.join(outDir, "sheet.png"));
}

async function runOne(browser, { scenario, scenarioFile, steps, outRoot, sizes }) {
  for (const [w, h] of sizes || SIZES) {
    TOUCH = isPhoneSize(w, h);
    const context = await browser.newContext({
      viewport: { width: w, height: h },
      ...(TOUCH ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}),
    });
    const page = await context.newPage();
    const outDir = path.join(outRoot, `${scenario}-${w}x${h}`);
    try {
      await loadScenario(page, `${BASE}/powerworks`, scenarioFile);
      const hooksLog = await runSteps(page, steps, outDir);
      const sheet = await buildContactSheet(outDir, hooksLog);
      console.log(`${scenario} @ ${w}x${h}: ${hooksLog.length} frames -> ${outDir}${sheet ? `, sheet ${sheet}` : ""}`);
    } catch (err) {
      console.error(`${scenario} @ ${w}x${h}: FAILED: ${err.message}`);
    } finally {
      await page.close();
      await context.close();
    }
  }
}

async function main() {
  const outRoot = arg("out", "");
  if (!outRoot) {
    console.error("usage: node scripts/powerworks-turns/flow.cjs --out=<dir> (--plan=<plan.json> --scenario-dir=<dir> | --scenario=<name> --scenario-file=<path> --steps=<path>)");
    process.exit(2);
  }
  const browser = await chromium.launch({ channel: "chrome" });
  try {
    const planPath = arg("plan", "");
    if (planPath) {
      const scenarioDir = arg("scenario-dir", "");
      if (!scenarioDir) throw new Error("--plan requires --scenario-dir");
      const plan = readJson(planPath);
      const only = arg("only", "").split(",").filter(Boolean);
      const onlySize = arg("only-size", "").split(",").filter(Boolean);
      for (const entry of plan) {
        if (only.length && !only.some((o) => (entry.name ?? entry.scenario).startsWith(o))) continue;
        const scenarioFile = entry.fresh ? null : path.join(scenarioDir, `${entry.scenario}.json`);
        if (scenarioFile && !fs.existsSync(scenarioFile)) {
          console.warn(`plan entry "${entry.name ?? entry.scenario}": missing scenario file ${scenarioFile}, skipping`);
          continue;
        }
        await runOne(browser, {
          scenario: entry.name ?? entry.scenario,
          scenarioFile,
          steps: entry.steps,
          outRoot,
          sizes: (entry.sizes ? entry.sizes : SIZE_LIST)
            .filter((z) => !onlySize.length || onlySize.includes(z))
            .map((z) => z.split("x").map(Number)),
        });
      }
    } else {
      const scenario = arg("scenario", "");
      const scenarioFile = arg("scenario-file", "");
      const stepsArg = arg("steps", "[]");
      if (!scenario || !scenarioFile) throw new Error("need --scenario and --scenario-file (or --plan + --scenario-dir)");
      const steps = fs.existsSync(stepsArg) ? readJson(stepsArg) : JSON.parse(stepsArg);
      await runOne(browser, { scenario, scenarioFile, steps, outRoot });
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
