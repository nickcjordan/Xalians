// Node stage of the chain: meshopt-compress the raw glb and write the contract manifest.
//
//   node contract/write_manifest.mjs <buildDir> <outDir> [--species standin] [--version 0.1.0]
//
// <buildDir> holds standin.raw.glb and blender_facts.json from blender/export_asset.py.
// <outDir> receives <species>.glb and manifest.json and nothing else.
// KTX2 texture compression belongs here, between meshopt and hashing (gltf-transform etc1s/uastc);
// it is out of scope for the walking skeleton, so the texture ships as PNG.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ARCHETYPES, SOCKETS, measure, readGlb, sha256, socketTags } from './glb.mjs';
import { leanClips } from './lean_clips.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const [buildDir, outDir] = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
if (!buildDir || !outDir) {
  console.error('usage: node contract/write_manifest.mjs <buildDir> <outDir> [--species standin] [--version 0.1.0]');
  process.exit(2);
}
const species = opt('--species', 'standin');
const assetVersion = opt('--version', '0.1.0');

const facts = JSON.parse(readFileSync(join(buildDir, 'blender_facts.json'), 'utf8'));
const raw = join(buildDir, `${species}.raw.glb`);
const glbName = `${species}.glb`;
const out = resolve(outDir);
if (existsSync(out)) for (const f of readdirSync(out)) rmSync(join(out, f), { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const cli = join(HERE, '..', 'node_modules', '@gltf-transform', 'cli', 'bin', 'cli.js');
const t0 = Date.now();
const lean = join(buildDir, `${species}.lean.glb`);
const leanStats = await leanClips(raw, lean);
console.log(`lean clips: removed ${leanStats.channelsRemoved} rest-constant channels, kept ${leanStats.channelsKept}; reparented ${leanStats.reparented} skinned mesh node(s) to the scene root`);
execFileSync(process.execPath, [cli, 'meshopt', lean, join(out, glbName), '--level', 'high'], { stdio: 'inherit' });
const compressMs = Date.now() - t0;

const { json, bytes } = readGlb(join(out, glbName));
const measured = measure(json, bytes);
const tags = socketTags(json);
const sockets = SOCKETS.filter((s) => tags[s]);

const clips = {};
for (const [name, f] of Object.entries(facts.clips)) {
  const c = { durationMs: f.durationMs, loop: f.loop, events: f.events };
  if (f.archetype) c.archetype = f.archetype;
  if (f.travel) c.travel = f.travel;
  if (f.reachM !== undefined) c.reachM = f.reachM;
  clips[name] = c;
}

// Every archetype in contract section 6 maps to a clip this asset has.
const archetypeClip = {
  lunge: 'sig.lunge', strike: 'act.light', slam: 'act.heavy', sweep: 'act.heavy', spit: 'act.light',
  spray: 'act.heavy', burst: 'act.heavy', aura: 'act.heavy', brace: 'guard', mend: 'guard', focus: 'guard',
};
for (const a of Object.keys(ARCHETYPES)) if (!archetypeClip[a]) throw new Error(`archetype ${a} has no clip`);

const build = 'B-' + createHash('sha256').update(JSON.stringify(facts)).digest('hex').slice(0, 16);
const manifest = {
  format: 'xalians-creature-asset-v1',
  species,
  assetVersion,
  files: { [glbName]: sha256(join(out, glbName)) },
  units: { length: 'meters', up: '+Y', forward: '+Z' },
  size: {
    dimension: facts.size.dimension,
    referenceCm: facts.size.referenceCm,
    bandCm: facts.size.bandCm,
    restHeightCm: facts.size.restHeightCm,
  },
  bounds: facts.bounds,
  tiers: { full: { node: facts.tierNodes.full } },
  sockets,
  parameters: { finish: { values: ['standard'], default: 'standard', variants: false } },
  clips,
  acts: { signatures: { 'standin-lunge': 'sig.lunge' }, archetypes: archetypeClip },
  measured,
  build,
  builtAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
};
writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
// The build record (internals, provenance) lives beside the build, referenced by the build id.
writeFileSync(join(buildDir, 'build_record.json'), JSON.stringify({ build, facts, compressMs, leanStats, rawBytes: readFileSync(raw).length }, null, 2) + '\n');

const bm = facts.blenderMeasured;
const drift = [];
if (bm.triangles !== measured.full.triangles) drift.push(`triangles blender ${bm.triangles} file ${measured.full.triangles}`);
if (bm.joints !== measured.joints) drift.push(`joints blender ${bm.joints} file ${measured.joints}`);
console.log(`manifest: ${join(out, 'manifest.json')}`);
console.log(`glb ${measured.fileBytes} bytes (raw ${readFileSync(raw).length}), ${measured.full.triangles} triangles, ${measured.joints} joints, clips ${measured.clipBytes} B, texture ${measured.textureBytes} B, meshopt ${compressMs} ms`);
if (drift.length) console.log('note: Blender and file disagree: ' + drift.join('; '));
