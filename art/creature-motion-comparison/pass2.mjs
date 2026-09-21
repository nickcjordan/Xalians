import { drawFrame, loadAtlas } from '../creature-motion-pilot/runtime/atlas-player.mjs';
import { stage, effect, ORIGIN_X, ORIGIN_Y } from './stage.mjs';

const variants = ['blender', 'blender2'];
const cards = Object.fromEntries(variants.map((name) => [name, document.querySelector(`[data-variant="${name}"] canvas`)]));
const strips = Object.fromEntries(variants.map((name) => [name, document.querySelector(`[data-strip="${name}"]`)]));
const ui = Object.fromEntries(['play', 'replay', 'clip', 'effects', 'light', 'half', 'clock', 'timeline', 'status'].map((id) => [id, document.getElementById(id)]));
const atlases = {};
let running = true;
let elapsed = 0;
let last = 0;
let scrubbed = false;
let loaded = false;

// Beats are named by time so both passes are sampled at the same moments.
const BEATS = [[0, 'rest'], [125, 'notice'], [375, 'crouch'], [500, 'launch'], [625, 'bloom'], [708, 'peak'], [875, 'fall'], [917, 'landing'], [1042, 'settle'], [1208, 'recovered']];

function duration() { return ui.clip.value === 'action' ? 1250 : 1583; }

function render() {
  if (!loaded) return;
  const clip = ui.clip.value;
  const isIdle = clip === 'idle';
  for (const name of variants) {
    const ctx = cards[name].getContext('2d');
    const atlas = atlases[name];
    stage(ctx, ui.light.checked);
    const clipDuration = atlas.manifest.clips[clip].duration_ms;
    const time = isIdle ? elapsed % clipDuration : Math.min(elapsed, clipDuration - 1);
    drawFrame(ctx, atlas, clip, time, ORIGIN_X, ORIGIN_Y, 1, false);
    if (!isIdle && ui.effects.checked) effect(ctx, atlas.manifest, elapsed);
  }
  ui.timeline.max = String(duration());
  ui.timeline.value = String(Math.round(elapsed));
  ui.clock.textContent = `${(elapsed / 1000).toFixed(2)} / ${(duration() / 1000).toFixed(2)} s`;
}

function renderStrips() {
  for (const name of variants) {
    strips[name].replaceChildren();
    for (const [time, label] of BEATS) {
      const figure = document.createElement('figure');
      const canvas = document.createElement('canvas');
      canvas.width = 384; canvas.height = 384;
      const ctx = canvas.getContext('2d');
      stage(ctx, ui.light.checked);
      drawFrame(ctx, atlases[name], 'action', time, ORIGIN_X, ORIGIN_Y, 1, false);
      const caption = document.createElement('figcaption');
      caption.textContent = `${label} ${(time / 1000).toFixed(2)} s`;
      figure.append(canvas, caption);
      strips[name].append(figure);
    }
  }
}

function tick(stamp) {
  if (last && running && !scrubbed) {
    elapsed += Math.min(64, stamp - last) * (ui.half.checked ? .5 : 1);
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
ui.light.addEventListener('change', () => { render(); renderStrips(); });
ui.timeline.addEventListener('input', () => { elapsed = Number(ui.timeline.value); scrubbed = true; running = false; ui.play.textContent = 'Play'; render(); });
ui.timeline.addEventListener('change', () => { scrubbed = false; });

Promise.all(variants.map(async (name) => { atlases[name] = await loadAtlas(`./exports/${name}/manifest.json`); }))
  .then(() => { loaded = true; ui.play.disabled = false; ui.replay.disabled = false; ui.timeline.disabled = false; ui.status.textContent = 'Ready. Watch both at normal speed, then scrub.'; render(); renderStrips(); requestAnimationFrame(tick); })
  .catch((error) => { ui.status.textContent = `Could not load the comparison: ${error.message}`; });
