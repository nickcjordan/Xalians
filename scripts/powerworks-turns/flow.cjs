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
    { "op": "act", "key": 1, "target": "A" }         // key 1..4, then the target's plate: a letter (A-F) or a squadmate's name; a key that acts on its own needs none
    { "op": "act", "key": "finish" }                 // "first" (the first usable key), "attack" (the first usable attack) or "finish" (the first attack that knocks an enemy out) name a key by what it is
    { "op": "select", "key": 2 }                     // press the key and stop: its numbers show on the plates and it waits for a target
    { "op": "frames", "ms": 2000, "every": 100 }
    { "op": "waitIdle" }
    { "op": "key", "key": "Escape" }
    { "op": "hover", "target": "cell:*" | "figure:A" }  // hovers a move key or an enemy figure
    { "op": "hover", "key": 2, "target": "cell:*" }     // hovers key 2 (a phone taps it, which selects it)
    { "op": "click", "text": "Guide" }                   // clicks the first button whose text or aria-label contains it
    { "op": "framesUntilIdle", "every": 100, "max": 20000, "after": 1500 }  // frames until data-busy is false, then frames for `after` ms, the last one tagged idle
    { "op": "wait", "ms": 500 }                          // pause without capturing
  A click step may set "optional": true to skip itself when the button is already gone.
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

/**
  Uses a key: choose the key (click, or tap on a phone), then the target. The flow is key, then enemy
  (docs/design/powerworks-intents-and-keys.md): a key that acts on its own (on itself, the whole squad,
  every enemy, or the only target there is) acts on the press; on a touch screen it takes a second tap.
  A key that needs a target is selected, and the target is its plate: a letter (A-F) for an enemy, a
  name for a squadmate. target "now" only presses the key (and taps it again on a phone).
*/
async function pressButton(page, b) {
  if (TOUCH) await b.tap();
  else await b.click();
}
async function isBusy(page) {
  return page.evaluate(() => document.querySelector("[data-busy]")?.getAttribute("data-busy") === "true");
}
/**
  A key by number (1-4), or by what it is: "first" is the first key that can be used now, "attack" the first
  usable attack, "finish" the first attack whose preview on some enemy is a knockout (a skull); the scenarios
  are searched states, so a plan names what it needs rather than a fixed move.
*/
async function resolveKey(page, keyIndex) {
  if (typeof keyIndex === "number" || /^[0-9]+$/.test(String(keyIndex))) return Number(keyIndex);
  const buttons = await page.locator("button.pwt-key:not([disabled])").all();
  const pick = async (b) => Number(await b.getAttribute("data-key"));
  const attackKeys = [];
  for (const b of buttons) attackKeys.push({ b, n: await pick(b), isAttack: ((await b.getAttribute("class")) || "").split(" ").includes("attack") });
  if (keyIndex === "first") return attackKeys.length ? attackKeys[0].n : 1;
  for (const { b, n, isAttack } of attackKeys) {
    if (keyIndex === "attack" && isAttack) return n;
    if (keyIndex === "finish" && isAttack) {
      // Look before acting: a lone-target attack acts on the press, so its preview is read by hovering (a phone taps to select).
      const loc = page.locator(`button.pwt-key[data-key="${n}"]`).first();
      if (TOUCH) await loc.tap();
      else await loc.hover();
      await page.waitForTimeout(150);
      const finishing = await page.locator(".pwt-row.enemies .pwt-preview.finish").count();
      if (finishing) return n;
      if (TOUCH) {
        const box = await page.locator(".pwt-stage").boundingBox();
        await page.touchscreen.tap(box.x + 6, box.y + 6);
      } else await page.mouse.move(3, 3);
      await page.waitForTimeout(80);
    }
  }
  return attackKeys.length ? attackKeys[0].n : 1;
}
async function act(page, keyIndexIn, target) {
  await page.waitForSelector("button.pwt-key", { timeout: 4000 }).catch(() => {});
  const keyIndex = await resolveKey(page, keyIndexIn);
  const key = page.locator(`button.pwt-key[data-key="${keyIndex}"]`).first();
  if (!(await key.count())) throw new Error(`act: no key at index ${keyIndex}`);
  // "finish" already chose the key (its previews show); pressing it again would put it back.
  const alreadySelected = (await key.getAttribute("aria-pressed")) === "true";
  if (!alreadySelected) await pressButton(page, key);
  await page.waitForTimeout(150);
  if (!(await isBusy(page))) {
    const pickable = await page.locator(".pwt-plate.pickable").all();
    if (!pickable.length) {
      // The key acts on its own: a phone needs its second tap.
      if (TOUCH) await pressButton(page, key);
    } else {
      let hit = null;
      if (keyIndexIn === "finish") hit = await page.locator(".pwt-plate.pickable:has(.pwt-preview.finish)").first();
      else
        for (const p of pickable) {
          const letter = (await p.getAttribute("data-letter")) || "";
          const label = ((await p.getAttribute("aria-label")) || "").toLowerCase();
          if ((letter && letter === target) || label.includes(` on ${String(target).toLowerCase()}`) || (!letter && label.includes(String(target).toLowerCase()))) {
            hit = p;
            break;
          }
        }
      // A plan names an enemy that a searched state may not have standing: fall back to the first plate that can be used.
      if (!hit || !(await hit.count())) hit = pickable[0];
      await pressButton(page, hit.locator(".pwt-figure").first());
    }
  }
  // The pointer does not rest on the plate that was used (round 7): the frame after a click must not
  // owe its look to the harness's own mouse. PWT_KEEP_POINTER=1 leaves it there on purpose.
  if (!TOUCH && !process.env.PWT_KEEP_POINTER) await page.mouse.move(3, 3);
}

