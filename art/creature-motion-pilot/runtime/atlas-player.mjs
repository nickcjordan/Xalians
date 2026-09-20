/** A small, engine-neutral reader for xalians-frame-atlas-v1 exports. */

export function validateManifest(manifest) {
  if (manifest?.format !== 'xalians-frame-atlas-v1') throw new Error('Unsupported atlas format');
  if (!Array.isArray(manifest.canvas) || manifest.canvas.length !== 2) throw new Error('Invalid canvas');
  if (!Array.isArray(manifest.origin) || manifest.origin.length !== 2) throw new Error('Invalid origin');
  if (!manifest.clips || typeof manifest.clips !== 'object') throw new Error('Missing clips');
  for (const [name, clip] of Object.entries(manifest.clips)) {
    if (!clip.sheet || !Number.isFinite(clip.fps) || clip.fps <= 0 || !Array.isArray(clip.frames) || !clip.frames.length) {
      throw new Error(`Invalid clip: ${name}`);
    }
    for (const frame of clip.frames) {
      if (![frame.x, frame.y, frame.w, frame.h].every(Number.isFinite) || frame.w <= 0 || frame.h <= 0) {
        throw new Error(`Invalid frame in ${name}`);
      }
    }
  }
  return manifest;
}

export function frameIndexAt(clip, elapsedMs) {
  const raw = Math.max(0, Math.floor(Math.max(0, elapsedMs) * clip.fps / 1000));
  return clip.loop ? raw % clip.frames.length : Math.min(raw, clip.frames.length - 1);
}

export function markersBetween(clip, previousMs, currentMs) {
  if (!Array.isArray(clip.markers) || currentMs <= previousMs) return [];
  const events = [];
  const period = clip.frames.length * 1000 / clip.fps;
  for (const marker of clip.markers) {
    if (!Number.isFinite(marker.time_ms) || marker.time_ms < 0 || marker.time_ms >= period) continue;
    let occurrence = marker.time_ms;
    if (clip.loop) occurrence += Math.max(0, Math.floor((previousMs - occurrence) / period)) * period;
    while (occurrence <= currentMs) {
      if (occurrence > previousMs) events.push({ ...marker, at_ms: occurrence });
      if (!clip.loop || events.length >= 32) break;
      occurrence += period;
    }
  }
  return events.sort((a, b) => a.at_ms - b.at_ms);
}

export function drawFrame(ctx, atlas, clipName, elapsedMs, x, y, scale = 1, flipX = false) {
  const clip = atlas.manifest.clips[clipName];
  if (!clip) throw new Error(`Unknown clip: ${clipName}`);
  const sheet = atlas.images[clip.sheet];
  if (!sheet) throw new Error(`Missing sheet: ${clip.sheet}`);
  const frame = clip.frames[frameIndexAt(clip, elapsedMs)];
  const [originX, originY] = atlas.manifest.origin;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flipX ? -scale : scale, scale);
  ctx.drawImage(sheet, frame.x, frame.y, frame.w, frame.h, -originX, -originY, frame.w, frame.h);
  ctx.restore();
  return frame;
}

export async function loadAtlas(manifestUrl) {
  const response = await fetch(manifestUrl);
  if (!response.ok) throw new Error(`Could not load ${manifestUrl}: ${response.status}`);
  const manifest = validateManifest(await response.json());
  const base = new URL('.', response.url || manifestUrl);
  const images = {};
  await Promise.all([...new Set(Object.values(manifest.clips).map((clip) => clip.sheet))].map(async (sheet) => {
    const image = new Image();
    image.src = new URL(sheet, base).href;
    await image.decode();
    images[sheet] = image;
  }));
  return { manifest, images };
}
