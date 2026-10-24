// Validator for one xalians-frame-atlas-v2 folder (docs/design/creature-asset-contract.md sections 8 and 9,
// decision 12). Standalone, Node built-ins only, so it runs before the full contract validator (validate.mjs on the
// creature-pipeline branch) is present; the same checks are meant to become its "v2 atlases match their manifest".
//
//   node art/pipeline/contract/validate_atlas_v2.mjs <atlas folder>
//
// Checks: the manifest's shape; every listed file's sha256 (manifest.files) and every line of sha256.txt (which
// also covers manifest.json); each sheet is an 8-bit RGBA PNG; every frame lies inside its sheet, at least frameGapPx
// (4 or more) from every other frame; every frame's offset puts it inside the cell; every clip's duration is its frame
// count at the fps; markers lie inside their clip; `then` and `entry` name a real clip and frame; every socket the
// manifest declares is on every frame; alpha is straight and every fully transparent pixel beside a drawn pixel carries
// an edge color (within 96 levels on every channel of a drawn 4-neighbor, so no black bleeds in); the anchor is the
// ground socket of the frame `anchorFrom` names and `mirror` states x' = 2*ax - x; the scale's pixelsPerMeter and
// metersPerPixel agree; each facing lists every socket's visibility; each frame's status point sits at least
// statusIcon.clearPx above the drawn pixels under a statusIcon.maxWidthPx icon; each clip's statusBarY sits at least
// clearPx above every frame's highest drawn pixel. Exits 0 when all pass, 1 with the failures listed.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { inflateSync } from 'node:zlib';

const folder = process.argv[2];
if (!folder) {
  console.error('usage: node validate_atlas_v2.mjs <atlas folder>');
  process.exit(2);
}
const dir = resolve(folder);
const failures = [];
const passed = [];
const fail = (m) => failures.push(m);
const pass = (m) => passed.push(m);
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isInt = (v) => Number.isInteger(v);
const isPoint = (p) => Array.isArray(p) && p.length === 2 && p.every(isNum);
const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const EPS = 1e-6;

function pngHeader(path) {
  const b = readFileSync(path);
  if (b.length < 33 || b.readUInt32BE(0) !== 0x89504e47 || b.toString('ascii', 12, 16) !== 'IHDR') throw new Error('not a PNG');
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), depth: b[24], colorType: b[25], interlace: b[28] };
}

// 8-bit RGBA, non-interlaced PNG to { w, h, px } (px: w*h*4 bytes); the same reader as contract/png.mjs.
function readPngRgba(path) {
  const buf = readFileSync(path);
  let off = 8, w = 0, h = 0;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const tag = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (tag === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); }
    else if (tag === 'IDAT') idat.push(data);
    off += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * 4;
  const px = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const ft = raw[y * (stride + 1)];
    for (let i = 0; i < stride; i++) {
      const x = raw[y * (stride + 1) + 1 + i];
      const a = i >= 4 ? px[y * stride + i - 4] : 0;
      const b = y > 0 ? px[(y - 1) * stride + i] : 0;
      const c = i >= 4 && y > 0 ? px[(y - 1) * stride + i - 4] : 0;
      let v;
      if (ft === 0) v = x;
      else if (ft === 1) v = x + a;
      else if (ft === 2) v = x + b;
      else if (ft === 3) v = x + ((a + b) >> 1);
      else {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
      }
      px[y * stride + i] = v & 255;
    }
  }
  return { w, h, px };
}

