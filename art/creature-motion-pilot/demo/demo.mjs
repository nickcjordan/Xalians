import { drawFrame, loadAtlas } from '../runtime/atlas-player.mjs';
import { battleTiming, sampleBattle } from './sequence.mjs';

const $ = (id) => document.getElementById(id);
const canvas = $('battle');
const ctx = canvas.getContext('2d');
const speciesNames = { akinza: 'Akinza', avilily: 'Avilily', frackworm: 'Frackworm' };
const accent = { akinza: '#c7ecf0', avilily: '#f0bfd4', frackworm: '#e9cd96' };
const atlasCache = new Map();
const stage = new Image();
stage.src = 'stage.svg';

let attacker;
let defender;
let timing;
let elapsed = 0;
let previousFrame = 0;
let paused = false;
let loopWait = 0;
let loadVersion = 0;
let previousPhase = '';

function atlasFor(species, profile) {
  const key = `${species}:${profile}`;
  if (!atlasCache.has(key)) {
    const suffix = profile === 'compact' ? '/compact' : '';
    atlasCache.set(key, loadAtlas(`../exports/${species}${suffix}/manifest.json`));
  }
  return atlasCache.get(key);
}

async function loadMatch() {
  const version = ++loadVersion;
  $('replay').disabled = true;
  $('toggle').disabled = true;
  $('timeline').disabled = true;
  $('load-status').textContent = 'Loading creature sheets…';
  const profile = $('profile').value;
  try {
    const [left, right] = await Promise.all([
      atlasFor($('attacker').value, profile),
      atlasFor($('defender').value, profile),
      stage.decode(),
    ]);
    if (version !== loadVersion) return;
    attacker = left;
    defender = right;
    timing = battleTiming(attacker, defender);
    elapsed = 0;
    loopWait = 0;
    previousPhase = '';
    paused = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    $('toggle').textContent = paused ? 'Play' : 'Pause';
    $('left-name').textContent = speciesNames[$('attacker').value].toUpperCase();
    $('right-name').textContent = speciesNames[$('defender').value].toUpperCase();
    loadReview();
    $('event-time').textContent = `Cue at ${(timing.impactMs / 1000).toFixed(2)} s`;
    $('total-time').textContent = `${(timing.durationMs / 1000).toFixed(2)} s`;
    $('marker').textContent = `Art cue: ${timing.marker.replaceAll('_', ' ')}`;
    $('replay').disabled = false;
    $('toggle').disabled = false;
    $('timeline').disabled = false;
    $('load-status').textContent = `${speciesNames[$('attacker').value]} acts; ${speciesNames[$('defender').value]} reacts. ${profile === 'compact' ? 'Compact' : 'Full'} sheets loaded.`;
    render();
  } catch (error) {
    if (version !== loadVersion) return;
    $('load-status').textContent = `Could not load the demo: ${error.message}. Open it through the local server described in the README.`;
  }
}

