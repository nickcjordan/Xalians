"""The review page for the Saiphus living planet: the planet large with layer toggles, at the map's sizes beside today's dot, and
what is in it. Run from the repo root after textures.py: python art/planets/saiphus/demo.py  (writes demo.html)
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from build import HERE, svg  # noqa: E402

PAGE = '''<title>Saiphus, Living</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Martian+Mono:wght@400;600&family=Saira:wght@500;700&display=swap" rel="stylesheet">
<style>
/* The site's own dark look: a room of warm near-black, ink for text, and the sulfur gold as the one accent. Layout: the planet
   first and large, the controls under it, then the planet at map sizes beside today's dot, then what is in it. */
:root {
  --room: #121014; --s1: #1b181d; --edge: #2e2a31; --ink: #e9e3d6; --ink2: #b4ad9f; --ink3: #8a8478; --accent: #f2d26b;
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
.controls input { accent-color: var(--accent); margin: 0; }
.controls button:focus-visible, .controls label:focus-within { outline: 2px solid var(--accent); outline-offset: 2px; }
.controls button[aria-pressed="true"] { color: var(--room); background: var(--ink); }
section { margin-top: 56px; }
.sizes { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
.cell { border: 1px solid var(--edge); background: #0a0a10; padding: 18px; display: grid; justify-items: center; align-content: center; gap: 12px; min-height: 230px; }
.cell .cap { font: 600 11px/1.3 var(--mono); letter-spacing: .08em; text-transform: uppercase; color: var(--ink3); text-align: center; }
.dot { width: 22px; height: 22px; border-radius: 50%%; background: #e8c33a; box-shadow: 0 0 0 1px #3a3640; }
.list { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 18px 28px; }
.list div { border-top: 1px solid var(--edge); padding-top: 12px; min-width: 0; }
.list b { font: 700 15px/1.3 var(--display); letter-spacing: .05em; text-transform: uppercase; display: block; margin-bottom: 6px; }
.list p { color: var(--ink2); font-size: 15px; }
.list q { color: var(--ink); font-style: italic; quotes: none; }
.notes p + p { margin-top: 10px; }
.notes p { color: var(--ink2); }
.hide-bands .lyr-bands, .hide-limb .lyr-limb, .hide-islands .lyr-islands, .hide-clouds .lyr-clouds, .hide-storm .lyr-storm, .hide-flare .lyr-flare,
.hide-lightning .lyr-lightning, .hide-sun .lyr-sun, .hide-air .lyr-air { display: none; }
.motion-note { display: none; color: var(--ink3); font-size: 14px; margin-top: 8px; text-align: center; }
@media (prefers-reduced-motion: reduce) { .motion-note { display: block; } }
</style>
<div class="wrap">
  <p class="kicker">Living planet &middot; proof of concept</p>
  <h1>Saiphus</h1>
  <p class="lede">The gas giant, drawn as an animated SVG from its history: banded zones and belts sliding at their own speeds, islands of land drifting in the life band, yellow sulfuric cloud, a storm flaring in a shear zone with lightning inside it.</p>
  <div class="stage">
    %(BIG)s
    <p class="motion-note">Your system asks for reduced motion, so it starts paused. Press Play to watch it turn.</p>
    <div class="controls" role="group" aria-label="Layers and playback">
      <label><input type="checkbox" id="l-bands" data-l="bands" checked>Bands</label>
      <label><input type="checkbox" id="l-islands" data-l="islands" checked>Floating islands</label>
      <label><input type="checkbox" id="l-clouds" data-l="clouds" checked>Sulfuric cloud</label>
      <label><input type="checkbox" id="l-storm" data-l="storm" checked>Storm</label>
      <label><input type="checkbox" id="l-flare" data-l="flare" checked>Storm flare</label>
      <label><input type="checkbox" id="l-lightning" data-l="lightning" checked>Lightning</label>
      <label><input type="checkbox" id="l-sun" data-l="sun" checked>Night side</label>
      <label><input type="checkbox" id="l-limb" data-l="limb" checked>Limb darkening</label>
      <label><input type="checkbox" id="l-air" data-l="air" checked>Air rim</label>
      <button type="button" id="pause" aria-pressed="false">Pause</button>
      <button type="button" id="fast" aria-pressed="false">Spin 8&times;</button>
    </div>
  </div>

  <section>
    <h2>At the map's size</h2>
    <p class="lede" style="margin:0 0 16px">The home page map shows fourteen worlds at once, so each planet is small there. Here is the same planet at the sizes it would be drawn, beside the dot it would replace.</p>
    <div class="sizes">
      <div class="cell"><span class="dot" aria-hidden="true"></span><span class="cap">Today: Saiphus on the map</span></div>
      <div class="cell">%(MID)s<span class="cap">Map on a wide screen, 150 px</span></div>
      <div class="cell">%(SMALL)s<span class="cap">Map on a phone, 76 px</span></div>
    </div>
  </section>

  <section>
    <h2>What is in it</h2>
    <div class="list">
      <div><b>Bands</b><p>From the history: <q>A hydrogen-helium gas giant.</q> No ground: pale zones and ochre belts slide at their own speeds, and their edges curl where they shear.</p></div>
      <div><b>Floating islands</b><p><q>Islands of floating landmass appear to hover across the sky.</q> Small flecks of green and brown land drift slowly in one band, with cloud between them.</p></div>
      <div><b>Sulfuric cloud</b><p><q>Sulfuric acid clouds sweep haphazardly across the sky.</q> Yellow cloud, thickest over the life band.</p></div>
      <div><b>Storm and flare</b><p><q>Violent and relentless storms.</q> One cyclone sits in a shear zone, and its glow swells now and then.</p></div>
      <div><b>Lightning</b><p>Surges of lightning inside the storm, and strikes in the cloud deck. Flashes show only where the cloud is thick, so nothing flashes in clear air.</p></div>
      <div><b>Air rim</b><p><q>Sunrises that light the entire world and all its clouds beautiful shades of orange and pink.</q> The rim of the air is orange and pink on the sunlit side.</p></div>
    </div>
  </section>

  <section class="notes">
    <h2>How it is made</h2>
    <p>The bands, islands and cloud are flat maps generated in code from noise, wrapped so they tile around the globe. In the SVG each map slides sideways behind a lens, a displacement map that bends a flat picture into a sphere, so the planet really turns: features come in at one edge, swell across the middle and squeeze away at the other. Each layer turns on its own clock: belts, zones, cloud, islands and the storm glow never line up. A fixed sun lights it from the upper left.</p>
    <p>Weight: about %(KB)s KB for the three planets on this page. The map-size planets use 1024-wide maps, and the islands are enlarged there so they survive the shrink.</p>
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
    big = svg('sb', 'big', 'Saiphus, turning, with its bands, islands and storm')
    mid = svg('sm', 'mid', 'Saiphus at 150 pixels', with_stars=False, width=1024).replace('<svg class="mid"', '<svg class="mid" width="150" height="150"')
    small = svg('ss', 'small', 'Saiphus at 76 pixels', with_stars=False, width=1024).replace('<svg class="small"', '<svg class="small" width="76" height="76"')
    kb = (len(big) + len(mid) + len(small)) // 1024
    page = PAGE % {'BIG': big, 'MID': mid, 'SMALL': small, 'KB': '%d' % kb}
    open(os.path.join(HERE, 'demo.html'), 'w', encoding='utf-8').write(page)
    print('demo', os.path.getsize(os.path.join(HERE, 'demo.html')) // 1024, 'KB')
