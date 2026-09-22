#!/usr/bin/env node
/**
 * Responsive audit harness.
 *
 *   node scripts/design/responsive-audit.js [--base http://localhost:3000]
 *       [--out untracked/responsive] [--shots] [route ...]
 *
 * snap.js answers "does the page paint at phone and desktop". This answers
 * the narrower question a breakpoint pass actually needs: at every width
 * across the token breakpoints (520/720/1000/1440), does anything overflow
 * its own container, clip its text, sit off-canvas, collide, or present a
 * tap target too small to hit with a thumb.
 *
 * Widths straddle each breakpoint deliberately -- a layout that is correct
 * at 390 and 1440 routinely breaks at 719 or 1001, where a grid has gained
 * a column but not the room for it.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require(require.resolve('playwright-core', { paths: [path.join(__dirname, '..', '..', 'apps/web')] }));

const MIME = {
	'.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
	'.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
	'.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
	'.webp': 'image/webp', '.woff': 'font/woff', '.woff2': 'font/woff2',
	'.ico': 'image/x-icon', '.txt': 'text/plain', '.md': 'text/markdown',
};

// Static SPA server over a production build: unknown paths fall back to
// index.html so client-side routes resolve the way they do in the browser.
function serve(rootDir, port) {
	const server = http.createServer((req, res) => {
		const url = decodeURIComponent(req.url.split('?')[0]);
		let file = path.join(rootDir, url);
		if (!file.startsWith(rootDir)) { res.writeHead(403); return res.end(); }
		if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(rootDir, 'index.html');
		fs.readFile(file, (err, buf) => {
			if (err) { res.writeHead(404); return res.end('not found'); }
			res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
			res.end(buf);
		});
	});
	return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : dflt; };
const flag = (name) => { const i = args.indexOf(name); if (i >= 0) { args.splice(i, 1); return true; } return false; };
const base = opt('--base', 'http://localhost:3000');
const out = opt('--out', 'untracked/responsive');
const shots = flag('--shots');
// --serve <dir>: host this build ourselves rather than trusting an external
// dev server to stay alive for the length of the run.
const serveDir = opt('--serve', null);
// --widths 320,1024 restricts the ladder (a sweep over every record), and
// --routes-file reads routes one per line (more than a command line holds).
const onlyWidths = opt('--widths', null);
const routesFile = opt('--routes-file', null);

// Straddle every token breakpoint: below, at, and above.
const WIDTHS = [
	{ w: 320, h: 780, tag: '320-small-phone', mobile: true },
	{ w: 390, h: 844, tag: '390-phone', mobile: true },
	{ w: 519, h: 900, tag: '519-pre-sm', mobile: true },
	{ w: 520, h: 900, tag: '520-sm', mobile: true },
	{ w: 719, h: 1000, tag: '719-pre-md', mobile: true },
	{ w: 768, h: 1024, tag: '768-tablet', mobile: true },
	{ w: 999, h: 1000, tag: '999-pre-lg', mobile: false },
	{ w: 1024, h: 900, tag: '1024-lg', mobile: false },
	{ w: 1280, h: 900, tag: '1280-laptop', mobile: false },
	{ w: 1440, h: 900, tag: '1440-desktop', mobile: false },
	{ w: 1920, h: 1080, tag: '1920-wide', mobile: false },
];

function findChrome() {
	if (process.env.PW_CHROME) return process.env.PW_CHROME;
	const root = path.join(process.env.LOCALAPPDATA || '', 'ms-playwright');
	if (!fs.existsSync(root)) throw new Error('No ms-playwright dir; set PW_CHROME');
	const dirs = fs.readdirSync(root).filter((d) => d.startsWith('chromium_headless_shell') || d.startsWith('chromium-')).sort().reverse();
	for (const d of dirs) {
		for (const sub of ['chrome-headless-shell-win64/chrome-headless-shell.exe', 'chrome-win/chrome.exe', 'chrome-win64/chrome.exe']) {
			const p = path.join(root, d, sub);
			if (fs.existsSync(p)) return p;
		}
	}
	throw new Error('No chromium found under ' + root);
}

/**
 * Runs in the page. Every check reports a CSS selector-ish path plus the
 * measured numbers, so a finding can be reproduced by hand rather than
 * taken on trust.
 */
