import { drawFrame, loadAtlas } from '../creature-motion-pilot/runtime/atlas-player.mjs';
import { stage, effect, ORIGIN_X, ORIGIN_Y } from './stage.mjs';

const variants = ['cutout', 'hybrid', 'pixel', 'rendered3d', 'blender', 'blender2'];
const cards = Object.fromEntries(variants.map((name) => [name, document.querySelector(`[data-variant="${name}"] canvas`)]));
const ui = Object.fromEntries(['play', 'replay', 'clip', 'effects', 'light', 'clock', 'timeline', 'status', 'preference', 'notes', 'download'].map((id) => [id, document.getElementById(id)]));
const atlases = {};
let running = true;
let elapsed = 0;
let last = 0;
let scrubbed = false;
let loaded = false;

function duration() { return ui.clip.value === 'action' ? 1250 : 1583; }

function render() {
  if (!loaded) return;
  const clip = ui.clip.value;
  const isIdle = clip === 'idle';
  for (const name of variants) {
    const canvas = cards[name];
    const ctx = canvas.getContext('2d');
    const atlas = atlases[name];
    stage(ctx, ui.light.checked);
    ctx.imageSmoothingEnabled = name !== 'pixel';
    const clipDuration = atlas.manifest.clips[clip].duration_ms;
    const time = isIdle ? elapsed % clipDuration : Math.min(elapsed, clipDuration - 1);
    drawFrame(ctx, atlas, clip, time, ORIGIN_X, ORIGIN_Y, 1, false);
    if (!isIdle && ui.effects.checked) effect(ctx, atlas.manifest, elapsed);
  }
  ui.timeline.max = String(duration());
  ui.timeline.value = String(Math.round(elapsed));
  ui.clock.textContent = `${(elapsed / 1000).toFixed(2)} / ${(duration() / 1000).toFixed(2)} s`;
}

function tick(stamp) {
  if (last && running && !scrubbed) {
    elapsed += Math.min(64, stamp - last);
    if (elapsed >= duration()) elapsed = ui.clip.value === 'idle' ? elapsed % duration() : 0;
    render();
  }
  last = stamp;
  requestAnimationFrame(tick);
}

ui.play.addEventListener('click', () => { running = !running; scrubbed = false; ui.play.textContent = running ? 'Pause' : 'Play'; });
ui.replay.addEventListener('click', () => { elapsed = 0; running = true; scrubbed = false; ui.play.textContent = 'Pause'; render(); });
ui.clip.addEventListener('change', () => { elapsed = 0; render(); });
ui.effects.addEventListener('change', render);
ui.light.addEventListener('change', render);
ui.timeline.addEventListener('input', () => { elapsed = Number(ui.timeline.value); scrubbed = true; running = false; ui.play.textContent = 'Play'; render(); });
ui.timeline.addEventListener('change', () => { scrubbed = false; });
ui.notes.value = localStorage.getItem('avilily-motion-notes') || '';
ui.notes.addEventListener('input', () => localStorage.setItem('avilily-motion-notes', ui.notes.value));
ui.preference.value = localStorage.getItem('avilily-motion-preference') || '';
ui.preference.addEventListener('change', () => localStorage.setItem('avilily-motion-preference', ui.preference.value));
ui.download.addEventListener('click', () => {
  const payload = { study: 'Avilily motion comparison', reviewedAt: new Date().toISOString(), preferredNextPass: ui.preference.value, notes: ui.notes.value };
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'avilily-motion-notes.json'; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

Promise.all(variants.map(async (name) => { atlases[name] = await loadAtlas(`./exports/${name}/manifest.json`); }))
  .then(() => { loaded = true; ui.play.disabled = false; ui.replay.disabled = false; ui.timeline.disabled = false; ui.status.textContent = 'Ready. Watch the action at normal speed, then pause or scrub.'; render(); requestAnimationFrame(tick); })
  .catch((error) => { ui.status.textContent = `Could not load the comparison: ${error.message}`; });
