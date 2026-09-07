#!/usr/bin/env node
/**
 * Design-system screenshot harness.
 *
 *   node scripts/design/snap.js [--base http://localhost:3000] [--out untracked/snaps] [route ...]
 *
 * Screenshots each route at desktop (1440x900) and phone (390x844, isMobile)
 * so visual work can be checked by paint, not by CSS. Uses playwright-core
 * with the chromium headless shell that the Playwright/MCP install leaves
 * under %LOCALAPPDATA%\ms-playwright (override with PW_CHROME).
 * Default routes are every page in the terminal map (docs/DESIGN_SYSTEM.md).
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require(require.resolve('playwright-core', { paths: [path.join(__dirname, '..', '..', 'my-app')] }));

const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : dflt; };
const base = opt('--base', 'http://localhost:3000');
const out = opt('--out', 'untracked/snaps');
const routes = (args.length ? args : ['/', '/generator', '/encyclopedia', '/duel', '/reclamation', '/train', '/account', '/styleguide']).map((r) => (r === 'home' ? '/' : r.startsWith('/') ? r : '/' + r));

function findChrome() {
	if (process.env.PW_CHROME) return process.env.PW_CHROME;
	const root = path.join(process.env.LOCALAPPDATA || '', 'ms-playwright');
	if (!fs.existsSync(root)) throw new Error('No ms-playwright dir; set PW_CHROME to a chrome executable');
	const dirs = fs.readdirSync(root).filter((d) => d.startsWith('chromium_headless_shell') || d.startsWith('chromium-')).sort().reverse();
	for (const d of dirs) {
		for (const sub of ['chrome-headless-shell-win64/chrome-headless-shell.exe', 'chrome-win/chrome.exe', 'chrome-win64/chrome.exe']) {
			const p = path.join(root, d, sub);
			if (fs.existsSync(p)) return p;
		}
	}
	throw new Error('No chromium found under ' + root);
}

(async () => {
	fs.mkdirSync(out, { recursive: true });
	const browser = await chromium.launch({ executablePath: findChrome() });
	const views = [
		{ tag: 'desktop', viewport: { width: 1440, height: 900 } },
		{ tag: 'phone', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
	];
	const report = [];
	for (const route of routes) {
		for (const v of views) {
			const ctx = await browser.newContext({ viewport: v.viewport, isMobile: !!v.isMobile, hasTouch: !!v.hasTouch, deviceScaleFactor: v.deviceScaleFactor || 1 });
			const page = await ctx.newPage();
			const errors = [];
			page.on('pageerror', (e) => errors.push(String(e.message || e)));
			page.on('console', (m) => { if (m.type() === 'error' && !/AuthClass - No current user/.test(m.text())) errors.push(m.text()); });
			const name = (route === '/' ? 'home' : route.replace(/^\//, '').replace(/\//g, '_')) + '-' + v.tag;
			try {
				await page.goto(base + route, { waitUntil: 'networkidle', timeout: 60000 });
				await page.waitForTimeout(1200);
				const metrics = await page.evaluate(() => ({
					terminal: (document.querySelector('.g-console[data-terminal]') || document.querySelector('[data-terminal]'))?.getAttribute('data-terminal') || null,
					scrollWidth: document.documentElement.scrollWidth,
					clientWidth: document.documentElement.clientWidth,
					title: document.title,
				}));
				await page.screenshot({ path: path.join(out, name + '.png'), fullPage: true });
				report.push({ route, view: v.tag, ...metrics, horizontalOverflow: metrics.scrollWidth > metrics.clientWidth, errors });
			} catch (e) {
				report.push({ route, view: v.tag, failed: String(e.message || e).split('\n')[0], errors });
			}
			await ctx.close();
		}
	}
	await browser.close();
	fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
	for (const r of report) {
		const flag = r.failed ? 'FAIL ' + r.failed : (r.horizontalOverflow ? 'OVERFLOW ' : '') + (r.errors.length ? r.errors.length + ' console errors ' : '') + 'terminal=' + r.terminal;
		console.log(`${r.route.padEnd(16)} ${r.view.padEnd(8)} ${flag}`);
	}
})().catch((e) => { console.error(e); process.exit(1); });
