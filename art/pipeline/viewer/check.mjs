// Node-only sanity check of viewer/index.html: the config block and import map parse,
// three.js is pinned to the configured version, and the default asset folder has a manifest.
//   node viewer/check.mjs [assetFolder]
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(HERE, 'index.html'), 'utf8');
const block = (re) => { const m = html.match(re); if (!m) throw new Error(`missing ${re}`); return JSON.parse(m[1]); };
const problems = [];
const config = block(/<script type="application\/json" id="viewer-config">([\s\S]*?)<\/script>/);
const importmap = block(/<script type="importmap">([\s\S]*?)<\/script>/);
for (const [k, url] of Object.entries(importmap.imports)) if (!url.includes(`/${config.three}/`) && !url.includes(`@${config.three}/`)) problems.push(`import ${k} is not pinned to ${config.three}: ${url}`);
if (!/<script type="module">/.test(html)) problems.push('no module script');
const asset = resolve(HERE, process.argv[2] || config.defaultAsset);
if (!existsSync(join(asset, 'manifest.json'))) problems.push(`no manifest.json in ${asset} (run the chain first)`);
if (problems.length) { console.log('viewer check FAILED:\n  - ' + problems.join('\n  - ')); process.exit(1); }
console.log(`viewer check ok: three ${config.three}, phone ${config.phoneViewport.join('x')}, asset ${asset}`);
