#!/usr/bin/env node
// Verification by paint for the site audit remediation (docs/design/site-audit-brief-2026-09-18.md, section 3).
//
// Loads routes in headless Chrome at three viewports, records what a visitor's browser
// would report (title, scroll position on load, overflow, crashes, console errors,
// failed requests, broken images, placeholder text) and saves full-page screenshots.
//
//   node scripts/audit/verify.mjs                       # audited route set against www.xalians.com
//   node scripts/audit/verify.mjs --base http://localhost:3000 --routes /encyclopedia,/generator
//   node scripts/audit/verify.mjs --routes audited --out untracked/site-audit/before
//   node scripts/audit/verify.mjs --widths desktop,phone
//
// Exit code is 1 when any load crashed, overflowed horizontally, or produced a screenshot
// under 20 KB (a near-black image means the React tree crashed), so the script works as a gate.
// Uses the installed Chrome (CHROME_PATH or --chrome to override); no browser download.

import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const args = parseArgs(process.argv.slice(2));
const base = (args.base || 'https://www.xalians.com').replace(/\/$/, '');
const chromePath = args.chrome || process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const outDir = args.out || join('untracked', 'site-audit', 'shots', new Date().toISOString().replace(/[:.]/g, '-'));

const AUDITED_ROUTES = [
	'/',
	'/generator',
	'/encyclopedia',
	'/encyclopedia/story',
	'/encyclopedia/story/deep-past',
	'/encyclopedia/worlds',
	'/encyclopedia/worlds/magmuth',
	'/encyclopedia/species',
	'/encyclopedia/species/graviclaw',
	'/encyclopedia/powers',
	'/encyclopedia/index',
	'/encyclopedia/index/vallerii',
	'/account',
	'/trade/new',
	'/arcade',
	'/this-page-does-not-exist',
];

const VIEWPORTS = {
	desktop: { viewport: { width: 1440, height: 900 } },
	laptop: { viewport: { width: 1100, height: 800 } },
	phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
};

const routes = !args.routes || args.routes === 'audited' ? AUDITED_ROUTES : args.routes.split(',').map((r) => r.trim()).filter(Boolean);
const widths = (args.widths || 'desktop,laptop,phone').split(',').map((w) => w.trim()).filter((w) => VIEWPORTS[w]);

mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ executablePath: chromePath, headless: true });
const rows = [];
let failures = 0;

