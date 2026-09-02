#!/usr/bin/env node
/*
	*** DEVTOOLS - not part of the shipped app ***

	CommonJS bootstrap that lets the Tribute engine (written in plain ES module syntax with
	static `import`/`export` and static JSON imports, so it stays webpack- and Jest-clean)
	run directly under plain `node`, without adding any new dependency.

	Why this exists: the engine files use `import x from './y'` (extensionless) and
	`import matrix from '../../json/foo.json'` (a bare static JSON import). Both forms work
	under CRA's babel-jest and under webpack, but neither works under plain Node's native
	ESM loader - extensionless specifiers are not resolvable, and Node's native loader
	requires an `with { type: 'json' }` import attribute on JSON imports (which babel's
	parser, and therefore Jest, does not understand - confirmed while building this file:
	adding that attribute syntax broke Jest with "Support for the experimental syntax
	'moduleAttributes' isn't currently enabled"). So core code cannot use either Node's
	attribute syntax (breaks Jest) or Node-only APIs like `createRequire`/`import.meta`
	(a prior attempt at this used `createRequire`, which would have broken a future webpack
	production build - see git history / task notes).

	The fix: transpile on the fly with the same Babel preset CRA/Jest already use
	(`babel-preset-react-app`, already a devDependency - nothing new installed), via a
	CommonJS `require.extensions['.js']` hook, then require the target file as CommonJS.
	Babel's CommonJS transform resolves extensionless `./foo` requires exactly like
	webpack/Jest do, and inlines JSON imports via its own JSON-loading, sidestepping Node's
	native ESM loader entirely.

	Usage: node devtools/runNode.cjs <path-to-target-file> [...args forwarded as process.argv]
*/

process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.BABEL_ENV = process.env.BABEL_ENV || process.env.NODE_ENV;

const path = require('path');
const fs = require('fs');
const babel = require('@babel/core');

const projectRoot = path.resolve(__dirname, '..', '..', '..', '..'); // my-app/

const babelOptions = {
	presets: [require.resolve('babel-preset-react-app')],
	babelrc: false,
	configFile: false,
	sourceType: 'module',
	envName: 'development',
};

const transformCache = new Map();

require.extensions['.js'] = function tributeBabelLoader(module, filename) {
	// only transpile files inside this package - never touch third-party node_modules
	if (filename.includes(`${path.sep}node_modules${path.sep}`)) {
		const source = fs.readFileSync(filename, 'utf8');
		return module._compile(source, filename);
	}
	let code = transformCache.get(filename);
	if (!code) {
		const result = babel.transformFileSync(filename, babelOptions);
		code = result.code;
		transformCache.set(filename, code);
	}
	return module._compile(code, filename);
};

require.extensions['.json'] = function jsonLoader(module, filename) {
	const source = fs.readFileSync(filename, 'utf8');
	module.exports = JSON.parse(source);
};

const target = process.argv[2];
if (!target) {
	console.error('usage: node runNode.cjs <path-to-target-file> [args...]');
	process.exit(1);
}

const resolvedTarget = path.resolve(process.cwd(), target);

// forward remaining argv to the target script the way `node target.js a b c` would
process.argv = [process.argv[0], resolvedTarget, ...process.argv.slice(3)];

require(resolvedTarget);