function main() {
  const mpath = join(dir, 'manifest.json');
  if (!existsSync(mpath)) return fail(`no manifest.json in ${dir}`);
  let m;
  try { m = JSON.parse(readFileSync(mpath, 'utf8')); } catch (e) { return fail(`manifest.json does not parse: ${e.message}`); }

  // shape
  if (m.format !== 'xalians-frame-atlas-v2') fail(`format is ${m.format}, not xalians-frame-atlas-v2`);
  if (typeof m.species !== 'string' || !m.species) fail('species missing');
  const cell = m.cell;
  if (!cell || !isInt(cell.w) || !isInt(cell.h) || cell.w <= 0 || cell.h <= 0) return fail('cell must be { w, h } in whole pixels');
  if (!isPoint(m.anchor) || m.anchor[0] < 0 || m.anchor[1] < 0 || m.anchor[0] > cell.w || m.anchor[1] > cell.h) fail('anchor must be a point inside the cell');
  if (!isNum(m.fps) || m.fps <= 0) return fail('fps must be positive');
  if (!m.facings || !Object.keys(m.facings).length) fail('facings missing');
  if (!Array.isArray(m.sockets) || !m.sockets.length || m.sockets.some((s) => typeof s !== 'string')) fail('sockets must list socket names');
  if (!m.clips || !Object.keys(m.clips).length) return fail('clips missing');
  if (!m.files || typeof m.files !== 'object') return fail('files missing');
  if (m.alpha !== 'straight') fail(`alpha must be stated as straight (is ${m.alpha})`);
  if (typeof m.transparentRgb !== 'string' || !m.transparentRgb) fail('transparentRgb must say what fully transparent pixels carry');
  if (!isInt(m.frameGapPx) || m.frameGapPx < 4) fail(`frameGapPx must be at least 4 (is ${m.frameGapPx})`);
  if (m.mirror?.formula !== "x' = 2*ax - x" || m.mirror?.ax !== 'anchor[0]') fail("mirror must state formula x' = 2*ax - x with ax = anchor[0]");
  const sc = m.scale;
  if (!sc || !(sc.pixelsPerMeter > 0) || !(sc.metersPerPixel > 0) || Math.abs(sc.pixelsPerMeter * sc.metersPerPixel - 1) > 1e-3) fail('scale needs pixelsPerMeter and metersPerPixel that agree');
  for (const [facing, f] of Object.entries(m.facings || {})) {
    const v = f.socketVisibility;
    if (!v) { fail(`${facing}: socketVisibility missing`); continue; }
    for (const s of m.sockets || []) if (!['visible', 'hidden'].includes(v[s])) fail(`${facing}: socketVisibility for ${s} must be visible or hidden`);
  }
  const icon = m.statusIcon;
  if (!icon || !(icon.maxWidthPx > 0) || !(icon.clearPx >= 0)) fail('statusIcon needs maxWidthPx and clearPx');
  const af = m.anchorFrom;
  const anchorFrame = m.clips[af?.clip]?.facings && Object.values(m.clips[af.clip].facings)[0]?.frames?.[af.frame];
  const ag = anchorFrame?.sockets?.[af?.socket];
  if (!ag) fail('anchorFrom must name a clip, frame and socket');
  else if (Math.abs(ag[0] - m.anchor[0]) > 1e-3 || Math.abs(ag[1] - m.anchor[1]) > 1e-3) fail(`anchor ${m.anchor} is not the ${af.socket} socket of ${af.clip} frame ${af.frame} (${ag})`);
  if (!failures.length) pass(`manifest shape: ${Object.keys(m.clips).length} clips, facings ${Object.keys(m.facings || {}).join(',')}, cell ${cell.w}x${cell.h}, ${m.fps} fps; alpha straight; anchor ${m.anchor} = ${af.clip} frame ${af.frame} ${af.socket}; mirror ${m.mirror.formula}; ${sc.pixelsPerMeter} px per meter; socket visibility per facing`);

  // hashes
  const before = failures.length;
  for (const [name, digest] of Object.entries(m.files)) {
    const p = join(dir, name);
    if (!existsSync(p)) { fail(`listed file missing: ${name}`); continue; }
    if (sha256(p) !== digest) fail(`sha256 differs: ${name}`);
  }
  const sums = join(dir, 'sha256.txt');
  if (!existsSync(sums)) fail('sha256.txt missing');
  else {
    const listed = new Set();
    for (const line of readFileSync(sums, 'utf8').split(/\r?\n/).filter(Boolean)) {
      const mm = /^([0-9a-f]{64}) [ *](.+)$/.exec(line);
      if (!mm) { fail(`sha256.txt line not understood: ${line}`); continue; }
      listed.add(mm[2]);
      const p = join(dir, mm[2]);
      if (!existsSync(p)) fail(`sha256.txt names a missing file: ${mm[2]}`);
      else if (sha256(p) !== mm[1]) fail(`sha256.txt differs: ${mm[2]}`);
    }
    for (const f of readdirSync(dir)) if (f !== 'sha256.txt' && !listed.has(f)) fail(`file not in sha256.txt: ${f}`);
    if (!listed.has('manifest.json')) fail('sha256.txt does not cover manifest.json');
  }
  if (failures.length === before) pass(`sha256: ${Object.keys(m.files).length} listed files and sha256.txt match`);

  // clips
  const sheets = {};
  let frameCount = 0, socketCount = 0, edgePx = 0, minGap = Infinity, minStatusClear = Infinity, minBarClear = Infinity;
  const clipsBefore = failures.length;
  for (const [name, clip] of Object.entries(m.clips)) {
    const at = (s) => `${name}: ${s}`;
    if (!isInt(clip.frameCount) || clip.frameCount <= 0) { fail(at('frameCount')); continue; }
    if (!isNum(clip.durationMs) || Math.abs(clip.durationMs - (clip.frameCount * 1000) / m.fps) > 0.01) fail(at(`durationMs ${clip.durationMs} is not ${clip.frameCount} frames at ${m.fps} fps`));
    if (typeof clip.loop !== 'boolean') fail(at('loop must be true or false'));
    if (!Array.isArray(clip.markers)) fail(at('markers must be a list'));
    for (const mk of clip.markers || []) {
      if (typeof mk.name !== 'string' || !isNum(mk.timeMs)) fail(at(`marker ${JSON.stringify(mk)}`));
      else if (mk.timeMs < 0 || mk.timeMs >= clip.durationMs) fail(at(`marker ${mk.name} at ${mk.timeMs} ms is outside the clip (0 to ${clip.durationMs})`));
      else if (isInt(mk.frame) && Math.abs(mk.frame * 1000 / m.fps - mk.timeMs) > 0.01) fail(at(`marker ${mk.name}: timeMs and frame disagree`));
    }
    if (!clip.loop && !clip.then) fail(at('a clip that does not loop must say which clip and frame follow it (then)'));
    for (const key of ['then', 'entry']) {
      if (clip[key] === undefined) continue;
      const t = m.clips[clip[key]?.clip];
      if (!t) fail(at(`${key} names no clip`));
      else if (!isInt(clip[key].frame) || clip[key].frame < 0 || clip[key].frame >= t.frameCount) fail(at(`${key} frame outside ${clip[key].clip}`));
    }
    if (!clip.facings || !Object.keys(clip.facings).length) { fail(at('facings missing')); continue; }
    for (const [facing, side] of Object.entries(clip.facings)) {
      const af2 = (s) => `${name}/${facing}: ${s}`;
      if (!m.facings?.[facing]) fail(af2('facing not declared at the top'));
      if (!(side.sheet in m.files)) fail(af2(`sheet ${side.sheet} not in files`));
      const sp = join(dir, side.sheet);
      if (!existsSync(sp)) { fail(af2(`sheet ${side.sheet} missing`)); continue; }
      let hdr;
      try { hdr = pngHeader(sp); } catch (e) { fail(af2(`${side.sheet}: ${e.message}`)); continue; }
      if (hdr.depth !== 8 || hdr.colorType !== 6 || hdr.interlace !== 0) { fail(af2(`${side.sheet} must be 8-bit RGBA, non-interlaced`)); continue; }
      const img = sheets[side.sheet] ??= readPngRgba(sp);
      const A = (x, y) => (x < 0 || y < 0 || x >= img.w || y >= img.h ? 0 : img.px[(y * img.w + x) * 4 + 3]);
      const RGB = (x, y) => { const i = (y * img.w + x) * 4; return [img.px[i], img.px[i + 1], img.px[i + 2]]; };
      if (!Array.isArray(side.frames) || side.frames.length !== clip.frameCount) { fail(af2(`${side.frames?.length} frames, frameCount ${clip.frameCount}`)); continue; }
      const bar = clip.statusBarY?.[facing];
      if (!isNum(bar)) fail(af2('statusBarY missing'));
      const rects = [];
      side.frames.forEach((fr, i) => {
        const fi = (s) => af2(`frame ${i}: ${s}`);
        if (![fr.x, fr.y, fr.w, fr.h].every(isInt) || fr.w <= 0 || fr.h <= 0) return fail(fi('rect must be whole pixels'));
        if (fr.x < 0 || fr.y < 0 || fr.x + fr.w > hdr.w || fr.y + fr.h > hdr.h) return fail(fi(`outside its sheet (${fr.x},${fr.y} ${fr.w}x${fr.h} in ${hdr.w}x${hdr.h})`));
        if (!isPoint(fr.offset) || !fr.offset.every(isInt)) fail(fi('offset must be whole pixels'));
        else if (fr.offset[0] < 0 || fr.offset[1] < 0 || fr.offset[0] + fr.w > cell.w || fr.offset[1] + fr.h > cell.h) fail(fi(`offset ${fr.offset} puts it outside the cell`));
        for (const s of m.sockets || []) {
          if (!isPoint(fr.sockets?.[s])) fail(fi(`socket ${s} missing`));
          else socketCount++;
        }
        for (const r of rects) {
          const gx = Math.max(r.x - (fr.x + fr.w), fr.x - (r.x + r.w));
          const gy = Math.max(r.y - (fr.y + fr.h), fr.y - (r.y + r.h));
          const g = Math.max(gx, gy);
          minGap = Math.min(minGap, g);
          if (g < m.frameGapPx) { fail(fi(`only ${g} px from frame ${r.i} in the sheet (frameGapPx ${m.frameGapPx})`)); break; }
        }
        rects.push({ ...fr, i });
        // transparent pixels beside drawn ones carry an edge color (the rect and 1 px around it)
        let bad = 0;
        for (let y = fr.y - 1; y <= fr.y + fr.h; y++) {
          for (let x = fr.x - 1; x <= fr.x + fr.w; x++) {
            if (x < 0 || y < 0 || x >= img.w || y >= img.h || A(x, y) !== 0) continue;
            const nb = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].filter(([u, v]) => A(u, v) > 0);
            if (!nb.length) continue;
            edgePx++;
            const c = RGB(x, y);
            if (!nb.some(([u, v]) => RGB(u, v).every((q, k) => Math.abs(q - c[k]) <= 96))) bad++;
          }
        }
        if (bad) fail(fi(`${bad} transparent pixels beside drawn ones carry no edge color (black or far from it)`));
        // the drawn pixels' top row in cell coordinates, overall and under the status icon
        if (isPoint(fr.sockets?.status) && icon) {
          const [sx, sy] = fr.sockets.status;
          let top = Infinity, under = Infinity;
          for (let v = 0; v < fr.h; v++) {
            for (let u = 0; u < fr.w; u++) {
              if (!A(fr.x + u, fr.y + v)) continue;
              const cy = fr.offset[1] + v, cx = fr.offset[0] + u + 0.5;
              top = Math.min(top, cy);
              if (Math.abs(cx - sx) <= icon.maxWidthPx / 2) under = Math.min(under, cy);
            }
          }
          minStatusClear = Math.min(minStatusClear, under - sy);
          if (under - sy < icon.clearPx - EPS) fail(fi(`status ${sy} is ${under - sy} px above the drawn pixels under the icon (clearPx ${icon.clearPx})`));
          if (isNum(bar)) {
            minBarClear = Math.min(minBarClear, top - bar);
            if (top - bar < icon.clearPx - EPS) fail(fi(`statusBarY ${bar} is ${top - bar} px above the frame's highest drawn pixel (clearPx ${icon.clearPx})`));
          }
        }
        frameCount++;
      });
    }
  }
  if (failures.length === clipsBefore) {
    pass(`frames: ${frameCount} frames inside their sheets and the cell, at least ${minGap} px apart (frameGapPx ${m.frameGapPx}); ${Object.keys(sheets).length} sheets 8-bit RGBA`);
    pass(`straight alpha: all ${edgePx} transparent pixels beside drawn ones carry an edge color`);
    pass(`markers inside their clips; then and entry resolve; ${socketCount} socket positions (${(m.sockets || []).length} sockets on every frame)`);
    pass(`status: at least ${minStatusClear} px above the drawn pixels under a ${icon.maxWidthPx} px icon (clearPx ${icon.clearPx}); statusBarY at least ${minBarClear} px above every frame's highest drawn pixel`);
  }
}

main();
for (const p of passed) console.log(`pass  ${p}`);
for (const f of failures) console.log(`FAIL  ${f}`);
console.log(failures.length ? `${failures.length} failures` : 'atlas v2: all checks pass');
process.exit(failures.length ? 1 : 0);
