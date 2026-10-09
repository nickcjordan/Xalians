"""The proof page for the living planets on the galaxy map: the worlds packaged by package.py, loaded the way the home page
would load them, with the real transfer cost shown. Run after package.py: python art/planets/mapdemo.py  (writes dist/map.html)
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
DIST = os.environ.get('PLANET_DIST') or os.path.join(HERE, 'dist')
sizes = json.load(open(os.path.join(DIST, 'sizes.json')))
SPOTS = {'zolton': (68, 64), 'magmuth': (30, 30)}  # where each world sits on the map, percent across and down

rows = ''.join('<tr><td>%s</td><td>%d KB</td><td>%d KB</td></tr>' % (w['name'].capitalize(), w['svg_gz'] // 1024, w['own'] // 1024) for w in sizes['worlds'])
PAGE = '''<title>Living Planets Map</title>
<link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Martian+Mono:wght@400;600&family=Saira:wght@700&display=swap" rel="stylesheet">
<style>
/* The site's room: warm near-black, ink text. Layout: the map first, as it would sit on the home page, then what it costs. */
:root { --room: #121014; --s1: #1b181d; --edge: #2e2a31; --ink: #e9e3d6; --ink2: #b4ad9f; --ink3: #8a8478; color-scheme: dark;
  --display: "Saira", "Arial Narrow", sans-serif; --body: "Atkinson Hyperlegible", system-ui, sans-serif; --mono: "Martian Mono", ui-monospace, monospace; }
body { background: var(--room); color: var(--ink); font: 16px/1.55 var(--body); }
.wrap { max-width: 1040px; margin: 0 auto; padding-inline: 20px; padding-block: 28px 64px; }
h1 { font: 700 clamp(32px, 6vw, 56px)/1 var(--display); text-transform: uppercase; margin: 0 0 10px; }
h2 { font: 700 20px/1.1 var(--display); text-transform: uppercase; letter-spacing: .04em; margin: 40px 0 12px; }
p { color: var(--ink2); max-width: 66ch; margin: 0 0 10px; }
.map { position: relative; aspect-ratio: 10 / 7; max-width: 100%%; background: radial-gradient(ellipse at 50%% 50%%, #1d1830 0, #0b0a12 60%%, #07060b 100%%); border: 1px solid var(--edge); overflow: hidden; }
.map::before { content: ""; position: absolute; inset: 8%% 6%%; border: 1px solid #2a2638; border-radius: 50%%; }
.map::after { content: ""; position: absolute; inset: 24%% 22%%; border: 1px solid #2a2638; border-radius: 50%%; }
.world { position: absolute; z-index: 1; width: clamp(76px, 15%%, 150px); aspect-ratio: 1; transform: translate(-50%%, -50%%); }
.world svg { width: 100%%; height: auto; display: block; }
.world .name { position: absolute; left: 50%%; top: 100%%; transform: translateX(-50%%); font: 600 11px/1 var(--mono); letter-spacing: .1em; text-transform: uppercase; color: var(--ink2); white-space: nowrap; }
.dot { position: absolute; width: 12px; height: 12px; border-radius: 50%%; transform: translate(-50%%, -50%%); background: #6a6478; }
table { border-collapse: collapse; font: 14px/1.4 var(--mono); }
td, th { border-bottom: 1px solid var(--edge); padding: 8px 18px 8px 0; text-align: left; font-variant-numeric: tabular-nums; }
th { color: var(--ink3); font-weight: 600; }
#live { color: var(--ink); }
</style>
<div class="wrap">
  <h1>Planets on the map</h1>
  <p>Two living planets as the home page would carry them: each a small file fetched only when the map comes near the screen, its pictures shared and cached, every planet stepped at twenty frames a second. The grey dots stand where the other twelve worlds would be.</p>
  <div class="map" id="map">%(WORLDS)s%(DOTS)s</div>
  <h2>What it costs</h2>
  <table>
    <tr><th>World</th><th>Markup, compressed</th><th>Its own pictures</th></tr>
    %(ROWS)s
    <tr><td>Shared by every world</td><td></td><td>%(SHARED)d KB</td></tr>
    <tr><th>Total</th><th colspan="2">%(TOTAL)d KB, nothing until the map is near</th></tr>
  </table>
  <h2>What it costs to play</h2>
  <p>Measured in Chrome with fourteen planets on the map at once (these two worlds, seven copies each): each planet steps ten times a second, alternating, so the page draws twenty times a second and the graphics thread is busy about a third of the time. Nothing is drawn while the map is off screen.</p>
  <p style="margin-top:14px">Sizes are measured from the packaged files, markup counted compressed as the site serves it. In this page: <span id="live">waiting for the map to load</span>.</p>
</div>
<script>
(function () {
  const map = document.getElementById('map');
  const live = document.getElementById('live');
  const svgs = [];
  let t = 0, last = 0, acc = 0, tick = 0, shown = true;
  function frame(now) {
    const dt = last ? Math.min(.25, (now - last) / 1000) : 0;
    last = now; acc += dt;
    if (shown && acc >= 1 / 20) {
      // twenty steps a second for the page, each planet on every other step: ten a second each, half the drawing
      t += acc; acc = 0; tick++;
      svgs.forEach((s, i) => { if ((i + tick) %% 2 === 0) s.setCurrentTime(t); });
    }
    requestAnimationFrame(frame);
  }
  async function load() {
    const t0 = performance.now();
    await Promise.all(Array.from(map.querySelectorAll('[data-world]')).map(async (el) => {
      const txt = await (await fetch(el.dataset.world + '.svg')).text();
      el.insertAdjacentHTML('afterbegin', txt);
      const s = el.querySelector('svg');
      s.pauseAnimations();
      svgs.push(s);
    }));
    live.textContent = 'both worlds loaded and playing ' + Math.round(performance.now() - t0) + ' ms after the map came near';
    requestAnimationFrame(frame);
  }
  // nothing plays while the map is off screen
  new IntersectionObserver((es) => { shown = es.some((e) => e.isIntersecting); last = 0; }).observe(map);
  const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); load(); } }, { rootMargin: '400px' });
  io.observe(map);
})();
</script>
'''
worlds = ''.join('<div class="world" data-world="%s" style="left:%d%%;top:%d%%"><span class="name">%s</span></div>' % (w, x, y, w.capitalize()) for w, (x, y) in SPOTS.items())
dots = ''.join('<span class="dot" style="left:%d%%;top:%d%%"></span>' % xy for xy in [(50, 50), (44, 44), (64, 27), (76, 67), (55, 87), (88, 79), (12, 25), (17, 69), (36, 84), (25, 16), (90, 19), (82, 43)])
open(os.path.join(DIST, 'map.html'), 'w', encoding='utf-8').write(PAGE % {'WORLDS': worlds, 'DOTS': dots, 'ROWS': rows, 'SHARED': sizes['shared'] // 1024, 'TOTAL': sizes['total_gz'] // 1024})
print('ok')
