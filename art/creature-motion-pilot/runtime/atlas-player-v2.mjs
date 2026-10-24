/**
 * An engine-neutral reader for xalians-frame-atlas-v2 (docs/design/creature-asset-contract.md section 8 and
 * decision 12). The v1 reader (atlas-player.mjs) stays frozen for the old studies; v2 is a new format id.
 *
 * A v2 atlas has one fixed cell for every clip and facing (the same cell, ground line and scale, so a game can swap
 * clips without a jump). Each frame is stored trimmed in its clip-and-facing sheet at (x, y, w, h) and goes back
 * into the cell at `offset` (its top-left in cell pixels). `anchor` is the cell pixel a game puts on the
 * creature's floor point. Sockets are per frame, in cell pixels (origin top-left, y down). Clip events are
 * `markers` with `timeMs`. A clip that does not loop names the clip and frame that follow it in `then`; a clip that
 * starts from another clip's pose names it in `entry`.
 */

export const FORMAT = 'xalians-frame-atlas-v2';

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isInt = (v) => Number.isInteger(v);
const isPoint = (p) => Array.isArray(p) && p.length === 2 && p.every(isNum);

/** Throws on anything a reader cannot play; returns the manifest. Pixel bounds against the sheets are the validator's. */
export function validateManifest(manifest) {
  const fail = (m) => { throw new Error(`Invalid v2 atlas: ${m}`); };
  if (manifest?.format !== FORMAT) throw new Error('Unsupported atlas format');
  const cell = manifest.cell;
  if (!cell || !isInt(cell.w) || !isInt(cell.h) || cell.w <= 0 || cell.h <= 0) fail('cell');
  if (!isPoint(manifest.anchor)) fail('anchor');
  if (!isNum(manifest.fps) || manifest.fps <= 0) fail('fps');
  if (!manifest.facings || typeof manifest.facings !== 'object' || !Object.keys(manifest.facings).length) fail('facings');
  if (!Array.isArray(manifest.sockets)) fail('sockets');
  if (!manifest.clips || typeof manifest.clips !== 'object' || !Object.keys(manifest.clips).length) fail('clips');
  for (const [name, clip] of Object.entries(manifest.clips)) {
    if (!isInt(clip.frameCount) || clip.frameCount <= 0) fail(`${name}: frameCount`);
    if (!isNum(clip.durationMs) || Math.abs(clip.durationMs - clip.frameCount * 1000 / manifest.fps) > 0.01) fail(`${name}: durationMs`);
    if (typeof clip.loop !== 'boolean') fail(`${name}: loop`);
    if (!Array.isArray(clip.markers)) fail(`${name}: markers`);
    for (const m of clip.markers) {
      if (typeof m.name !== 'string' || !isNum(m.timeMs) || m.timeMs < 0 || m.timeMs >= clip.durationMs) fail(`${name}: marker ${m?.name}`);
    }
    for (const key of ['then', 'entry']) {
      const link = clip[key];
      if (link === undefined) continue;
      const target = manifest.clips[link?.clip];
      if (!target || !isInt(link.frame) || link.frame < 0 || link.frame >= target.frameCount) fail(`${name}: ${key}`);
    }
    if (!clip.facings || typeof clip.facings !== 'object') fail(`${name}: facings`);
    for (const [facing, side] of Object.entries(clip.facings)) {
      if (!manifest.facings[facing]) fail(`${name}: unknown facing ${facing}`);
      if (typeof side.sheet !== 'string' || !Array.isArray(side.frames) || side.frames.length !== clip.frameCount) fail(`${name}/${facing}: frames`);
      for (const [i, fr] of side.frames.entries()) {
        if (![fr.x, fr.y, fr.w, fr.h].every(isInt) || fr.w <= 0 || fr.h <= 0) fail(`${name}/${facing} frame ${i}: rect`);
        if (!isPoint(fr.offset)) fail(`${name}/${facing} frame ${i}: offset`);
        if (fr.offset[0] < 0 || fr.offset[1] < 0 || fr.offset[0] + fr.w > cell.w || fr.offset[1] + fr.h > cell.h) fail(`${name}/${facing} frame ${i}: outside the cell`);
        for (const s of manifest.sockets) if (!isPoint(fr.sockets?.[s])) fail(`${name}/${facing} frame ${i}: socket ${s}`);
      }
    }
  }
  return manifest;
}

export function frameDurationMs(manifest) {
  return 1000 / manifest.fps;
}

/** The frame index shown at elapsedMs into the clip: looping clips wrap, others hold their last frame. */
export function frameIndexAt(manifest, clip, elapsedMs) {
  const raw = Math.max(0, Math.floor((Math.max(0, elapsedMs) * manifest.fps) / 1000 + 1e-9));
  return clip.loop ? raw % clip.frameCount : Math.min(raw, clip.frameCount - 1);
}

/** Markers whose time falls in (previousMs, currentMs], with `atMs` on the clip's own clock (loops repeat them). */
export function markersBetween(clip, previousMs, currentMs) {
  if (!Array.isArray(clip.markers) || currentMs <= previousMs) return [];
  const out = [];
  const period = clip.durationMs;
  for (const marker of clip.markers) {
    let at = marker.timeMs;
    if (clip.loop) at += Math.max(0, Math.floor((previousMs - at) / period)) * period;
    while (at <= currentMs) {
      if (at > previousMs) out.push({ ...marker, atMs: at });
      if (!clip.loop || out.length >= 64) break;
      at += period;
    }
  }
  return out.sort((a, b) => a.atMs - b.atMs);
}

export function frameOf(manifest, clipName, facing, index) {
  const clip = manifest.clips[clipName];
  if (!clip) throw new Error(`Unknown clip: ${clipName}`);
  const side = clip.facings[facing];
  if (!side) throw new Error(`Clip ${clipName} has no facing ${facing}`);
  return side.frames[index];
}

