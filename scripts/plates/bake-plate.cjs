// Bake a living plate for the site: everything in it that never moves becomes
// a picture, and only the moving pieces stay live SVG.
//
// Measured 2026-09-26 (untracked what-if runs on the Unbirth plate): a plate's
// cost while it plays is the graphics chip redrawing whatever sits in a moving
// layer under each change, filters and masks included, and the main thread
// resampling and repainting thousands of elements. A still layer is already
// cheap to show once drawn; what baking buys is fewer elements to parse, style
// and repaint, and pictures in place of filtered vector work under the motion.
//
// What it does, on the exported plate (apps/web/public/assets/plates/<era>/plate.html):
//  1. Every run of still siblings in a layer (a whole still layer is one run)
//     is drawn alone at twice the plate's size, cropped to what it covers, and
//     replaced by an <image> of it in the same place in the stack. A copy at
//     the plate's own size goes in live/1x/, which the page loads instead on a
//     screen that shows the plate at 1x or less (plateStage.ts). It looks
//     inside plain groups (no transform, opacity, filter or mask of their own),
//     so still pieces between moving ones are baked too.
//  2. A mask that is only a white field with black shapes cut from it becomes
//     a clip path, which the browser applies without an offscreen pass; each
//     is checked against its mask by pixels first and kept as a mask if not equal.
//  3. Definitions nothing live uses any more are dropped.
//  4. Drifting layers (components/plates/plateDrift.ts): a layer made only of
//     rects filled with a pattern that slides one tile along, over and over
//     (the rain), becomes plain boxes, each a still mask picture over a sheet
//     tiled with a picture of one tile, which only slides.
//  5. Culling marks (components/plates/plateCull.ts): every moving piece is
//     stepped through its own loop at the film rate, and the frames in which
//     it shows at all are written on it, so the page keeps it out of the DOM
//     the rest of the time. A piece that always shows is looked inside instead.
// Then it renders the original and the baked plate at several moments and
// compares them pixel by pixel, and fails if they differ beyond encoding noise;
// and it renders the baked plate culled and uncut at many frames of the loop,
// and fails if they differ at all.
//
// usage: node scripts/plates/bake-plate.cjs <era>   (dev server on port 3012, which serves the textures)
// writes apps/web/public/assets/plates/<era>/live.html and live/*.webp; the site plays live.html
const path = require('path');
const fs = require('fs');
const { chromium } = require(require.resolve('playwright-core', { paths: [path.join(__dirname, '..', '..', 'apps/web')] }));

const ROOT = path.join(__dirname, '..', '..');
const BASE = 'http://localhost:3012';
const PLATES = path.join(ROOT, 'apps/web/public/assets/plates');
const SCALE = 2; // baked pictures at twice the plate's own size: sharp on a 2x screen at full width
const FPS = 20; // the film rate the site plays at (FILM_FPS in livePlate.tsx); culling is measured frame by frame at it
const QUALITY = Number(process.env.QUALITY || 0.8); // indistinguishable from 0.9 at 2x on Unbirth's sky, a third smaller
const FORMAT = process.env.FORMAT || 'webp'; // FORMAT=png for a lossless check of the bake itself
const era = process.argv[2];
if (!era) throw new Error('usage: bake-plate.cjs <era>');
const OUT_DIR = path.join(PLATES, era, 'live');
const URL_DIR = `/assets/plates/${era}/live`;

const css = fs.readFileSync(path.join(ROOT, 'apps/web/src/styles/globals.css'), 'utf8');
const plateCss = css.slice(css.indexOf('.live-plate {'), css.indexOf('/* The archive'));
if (!plateCss.includes('.live-plate-host')) throw new Error('plate CSS not found in globals.css');

const frag = fs.readFileSync(path.join(PLATES, era, 'plate.html'), 'utf8');
const [W, H] = frag.match(/viewBox="0 0 (\d+) (\d+)"/).slice(1).map(Number);

// The bake draws with the plate's own grade (the contrast filter on .live-plate) turned off, since the page applies it again over the pictures.
const page = (body, bg = 'transparent', graded = false) =>
	`<!doctype html><html><head><style>html,body{margin:0;background:${bg}}${plateCss}.live-plate{display:block;width:${W}px;height:${H}px${graded ? '' : ';filter:none'}}</style></head><body><span class="live-plate"><div class="live-plate-host">${body}</div></span></body></html>`;

async function open(ctx, name, html) {
	const p = await ctx.newPage();
	const url = `${BASE}/__bake/${name}.html`;
	await p.route(url, (r) => r.fulfill({ contentType: 'text/html', body: html }));
	await p.goto(url, { waitUntil: 'networkidle' });
	await p.evaluate(() => document.querySelectorAll('svg.layer, svg.defs').forEach((s) => { s.pauseAnimations(); s.setCurrentTime(0); }));
	await p.waitForTimeout(300);
	return p;
}

