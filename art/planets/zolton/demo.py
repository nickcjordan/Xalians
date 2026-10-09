"""The review page for the Zolton proof of concept: the planet large with layer toggles, at the map's sizes beside today's dot,
and what is in it. Run from the repo root after textures.py: python art/planets/zolton/demo.py  (writes demo.html)
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from build import HERE, svg  # noqa: E402

PAGE = '''<title>Zolton, Living</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Martian+Mono:wght@400;600&family=Saira:wght@500;700&display=swap" rel="stylesheet">
<style>
/* One dark look, the site's own: a room of warm near-black, ink for text, the storm's blue as the only accent. Layout: the planet
   first and large, the controls under it, then the planet at map sizes beside today's dot, then what is in it. */
:root {
  --room: #121014; --s1: #1b181d; --edge: #2e2a31; --ink: #e9e3d6; --ink2: #b4ad9f; --ink3: #8a8478; --storm: #8fd8ff;
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
.controls input { accent-color: var(--storm); margin: 0; }
.controls button:focus-visible, .controls label:focus-within { outline: 2px solid var(--storm); outline-offset: 2px; }
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
.hide-clouds .lyr-clouds, .hide-current .lyr-current, .hide-lightning .lyr-lightning, .hide-blood .lyr-blood, .hide-black .lyr-black, .hide-sun .lyr-sun, .hide-air .lyr-air, .hide-air .lyr-haze { display: none; }
.motion-note { display: none; color: var(--ink3); font-size: 14px; margin-top: 8px; text-align: center; }
@media (prefers-reduced-motion: reduce) { .motion-note { display: block; } }
</style>
<div class="wrap">
  <p class="kicker">Living planet &middot; proof of concept</p>
  <h1>Zolton</h1>
  <p class="lede">The storm world, drawn as an animated SVG from its history: metal crags and frozen canyons turning under a faster storm, current running through the canyons on the night side, lightning everywhere, a bloodstorm with its crimson sprites, and now and then black lightning.</p>
  <div class="stage">
    %(BIG)s
    <p class="motion-note">Your system asks for reduced motion, so it starts paused. Press Play to watch it turn.</p>
    <div class="controls" role="group" aria-label="Layers and playback">
      <label><input type="checkbox" id="l-clouds" data-l="clouds" checked>Storm clouds</label>
      <label><input type="checkbox" id="l-current" data-l="current" checked>Rivers of current</label>
      <label><input type="checkbox" id="l-lightning" data-l="lightning" checked>Lightning</label>
      <label><input type="checkbox" id="l-blood" data-l="blood" checked>Bloodstorm</label>
      <label><input type="checkbox" id="l-black" data-l="black" checked>Black lightning</label>
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
      <div class="cell"><span class="dot" aria-hidden="true"></span><span class="cap">Today: Zolton on the map</span></div>
      <div class="cell">%(MID)s<span class="cap">Map on a wide screen, 150 px</span></div>
      <div class="cell">%(SMALL)s<span class="cap">Map on a phone, 76 px</span></div>
    </div>
  </section>

  <section>
    <h2>What is in it</h2>
    <div class="list">
      <div><b>Metal crags, frozen canyons</b><p>From the history: <q>deep canyons saturated with dense, freezing gases and craggy spires whose metallic peaks act as natural lightning rods.</q> Bare metal catches the light on the peaks, and the canyon floors are frosted.</p></div>
      <div><b>Rivers of current</b><p>Strikes drain <q>into the planet's network of canyons, forming visible rivers of electricity.</q> The canyon network glows blue-white wherever it is night, dimmed under thick storm.</p></div>
      <div><b>The storm</b><p><q>Approximately 2.5 billion bolts per day.</q> Banded cloud wound into cyclones, turning faster than the ground, with lightning flickering in it everywhere, brightest in the dark.</p></div>
      <div><b>Bloodstorm</b><p>Named for <q>the dark red color of the lightning that they brought,</q> with sprites of <q>crimson-lit ball-lightning that danced like electrical jellyfish above the clouds.</q> Two of the storm's cyclones are bloodstorms, heavier and darker than the rest, with dull red glowing low between their bands; red lightning flickers inside them and sprites hang above.</p></div>
      <div><b>Black lightning</b><p>Strikes <q>so intense that it generated low-yield nuclear fusion,</q> releasing a lethal neutron burst. About every 13 seconds, somewhere new in the storm: a forked near-black bolt in a violet sheath, a white flash at its root, and a violet afterglow fading.</p></div>
    </div>
  </section>

  <section class="notes">
    <h2>How it is made</h2>
    <p>The ground, the canyons' current and the storm are flat maps generated in code from noise, wrapped so they tile around the globe. In the SVG each map slides sideways behind a lens, a displacement map that bends a flat picture into a sphere, so the planet really turns: features come in at one edge, swell across the middle and squeeze away at the other. A fixed sun lights it from the upper left. Lightning, sprites and black lightning are drawn on top and timed on separate clocks that never line up, so nothing repeats in lockstep.</p>
    <p>Weight: about 670 KB for one planet, almost all of it the three maps. On the home page the maps can be smaller, since the planet is drawn at about 150 px rather than 640. The same build makes the other thirteen worlds: each needs its own maps and weather, but the lens, lighting and timing carry over.</p>
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
        'BIG': svg('zb', 'big', 'Zolton, turning, with its storm and the current in its canyons'),
        'MID': svg('zm', 'mid', 'Zolton at 150 pixels', with_stars=False, width=512).replace('<svg class="mid"', '<svg class="mid" width="150" height="150"'),
        'SMALL': svg('zs', 'small', 'Zolton at 76 pixels', with_stars=False, width=512).replace('<svg class="small"', '<svg class="small" width="76" height="76"'),
    }
    open(os.path.join(HERE, 'demo.html'), 'w', encoding='utf-8').write(page)
    print('demo', os.path.getsize(os.path.join(HERE, 'demo.html')) // 1024, 'KB')
