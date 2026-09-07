#!/usr/bin/env node
/*
	Run an ESM entry from this package under plain node.

	Files under my-app/src use static ESM and JSON imports that node cannot load
	directly (the package has no "type": "module" and the JSON imports carry no import
	attribute). This bundles the entry with esbuild (already installed as vite's
	dependency), writes the bundle next to the entry as a hidden .cjs file, runs it, and
	deletes it. Everything after the entry path is passed through as process.argv.

		node my-app/scripts/runNode.cjs <entry.js> [args...]

	Used by the generator batch simulator and the Reclamation bot-vs-bot simulator.
*/
const path = require('path');
const fs = require('fs');
const { buildSync } = require('esbuild');

const entry = process.argv[2];
if (!entry) {
	console.error('usage: node my-app/scripts/runNode.cjs <entry.js> [args...]');
	process.exit(2);
}
const entryPath = path.resolve(entry);
const outfile = path.join(path.dirname(entryPath), `.${path.basename(entryPath, path.extname(entryPath))}.run.cjs`);

buildSync({
	entryPoints: [entryPath],
	bundle: true,
	platform: 'node',
	format: 'cjs',
	target: 'node20',
	outfile,
	logLevel: 'warning',
	loader: { '.js': 'jsx', '.json': 'json' },
});

process.argv = [process.argv[0], entryPath].concat(process.argv.slice(3));
try {
	require(outfile);
} finally {
	try { fs.unlinkSync(outfile); } catch (e) { /* already gone */ }
}
