// Headless check of the Akinza sprite player (sprites-pass1-brief.md step 5). Numbers and screenshots only.
//
//   node art/species-construction/anim/sprite_player_shots.mjs <player.html> <shots dir> [playwright-core dir]
//
// Opens the page at 390 px (a phone: touch, device scale 3) and at 1440 px, and for each: waits for the reader,
// records the page and document widths (no horizontal scroll means scrollWidth <= the viewport), the smallest tap
// target, and saves a screenshot. At 390 px it also turns the socket dots on, queues Night Stalk at idle frame 0,
// steps the page's own sequencer through the clip and back to idle, and records the frame order and markers it
// shows; then mirrors it (facing right) and records the ground against the anchor. Writes <shots dir>/shots.json.
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [page, shots, pwDir = 'C:/dev/src/Xalians/node_modules/playwright-core'] = process.argv.slice(2);
const require = createRequire(import.meta.url);
const { chromium } = require(resolve(pwDir));
mkdirSync(shots, { recursive: true });
const url = pathToFileURL(resolve(page)).href;
const browser = await chromium.launch();
const out = { url, views: {} };

async function open(name, context) {
  const p = await context.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(String(e)));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto(url);
  await p.waitForFunction(() => window.__sprites?.ready === true, null, { timeout: 30000 });
  await p.waitForTimeout(600);
  const m = await p.evaluate(() => {
    const targets = [...document.querySelectorAll('button, label.toggle')].map((el) => el.getBoundingClientRect());
    return {
      innerWidth: window.innerWidth, scrollWidth: document.documentElement.scrollWidth, bodyScrollWidth: document.body.scrollWidth,
      horizontalScroll: document.documentElement.scrollWidth > window.innerWidth,
      smallestTarget: targets.reduce((a, r) => ({ w: Math.min(a.w, r.width), h: Math.min(a.h, r.height) }), { w: 1e9, h: 1e9 }),
      canvases: [...document.querySelectorAll('figure canvas')].map((c) => [c.style.width, c.style.height]),
      status: document.getElementById('status').textContent,
    };
  });
  out.views[name] = { ...m, errors };
  return p;
}

// desktop
const desk = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const pd = await open('desktop-1440', desk);
await pd.screenshot({ path: join(shots, 'player-desktop-1440.png'), fullPage: true });
await pd.check('#sockets');
await pd.click('#pause');
await pd.evaluate(() => { const s = window.__sprites.seq; s.play('sig.night-stalk'); for (let i = 0; i < 18; i++) s.advance(1000 / 30); });
await pd.click('#step');
await pd.screenshot({ path: join(shots, 'player-desktop-1440-stalk19-sockets.png'), fullPage: true });

// phone
const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const pp = await open('phone-390', phone);
await pp.screenshot({ path: join(shots, 'player-390.png'), fullPage: true });
// the page's own clock, stepped: pause, show sockets, queue Night Stalk at idle frame 0, step through and back
await pp.tap('#pause');
await pp.check('#sockets');
await pp.tap('#stalk');
const seqLog = await pp.evaluate(() => {
  const { seq } = window.__sprites;
  const shown = [], events = [];
  const queuedAt = `${seq.clip}:${seq.frame()}`;
  for (let i = 0; i < 90 + 45 + 3; i++) {
    const r = seq.advance(1000 / 30);
    shown.push(`${r.clip}:${r.frame}`);
    for (const e of r.events) events.push(`${e.name}@${Math.round(e.atMs)}`);
  }
  return { queuedAt, shown, events };
});
const at = seqLog.shown.indexOf('sig.night-stalk:0');
out.phoneSequence = {
  queuedAt: seqLog.queuedAt, before: seqLog.shown[at - 1], first: seqLog.shown[at],
  stalkFrames: seqLog.shown.slice(at, at + 45).every((s, k) => s === `sig.night-stalk:${k}`),
  after: seqLog.shown.slice(at + 45, at + 47), events: seqLog.events,
};
await pp.evaluate(() => { const s = window.__sprites.seq; s.play('sig.night-stalk'); for (let i = 0; i < 18; i++) s.advance(1000 / 30); });
await pp.tap('#step');
await pp.screenshot({ path: join(shots, 'player-390-stalk19-sockets.png'), fullPage: true });
const after = await pp.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
out.views['phone-390'].afterSockets = after;
// mirrored (facing right): the ground at the anchor frame stays on the anchor, x' = 2*ax - x
await pp.check('#mirror');
await pp.screenshot({ path: join(shots, 'player-390-stalk19-sockets-mirrored.png'), fullPage: true });
out.mirror = await pp.evaluate(() => {
  const { manifest: m, api } = window.__sprites;
  const { clip, frame, socket } = m.anchorFrom;
  return {
    anchor: m.anchor, formula: m.mirror.formula,
    groundRelativeToAnchorMirrored: api.socketAt(m, clip, 'side', frame, socket, { flipX: true }),
    eyeLMirroredInCell: api.socketInCell(m, 'sig.night-stalk', 'side', 19, 'eye_l', { flipX: true }),
    eyeLInCell: api.socketInCell(m, 'sig.night-stalk', 'side', 19, 'eye_l'),
    eyeRVisible: api.socketVisible(m, 'side', 'eye_r'), statusBarY: api.statusBarY(m, 'sig.night-stalk', 'side'),
    scrollWidth: document.documentElement.scrollWidth,
  };
});
await browser.close();
writeFileSync(join(shots, 'shots.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
