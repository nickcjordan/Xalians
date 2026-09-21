import { drawFrame, frameIndexAt, loadAtlas } from './atlas-player.mjs';

const stage = document.querySelector('#stage');
const ctx = stage.getContext('2d');
ctx.imageSmoothingEnabled = true;
ctx.imageSmoothingQuality = 'high';
let catalog;
const atlases = {};
const state = {
  species: 'akinza', profile: 'full', clip: 'idle', elapsed: 0, speed: 1,
  playing: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  mirror: false, lastTick: 0,
};
const notes = {
  akinza: {
    idle: 'Separate ears, head, torso, and two tail pieces carry the idle motion.',
    action: 'The body anticipates, then the legs, arm, head, and tail change pose during the leap.',
    hit: 'The torso recoils while the head, arms, and tail react on their own joints.',
  },
  avilily: {
    idle: 'Two broad wings beat out of phase while the crest and long head streamers follow.',
    action: 'The wings fold and reopen as the flower beak blooms into separate petals.',
    hit: 'The wings snap back, the head recoils, and the beak parts briefly open.',
  },
  frackworm: {
    idle: 'A low wave travels through the segmented body while the head and jaw breathe.',
    action: 'The plate chain coils, the head drives forward, and the jaw opens before recovery.',
    hit: 'A recoil travels through the plates toward the drill head.',
  },
};

function currentAtlas() { return atlases[state.species][state.profile]; }
function currentClip() { return currentAtlas().manifest.clips[state.clip]; }
function duration() { return currentClip().frames.length * 1000 / currentClip().fps; }

function refreshControls() {
  for (const button of document.querySelectorAll('[data-species]')) {
    button.classList.toggle('selected', button.dataset.species === state.species);
  }
  const clipControls = document.querySelector('#clip-controls');
  clipControls.replaceChildren();
  for (const key of Object.keys(catalog.species[state.species].clips)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.clip = key;
    button.textContent = key.charAt(0).toUpperCase() + key.slice(1);
    button.classList.toggle('selected', key === state.clip);
    clipControls.append(button);
  }
  document.querySelector('#svg-link').href = `../source/${state.species}.svg`;
  document.querySelector('#scene-link').href = `../godot/scenes/${state.species}.tscn`;
  document.querySelector('#manifest-link').href = `../exports/${state.species}/${state.profile === 'compact' ? 'compact/' : ''}manifest.json`;
  document.querySelector('#profile-size').textContent = `${currentAtlas().manifest.canvas[0]} px source cell`;
  document.querySelector('#species-readout').textContent = state.species.toUpperCase();
  document.querySelector('#clip-note').textContent = notes[state.species]?.[state.clip] || `Inspect the ${state.clip} performance and its authored timing markers.`;
  document.querySelector('#duration-readout').textContent = `${(duration() / 1000).toFixed(2)} s`;
  const marks = document.querySelector('#markers');
  marks.replaceChildren();
  for (const marker of currentClip().markers || []) {
    const el = document.createElement('span');
    el.className = 'marker';
    el.style.left = `${marker.time_ms / duration() * 100}%`;
    el.title = `${marker.name} at ${(marker.time_ms / 1000).toFixed(2)} s`;
    marks.append(el);
  }
  document.querySelector('#play').textContent = state.playing ? 'Pause' : 'Play';
  document.querySelector('#play').ariaLabel = state.playing ? 'Pause animation' : 'Play animation';
}

