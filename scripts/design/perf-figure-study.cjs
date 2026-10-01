// Draw time of a home story figure in headed Chrome (docs/design/home-story-figures.md, section 9): opens the
// exported study page at the laptop profile in stress mode (drawing every frame, not at film rate), plays each
// beat, and reads the page's own readout: the script's time per frame (average and 95th percentile, the figure
// plus the oval fade) and the frame rate the screen held, which is where the GPU's share shows.
//
// usage: node scripts/design/perf-figure-study.cjs <figure> [--secs 10]
// needs Chrome installed (C:\Program Files\Google\Chrome); a window opens for the run.
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const { chromium } = require(require.resolve('playwright-core', { paths: [path.join(__dirname, '..', '..', 'apps/web')] }));

const args = process.argv.slice(2);
const si = args.indexOf('--secs');
const secs = si >= 0 ? Number(args.splice(si, 2)[1]) : 10;
const figure = args[0];
const page = path.join(__dirname, '..', '..', 'untracked', 'figure-study', `${figure}.html`);
if (!figure || !fs.existsSync(page)) {
	console.error(`usage: node scripts/design/perf-figure-study.cjs <figure>  (export it first: node scripts/design/export-figure-study.cjs ${figure || '<figure>'})`);
	process.exit(2);
}
const exe = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p));

(async () => {
	const b = await chromium.launch({ executablePath: exe, headless: false, args: ['--window-size=1366,760'] });
	const p = await b.newPage({ viewport: { width: 1366, height: 640 } });
	await p.goto(`${pathToFileURL(page).href}?stress=1`, { waitUntil: 'load' });
	const keys = await p.locator('.keys button').allTextContents();
	const beats = keys.filter((k) => /^\d\d /.test(k));
	let over = false;
	for (let i = 0; i < beats.length; i++) {
		if (i > 0) await p.getByRole('button', { name: beats[i] }).click();
		await p.waitForTimeout(secs * 1000);
		const read = await p.$$eval('.meta', (ms) => ms.map((m) => `${m.children[0].textContent}: ${m.children[1].textContent}${m.children[1].classList.contains('over') ? '  OVER BUDGET' : ''}`));
		over = over || read.some((r) => r.includes('OVER'));
		console.log(`${beats[i]}\n  ${read.join('\n  ')}`);
	}
	await b.close();
	console.log(over ? 'over budget (8 ms average, 16 ms p95, 58 fps drawing every frame, so a frame costs under about 17 ms all told)' : 'within budget');
	process.exit(over ? 1 : 0);
})();
