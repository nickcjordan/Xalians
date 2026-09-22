// Procedural gouache textures drawn on a canvas and saved as PNG: no external assets.
const path = require('path');
const { chromium } = require(require.resolve('playwright-core', { paths: [path.join(__dirname, '..', '..', 'apps/web')] }));
const fs = require('fs');
function findChrome() {
  const root = path.join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  const dirs = fs.readdirSync(root).filter((d) => d.startsWith('chromium_headless_shell') || d.startsWith('chromium-')).sort().reverse();
  for (const d of dirs) for (const sub of ['chrome-headless-shell-win64/chrome-headless-shell.exe', 'chrome-win/chrome.exe', 'chrome-win64/chrome.exe']) { const p = path.join(root, d, sub); if (fs.existsSync(p)) return p; }
  throw new Error('no chrome');
}
const outDir = process.argv[2];
(async () => {
  const b = await chromium.launch({ executablePath: findChrome() });
  const p = await b.newPage();
  await p.setContent('<canvas id="c"></canvas>');
  const results = await p.evaluate(() => {
    function rng(seed) { let t = seed >>> 0; return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
    // value noise, tileable
    function noiseField(size, cells, seed) {
      const r = rng(seed); const g = new Float32Array(cells * cells); for (let i = 0; i < g.length; i++) g[i] = r();
      const out = new Float32Array(size * size); const sc = cells / size;
      const sm = (t) => t * t * (3 - 2 * t);
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const fx = x * sc, fy = y * sc; const x0 = Math.floor(fx), y0 = Math.floor(fy); const tx = sm(fx - x0), ty = sm(fy - y0);
        const i = (xx, yy) => g[((yy % cells) + cells) % cells * cells + ((xx % cells) + cells) % cells];
        const a = i(x0, y0) * (1 - tx) + i(x0 + 1, y0) * tx, bb = i(x0, y0 + 1) * (1 - tx) + i(x0 + 1, y0 + 1) * tx;
        out[y * size + x] = a * (1 - ty) + bb * ty;
      }
      return out;
    }
    const S = 768; const c = document.getElementById('c'); c.width = S; c.height = S; const ctx = c.getContext('2d');
    // ---- paper: pigment mottle (low frequency), tooth (mid), grain (high), plus fibers ----
    const mott2 = noiseField(S, 2, 21); const mott = noiseField(S, 3, 11), tooth = noiseField(S, 36, 12), grain = noiseField(S, 192, 13), fine = noiseField(S, 384, 14);
    const img = ctx.createImageData(S, S); const d = img.data; const r = rng(99);
    for (let i = 0; i < S * S; i++) {
      let v = 0.5 + (mott[i] - 0.5) * 0.16 + (mott2[i] - 0.5) * 0.1 + (tooth[i] - 0.5) * 0.18 + (grain[i] - 0.5) * 0.16 + (fine[i] - 0.5) * 0.12;
      const px = Math.max(0, Math.min(255, Math.round(v * 255)));
      d[i * 4] = px; d[i * 4 + 1] = px; d[i * 4 + 2] = px; d[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    // fibers
    ctx.globalAlpha = 0.18; ctx.lineWidth = 1; const fr = rng(7);
    for (let i = 0; i < 1500; i++) { const x = fr() * S, y = fr() * S, a = fr() * Math.PI, l = 6 + fr() * 26; ctx.strokeStyle = fr() < 0.5 ? '#ffffff' : '#000000'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke(); }
    ctx.globalAlpha = 1;
    const paper = c.toDataURL('image/jpeg', 0.82);
    // strokes are drawn at the plate's own size so there is no tile seam
    const W = 1536, H = 768; c.width = W; c.height = H;
    // ---- strokes: the dragged marks of a loaded brush, mostly horizontal with drift, ridges of bristle ----
    ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, W, H);
    const sr = rng(23);
    for (let i = 0; i < 900; i++) {
      const x = sr() * W, y = sr() * H, len = 120 + sr() * 420, w = 6 + sr() * 26, ang = (sr() - 0.5) * 0.5 + (sr() < 0.15 ? Math.PI / 2 * (sr() - 0.5) : 0);
      const light = sr() < 0.5; const tone = light ? 255 : 0; const alpha = 0.05 + sr() * 0.11;
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
      // bristle ridges inside the stroke
      const n = Math.max(2, Math.round(w / 3));
      for (let k = 0; k < n; k++) {
        const yy = -w / 2 + (k + 0.5) * (w / n) + (sr() - 0.5) * 1.5; const a2 = alpha * (0.5 + sr());
        ctx.strokeStyle = `rgba(${tone},${tone},${tone},${a2.toFixed(3)})`; ctx.lineWidth = w / n * (0.6 + sr() * 0.7); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-len / 2, yy); const cx1 = -len / 6, cx2 = len / 6; ctx.bezierCurveTo(cx1, yy + (sr() - 0.5) * 6, cx2, yy + (sr() - 0.5) * 6, len / 2, yy + (sr() - 0.5) * 3); ctx.stroke();
      }
      ctx.restore();
    }
    const strokes = c.toDataURL('image/jpeg', 0.8);
    return { paper, strokes };
  });
  for (const [k, v] of Object.entries(results)) fs.writeFileSync(path.join(outDir, `tex-${k}.jpg`), Buffer.from(v.split(',')[1], 'base64'));
  await b.close();
  console.log('ok');
})();