function auditInPage() {
	const problems = [];
	const docWidth = document.documentElement.clientWidth;

	function describe(el) {
		const id = el.id ? `#${el.id}` : '';
		const cls = typeof el.className === 'string' && el.className
			? '.' + el.className.trim().split(/\s+/).slice(0, 4).join('.')
			: '';
		const slot = el.getAttribute && el.getAttribute('data-slot') ? `[data-slot=${el.getAttribute('data-slot')}]` : '';
		const text = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
		return `${el.tagName.toLowerCase()}${id}${slot}${cls}` + (text ? ` "${text}"` : '');
	}

	// Visually-hidden content (the sr-only clip technique) is deliberately
	// sized to nothing; measuring it as a layout box reports the technique
	// as a defect. Excluded from every geometric check below.
	function isScreenReaderOnly(el) {
		let node = el;
		while (node && node !== document.body) {
			const s = getComputedStyle(node);
			const tinyClip = s.clipPath === 'inset(50%)' || s.clip === 'rect(0px, 0px, 0px, 0px)';
			if (tinyClip && s.position === 'absolute') return true;
			if (node.classList && node.classList.contains('sr-only')) return true;
			node = node.parentElement;
		}
		return false;
	}

	// A rail the reader can scroll to reveal is not broken. Returns the
	// scrollable ancestor, if any, that can bring `el` into view.
	function scrollableAncestor(el) {
		let node = el.parentElement;
		while (node && node !== document.body) {
			const s = getComputedStyle(node);
			if ((s.overflowX === 'auto' || s.overflowX === 'scroll') && node.scrollWidth > node.clientWidth + 1) return node;
			node = node.parentElement;
		}
		return null;
	}

	// Decorative layers the page deliberately oversizes and clips: a drifting
	// starfield sets `inset: -50% -10%` so its animation can wrap without ever
	// showing an edge, inside a parent that is `overflow: hidden`. Measured
	// against the viewport it looks like overflow; it is the technique. An
	// aria-hidden, non-interactive element inside a clipping ancestor paints
	// nothing a reader can reach or miss.
	function isClippedDecoration(el) {
		if (!el.closest('[aria-hidden="true"]')) return false;
		let node = el.parentElement;
		while (node && node !== document.body) {
			const s = getComputedStyle(node);
			if (s.overflow === 'hidden' || s.overflowX === 'hidden' || s.overflowX === 'clip') return true;
			node = node.parentElement;
		}
		return false;
	}

	const all = Array.from(document.querySelectorAll('body *'))
		.filter((el) => !isScreenReaderOnly(el) && !isClippedDecoration(el));

	// 1. Anything painting past the right edge of the viewport. Only the
	// element nearest the overflow is worth reporting -- ancestors inherit
	// the symptom, so a container whose child is already flagged is skipped.
	const offCanvas = [];
	for (const el of all) {
		const r = el.getBoundingClientRect();
		if (r.width === 0 || r.height === 0) continue;
		const style = getComputedStyle(el);
		if (style.visibility === 'hidden' || style.display === 'none') continue;
		if (r.right > docWidth + 1 && !scrollableAncestor(el)) {
			offCanvas.push({ el, overhang: Math.round(r.right - docWidth), rect: r });
		}
	}
	for (const item of offCanvas) {
		const hasFlaggedChild = offCanvas.some((o) => o !== item && item.el.contains(o.el));
		if (hasFlaggedChild) continue;
		problems.push({
			kind: 'off-canvas',
			selector: describe(item.el),
			detail: `extends ${item.overhang}px past the right edge (right=${Math.round(item.rect.right)}, viewport=${docWidth})`,
		});
	}

	// 2. Content wider than its own scroll container, where nothing can
	// scroll to reach it. A deliberate overflow-x:auto strip is fine; a
	// clipped or visible-overflow box is a bug.
	for (const el of all) {
		if (el.scrollWidth <= el.clientWidth + 1) continue;
		if (el.clientWidth === 0) continue;
		const style = getComputedStyle(el);
		const ox = style.overflowX;
		if (ox === 'auto' || ox === 'scroll') continue; // intentionally scrollable
		if (ox === 'visible') continue; // child paints outside; caught by off-canvas
		// A decorative layer clipping its own oversized children is the
		// technique, not a defect -- nothing readable is inside it.
		if (el.getAttribute('aria-hidden') === 'true' || el.closest('[aria-hidden="true"]')) continue;
		if (style.textOverflow === 'ellipsis') continue; // `truncate`: clipping is the intent
		problems.push({
			kind: 'clipped-overflow',
			selector: describe(el),
			detail: `content ${el.scrollWidth}px wide in a ${el.clientWidth}px box with overflow-x:${ox} -- unreachable`,
		});
	}

	// 3. Interactive targets too small to hit reliably. 44px is the floor
	// both platform guidelines use; inline links inside a paragraph are
	// exempt, since they are read, not aimed at.
	//
	// Only on a touch-sized viewport. The design deliberately relaxes the
	// floor above sm (`min-h-11 sm:min-h-0` on the footer links, and on the
	// button base), where a pointer is assumed -- measuring a wide window
	// against the thumb floor reports that choice as a defect.
	const isTouchWidth = window.innerWidth <= 720;
	const interactive = isTouchWidth
		? Array.from(document.querySelectorAll('a[href], button, [role="button"], input, select, summary, [tabindex]:not([tabindex="-1"])')).filter((el) => !isScreenReaderOnly(el))
		: [];
	for (const el of interactive) {
		const r = el.getBoundingClientRect();
		if (r.width === 0 || r.height === 0) continue;
		const style = getComputedStyle(el);
		if (style.visibility === 'hidden') continue;
		// Not laid out at this width (inside a display:none subtree): the
		// element is deliberately absent here, not undersized.
		if (el.offsetParent === null && style.position !== 'fixed') continue;
		// An anchor whose parent is a text block is an inline prose link.
		const parentDisplay = el.parentElement ? getComputedStyle(el.parentElement).display : '';
		const isInlineProseLink = el.tagName === 'A' && (style.display === 'inline' || style.display === 'inline-block');
		if (isInlineProseLink) continue;
		if (r.height < 44 || r.width < 24) {
			problems.push({
				kind: 'small-tap-target',
				selector: describe(el),
				detail: `${Math.round(r.width)}x${Math.round(r.height)}px (floor is 44px high)`,
			});
		}
	}

	// 4. Text clipped by a fixed height -- the element is shorter than the
	// text inside it and is not an intentional line-clamp.
	for (const el of all) {
		if (!el.children.length && el.textContent && el.textContent.trim()) {
			const style = getComputedStyle(el);
			if (style.webkitLineClamp && style.webkitLineClamp !== 'none') continue;
			if (style.overflow === 'hidden' && el.scrollHeight > el.clientHeight + 2 && el.clientHeight > 0) {
				problems.push({
					kind: 'clipped-text',
					selector: describe(el),
					detail: `text needs ${el.scrollHeight}px in a ${el.clientHeight}px box`,
				});
			}
		}
	}

	// 5. Horizontal document scroll -- the page-level symptom.
	const docScroll = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;

	return {
		problems,
		docScroll,
		scrollWidth: document.documentElement.scrollWidth,
		clientWidth: document.documentElement.clientWidth,
		title: document.title,
	};
}

