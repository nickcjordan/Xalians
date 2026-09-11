const fs = require('fs');
const path = require('path');

const WEB_ROOT = path.resolve(__dirname, '../..');
const SRC_ROOT = path.join(WEB_ROOT, 'src');

const read = (relativePath) => fs.readFileSync(path.join(WEB_ROOT, relativePath), 'utf8');

function sourceFiles(dir) {
	return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(fullPath);
		return /\.(?:js|jsx|ts|tsx)$/.test(entry.name) ? [fullPath] : [];
	});
}

describe('legacy CSS ownership boundaries', () => {
	it('does not link route-owned styles from the application shell', () => {
		const html = read('index.html');

		expect(html).not.toMatch(/assets\/css\/legacy/);
		expect(html).not.toMatch(/(?:tokens|system|style|typeColors|duel|duel-playground|reclamation)\.css/);
	});

	const ownership = {
		'immersive.css': [
			'pages/games/duelPage.js',
			'pages/games/duelPlaygroundPage.js',
			'pages/games/longReturnPage.js',
			'pages/games/matchCardGamePage.js',
			'pages/games/physicsGamePage.js',
			'pages/games/reclamationPage.js',
		],
		'training.css': [
			'pages/games/matchCardGamePage.js',
			'pages/games/physicsGamePage.js',
		],
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

	it('keeps the shared immersive cascade in its documented order', () => {
		const css = read('src/styles/legacy/immersive.css');
		const imports = [...css.matchAll(/@import ['"]\.\/([^'"]+)['"]/g)].map((match) => match[1]);

		expect(imports).toEqual(['tokens.css', 'system.css', 'style.css']);
	});

	it('keeps the retired element-colour utility contract deleted', () => {
		const retiredCss = path.join(WEB_ROOT, 'src', 'styles', 'legacy', 'typeColors.css');
		const badge = read('src/components/games/duel/board/xalianTypeSymbolBadge.js');
		const executableSource = sourceFiles(SRC_ROOT)
			.map((file) => fs.readFileSync(file, 'utf8'))
			.join('\n');
		const retiredLiteral = /(?:fire|water|air|electric|rock|plant|chemical|light|dark|metal|psychic|ghost|ice|sand)-(?:text-|border-)?color/;

		expect(fs.existsSync(retiredCss)).toBe(false);
		expect(executableSource).not.toMatch(retiredLiteral);
		expect(badge).not.toContain("toLowerCase()}-color");
	});

	it('keeps training board geometry out of the shared immersive stylesheet', () => {
		const sharedCss = read('src/styles/legacy/style.css');
		const trainingCss = read('src/styles/legacy/training.css');
		const trainingSelectors = [
			'.match-card-game-wrapper',
			'.match-game-card-flipped',
			'.game-container',
			'.physics-controls',
			'.physics-arena',
			'.physics-target',
		];

		trainingSelectors.forEach((selector) => {
			expect(sharedCss).not.toContain(selector);
			expect(trainingCss).toContain(selector);
		});
	});

	it('does not leave compatibility styles in the public tree', () => {
		const publicLegacy = path.join(WEB_ROOT, 'public', 'assets', 'css', 'legacy');
		const publicCss = fs.existsSync(publicLegacy)
			? fs.readdirSync(publicLegacy).filter((file) => file.endsWith('.css'))
			: [];
		expect(publicCss).toEqual([]);
	});

	it('keeps retired landing-page template sections and their assets deleted', () => {
		const css = read('src/styles/legacy/style.css');
		const retiredSectionMarkers = [
			'# Custom Theme',
			'# Preloader',
			'# Disable aos animation delay on mobile devices',
			'# Splash Section',
			'# Planet Xalia Section',
			'# Tokens Section',
			'# Team',
			'# Story',
			'# Contact',
			'# Breadcrumbs',
			'# Footer',
		];

		retiredSectionMarkers.forEach((marker) => expect(css).not.toContain(marker));
		expect(css).not.toContain('ProcrastinatingPixie');
		expect(css).not.toContain('vault.jpg');
		expect(fs.existsSync(path.join(WEB_ROOT, 'public/assets/css/fonts/ProcrastinatingPixie-WyVOO.ttf'))).toBe(false);
		expect(fs.existsSync(path.join(WEB_ROOT, 'public/assets/fonts/ProcrastinatingPixie-WyVOO.ttf'))).toBe(false);
		expect(fs.existsSync(path.join(WEB_ROOT, 'public/assets/img/background/vault.jpg'))).toBe(false);
	});

	it('keeps the retired Bootstrap navbar contract out of shared CSS', () => {
		const styleCss = read('src/styles/legacy/style.css');
		const systemCss = read('src/styles/legacy/system.css');
		const navbarSource = read('src/components/navbar.tsx');
		const retiredSelectors = [
			'.xalian-navbar',
			'.navbar-mobile',
			'.mobile-nav-toggle',
			'.navbar-auth-button-wrapper',
			'.username-navbar-link',
			'.xalian-generator-navbar-button',
		];

		retiredSelectors.forEach((selector) => {
			expect(styleCss).not.toContain(selector);
			expect(systemCss).not.toContain(selector);
		});
		expect(styleCss).not.toContain('# Navigation Menu');
		expect(systemCss).not.toContain('CONSOLE HEADER');
		expect(navbarSource).not.toContain('react-bootstrap');
	});
});
