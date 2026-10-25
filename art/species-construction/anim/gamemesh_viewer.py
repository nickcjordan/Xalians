"""Akinza game mesh pass 1: the standalone viewer page, the glb inlined as a data URI.

  python art/species-construction/anim/gamemesh_viewer.py <asset dir> [--deep-frame 18]

Reads <asset dir>/akinza.glb and manifest.json, writes <asset dir>/viewer.html. three.js 0.160.0 (core from cdnjs,
GLTFLoader, OrbitControls and the meshopt decoder from jsdelivr at the same exact version). Idle loops; the Night
Stalk button queues the signature to start in place of idle frame 0 (as the sprite atlas says) and idle restarts at
frame 0 when it ends. Side camera by default (from the creature's left, it faces screen left), orbit by drag, a
button back to the side view; the baked look (base color, normal, AO) or a plain lit gray material. No light, glow
or emission comes from the asset; the page lights it with one hemisphere and one key light.
window.__viewer exposes ready, errors, seek(clip, seconds) (pauses there), play(), setLook(name) for the shots.
"""
import argparse
import base64
import json
from pathlib import Path

THREE = '0.160.0'

PAGE = r'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Akinza Game Mesh</title>
<style>
  :root {
    --bg: #f3f4f6; --panel: #ffffff; --line: #d3d7de; --text: #16181c; --muted: #5b626d;
    --stage: #e6e8ec; --ground: #cfd3da; --key: #1d5fa8; --key-text: #ffffff; --on: #8a5a00;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --bg: #121417; --panel: #1b1e23; --line: #343a43; --text: #e8eaee; --muted: #a0a7b1;
      --stage: #0d0f12; --ground: #2a2f36; --key: #5aa2ec; --key-text: #0b1420; --on: #f2b33d;
    }
  }
  :root[data-theme="dark"] {
    --bg: #121417; --panel: #1b1e23; --line: #343a43; --text: #e8eaee; --muted: #a0a7b1;
    --stage: #0d0f12; --ground: #2a2f36; --key: #5aa2ec; --key-text: #0b1420; --on: #f2b33d;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; background: var(--bg); color: var(--text); font: 16px/1.4 system-ui, -apple-system, Segoe UI, sans-serif; }
  body { min-height: 100vh; display: flex; flex-direction: column; overflow-x: hidden; }
  header { padding: 12px 16px 4px; }
  h1 { font-size: 18px; margin: 0; }
  header p { margin: 2px 0 0; color: var(--muted); font-size: 14px; }
  #stage { position: relative; width: 100%; height: min(70vh, 720px); min-height: 320px; background: var(--stage); touch-action: none; }
  #stage canvas { display: block; width: 100%; height: 100%; }
  #status { position: absolute; left: 12px; top: 10px; font-size: 14px; color: var(--muted); pointer-events: none; }
  .controls { display: flex; flex-wrap: wrap; gap: 10px; padding: 12px 16px; }
  button { min-height: 52px; min-width: 120px; flex: 1 1 140px; padding: 10px 16px; font: inherit; font-weight: 600;
           border-radius: 6px; border: 1px solid var(--line); background: var(--panel); color: var(--text); cursor: pointer; }
  button.primary { background: var(--key); color: var(--key-text); border-color: var(--key); }
  button[aria-pressed="true"] { outline: 3px solid var(--on); outline-offset: -3px; }
  dl { display: grid; grid-template-columns: auto 1fr; gap: 2px 12px; margin: 0; padding: 4px 16px 16px; font-size: 14px; }
  dt { color: var(--muted); }
  dd { margin: 0; font-family: ui-monospace, Menlo, Consolas, monospace; overflow-wrap: anywhere; }
  #error { color: #b3261e; padding: 0 16px; font-weight: 600; }
</style>
</head>
<body>
<header>
  <h1>Akinza game mesh</h1>
  <p>Secondary live glTF, pass 1: the approved rig and clips on a decimated shaved skin. No strand fur in this tier.</p>
</header>
<div id="stage"><div id="status">loading</div></div>
<div class="controls">
  <button id="stalk" class="primary" type="button">Night Stalk</button>
  <button id="look" type="button" aria-pressed="true">Baked look</button>
  <button id="side" type="button">Side view</button>
</div>
<div id="error" role="alert"></div>
<dl id="facts"></dl>
<script type="importmap">
{ "imports": {
  "three": "https://cdnjs.cloudflare.com/ajax/libs/three.js/__THREE__/three.module.min.js",
  "three/addons/": "https://cdn.jsdelivr.net/npm/three@__THREE__/examples/jsm/"
} }
</script>
<script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const MANIFEST = __MANIFEST__;
const GLB = 'data:model/gltf-binary;base64,__GLB__';
const V = (window.__viewer = { ready: false, errors: [], clip: 'idle', queued: false });
window.addEventListener('error', (e) => V.errors.push(String(e.message || e)));
const stage = document.getElementById('stage');
const statusEl = document.getElementById('status');
const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
stage.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(css('--stage'));
const camera = new THREE.PerspectiveCamera(22, 1, 0.05, 50);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f99, 1.6));
const key = new THREE.DirectionalLight(0xffffff, 2.2);
key.position.set(2.0, 3.0, 2.5);
scene.add(key);
const ground = new THREE.Mesh(new THREE.CircleGeometry(1.4, 64), new THREE.MeshStandardMaterial({ color: css('--ground'), roughness: 1 }));
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.001;
scene.add(ground);

