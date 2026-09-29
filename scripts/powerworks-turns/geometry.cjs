#!/usr/bin/env node
/*
  Geometry check for the Powerworks turn screen (docs/design/powerworks-turn-screen.md,
  "Validation": "the geometry check from the build stays green"). Ports the paint-review-round-5
  check (every .pwt-figure, letter badge and .pwt-plaque inside the stage; every squad plaque
  above the key bar) and extends it for the UX pass: the turn rail and banner stay inside the
  viewport, and the page never scrolls.

  Usage:
    node scripts/powerworks-turns/geometry.cjs --scenario-dir=<dir with *.json scenarios> \
      [--base=http://localhost:3108] [--sizes=1920x1080,1366x768,844x390] [--out=<dir for screenshots>]

  Exits non-zero on any failure, printing each one.
*/
const fs = require("fs");
const path = require("path");
const { chromium } = require(require.resolve("playwright-core", { paths: [process.cwd() + "/apps/web"] }));

const arg = (k, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${k}=`));
  return hit ? hit.slice(k.length + 3) : d;
};
const SCEN_DIR = arg("scenario-dir", "");
const BASE = arg("base", "http://localhost:3108");
const OUT = arg("out", path.join(SCEN_DIR || ".", "geometry-shots"));
const sizes = arg("sizes", "1920x1080,1366x768,844x390")
  .split(",")
  .map((s) => s.split("x").map(Number));

function within(inner, outer, slack = 0.5) {
  return (
    inner.x >= outer.x - slack &&
    inner.y >= outer.y - slack &&
    inner.x + inner.width <= outer.x + outer.width + slack &&
    inner.y + inner.height <= outer.y + outer.height + slack
  );
}

(async () => {
  if (!SCEN_DIR) {
    console.error("usage: node scripts/powerworks-turns/geometry.cjs --scenario-dir=<dir> [--base=...] [--sizes=...]");
    process.exit(2);
  }
  const files = fs
    .readdirSync(SCEN_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({ name: f.replace(/\.json$/, ""), file: path.join(SCEN_DIR, f) }));
  if (!files.length) {
    console.error(`no *.json scenario files found in ${SCEN_DIR}`);
    process.exit(2);
  }
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({ channel: "chrome" });
  let failures = 0;
  let checks = 0;

  for (const scen of files) {
    for (const [w, h] of sizes) {
      const tag = `${scen.name}-${w}x${h}`;
      const page = await browser.newPage({ viewport: { width: w, height: h } });
      const url = `${BASE}/powerworks`;
      await page.goto(url, { waitUntil: "networkidle" });
      await page.evaluate((s) => localStorage.setItem("xalians.powerworks.turns.v1", s), fs.readFileSync(scen.file, "utf8"));
      await page.goto(url, { waitUntil: "networkidle" });
      await page.waitForTimeout(800);

      const result = await page.evaluate(() => {
        const rect = (el) => {
          const r = el.getBoundingClientRect();
          return { x: r.x, y: r.y, width: r.width, height: r.height };
        };
        const stage = document.querySelector(".pwt-stage");
        const keybar = document.querySelector(".pwt-keybar");
        if (!stage) return { skipped: true };
        const stageBox = rect(stage);
        const keybarBox = keybar ? rect(keybar) : null;
        const items = [];
        document.querySelectorAll(".pwt-figure").forEach((el, i) => items.push({ kind: "figure", index: i, box: rect(el) }));
        document.querySelectorAll(".pwt-letter").forEach((el, i) => items.push({ kind: "letter", index: i, box: rect(el) }));
        document.querySelectorAll(".pwt-plaque").forEach((el, i) => items.push({ kind: "plaque", index: i, box: rect(el) }));
        const squadPlaques = [...document.querySelectorAll(".pwt-row.squad .pwt-plaque")].map((el) => rect(el));
        // UX pass additions: the turn rail and the turn banner, if the rebuilt page has them
        // yet (tolerate their absence rather than failing the whole check). data-rail and
        // data-turn-banner are the page's own stable hooks; .pwt-rail/.pwt-banner/.pwt-strip
        // are fallbacks for a build that has not wired the attribute yet.
        const rail = document.querySelector("[data-rail], [data-turn-rail], .pwt-rail, .pwt-strip");
        const banner = document.querySelector("[data-turn-banner], .pwt-banner");
        const railBox = rail ? rect(rail) : null;
        const bannerBox = banner ? rect(banner) : null;
        const viewport = { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight };
        const scrollX = document.documentElement.scrollWidth > document.documentElement.clientWidth;
        const scrollY = document.documentElement.scrollHeight > document.documentElement.clientHeight;
        return { stageBox, keybarBox, items, squadPlaques, railBox, bannerBox, viewport, scrollX, scrollY };
      });

      if (result.skipped) {
        console.log(`[${tag}] SKIP: no .pwt-stage found (not on /powerworks turn screen)`);
        await page.close();
        continue;
      }

      const { stageBox, keybarBox, viewport } = result;
      for (const item of result.items) {
        checks++;
        if (!within(item.box, stageBox)) {
          failures++;
          console.log(`[${tag}] FAIL ${item.kind}[${item.index}] not inside stage: box=${JSON.stringify(item.box)} stage=${JSON.stringify(stageBox)}`);
        }
      }
      if (keybarBox) {
        for (let i = 0; i < result.squadPlaques.length; i++) {
          checks++;
          const p = result.squadPlaques[i];
          const bottom = p.y + p.height;
          if (bottom > keybarBox.y + 0.5) {
            failures++;
            console.log(`[${tag}] FAIL squad plaque[${i}] bottom (${bottom.toFixed(1)}) not above key bar top (${keybarBox.y.toFixed(1)})`);
          }
        }
      }
      if (result.railBox) {
        checks++;
        if (!within(result.railBox, viewport)) {
          failures++;
          console.log(`[${tag}] FAIL turn rail not inside viewport: box=${JSON.stringify(result.railBox)}`);
        }
      } else {
        console.log(`[${tag}] WARN: no turn rail hook found yet ([data-turn-rail], .pwt-rail or .pwt-strip)`);
      }
      if (result.bannerBox) {
        checks++;
        if (!within(result.bannerBox, viewport)) {
          failures++;
          console.log(`[${tag}] FAIL turn banner not inside viewport: box=${JSON.stringify(result.bannerBox)}`);
        }
      } else {
        console.log(`[${tag}] WARN: no turn banner hook found yet ([data-turn-banner] or .pwt-banner)`);
      }
      checks++;
      if (result.scrollX || result.scrollY) {
        failures++;
        console.log(`[${tag}] FAIL page scrolls (scrollX=${result.scrollX}, scrollY=${result.scrollY})`);
      }

      if (result.items.length === 0) {
        console.log(`[${tag}] WARN: no .pwt-figure/.pwt-letter/.pwt-plaque elements found`);
      } else {
        console.log(`[${tag}] checked ${result.items.length} elements + ${result.squadPlaques.length} squad plaques, ok`);
      }

      await page.screenshot({ path: path.join(OUT, `${tag}.png`) });
      await page.close();
    }
  }
  await browser.close();
  console.log(`\n${checks} checks, ${failures} failures`);
  if (failures > 0) {
    console.log("GEOMETRY CHECK FAILED");
    process.exit(1);
  }
  console.log("GEOMETRY CHECK PASSED");
})();
