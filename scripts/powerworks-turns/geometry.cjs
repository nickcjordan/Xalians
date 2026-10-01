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
  scroll, and the tap flow (a tap selects a key and shows its numbers on the plates, a tap on an enemy uses it).

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
  Keys and plates (intents and keys): nothing on a key pokes out of it, and a banner sentence is never
  cut (its text fits its box). Each enemy's intent chip sits inside its plaque, is not cut short, and
  stays off the squad row's plaques, tags and the active pointer; a preview number (a key hovered or
  selected) sits inside its own plate's figure area and off that plate's plaque and tags, and inside the stage.
*/
async function riderProblems(page) {
  return page.evaluate(() => {
    const out = [];
    const hit = (a, b) => a.left < b.right - 0.5 && a.right > b.left + 0.5 && a.top < b.bottom - 0.5 && a.bottom > b.top + 0.5;
    document.querySelectorAll(".pwt-key").forEach((key) => {
      if (key.closest("[inert]")) return;
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
    // On a phone the banner clamps to two lines by design and the key column repeats the whole sentence while it plays.
    const isPhoneNow = window.innerWidth > window.innerHeight && window.innerHeight <= 500;
    if (line && !isPhoneNow && line.scrollHeight > line.clientHeight + 1) out.push(`banner sentence truncated: "${line.textContent.trim().slice(0, 50)}"`);
    if (!isPhoneNow) {
      const note = document.querySelector(".pwt-banner .pwt-note");
      if (note && note.scrollHeight > note.clientHeight + 1) out.push(`banner note cut short: "${note.textContent.trim().slice(0, 50)}"`);
      const status = document.querySelector(".pwt-banner-status");
      if (status && status.scrollWidth > status.clientWidth + 1) out.push(`banner status cut short: "${status.textContent.trim().slice(0, 50)}"`);
    }
    document.querySelectorAll(".pwt-plate").forEach((pl) => {
      const m = pl.querySelector(".pwt-match");
      const k = pl.querySelector(".pwt-ko");
      const e = pl.querySelector(".pwt-el");
      if (m && e && hit(m.getBoundingClientRect(), e.getBoundingClientRect())) out.push(`matchup mark overlaps the element tag on ${pl.getAttribute("data-unit")}`);
      if (k && e && hit(k.getBoundingClientRect(), e.getBoundingClientRect())) out.push(`"can fall" mark overlaps the element tag on ${pl.getAttribute("data-unit")}`);
    });
    const stage = document.querySelector(".pwt-stage");
    if (stage) {
      const sb = stage.getBoundingClientRect();
      const squadTags = [...stage.querySelectorAll(".pwt-row.squad .pwt-plaque, .pwt-row.squad .pwt-el, .pwt-row.squad .pwt-ko")];
      const artBounds = (f) => {
        const fr = f.getBoundingClientRect();
        const img = f.querySelector("img");
        if (img && img.naturalWidth && img.naturalHeight) {
          const k = Math.min(fr.width / img.naturalWidth, fr.height / img.naturalHeight);
          const w = img.naturalWidth * k;
          const h = img.naturalHeight * k;
          return { left: fr.left + (fr.width - w) / 2, right: fr.left + (fr.width + w) / 2, top: fr.bottom - h, bottom: fr.bottom };
        }
        return fr;
      };
      const squadArt = [...stage.querySelectorAll(".pwt-row.squad .pwt-figure")].map(artBounds);
      const pointers = [...stage.querySelectorAll(".pwt-spot-pointer")];
      stage.querySelectorAll(".pwt-intent").forEach((chip) => {
        if (getComputedStyle(chip).visibility === "hidden") return;
        const cr = chip.getBoundingClientRect();
        const plaque = chip.closest(".pwt-plaque");
        const pr = plaque.getBoundingClientRect();
        const who = chip.closest("[data-unit]")?.getAttribute("data-letter") ?? "?";
        if (cr.left < pr.left - 0.5 || cr.right > pr.right + 0.5 || cr.top < pr.top - 0.5 || cr.bottom > pr.bottom + 0.5) out.push(`intent chip of ${who} leaves its plaque`);
        chip.querySelectorAll("*").forEach((el) => {
          if (el.closest("svg")) return;
          const r = el.getBoundingClientRect();
          if (r.width && (r.left < cr.left - 0.5 || r.right > cr.right + 0.5 || r.top < cr.top - 0.5 || r.bottom > cr.bottom + 0.5)) out.push(`intent chip of ${who}: ${el.className.toString().split(" ")[0] || el.tagName} pokes out of the chip`);
          if (el.children.length === 0 && el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== "visible") out.push(`intent chip of ${who}: text clipped "${el.textContent.trim()}"`);
        });
        // While a beat plays the acting unit lunges toward its target (the enemy's chip stays lit): a lunge may cross the other row, so chips are not held to it then.
        const lunging = !!chip.closest(".pwt-plate.lit") || !!stage.querySelector(".pwt-rows")?.style.getPropertyValue("--lunge-x");
        for (const a of squadTags) if (!lunging && hit(cr, a.getBoundingClientRect())) out.push(`intent chip of ${who} overlaps a squad plate tag (${a.className.toString().split(" ")[0]})`);
        for (const a of squadArt) if (!lunging && hit(cr, a)) out.push(`intent chip of ${who} overlaps a squad figure`);
        for (const a of pointers) if (hit(cr, a.getBoundingClientRect())) out.push(`intent chip of ${who} overlaps the active pointer`);
      });
      stage.querySelectorAll(".pwt-preview").forEach((pv) => {
        const r = pv.getBoundingClientRect();
        const plate = pv.closest("[data-unit]");
        const who = plate?.getAttribute("data-unit") ?? "?";
        if (r.left < sb.left - 0.5 || r.right > sb.right + 0.5 || r.top < sb.top - 0.5 || r.bottom > sb.bottom + 0.5) out.push(`preview on ${who} leaves the stage`);
        const body = pv.closest(".pwt-body");
        const br = body.getBoundingClientRect();
        const onPhone0 = window.innerWidth > window.innerHeight && window.innerHeight <= 500;
        // On a phone the figure area is short: the number may rise above it (it stays inside the stage and off the tags), never beside it.
        if (r.left < br.left - 0.5 || r.right > br.right + 0.5 || r.bottom > br.bottom + 0.5 || (!onPhone0 && r.top < br.top - 0.5)) out.push(`preview on ${who} leaves its plate's figure area`);
        // On a phone the figure area is too short to keep the number off the letter tag; the plaque's own name
        // ("A · Maintenance crawler") still carries the letter, so only there may a preview cover it (and the guardian tag, which the name row repeats).
        const onPhone = window.innerWidth > window.innerHeight && window.innerHeight <= 500;
        plate.querySelectorAll(".pwt-plaque, .pwt-el, .pwt-match, .pwt-letter, .pwt-ko, .pwt-guardian-tag").forEach((a) => {
          if (onPhone && (a.classList.contains("pwt-letter") || a.classList.contains("pwt-guardian-tag"))) return;
          if (hit(r, a.getBoundingClientRect())) { const q = a.getBoundingClientRect(); out.push(`preview on ${who} covers ${a.className.toString().split(" ")[0]} (preview ${r.left | 0},${r.top | 0},${r.right | 0},${r.bottom | 0}; tag ${q.left | 0},${q.top | 0},${q.right | 0},${q.bottom | 0})`); }
        });
        pv.querySelectorAll("*").forEach((el) => {
          if (el.closest("svg")) return;
          const er = el.getBoundingClientRect();
          if (er.width && (er.left < r.left - 0.5 || er.right > r.right + 0.5)) out.push(`preview on ${who}: ${el.className.toString().split(" ")[0] || el.tagName} pokes out of the badge`);
        });
      });
    }
    return out;
  });
}

/**
  Moves on the stage (docs/design/powerworks-stage-moves.md, desktop): the row of moves above the acting
  companion stays inside the stage, every card and Pass is at least 44 px tall, and the row (and the hover tip above
  it) covers no enemy or squad plate part (plaque, letter, element tag, intent chip, matchup mark, "can fall" mark,
  guardian tag, health change chip), no preview number, no painted figure and no active pointer. Returns the acting
  companion's slot too, so a run can say which slots it covered.
*/
async function movesProblems(page) {
  return page.evaluate(() => {
    const out = [];
    const row = document.querySelector(".pwt-moves-row");
    const stage = document.querySelector(".pwt-stage");
    if (!row || !stage) return { out, slot: null };
    const hit = (a, b) => a.left < b.right - 0.5 && a.right > b.left + 0.5 && a.top < b.bottom - 0.5 && a.bottom > b.top + 0.5;
    const sb = stage.getBoundingClientRect();
    const inside = (r) => r.left >= sb.left - 0.5 && r.right <= sb.right + 0.5 && r.top >= sb.top - 0.5 && r.bottom <= sb.bottom + 0.5;
    const mine = [["row", row.getBoundingClientRect()]];
    const tip = document.querySelector(".pwt-moves-tip");
    if (tip) mine.push(["tip", tip.getBoundingClientRect()]);
    for (const [what, r] of mine) if (!inside(r)) out.push(`the moves ${what} leaves the stage (${r.left | 0},${r.top | 0},${r.right | 0},${r.bottom | 0})`);
    row.querySelectorAll("button").forEach((b) => {
      const r = b.getBoundingClientRect();
      const z = r.width / b.offsetWidth || 1;
      if (r.height / z < 43.5) out.push(`move card under 44 px tall (${(r.height / z).toFixed(1)}): "${(b.getAttribute("aria-label") || b.textContent).trim().slice(0, 24)}"`);
      if (b.scrollWidth > b.clientWidth + 1) out.push(`move card content wider than the card: "${b.textContent.trim().slice(0, 24)}"`);
    });
    const parts = [...stage.querySelectorAll(".pwt-plaque, .pwt-letter, .pwt-el, .pwt-ko, .pwt-intent, .pwt-match, .pwt-guardian-tag, .pwt-delta, .pwt-preview, .pwt-spot-pointer, .pwt-float")];
    const art = (f) => {
      const fr = f.getBoundingClientRect();
      const img = f.querySelector("img");
      if (img && img.naturalWidth && img.naturalHeight) {
        const k = Math.min(fr.width / img.naturalWidth, fr.height / img.naturalHeight);
        const w = img.naturalWidth * k;
        const h = img.naturalHeight * k;
        return { left: fr.left + (fr.width - w) / 2, right: fr.left + (fr.width + w) / 2, top: fr.bottom - h, bottom: fr.bottom };
      }
      return fr;
    };
    for (const [what, r] of mine) {
      for (const a of parts) {
        const ar = a.getBoundingClientRect();
        if (ar.width && hit(r, ar)) out.push(`the moves ${what} covers ${a.className.toString().split(" ")[0]} of ${a.closest("[data-unit]")?.getAttribute("data-unit") ?? "?"}`);
      }
      stage.querySelectorAll(".pwt-figure").forEach((f) => {
        if (hit(r, art(f))) out.push(`the moves ${what} covers the figure of ${f.closest("[data-unit]")?.getAttribute("data-unit") ?? "?"}`);
      });
    }
    const squad = [...stage.querySelectorAll(".pwt-row.squad [data-unit]")];
    const slot = squad.findIndex((p) => p.classList.contains("active"));
    return { out, slot };
  });
}
/** Round 8, item 7: on a phone the rail always keeps the round divider and at least one next-round slot after it. */
async function railProblems(page) {
  return page.evaluate(() => {
    const ol = document.querySelector(".pwt-rail[data-rail]");
    if (!ol || !ol.querySelector("[data-slot]")) return [];
    const kids = [...ol.children];
    const d = kids.findIndex((k) => k.classList.contains("pwt-rail-divider"));
    if (d < 0) return ["phone rail lost its round divider"];
    if (!kids.slice(d + 1).some((k) => k.hasAttribute("data-slot"))) return ["phone rail has a divider and no next-round slot"];
    return [];
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
      const phoneNow = window.innerWidth > window.innerHeight && window.innerHeight <= 500;
      stage.querySelectorAll(".pwt-el, .pwt-letter, .pwt-plaque, .pwt-guardian-tag, .pwt-ko").forEach((a) => {
        // A phone's figure area is too short to keep a landing number off the letter and guardian tags; the plaque's name row repeats both.
        if (phoneNow && (a.classList.contains("pwt-letter") || a.classList.contains("pwt-guardian-tag"))) return;
        if (hit(r, a.getBoundingClientRect())) out.push(`landing number "${f.textContent.trim()}" sits on ${a.className.split(" ")[0]}`);
      });
      // Round 8, item 2: the number's horizontal center lies within its own target's plate.
      const plate = stage.querySelector(`[data-unit="${f.dataset.target}"]`);
      if (plate) {
        const pr = plate.getBoundingClientRect();
        const cx = (r.left + r.right) / 2;
        if (cx < pr.left - 0.5 || cx > pr.right + 0.5)
          out.push(`landing number "${f.textContent.trim()}" is outside its target's column (center ${cx | 0}, plate ${pr.left | 0} to ${pr.right | 0})`);
        // The pair reads as landing on its target only if the big number itself is over that plate too.
        const num = f.querySelector(".pwt-float-num");
        if (num) {
          const nr = num.firstChild && num.firstChild.nodeType === 3 ? (() => { const rg = document.createRange(); rg.selectNodeContents(num.firstChild); return rg.getBoundingClientRect(); })() : num.getBoundingClientRect();
          const ncx = (nr.left + nr.right) / 2;
          if (ncx < pr.left - 0.5 || ncx > pr.right + 0.5) out.push(`landing digits "${f.textContent.trim()}" are over a neighbor (digits center ${ncx | 0}, plate ${pr.left | 0} to ${pr.right | 0})`);
        }
      }
    });
    // Round 8, item 9: the one plaque of an end hold covers no plate: no plaque, letter or tag, and no painted figure
    // (the art's own bounds inside its box, at its natural proportions).
    const card = stage.querySelector(".pwt-hold-card");
    if (card) {
      const cr = card.getBoundingClientRect();
      stage.querySelectorAll(".pwt-plaque, .pwt-letter, .pwt-el, .pwt-guardian-tag").forEach((a) => {
        if (hit(cr, a.getBoundingClientRect())) out.push(`hold plaque "${card.textContent.trim()}" covers ${a.className.split(" ")[0]}`);
      });
      stage.querySelectorAll(".pwt-figure").forEach((f) => {
        const fr = f.getBoundingClientRect();
        const img = f.querySelector("img");
        let ar = fr;
        if (img && img.naturalWidth && img.naturalHeight) {
          const k = Math.min(fr.width / img.naturalWidth, fr.height / img.naturalHeight);
          const w = img.naturalWidth * k;
          const h = img.naturalHeight * k;
          ar = { left: fr.left + (fr.width - w) / 2, right: fr.left + (fr.width + w) / 2, top: fr.bottom - h, bottom: fr.bottom };
        }
        if (hit(cr, ar)) out.push(`hold plaque "${card.textContent.trim()}" covers a figure`);
      });
    }
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
  const slotsSeen = new Set();

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
      if (phone) {
        const probs = await railProblems(page);
        checks++;
        if (probs.length) {
          failures += probs.length;
          probs.forEach((m) => console.log(`[${tag}] FAIL ${m}`));
        }
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
      if (!phone) {
        const { out: mp, slot } = await movesProblems(page);
        if (slot !== null) {
          checks++;
          slotsSeen.add(`${scen.name}:${slot + 1}`);
          if (mp.length) {
            failures += mp.length;
            mp.forEach((m) => console.log(`[${tag}] FAIL moves (slot ${slot + 1}): ${m}`));
          } else console.log(`[${tag}] moves row (slot ${slot + 1}) inside the stage, cards 44 px+, clear of plates, chips, numbers, letters ok`);
        }
      }
      await page.screenshot({ path: path.join(OUT, `${tag}.png`) });

      // Every ready key in turn, hovered (a desktop) or tapped (a phone): the previews on the plates sit where
      // they should, and on a phone the text and controls hold their floors with the previews showing.
      if (await page.locator("button.pwt-key:not([disabled])").count()) {
        const n = await page.locator("button.pwt-key").count();
        const seenKey = new Set();
        checks++;
        for (let k = 1; k <= n; k++) {
          const key = page.locator(`button.pwt-key[data-key="${k}"]`);
          if (await key.isDisabled()) continue;
          if (phone) await key.tap();
          else {
            await page.mouse.move(3, 3);
            await key.hover();
            await page.mouse.move(3, 3);
            await key.hover();
          }
          await page.waitForTimeout(160);
          const previews = await page.locator("[data-preview]").count();
          if (!previews) seenKey.add(`key ${k}: no previews on any plate`);
          (await riderProblems(page)).forEach((m) => seenKey.add(`key ${k}: ${m}`));
          if (!phone) (await movesProblems(page)).out.forEach((m) => seenKey.add(`key ${k}: ${m}`));
          if (phone) (await phoneProblems(page)).forEach((m) => seenKey.add(`key ${k}: ${m}`));
          if (k >= 1) await page.screenshot({ path: path.join(OUT, `${tag}-key${k}.png`) });
          if (phone) {
            const box = await page.locator(".pwt-stage").boundingBox();
            await page.touchscreen.tap(box.x + 6, box.y + 6);
          } else await page.keyboard.press("Escape");
          await page.waitForTimeout(80);
        }
        if (seenKey.size) {
          failures += seenKey.size;
          seenKey.forEach((m) => console.log(`[${tag}] FAIL with a key shown: ${m}`));
        } else console.log(`[${tag}] every ready key's previews sit on their plates ok`);
      }

      // Round 7: play the first ready key out and check, on every frame that settles, the landing
      // numbers (inside the stage, off tags and plaques) and the banner sentence (never cut).
      if (["first", "before-enemy-phase", "power-hippochamp", "checkpoint-graviclaw", "final-blow", "last-blow", "last-stand"].includes(scen.name) && !(phone && scen.name === "first")) {
        const key = page.locator("button.pwt-key:not([disabled])").first();
        if (await key.count()) {
          if (phone) await key.tap();
          else await key.click();
          await page.waitForTimeout(150);
          const busyNow = () => page.evaluate(() => document.querySelector("[data-busy]")?.getAttribute("data-busy") === "true");
          if (!(await busyNow())) {
            const plate = page.locator(".pwt-plate.pickable .pwt-figure").first();
            if (await plate.count()) await (phone ? plate.tap() : plate.click());
            else if (phone) await key.tap();
          }
          if (!phone) await page.mouse.move(2, 2);
          const seen = new Set();
          checks++;
          for (let i = 0; i < 70; i++) {
            const b = await page.evaluate(() => document.querySelector("[data-busy]")?.getAttribute("data-busy"));
            (await floatProblems(page)).forEach((m) => seen.add(m));
            (await riderProblems(page)).forEach((m) => seen.add(m));
            if (phone && b === "true") (await railProblems(page)).forEach((m) => seen.add(m));
            if (b !== "true" && i > 3) break;
            await page.waitForTimeout(250);
          }
          if (seen.size) {
            failures += seen.size;
            seen.forEach((m) => console.log(`[${tag}] FAIL while playing out: ${m}`));
          } else console.log(`[${tag}] playing out: landing numbers and banner sentences ok`);
        }
      }

      // The tap flow, once per phone size on the first scenario with a turn on it: the first tap on a key
      // selects it (its numbers show on the plates, the move is not used), and a tap on an enemy uses it.
      if (phone && scen.name === "first") {
        const busy = () => page.evaluate(() => document.querySelector("[data-busy]").getAttribute("data-busy"));
        // The second key of the first scenario is a single-target attack: it needs a target.
        const key = page.locator('button.pwt-key[data-key="2"]');
        checks++;
        await key.tap();
        await page.waitForTimeout(200);
        const selected = await page.locator("button.pwt-key.selected").count();
        const previews = await page.locator("[data-preview]").count();
        if (selected !== 1 || (await busy()) !== "false") {
          failures++;
          console.log(`[${tag}] FAIL first tap should select only (selected keys ${selected}, busy ${await busy()})`);
        } else if (previews < 1) {
          failures++;
          console.log(`[${tag}] FAIL first tap did not show its numbers on the plates`);
        } else console.log(`[${tag}] first tap selects and shows its numbers on the plates ok`);
        checks++;
        await page.locator(".pwt-plate.pickable .pwt-figure").first().tap();
        await page.waitForTimeout(300);
        if ((await busy()) !== "true") {
          failures++;
          console.log(`[${tag}] FAIL a tap on an enemy did not use the move`);
        } else console.log(`[${tag}] a tap on an enemy uses the move ok`);
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
    const keybarBox = () => page.evaluate(() => { const k = document.querySelector(".pwt-keybar, .pwt-moves"); if (!k) return null; const r = k.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map((n) => Math.round(n)).join(","); });
    const keybarBefore = await keybarBox();
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
    // Round 8, item 10: nothing behind a dialog moves; the key bar keeps its place and size under it.
    steps.push(["key bar stays put under the dialog", (await keybarBox()) === keybarBefore ? [] : [`key bar moved: ${keybarBefore} -> ${await keybarBox()}`]]);
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
  console.log("moves row checked for acting slots: " + [...slotsSeen].sort().join(", "));
  console.log(`\n${checks} checks, ${failures} failures`);
  if (failures > 0) {
    console.log("GEOMETRY CHECK FAILED");
    process.exit(1);
  }
  console.log("GEOMETRY CHECK PASSED");
})();