for (const route of routes) {
	for (const width of widths) {
		const context = await browser.newContext(VIEWPORTS[width]);
		const page = await context.newPage();
		const errors = [];
		const failed = [];
		page.on('pageerror', (e) => errors.push(`pageerror: ${String(e)}`));
		page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
		page.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
		page.on('requestfailed', (r) => failed.push(`failed ${r.url()} ${r.failure()?.errorText || ''}`));

		const url = base + route;
		let facts = null;
		try {
			await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
			await page.waitForTimeout(1200);
			facts = await page.evaluate(() => {
				const doc = document.documentElement;
				const suspicious = [];
				const re = /\b(undefined|NaN|null|Lorem)\b|\[object Object\]/;
				for (const el of document.body.querySelectorAll('*')) {
					if (el.children.length === 0 && re.test(el.textContent || '')) {
						suspicious.push(`${el.tagName.toLowerCase()}: ${(el.textContent || '').trim().slice(0, 60)}`);
						if (suspicious.length >= 5) break;
					}
				}
				const brokenImages = [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.currentSrc || i.src).slice(0, 5);
				return {
					title: document.title,
					scrollY: window.scrollY,
					overflow: doc.scrollWidth > window.innerWidth,
					scrollWidth: doc.scrollWidth,
					innerWidth: window.innerWidth,
					height: doc.scrollHeight,
					h1: document.querySelector('h1')?.innerText?.trim() || null,
					h1Count: document.querySelectorAll('h1').length,
					textLength: (document.body.innerText || '').trim().length,
					brokenImages,
					suspicious,
					hasEarth: /\bEarth\b/.test(document.body.innerText || ''),
					hasEmDash: (document.body.innerText || '').includes('\u2014'),
				};
			});
		} catch (e) {
			errors.push(`navigation: ${String(e).split('\n')[0]}`);
		}

		const slug = route === '/' ? 'root' : route.replace(/^\//, '').replace(/\//g, '__').replace(/[^a-z0-9_-]/gi, '_');
		const shot = join(outDir, `${width}-${slug}.jpg`);
		let shotKb = 0;
		try {
			await page.screenshot({ path: shot, fullPage: true, type: 'jpeg', quality: 60 });
			shotKb = Math.round(statSync(shot).size / 1024);
		} catch (e) {
			errors.push(`screenshot: ${String(e).split('\n')[0]}`);
		}

		const crashed = errors.some((e) => e.startsWith('pageerror') || e.startsWith('navigation'));
		const tiny = shotKb > 0 && shotKb < 20;
		const bad = crashed || tiny || Boolean(facts?.overflow);
		if (bad) failures += 1;

		const row = { route, width, url, ...(facts || {}), errors, failed, shot, shotKb, crashed, tiny };
		rows.push(row);
		console.log(`${bad ? 'FAIL' : 'ok  '} ${width.padEnd(7)} ${route.padEnd(36)} title="${facts?.title ?? '-'}" scrollY=${facts?.scrollY ?? '-'} overflow=${facts?.overflow ?? '-'} h1="${facts?.h1 ?? '-'}" shot=${shotKb}KB errors=${errors.length} failed=${failed.length}`);
		await context.close();
	}
}

await browser.close();

writeFileSync(join(outDir, 'data.json'), JSON.stringify({ base, generatedAt: new Date().toISOString(), rows }, null, 2));
writeFileSync(join(outDir, 'report.md'), renderReport(rows));
console.log(`\n${rows.length} loads, ${failures} failing. Report: ${join(outDir, 'report.md')}`);
process.exit(failures > 0 ? 1 : 0);

function renderReport(list) {
	const head = '| Route | Width | Title | scrollY | Overflow | Height | H1 | Errors | Failed requests | Earth | Em dash | Shot KB |\n|---|---|---|---|---|---|---|---|---|---|---|---|\n';
	const body = list.map((r) => `| ${r.route} | ${r.width} | ${r.title ?? ''} | ${r.scrollY ?? ''} | ${r.overflow ? 'yes' : 'no'} | ${r.height ?? ''} | ${(r.h1 || '').replace(/\|/g, '/')} | ${r.errors.length} | ${r.failed.length} | ${r.hasEarth ? 'yes' : 'no'} | ${r.hasEmDash ? 'yes' : 'no'} | ${r.shotKb} |`).join('\n');
	const details = list.filter((r) => r.errors.length || r.failed.length || r.suspicious?.length || r.brokenImages?.length).map((r) => {
		const lines = [`### ${r.route} (${r.width})`];
		if (r.errors.length) lines.push('Errors:', ...r.errors.map((e) => `- ${e}`));
		if (r.failed.length) lines.push('Failed requests:', ...r.failed.map((e) => `- ${e}`));
		if (r.suspicious?.length) lines.push('Suspicious text:', ...r.suspicious.map((e) => `- ${e}`));
		if (r.brokenImages?.length) lines.push('Broken images:', ...r.brokenImages.map((e) => `- ${e}`));
		return lines.join('\n');
	}).join('\n\n');
	return `# Verification by paint\n\nBase: ${list[0]?.url?.replace(list[0].route, '') || ''}\nGenerated: ${new Date().toISOString()}\n\n${head}${body}\n\n${details}\n`;
}

function parseArgs(argv) {
	const out = {};
	for (let i = 0; i < argv.length; i += 1) {
		const a = argv[i];
		if (a.startsWith('--')) {
			const key = a.slice(2);
			const next = argv[i + 1];
			if (next && !next.startsWith('--')) { out[key] = next; i += 1; } else { out[key] = true; }
		}
	}
	return out;
}
