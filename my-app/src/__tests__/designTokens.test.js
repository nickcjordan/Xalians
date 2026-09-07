const fs = require('fs');
const path = require('path');
const colorConstants = require('../constants/colorConstants');
const designTokens = require('../constants/designTokens');

// The palette exists on both sides of the stack by necessity: CSS paints with
// custom properties, while recharts `fill` props, GSAP tweens and SVG
// attributes can only take a JS string. Nothing enforces that the two agree at
// runtime, so this does it at build time — edit a colour in one place and this
// fails naming the token that no longer matches.
//
// v3 ("one relay, many terminals", docs/DESIGN_SYSTEM.md) adds a material
// layer: one [data-terminal="..."] block per terminal, each redefining every
// material token. The parser below captures :root and every [data-terminal]
// block separately (a small non-nested brace parser — none of these blocks
// contain nested rules) and resolves var() chains so a token like
// `--g-vfd: var(--g-phosphor)` compares against its resolved colour, not the
// literal text "var(--g-phosphor)".

const SYSTEM_PATH = path.join(__dirname, '..', '..', 'public', 'assets', 'css', 'system.css');
const TYPE_COLORS_PATH = path.join(__dirname, '..', '..', 'public', 'assets', 'css', 'typeColors.css');

/** Parses :root and every [data-terminal="x"] block into { root: {...}, x: {...} }. */
const readBlocks = (css) => {
	const blocks = {};
	const blockRe = /(:root|\[data-terminal=(['"])([a-z]+)\2\])\s*\{([^}]*)\}/g;
	let match;
	while ((match = blockRe.exec(css)) !== null) {
		const key = match[1] === ':root' ? 'root' : match[3];
		const body = match[4];
		const map = blocks[key] || (blocks[key] = {});
		const propRe = /(--g-[a-z0-9-]+):\s*([^;]+);/g;
		let prop;
		while ((prop = propRe.exec(body)) !== null) {
			// only the first definition of a name within a block wins, matching
			// how the cascade would resolve a duplicate declaration
			if (!(prop[1] in map)) map[prop[1]] = prop[2].trim().toLowerCase();
		}
	}
	return blocks;
};

/** Resolves a token's value, following `var(--other-token)` chains up to the
 * terminal block first and falling back to :root, the way the cascade would. */
const resolveToken = (name, blockMap, rootMap, seen) => {
	seen = seen || new Set();
	if (seen.has(name)) return undefined;
	seen.add(name);
	const raw = blockMap && name in blockMap ? blockMap[name] : rootMap[name];
	if (raw === undefined) return undefined;
	const varMatch = raw.match(/^var\(\s*(--[a-z0-9-]+)\s*\)$/i);
	if (varMatch) return resolveToken(varMatch[1], blockMap, rootMap, seen);
	return raw;
};

const blocks = readBlocks(fs.readFileSync(SYSTEM_PATH, 'utf8'));
const rootBlock = blocks.root || {};

// Flat map used by the structural checks below (element colours, TYPE_COLORS
// hex ban); every value here is a raw :root declaration, none of which are
// var() references, so no resolution is needed for these specific checks.
const tokens = rootBlock;

const resolvedRoot = (name) => resolveToken(name, rootBlock, rootBlock);

const PAIRINGS = [
	['--g-void', designTokens.hull.void],
	['--g-hull-lo', designTokens.hull.lo],
	['--g-hull', designTokens.hull.base],
	['--g-hull-hi', designTokens.hull.hi],
	['--g-seam', designTokens.hull.seam],

	['--g-brass', designTokens.brass.base],
	['--g-brass-dark', designTokens.brass.dark],
	['--g-brass-light', designTokens.brass.light],

	['--g-team-one', designTokens.team.one],
	['--g-team-two', designTokens.team.two],

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

	// --- v3 material tokens, panel (:root) defaults --------------------------
	// --g-trim*/--g-accent* are the new names for --g-brass*/--g-hazard*, kept
	// as literal duplicates rather than var() aliases (see the comment in
	// system.css) so each pair can be checked independently here too.
	['--g-trim', designTokens.brass.base],
	['--g-trim-dark', designTokens.brass.dark],
	['--g-trim-light', designTokens.brass.light],
	['--g-accent', designTokens.hazard.base],
	['--g-accent-ink', designTokens.material.accentInk],

	['--g-glass', designTokens.phosphor.glass],
	['--g-vfd', designTokens.phosphor.base],
	['--g-vfd-glass', designTokens.phosphor.glass],

	['--g-paper', designTokens.ink.base],
	['--g-paper-ink', designTokens.hull.base],
	// Its own field, not designTokens.ink.low: see the comment on
	// material.paperInkFaint in designTokens.js (round1-findings.md S5).
	['--g-paper-ink-faint', designTokens.material.paperInkFaint],

	// The panel terminal's own face steps (round3-coherence.md "one room"):
	// :root aliases these to --g-hull-lo/--g-hull-hi, which is a no-op for
	// panel specifically (its object IS the hull), unlike every other
	// terminal, which sets its own literal face-lo/face-hi below.
	['--g-face-lo', designTokens.hull.lo],
	['--g-face-hi', designTokens.hull.hi],

	['--g-lamp-on', designTokens.phosphor.base],

	['--g-hull-hover', designTokens.material.hullHover],
	['--g-accent-hover', designTokens.material.accentHover],
	['--g-danger', designTokens.material.danger],
	['--g-danger-ink', designTokens.material.dangerInk],
	['--g-danger-edge', designTokens.material.dangerEdge],
	['--g-danger-hover', designTokens.material.dangerHover],
	['--g-check-on', designTokens.material.checkOn],
	['--g-hazard-stripe', designTokens.material.hazardStripe],

	['--g-readout-phosphor', designTokens.terminals.readout.phosphor],
	['--g-readout-glass', designTokens.terminals.readout.glass],
	['--g-readout-ink', designTokens.material.readoutInk],
	['--g-tab-ink', designTokens.material.tabInk],
];

// One entry per [data-terminal="x"] block: which CSS token carries which
// designTokens.terminals[x] field. "panel" has no CSS block of its own — its
// values live directly in :root — so it resolves against rootBlock/rootBlock
// the same way every other terminal falls back to :root for anything it does
// not redefine.
const TERMINAL_FIELD_TOKENS = {
	face: '--g-face',
	faceLo: '--g-face-lo',
	faceHi: '--g-face-hi',
	// Ink on the room is core, ink on the face is material (Rule A /
	// round3-coherence.md): the terminal block itself only ever sets
	// --g-face-ink*, never --g-ink* (the room's, inherited from :root).
	faceInk: '--g-face-ink',
	faceInkMid: '--g-face-ink-mid',
	faceInkLow: '--g-face-ink-low',
	trim: '--g-trim',
	accent: '--g-accent',
	glass: '--g-glass',
	phosphor: '--g-phosphor',
	vfd: '--g-vfd',
	paper: '--g-paper',
	paperInk: '--g-paper-ink',
	lampOn: '--g-lamp-on',
};

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
			expect(`${cssName}: ${resolvedRoot(cssName)}`).toEqual(`${cssName}: ${String(jsValue).toLowerCase()}`);
		});
	});

	describe('terminals (v3 material layer)', () => {
		it('designTokens.terminals has one entry per [data-terminal] block in system.css, plus panel', () => {
			const cssTerminals = Object.keys(blocks).filter((k) => k !== 'root').sort();
			expect(cssTerminals).toEqual(['archive', 'field', 'readout', 'registry', 'relay']);
			expect(Object.keys(designTokens.terminals).sort()).toEqual(['archive', 'field', 'panel', 'readout', 'registry', 'relay']);
		});

		const terminalNames = ['panel', 'field', 'relay', 'registry', 'archive', 'readout'];
		const cases = [];
		terminalNames.forEach((name) => {
			Object.entries(TERMINAL_FIELD_TOKENS).forEach(([field, cssVar]) => {
				cases.push([name, field, cssVar]);
			});
		});

		it.each(cases)('[data-terminal="%s"] %s (%s) matches designTokens.terminals', (name, field, cssVar) => {
			const blockMap = name === 'panel' ? rootBlock : blocks[name];
			const cssValue = resolveToken(cssVar, blockMap, rootBlock);
			const jsValue = designTokens.terminals[name][field];
			expect(`${name}.${field}: ${cssValue}`).toEqual(`${name}.${field}: ${String(jsValue).toLowerCase()}`);
		});
	});

	it('leaves no raw hex colours in the element colour utilities', () => {
		const css = fs.readFileSync(TYPE_COLORS_PATH, 'utf8');
		const strippedComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
		expect(strippedComments.match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull();
	});
});
