#!/usr/bin/env node
/*
  Geometry check for the Powerworks turn screen (docs/design/powerworks-turn-screen.md,
  "Validation": "the geometry check from the build stays green"). Ports the paint-review-round-5
  check (every .pwt-figure, letter badge and .pwt-plaque inside the stage; every squad plaque
  above the key bar) and extends it for the UX pass: the turn rail and banner stay inside the
  viewport, and the page never scrolls.

  Usage:
    node scripts/powerworks-turns/geometry.cjs --scenario-dir=<dir with *.json scenarios> \
      [--base=http://localhost:3108] [--sizes=1920x1080,1366x768,844x390,932x430,667x375] [--out=<dir for screenshots>]

  Round 4 (phone): a landscape screen 500 px tall or less is opened as a touch phone (isMobile,
  hasTouch) and gets the phone checks on top of the rest: no visible text under 12 CSS px, no
  button or link under 40 px in its short side, nothing clipped or outside the screen, no page
  scroll, and the tap flow (first tap on a key cell previews, the second uses it).

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
const sizes = arg("sizes", "1920x1080,1366x768,844x390,932x430,667x375")
  .split(",")
  .map((s) => s.split("x").map(Number));

const isPhone = (w, h) => w > h && h <= 500;

/** Opens a page at a size; a phone size is a touch device with a 2x screen. */
async function openPage(browser, w, h) {
  const phone = isPhone(w, h);
  const context = await browser.newContext({
    viewport: { width: w, height: h },
    ...(phone ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}),
  });
  const page = await context.newPage();
  const close = async () => {
    await page.close();
    await context.close();
  };
  return { page, close, phone };
}
const press = (page, phone, loc) => (phone ? loc.tap() : loc.click());

/** Opens a tool (Guide, Record, Restart): a button on a desktop, an item in the Menu on a phone. */
async function openTool(page, phone, name) {
  if (phone) {
    await page.locator("button.pwt-menu-btn").tap();
    await page.waitForTimeout(150);
    await page.locator('[role="menuitem"]', { hasText: name }).tap();
  } else await page.click(`button:has-text('${name}')`);
}

function within(inner, outer, slack = 0.5) {
  return (
    inner.x >= outer.x - slack &&
    inner.y >= outer.y - slack &&
    inner.x + inner.width <= outer.x + outer.width + slack &&
    inner.y + inner.height <= outer.y + outer.height + slack
  );
}


/**
  Round 2 additions: a panel (briefing, camp, end of run, guide, restart) must fit the viewport, must
  not scroll inside itself, and every element inside it must sit inside its box (text that could
  overflow shows up as a child poking out, or a single-line text clipped by its own box).
*/
async function panelProblems(page, selector, allowScroll = false) {
  return page.evaluate(([sel, scrolls]) => {
    const panel = document.querySelector(sel);
    if (!panel) return null;
    const pr = panel.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const out = [];
    if (pr.left < -0.5 || pr.top < -0.5 || pr.right > vw + 0.5 || pr.bottom > vh + 0.5)
      out.push(`panel outside the viewport: ${JSON.stringify({ l: pr.left, t: pr.top, r: pr.right, b: pr.bottom, vw, vh })}`);
    if (!scrolls && panel.scrollHeight > panel.clientHeight + 1) out.push(`panel scrolls inside (scrollHeight ${panel.scrollHeight} > ${panel.clientHeight})`);
    panel.querySelectorAll("*").forEach((el) => {
      if (el.closest("[aria-hidden='true']") && el.closest(".pwt-legend-sample") === null) return;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      // A reference panel that scrolls (the phone Guide) only has to hold its width.
      if (r.left < pr.left - 1 || r.right > pr.right + 1 || (!scrolls && (r.top < pr.top - 1 || r.bottom > pr.bottom + 1)))
        out.push(`${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]} pokes out of the panel`);
      if (el.children.length === 0 && el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== "visible")
        out.push(`${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]} text clipped`);
    });
    return out;
  }, [selector, allowScroll]);
}

