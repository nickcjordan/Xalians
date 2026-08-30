const fs = require('fs');
const path = require('path');
const colorConstants = require('../constants/colorConstants');
const designTokens = require('../constants/designTokens');

// The palette exists on both sides of the stack by necessity: CSS classes paint
// with custom properties, while recharts `fill` props, GSAP tweens and SVG
// attributes can only take a JS string. Nothing enforces that the two agree at
// runtime, so this test does it at build time - edit a colour in one place and
// this fails naming the token that no longer matches.

const TOKENS_PATH = path.join(__dirname, '..', '..', 'public', 'assets', 'css', 'tokens.css');
const TYPE_COLORS_PATH = path.join(__dirname, '..', '..', 'public', 'assets', 'css', 'typeColors.css');

const readAllTokens = () => {
	const css = fs.readFileSync(TOKENS_PATH, 'utf8');
	const tokens = {};
	const re = /(--x-[a-z0-9-]+):\s*([^;]+);/g;
	let match;
	while ((match = re.exec(css)) !== null) {
		tokens[match[1]] = match[2].trim().toLowerCase();
	}
	return tokens;
};

const tokens = readAllTokens();

// Each entry maps a JS token to the CSS custom property that must match it.
const PAIRINGS = [
	['--x-green', designTokens.brand.green],
	['--x-green-hover', designTokens.brand.greenHover],
	['--x-green-active', designTokens.brand.greenActive],
	['--x-green-border', designTokens.brand.greenBorder],

	['--x-bg', designTokens.surface.bg],
	['--x-surface-1', designTokens.surface.surface1],
	['--x-surface-2', designTokens.surface.surface2],
	['--x-surface-3', designTokens.surface.surface3],
	['--x-border', designTokens.surface.border],
	['--x-border-strong', designTokens.surface.borderStrong],

	['--x-text', designTokens.text.primary],
	['--x-text-muted', designTokens.text.muted],
	['--x-text-dim', designTokens.text.dim],
	['--x-text-inverse', designTokens.text.inverse],

	['--x-danger', designTokens.feedback.danger],
	['--x-warning', designTokens.feedback.warning],

	['--x-stat-standard-attack', designTokens.stat.standardAttack],
	['--x-stat-special-attack', designTokens.stat.specialAttack],
	['--x-stat-standard-defense', designTokens.stat.standardDefense],
	['--x-stat-special-defense', designTokens.stat.specialDefense],
	['--x-stat-speed', designTokens.stat.speed],
	['--x-stat-evasion', designTokens.stat.evasion],
	['--x-stat-stamina', designTokens.stat.stamina],
	['--x-stat-recovery', designTokens.stat.recovery],

	['--x-chart-range-track', designTokens.chart.rangeTrack],
	['--x-chart-points-fill', designTokens.chart.pointsFill],
	['--x-chart-bar-label', designTokens.chart.barLabel],
	['--x-chart-cursor-fill', designTokens.chart.cursorFill],
	['--x-chart-axis', designTokens.chart.axis],
];

describe('design tokens', () => {

	describe('element colours', () => {
		const typeTokens = Object.fromEntries(
			Object.entries(tokens)
				.filter(([name]) => name.startsWith('--x-type-'))
				.map(([name, value]) => [name.replace('--x-type-', ''), value])
		);

		it('defines a --x-type-* token for every element in colorConstants', () => {
			expect(Object.keys(typeTokens).sort()).toEqual(Object.keys(colorConstants.themeColors).sort());
		});

		it('matches colorConstants exactly, so CSS and JS paint the same colours', () => {
			Object.entries(colorConstants.themeColors).forEach(([type, hex]) => {
				expect(`${type}: ${typeTokens[type]}`).toEqual(`${type}: ${hex.toLowerCase()}`);
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
