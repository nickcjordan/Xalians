const fs = require('fs');
const path = require('path');
const colorConstants = require('../constants/colorConstants');
const designTokens = require('../constants/designTokens');

// The palette exists on both sides of the stack by necessity: CSS paints with
// custom properties, while recharts `fill` props, GSAP tweens and SVG
// attributes can only take a JS string. Nothing enforces that the two agree at
// runtime, so this does it at build time — edit a colour in one place and this
// fails naming the token that no longer matches.

const SYSTEM_PATH = path.join(__dirname, '..', '..', 'public', 'assets', 'css', 'system.css');
const TYPE_COLORS_PATH = path.join(__dirname, '..', '..', 'public', 'assets', 'css', 'typeColors.css');

const readTokens = () => {
	const css = fs.readFileSync(SYSTEM_PATH, 'utf8');
	const tokens = {};
	const re = /(--g-[a-z0-9-]+):\s*([^;]+);/g;
	let match;
	while ((match = re.exec(css)) !== null) {
		// only the first definition wins, matching the cascade in :root
		if (!(match[1] in tokens)) {
			tokens[match[1]] = match[2].trim().toLowerCase();
		}
	}
	return tokens;
};

const tokens = readTokens();

const PAIRINGS = [
	['--g-void', designTokens.hull.void],
	['--g-hull-lo', designTokens.hull.lo],
	['--g-hull', designTokens.hull.base],
	['--g-hull-hi', designTokens.hull.hi],
	['--g-seam', designTokens.hull.seam],

	['--g-brass', designTokens.brass.base],
	['--g-brass-dark', designTokens.brass.dark],
	['--g-brass-light', designTokens.brass.light],

	['--g-ink', designTokens.ink.base],
	['--g-ink-mid', designTokens.ink.mid],
	['--g-ink-low', designTokens.ink.low],
	['--g-ink-invert', designTokens.ink.invert],

	['--g-phosphor', designTokens.phosphor.base],
	['--g-screen-glass', designTokens.phosphor.glass],

	['--g-lamp-amber', designTokens.lamp.amber],
	['--g-lamp-red', designTokens.lamp.red],
	['--g-lamp-off', designTokens.lamp.off],

	['--g-hazard', designTokens.hazard.base],
	['--g-hazard-dark', designTokens.hazard.dark],

	['--g-stat-standard-attack', designTokens.stat.standardAttack],
	['--g-stat-special-attack', designTokens.stat.specialAttack],
	['--g-stat-standard-defense', designTokens.stat.standardDefense],
	['--g-stat-special-defense', designTokens.stat.specialDefense],
	['--g-stat-speed', designTokens.stat.speed],
	['--g-stat-evasion', designTokens.stat.evasion],
	['--g-stat-stamina', designTokens.stat.stamina],
	['--g-stat-recovery', designTokens.stat.recovery],

	['--g-chart-range-track', designTokens.chart.rangeTrack],
	['--g-chart-points-fill', designTokens.chart.pointsFill],
	['--g-chart-bar-label', designTokens.chart.barLabel],
	['--g-chart-cursor-fill', designTokens.chart.cursorFill],
	['--g-chart-axis', designTokens.chart.axis],
];

describe('design tokens', () => {

	describe('element colours', () => {
		const elementTokens = Object.fromEntries(
			Object.entries(tokens)
				.filter(([name]) => name.startsWith('--g-el-'))
				.map(([name, value]) => [name.replace('--g-el-', ''), value])
		);

		it('defines a --g-el-* token for every element in colorConstants', () => {
			expect(Object.keys(elementTokens).sort()).toEqual(Object.keys(colorConstants.themeColors).sort());
		});

		it('matches colorConstants exactly, so CSS and JS paint the same colours', () => {
			Object.entries(colorConstants.themeColors).forEach(([type, hex]) => {
				expect(`${type}: ${elementTokens[type]}`).toEqual(`${type}: ${hex.toLowerCase()}`);
			});
		});
	});

	describe('palette', () => {
		it.each(PAIRINGS)('%s matches its designTokens.js value', (cssName, jsValue) => {
			expect(`${cssName}: ${tokens[cssName]}`).toEqual(`${cssName}: ${String(jsValue).toLowerCase()}`);
		});
	});

	it('leaves no raw hex colours in the element colour utilities', () => {
		const css = fs.readFileSync(TYPE_COLORS_PATH, 'utf8');
		const strippedComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
		expect(strippedComments.match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull();
	});
});
