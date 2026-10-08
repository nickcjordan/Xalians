"""The review page for the Magmuth living planet: the planet large with layer toggles, at the map's sizes beside today's dot, and
what is in it. Run from the repo root after textures.py: python art/planets/magmuth/demo.py  (writes demo.html)
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from build import HERE, svg  # noqa: E402

PAGE = '''<title>Magmuth, Living</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Martian+Mono:wght@400;600&family=Saira:wght@500;700&display=swap" rel="stylesheet">
<style>
/* One dark look, the site's own: a room of warm near-black, ink for text, the fire's orange as the only accent. Layout: the planet
   first and large, the controls under it, then the planet at map sizes beside today's dot, then what is in it. */
:root {
  --room: #121014; --s1: #1b181d; --edge: #2e2a31; --ink: #e9e3d6; --ink2: #b4ad9f; --ink3: #8a8478; --fire: #ffb060;
  --display: "Saira", "Arial Narrow", sans-serif; --body: "Atkinson Hyperlegible", system-ui, sans-serif; --mono: "Martian Mono", ui-monospace, monospace;
  color-scheme: dark;
}
body { background: var(--room); color: var(--ink); font: 16px/1.55 var(--body); }
.wrap { max-width: 1080px; margin: 0 auto; padding-inline: 20px; padding-block: 28px 64px; }
.kicker { font: 600 11px/1 var(--mono); letter-spacing: .12em; text-transform: uppercase; color: var(--ink3); margin: 0 0 10px; }
h1 { font: 700 clamp(40px, 7vw, 72px)/0.95 var(--display); letter-spacing: .02em; text-transform: uppercase; margin: 0; text-wrap: balance; }
h2 { font: 700 22px/1.1 var(--display); letter-spacing: .04em; text-transform: uppercase; margin: 0 0 14px; }
p { margin: 0; max-width: 64ch; }
.lede { color: var(--ink2); margin-top: 14px; }
.stage { display: grid; grid-template-columns: minmax(0, 1fr); justify-items: center; margin-top: 18px; }
.stage svg.big { width: min(640px, 100%%); height: auto; display: block; }
.controls { display: flex; flex-wrap: wrap; gap: 8px 10px; justify-content: center; margin-top: 6px; }
.controls label, .controls button { font: 600 11px/1 var(--mono); letter-spacing: .08em; text-transform: uppercase; color: var(--ink2); border: 1px solid var(--edge); background: var(--s1); padding: 9px 11px; display: inline-flex; gap: 8px; align-items: center; cursor: pointer; }
.controls input { accent-color: var(--fire); margin: 0; }
.controls button:focus-visible, .controls label:focus-within { outline: 2px solid var(--fire); outline-offset: 2px; }
.controls button[aria-pressed="true"] { color: var(--room); background: var(--ink); }
section { margin-top: 56px; }
.sizes { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
.cell { border: 1px solid var(--edge); background: #0a0a10; padding: 18px; display: grid; justify-items: center; align-content: center; gap: 12px; min-height: 230px; }
.cell .cap { font: 600 11px/1.3 var(--mono); letter-spacing: .08em; text-transform: uppercase; color: var(--ink3); text-align: center; }
.dot { width: 22px; height: 22px; border-radius: 50%%; background: #9a9088; box-shadow: 0 0 0 1px #3a3640; }
.list { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 18px 28px; }
.list div { border-top: 1px solid var(--edge); padding-top: 12px; min-width: 0; }
.list b { font: 700 15px/1.3 var(--display); letter-spacing: .05em; text-transform: uppercase; display: block; margin-bottom: 6px; }
.list p { color: var(--ink2); font-size: 15px; }
.list q { color: var(--ink); font-style: italic; quotes: none; }
.notes p + p { margin-top: 10px; }
.notes p { color: var(--ink2); }
.hide-clouds .lyr-clouds, .hide-rivers .lyr-rivers, .hide-flash .lyr-flash, .hide-erupt .lyr-eruption, .hide-seas .lyr-seas, .hide-sun .lyr-sun, .hide-air .lyr-air { display: none; }
.motion-note { display: none; color: var(--ink3); font-size: 14px; margin-top: 8px; text-align: center; }
@media (prefers-reduced-motion: reduce) { .motion-note { display: block; } }
</style>
<div class="wrap">
  <p class="kicker">Living planet &middot; Magmuth</p>
  <h1>Magmuth</h1>
  <p class="lede">The fire world, drawn as an animated SVG from its history: black glass spires and ash under a red sun, the cracks glowing red, lava seas churning under a cracked crust, smoke over it all, and volcanoes that erupt in turn.</p>
  <div class="stage">
    %(BIG)s
    <p class="motion-note">Your system asks for reduced motion, so it starts paused. Press Play to watch it turn.</p>
    <div class="controls" role="group" aria-label="Layers and playback">
      <label><input type="checkbox" id="l-clouds" data-l="clouds" checked>Smoke and ash</label>
      <label><input type="checkbox" id="l-rivers" data-l="rivers" checked>Rivers of fire</label>
      <label><input type="checkbox" id="l-flash" data-l="flash" checked>Fire flashes</label>
      <label><input type="checkbox" id="l-erupt" data-l="erupt" checked>Volcanoes</label>
      <label><input type="checkbox" id="l-seas" data-l="seas" checked>Lava seas</label>
      <label><input type="checkbox" id="l-sun" data-l="sun" checked>Night side</label>
      <label><input type="checkbox" id="l-air" data-l="air" checked>Atmosphere</label>
      <button type="button" id="pause" aria-pressed="false">Pause</button>
      <button type="button" id="fast" aria-pressed="false">Spin 8&times;</button>
    </div>
  </div>

  <section>
    <h2>At the map's size</h2>
    <p class="lede" style="margin:0 0 16px">The home page map shows fourteen worlds at once, so each planet is small there. Here is the same planet at the sizes it would be drawn, beside the dot it would replace.</p>
    <div class="sizes">
      <div class="cell"><span class="dot" aria-hidden="true"></span><span class="cap">Today: Magmuth on the map</span></div>
      <div class="cell">%(MID)s<span class="cap">Map on a wide screen, 150 px</span></div>
      <div class="cell">%(SMALL)s<span class="cap">Map on a phone, 76 px</span></div>
    </div>
  </section>

  <section>
    <h2>What is in it</h2>
    <div class="list">
      <div><b>Glass spires and ash</b><p>From the history: <q>obsidian islands and jagged spires of volcanic glass.</q> The high ground is black glass with a cold sheen on the faces that catch the light; the lows are basalt and grey ash, with tar-pits.</p></div>
      <div><b>Rivers of fire</b><p><q>The cracks in the earth glow an eerie red from the magma.</q> The fissure network glows red, brightest on the night side and dimmer in the red sun's light.</p></div>
      <div><b>Lava seas</b><p><q>Whole regions can liquify into molten seas.</q> The lowest basins are crusted over with dark cracked plates, and the cracks between them glow. The molten rock churns slowly beneath.</p></div>
      <div><b>Fire flashes</b><p><q>Rivers of fire flash across the wastes with little to no warning.</q> Bright blooms appear on the fissures and fade, and surges of light run along them on their own clock.</p></div>
      <div><b>Volcanoes</b><p><q>Erratic volcanic eruptions create pyroclastic flows.</q> Three vents, each on a fissure, erupt in turn: a bright vent, a glow spreading out, and a dark plume of ash rising and drifting.</p></div>
      <div><b>Smoke and ash</b><p><q>The acrid air is thick with volcanic smoke, staining the sky crimson.</q> Dark smoke and ash wound into a few slow <q>violent ash storms</q>, lit red on their tops.</p></div>
    </div>
  </section>

  <section class="notes">
    <h2>How it is made</h2>
    <p>The ground, the fissures' glow, the lava seas and the smoke are flat maps generated in code from noise, wrapped so they tile around the globe. In the SVG each map slides sideways behind a lens, a displacement map that bends a flat picture into a sphere, so the planet really turns. A red dwarf lights it from the upper left, and the day side is washed red-orange. Glow is drawn with screen blending above the night; the smoke, the ground and the plumes sit below it. Each event runs on a clock of its own, so nothing repeats in lockstep.</p>
    <p>Weight: under 5 MB for this page, almost all of it the maps. On the home page the maps can be smaller, since the planet is drawn at about 150 px rather than 640.</p>
  </section>
</div>
<script>
(function () {
  // Played at film rate: the animations are paused and stepped by hand twenty times a second (as the site's story plates are),
  // which halves the drawing work against the browser's own pace and looks the same for a slow turn and flickering light.
  const svgs = Array.from(document.querySelectorAll('svg'));
  document.querySelectorAll('[data-l]').forEach((box) => box.addEventListener('change', () => document.body.classList.toggle('hide-' + box.dataset.l, !box.checked)));
  let paused = false, speed = 1, t = 0, last = 0, acc = 0;
  const STEP = 1 / 20;
  svgs.forEach((s) => s.pauseAnimations());
  const pauseBtn = document.getElementById('pause'), fastBtn = document.getElementById('fast');
  function frame(now) {
    const dt = last ? Math.min(.25, (now - last) / 1000) : 0;
    last = now;
    if (!paused) {
      acc += dt;
      if (acc >= STEP) {
        t += acc * speed;
        acc = 0;
        svgs.forEach((s) => s.setCurrentTime(t));
      }
    }
    requestAnimationFrame(frame);
  }
  function label() {
    pauseBtn.textContent = paused ? 'Play' : 'Pause';
    pauseBtn.setAttribute('aria-pressed', String(paused));
    fastBtn.setAttribute('aria-pressed', String(speed > 1));
  }
  pauseBtn.addEventListener('click', () => { paused = !paused; label(); });
  fastBtn.addEventListener('click', () => { speed = speed > 1 ? 1 : 8; label(); });
  try { if (matchMedia('(prefers-reduced-motion: reduce)').matches) { paused = true; label(); } } catch (e) {}
  requestAnimationFrame(frame);
})();
</script>
'''

if __name__ == '__main__':
    page = PAGE % {
        'BIG': svg('mb', 'big', 'Magmuth, turning, with its fissures, lava seas, volcanoes and smoke'),
        'MID': svg('mm', 'mid', 'Magmuth at 150 pixels', with_stars=False, width=1024).replace('<svg class="mid"', '<svg class="mid" width="150" height="150"'),
        'SMALL': svg('ms', 'small', 'Magmuth at 76 pixels', with_stars=False, width=1024).replace('<svg class="small"', '<svg class="small" width="76" height="76"'),
    }
    open(os.path.join(HERE, 'demo.html'), 'w', encoding='utf-8').write(page)
    print('demo', os.path.getsize(os.path.join(HERE, 'demo.html')) // 1024, 'KB')