// In the page: which elements move, and the runs of still ones.
function planInPage() {
	const ANIM = 'animate, animateTransform, animateMotion, set';
	const NONRENDER = new Set(['defs', 'title', 'desc', 'metadata', 'clipPath', 'mask', 'pattern', 'linearGradient', 'radialGradient', 'filter', 'symbol', 'marker', 'style', 'script']);
	const byId = {};
	document.querySelectorAll('[id]').forEach((e) => (byId[e.id] = e));
	const refsOf = (el) => {
		const r = [];
		for (const at of el.attributes) {
			(at.value.match(/url\(#([^)]+)\)/g) || []).forEach((x) => r.push(x.slice(5, -1)));
			if (/href$/.test(at.name) && at.value[0] === '#') r.push(at.value.slice(1));
		}
		return r;
	};
	const memo = {};
	const animId = (id, seen = new Set()) => {
		if (id in memo) return memo[id];
		const el = byId[id];
		if (!el || seen.has(id)) return false;
		seen.add(id);
		let v = el.matches(ANIM) || !!el.querySelector(ANIM);
		if (!v) for (const n of [el, ...el.querySelectorAll('*')]) if (refsOf(n).some((r) => animId(r, seen))) { v = true; break; }
		return (memo[id] = v);
	};
	const moves = (el) => el.matches(ANIM) || !!el.querySelector(ANIM) || [el, ...el.querySelectorAll('*')].some((n) => refsOf(n).some((r) => animId(r)));
	const selfMoves = (el) => [...el.children].some((c) => c.matches(ANIM)) || refsOf(el).some((r) => animId(r));
	const plain = (el) => el.tagName === 'g' && !['transform', 'opacity', 'filter', 'mask', 'style', 'class'].some((a) => el.hasAttribute(a)) && !selfMoves(el);
	const runs = [];
	let n = 0;
	const walk = (parent, layer) => {
		let run = null;
		for (const k of [...parent.children]) {
			if (NONRENDER.has(k.tagName) || k.matches(ANIM)) continue;
			if (!moves(k)) {
				if (!run) runs.push((run = { layer, els: [] }));
				k.setAttribute('data-bake', String(runs.length - 1));
				run.els.push(n++);
			} else {
				run = null;
				if (plain(k)) walk(k, layer);
			}
		}
	};
	document.querySelectorAll('svg.layer').forEach((svg) => walk(svg, svg.id));
	// A run of a few plain shapes (a vignette's two gradient rects) is cheaper as vector than as a full-size picture: leave it.
	const HEAVY = /url\(#|href/;
	runs.forEach((r, i) => {
		const els = [...document.querySelectorAll(`[data-bake="${i}"]`)];
		const all = els.flatMap((e) => [e, ...e.querySelectorAll('*')]);
		const heavy = all.some((e) => ['filter', 'mask', 'clip-path', 'href', 'xlink:href'].some((a) => e.hasAttribute(a)) || (/url\(#/.test(e.getAttribute('fill') || '') && document.getElementById((e.getAttribute('fill').match(/#([^)]+)/) || [])[1])?.tagName === 'pattern'));
		if (all.length <= 4 && !heavy) els.forEach((e) => e.removeAttribute('data-bake'));
	});
	return runs.filter((r, i) => document.querySelector(`[data-bake="${i}"]`)).map((r) => runs.indexOf(r)).map((i) => ({ i, layer: runs[i].layer, count: document.querySelectorAll(`[data-bake="${i}"]`).length, els: [...document.querySelectorAll(`[data-bake="${i}"]`)].reduce((a, e) => a + 1 + e.querySelectorAll('*').length, 0) }));
}

// In the page: neighbors under the same mask share one masked group, so the browser makes one offscreen pass for them, not one each.
function mergeMasksInPage() {
	let merged = 0;
	document.querySelectorAll('svg.layer').forEach((svg) => {
		const visit = (parent) => {
			const kids = [...parent.children];
			for (let i = 0; i < kids.length; i++) {
				const k = kids[i];
				const m = k.getAttribute('mask');
				if (!m) continue;
				const group = [k];
				let j = i + 1;
				// skip comments implicitly (children only); stop at the first sibling not under the same mask
				while (j < kids.length && kids[j].getAttribute('mask') === m && kids[j].tagName === 'g' && k.tagName === 'g' && [...kids[j].attributes].every((a) => a.name === 'mask')) group.push(kids[j++]);
				if (group.length > 1 && [...k.attributes].every((a) => a.name === 'mask')) {
					const NS = 'http://www.w3.org/2000/svg';
					const wrap = document.createElementNS(NS, 'g');
					wrap.setAttribute('mask', m);
					k.before(wrap);
					for (const g of group) { g.removeAttribute('mask'); wrap.appendChild(g); }
					merged += group.length - 1;
				}
				i = j - 1;
			}
		};
		visit(svg);
	});
	return merged;
}

// In the page: show only run i (its layer, its pieces and their plain ancestors).
function isolateInPage(i) {
	const NONRENDER = new Set(['defs', 'title', 'desc', 'metadata', 'clipPath', 'mask', 'pattern', 'linearGradient', 'radialGradient', 'filter', 'symbol', 'marker', 'style', 'script']);
	document.querySelectorAll('[data-hidden-by-bake]').forEach((e) => { e.style.display = ''; e.removeAttribute('data-hidden-by-bake'); if (!e.getAttribute('style')) e.removeAttribute('style'); });
	const mine = [...document.querySelectorAll(`[data-bake="${i}"]`)];
	const layer = mine[0].closest('svg.layer');
	const hide = (e) => { e.style.display = 'none'; e.setAttribute('data-hidden-by-bake', ''); };
	document.querySelectorAll('svg.layer, .surface').forEach((l) => { if (l !== layer) hide(l); });
	const keep = (e) => mine.includes(e);
	const walk = (parent) => {
		for (const k of parent.children) {
			if (NONRENDER.has(k.tagName)) continue;
			if (keep(k)) continue;
			if (mine.some((m) => k.contains(m))) walk(k);
			else hide(k);
		}
	};
	walk(layer);
}

// In the page: crop a PNG to what it covers and encode it as WebP.
async function cropInPage({ png, scale, quality, format }) {
	const img = new Image();
	img.src = 'data:image/png;base64,' + png;
	await img.decode();
	const c = document.createElement('canvas');
	c.width = img.width;
	c.height = img.height;
	const g = c.getContext('2d');
	g.drawImage(img, 0, 0);
	const d = g.getImageData(0, 0, c.width, c.height).data;
	let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
	for (let y = 0; y < c.height; y++)
		for (let x = 0; x < c.width; x++) {
			const a = d[(y * c.width + x) * 4 + 3];
			if (a > 1) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
		}
	if (x1 < 0) return null;
	// snap the crop to whole plate units so the picture lands on the same pixels it came from
	const u = (v) => Math.floor(v / scale) * scale;
	x0 = u(x0); y0 = u(y0); x1 = Math.min(c.width, u(x1) + scale); y1 = Math.min(c.height, u(y1) + scale);
	const o = document.createElement('canvas');
	o.width = x1 - x0;
	o.height = y1 - y0;
	o.getContext('2d').drawImage(c, x0, y0, o.width, o.height, 0, 0, o.width, o.height);
	const url = o.toDataURL('image/' + format, quality);
	// the same picture at the plate's own size, for screens that show it at 1x or less
	const h = document.createElement('canvas');
	h.width = Math.round(o.width / scale);
	h.height = Math.round(o.height / scale);
	const hg = h.getContext('2d');
	hg.imageSmoothingQuality = 'high';
	hg.drawImage(o, 0, 0, h.width, h.height);
	const url1 = h.toDataURL('image/' + format, quality);
	return { x: x0 / scale, y: y0 / scale, w: o.width / scale, h: o.height / scale, webp: url.slice(url.indexOf(',') + 1), webp1: url1.slice(url1.indexOf(',') + 1) };
}

// In the page: turn each simple mask into a clip path where the pixels agree. Returns the ids converted.
async function masksToClipsInPage({ W, H }) {
	const NS = 'http://www.w3.org/2000/svg';
	const done = [];
	const users = {};
	document.querySelectorAll('[mask]').forEach((e) => { const m = e.getAttribute('mask').match(/^url\(#([^)]+)\)$/); if (m && !e.hasAttribute('clip-path')) (users[m[1]] = users[m[1]] || []).push(e); });
	const white = (v) => /^(#fff|#ffffff|white)$/i.test(v || '');
	const black = (v) => v == null || /^(#000|#000000|black)$/i.test(v);
	const shapeD = (e) => {
		const n = (a) => Number(e.getAttribute(a) || 0);
		if (e.tagName === 'polygon') return 'M' + e.getAttribute('points').trim().split(/[\s,]+/).reduce((a, v, i) => a + (i % 2 ? ',' : i ? ' L' : '') + v, '') + ' Z';
		if (e.tagName === 'path') return e.getAttribute('d');
		if (e.tagName === 'rect' && !e.hasAttribute('rx')) return `M${n('x')},${n('y')} h${n('width')} v${n('height')} h${-n('width')} Z`;
		if (e.tagName === 'ellipse' || e.tagName === 'circle') { const cx = n('cx'), cy = n('cy'), rx = e.tagName === 'circle' ? n('r') : n('rx'), ry = e.tagName === 'circle' ? n('r') : n('ry'); return `M${cx - rx},${cy} a${rx},${ry} 0 1,0 ${2 * rx},0 a${rx},${ry} 0 1,0 ${-2 * rx},0 Z`; }
		return null;
	};
	const defs = document.querySelector('svg.defs defs') || document.querySelector('svg.defs');
	for (const id of Object.keys(users)) {
		const m = document.getElementById(id);
		if (!m || m.tagName !== 'mask' || m.getAttribute('maskUnits') !== 'userSpaceOnUse') continue;
		const kids = [...m.children];
		const [field, ...holes] = kids;
		if (!field || field.tagName !== 'rect' || !white(field.getAttribute('fill')) || field.hasAttribute('opacity') || field.hasAttribute('transform')) continue;
		const fx = Number(field.getAttribute('x') || 0), fy = Number(field.getAttribute('y') || 0), fw = Number(field.getAttribute('width')), fh = Number(field.getAttribute('height'));
		if (!holes.length || !holes.every((h) => black(h.getAttribute('fill')) && !['opacity', 'fill-opacity', 'filter', 'transform', 'mask', 'clip-path', 'style'].some((a) => h.hasAttribute(a)) && shapeD(h))) continue;
		const d = `M${fx},${fy} h${fw} v${fh} h${-fw} Z ` + holes.map(shapeD).join(' ');
		const clip = document.createElementNS(NS, 'clipPath');
		clip.id = id + '-clip';
		clip.setAttribute('clipPathUnits', 'userSpaceOnUse');
		const pth = document.createElementNS(NS, 'path');
		pth.setAttribute('d', d);
		pth.setAttribute('clip-rule', 'evenodd');
		clip.appendChild(pth);
		defs.appendChild(clip);
		// Check: a white field through the mask and through the clip must match.
		const test = document.createElementNS(NS, 'svg');
		test.setAttribute('viewBox', `0 0 ${W} ${H}`);
		test.setAttribute('width', W);
		test.setAttribute('height', H);
		test.innerHTML = `<rect width="${W}" height="${H}" fill="#fff" mask="url(#${id})"/><rect width="${W}" height="${H}" fill="#fff" clip-path="url(#${id}-clip)"/>`;
		const a = test.children[0], b = test.children[1];
		const draw = async (keep) => {
			b.style.display = keep === b ? '' : 'none';
			a.style.display = keep === a ? '' : 'none';
			const s = new XMLSerializer().serializeToString(test).replace('<svg ', `<svg xmlns="${NS}" `);
			const svgText = s.replace(/url\(#/g, 'url(#');
			// render with the plate's defs inlined, so the mask resolves
			const full = svgText.replace('>', '>' + `<defs>${m.outerHTML}${clip.outerHTML}</defs>`);
			const img = new Image();
			img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(full)));
			await img.decode();
			const c = document.createElement('canvas');
			c.width = W; c.height = H;
			const g = c.getContext('2d');
			g.drawImage(img, 0, 0);
			return g.getImageData(0, 0, W, H).data;
		};
		const da = await draw(a), db = await draw(b);
		let bad = 0;
		for (let i = 3; i < da.length; i += 4) if (Math.abs(da[i] - db[i]) > 40) bad++;
		// edge antialiasing differs a little between the two; a real mismatch is an area
		if (bad > (W + H) * 2) { clip.remove(); continue; }
		for (const e of users[id]) { e.removeAttribute('mask'); e.setAttribute('clip-path', `url(#${id}-clip)`); }
		done.push([id, bad]);
	}
	return done;
}

// In the page: mark each moving piece with the frames of its own loop in which it shows (plateCull.ts).
function cullPlanInPage({ fps }) {
	const ANIM = 'animate, animateTransform, animateMotion, set';
	const NONRENDER = new Set(['defs', 'title', 'desc', 'metadata', 'clipPath', 'mask', 'pattern', 'linearGradient', 'radialGradient', 'filter', 'symbol', 'marker', 'style', 'script']);
	const svgs = [...document.querySelectorAll('svg.layer, svg.defs')];
	const gcd = (a, b) => (b ? gcd(b, a % b) : a);
	// A piece can be culled when all of its motion loops forever from the plate's start, and nothing refers to it.
	const loopOf = (el) => {
		const anims = [...el.querySelectorAll(ANIM)];
		let period = 1;
		for (const a of anims) {
			if (a.getAttribute('repeatCount') !== 'indefinite') return 0;
			const b = a.getAttribute('begin');
			if (b && !/^-?[\d.]+s$/.test(b)) return 0;
			if (b && parseFloat(b) > 0) return 0;
			const d = parseFloat(a.getAttribute('dur'));
			const f = Math.round(d * fps);
			if (!(d > 0) || Math.abs(d * fps - f) > 1e-6) return 0;
			period = (period * f) / gcd(period, f);
		}
		return period <= 60 * fps ? period : 0;
	};
	const candidates = (container) => {
		const out = [];
		for (const c of container.children) {
			if (NONRENDER.has(c.tagName) || c.matches(ANIM)) continue;
			if (!c.querySelector(ANIM) || c.id || c.querySelector('[id]')) continue;
			const period = loopOf(c);
			if (period) out.push({ el: c, period });
		}
		return out;
	};
	const shows = (el) => {
		let o = 1;
		for (let x = el; x && !x.matches('svg.layer'); x = x.parentElement) {
			const cs = getComputedStyle(x);
			if (cs.display === 'none' || cs.visibility === 'hidden') return false;
			o *= parseFloat(cs.opacity);
		}
		return o > 0;
	};
	let marked = 0, frames = 0, shown = 0;
	let todo = [...document.querySelectorAll('svg.layer')].flatMap(candidates);
	for (let depth = 0; depth < 5 && todo.length; depth++) {
		const max = Math.max(...todo.map((c) => c.period));
		todo.forEach((c) => (c.seen = new Uint8Array(c.period)));
		for (let n = 0; n < max; n++) {
			svgs.forEach((s) => s.setCurrentTime(n / fps));
			for (const c of todo) if (n < c.period) c.seen[n] = shows(c.el) ? 1 : 0;
		}
		const next = [];
		for (const c of todo) {
			const on = c.seen.reduce((a, v) => a + v, 0);
			// Always shows: look inside it, unless it is filtered. A filter's region can follow the bounds of
			// everything in it, visible or not, so taking a hidden piece out could move the filter's grid.
			if (on === c.period) { if (!c.el.closest('[filter]')) next.push(...candidates(c.el)); continue; }
			if (on > c.period * 0.9) continue;
			// widen each span by a frame on both sides, then write it as from-to pairs within the loop
			const want = new Uint8Array(c.period);
			for (let n = 0; n < c.period; n++) if (c.seen[n]) for (const d of [-1, 0, 1]) want[(n + d + c.period) % c.period] = 1;
			const spans = [];
			for (let n = 0; n < c.period; n++) if (want[n] && (n === 0 || !want[n - 1])) { let e = n; while (e < c.period && want[e]) e++; spans.push(n + '-' + e); }
			c.el.setAttribute('data-cull', c.period + ':' + spans.join(','));
			marked++;
			frames += c.period;
			shown += want.reduce((a, v) => a + v, 0);
		}
		todo = next;
	}
	svgs.forEach((s) => s.setCurrentTime(0));
	document.querySelector('svg.defs').setAttribute('data-cull-fps', String(fps));
	return { marked, share: frames ? shown / frames : 1 };
}

// In the page: find layers made only of rects filled with a pattern that slides one tile along, over and
// over (the rain), which can become drifting sheets (plateDrift.ts). Returns what each rect needs.
function driftPlanInPage({ W, H }) {
	const ANIM = 'animate, animateTransform, animateMotion, set';
	const NONRENDER = new Set(['defs', 'title', 'desc', 'metadata']);
	const num = (v) => (v == null ? NaN : Number(v));
	const secs = (v) => (v == null || v === '' ? 0 : parseFloat(v));
	const plan = [];
	document.querySelectorAll('svg.layer').forEach((layer) => {
		const kids = [...layer.children].filter((k) => !NONRENDER.has(k.tagName));
		if (!kids.length) return;
		const rects = [];
		for (const r of kids) {
			if (r.tagName !== 'rect') return;
			const allowed = new Set(['x', 'y', 'width', 'height', 'fill', 'mask', 'opacity', 'data-cull']);
			if ([...r.attributes].some((a) => !allowed.has(a.name))) return;
			const pm = (r.getAttribute('fill') || '').match(/^url\(#([^)]+)\)$/);
			const pat = pm && document.getElementById(pm[1]);
			if (!pat || pat.tagName !== 'pattern' || pat.getAttribute('patternUnits') !== 'userSpaceOnUse' || pat.hasAttribute('patternTransform') || pat.hasAttribute('x') || pat.hasAttribute('y')) return;
			const pa = [...pat.children].filter((c) => c.matches(ANIM));
			if (pa.length !== 1 || pat.querySelectorAll(ANIM).length !== 1) return;
			const a = pa[0];
			if (a.tagName !== 'animateTransform' || a.getAttribute('attributeName') !== 'patternTransform' || a.getAttribute('type') !== 'translate' || a.getAttribute('repeatCount') !== 'indefinite' || a.hasAttribute('keyTimes') || (a.getAttribute('calcMode') || 'linear') !== 'linear') return;
			const vals = (a.getAttribute('values') || '').split(';').map((v) => v.trim().split(/[\s,]+/).map(Number));
			const tw = num(pat.getAttribute('width')), th = num(pat.getAttribute('height'));
			if (vals.length !== 2 || vals[0][0] !== 0 || vals[0][1] !== 0) return;
			const [dx, dy] = vals[1];
			if (Math.abs(dx / tw - Math.round(dx / tw)) > 1e-9 || Math.abs(dy / th - Math.round(dy / th)) > 1e-9) return;
			// strength: still, or one linear fade loop
			let fade = null;
			const ra = [...r.children].filter((c) => c.matches(ANIM));
			if (r.querySelectorAll(ANIM).length !== ra.length || ra.length > 1) return;
			if (ra.length === 1) {
				const f = ra[0];
				if (f.tagName !== 'animate' || f.getAttribute('attributeName') !== 'opacity' || f.getAttribute('repeatCount') !== 'indefinite' || (f.getAttribute('calcMode') || 'linear') !== 'linear') return;
				const values = f.getAttribute('values').split(';').map(Number);
				const times = f.hasAttribute('keyTimes') ? f.getAttribute('keyTimes').split(';').map(Number) : values.map((_, i) => i / (values.length - 1));
				fade = [secs(f.getAttribute('dur')), secs(f.getAttribute('begin')), values.join(','), times.join(',')].join(';');
			}
			const mm = (r.getAttribute('mask') || '').match(/^url\(#([^)]+)\)$/);
			if (r.hasAttribute('mask') && !mm) return;
			rects.push({ x: num(r.getAttribute('x') || 0), y: num(r.getAttribute('y') || 0), w: num(r.getAttribute('width')), h: num(r.getAttribute('height')), opacity: r.hasAttribute('opacity') ? num(r.getAttribute('opacity')) : 1, fade, mask: mm ? mm[1] : null, pattern: pat.id, tw, th, dx, dy, dur: secs(a.getAttribute('dur')), begin: secs(a.getAttribute('begin')) });
		}
		layer.setAttribute('data-drift-layer', String(plan.length));
		plan.push({ layer: layer.id, rects });
	});
	return plan;
}

// In the page: show only a temporary picture of one tile of a pattern (made still), or of a mask over a box.
function stageInPage({ kind, id, x, y, w, h }) {
	document.querySelectorAll('svg.layer, .surface, .plate-drift').forEach((l) => { l.style.display = 'none'; l.setAttribute('data-hidden-by-bake', ''); });
	document.getElementById('bake-stage')?.remove();
	const NS = 'http://www.w3.org/2000/svg';
	const svg = document.createElementNS(NS, 'svg');
	svg.id = 'bake-stage';
	svg.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
	svg.setAttribute('width', w);
	svg.setAttribute('height', h);
	svg.style.cssText = 'position:fixed;left:0;top:0;overflow:hidden';
	if (kind === 'tile') {
		const still = document.getElementById(id).cloneNode(true);
		still.id = 'bake-still';
		still.querySelectorAll('animate, animateTransform, animateMotion, set').forEach((a) => a.remove());
		// a clone can carry the running slide with it (seen: the tile came out a third of a tile along); pin it at rest
		still.setAttribute('patternTransform', 'translate(0 0)');
		svg.innerHTML = '<defs></defs>';
		svg.firstChild.appendChild(still);
		svg.insertAdjacentHTML('beforeend', `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#bake-still)"/>`);
	} else svg.innerHTML = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff" mask="url(#${id})"/>`;
	document.body.appendChild(svg);
}

// In the page: encode a PNG screenshot as WebP, at its size and, if asked, at half.
async function encodeInPage({ png, w, h, quality, format, half }) {
	const img = new Image();
	img.src = 'data:image/png;base64,' + png;
	await img.decode();
	const out = [];
	for (const k of half ? [1, 0.5] : [1]) {
		const c = document.createElement('canvas');
		c.width = Math.round(w * k);
		c.height = Math.round(h * k);
		const g = c.getContext('2d');
		g.imageSmoothingQuality = 'high';
		g.drawImage(img, 0, 0, img.width, img.height, 0, 0, c.width, c.height);
		const u = c.toDataURL('image/' + format, quality);
		out.push(u.slice(u.indexOf(',') + 1));
	}
	return out;
}

// In the page: replace each drifting layer with its boxes.
function driftBuildInPage({ plan, W, H, URL_DIR }) {
	document.getElementById('bake-stage')?.remove();
	document.querySelectorAll('[data-hidden-by-bake]').forEach((e) => { e.style.display = ''; e.removeAttribute('data-hidden-by-bake'); if (!e.getAttribute('style')) e.removeAttribute('style'); });
	const pc = (v) => +(v * 100).toFixed(4) + '%';
	for (const [li, L] of plan.entries()) {
		const layer = document.querySelector(`[data-drift-layer="${li}"]`);
		const div = document.createElement('div');
		div.className = 'plate-drift';
		div.id = layer.id;
		div.setAttribute('aria-hidden', 'true');
		const box = document.createElement('div');
		box.className = 'plate-drift-box';
		box.style.setProperty('--plate-ar', String(W / H));
		div.appendChild(box);
		for (const r of L.rects) {
			const rect = document.createElement('div');
			rect.className = 'plate-drift-rect';
			rect.style.cssText += `left:${pc(r.x / W)};top:${pc(r.y / H)};width:${pc(r.w / W)};height:${pc(r.h / H)};`;
			if (r.fade) rect.setAttribute('data-fade', r.fade);
			else if (r.opacity !== 1) rect.style.opacity = String(r.opacity);
			if (r.maskFile) rect.style.cssText += `-webkit-mask-image:url(${URL_DIR}/${r.maskFile});mask-image:url(${URL_DIR}/${r.maskFile});`;
			// the sheet: whole tiles on the pattern's own grid, one loop's slide spare on each side
			const mx = Math.ceil(Math.abs(r.dx) / r.tw) * r.tw, my = Math.ceil(Math.abs(r.dy) / r.th) * r.th;
			const sl = Math.floor(r.x / r.tw) * r.tw - mx, st = Math.floor(r.y / r.th) * r.th - my;
			const sw = r.x + r.w + mx - sl, sh = r.y + r.h + my - st;
			const sheet = document.createElement('div');
			sheet.className = 'plate-drift-sheet';
			sheet.style.cssText = `left:${pc((sl - r.x) / r.w)};top:${pc((st - r.y) / r.h)};width:${pc(sw / r.w)};height:${pc(sh / r.h)};background-image:url(${URL_DIR}/${r.tileFile});background-size:${pc(r.tw / sw)} ${pc(r.th / sh)};`;
			sheet.setAttribute('data-drift', [r.dur, r.begin, +((r.dx / sw) * 100).toFixed(5), +((r.dy / sh) * 100).toFixed(5)].join(';'));
			rect.appendChild(sheet);
			box.appendChild(rect);
		}
		layer.replaceWith(div);
	}
}

// In the page: drop definitions nothing rendered refers to any more.
function pruneDefsInPage() {
	const defsSvg = document.querySelector('svg.defs');
	const byId = {};
	defsSvg.querySelectorAll('[id]').forEach((e) => (byId[e.id] = e));
	const used = new Set();
	const scan = (el) => {
		for (const n of [el, ...el.querySelectorAll('*')])
			for (const at of n.attributes) {
				const ids = (at.value.match(/url\(#([^)]+)\)/g) || []).map((x) => x.slice(5, -1));
				if (/href$/.test(at.name) && at.value[0] === '#') ids.push(at.value.slice(1));
				for (const id of ids) if (byId[id] && !used.has(id)) { used.add(id); scan(byId[id]); }
			}
	};
	document.querySelectorAll('svg.layer').forEach(scan);
	let dropped = 0;
	const container = defsSvg.querySelector('defs') || defsSvg;
	for (const k of [...container.children]) if (k.id && !used.has(k.id) && !k.querySelector('[id]')) { dropped += 1 + k.querySelectorAll('*').length; k.remove(); }
	return dropped;
}

// In the page: pixel difference between two screenshots.
async function diffInPage({ a, b }) {
	const load = async (s) => { const i = new Image(); i.src = 'data:image/png;base64,' + s; await i.decode(); const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const g = c.getContext('2d'); g.drawImage(i, 0, 0); return g.getImageData(0, 0, c.width, c.height).data; };
	const da = await load(a), db = await load(b);
	let sum = 0, big = 0;
	for (let i = 0; i < da.length; i += 4) {
		const d = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2]));
		sum += d;
		if (d > 24) big++;
	}
	const px = da.length / 4;
	// a heat map of where they differ, for a person to look at
	const c = document.createElement('canvas');
	const i0 = new Image();
	i0.src = 'data:image/png;base64,' + a;
	await i0.decode();
	c.width = i0.width;
	c.height = i0.height;
	const g = c.getContext('2d');
	const out = g.createImageData(c.width, c.height);
	for (let i = 0; i < da.length; i += 4) {
		const d = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2]));
		out.data[i] = Math.min(255, d * 8);
		out.data[i + 1] = da[i + 1] / 3;
		out.data[i + 2] = da[i + 2] / 3;
		out.data[i + 3] = 255;
	}
	g.putImageData(out, 0, 0);
	const heat = c.toDataURL('image/png');
	return { mean: sum / px, bigShare: big / px, heat: heat.slice(heat.indexOf(',') + 1) };
}

(async () => {
	const browser = await chromium.launch({ channel: 'chrome', args: ['--force-color-profile=srgb'] });
	const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: SCALE });
	const p = await open(ctx, 'plan', page(frag));
	const runs = await p.evaluate(planInPage);
	console.log(`${era}: ${runs.length} still runs, ${runs.reduce((a, r) => a + r.els, 0)} elements to bake`);
	fs.rmSync(OUT_DIR, { recursive: true, force: true });
	fs.mkdirSync(path.join(OUT_DIR, '1x'), { recursive: true });
	const pictures = [];
	for (const r of runs) {
		await p.evaluate(isolateInPage, r.i);
		await p.waitForTimeout(60);
		const png = (await p.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: W, height: H } })).toString('base64');
		const pic = await p.evaluate(cropInPage, { png, scale: SCALE, quality: QUALITY, format: FORMAT });
		const name = `${r.layer.replace(/^layer-/, '')}-${r.i}.${FORMAT}`;
		if (pic) {
			fs.writeFileSync(path.join(OUT_DIR, name), Buffer.from(pic.webp, 'base64'));
			fs.writeFileSync(path.join(OUT_DIR, '1x', name), Buffer.from(pic.webp1, 'base64'));
		}
		pictures.push(pic ? { i: r.i, name, x: pic.x, y: pic.y, w: pic.w, h: pic.h } : { i: r.i, name: null });
	}
	// Replace each run with its picture, turn masks into clips, prune, serialize.
	await p.evaluate(() => document.querySelectorAll('[data-hidden-by-bake]').forEach((e) => { e.style.display = ''; e.removeAttribute('data-hidden-by-bake'); if (!e.getAttribute('style')) e.removeAttribute('style'); }));
	const clips = await p.evaluate(masksToClipsInPage, { W, H });
	const merged = await p.evaluate(mergeMasksInPage);
	// Drifting layers: a picture of each pattern's tile and of each mask, then boxes in place of the layer.
	const drift = await p.evaluate(driftPlanInPage, { W, H });
	const tiles = {};
	let masks = 0;
	for (const L of drift)
		for (const [ri, r] of L.rects.entries()) {
			if (!tiles[r.pattern]) {
				await p.evaluate(stageInPage, { kind: 'tile', id: r.pattern, x: 0, y: 0, w: r.tw, h: r.th });
				const png = (await p.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: r.tw, height: r.th } })).toString('base64');
				const [two, one] = await p.evaluate(encodeInPage, { png, w: r.tw * SCALE, h: r.th * SCALE, quality: QUALITY, format: FORMAT, half: true });
				tiles[r.pattern] = `tile-${r.pattern}.${FORMAT}`;
				fs.writeFileSync(path.join(OUT_DIR, tiles[r.pattern]), Buffer.from(two, 'base64'));
				fs.writeFileSync(path.join(OUT_DIR, '1x', tiles[r.pattern]), Buffer.from(one, 'base64'));
			}
			r.tileFile = tiles[r.pattern];
			if (r.mask) {
				// masks are soft light falloffs: the plate's own size is plenty, on 2x screens too
				await p.evaluate(stageInPage, { kind: 'mask', id: r.mask, x: r.x, y: r.y, w: r.w, h: r.h });
				const png = (await p.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: r.w, height: r.h } })).toString('base64');
				const [one] = await p.evaluate(encodeInPage, { png, w: r.w, h: r.h, quality: QUALITY, format: FORMAT, half: false });
				r.maskFile = `mask-${L.layer.replace(/^layer-/, '')}-${ri}.${FORMAT}`;
				fs.writeFileSync(path.join(OUT_DIR, r.maskFile), Buffer.from(one, 'base64'));
				fs.writeFileSync(path.join(OUT_DIR, '1x', r.maskFile), Buffer.from(one, 'base64'));
				masks++;
			}
		}
	await p.evaluate(driftBuildInPage, { plan: drift, W, H, URL_DIR });
	console.log(`drifting layers: ${drift.map((L) => `${L.layer} (${L.rects.length} sheets)`).join(', ') || 'none'}; ${Object.keys(tiles).length} tiles, ${masks} masks`);
	await p.evaluate(({ pictures, URL_DIR }) => {
		document.querySelectorAll('[data-hidden-by-bake]').forEach((e) => { e.style.display = ''; e.removeAttribute('data-hidden-by-bake'); if (!e.getAttribute('style')) e.removeAttribute('style'); });
		const NS = 'http://www.w3.org/2000/svg';
		for (const pic of pictures) {
			const els = [...document.querySelectorAll(`[data-bake="${pic.i}"]`)];
			if (pic.name) {
				const img = document.createElementNS(NS, 'image');
				img.setAttribute('href', `${URL_DIR}/${pic.name}`);
				for (const [k, v] of [['x', pic.x], ['y', pic.y], ['width', pic.w], ['height', pic.h]]) img.setAttribute(k, String(v));
				img.setAttribute('preserveAspectRatio', 'none');
				els[0].before(img);
			}
			els.forEach((e) => e.remove());
		}
		document.querySelectorAll('[data-bake]').forEach((e) => e.removeAttribute('data-bake'));
	}, { pictures, URL_DIR });
	const pruned = await p.evaluate(pruneDefsInPage);
	const culled = await p.evaluate(cullPlanInPage, { fps: FPS });
	console.log(`culling: ${culled.marked} moving pieces marked, in the page ${(culled.share * 100).toFixed(0)}% of the time on average`);
	await p.evaluate(() => { const w = document.createTreeWalker(document.querySelector('.live-plate-host'), NodeFilter.SHOW_COMMENT); const dead = []; while (w.nextNode()) dead.push(w.currentNode); dead.forEach((c) => c.remove()); });
	const html = await p.evaluate(() => document.querySelector('.live-plate-host').innerHTML);
	const head = `<!-- The ${era} era plate, baked for the site by scripts/plates/bake-plate.cjs from plate.html: every still piece is a picture in live/, only the moving pieces are SVG. Regenerate it after every export; edit art/plates/${era}/, never this file. -->\n`;
	fs.writeFileSync(path.join(PLATES, era, 'live.html'), head + html.trim() + '\n');
	await p.close();
	console.log(`masks to clips: ${clips.map((c) => c[0]).join(', ') || 'none'}; ${merged} masked groups merged into a neighbor; ${pruned} unused definition elements dropped`);

	// Verify: the original and the baked plate, full stack, at several moments.
	const cmp = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: SCALE });
	const A = await open(cmp, 'a', page(frag, '#000', true));
	const B = await open(cmp, 'b', page(head + html, '#000', true));
	const C = await open(cmp, 'c', page(head + html, '#000', true));
	// Number the marked pieces the same way in both, before any is taken out.
	for (const q of [B, C]) await q.evaluate(() => document.querySelectorAll('[data-cull]').forEach((e, i) => e.setAttribute('data-ci', String(i))));
	// The page's own culling code, bundled, in the baked page B (C stays uncut).
	const { transformSync } = require(require.resolve('esbuild', { paths: [path.join(ROOT, 'apps/web')] }));
	const bundle = (file, name) => transformSync(fs.readFileSync(path.join(ROOT, 'apps/web/src/components/plates', file), 'utf8'), { loader: 'ts', format: 'iife', globalName: name }).code;
	const cullJs = bundle('plateCull.ts', 'PlateCull');
	const driftJs = bundle('plateDrift.ts', 'PlateDrift') + ';window.__drift = PlateDrift.prepareDrift(document.querySelector(".live-plate-host"));';
	await B.addScriptTag({ content: cullJs + (process.env.NOCULL ? '' : ';window.__cull = PlateCull.prepareCull(document.querySelector(".live-plate-host"));') + driftJs });
	await C.addScriptTag({ content: driftJs });
	const shot = async (q, t) => {
		await q.bringToFront();
		await q.evaluate((t) => { if (window.__cull) PlateCull.cullAt(window.__cull, t); if (window.__drift) PlateDrift.driftAt(window.__drift, t); document.querySelectorAll('svg.layer, svg.defs').forEach((s) => s.setCurrentTime(t)); }, t);
		await q.waitForTimeout(120);
		return (await q.screenshot()).toString('base64');
	};
	let worst = 0;
	for (const t of [0, 0.75, 1.9, 3.35, 6.1, 9.4, 13.3]) {
		const a = await shot(A, t), b = await shot(B, t);
		const d = await A.evaluate(diffInPage, { a, b });
		worst = Math.max(worst, d.bigShare);
		console.log(`  t=${String(t).padEnd(5)} mean diff ${d.mean.toFixed(2)}  pixels off by more than 24: ${(d.bigShare * 100).toFixed(3)}%`);
		if (process.env.SNAP) { fs.writeFileSync(path.join(ROOT, 'untracked', `bake-${era}-${t}-heat.png`), Buffer.from(d.heat, 'base64')); fs.writeFileSync(path.join(ROOT, 'untracked', `bake-${era}-${t}-a.png`), Buffer.from(a, 'base64')); fs.writeFileSync(path.join(ROOT, 'untracked', `bake-${era}-${t}-b.png`), Buffer.from(b, 'base64')); }
	}
	// Culling must change nothing. Two checks, frame by frame across the loop, the baked plate culled (B)
	// against uncut (C). First the state of every piece in the page: its opacity, where it is and its
	// extent must be the same in both, so a piece put back is at the right moment of its motion. Then the
	// pixels. These can differ a little at shape edges: taking pieces out changes how many shapes a tile
	// of a layer holds, and the browser picks its edge smoothing by that, so the pixel check only fails
	// on more than edge noise.
	const fingerprint = (q) => q.evaluate(() => [...document.querySelectorAll('[data-cull]')].filter((e) => e.isConnected).map((e) => {
		const all = [e, ...e.querySelectorAll('*')].filter((x) => typeof x.getBBox === 'function' && !['animate', 'animateTransform', 'animateMotion', 'set'].includes(x.tagName));
		return all.map((x) => { const b = x.getBBox(), m = x.getCTM() || { a: 0, b: 0, c: 0, d: 0, e: 0, f: 0 }; return [getComputedStyle(x).opacity, b.x, b.y, b.width, b.height, m.a, m.b, m.c, m.d, m.e, m.f].map((v) => Math.round(Number(v) * 100) / 100).join(','); }).join(';');
	}));
	let cullWorst = 0;
	let stateBad = 0;
	const frames = process.env.FRAMES ? process.env.FRAMES.split(',').map(Number) : Array.from({ length: 36 }, (_, i) => Math.round(i * 13.37 * FPS) / FPS % 60);
	for (const t of frames) {
		const b = await shot(B, t), c = await shot(C, t);
		const fb = await fingerprint(B);
		// the same pieces, looked up in the uncut page by their order among the marked ones
		const pairs = await B.evaluate(() => [...document.querySelectorAll('[data-cull]')].map((e) => e.getAttribute('data-ci')));
		const fcs = await C.evaluate((idx) => {
			return idx.map((i) => {
				const e = document.querySelector(`[data-ci="${i}"]`);
				const all = [e, ...e.querySelectorAll('*')].filter((x) => typeof x.getBBox === 'function' && !['animate', 'animateTransform', 'animateMotion', 'set'].includes(x.tagName));
				return all.map((x) => { const b = x.getBBox(), m = x.getCTM() || { a: 0, b: 0, c: 0, d: 0, e: 0, f: 0 }; return [getComputedStyle(x).opacity, b.x, b.y, b.width, b.height, m.a, m.b, m.c, m.d, m.e, m.f].map((v) => Math.round(Number(v) * 100) / 100).join(','); }).join(';');
			});
		}, pairs);
		fb.forEach((v, i) => { if (v !== fcs[i]) { stateBad++; if (stateBad < 4) console.log(`  a piece put back differs at t=${t}: ${v.slice(0, 80)} vs ${fcs[i].slice(0, 80)}`); } });
		const d = await B.evaluate(diffInPage, { a: b, b: c });
		if (d.bigShare > cullWorst) cullWorst = d.bigShare;
		if (d.bigShare > 0.00005 && process.env.SNAP) fs.writeFileSync(path.join(ROOT, 'untracked', `cull-${era}-${t.toFixed(2)}-heat.png`), Buffer.from(d.heat, 'base64'));
	}
	const inPage = await B.evaluate(() => (window.__cull ? window.__cull.entries.filter((e) => e.on).length + '/' + window.__cull.entries.length : 'none'));
	console.log(`culled vs uncut over ${frames.length} frames: ${stateBad} pieces in a different state; pixels off by more than 24 at worst ${(cullWorst * 100).toFixed(4)}% (pieces in the page at the last frame: ${inPage})`);
	await browser.close();
	const kb = (dir) => (fs.readdirSync(dir).filter((f) => f.endsWith('.' + FORMAT)).reduce((a, f) => a + fs.statSync(path.join(dir, f)).size, 0) / 1024).toFixed(0);
	console.log(`live.html ${(fs.statSync(path.join(PLATES, era, 'live.html')).size / 1024).toFixed(0)} KB (plate.html ${(frag.length / 1024).toFixed(0)} KB); pictures ${kb(OUT_DIR)} KB at 2x, ${kb(path.join(OUT_DIR, '1x'))} KB at 1x`);
	if (stateBad || cullWorst > 0.0001) {
		console.error('FAIL: culling changes the picture');
		process.exit(1);
	}
	if (worst > 0.002) {
		console.error('FAIL: the baked plate differs from the original');
		process.exit(1);
	}
})();
