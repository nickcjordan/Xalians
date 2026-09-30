// Bundle a home story figure's study page (apps/web/dev/figureStudy.ts) into one self-contained file for a
// grading round's artifact (docs/design/home-story-figures.md, section 10; .claude/skills/story-figure-polish).
//
// usage: node scripts/design/export-figure-study.cjs <figure> [--rounds <rounds.json>]
//   <rounds.json> (default untracked/figure-study/<figure>/rounds.json, if it exists): an array of rounds,
//   { round, date, summary, scores: { Glance: 7, ... }, reader: [...], changes: [...], open: [...],
//     frames: [{ src: 'path/to/frame.jpg', caption }] }, frame paths relative to the json file. Frames are
//   embedded as data URIs, so keep them JPEG and modest (the page must stay under 16 MB).
// writes untracked/figure-study/<figure>.html (a page body with its own title and style, as the Artifact
// tool expects; browsers open it directly too).
const path = require('path');
const fs = require('fs');
const web = path.join(__dirname, '..', '..', 'apps', 'web');
const { buildSync } = require(require.resolve('esbuild', { paths: [web] }));

const FIGURES = {
	generators: {
		title: 'Generators Figure Study',
		beats: ['02 Generators, world by world', '03 APEX takes the Generators'],
		// pictures the figure paints from, inlined so the page stands alone (the site loads them by path)
		assets: ['zolton', 'magmuth', 'krystos', 'poseidas'].map((n) => `/assets/img/planets/art/${n}-landscape-768.webp`),
	},
	outbreak: { title: 'Outbreak Figure Study', beats: ['05 The Nemesis Plague', '06 The Scrambler Token'] },
};

const args = process.argv.slice(2);
const figure = args[0];
if (!figure || !FIGURES[figure]) {
	console.error(`usage: node scripts/design/export-figure-study.cjs <${Object.keys(FIGURES).join('|')}> [--rounds <rounds.json>]`);
	process.exit(2);
}
const outDir = path.join(__dirname, '..', '..', 'untracked', 'figure-study');
const ri = args.indexOf('--rounds');
const roundsPath = ri >= 0 ? path.resolve(args[ri + 1]) : path.join(outDir, figure, 'rounds.json');
let rounds = [];
if (fs.existsSync(roundsPath)) {
	rounds = JSON.parse(fs.readFileSync(roundsPath, 'utf8'));
	const base = path.dirname(roundsPath);
	const mime = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
	for (const r of rounds)
		for (const f of r.frames || []) {
			if (f.src.startsWith('data:')) continue;
			const p = path.resolve(base, f.src);
			f.src = `data:${mime[path.extname(p).toLowerCase()] || 'image/png'};base64,${fs.readFileSync(p).toString('base64')}`;
		}
}

const res = buildSync({
	entryPoints: [path.join(web, 'dev', 'figureStudy.ts')],
	bundle: true,
	format: 'iife',
	platform: 'browser',
	target: 'es2020',
	minify: true,
	write: false,
	logLevel: 'warning',
	alias: { '@': path.join(web, 'src') },
});
const js = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const { assets = [], ...meta } = FIGURES[figure];
const inline = {};
for (const a of assets) inline[a] = `data:image/webp;base64,${fs.readFileSync(path.join(web, 'public', a)).toString('base64')}`;
const study = { figure, ...meta, rounds };
const json = JSON.stringify(study).replace(/</g, '\\u003c');
const html = `<title>${FIGURES[figure].title}</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Saira:wght@500;600&family=Atkinson+Hyperlegible&family=Martian+Mono:wght@400;500&display=swap" />
<div id="study"></div>
<script>window.__STUDY__ = ${json}; window.__FIGURE_ASSETS__ = ${JSON.stringify(inline)};</script>
<script>${js}</script>
`;
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, `${figure}.html`);
fs.writeFileSync(out, html);
const mb = Buffer.byteLength(html) / 1e6;
console.log(`${out} (${mb.toFixed(2)} MB${mb > 14 ? ', TOO LARGE for an artifact: shrink the frames' : ''})`);
