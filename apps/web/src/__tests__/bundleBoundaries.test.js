const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..');

function sourceFiles(dir) {
	return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) return sourceFiles(fullPath);
		return /\.(?:js|jsx|ts|tsx)$/.test(entry.name) ? [fullPath] : [];
	});
}

describe('production bundle boundaries', () => {
	it('keeps the Amplify root configurator out of feature modules', () => {
		const barrelImport = /^\s*import\s+(?:[^'\"]+\s+from\s+)?['\"]aws-amplify['\"];?/m;
		const offenders = sourceFiles(SRC_DIR)
			.filter((file) => !file.includes(`${path.sep}__tests__${path.sep}`))
			.filter((file) => barrelImport.test(fs.readFileSync(file, 'utf8')))
			.map((file) => path.relative(SRC_DIR, file).split(path.sep).join('/'));

		expect(offenders).toEqual(['App.js']);
	});

	it('keeps the home page behind its route boundary', () => {
		const app = fs.readFileSync(path.join(SRC_DIR, 'App.js'), 'utf8');

		expect(app).toContain("const Home = lazy(() => import('./pages/home'));");
		expect(app).not.toMatch(/^import\s+Home\s+from\s+['\"]\.\/pages\/home['\"];?/m);
	});

	it('builds Home from the compact generated content contract', () => {
		const home = fs.readFileSync(path.join(SRC_DIR, 'pages', 'home.tsx'), 'utf8');

		expect(home).toContain("from 'virtual:xalians-home-data'");
		expect(home).not.toMatch(/from ['\"]\.\.\/lore/);
		expect(home).not.toMatch(/@xalians\/content\/(?:species|planetRecords)\.json/);
	});

	it('keeps species art lazy by format and species', () => {
		const registry = fs.readFileSync(path.join(SRC_DIR, 'svg', 'species', 'xalianSvg.js'), 'utf8');

		expect(registry).toContain("import.meta.glob('./token/*.svg', {");
		expect(registry).not.toMatch(/import\.meta\.glob\('\.\/token\/\*\.svg',[\s\S]*?eager:\s*true/);
	});
});
