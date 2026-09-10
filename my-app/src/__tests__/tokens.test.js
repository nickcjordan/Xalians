const fs = require('fs');
const path = require('path');
import * as colorConstants from '../constants/colorConstants';
import * as designTokens from '../constants/designTokens';

// The palette lives twice on purpose (docs/DESIGN_SYSTEM.md section 3.5):
// src/styles/tokens.css paints the page through Tailwind, and
// src/constants/designTokens.js hands the same values to recharts fills,
// GSAP tweens and SVG attributes, which cannot read a CSS variable. This
// test fails naming the token that no longer matches.

const TOKENS_PATH = path.join(__dirname, '..', 'styles', 'tokens.css');
const css = fs.readFileSync(TOKENS_PATH, 'utf8');

const theme = {};
const themeBlock = css.slice(css.indexOf('@theme {'));
const propRe = /(--[a-z0-9-]+):\s*([^;]+);/g;
let m;
while ((m = propRe.exec(themeBlock)) !== null) {
	if (!(m[1] in theme)) theme[m[1]] = m[2].trim().toLowerCase();
}

const PAIRINGS = [
	['--color-room', designTokens.v4.room],
	['--color-s0', designTokens.v4.s0],
	['--color-s1', designTokens.v4.s1],
	['--color-s2', designTokens.v4.s2],
	['--color-s3', designTokens.v4.s3],
	['--color-glass', designTokens.v4.glass],
	['--color-edge', designTokens.v4.edge],
	['--color-edge-hi', designTokens.v4.edgeHi],
	['--color-edge-strong', designTokens.v4.edgeStrong],
	['--color-glass-edge', designTokens.v4.glassEdge],
	['--color-ink', designTokens.v4.ink],
	['--color-ink-2', designTokens.v4.ink2],
	['--color-ink-3', designTokens.v4.ink3],
	['--color-ink-4', designTokens.v4.ink4],
	['--color-viable-hi', designTokens.v4.viableHi],
	['--color-viable', designTokens.v4.viable],
	['--color-viable-lo', designTokens.v4.viableLo],
	['--color-viable-tint', designTokens.v4.viableTint],
	['--color-viable-ink', designTokens.v4.viableInk],
	['--color-plague', designTokens.v4.plague],
	['--color-plague-tint', designTokens.v4.plagueTint],
	['--color-plague-ink', designTokens.v4.plagueInk],
	['--color-caution', designTokens.v4.caution],
	['--color-caution-tint', designTokens.v4.cautionTint],
	['--color-neutral', designTokens.v4.neutralStatus],
];

describe('tailwind tokens (src/styles/tokens.css)', () => {
	it('defines a --color-el-* token for every element in colorConstants', () => {
		Object.keys(colorConstants.themeColors).forEach((el) => {
			expect(theme[`--color-el-${el}`]).toBeDefined();
		});
	});

	it('paints every element hue with the same value as colorConstants', () => {
		Object.entries(colorConstants.themeColors).forEach(([el, hex]) => {
			expect({ el, css: theme[`--color-el-${el}`] }).toEqual({ el, css: hex.toLowerCase() });
		});
	});

	PAIRINGS.forEach(([token, js]) => {
		it(`${token} equals its designTokens.js value`, () => {
			expect(theme[token]).toBe(String(js).toLowerCase());
		});
	});

	it('removes the stock Tailwind palette, radii, shadows and breakpoints', () => {
		['--color-*', '--radius-*', '--shadow-*', '--breakpoint-*'].forEach((reset) => {
			expect(themeBlock).toContain(`${reset}: initial;`);
		});
	});

	it('is the only stylesheet under src with a raw hex color', () => {
		const walk = (dir) =>
			fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
				d.isDirectory() ? walk(path.join(dir, d.name)) : d.name.endsWith('.css') ? [path.join(dir, d.name)] : []
			);
		const offenders = walk(path.join(__dirname, '..', 'styles'))
			.filter((p) => path.basename(p) !== 'tokens.css')
			.filter((p) => /#[0-9a-f]{3,8}\b/i.test(fs.readFileSync(p, 'utf8')));
		expect(offenders).toEqual([]);
	});
});