/**
  Round 4, the phone checks (run on every phone-size page): every piece of visible text at 12 CSS
  px or more, every button and link at 40 px or more in its short side, nothing outside the
  screen and no text clipped by its own box. Things that truncate or cut off on purpose are named
  here: the banner's one-line sentence (the Record holds the rest), the turn rail's far end and a
  panel that scrolls (the Guide, the Record).
*/
async function phoneProblems(page) {
  return page.evaluate(() => {
    const out = [];
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const name = (el) => `${el.tagName.toLowerCase()}.${String(typeof el.className === "string" ? el.className : "").split(" ")[0]}`;
    const visible = (el) => {
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const inScroller = (el) => !!el.closest(".pwt-guide, .pwt-record-list");
    const inRail = (el) => !!el.closest(".pwt-rail");
    const all = [...document.querySelectorAll("body *")].filter((el) => !el.closest("svg") && !["SCRIPT", "STYLE"].includes(el.tagName));
    for (const el of all) {
      if (!visible(el)) continue;
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      const r = el.getBoundingClientRect();
      if (own) {
        const px = parseFloat(getComputedStyle(el).fontSize);
        if (px < 12) out.push(`text under 12px (${px}px): ${name(el)} "${el.textContent.trim().slice(0, 30)}"`);
        // Clipped by its own box (an ellipsis, or text cut off), other than the named exceptions.
        if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== "visible" && !el.closest(".pwt-banner-line, .pwt-rail"))
          out.push(`text clipped: ${name(el)} "${el.textContent.trim().slice(0, 30)}"`);
      }
      const isControl = el.matches("button, a[href], [role='button'], [role='menuitem'], input, select") && !el.closest("[inert]");
      if (isControl) {
        const short = Math.min(r.width, r.height);
        if (short < 39.5) out.push(`control under 40px (${r.width.toFixed(0)}x${r.height.toFixed(0)}): ${name(el)} "${(el.getAttribute("aria-label") || el.textContent).trim().slice(0, 24)}"`);
      }
      if ((own || isControl) && !inRail(el) && !inScroller(el)) {
        if (r.left < -0.5 || r.top < -0.5 || r.right > vw + 0.5 || r.bottom > vh + 0.5)
          out.push(`outside the screen: ${name(el)} ${JSON.stringify({ l: r.left | 0, t: r.top | 0, r: r.right | 0, b: r.bottom | 0 })}`);
      }
    }
    // A key's name is the one thing on a key that must never be cut short.
    document.querySelectorAll(".pwt-key-name").forEach((el) => {
      if (el.scrollWidth > el.clientWidth + 1) out.push(`key name cut short: "${el.textContent.trim()}"`);
    });
    return out;
  });
}

