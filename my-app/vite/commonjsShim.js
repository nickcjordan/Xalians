import { parse } from 'acorn';

/**
 * Vite plugin: let the app `import` the handful of CommonJS files inside src/.
 *
 * Webpack's interop let ESM components import CommonJS modules and it never
 * mattered which was which. Vite only converts CommonJS inside node_modules,
 * so this plugin does the same job for a fixed list of first-party files:
 *
 *   - `src/constants/` and `src/gameplay/` are overwritten from `lambda/src` by
 *     `yarn copy-js`, and lambda runs CommonJS on nodejs12, so those say
 *     `module.exports = {...}`. The app-owned files beside them
 *     (`colorConstants.js`, `designTokens.js`, `gameplay/duel/duelCalculator.js`)
 *     are written in the same style, the last one mixing `require` with ESM
 *     `export`.
 *   - `src/utils/textFit.js` is a vendored UMD library that assigns
 *     `module.exports` when it sees a CommonJS `exports` object.
 *
 * Rewrites, in order:
 *   - top-level `const x = require('spec')`
 *       -> `import * as ns from 'spec'; const x = interop(ns)`, where interop
 *       returns `ns.default` when the target is CommonJS (its module.exports)
 *       and the namespace itself for an ESM target with only named exports.
 *       That is what webpack handed back in both cases.
 *   - any file assigning `module.exports` is wrapped so `module` and `exports`
 *     exist, and `module.exports` becomes the default export;
 *     `module.exports = { a, b: c }` and `module.exports.a = ...` also become
 *     named exports `a`, `b`.
 * Anything that still says `require(` afterwards is an error on purpose, so a
 * new idiom fails loudly at transform time instead of at runtime in the browser.
 */

// Vite ids always use forward slashes, even on Windows.
const TARGETS = [/\/src\/(constants|gameplay)\/.*\.js$/, /\/src\/utils\/textFit\.js$/];
const TOP_LEVEL_REQUIRE =
	/^[ \t]*(const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*require\(\s*(['"])([^'"]+)\3\s*\)\s*;?[ \t]*$/gm;
const IDENT = /^[A-Za-z_$][\w$]*$/;

// Kept out of Rollup's static view on purpose: written inline as `ns.default`
// it would warn "default is not exported" for every ESM target.
const INTEROP = `const __cjs_interop = (ns) => ('default' in ns ? ns.default : ns);`;

// Good enough for the guard below: the files carry commented-out require lines.
const stripComments = (code) =>
	code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"])\/\/.*$/gm, '$1');

const isModuleExports = (n) =>
	n.type === 'MemberExpression' &&
	n.object.type === 'Identifier' &&
	n.object.name === 'module' &&
	n.property.type === 'Identifier' &&
	n.property.name === 'exports';

function exportNames(code) {
	const ast = parse(code, { ecmaVersion: 'latest', sourceType: 'module' });
	const names = new Set();
	for (const node of ast.body) {
		if (node.type !== 'ExpressionStatement' || node.expression.type !== 'AssignmentExpression') continue;
		const { left, right } = node.expression;
		if (isModuleExports(left)) {
			if (right.type !== 'ObjectExpression') continue; // default export only
			for (const prop of right.properties) {
				if (prop.type !== 'Property') continue;
				const key = prop.key.type === 'Identifier' ? prop.key.name : String(prop.key.value);
				if (IDENT.test(key)) names.add(key);
			}
		} else if (
			left.type === 'MemberExpression' &&
			isModuleExports(left.object) &&
			left.property.type === 'Identifier'
		) {
			names.add(left.property.name);
		}
	}
	return [...names];
}

export default function commonjsShim() {
	return {
		name: 'xalians:commonjs-shim',
		enforce: 'pre',
		transform(code, id) {
			const file = id.split('?')[0];
			if (!TARGETS.some((re) => re.test(file))) return null;
			const hasExports = /\bmodule\.exports\b/.test(code);
			const hasRequire = /\brequire\s*\(/.test(code);
			if (!hasExports && !hasRequire) return null;

			let requires = 0;
			let out = code.replace(TOP_LEVEL_REQUIRE, (_, kind, name, _quote, spec) => {
				requires += 1;
				return `import * as __req_${name} from '${spec}'; ${kind} ${name} = __cjs_interop(__req_${name});`;
			});
			if (/\brequire\s*\(/.test(stripComments(out))) {
				throw new Error(`[commonjs-shim] ${id}: only top-level "const x = require('spec')" is supported`);
			}
			const prelude = requires ? [INTEROP] : [];

			if (!hasExports) {
				return { code: [...prelude, out].join('\n'), map: null };
			}

			const names = exportNames(out);
			const named = names.map((n) => `const __cjs_${n} = module.exports.${n};`).join('\n');
			const specifiers = names.map((n) => `__cjs_${n} as ${n}`).join(', ');

			out = [
				...prelude,
				'const module = { exports: {} }; const exports = module.exports;',
				out,
				named,
				'export default module.exports;',
				names.length ? `export { ${specifiers} };` : '',
			].join('\n');

			return { code: out, map: null };
		},
	};
}
