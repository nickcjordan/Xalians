import { defineConfig, transformWithEsbuild } from 'vite';
import path from 'node:path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import svgr from 'vite-plugin-svgr';

// Vite + Vitest configuration for the Xalians frontend.
//
// This replaced Create React App in Sept 2026 (issue #25). Everything below that
// looks like a shim exists to keep the source tree untouched: the migration is
// infrastructure only, so the config absorbs the CRA-isms rather than the code.

export default defineConfig(({ mode }) => ({
	plugins: [
		// 75 components carry JSX in `.js` files. Vite's default esbuild
		// transform only treats `.jsx`/`.tsx` as JSX, so `.js` needs a targeted
		// pre-transform rather than renaming them all. Using `esbuild.include`
		// on the root config instead would replace Vite's default filter
		// (rather than extend it), which then skips `.tsx` entirely and breaks
		// import analysis on every shadcn/system component.
		{
			name: 'jsx-in-js',
			enforce: 'pre',
			async transform(code, id) {
				if (!/\/src\/.*\.js$/.test(id.replace(/\\/g, '/'))) return null;
				return transformWithEsbuild(code, id, { loader: 'jsx', jsx: 'automatic' });
			},
		},

		// Tailwind 4 (docs/design/frontend-stack-migration.md): tokens and
		// utilities from src/styles; no tailwind.config.js.
		tailwindcss(),

		react(),

		// CRA-style `import { ReactComponent as X } from './x.svg'`. Named export
		// mode keeps the plain default import as a URL, `svgo: false` ships the
		// SVG markup exactly as drawn.
		svgr({
			svgrOptions: { exportType: 'named', ref: true, svgo: false, titleProp: true },
			include: '**/*.svg',
		}),
	],

	optimizeDeps: {
		esbuildOptions: {
			loader: { '.js': 'jsx' },
		},
	},

	resolve: {
		alias: { '@': path.resolve(__dirname, 'src') },
	},

	define: {
		// Amplify 4 reaches for Node's `global`; webpack polyfilled it, Vite
		// does not. `process.env.NODE_ENV` needs nothing: Vite replaces it itself.
		global: 'globalThis',
	},

	server: {
		// CRA's port, so the Cognito callback URLs and everyone's bookmarks
		// keep working.
		port: 3000,
	},

	build: {
		// CI and `npm run deploy` sync `build/` to S3. Keep CRA's directory.
		outDir: 'build',
		rollupOptions: {
			output: {
				// Auth is required by the global navbar, but it changes much less
				// often than application code. Give Amplify and its Cognito/AWS
				// dependency graph a stable cache boundary instead of baking that
				// whole graph into the entry chunk on every deploy.
				manualChunks: {
					'vendor-auth': ['@aws-amplify/core', '@aws-amplify/auth'],
				},
			},
		},
	},

	test: {
		globals: true,
		environment: 'jsdom',
		setupFiles: ['./src/setupTests.js'],
		// Same discovery rule react-scripts used.
		include: ['src/**/__tests__/**/*.js', 'src/**/*.{spec,test}.js'],
		// The game-data JSON in the @xalians/content workspace package is imported
		// by the engine code under test. Keep it in Vite's module graph rather than
		// handing it to Node's loader, which would demand `with { type: 'json' }`.
		// @xalians/rules ships TypeScript source with no build step (packages/rules,
		// B2 of the backend modernization plan); inline it too so Vitest transforms
		// the .ts files itself rather than handing them to Node's ESM loader.
		server: { deps: { inline: [/@xalians\/content\/.*\.json$/, /@xalians\/rules/] } },
	},
}));