(async () => {
	let routes = args.filter((a) => !a.startsWith('--'));
	if (routesFile) routes = fs.readFileSync(routesFile, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
	if (onlyWidths) {
		const keep = new Set(onlyWidths.split(',').map((n) => Number(n.trim())));
		for (let i = WIDTHS.length - 1; i >= 0; i--) if (!keep.has(WIDTHS[i].w)) WIDTHS.splice(i, 1);
	}
	if (!routes.length) { console.error('No routes given.'); process.exit(1); }

	fs.mkdirSync(out, { recursive: true });
	let server = null;
	if (serveDir) server = await serve(path.resolve(serveDir), Number(new URL(base).port));
	const browser = await chromium.launch({ executablePath: findChrome() });
	const findings = [];

	for (const route of routes) {
		for (const v of WIDTHS) {
			const ctx = await browser.newContext({
				viewport: { width: v.w, height: v.h },
				isMobile: v.mobile,
				hasTouch: v.mobile,
				deviceScaleFactor: 1,
			});
			const page = await ctx.newPage();
			const errors = [];
			page.on('pageerror', (e) => errors.push(String(e.message || e)));
			page.on('console', (m) => {
				if (m.type() === 'error' && !/AuthClass - No current user/.test(m.text())) errors.push(m.text());
			});
			const slug = (route === '/' ? 'home' : route.replace(/^\//, '').replace(/\//g, '_'));
			try {
				await page.goto(base + route, { waitUntil: 'networkidle', timeout: 60000 });
				await page.waitForTimeout(700);
				await page.evaluate(() => (document.fonts && document.fonts.ready) || null).catch(() => null);
				const result = await page.evaluate(auditInPage);
				findings.push({ route, width: v.w, tag: v.tag, ...result, errors });
				if (shots && result.problems.length) {
					await page.screenshot({ path: path.join(out, `${slug}-${v.tag}.png`), fullPage: true });
				}
			} catch (e) {
				findings.push({ route, width: v.w, tag: v.tag, failed: String(e.message || e).split('\n')[0], problems: [], errors });
			}
			await ctx.close();
		}
		process.stderr.write(`audited ${route}\n`);
	}
	await browser.close();
	if (server) server.close();

	fs.writeFileSync(path.join(out, 'findings.json'), JSON.stringify(findings, null, 2));

	// Group identical problems across widths so the report reads as
	// "this thing is broken from 320 to 719", not eleven separate lines.
	const grouped = new Map();
	for (const f of findings) {
		for (const p of f.problems) {
			const key = `${f.route}|${p.kind}|${p.selector}`;
			if (!grouped.has(key)) grouped.set(key, { route: f.route, kind: p.kind, selector: p.selector, widths: [], detail: p.detail });
			grouped.get(key).widths.push(f.width);
		}
	}
	const rows = Array.from(grouped.values()).sort((a, b) => b.widths.length - a.widths.length);
	console.log(JSON.stringify({
		summary: {
			routes: routes.length,
			widths: WIDTHS.length,
			distinctProblems: rows.length,
			docScrollAt: findings.filter((f) => f.docScroll).map((f) => `${f.route}@${f.width}`),
			failures: findings.filter((f) => f.failed).map((f) => `${f.route}@${f.width}: ${f.failed}`),
			consoleErrors: findings.filter((f) => f.errors && f.errors.length).map((f) => `${f.route}@${f.width}: ${f.errors[0]}`),
		},
		problems: rows,
	}, null, 2));
})().catch((e) => { console.error(e); process.exit(1); });
