// Contract validator for one creature asset folder (docs/design/creature-asset-contract.md section 9).
//
//   node contract/validate.mjs <folder>
//
// Exits 0 when every check passes, 1 with a plain list of failures otherwise.
// Warnings never fail the run. Not checked yet (listed at the end of every run):
// the act resolver over every compiled species, material variants, sprite atlases.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import validator from 'gltf-validator';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { readPngRgba } from './png.mjs';
import { ARCHETYPES, REQUIRED_CLIPS, measure, readGlb, sha256, socketTags } from './glb.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const folder = process.argv[2];
if (!folder) {
  console.error('usage: node contract/validate.mjs <folder>');
  process.exit(2);
}
const dir = resolve(folder);
const failures = [];
const warnings = [];
const passed = [];
const fail = (m) => failures.push(m);
const check = (ok, okMsg, failMsg) => (ok ? passed.push(okMsg) : fail(failMsg));
const FRAME_MS = 1000 / 30;

async function main() {
  const manifestPath = join(dir, 'manifest.json');
  if (!existsSync(manifestPath)) {
    fail(`no manifest.json in ${dir}`);
    return;
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

  // 1. Schema.
  const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
  const schema = JSON.parse(readFileSync(join(HERE, 'manifest.schema.json'), 'utf8'));
  const valid = ajv.validate(schema, manifest);
  if (valid) passed.push('manifest matches schema');
  else for (const e of ajv.errors) fail(`schema: ${e.instancePath || '/'} ${e.message}${e.params && e.params.additionalProperty ? ` (${e.params.additionalProperty})` : ''}`);

  // 2. Files and hashes.
  const files = manifest.files || {};
  for (const [name, hash] of Object.entries(files)) {
    const p = join(dir, name);
    if (!existsSync(p)) fail(`file listed but missing: ${name}`);
    else check(sha256(p) === hash, `sha256 ${name}`, `sha256 mismatch: ${name}`);
  }
  for (const f of readdirSync(dir)) {
    if (f !== 'manifest.json' && !(f in files)) warnings.push(`file in folder but not in manifest: ${f}`);
  }
  const glbName = Object.keys(files).find((f) => f.endsWith('.glb'));
  if (!glbName || !existsSync(join(dir, glbName))) {
    fail('no .glb listed in files');
    return;
  }
  const glbPath = join(dir, glbName);
  const glbBytes = readFileSync(glbPath);

  // 3. Khronos glTF validator.
  const report = await validator.validateBytes(new Uint8Array(glbBytes), { maxIssues: 200 });
  const counts = report.issues;
  if (counts.numErrors === 0) passed.push(`Khronos glTF validator: 0 errors, ${counts.numWarnings} warnings, ${counts.numInfos} infos`);
  for (const m of counts.messages) {
    const line = `gltf-validator ${m.code} at ${m.pointer || '-'}: ${m.message}`;
    if (m.severity === 0) fail(line);
    else if (m.severity === 1) warnings.push(line);
  }

  // 4. Names: clips, sockets, tiers, required set (glb JSON chunk parsed directly).
  const { json, bytes } = readGlb(glbPath);
  const animNames = new Set((json.animations || []).map((a) => a.name));
  const clips = manifest.clips || {};
  for (const name of Object.keys(clips)) check(animNames.has(name), `clip in glb: ${name}`, `clip in manifest but not in glb: ${name}`);
  for (const name of animNames) if (!(name in clips)) fail(`animation in glb but not in manifest: ${name}`);
  for (const name of REQUIRED_CLIPS) if (!(name in clips)) fail(`required clip missing: ${name}`);
  const tags = socketTags(json);
  for (const s of manifest.sockets || []) {
    if (!tags[s]) fail(`socket in manifest but no node tagged extras.xalians.socket=${s}`);
    else if (tags[s].length > 1) fail(`socket ${s} tagged on ${tags[s].length} nodes`);
    else passed.push(`socket tagged: ${s}`);
  }
  for (const s of Object.keys(tags)) if (!(manifest.sockets || []).includes(s)) warnings.push(`node tagged ${s} but socket not declared`);
  for (const [tier, t] of Object.entries(manifest.tiers || {})) {
    const node = (json.nodes || []).find((n) => n.name === t.node);
    check(node && node.mesh !== undefined, `tier ${tier} node ${t.node} has a mesh`, `tier ${tier}: no mesh node named ${t.node}`);
  }
  if (manifest.parameters?.finish?.variants) {
    const variants = json.extensions?.KHR_materials_variants?.variants?.map((v) => v.name) || [];
    for (const v of manifest.parameters.finish.values) if (!variants.includes(v)) fail(`finish variant missing in glb: ${v}`);
  }

  // 5. Clip timing, events, archetype events, act maps.
  for (const [name, c] of Object.entries(clips)) {
    for (const e of c.events) if (e.timeMs > c.durationMs) fail(`${name}: event ${e.name} at ${e.timeMs} ms is past the clip end ${c.durationMs} ms`);
    if (c.archetype) {
      const have = new Set(c.events.map((e) => e.name));
      const missing = ARCHETYPES[c.archetype].filter((e) => !have.has(e));
      check(!missing.length, `${name}: ${c.archetype} events present`, `${name}: archetype ${c.archetype} needs events ${missing.join(', ')}`);
    }
    if (c.travel && c.travel.startMs !== undefined && c.travel.endMs !== undefined && !(c.travel.startMs <= c.travel.endMs && c.travel.endMs <= c.durationMs)) {
      fail(`${name}: travel window ${c.travel.startMs} to ${c.travel.endMs} ms is not inside the clip`);
    }
  }
  const acts = manifest.acts || {};
  for (const [key, clip] of Object.entries(acts.signatures || {})) check(clip in clips, `signature ${key} -> ${clip}`, `signature ${key} names missing clip ${clip}`);
  for (const [key, clip] of Object.entries(acts.passives || {})) if (!(clip in clips)) fail(`passive ${key} names missing clip ${clip}`);
  for (const a of Object.keys(ARCHETYPES)) {
    const clip = acts.archetypes?.[a];
    if (!clip) fail(`archetype ${a} not mapped`);
    else if (!(clip in clips)) fail(`archetype ${a} names missing clip ${clip}`);
    else {
      const have = new Set(clips[clip].events.map((e) => e.name));
      const missing = ARCHETYPES[a].filter((e) => !have.has(e));
      if (missing.length) warnings.push(`archetype ${a} plays ${clip}, which lacks ${a} events: ${missing.join(', ')}`);
    }
  }

  // 6. Measured matches the file.
  const m = measure(json, bytes, manifest.tiers);
  const mm = manifest.measured || {};
  const pairs = [
    ['full.triangles', m.full.triangles, mm.full?.triangles], ['full.drawCalls', m.full.drawCalls, mm.full?.drawCalls],
    ...(manifest.tiers?.low ? [['low.triangles', m.low?.triangles, mm.low?.triangles], ['low.drawCalls', m.low?.drawCalls, mm.low?.drawCalls]] : []),
    ['joints', m.joints, mm.joints], ['influencesPerVertex', m.influencesPerVertex, mm.influencesPerVertex],
    ['morphTargets', m.morphTargets, mm.morphTargets], ['materials', m.materials, mm.materials],
    ['textureBytes', m.textureBytes, mm.textureBytes], ['fileBytes', m.fileBytes, mm.fileBytes], ['clipBytes', m.clipBytes, mm.clipBytes],
  ];
  for (const [k, file, man] of pairs) check(file === man, `measured.${k} = ${file}`, `measured.${k}: manifest ${man}, file ${file}`);

  // 7. Decoded checks: root never translates, clip durations, axes and size.
  await MeshoptDecoder.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
  const doc = await io.readBinary(new Uint8Array(glbBytes));
  const root = doc.getRoot();
  const skin = root.listSkins()[0];
  if (!skin) {
    fail('no skin in glb');
    return;
  }
  const joints = skin.listJoints();
  const jointSet = new Set(joints);
  const rootJoints = joints.filter((j) => !jointSet.has(j.getParentNode()));
  check(rootJoints.length === 1, `one root joint (${rootJoints[0]?.getName()})`, `expected one root joint, found ${rootJoints.length}`);
  const rootJoint = rootJoints[0];
  const rest = rootJoint.getTranslation();
  check(rest.every((v) => Math.abs(v) < 1e-5), 'root joint rest at the origin', `root joint rest translation ${rest} is not the origin`);
  for (const anim of root.listAnimations()) {
    const name = anim.getName();
    let maxT = 0;
    for (const s of anim.listSamplers()) maxT = Math.max(maxT, s.getInput().getMax([])[0]);
    const c = clips[name];
    if (c) check(Math.abs(maxT * 1000 - c.durationMs) <= FRAME_MS / 2 + 1, `${name}: duration ${Math.round(maxT * 1000)} ms`, `${name}: glb duration ${Math.round(maxT * 1000)} ms, manifest ${c.durationMs} ms`);
    let worst = 0;
    for (const ch of anim.listChannels()) {
      if (ch.getTargetNode() !== rootJoint || ch.getTargetPath() !== 'translation') continue;
      const out = ch.getSampler().getOutput();
      const el = [];
      for (let i = 0; i < out.getCount(); i++) {
        out.getElement(i, el);
        for (let k = 0; k < 3; k++) worst = Math.max(worst, Math.abs(el[k] - rest[k]));
      }
    }
    check(worst < 1e-4, `${name}: root never translates`, `${name}: root translates by up to ${worst.toFixed(4)} m`);
  }

  // Rest pose: skin every vertex with joint world matrices times inverse bind matrices.
  const mesh = root.listNodes().find((n) => n.getName() === manifest.tiers?.full?.node);
  if (mesh && mesh.getMesh()) {
    const ibm = skin.getInverseBindMatrices();
    const mats = joints.map((j, i) => mul(j.getWorldMatrix(), ibm.getElement(i, [])));
    const skinBounds = (meshNode) => {
    const lo = [Infinity, Infinity, Infinity];
    const hi = [-Infinity, -Infinity, -Infinity];
    for (const prim of meshNode.getMesh().listPrimitives()) {
      const pos = prim.getAttribute('POSITION');
      const J = prim.getAttribute('JOINTS_0');
      const W = prim.getAttribute('WEIGHTS_0');
      const p = [], jj = [], ww = [];
      for (let i = 0; i < pos.getCount(); i++) {
        pos.getElement(i, p); J.getElement(i, jj); W.getElement(i, ww);
        const v = [0, 0, 0];
        for (let k = 0; k < 4; k++) {
          if (!ww[k]) continue;
          const t = apply(mats[jj[k]], p);
          for (let a = 0; a < 3; a++) v[a] += t[a] * ww[k];
        }
        for (let a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], v[a]); hi[a] = Math.max(hi[a], v[a]); }
      }
    }
    return [lo, hi];
    };
    const [lo, hi] = skinBounds(mesh);
    if (manifest.tiers?.low) {
      const lowNode = root.listNodes().find((n) => n.getName() === manifest.tiers.low.node);
      if (lowNode && lowNode.getMesh()) {
        const [llo, lhi] = skinBounds(lowNode);
        const off = Math.max(...[0, 1, 2].flatMap((a) => [Math.abs(llo[a] - lo[a]), Math.abs(lhi[a] - hi[a])]));
        check(off < 0.02, `low tier bounds match the full tier (within ${(off * 100).toFixed(2)} cm)`, `low tier bounds differ from the full tier by ${(off * 100).toFixed(2)} cm`);
        const prims = lowNode.getMesh().listPrimitives();
        const wOk = prims.every((p) => {
          const W = p.getAttribute('WEIGHTS_0');
          const ww = [];
          for (let i = 0; i < W.getCount(); i++) { W.getElement(i, ww); if (Math.abs(ww.reduce((s, x) => s + x, 0) - 1) > 0.02) return false; }
          return true;
        });
        check(wOk, 'low tier skin weights sum to 1', 'low tier has vertices whose skin weights do not sum to 1');
      }
    }
    const b = manifest.bounds?.rest;
    if (b) {
      const off = Math.max(...[0, 1, 2].flatMap((a) => [Math.abs(lo[a] - b.min[a]), Math.abs(hi[a] - b.max[a])]));
      check(off < 0.01, `rest bounds match the mesh (within ${(off * 100).toFixed(2)} cm)`, `rest bounds differ from the skinned mesh by ${(off * 100).toFixed(2)} cm: mesh min ${lo.map((x) => x.toFixed(3))} max ${hi.map((x) => x.toFixed(3))}`);
    }
    check(lo[1] > -0.005, 'nothing below the ground plane at rest', `mesh reaches ${lo[1].toFixed(3)} m below the ground at rest`);
    if (manifest.size?.dimension === 'heightCm') {
      const h = hi[1] * 100;
      check(Math.abs(h - manifest.size.referenceCm) <= 1, `built height ${h.toFixed(1)} cm matches referenceCm ${manifest.size.referenceCm}`, `built height ${h.toFixed(1)} cm, referenceCm ${manifest.size.referenceCm}`);
    }
    const [bmin, bmax] = manifest.size?.bandCm || [0, 0];
    check(bmin <= manifest.size.referenceCm && manifest.size.referenceCm <= bmax, 'referenceCm inside bandCm', `referenceCm ${manifest.size?.referenceCm} outside band ${bmin} to ${bmax}`);
  } else fail('full tier node has no mesh to measure');

  // Token: PNG is 512 x 512 RGBA with a transparent background and a solid dark silhouette; SVG has a path.
  if (files['token.png'] && existsSync(join(dir, 'token.png'))) {
    const img = readPngRgba(join(dir, 'token.png'));
    let solid = 0, partial = 0, darkOk = true;
    for (let i = 0; i < img.width * img.height; i++) {
      const a = img.data[i * 4 + 3];
      if (a === 255) { solid++; if (img.data[i * 4] > 60 || img.data[i * 4 + 1] > 60 || img.data[i * 4 + 2] > 60) darkOk = false; } else if (a > 0) partial++;
    }
    const cover = (solid + partial) / (img.width * img.height);
    check(img.width === 512 && img.height === 512, 'token.png is 512 x 512', `token.png is ${img.width} x ${img.height}, expected 512 x 512`);
    check(img.data[3] === 0 && img.data[(img.width - 1) * 4 + 3] === 0, 'token.png corners are transparent', 'token.png corners are not transparent');
    check(cover > 0.03 && cover < 0.8 && darkOk, `token.png is non-empty (${(cover * 100).toFixed(1)}% covered) with a dark fill`, `token.png coverage ${(cover * 100).toFixed(1)}% or fill not dark`);
  }
  if (files['token.svg'] && existsSync(join(dir, 'token.svg'))) {
    const svg = readFileSync(join(dir, 'token.svg'), 'utf8');
    const d = /<path[^>]* d="([^"]+)"/.exec(svg)?.[1] || '';
    check(/^<svg /.test(svg) && (d.match(/M/g) || []).length >= 1 && d.length > 200, `token.svg has a traced outline (${(d.match(/M/g) || []).length} loop, ${d.length} chars)`, 'token.svg has no traced outline');
  }

  // Up and forward: the head is above the ground and in front of the origin; eye_l is on +X.
  const at = (tag) => {
    const i = tags[tag]?.[0];
    if (i === undefined) return null;
    const node = root.listNodes()[i];
    const w = node.getWorldMatrix();
    return [w[12], w[13], w[14]];
  };
  const head = at('head');
  const eyeL = at('eye_l');
  if (head) check(head[1] > 0.05 && head[2] > 0, `facing +Z with +Y up (head socket at ${head.map((x) => x.toFixed(2))})`, `head socket at ${head.map((x) => x.toFixed(2))}: expected +Y up and +Z forward`);
  if (eyeL) check(eyeL[0] > 0, 'eye_l on the creature left (+X)', `eye_l at x ${eyeL[0].toFixed(3)}: expected +X`);
}

function mul(a, b) {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return o;
}
function apply(m, p) {
  return [0, 1, 2].map((r) => m[r] * p[0] + m[4 + r] * p[1] + m[8 + r] * p[2] + m[12 + r]);
}

try {
  await main();
} catch (e) {
  fail(`validator crashed: ${e.stack || e}`);
}
console.log(`validate ${dir}`);
console.log(`passed ${passed.length} checks`);
for (const w of warnings) console.log(`warning: ${w}`);
console.log('not checked yet: act resolver over every compiled species; sprite atlases; KTX2 textures (toktx not installed)');
if (failures.length) {
  console.log(`FAILED ${failures.length}:`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log('PASS');