/**
  Round 7: a rider preview never prints over its cell's number (its box must not touch the number,
  the struck pair or the letter, and must sit inside the cell); a landing number, measured where it
  comes to rest, stays inside the stage and off every element tag, letter tag, plaque and knockout
  mark; a banner sentence is never cut (its text fits its box).
*/
async function riderProblems(page) {
  return page.evaluate(() => {
    const out = [];
    const hit = (a, b) => a.left < b.right - 0.5 && a.right > b.left + 0.5 && a.top < b.bottom - 0.5 && a.bottom > b.top + 0.5;
    document.querySelectorAll(".pwt-cell.has-rider").forEach((cell) => {
      const rider = cell.querySelector(".pwt-cell-rider");
      if (!rider) return;
      const rr = rider.getBoundingClientRect();
      const cr = cell.getBoundingClientRect();
      if (rr.left < cr.left - 0.5 || rr.right > cr.right + 0.5 || rr.top < cr.top - 0.5 || rr.bottom > cr.bottom + 0.5)
        out.push(`rider box leaves its cell: ${cell.getAttribute("aria-label")?.slice(0, 40)}`);
      for (const sel of [".pwt-cell-num", ".pwt-cell-hinder", ".pwt-cell-letter"]) {
        cell.querySelectorAll(sel).forEach((n) => {
          if (rider.contains(n)) return;
          if (hit(rr, n.getBoundingClientRect())) out.push(`rider overlaps ${sel}: ${cell.getAttribute("aria-label")?.slice(0, 40)}`);
        });
      }
    });
    document.querySelectorAll(".pwt-key").forEach((key) => {
      const kr = key.getBoundingClientRect();
      key.querySelectorAll("*").forEach((el) => {
        if (el.closest(".pwt-note") || el.closest("svg")) return;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) return;
        if (r.left < kr.left - 1 || r.right > kr.right + 1 || r.top < kr.top - 1 || r.bottom > kr.bottom + 1)
          out.push(`${el.className.toString().split(" ")[0] || el.tagName} pokes out of its key "${key.getAttribute("aria-label")}"`);
      });
    });
    const line = document.querySelector(".pwt-banner-line");
    if (line && line.scrollHeight > line.clientHeight + 1) out.push(`banner sentence truncated: "${line.textContent.trim().slice(0, 50)}"`);
    return out;
  });
}
async function floatProblems(page) {
  return page.evaluate(() => {
    const out = [];
    const stage = document.querySelector(".pwt-stage");
    if (!stage) return out;
    const sb = stage.getBoundingClientRect();
    const z = sb.width / stage.offsetWidth || 1;
    const hit = (a, b) => a.left < b.right - 0.5 && a.right > b.left + 0.5 && a.top < b.bottom - 0.5 && a.bottom > b.top + 0.5;
    stage.querySelectorAll(".pwt-float").forEach((f) => {
      const anims = f.getAnimations();
      if (anims.length && !anims.every((a) => a.playState === "finished")) return; // measure at rest only
      const r = f.getBoundingClientRect();
      if (r.left < sb.left - 0.5 || r.right > sb.right + 0.5 || r.top < sb.top - 0.5 || r.bottom > sb.bottom + 0.5)
        out.push(`landing number leaves the stage: "${f.textContent.trim()}" ${JSON.stringify({ l: r.left | 0, r: r.right | 0, t: r.top | 0, b: r.bottom | 0, sl: sb.left | 0, sr: sb.right | 0 })}`);
      stage.querySelectorAll(".pwt-el, .pwt-letter, .pwt-plaque, .pwt-guardian-tag, .pwt-ko").forEach((a) => {
        if (hit(r, a.getBoundingClientRect())) out.push(`landing number "${f.textContent.trim()}" sits on ${a.className.split(" ")[0]}`);
      });
    });
    return out;
  });
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
      const { page, close, phone } = await openPage(browser, w, h);
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
      // On a phone the key bar sits beside the stage, not under it: the squad plaques then have
      // to stay clear of it sideways instead of above it.
      const keysBeside = keybarBox && keybarBox.x >= stageBox.x + stageBox.width - 1;
      if (keysBeside) {
        for (let i = 0; i < result.squadPlaques.length; i++) {
          checks++;
          const p = result.squadPlaques[i];
          if (p.x + p.width > keybarBox.x + 0.5) {
            failures++;
            console.log(`[${tag}] FAIL squad plaque[${i}] right edge (${(p.x + p.width).toFixed(1)}) runs into the key column (${keybarBox.x.toFixed(1)})`);
          }
        }
      } else if (keybarBox) {
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

      if (phone) {
        const probs = await phoneProblems(page);
        checks++;
        if (probs.length) {
          failures += probs.length;
          probs.forEach((m) => console.log(`[${tag}] FAIL phone: ${m}`));
        } else console.log(`[${tag}] phone checks ok (12px text, 40px controls, nothing clipped or outside)`);
      }
      {
        const probs = await riderProblems(page);
        checks++;
        if (probs.length) {
          failures += probs.length;
          probs.forEach((m) => console.log(`[${tag}] FAIL ${m}`));
        }
      }
      for (const sel of [".pwt-panel", ".pwt-titlecard", ".pwt-hold-card"]) {
        const probs = await panelProblems(page, sel);
        if (probs) {
          checks++;
          if (probs.length) {
            failures += probs.length;
            probs.forEach((m) => console.log(`[${tag}] FAIL ${sel}: ${m}`));
          }
        }
      }
      await page.screenshot({ path: path.join(OUT, `${tag}.png`) });

      // Round 7: play the first ready cell out and check, on every frame that settles, the landing
      // numbers (inside the stage, off tags and plaques) and the banner sentence (never cut).
      if (["first", "before-enemy-phase", "power-hippochamp", "checkpoint-graviclaw"].includes(scen.name) && !(phone && scen.name === "first")) {
        const cell = page.locator(".pwt-key .pwt-cell:not([disabled])").first();
        if (await cell.count()) {
          if (phone) {
            await cell.tap();
            await page.waitForTimeout(150);
            await page.locator(".pwt-cell.previewed").first().tap();
          } else {
            await cell.click();
            await page.mouse.move(2, 2);
          }
          const seen = new Set();
          checks++;
          for (let i = 0; i < 70; i++) {
            const b = await page.evaluate(() => document.querySelector("[data-busy]")?.getAttribute("data-busy"));
            (await floatProblems(page)).forEach((m) => seen.add(m));
            (await riderProblems(page)).forEach((m) => seen.add(m));
            if (b !== "true" && i > 3) break;
            await page.waitForTimeout(250);
          }
          if (seen.size) {
            failures += seen.size;
            seen.forEach((m) => console.log(`[${tag}] FAIL while playing out: ${m}`));
          } else console.log(`[${tag}] playing out: landing numbers and banner sentences ok`);
        }
      }

      // The tap flow, once per phone size on the first scenario with a turn on it: the first tap
      // on a key cell previews it (the stage rings its target, the move is not used), the second
      // tap on the same cell uses it.
      if (phone && scen.name === "first") {
        const cell = page.locator(".pwt-key .pwt-cell:not([disabled])").first();
        const busy = () => page.evaluate(() => document.querySelector("[data-busy]").getAttribute("data-busy"));
        checks++;
        await cell.tap();
        await page.waitForTimeout(200);
        const previewed = await page.locator(".pwt-cell.previewed").count();
        const ringed = await page.locator(".pwt-plate.targeted").count();
        if (previewed !== 1 || (await busy()) !== "false") {
          failures++;
          console.log(`[${tag}] FAIL first tap should preview only (previewed cells ${previewed}, busy ${await busy()})`);
        } else if (ringed < 1) {
          failures++;
          console.log(`[${tag}] FAIL first tap did not ring its target on the stage`);
        } else console.log(`[${tag}] first tap previews and rings its target ok`);
        checks++;
        await page.locator(".pwt-cell.previewed").first().tap();
        await page.waitForTimeout(300);
        if ((await busy()) !== "true") {
          failures++;
          console.log(`[${tag}] FAIL second tap on the same cell did not use the move`);
        } else console.log(`[${tag}] second tap uses the move ok`);
        // The move and the enemy turns that follow play out: the same phone checks on those
        // frames (the banner names an enemy and its letter, the key column is one card, speed and
        // skip are 40 px or more).
        checks++;
        const seen = new Set();
        for (let i = 0; i < 16 && (await busy()) === "true"; i++) {
          (await phoneProblems(page)).forEach((m) => seen.add(m));
          (await floatProblems(page)).forEach((m) => seen.add(m));
          (await riderProblems(page)).forEach((m) => seen.add(m));
          await page.waitForTimeout(400);
        }
        if (seen.size) {
          failures += seen.size;
          seen.forEach((m) => console.log(`[${tag}] FAIL phone (while playing out): ${m}`));
        } else console.log(`[${tag}] phone checks ok while the move and the enemy turns play out`);
      }
      await close();
    }
  }

  // The arrival screens: the briefing, the sector title card, the legend and the restart dialog.
  const first = files.find((f) => f.name === "first");
  for (const [w, h] of sizes) {
    const tag = `arrival-${w}x${h}`;
    const { page, close, phone } = await openPage(browser, w, h);
    await page.goto(`${BASE}/powerworks`, { waitUntil: "networkidle" });
    await page.evaluate(() => localStorage.clear());
    await page.goto(`${BASE}/powerworks`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    const steps = [];
    steps.push([".pwt-briefing", await panelProblems(page, ".pwt-briefing")]);
    if (phone) {
      const probs = await phoneProblems(page);
      checks++;
      if (probs.length) {
        failures += probs.length;
        probs.forEach((m) => console.log(`[${tag}] FAIL phone briefing: ${m}`));
      }
    }
    await press(page, phone, page.locator("button:has-text('Begin')"));
    await page.waitForTimeout(700);
    steps.push([".pwt-titlecard", await panelProblems(page, ".pwt-titlecard")]);
    if (first) {
      await page.evaluate((s) => localStorage.setItem("xalians.powerworks.turns.v1", s), fs.readFileSync(first.file, "utf8"));
      await page.goto(`${BASE}/powerworks`, { waitUntil: "networkidle" });
      await page.waitForTimeout(500);
    }
    await openTool(page, phone, "Guide");
    await page.waitForTimeout(300);
    steps.push([".pwt-guide", await panelProblems(page, ".pwt-guide", phone)]);
    if (phone) {
      const probs = await phoneProblems(page);
      checks++;
      if (probs.length) {
        failures += probs.length;
        probs.forEach((m) => console.log(`[${tag}] FAIL phone guide: ${m}`));
      }
    }
    await page.screenshot({ path: path.join(OUT, `${tag}-guide.png`) });
    await press(page, phone, page.locator("button:has-text('Close')"));
    await openTool(page, phone, "Restart");
    await page.waitForTimeout(200);
    steps.push([".pwt-panel restart", await panelProblems(page, ".pwt-panel")]);
    for (const [name, probs] of steps) {
      checks++;
      if (!probs) {
        failures++;
        console.log(`[${tag}] FAIL ${name} not found`);
      } else if (probs.length) {
        failures += probs.length;
        probs.forEach((m) => console.log(`[${tag}] FAIL ${name}: ${m}`));
      } else console.log(`[${tag}] ${name} ok`);
    }
    await close();
  }
  await browser.close();
  console.log(`\n${checks} checks, ${failures} failures`);
  if (failures > 0) {
    console.log("GEOMETRY CHECK FAILED");
    process.exit(1);
  }
  console.log("GEOMETRY CHECK PASSED");
})();