function drawShadow(x, y, width, alpha) {
  ctx.fillStyle = `rgba(9, 25, 29, ${alpha})`;
  ctx.beginPath();
  ctx.ellipse(x, y, width, 17, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawImpact(x, y, amount, color) {
  if (amount <= 0) return;
  ctx.save();
  ctx.globalAlpha = amount;
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(x, y, 34 + (1 - amount) * 64, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 4;
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    const inner = 48 + (1 - amount) * 35;
    const outer = inner + 19;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(angle) * inner, y + Math.sin(angle) * inner);
    ctx.lineTo(x + Math.cos(angle) * outer, y + Math.sin(angle) * outer);
    ctx.stroke();
  }
  ctx.restore();
}

function render() {
  if (!timing) return;
  const sample = sampleBattle(timing, elapsed);
  const color = accent[$('attacker').value];
  ctx.clearRect(0, 0, 960, 540);
  ctx.save();
  const shake = sample.flash * 5;
  ctx.translate(Math.sin(sample.time * .18) * shake, Math.cos(sample.time * .13) * shake * .45);
  ctx.drawImage(stage, 0, 0, 960, 540);

  const leftX = 278 + sample.approach * 52;
  const rightX = 684 + sample.recoil * 19;
  drawShadow(leftX, 435, 91, .26);
  drawShadow(rightX, 435, 91, .26);
  const leftScale = .70 * 384 / attacker.manifest.canvas[0];
  const rightScale = .70 * 384 / defender.manifest.canvas[0];
  drawFrame(ctx, attacker, sample.attackerClip, sample.attackerElapsed, leftX, 432, leftScale);
  drawFrame(ctx, defender, sample.defenderClip, sample.defenderElapsed, rightX, 432, rightScale, true);
  drawImpact(rightX - 40, 308, sample.flash, color);
  if (sample.flash > 0) {
    ctx.fillStyle = `rgba(255, 246, 214, ${sample.flash * .13})`;
    ctx.fillRect(0, 0, 960, 540);
  }
  ctx.restore();

  $('right-hp').style.width = sample.impacted ? '72%' : '100%';
  $('left-hp').style.width = '100%';
  $('timeline').value = Math.round(sample.time / timing.durationMs * 1000);
  $('time').textContent = `${(sample.time / 1000).toFixed(2)} s`;
  const phase = sample.done ? 'RECOVERY' : sample.defenderClip === 'hit' ? 'REACTION' : sample.attackerClip === 'action' ? 'ACTION' : 'READY';
  $('phase').textContent = phase;
  if (phase !== previousPhase) {
    canvas.setAttribute('aria-label', `${speciesNames[$('attacker').value]} acts against ${speciesNames[$('defender').value]}. Current phase: ${phase.toLowerCase()}.`);
    previousPhase = phase;
  }
}

function frame(now) {
  const delta = previousFrame ? Math.min(80, now - previousFrame) : 0;
  previousFrame = now;
  if (timing && !paused) {
    if (elapsed < timing.durationMs) {
      elapsed = Math.min(timing.durationMs, elapsed + delta * Number($('speed').value));
    } else if ($('loop').checked) {
      loopWait += delta;
      if (loopWait >= 800) { elapsed = 0; loopWait = 0; }
    }
    render();
  }
  requestAnimationFrame(frame);
}

function replay() {
  elapsed = 0;
  loopWait = 0;
  paused = false;
  $('toggle').textContent = 'Pause';
  render();
}

$('attacker').addEventListener('change', loadMatch);
$('defender').addEventListener('change', loadMatch);
$('profile').addEventListener('change', loadMatch);
$('swap').addEventListener('click', () => {
  const old = $('attacker').value;
  $('attacker').value = $('defender').value;
  $('defender').value = old;
  loadMatch();
});
$('replay').addEventListener('click', replay);
$('toggle').addEventListener('click', () => {
  paused = !paused;
  $('toggle').textContent = paused ? 'Play' : 'Pause';
  if (!paused && elapsed >= timing.durationMs) elapsed = 0;
});
$('timeline').addEventListener('input', (event) => {
  if (!timing) return;
  paused = true;
  $('toggle').textContent = 'Play';
  elapsed = Number(event.target.value) / 1000 * timing.durationMs;
  loopWait = 0;
  render();
});

const reviewKey = 'xalians-motion-demo-review-v2';
const scenarioKey = () => `${$('attacker').value}:${$('defender').value}:${$('profile').value}`;
function reviewStore() {
  try { return JSON.parse(localStorage.getItem(reviewKey) || '{}'); }
  catch { return {}; }
}
function loadReview() {
  const saved = reviewStore()[scenarioKey()] || {};
  $('review-scope').textContent = `Reviewing ${speciesNames[$('attacker').value]} vs ${speciesNames[$('defender').value]} / ${$('profile').value}`;
  for (const input of document.querySelectorAll('#scorecard input')) input.checked = false;
  for (const [key, value] of Object.entries(saved.ratings || {})) {
    const input = document.querySelector(`input[name="${key}"][value="${value}"]`);
    if (input) input.checked = true;
  }
  $('notes').value = saved.notes || '';
}
function saveReview() {
  const ratings = {};
  for (const key of ['identity', 'intent', 'impact', 'compact']) {
    ratings[key] = document.querySelector(`input[name="${key}"]:checked`)?.value || '';
  }
  try {
    const store = reviewStore();
    store[scenarioKey()] = { ratings, notes: $('notes').value };
    localStorage.setItem(reviewKey, JSON.stringify(store));
    $('saved').textContent = 'Saved in this browser';
  } catch { $('saved').textContent = 'Use Download review notes to save'; }
}
$('scorecard').addEventListener('change', saveReview);
$('notes').addEventListener('input', saveReview);
$('download').addEventListener('click', () => {
  const lines = ['Xalians creature motion pilot review', `Match: ${$('attacker').value} acts, ${$('defender').value} reacts`, `Export: ${$('profile').value}`, ''];
  for (const [key, label] of Object.entries({ identity: 'Creature identity', intent: 'Action readability', impact: 'Reaction timing', compact: 'Compact at phone size' })) {
    lines.push(`${label}: ${document.querySelector(`input[name="${key}"]:checked`)?.value || 'not rated'}`);
  }
  lines.push('', 'Notes:', $('notes').value || '(none)');
  const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'xalians-motion-review.txt';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

requestAnimationFrame(frame);
loadMatch();
