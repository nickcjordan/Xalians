const fs = require('fs');
const path = require('path');
const colorConstants = require('../constants/colorConstants');

// Element colours exist twice by necessity: CSS classes paint with them, and the
// JS side (charts, SVG, inline glow styles) reads them from colorConstants.
// Nothing enforces that at runtime, so this test does - a palette edit made in
// only one of the two places fails here rather than silently splitting the
// site's colours in half.

const TOKENS_PATH = path.join(__dirname, '..', '..', 'public', 'assets', 'css', 'tokens.css');
const TYPE_COLORS_PATH = path.join(__dirname, '..', '..', 'public', 'assets', 'css', 'typeColors.css');

const readTokens = () => {
	const css = fs.readFileSync(TOKENS_PATH, 'utf8');
	const tokens = {};
	const re = /--x-type-([a-z]+):\s*([^;]+);/g;
	let match;
	while ((match = re.exec(css)) !== null) {
		tokens[match[1]] = match[2].trim().toLowerCase();
	}
	return tokens;
};

describe('design tokens', () => {
	const tokens = readTokens();

	it('defines a --x-type-* token for every element in colorConstants', () => {
		expect(Object.keys(tokens).sort()).toEqual(Object.keys(colorConstants.themeColors).sort());
	});

	it('matches colorConstants exactly, so CSS and JS paint the same colours', () => {
		Object.entries(colorConstants.themeColors).forEach(([type, hex]) => {
			expect(`${type}: ${tokens[type]}`).toEqual(`${type}: ${hex.toLowerCase()}`);
		});
	});

	it('leaves no raw hex colours in the element colour utilities', () => {
		const css = fs.readFileSync(TYPE_COLORS_PATH, 'utf8');
		const strippedComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
		expect(strippedComments.match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull();
	});
});