function stageBackground() {
  ctx.setTransform(2, 0, 0, 2, 0, 0);
  const sky = ctx.createLinearGradient(0, 0, 0, 430);
  sky.addColorStop(0, '#172937');
  sky.addColorStop(.7, '#274451');
  sky.addColorStop(1, '#142733');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 390, 430);
  ctx.fillStyle = '#7da2a339';
  ctx.fillRect(0, 313, 390, 2);
  ctx.fillStyle = '#102634';
  ctx.beginPath();
  ctx.ellipse(195, 364, 118, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#668b9166';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(195, 364, 95, 9, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function draw(now) {
  if (!atlases[state.species]) return;
  const delta = state.lastTick ? Math.min(100, now - state.lastTick) : 0;
  state.lastTick = now;
  if (state.playing) {
    state.elapsed += delta * state.speed;
    if (currentClip().loop) state.elapsed %= duration();
    else if (state.elapsed >= duration()) {
      state.elapsed = duration();
      state.playing = false;
      refreshControls();
    }
  }
  stageBackground();
  drawFrame(ctx, currentAtlas(), state.clip, state.elapsed, 195, 344, .9 * catalog.captureCell[0] / currentAtlas().manifest.canvas[0], state.mirror);
  document.querySelector('#frame-readout').textContent = `FRAME ${String(frameIndexAt(currentClip(), state.elapsed) + 1).padStart(2, '0')}`;
  document.querySelector('#time-readout').textContent = `${(state.elapsed / 1000).toFixed(2)} s`;
  document.querySelector('#timeline').value = Math.round(state.elapsed / duration() * 1000);
}

function tick(now) { draw(now); requestAnimationFrame(tick); }

document.querySelector('#species-controls').addEventListener('click', (event) => {
  const button = event.target.closest('[data-species]');
  if (!button || !atlases[button.dataset.species]) return;
  state.species = button.dataset.species;
  state.clip = Object.keys(catalog.species[state.species].clips)[0];
  state.elapsed = 0;
  refreshControls();
});
document.querySelector('#clip-controls').addEventListener('click', (event) => {
  const button = event.target.closest('[data-clip]');
  if (!button || !atlases[state.species]) return;
  state.clip = button.dataset.clip;
  state.elapsed = 0;
  state.playing = true;
  refreshControls();
});
document.querySelector('#play').addEventListener('click', () => {
  if (!atlases[state.species]) return;
  if (!state.playing && state.elapsed >= duration()) state.elapsed = 0;
  state.playing = !state.playing;
  refreshControls();
});
document.querySelector('#speed').addEventListener('change', (event) => { state.speed = Number(event.target.value); });
document.querySelector('#mirror').addEventListener('change', (event) => { state.mirror = event.target.checked; });
document.querySelector('#profile').addEventListener('change', (event) => {
  if (!atlases[state.species]) return;
  state.profile = event.target.value;
  refreshControls();
});
document.querySelector('#timeline').addEventListener('input', (event) => {
  if (!atlases[state.species]) return;
  state.playing = false;
  state.elapsed = Number(event.target.value) / 1000 * duration();
  refreshControls();
});

try {
  const response = await fetch('../godot/catalog.json');
  if (!response.ok) throw new Error(`Could not load art catalog: ${response.status}`);
  catalog = await response.json();
  const species = Object.keys(catalog.species);
  const profiles = Object.keys(catalog.profiles);
  state.species = species[0];
  state.profile = profiles[0];
  state.clip = Object.keys(catalog.species[state.species].clips)[0];
  const speciesControls = document.querySelector('#species-controls');
  for (const key of species) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.species = key;
    button.textContent = key.charAt(0).toUpperCase() + key.slice(1);
    speciesControls.append(button);
  }
  const profileSelect = document.querySelector('#profile');
  for (const profile of profiles) {
    const option = document.createElement('option');
    option.value = profile;
    option.textContent = `${profile.charAt(0).toUpperCase() + profile.slice(1)} · ${Math.round(catalog.captureCell[0] * catalog.profiles[profile].scale)} px`;
    profileSelect.append(option);
  }
  await Promise.all(species.map(async (key) => {
    atlases[key] = Object.fromEntries(await Promise.all(profiles.map(async (profile) => {
      const suffix = profile === 'full' ? '' : `${profile}/`;
      return [profile, await loadAtlas(`../exports/${key}/${suffix}manifest.json`)];
    })));
  }));
  document.querySelector('#load-status').textContent = 'Atlases loaded. Drag the timeline to inspect individual poses.';
  refreshControls();
  requestAnimationFrame(tick);
} catch (error) {
  document.querySelector('#load-status').textContent = `Could not load art assets: ${error.message}`;
}
