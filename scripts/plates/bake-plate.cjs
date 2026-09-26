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
//     replaced by an <image> of it in the same place in the stack. It looks
//     inside plain groups (no transform, opacity, filter or mask of their own),
//     so still pieces between moving ones are baked too.
//  2. A mask that is only a white field with black shapes cut from it becomes
//     a clip path, which the browser applies without an offscreen pass; each
//     is checked against its mask by pixels first and kept as a mask if not equal.
//  3. Definitions nothing live uses any more are dropped.
// Then it renders the original and the baked plate at several moments and
// compares them pixel by pixel, and fails if they differ beyond encoding noise.
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
	return { x: x0 / scale, y: y0 / scale, w: o.width / scale, h: o.height / scale, webp: url.slice(url.indexOf(',') + 1) };
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
	fs.mkdirSync(OUT_DIR, { recursive: true });
	const pictures = [];
	for (const r of runs) {
		await p.evaluate(isolateInPage, r.i);
		await p.waitForTimeout(60);
		const png = (await p.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: W, height: H } })).toString('base64');
		const pic = await p.evaluate(cropInPage, { png, scale: SCALE, quality: QUALITY, format: FORMAT });
		const name = `${r.layer.replace(/^layer-/, '')}-${r.i}.${FORMAT}`;
		if (pic) fs.writeFileSync(path.join(OUT_DIR, name), Buffer.from(pic.webp, 'base64'));
		pictures.push(pic ? { i: r.i, name, x: pic.x, y: pic.y, w: pic.w, h: pic.h } : { i: r.i, name: null });
	}
	// Replace each run with its picture, turn masks into clips, prune, serialize.
	await p.evaluate(() => document.querySelectorAll('[data-hidden-by-bake]').forEach((e) => { e.style.display = ''; e.removeAttribute('data-hidden-by-bake'); if (!e.getAttribute('style')) e.removeAttribute('style'); }));
	const clips = await p.evaluate(masksToClipsInPage, { W, H });
	const merged = await p.evaluate(mergeMasksInPage);
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
	const html = await p.evaluate(() => document.querySelector('.live-plate-host').innerHTML);
	const head = `<!-- The ${era} era plate, baked for the site by scripts/plates/bake-plate.cjs from plate.html: every still piece is a picture in live/, only the moving pieces are SVG. Regenerate it after every export; edit art/plates/${era}/, never this file. -->\n`;
	fs.writeFileSync(path.join(PLATES, era, 'live.html'), head + html.trim() + '\n');
	await p.close();
	console.log(`masks to clips: ${clips.map((c) => c[0]).join(', ') || 'none'}; ${merged} masked groups merged into a neighbor; ${pruned} unused definition elements dropped`);

	// Verify: the original and the baked plate, full stack, at several moments.
	const cmp = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: SCALE });
	const A = await open(cmp, 'a', page(frag, '#000', true));
	const B = await open(cmp, 'b', page(head + html, '#000', true));
	let worst = 0;
	for (const t of [0, 0.75, 1.9, 3.35, 6.1, 9.4, 13.3]) {
		const shot = async (q) => { await q.bringToFront(); await q.evaluate((t) => document.querySelectorAll('svg.layer, svg.defs').forEach((s) => s.setCurrentTime(t)), t); await q.waitForTimeout(120); return (await q.screenshot()).toString('base64'); };
		const a = await shot(A), b = await shot(B);
		const d = await A.evaluate(diffInPage, { a, b });
		worst = Math.max(worst, d.bigShare);
		console.log(`  t=${String(t).padEnd(5)} mean diff ${d.mean.toFixed(2)}  pixels off by more than 24: ${(d.bigShare * 100).toFixed(3)}%`);
		if (process.env.SNAP) { fs.writeFileSync(path.join(ROOT, 'untracked', `bake-${era}-${t}-heat.png`), Buffer.from(d.heat, 'base64')); fs.writeFileSync(path.join(ROOT, 'untracked', `bake-${era}-${t}-a.png`), Buffer.from(a, 'base64')); fs.writeFileSync(path.join(ROOT, 'untracked', `bake-${era}-${t}-b.png`), Buffer.from(b, 'base64')); }
	}
	await browser.close();
	const size = fs.readdirSync(OUT_DIR).reduce((a, f) => a + fs.statSync(path.join(OUT_DIR, f)).size, 0);
	console.log(`live.html ${(fs.statSync(path.join(PLATES, era, 'live.html')).size / 1024).toFixed(0)} KB (plate.html ${(frag.length / 1024).toFixed(0)} KB), ${fs.readdirSync(OUT_DIR).length} pictures ${(size / 1024).toFixed(0)} KB`);
	if (worst > 0.002) {
		console.error('FAIL: the baked plate differs from the original');
		process.exit(1);
	}
})();