/** Hovers a key (cell:* on key N; a phone taps it, which selects it) or an enemy/ally figure on the stage. */
async function hover(page, target, keyIndex) {
  const [kind, who] = target.split(":");
  if (kind === "figure") {
    const el = await page.locator(`[data-unit] .pwt-figure`).all();
    // Prefer the figure whose letter tag matches, then one whose unit id starts with the name.
    for (const f of el) {
      const letter = ((await f.locator(".pwt-letter").first().textContent().catch(() => "")) || "").trim();
      if (letter && letter.toUpperCase() === who.toUpperCase()) {
        await (TOUCH ? f.tap() : f.hover());
        return;
      }
    }
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
  // kind === "cell": the key itself (its numbers show on the plates while it is hovered or selected).
  const key = page.locator(keyIndex ? `button.pwt-key[data-key="${keyIndex}"]` : "button.pwt-key").first();
  if (await key.count()) await (TOUCH ? key.tap() : key.hover());
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
    } else if (step.op === "select") {
      // Press a key and stop: it is chosen (its numbers show on the plates) and waits for a target; a key that acts on
      // its own acts on the press (a phone selects it on the first tap).
      const key = page.locator(`button.pwt-key[data-key="${await resolveKey(page, step.key)}"]`).first();
      await pressButton(page, key);
      await page.waitForTimeout(120);
      await capture("select");
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
      // optional: the button may be gone already (a playback that finished first); the plan then goes on.
      if (step.optional && !(await loc.count()) && !(await byLabel.count())) continue;
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
      // Round 6: keep capturing for `after` ms (default 1500) once the hand-off has happened, so the
      // settled key bar (keys live, no card over them) is in the last frame.
      const after = step.after ?? 1500;
      const from = Date.now();
      while (Date.now() - from < after - 300) {
        await page.waitForTimeout(300);
        await capture("settling");
      }
      await page.waitForTimeout(300);
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
      console.error(`${scenario} @ ${w}x${h}: FAILED: ${err.message}${process.env.PWT_STACK ? String.fromCharCode(10) + err.stack : ""}`);
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
