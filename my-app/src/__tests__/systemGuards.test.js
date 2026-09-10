const fs = require('fs');
const path = require('path');

/**
 * Guards for the version 4 system on the shadcn/Tailwind stack
 * (docs/DESIGN_SYSTEM.md section 12, docs/design/frontend-stack-migration.md):
 *
 *  1. Every component file under src/components/ui and src/components/system
 *     is rendered on /styleguide (imported by styleGuidePage.tsx or one of
 *     the section files under src/pages/styleguide/). A component the style
 *     guide does not show is a component the next page will rebuild.
 *  2. No chrome-tier file (a page or component carrying data-tier="chrome",
 *     plus everything under ui/ and system/) uses a raw hex color, a version 3
 *     `.g-*` class, a Bootstrap import or icon font. The legacy stylesheets
 *     are read only by the immersive pages until their briefs.
 */

const SRC = path.join(__dirname, '..');
const UI_DIR = path.join(SRC, 'components', 'ui');
const SYSTEM_DIR = path.join(SRC, 'components', 'system');
const STYLEGUIDE_PAGE = path.join(SRC, 'pages', 'styleGuidePage.tsx');
const STYLEGUIDE_DIR = path.join(SRC, 'pages', 'styleguide');

const read = (p) => fs.readFileSync(p, 'utf8');

const walk = (dir, out = []) => {
	if (!fs.existsSync(dir)) return out;
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) walk(full, out);
		else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) out.push(full);
	}
	return out;
};

const rel = (p) => path.relative(SRC, p).split(path.sep).join('/');

/** Source of everything the style guide renders: the page plus its section files. */
const styleguideSource = () =>
	[STYLEGUIDE_PAGE, ...walk(STYLEGUIDE_DIR)].map(read).join('\n');

describe('every component is on /styleguide', () => {
	// Mounted once in App.js for the whole site, so the style guide cannot
	// render a second one; toast() calls prove it instead.
	const APP_WIDE = ['components/ui/sonner.tsx'];
	const components = [...walk(UI_DIR), ...walk(SYSTEM_DIR)]
		.filter((f) => !/\.d\.ts$/.test(f))
		.filter((f) => !APP_WIDE.includes(rel(f)));
	const source = styleguideSource();

	it('finds the component folders', () => {
		expect(components.length).toBeGreaterThan(20);
	});

	components.forEach((file) => {
		const importPath = '@/' + rel(file).replace(/\.(tsx|ts|jsx|js)$/, '');
		it(`${rel(file)} is imported by the style guide`, () => {
			expect(source.includes(`'${importPath}'`) || source.includes(`"${importPath}"`)).toBe(true);
		});
	});
});

describe('chrome files stay on the version 4 stack', () => {
	const chromeFiles = [
		...walk(UI_DIR),
		...walk(SYSTEM_DIR),
		...walk(path.join(SRC, 'pages')),
		...walk(path.join(SRC, 'components')),
	].filter((f, i, arr) => arr.indexOf(f) === i)
		.filter((f) => {
			if (f.startsWith(UI_DIR) || f.startsWith(SYSTEM_DIR)) return true;
			return read(f).includes('data-tier="chrome"');
		});

	it('finds chrome files', () => {
		expect(chromeFiles.length).toBeGreaterThan(30);
	});

	// 3, 6 or 8 hex digits, so a record number like #00015 is not a color.
	const RAW_HEX = /#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})(?![0-9a-zA-Z])/;
	const V3_CLASS = /(^|[\s"'`{(])g-[a-z]/;
	const BOOTSTRAP = /from\s+['"]react-bootstrap|['"]bootstrap\/|\bbi bi-|\bbx bx|\bri-[a-z]/;

	chromeFiles.forEach((file) => {
		const name = rel(file);
		const src = read(file);
		it(`${name} has no raw hex color`, () => {
			const hit = src.split('\n').find((line) => RAW_HEX.test(line) && !/^\s*(\/\/|\*|\/\*)/.test(line));
			expect(hit, hit).toBeUndefined();
		});
		it(`${name} has no version 3 .g-* class`, () => {
			const hit = src.split('\n').find((line) => /className|class=/.test(line) && V3_CLASS.test(line));
			expect(hit, hit).toBeUndefined();
		});
		it(`${name} has no Bootstrap import or icon font`, () => {
			const hit = src.split('\n').find((line) => BOOTSTRAP.test(line));
			expect(hit, hit).toBeUndefined();
		});
	});
});
