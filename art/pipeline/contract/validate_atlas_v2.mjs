// Validator for one xalians-frame-atlas-v2 folder (docs/design/creature-asset-contract.md sections 8 and 9,
// decision 12). Standalone, Node built-ins only, so it runs before the full contract validator (validate.mjs on the
// creature-pipeline branch) is present; the same checks are meant to become its "v2 atlases match their manifest".
//
//   node art/pipeline/contract/validate_atlas_v2.mjs <atlas folder>
//
// Checks: the manifest's shape; every listed file's sha256 (manifest.files) and every line of sha256.txt (which
// also covers manifest.json); each sheet is an 8-bit RGBA PNG; every frame lies inside its sheet and frames do not
// overlap; every frame's offset puts it inside the cell; every clip's duration is its frame count at the fps;
// markers lie inside their clip; `then` and `entry` name a real clip and frame; every socket the manifest declares
// is on every frame. Exits 0 when all pass, 1 with the failures listed.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

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

function pngHeader(path) {
  const b = readFileSync(path);
  if (b.length < 33 || b.readUInt32BE(0) !== 0x89504e47 || b.toString('ascii', 12, 16) !== 'IHDR') throw new Error('not a PNG');
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), depth: b[24], colorType: b[25], interlace: b[28] };
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
  pass(`manifest shape: ${Object.keys(m.clips).length} clips, facings ${Object.keys(m.facings || {}).join(',')}, cell ${cell.w}x${cell.h}, ${m.fps} fps`);

  // hashes
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
  if (!failures.length) pass(`sha256: ${Object.keys(m.files).length} listed files and sha256.txt match`);

  // clips
  const sheets = {};
  let frameCount = 0;
  let socketCount = 0;
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
      const af = (s) => `${name}/${facing}: ${s}`;
      if (!m.facings?.[facing]) fail(af('facing not declared at the top'));
      if (!(side.sheet in m.files)) fail(af(`sheet ${side.sheet} not in files`));
      const sp = join(dir, side.sheet);
      if (!existsSync(sp)) { fail(af(`sheet ${side.sheet} missing`)); continue; }
      let hdr;
      try { hdr = sheets[side.sheet] ??= pngHeader(sp); } catch (e) { fail(af(`${side.sheet}: ${e.message}`)); continue; }
      if (hdr.depth !== 8 || hdr.colorType !== 6 || hdr.interlace !== 0) fail(af(`${side.sheet} must be 8-bit RGBA, non-interlaced`));
      if (!Array.isArray(side.frames) || side.frames.length !== clip.frameCount) { fail(af(`${side.frames?.length} frames, frameCount ${clip.frameCount}`)); continue; }
      const rects = [];
      side.frames.forEach((fr, i) => {
        const fi = (s) => af(`frame ${i}: ${s}`);
        if (![fr.x, fr.y, fr.w, fr.h].every(isInt) || fr.w <= 0 || fr.h <= 0) return fail(fi('rect must be whole pixels'));
        if (fr.x < 0 || fr.y < 0 || fr.x + fr.w > hdr.w || fr.y + fr.h > hdr.h) fail(fi(`outside its sheet (${fr.x},${fr.y} ${fr.w}x${fr.h} in ${hdr.w}x${hdr.h})`));
        if (!isPoint(fr.offset) || !fr.offset.every(isInt)) fail(fi('offset must be whole pixels'));
        else if (fr.offset[0] < 0 || fr.offset[1] < 0 || fr.offset[0] + fr.w > cell.w || fr.offset[1] + fr.h > cell.h) fail(fi(`offset ${fr.offset} puts it outside the cell`));
        for (const s of m.sockets || []) {
          if (!isPoint(fr.sockets?.[s])) fail(fi(`socket ${s} missing`));
          else socketCount++;
        }
        for (const r of rects) {
          if (fr.x < r.x + r.w && r.x < fr.x + fr.w && fr.y < r.y + r.h && r.y < fr.y + fr.h) { fail(fi(`overlaps frame ${r.i} in the sheet`)); break; }
        }
        rects.push({ ...fr, i });
        frameCount++;
      });
    }
  }
  if (!failures.length) {
    pass(`frames: ${frameCount} frames inside their sheets and the cell, no overlaps; ${Object.keys(sheets).length} sheets 8-bit RGBA`);
    pass(`markers inside their clips; then and entry resolve; ${socketCount} socket positions (${(m.sockets || []).length} sockets on every frame)`);
  }
}

main();
for (const p of passed) console.log(`pass  ${p}`);
for (const f of failures) console.log(`FAIL  ${f}`);
console.log(failures.length ? `${failures.length} failures` : 'atlas v2: all checks pass');
process.exit(failures.length ? 1 : 0);