/**
 * A socket's position for one frame, relative to the anchor (so a game adds its own floor point), in cell pixels
 * times scale. flipX mirrors about the anchor, for drawing the facing the other way.
 */
export function socketAt(manifest, clipName, facing, index, socket, { scale = 1, flipX = false } = {}) {
  const p = frameOf(manifest, clipName, facing, index).sockets[socket];
  if (!p) throw new Error(`No socket ${socket}`);
  const dx = (p[0] - manifest.anchor[0]) * scale;
  return [flipX ? -dx : dx, (p[1] - manifest.anchor[1]) * scale];
}

/**
 * Draws one frame with the cell's anchor at (x, y). ctx needs save, translate, scale, drawImage, restore (a 2D
 * canvas context). Returns the frame.
 */
export function drawFrame(ctx, atlas, clipName, facing, index, x, y, scale = 1, flipX = false) {
  const { manifest, images } = atlas;
  const fr = frameOf(manifest, clipName, facing, index);
  const sheet = images[manifest.clips[clipName].facings[facing].sheet];
  if (!sheet) throw new Error(`Missing sheet for ${clipName}/${facing}`);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flipX ? -scale : scale, scale);
  ctx.drawImage(sheet, fr.x, fr.y, fr.w, fr.h, fr.offset[0] - manifest.anchor[0], fr.offset[1] - manifest.anchor[1], fr.w, fr.h);
  ctx.restore();
  return fr;
}

/**
 * Plays clips in sequence on one clock. advance(dtMs) moves time on and returns { clip, frame, events }: the frame
 * to show and every marker passed (each with its clip and `atMs` on that clip's clock). A clip that does not loop
 * hands off to its `then` clip and frame when its time is up, carrying the leftover time, so no image repeats or is
 * skipped. play(name) starts a clip now; play(name, { atEntry: true }) waits until the current clip reaches the new
 * clip's `entry` frame and starts the new clip in place of that frame.
 */
export function createSequencer(manifest, startClip = 'idle', startFrame = 0) {
  if (!manifest.clips[startClip]) throw new Error(`Unknown clip: ${startClip}`);
  const fd = frameDurationMs(manifest);
  const st = { clip: startClip, t: startFrame * fd, fresh: true, queued: null };
  const start = (name, t) => { st.clip = name; st.t = t; st.fresh = true; };
  const collect = (events, until) => {
    // markers of the current clip in (t, until]; a clip that has just started also fires one at exactly t
    const from = st.fresh ? st.t - 1e-6 : st.t;
    for (const e of markersBetween(manifest.clips[st.clip], from, until)) events.push({ clip: st.clip, ...e });
    st.fresh = false;
  };
  const seq = {
    get clip() { return st.clip; },
    get timeMs() { return st.t; },
    get queued() { return st.queued; },
    frame() { return frameIndexAt(manifest, manifest.clips[st.clip], st.t); },
    play(name, { atEntry = false } = {}) {
      const clip = manifest.clips[name];
      if (!clip) throw new Error(`Unknown clip: ${name}`);
      if (atEntry && clip.entry && clip.entry.clip === st.clip) st.queued = name;
      else { st.queued = null; start(name, 0); }
    },
    advance(dtMs) {
      const events = [];
      let left = Math.max(0, dtMs);
      for (let guard = 0; guard < 1000; guard++) {
        const clip = manifest.clips[st.clip];
        if (st.queued) {
          let at = manifest.clips[st.queued].entry.frame * fd;
          if (clip.loop) at += Math.max(0, Math.ceil((st.t - at) / clip.durationMs - 1e-9)) * clip.durationMs;
          else if (at < st.t) at = st.t;
          if (at - st.t <= left + 1e-9) {
            collect(events, at - 1e-6);              // the entry frame itself is replaced by the new clip's first
            left = Math.max(0, left - (at - st.t));
            const next = st.queued;
            st.queued = null;
            start(next, 0);
            continue;
          }
        }
        const step = Math.max(0, Math.min(left, clip.loop ? left : clip.durationMs - st.t));
        collect(events, st.t + step);
        st.t += step;
        left -= step;
        if (!clip.loop && clip.then && st.t >= clip.durationMs - 1e-9) {
          start(clip.then.clip, clip.then.frame * fd);
          if (left <= 1e-9) break;
          continue;
        }
        break;
      }
      const c = manifest.clips[st.clip];
      if (c.loop && st.t >= c.durationMs) st.t %= c.durationMs;
      return { clip: st.clip, frame: seq.frame(), events };
    },
  };
  return seq;
}

/** Loads a v2 atlas in a browser: the manifest by URL and every sheet beside it. */
export async function loadAtlas(manifestUrl) {
  const response = await fetch(manifestUrl);
  if (!response.ok) throw new Error(`Could not load ${manifestUrl}: ${response.status}`);
  const manifest = validateManifest(await response.json());
  const base = new URL('.', response.url || manifestUrl);
  return atlasFromSources(manifest, (sheet) => new URL(sheet, base).href);
}

/** Builds { manifest, images } from a manifest and a function giving each sheet's image source (a URL or data URI). */
export async function atlasFromSources(manifest, sourceOf) {
  validateManifest(manifest);
  const sheets = new Set();
  for (const clip of Object.values(manifest.clips)) for (const side of Object.values(clip.facings)) sheets.add(side.sheet);
  const images = {};
  await Promise.all([...sheets].map(async (sheet) => {
    const image = new Image();
    image.src = sourceOf(sheet);
    await image.decode();
    images[sheet] = image;
  }));
  return { manifest, images };
}
