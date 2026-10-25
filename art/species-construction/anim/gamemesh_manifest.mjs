// Akinza game mesh pass 1: the contract manifest for the glb (docs/design/creature-asset-contract.md section 3).
//
//   node art/species-construction/anim/gamemesh_manifest.mjs <raw.glb> <facts.json> <atlas manifest.json> <out dir>
//        [--meshopt] [--version 0.1.0]
//
// Copies the raw glb (or, with --meshopt, writes it through gltf-transform's meshopt at level high, as the
// creature-pipeline chain does) to <out dir>/akinza.glb and writes <out dir>/manifest.json with the clips' events
// taken from the approved sprite atlas (anim/sprites1/atlas), the size rule from rig-p8b (heightCm 147.5, the
// middle of the record band 130 to 165), bounds from the facts, and `measured` from the shipped file (glb.mjs).
// The slice has two clips, so the eight other required clips and the archetypes that play them are named as the
// contract's defaults and stay missing: the validator lists them.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { measure, readGlb, sha256, socketTags, SOCKETS } from '../../pipeline/contract/glb.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const flags = new Set(args.filter((x) => x.startsWith('--')));
const opt = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const pos = args.filter((x, i) => !x.startsWith('--') && !(i > 0 && args[i - 1] === '--version'));
const [raw, factsPath, atlasPath, outDir] = pos;
const facts = JSON.parse(readFileSync(factsPath, 'utf8'));
const atlas = JSON.parse(readFileSync(atlasPath, 'utf8'));
const out = resolve(outDir);
mkdirSync(out, { recursive: true });
const glbName = 'akinza.glb';
const glbOut = join(out, glbName);
if (flags.has('--meshopt')) {
  const cli = join(HERE, '..', '..', 'pipeline', 'node_modules', '@gltf-transform', 'cli', 'bin', 'cli.js');
  execFileSync(process.execPath, [cli, 'meshopt', raw, glbOut, '--level', 'high'], { stdio: 'inherit' });
} else copyFileSync(raw, glbOut);

const { json, bytes } = readGlb(glbOut);
const tiers = { full: { node: 'akinza_full' } };
const measured = measure(json, bytes, tiers);
const tags = socketTags(json);
const sockets = SOCKETS.filter((s) => tags[s]);

const stalk = atlas.clips['sig.night-stalk'];
const clips = {
  idle: { durationMs: 3000, loop: true, events: [] },
  'sig.night-stalk': {
    durationMs: 1500, loop: false, archetype: stalk.archetype,
    events: stalk.markers.map((m) => ({ name: m.name, timeMs: m.timeMs })),
  },
};
for (const [name, c] of Object.entries(clips)) {
  const f = facts.clips[name];
  if (Math.abs(f.durationMs - c.durationMs) > 1e-6) throw new Error(`${name}: glb keys end at ${f.durationMs} ms, manifest ${c.durationMs}`);
}
const manifest = {
  format: 'xalians-creature-asset-v1',
  species: 'akinza',
  assetVersion: opt('--version', '0.1.0'),
  files: { [glbName]: sha256(glbOut) },
  units: { length: 'meters', up: '+Y', forward: '+Z' },
  size: { dimension: 'heightCm', referenceCm: 147.5, bandCm: [130, 165] },
  bounds: facts.bounds,
  tiers,
  sockets,
  parameters: { finish: { values: ['standard'], default: 'standard', variants: false } },
  clips,
  acts: {
    signatures: { 'akinza-defining': 'sig.night-stalk' },
    archetypes: {
      lunge: 'act.heavy', strike: 'act.light', slam: 'act.heavy', sweep: 'act.heavy', spit: 'act.light',
      spray: 'act.heavy', burst: 'act.heavy', aura: 'act.heavy', brace: 'guard', mend: 'guard', focus: 'sig.night-stalk',
    },
  },
  measured,
  build: 'B-' + createHash('sha256').update(readFileSync(glbOut)).digest('hex').slice(0, 16),
  builtAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
};
writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`manifest ${join(out, 'manifest.json')}: ${measured.full.triangles} triangles, ${measured.full.drawCalls} draw calls, ${measured.joints} joints, ${measured.morphTargets} morph targets, file ${measured.fileBytes} B, textures ${measured.textureBytes} B, clips ${measured.clipBytes} B, sockets ${sockets.join(' ')}`);
