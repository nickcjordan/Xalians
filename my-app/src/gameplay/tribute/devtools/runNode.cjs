#!/usr/bin/env node
/*
	*** DEVTOOLS - not part of the shipped app ***

	Runs one of this package's ES-module files under plain `node`.

	The engine is written for Vite (static `import`/`export`, a bare JSON import), so
	Node's own loader cannot run it directly: my-app is not "type": "module", and Node
	demands `with { type: 'json' }` on JSON imports. Rather than fork the source, bundle
	the target with esbuild (already in node_modules as Vite's compiler) into a single
	CommonJS file in memory, then run that. esbuild resolves the imports and inlines the
	JSON exactly as Vite would.

	Usage: node devtools/runNode.cjs <path-to-target-file> [...args forwarded as process.argv]
*/

const path = require('path');
const Module = require('module');
const esbuild = require('esbuild');

const target = process.argv[2];
if (!target) {
	console.error('usage: node runNode.cjs <path-to-target-file> [args...]');
	process.exit(1);
}

const resolvedTarget = path.resolve(process.cwd(), target);

const result = esbuild.buildSync({
	entryPoints: [resolvedTarget],
	bundle: true,
	platform: 'node',
	format: 'cjs',
	target: 'node20',
	write: false,
	logLevel: 'warning',
	// an entry outside my-app (a scratch script) still resolves this package's imports
	absWorkingDir: path.resolve(__dirname, '..', '..', '..', '..'),
});

const code = result.outputFiles[0].text;

// forward remaining argv to the target script the way `node target.js a b c` would
process.argv = [process.argv[0], resolvedTarget, ...process.argv.slice(3)];

const m = new Module(resolvedTarget, module);
m.filename = resolvedTarget;
m.paths = Module._nodeModulePaths(path.dirname(resolvedTarget));
m._compile(code, resolvedTarget);
