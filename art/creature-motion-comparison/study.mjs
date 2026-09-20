import { drawFrame, loadAtlas } from '../creature-motion-pilot/runtime/atlas-player.mjs';
import { stage as canopy, swamp, ashfield, tundra, effect, drip, embers, frost, ORIGIN_X, ORIGIN_Y } from './stage.mjs';

// One page for any study rendered through the rig library: ?study=<export folder>.
const STUDIES = {
  'blender2': { number: '06', stage: canopy, cue: effect, eyebrow: 'XALIANS / ANIMATION STUDY 01 / PASS 2', sub: 'Avian template, rendered from species/avilily.json',
    beats: [[0, 'rest'], [125, 'notice'], [375, 'crouch'], [500, 'launch'], [625, 'bloom'], [708, 'peak'], [875, 'fall'], [917, 'landing'], [1042, 'settle'], [1208, 'recovered']] },
  'bioflim-blender': { number: '07', stage: swamp, cue: drip, eyebrow: 'XALIANS / ANIMATION STUDY 02 / AMORPHOUS BODY', sub: 'Amorphous template, rendered from species/bioflim.json',
    beats: [[0, 'rest'], [83, 'glance'], [333, 'gathered'], [417, 'surge'], [500, 'reach cue'], [583, 'reach peak'], [708, 'hold'], [875, 'sag'], [1000, 'drips'], [1208, 'recovered']] },
  'dromeus-blender': { number: '08', stage: ashfield, cue: embers, eyebrow: 'XALIANS / ANIMATION STUDY 03 / BIPED', sub: 'Biped template, rendered from species/dromeus.json',
    beats: [[0, 'rest'], [83, 'notice'], [375, 'crouch'], [458, 'launch'], [542, 'stoop'], [583, 'bite'], [667, 'landing'], [750, 'settle'], [1000, 'step back'], [1208, 'recovered']] },
  'akinza-blender': { number: '09', stage: tundra, cue: frost, eyebrow: 'XALIANS / ANIMATION STUDY 04 / SECOND BIPED FROM A SPEC', sub: 'Biped template, rendered from species/akinza.json',
    against: '../creature-motion-pilot/exports/akinza/manifest.json', againstLabel: 'Pilot cutout (Godot rig, hand keyed)',
    beats: [[0, 'rest'], [83, 'notice'], [375, 'crouch'], [458, 'dash'], [542, 'strike'], [583, 'contact'], [667, 'landing'], [750, 'settle'], [1000, 'step back'], [1208, 'recovered']] },
};

const params = new URLSearchParams(location.search);
const name = STUDIES[params.get('study')] ? params.get('study') : 'dromeus-blender';
const study = STUDIES[name];
const canvas = document.getElementById('stage');
let against = null;
const againstCanvas = document.getElementById('against');
const againstCard = againstCanvas.closest('.phone');
if (study.against) {
  againstCard.hidden = false;
  document.getElementById('against-title').textContent = study.againstLabel;
} else {
  againstCard.hidden = true;
}
const strip = document.getElementById('strip');
const ui = Object.fromEntries(['play', 'replay', 'clip', 'effects', 'light', 'half', 'clock', 'timeline', 'status'].map((id) => [id, document.getElementById(id)]));
let atlas;
let running = true;
let elapsed = 0;
let last = 0;
let scrubbed = false;

document.getElementById('eyebrow').textContent = study.eyebrow;
document.getElementById('number').textContent = study.number;
document.getElementById('card-sub').textContent = study.sub;
const nav = document.getElementById('studies');
for (const key of Object.keys(STUDIES)) {
  const link = document.createElement('a');
  link.href = `study.html?study=${key}`;
  link.textContent = key;
  if (key === name) link.setAttribute('aria-current', 'page');
  nav.append(link);
}

function duration() { return atlas.manifest.clips[ui.clip.value].duration_ms; }

function render() {
  if (!atlas) return;
  const clip = ui.clip.value;
  const isIdle = clip === 'idle';
  const ctx = canvas.getContext('2d');
  study.stage(ctx, ui.light.checked);
  const time = isIdle ? elapsed % duration() : Math.min(elapsed, duration() - 1);
  drawFrame(ctx, atlas, clip, time, ORIGIN_X, ORIGIN_Y, 1, false);
  if (!isIdle && ui.effects.checked) study.cue(ctx, atlas.manifest, elapsed);
  if (against) {
    const octx = againstCanvas.getContext('2d');
    study.stage(octx, ui.light.checked);
    const other = against.manifest.clips[clip];
    const otherTime = isIdle ? elapsed % other.duration_ms : Math.min(elapsed, other.duration_ms - 1);
    drawFrame(octx, against, clip, otherTime, ORIGIN_X, ORIGIN_Y, 1, false);
  }
  ui.timeline.max = String(Math.round(duration()));
  ui.timeline.value = String(Math.round(elapsed));
  ui.clock.textContent = `${(elapsed / 1000).toFixed(2)} / ${(duration() / 1000).toFixed(2)} s`;
}

function renderStrip() {
  strip.replaceChildren();
  for (const [time, label] of study.beats) {
    const figure = document.createElement('figure');
    const cel = document.createElement('canvas');
    cel.width = 384; cel.height = 384;
    const ctx = cel.getContext('2d');
    study.stage(ctx, ui.light.checked);
    drawFrame(ctx, atlas, 'action', time, ORIGIN_X, ORIGIN_Y, 1, false);
    const caption = document.createElement('figcaption');
    caption.textContent = `${label} ${(time / 1000).toFixed(2)} s`;
    figure.append(cel, caption);
    strip.append(figure);
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
ui.light.addEventListener('change', () => { render(); renderStrip(); });
ui.timeline.addEventListener('input', () => { elapsed = Number(ui.timeline.value); scrubbed = true; running = false; ui.play.textContent = 'Play'; render(); });
ui.timeline.addEventListener('change', () => { scrubbed = false; });

Promise.all([loadAtlas(`./exports/${name}/manifest.json`), study.against ? loadAtlas(study.against) : Promise.resolve(null)])
  .then(([loaded, other]) => {
    atlas = loaded;
    against = other;
    const m = atlas.manifest;
    document.title = `${m.label} | Xalians motion study`;
    document.getElementById('title').textContent = m.label;
    document.getElementById('card-title').textContent = m.label;
    const cueName = m.clips.action.markers.map((marker) => marker.name).join(', ');
    document.getElementById('action-name').textContent = `Action (cue: ${cueName})`;
    const p = m.provenance || {};
    document.getElementById('provenance').textContent =
      `template ${m.template} · species ${m.species} · Blender ${p.blender} · spec ${p.spec} ${p.spec_hash} · library ${p.library_hash} · cycles seed ${p.cycles_seed} · samples ${p.samples} · emitter ${m.emitter.join(',')} · cue ${cueName} at ${m.clips.action.markers[0].time_ms} ms`;
    ui.play.disabled = false; ui.replay.disabled = false; ui.timeline.disabled = false;
    ui.status.textContent = 'Ready. Watch at normal speed, then scrub.';
    // Deep links for review and paint checks: ?t=<ms> pauses at that time, ?cue=1 and ?light=1 set the toggles.
    if (params.has('cue')) ui.effects.checked = params.get('cue') !== '0';
    if (params.has('light')) ui.light.checked = params.get('light') !== '0';
    if (params.has('t')) { elapsed = Number(params.get('t')) || 0; running = false; scrubbed = false; ui.play.textContent = 'Play'; }
    render(); renderStrip(); requestAnimationFrame(tick);
  })
  .catch((error) => { ui.status.textContent = `Could not load the study: ${error.message}`; });
