import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import commonjsShim from './vite/commonjsShim.js';

// Vite + Vitest configuration for the Xalians frontend.
//
// This replaced Create React App in Sept 2026 (issue #25). Everything below that
// looks like a shim exists to keep the source tree untouched: the migration is
// infrastructure only, so the config absorbs the CRA-isms rather than the code.

export default defineConfig(({ mode }) => ({
	plugins: [
		// The few CommonJS files inside src (lambda copies, one vendored UMD lib).
		// See vite/commonjsShim.js.
		commonjsShim(),

		react(),

		// CRA-style `import { ReactComponent as X } from './x.svg'`. Named export
		// mode keeps the plain default import as a URL, `svgo: false` ships the
		// SVG markup exactly as drawn.
		svgr({
			svgrOptions: { exportType: 'named', ref: true, svgo: false, titleProp: true },
			include: '**/*.svg',
		}),
	],

	// 75 components carry JSX in `.js` files. Treat every `.js` under src as JSX
	// rather than renaming them all.
	esbuild: {
		include: /\/src\/.*\.[jt]sx?$/,
		// Vite's default exclude is /\.js$/, which would silently undo the
		// include above; an empty list is what actually lets .js through.
		exclude: [],
		loader: 'jsx',
	},
	optimizeDeps: {
		esbuildOptions: {
			loader: { '.js': 'jsx' },
		},
	},

	define: {
		// aws-amplify 4 reaches for Node's `global`; webpack polyfilled it, Vite
		// does not. `process.env.NODE_ENV` needs nothing: Vite replaces it itself.
		global: 'globalThis',
	},

	server: {
		// CRA's port, so the Cognito callback URLs and everyone's bookmarks
		// keep working.
		port: 3000,
	},

	build: {
		// CI and `yarn deploy` sync `build/` to S3. Keep CRA's directory.
		outDir: 'build',
	},

	test: {
		globals: true,
		environment: 'jsdom',
		setupFiles: ['./src/setupTests.js'],
		// Same discovery rule react-scripts used.
		include: ['src/**/__tests__/**/*.js', 'src/**/*.{spec,test}.js'],
		// The game-data JSON copied into src/json is imported by the engine code
		// under test. Keep it in Vite's module graph rather than handing it to
		// Node's loader, which would demand `with { type: 'json' }`.
		server: { deps: { inline: [/\/src\/json\/.*\.json$/] } },
	},
}));