const b = MANIFEST.bounds.rest;
const center = new THREE.Vector3((b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2);
function sideView() {
  // frame every clip, not only the rest pose: the footprint radius covers each frame's reach about the origin
  const r = MANIFEST.bounds.footprintRadiusM;
  center.set((b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, 0);
  const h = b.max[1] - b.min[1];
  const w = 2 * r;
  const aspect = stage.clientWidth / stage.clientHeight;
  const fov = THREE.MathUtils.degToRad(camera.fov);
  const dist = 1.15 * Math.max(h / 2, w / 2 / aspect) / Math.tan(fov / 2);
  camera.position.set(center.x + dist, center.y, center.z);      // from +X, the creature's left: it faces screen left
  controls.target.copy(center);
  camera.near = dist / 20; camera.far = dist * 5; camera.updateProjectionMatrix();
  controls.update();
}
function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', () => { resize(); });

const loader = new GLTFLoader();
// the inlined glb is the uncompressed copy: no meshopt decoder (its WebAssembly is blocked under a strict CSP).
// Textures load through <img> from blob: URLs rather than fetch(): GLTFLoader picks ImageBitmapLoader (a fetch) when
// createImageBitmap exists, and hosts that limit connect-src block that.
window.createImageBitmap = undefined;
let mixer, actions = {}, baked = new Map(), plain;
// parse the inlined bytes directly: hosts that block fetch() of data: URIs (the artifact sandbox) throw a TypeError
const glbBytes = Uint8Array.from(atob(GLB.slice(GLB.indexOf(',') + 1)), (c) => c.charCodeAt(0)).buffer;
loader.parse(glbBytes, '', (gltf) => { try {
  const root = gltf.scene;
  scene.add(root);
  plain = new THREE.MeshStandardMaterial({ color: 0xb9bcc2, roughness: 0.85, metalness: 0 });
  let tris = 0;
  root.traverse((o) => {
    if (o.isMesh) {
      baked.set(o, o.material);
      o.frustumCulled = false;
      tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3;
    }
  });
  mixer = new THREE.AnimationMixer(root);
  for (const clip of gltf.animations) actions[clip.name] = mixer.clipAction(clip);
  const idle = actions['idle'];
  const stalk = actions['sig.night-stalk'];
  stalk.setLoop(THREE.LoopOnce, 1);
  stalk.clampWhenFinished = true;
  idle.play();
  mixer.addEventListener('loop', (e) => {
    if (e.action === idle && V.queued) startStalk();
  });
  mixer.addEventListener('finished', (e) => {
    if (e.action === stalk) { stalk.stop(); idle.reset().play(); V.clip = 'idle'; statusEl.textContent = 'idle'; setPressed(false); }
  });
  const facts = {
    triangles: tris, joints: MANIFEST.measured.joints, 'morph targets': MANIFEST.measured.morphTargets,
    clips: gltf.animations.map((c) => `${c.name} ${Math.round(c.duration * 1000)} ms`).join(', '),
    events: MANIFEST.clips['sig.night-stalk'].events.map((e) => `${e.name} ${e.timeMs} ms`).join(', '),
    'file bytes': MANIFEST.measured.fileBytes, 'three.js': THREE.REVISION,
  };
  document.getElementById('facts').innerHTML = Object.entries(facts).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
  resize(); sideView();
  statusEl.textContent = 'idle';
  V.ready = true;
} catch (err) { fail(err); } }, (err) => fail(err));
function fail(err) { V.errors.push(String(err)); document.getElementById('error').textContent = 'Could not load the model: ' + (err && err.stack ? err.stack : err); }
window.addEventListener('unhandledrejection', (e) => fail(e.reason));

function setPressed(on) { document.getElementById('stalk').setAttribute('aria-pressed', on ? 'true' : 'false'); }
function startStalk() {
  V.queued = false;
  actions['idle'].stop();
  actions['sig.night-stalk'].reset().play();
  V.clip = 'sig.night-stalk';
  statusEl.textContent = 'Night Stalk';
}
document.getElementById('stalk').addEventListener('click', () => {
  if (!V.ready || V.clip !== 'idle') return;
  V.queued = true; setPressed(true);
  statusEl.textContent = 'Night Stalk starts at idle frame 0';
});
function setLook(name) {
  for (const [o, m] of baked) o.material = name === 'plain' ? plain : m;
  const btn = document.getElementById('look');
  btn.textContent = name === 'plain' ? 'Plain material' : 'Baked look';
  btn.setAttribute('aria-pressed', name === 'plain' ? 'false' : 'true');
  V.look = name;
}
V.look = 'baked';
document.getElementById('look').addEventListener('click', () => setLook(V.look === 'baked' ? 'plain' : 'baked'));
document.getElementById('side').addEventListener('click', () => sideView());

let paused = false;
V.seek = (clip, t) => {
  paused = true;
  for (const a of Object.values(actions)) a.stop();
  const act = actions[clip];
  act.reset().play();
  act.paused = false;
  mixer.setTime(0);
  mixer.update(t);
  act.paused = true;
  statusEl.textContent = `${clip === 'idle' ? 'idle' : 'Night Stalk'}, paused at frame ${Math.round(t * 30)}`;
  renderer.render(scene, camera);
  return true;
};
V.play = () => { paused = false; statusEl.textContent = 'idle'; for (const a of Object.values(actions)) a.stop(); actions['idle'].reset().play(); V.clip = 'idle'; };
V.setLook = setLook;
V.sideView = sideView;
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();
  if (mixer && !paused) mixer.update(dt);
  controls.update();
  renderer.render(scene, camera);
});
</script>
</body>
</html>
'''


def main():
    p = argparse.ArgumentParser()
    p.add_argument('asset', type=Path)
    p.add_argument('--glb', type=Path, default=None, help='glb to inline (default <asset>/akinza.glb); the uncompressed copy needs no meshopt decoder')
    a = p.parse_args()
    glb = (a.glb or a.asset/'akinza.glb').read_bytes()
    man = json.loads((a.asset/'manifest.json').read_text())
    html = PAGE.replace('__THREE__', THREE).replace('__MANIFEST__', json.dumps(man)).replace('__GLB__', base64.b64encode(glb).decode())
    (a.asset/'viewer.html').write_text(html, encoding='utf-8')
    print('VIEWER', a.asset/'viewer.html', len(html), 'bytes')


if __name__ == '__main__':
    main()
