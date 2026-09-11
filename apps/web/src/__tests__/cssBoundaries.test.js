const fs = require('fs');
const path = require('path');

const WEB_ROOT = path.resolve(__dirname, '../..');
const SRC_ROOT = path.join(WEB_ROOT, 'src');

const read = (relativePath) => fs.readFileSync(path.join(WEB_ROOT, relativePath), 'utf8');

function sourceFiles(dir) {
	return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) return sourceFiles(fullPath);
		return /\.(?:js|jsx|ts|tsx)$/.test(entry.name) ? [fullPath] : [];
	});
}

describe('legacy CSS ownership boundaries', () => {
	it('does not link route-owned styles from the application shell', () => {
		const html = read('index.html');

		expect(html).not.toMatch(/legacy\/(?:duel|duel-playground|reclamation)\.css/);
	});

	const ownership = {
		'duel.css': [
			'pages/games/duelPage.js',
			'pages/games/duelPlaygroundPage.js',
		],
		'duel-playground.css': ['pages/games/duelPlaygroundPage.js'],
		'reclamation.css': ['pages/games/reclamationPage.js'],
	};

	Object.entries(ownership).forEach(([stylesheet, expectedOwners]) => {
		it(`${stylesheet} is imported only by its documented route entries`, () => {
			const importPattern = new RegExp(`styles/legacy/${stylesheet.replace('.', '\\.')}['"]`);
			const owners = sourceFiles(SRC_ROOT)
				.filter((file) => importPattern.test(fs.readFileSync(file, 'utf8')))
				.map((file) => path.relative(SRC_ROOT, file).split(path.sep).join('/'))
				.sort();

			expect(owners).toEqual([...expectedOwners].sort());
		});
	});
});
