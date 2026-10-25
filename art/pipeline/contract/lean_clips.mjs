// Lossless clean-up between the Blender export and meshopt.
//
// Blender's exporter samples every joint, path and frame of every action: 37 joints x 3 paths x 11
// clips is 1,221 channels, and the glTF JSON alone grew to 195 KB. A channel whose every key equals
// the joint's rest value changes nothing (three.js blends unanimated properties back to their
// original value), so it is removed; then resample() drops keys that linear interpolation already
// reproduces. The skinned mesh node is also moved to the scene root when its parent is an identity
// transform (the Khronos validator warns on a skinned mesh under a transformed parent).
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, resample, dedup } from '@gltf-transform/functions';

const EPS = 1e-5;

function restValue(node, path) {
  if (path === 'translation') return node.getTranslation();
  if (path === 'rotation') return node.getRotation();
  if (path === 'scale') return node.getScale();
  return null;
}

export async function leanClips(inPath, outPath) {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const doc = await io.read(inPath);
  const root = doc.getRoot();
  let removed = 0;
  let kept = 0;
  for (const anim of root.listAnimations()) {
    for (const ch of anim.listChannels()) {
      const node = ch.getTargetNode();
      const rest = node && restValue(node, ch.getTargetPath());
      if (!rest) { kept++; continue; }
      const out = ch.getSampler().getOutput();
      const el = [];
      let constantAtRest = true;
      for (let i = 0; i < out.getCount() && constantAtRest; i++) {
        out.getElement(i, el);
        // q and -q are the same rotation.
        const same = el.every((v, k) => Math.abs(v - rest[k]) < EPS);
        const neg = ch.getTargetPath() === 'rotation' && el.every((v, k) => Math.abs(-v - rest[k]) < EPS);
        if (!same && !neg) constantAtRest = false;
      }
      if (constantAtRest) {
        const sampler = ch.getSampler();
        ch.dispose();
        if (!anim.listChannels().some((c) => c.getSampler() === sampler)) sampler.dispose();
        removed++;
      } else kept++;
    }
  }
  let reparented = 0;
  for (const node of root.listNodes()) {
    if (!node.getSkin()) continue;
    const parent = node.getParentNode();
    if (!parent) continue;
    const m = parent.getWorldMatrix();
    const identity = m.every((v, i) => Math.abs(v - (i % 5 === 0 ? 1 : 0)) < 1e-6);
    if (identity) {
      parent.removeChild(node);
      for (const scene of root.listScenes()) scene.addChild(node);
      reparented++;
    }
  }
  await doc.transform(resample({ tolerance: 1e-5 }), dedup(), prune({ keepLeaves: true, keepAttributes: true }));
  await io.write(outPath, doc);
  return { channelsRemoved: removed, channelsKept: kept, reparented };
}
