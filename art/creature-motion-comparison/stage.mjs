/** The shared Floria canopy stage and secretion cue used by both review pages. */

export const ORIGIN_X = 192;
export const ORIGIN_Y = 314;

export function stage(ctx, light) {
  const sky = ctx.createLinearGradient(0, 0, 0, 384);
  if (light) { sky.addColorStop(0, '#d9e9d5'); sky.addColorStop(1, '#8ab7a1'); }
  else { sky.addColorStop(0, '#223d43'); sky.addColorStop(1, '#183139'); }
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 384, 384);
  ctx.fillStyle = light ? '#9bbf91' : '#315c57';
  for (let i = 0; i < 11; i++) {
    const x = 24 + i * 43;
    const y = 46 + (i % 3) * 19;
    ctx.beginPath(); ctx.ellipse(x, y, 50, 14, -.4 + (i % 2) * .8, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = light ? '#5e7963' : '#32534e';
  ctx.beginPath(); ctx.moveTo(0, 327); ctx.bezierCurveTo(100, 311, 220, 318, 384, 303); ctx.lineTo(384, 350); ctx.lineTo(0, 359); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = light ? '#415d48' : '#486d5a';
  ctx.lineWidth = 9; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(15, 322); ctx.bezierCurveTo(120, 301, 265, 314, 383, 292); ctx.stroke();
  ctx.strokeStyle = light ? '#849f6f' : '#7a9c75'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(12, 319); ctx.bezierCurveTo(120, 300, 260, 311, 380, 290); ctx.stroke();
}

/**
 * Draws the secretion cue for the action clip at time t (ms). The cue starts a
 * little before each atlas's own bloom_open marker, so a variant with different
 * timing keeps its secretion at its own peak. It is a visual cue only.
 */
export function effect(ctx, manifest, t) {
  const marker = manifest.clips.action.markers.find((entry) => entry.name === 'bloom_open');
  const start = (marker ? marker.time_ms : 600) - 30;
  const end = start + 400;
  if (t < start || t > end) return;
  const strength = Math.min(1, (t - start) / 110, (end - t) / 170);
  const [ex, ey] = manifest.emitter;
  const x = ORIGIN_X + ex - manifest.origin[0];
  const y = ORIGIN_Y + ey - manifest.origin[1];
  ctx.save(); ctx.globalAlpha = Math.max(.05, strength * .85);
  for (let i = 0; i < 4; i++) {
    const travel = (t - start) * (.12 + i * .02);
    const dx = travel + i * 9;
    const dy = Math.sin(i * 2) * 9 + travel * .2;
    ctx.fillStyle = i % 2 ? '#fff2ba' : '#d0eb9b';
    ctx.beginPath(); ctx.ellipse(x + dx, y + dy, 4 + i, 2.5 + i * .3, .35, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/** A Drainov acid-swamp stage for the Bioflim study, same anchor line as the canopy. */
export function swamp(ctx, light) {
  const sky = ctx.createLinearGradient(0, 0, 0, 384);
  if (light) { sky.addColorStop(0, '#d8dcc0'); sky.addColorStop(1, '#9aa27a'); }
  else { sky.addColorStop(0, '#2b3324'); sky.addColorStop(1, '#1b2418'); }
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 384, 384);
  ctx.fillStyle = light ? '#8f9a6d' : '#3a4630';
  for (let i = 0; i < 4; i++) {
    const x = 30 + i * 100;
    ctx.fillRect(x, 60 + (i % 2) * 30, 26, 260);
    ctx.fillRect(x - 10, 50 + (i % 2) * 30, 46, 14);
  }
  ctx.fillStyle = light ? '#7d8a55' : '#2f3b27';
  ctx.beginPath(); ctx.moveTo(0, 322); ctx.bezierCurveTo(100, 312, 260, 318, 384, 308); ctx.lineTo(384, 384); ctx.lineTo(0, 384); ctx.closePath(); ctx.fill();
  ctx.fillStyle = light ? '#b9c957' : '#6f8a1f';
  ctx.globalAlpha = .55;
  for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse(40 + i * 62, 340 + (i % 3) * 9, 34, 7, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = light ? '#5f6b3e' : '#556a33'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, 316); ctx.bezierCurveTo(120, 308, 260, 314, 384, 304); ctx.stroke();
}

/** Acid drips from the emitter after the atlas's reach_peak marker. A visual cue only. */
export function drip(ctx, manifest, t) {
  const marker = manifest.clips.action.markers.find((entry) => entry.name === 'reach_peak');
  const start = (marker ? marker.time_ms : 500) + 40;
  const end = start + 420;
  if (t < start || t > end) return;
  const [ex, ey] = manifest.emitter;
  const x = ORIGIN_X + ex - manifest.origin[0];
  const y = ORIGIN_Y + ey - manifest.origin[1];
  ctx.save();
  for (let i = 0; i < 3; i++) {
    const u = ((t - start) / 420 + i * .33) % 1;
    const fall = u * u * 120;
    ctx.globalAlpha = Math.max(0, .9 - u * .5);
    ctx.fillStyle = i % 2 ? '#d8ec5a' : '#b4cf3a';
    ctx.beginPath(); ctx.ellipse(x + 6 - i * 5, y + 8 + fall, 3, 5 + u * 4, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/** A Magmuth ash-field stage for the Dromeus study: cooled lava flats under a sour sky. */
export function ashfield(ctx, light) {
  const sky = ctx.createLinearGradient(0, 0, 0, 384);
  if (light) { sky.addColorStop(0, '#e8d6c2'); sky.addColorStop(1, '#b08a72'); }
  else { sky.addColorStop(0, '#2e1f1f'); sky.addColorStop(1, '#4a2a22'); }
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 384, 384);
  ctx.fillStyle = light ? '#c9a488' : '#3a2523';
  for (let i = 0; i < 5; i++) {
    ctx.beginPath(); ctx.moveTo(-20 + i * 95, 250); ctx.lineTo(20 + i * 95, 150 + (i % 2) * 40); ctx.lineTo(70 + i * 95, 250); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = light ? '#8d6f60' : '#241716';
  ctx.beginPath(); ctx.moveTo(0, 322); ctx.bezierCurveTo(100, 312, 260, 318, 384, 308); ctx.lineTo(384, 384); ctx.lineTo(0, 384); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = light ? '#e07a3a' : '#c8501f'; ctx.lineWidth = 2; ctx.globalAlpha = .7;
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(20 + i * 90, 340 + (i % 2) * 14); ctx.lineTo(70 + i * 90, 348 + (i % 3) * 6); ctx.stroke(); }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = light ? '#6a4a3e' : '#5a3a30'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, 316); ctx.bezierCurveTo(120, 308, 260, 314, 384, 304); ctx.stroke();
}

/** Ember flecks at the bite point after the atlas's bite marker. A visual cue only. */
export function embers(ctx, manifest, t) {
  const marker = manifest.clips.action.markers.find((entry) => entry.name === 'bite');
  const start = (marker ? marker.time_ms : 583) - 20;
  const end = start + 320;
  if (t < start || t > end) return;
  const [ex, ey] = manifest.emitter;
  const x = ORIGIN_X + ex - manifest.origin[0];
  const y = ORIGIN_Y + ey - manifest.origin[1];
  ctx.save();
  for (let i = 0; i < 6; i++) {
    const u = (t - start) / 320;
    const angle = -.6 + i * .5;
    const r = 6 + u * (30 + i * 6);
    ctx.globalAlpha = Math.max(0, 1 - u * 1.1);
    ctx.fillStyle = i % 2 ? '#ffd27a' : '#ff7a3a';
    ctx.beginPath(); ctx.ellipse(x + Math.cos(angle) * r, y + Math.sin(angle) * r - u * 12, 2.5, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/** A Krystos tundra stage for the Akinza study: night snow under a cold sky. */
export function tundra(ctx, light) {
  const sky = ctx.createLinearGradient(0, 0, 0, 384);
  if (light) { sky.addColorStop(0, '#dfe9f2'); sky.addColorStop(1, '#a9bccd'); }
  else { sky.addColorStop(0, '#0f1a2a'); sky.addColorStop(1, '#22364d'); }
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 384, 384);
  ctx.fillStyle = light ? '#c3d2df' : '#1a2a3c';
  ctx.beginPath(); ctx.moveTo(0, 240); ctx.lineTo(70, 170); ctx.lineTo(130, 230); ctx.lineTo(210, 150); ctx.lineTo(290, 235); ctx.lineTo(350, 190); ctx.lineTo(384, 240); ctx.lineTo(384, 300); ctx.lineTo(0, 300); ctx.closePath(); ctx.fill();
  ctx.fillStyle = light ? '#eef3f7' : '#334a63';
  ctx.beginPath(); ctx.moveTo(0, 322); ctx.bezierCurveTo(100, 312, 260, 318, 384, 308); ctx.lineTo(384, 384); ctx.lineTo(0, 384); ctx.closePath(); ctx.fill();
  ctx.fillStyle = light ? '#ffffff' : '#8fb0d0'; ctx.globalAlpha = .5;
  for (let i = 0; i < 14; i++) { ctx.beginPath(); ctx.arc(20 + i * 27, 40 + (i * 53) % 190, 1.4, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = light ? '#b7c7d6' : '#a8c4de'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, 316); ctx.bezierCurveTo(120, 308, 260, 314, 384, 304); ctx.stroke();
}

/** Frost trails off the claws after the atlas's contact_pose marker. A visual cue only. */
export function frost(ctx, manifest, t) {
  const marker = manifest.clips.action.markers.find((entry) => entry.name === 'contact_pose');
  const start = (marker ? marker.time_ms : 583) - 20;
  const end = start + 300;
  if (t < start || t > end) return;
  const [ex, ey] = manifest.emitter;
  const x = ORIGIN_X + ex - manifest.origin[0];
  const y = ORIGIN_Y + ey - manifest.origin[1];
  const u = (t - start) / 300;
  ctx.save();
  ctx.strokeStyle = '#dff4ff'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    ctx.globalAlpha = Math.max(0, .9 - u);
    const a = -.9 + i * .45;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * (18 + u * 26), y + Math.sin(a) * (18 + u * 26) + i * 6); ctx.stroke();
  }
  ctx.restore();
}
