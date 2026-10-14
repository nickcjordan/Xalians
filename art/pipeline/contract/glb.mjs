// Minimal glb reading and measuring, shared by write_manifest.mjs and validate.mjs.
// Reads only the JSON chunk and bufferView sizes; never decodes compressed data.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

export const REQUIRED_CLIPS = ['idle', 'move', 'hurt', 'evade', 'guard', 'displaced', 'held', 'faint', 'act.light', 'act.heavy'];
export const SOCKETS = ['ground', 'head', 'eye_l', 'eye_r', 'emitter', 'status', 'carry'];
// Contract section 6: archetype -> events its clip must carry (sustained ones check the one-shot fallback).
export const ARCHETYPES = {
  lunge: ['launch', 'hit', 'recover'],
  strike: ['hit', 'recover'],
  slam: ['hit', 'recover'],
  sweep: ['hit', 'recover'],
  spit: ['emit', 'recover'],
  spray: ['emit', 'recover'],
  burst: ['emit', 'recover'],
  aura: ['emit', 'recover'],
  brace: ['set', 'recover'],
  mend: ['set', 'recover'],
  focus: ['set', 'recover'],
};

export function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

export function readGlb(path) {
  const buf = readFileSync(path);
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error(`${path}: not a glb (bad magic)`);
  const jsonLen = buf.readUInt32LE(12);
  if (buf.readUInt32LE(16) !== 0x4e4f534a) throw new Error(`${path}: first chunk is not JSON`);
  const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
  return { json, bytes: buf.length };
}

function viewBytes(json, index) {
  const view = json.bufferViews[index];
  const meshopt = view.extensions && view.extensions.EXT_meshopt_compression;
  return meshopt ? meshopt.byteLength : view.byteLength;
}

// tiers: manifest.tiers ({ full: { node }, low: { node } }); each tier is measured from its own node.
export function measure(json, fileBytes, tiers = {}) {
  const meshNodes = (json.nodes || []).filter((n) => n.mesh !== undefined);
  const tierOf = (node) => Object.keys(tiers).find((t) => tiers[t].node === node.name) || 'full';
  const perTier = {};
  let morphTargets = 0;
  let influences = 0;
  for (const node of meshNodes) {
    const tier = (perTier[tierOf(node)] ||= { triangles: 0, drawCalls: 0 });
    for (const prim of json.meshes[node.mesh].primitives) {
      const mode = prim.mode ?? 4;
      if (mode !== 4) continue;
      const count = prim.indices !== undefined ? json.accessors[prim.indices].count : json.accessors[prim.attributes.POSITION].count;
      tier.triangles += count / 3;
      tier.drawCalls += 1;
      morphTargets = Math.max(morphTargets, (prim.targets || []).length);
      const sets = Object.keys(prim.attributes).filter((k) => /^JOINTS_\d+$/.test(k)).length;
      influences = Math.max(influences, sets * 4);
    }
  }
  const joints = Math.max(0, ...(json.skins || []).map((s) => s.joints.length));
  let textureBytes = 0;
  for (const image of json.images || []) {
    if (image.bufferView !== undefined) textureBytes += viewBytes(json, image.bufferView);
  }
  const clipViews = new Set();
  for (const anim of json.animations || []) {
    for (const s of anim.samplers) {
      for (const a of [s.input, s.output]) {
        const v = json.accessors[a].bufferView;
        if (v !== undefined) clipViews.add(v);
      }
    }
  }
  let clipBytes = 0;
  for (const v of clipViews) clipBytes += viewBytes(json, v);
  return {
    ...perTier,
    joints,
    influencesPerVertex: influences,
    morphTargets,
    materials: (json.materials || []).length,
    textureBytes,
    fileBytes,
    clipBytes,
  };
}

export function socketTags(json) {
  const out = {};
  (json.nodes || []).forEach((n, i) => {
    const tag = n.extras && n.extras.xalians && n.extras.xalians.socket;
    if (tag) (out[tag] ||= []).push(i);
  });
  return out;
}
