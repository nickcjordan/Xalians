import { drawFrame, loadAtlas } from '../creature-motion-pilot/runtime/atlas-player.mjs';
import { stage as canopy, swamp, ashfield, tundra, ORIGIN_X, ORIGIN_Y } from './stage.mjs';

// The render style board: ?species=<akinza|avilily|dromeus|bioflim>. Every style of one spec
// plays in lockstep on its own 390 px stage, then a beat board lays the styles out as rows.
// Styles are discovered from the packed exports: <export> is the spec's own render style and
// <export>-<style> a command-line style rendered beside it (see blender/xalians_rig/styles.py).
const SPECIES = {
  akinza: { export: 'akinza-blender', stage: tundra, beats: [[0, 'rest'], [375, 'crouch'], [458, 'dash'], [583, 'contact'], [667, 'landing'], [1000, 'step back']] },
  avilily: { export: 'blender2', stage: canopy, beats: [[0, 'rest'], [375, 'crouch'], [625, 'bloom'], [708, 'peak'], [917, 'landing'], [1208, 'recovered']] },
  dromeus: { export: 'dromeus-blender', stage: ashfield, beats: [[0, 'rest'], [375, 'crouch'], [542, 'stoop'], [583, 'bite'], [667, 'landing'], [1000, 'step back']] },
  bioflim: { export: 'bioflim-blender', stage: swamp, beats: [[0, 'rest'], [333, 'gathered'], [500, 'reach cue'], [583, 'reach peak'], [875, 'sag'], [1208, 'recovered']] },
};
const STYLES = ['plain', 'toon', 'flat', 'ink'];
const STYLE_NOTES = {
  plain: 'Cycles Principled shading, the study baseline',
  toon: 'Toon BSDF two-tone step, flat shadow term, Freestyle contour',
  flat: 'Exact palette fills, no shading, Freestyle contour',
  ink: 'Black mass with pale incision lines, the portrait homage',
};

const params = new URLSearchParams(location.search);
const name = SPECIES[params.get('species')] ? params.get('species') : 'akinza';
const species = SPECIES[name];
const ui = Object.fromEntries(['play', 'replay', 'clip', 'light', 'half', 'clock', 'timeline', 'status', 'phones', 'board', 'provenance', 'studies'].map((id) => [id, document.getElementById(id)]));
let atlases = [];
let running = true;
let elapsed = 0;
let last = 0;
let scrubbed = false;

for (const key of Object.keys(SPECIES)) {
  const link = document.createElement('a');
  link.href = `styles.html?species=${key}`;
  link.textContent = key;
  if (key === name) link.setAttribute('aria-current', 'page');
  ui.studies.append(link);
}

function duration() { return Math.max(...atlases.map(({ atlas }) => atlas.manifest.clips[ui.clip.value].duration_ms)); }

function render() {
  if (!atlases.length) return;
  const clip = ui.clip.value;
  const isIdle = clip === 'idle';
  for (const { atlas, canvas } of atlases) {
    const ctx = canvas.getContext('2d');
    species.stage(ctx, ui.light.checked);
    const own = atlas.manifest.clips[clip].duration_ms;
    const time = isIdle ? elapsed % own : Math.min(elapsed, own - 1);
    drawFrame(ctx, atlas, clip, time, ORIGIN_X, ORIGIN_Y, 1, false);
  }
  ui.timeline.max = String(Math.round(duration()));
  ui.timeline.value = String(Math.round(elapsed));
  ui.clock.textContent = `${(elapsed / 1000).toFixed(2)} / ${(duration() / 1000).toFixed(2)} s`;
}

function renderBoard() {
  ui.board.replaceChildren();
  ui.board.style.gridTemplateColumns = `repeat(${species.beats.length}, minmax(0, 1fr))`;
  for (const { atlas, style } of atlases) {
    for (const [time, label] of species.beats) {
      const figure = document.createElement('figure');
      const cel = document.createElement('canvas');
      cel.width = 384; cel.height = 384;
      const ctx = cel.getContext('2d');
      species.stage(ctx, ui.light.checked);
      drawFrame(ctx, atlas, 'action', time, ORIGIN_X, ORIGIN_Y, 1, false);
      const caption = document.createElement('figcaption');
      caption.textContent = `${style} · ${label} ${(time / 1000).toFixed(2)} s`;
      figure.append(cel, caption);
      ui.board.append(figure);
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
ui.light.addEventListener('change', () => { render(); renderBoard(); });
ui.timeline.addEventListener('input', () => { elapsed = Number(ui.timeline.value); scrubbed = true; running = false; ui.play.textContent = 'Play'; render(); });
ui.timeline.addEventListener('change', () => { scrubbed = false; });

async function load() {
  const found = [];
  for (const style of STYLES) {
    const folder = style === 'plain' ? species.export : `${species.export}-${style}`;
    try {
      const atlas = await loadAtlas(`./exports/${folder}/manifest.json`);
      found.push({ style, atlas });
    } catch {
      // A style that has not been rendered for this species simply has no stage.
    }
  }
  if (!found.length) throw new Error(`no exports found for ${name}`);
  ui.phones.replaceChildren();
  atlases = found.map(({ style, atlas }, index) => {
    const article = document.createElement('article');
    article.className = 'phone';
    const head = document.createElement('div');
    head.className = 'card-head';
    head.innerHTML = `<span class="number">${String(index + 1).padStart(2, '0')}</span><div><h2></h2><p></p></div>`;
    head.querySelector('h2').textContent = `${style}`;
    head.querySelector('p').textContent = STYLE_NOTES[style] || '';
    const canvas = document.createElement('canvas');
    canvas.width = 384; canvas.height = 384;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', `${atlas.manifest.label} at phone size`);
    article.append(head, canvas);
    ui.phones.append(article);
    return { style, atlas, canvas };
  });
  document.title = `${atlases[0].atlas.manifest.species} render style board | Xalians`;
  document.getElementById('title').textContent = `${atlases[0].atlas.manifest.label.split(',')[0]} render style board`;
  ui.provenance.textContent = atlases.map(({ style, atlas }) => {
    const p = atlas.manifest.provenance || {};
    return `${style}: spec ${p.spec} ${p.spec_hash} · library ${p.library_hash} · Blender ${p.blender} · seed ${p.cycles_seed} · samples ${p.samples}`;
  }).join('\n');
  ui.provenance.style.whiteSpace = 'pre-line';
  ui.play.disabled = false; ui.replay.disabled = false; ui.timeline.disabled = false;
  ui.status.textContent = `${atlases.length} styles loaded. Watch at normal speed, then scrub.`;
  if (params.has('light')) ui.light.checked = params.get('light') !== '0';
  if (params.has('t')) { elapsed = Number(params.get('t')) || 0; running = false; scrubbed = false; ui.play.textContent = 'Play'; }
  render(); renderBoard(); requestAnimationFrame(tick);
}

load().catch((error) => { ui.status.textContent = `Could not load the board: ${error.message}`; });
