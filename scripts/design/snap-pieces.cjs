// Contact sheets of the home story's small pieces from the dev harness (docs/design/home-story-small-pieces.md).
// usage: node scripts/design/snap-pieces.cjs <piece> [times, comma separated] [out.png]
// (dev server on port 3012; times default to twelve across the loop)
const path = require('path');
const { chromium } = require(require.resolve('playwright-core', { paths: [path.join(__dirname, '..', '..', 'apps/web')] }));
const piece = process.argv[2] || 'plague';
const times = process.argv[3] || '';
const out = process.argv[4] || path.join(__dirname, '..', '..', 'untracked', 'snaps', `piece-${piece}.png`);
(async () => {
	const b = await chromium.launch({ channel: 'chrome', headless: false, args: ['--window-position=2000,2000'] });
	const p = await b.newPage({ viewport: { width: 1500, height: 900 } });
	const errs = [];
	p.on('pageerror', (e) => errs.push(e.message));
	p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
	await p.goto(`http://localhost:3012/dev/pieces.html?piece=${piece}&cols=3&w=900${times ? `&t=${times}` : ''}`, { waitUntil: 'load' });
	await p.waitForFunction(() => window.__done === true, null, { timeout: 60000 });
	require('fs').mkdirSync(path.dirname(out), { recursive: true });
	await p.locator('#grid').screenshot({ path: out });
	console.log(out, errs.length ? 'ERRORS: ' + errs.join(' | ') : 'no errors');
	await b.close();
})();
