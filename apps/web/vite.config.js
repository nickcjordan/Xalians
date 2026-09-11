import { defineConfig, transformWithEsbuild } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import svgr from 'vite-plugin-svgr';

const HOME_DATA_ID = 'virtual:xalians-home-data';
const RESOLVED_HOME_DATA_ID = `\0${HOME_DATA_ID}`;

function homeSummaryData() {
	return {
		name: 'home-summary-data',
		resolveId(id) {
			return id === HOME_DATA_ID ? RESOLVED_HOME_DATA_ID : null;
		},
		load(id) {
			if (id !== RESOLVED_HOME_DATA_ID) return null;

			const contentDir = path.resolve(__dirname, '../../packages/content/json');
			const planetRecords = JSON.parse(fs.readFileSync(path.join(contentDir, 'planetRecords.json'), 'utf8'));
			const speciesRecords = JSON.parse(fs.readFileSync(path.join(contentDir, 'species.json'), 'utf8'));

			const worlds = planetRecords.map(({ key, name, element, images }) => {
				if (!key || !name || !element || !images?.planet) {
					throw new Error(`Home world summary is missing a required field: ${name || key || 'unknown world'}`);
				}
				return { key, name, element, planetImage: images.planet };
			});
			const species = speciesRecords.map(({ id, name, type }) => {
				if (!id || !name || !type) {
					throw new Error(`Home species summary is missing a required field: ${name || id || 'unknown species'}`);
				}
				return { id, name, type };
			});

			return `export const worlds = ${JSON.stringify(worlds)};\nexport const species = ${JSON.stringify(species)};`;
		},
	};
}

// Vite + Vitest configuration for the Xalians frontend.
//
// This replaced Create React App in Sept 2026 (issue #25). Everything below that
// looks like a shim exists to keep the source tree untouched: the migration is
// infrastructure only, so the config absorbs the CRA-isms rather than the code.

export default defineConfig(({ mode }) => ({
	plugins: [
		// The front page needs only four world fields and three species fields.
		// Derive that compact module from the canonical content at build/test time
		// so Home does not download the encyclopedia graph and editors never have
		// a second data source to keep synchronized.
		homeSummaryData(),

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

	server: {
		// CRA's port, so the Cognito callback URLs and everyone's bookmarks
		// keep working.
		port: 3000,
	},

	build: {
		// CI and `npm run deploy` sync `build/` to S3. Keep CRA's directory.
		outDir: 'build',
		// /styleguide intentionally imports every real design-system primitive in
		// one lazy, developer-only reference route. It is currently ~522 kB and is
		// never in a player route's initial graph; keep warnings meaningful for a
		// materially larger regression instead of warning on that known boundary.
		chunkSizeWarningLimit: 550,
		rollupOptions: {
			output: {
				// Auth is required by the global navbar, but it changes much less
				// often than application code. Give Amplify and its Cognito/AWS
				// dependency graph a stable cache boundary instead of baking that
				// whole graph into the entry chunk on every deploy.
				manualChunks(id) {
					const normalized = id.replace(/\\/g, '/');
					if (normalized.includes('/node_modules/aws-amplify/') || normalized.includes('/node_modules/@aws-amplify/')) {
						return 'vendor-auth';
					}
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
