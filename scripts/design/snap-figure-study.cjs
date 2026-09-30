// Stills of a home story figure from its exported study page (scripts/design/export-figure-study.cjs), for
// builders and graders: no dev server, no viewer, just the figure on its stage at chosen moments.
//
// usage: node scripts/design/snap-figure-study.cjs <figure> "<spec>" [out.png] [--cols 3] [--w 1000]
//   spec: beat@seconds items joined by ";", ">" runs on into the next beat without a reset, a leading "c"
//   draws it compact (the phone place). e.g. "0@1.5;0@4.2;0@6.9;0@9.6>1@0.6;0@9.6>1@2.4;0@9.6>1@5"
// writes one contact sheet (default untracked/figure-study/<figure>/sheet.png) and prints the page's errors.
//   --each <dir>: instead, one uncaptioned image per still, named 01.png, 02.png... in <dir> (for a blind
//   reader, whose files must not name the figure or the beat).
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const { chromium } = require(require.resolve('playwright-core', { paths: [path.join(__dirname, '..', '..', 'apps/web')] }));

const args = process.argv.slice(2);
const opt = (k, d) => {
	const i = args.indexOf(k);
	return i >= 0 ? args.splice(i, 2)[1] : d;
};
const cols = opt('--cols', '3');
const w = opt('--w', '1000');
const each = opt('--each', '');
const [figure, spec, outArg] = args;
if (!figure || !spec) {
	console.error('usage: node scripts/design/snap-figure-study.cjs <figure> "<spec>" [out.png] [--cols 3] [--w 1000]');
	process.exit(2);
}
const dir = path.join(__dirname, '..', '..', 'untracked', 'figure-study');
const page = path.join(dir, `${figure}.html`);
if (!fs.existsSync(page)) {
	console.error(`no ${page}: run node scripts/design/export-figure-study.cjs ${figure} first`);
	process.exit(1);
}
const out = path.resolve(outArg || path.join(dir, figure, 'sheet.png'));
fs.mkdirSync(path.dirname(out), { recursive: true });

const root = path.join(process.env.LOCALAPPDATA, 'ms-playwright');
const d = fs.readdirSync(root).filter((x) => x.startsWith('chromium_headless_shell')).sort().reverse()[0];
const exe = path.join(root, d, 'chrome-headless-shell-win64/chrome-headless-shell.exe');

(async () => {
	const b = await chromium.launch({ executablePath: exe });
	const p = await b.newPage({ viewport: { width: 1500, height: 900 } });
	const errs = [];
	p.on('pageerror', (e) => errs.push(String(e)));
	p.on('console', (m) => m.type() === 'error' && !/fonts\.g/.test(m.text()) && errs.push(m.text()));
	const url = `${pathToFileURL(page).href}?frames=${encodeURIComponent(spec)}&cols=${cols}&w=${w}`;
	await p.goto(url, { waitUntil: 'load' });
	await p.waitForFunction(() => window.__done === true, null, { timeout: 120000 });
	if (each) {
		const eachDir = path.resolve(each);
		fs.mkdirSync(eachDir, { recursive: true });
		const cs = await p.locator('.stills canvas').all();
		for (let i = 0; i < cs.length; i++) await cs[i].screenshot({ path: path.join(eachDir, `${String(i + 1).padStart(2, '0')}.png`) });
		console.log(`${cs.length} stills in ${eachDir}`);
	} else {
		await p.locator('.stills').screenshot({ path: out });
		console.log(out);
	}
	console.log(errs.length ? errs.join(' | ') : 'no errors');
	await b.close();
})();
