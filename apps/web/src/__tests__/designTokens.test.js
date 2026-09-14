const fs = require('fs');
const path = require('path');
import * as colorConstants from '../constants/colorConstants';
import * as designTokens from '../constants/designTokens';

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

const SYSTEM_PATH = path.join(__dirname, '..', 'styles', 'legacy', 'system.css');

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

// Flat map used by the structural element-colour checks below. Every value
// here is a raw :root declaration, none of which are var() references, so no
// resolution is needed for these specific checks.
const tokens = rootBlock;

const resolvedRoot = (name) => resolveToken(name, rootBlock, rootBlock);

const PAIRINGS = [
	// --- v4 primitives (docs/DESIGN_SYSTEM.md section 3) --------------------
	['--g-room', designTokens.v4.room],
	['--g-s0', designTokens.v4.s0],
	['--g-s1', designTokens.v4.s1],
	['--g-s2', designTokens.v4.s2],
	['--g-s3', designTokens.v4.s3],
	['--g-glass', designTokens.v4.glass],
	['--g-edge', designTokens.v4.edge],
	['--g-edge-hi', designTokens.v4.edgeHi],
	['--g-edge-strong', designTokens.v4.edgeStrong],
	['--g-glass-edge', designTokens.v4.glassEdge],
	['--g-ink', designTokens.v4.ink],
	['--g-ink-2', designTokens.v4.ink2],
	['--g-ink-3', designTokens.v4.ink3],
	['--g-ink-4', designTokens.v4.ink4],
	['--g-viable-hi', designTokens.v4.viableHi],
	['--g-viable', designTokens.v4.viable],
	['--g-viable-lo', designTokens.v4.viableLo],
	['--g-viable-tint', designTokens.v4.viableTint],
	['--g-viable-ink', designTokens.v4.viableInk],
	['--g-plague', designTokens.v4.plague],
	['--g-plague-tint', designTokens.v4.plagueTint],
	['--g-plague-ink', designTokens.v4.plagueInk],
	['--g-caution', designTokens.v4.caution],
	['--g-caution-tint', designTokens.v4.cautionTint],
	['--g-neutral-status', designTokens.v4.neutralStatus],

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

	// Repointed with --g-hazard (docs/DESIGN_SYSTEM.md section 13, hazard
	// livery deliberately avoided in v4): now reads the viable fill.
	['--g-hazard', designTokens.v4.viable],
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
	// Repointed with --g-accent/--g-accent-ink (docs/DESIGN_SYSTEM.md section
	// 3): the panel default is now the v4 viable accent, not the retired
	// hazard yellow.
	['--g-accent', designTokens.v4.viable],
	['--g-accent-ink', designTokens.material.accentInk],

	// --g-glass is declared once, as the v4 primitive (see the comment in
	// system.css); the panel terminal has no block of its own, so it reads
	// this default too.
	['--g-glass', designTokens.v4.glass],
	['--g-vfd', designTokens.phosphor.base],
	['--g-vfd-glass', designTokens.phosphor.glass],

	// --g-paper/--g-paper-ink keep their own v3 literal values (unrelated to
	// the v4 ink/hull repoint above); designTokens.terminals.panel carries
	// the same literals for the per-terminal check below.
	['--g-paper', designTokens.terminals.panel.paper],
	['--g-paper-ink', designTokens.terminals.panel.paperInk],
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

const relativeLuminance = (hex) => {
	const channels = hex.slice(1).match(/../g).map((value) => parseInt(value, 16) / 255);
	const linear = channels.map((value) => value <= 0.03928
		? value / 12.92
		: ((value + 0.055) / 1.055) ** 2.4);
	return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
};

const contrastRatio = (foreground, background) => {
	const foregroundLuminance = relativeLuminance(foreground);
	const backgroundLuminance = relativeLuminance(background);
	return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05)
		/ (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
};

describe('v4 text contrast', () => {
	const textInks = ['ink', 'ink2', 'ink3'];
	const surfaces = ['room', 's0', 's1', 's2', 's3'];

	it.each(textInks.flatMap((ink) => surfaces.map((surface) => [ink, surface])))
		('%s clears 4.5:1 on %s', (ink, surface) => {
			expect(contrastRatio(designTokens.v4[ink], designTokens.v4[surface])).toBeGreaterThanOrEqual(4.5);
		});

	it('every terminal accent carries readable text', () => {
		const terminalBlocks = ['root', 'field', 'registry', 'archive', 'relay', 'readout'];
		terminalBlocks.forEach((name) => {
			const block = name === 'root' ? rootBlock : blocks[name];
			const accent = resolveToken('--g-accent', block, rootBlock);
			const accentInk = resolveToken('--g-accent-ink', block, rootBlock);
			expect(contrastRatio(accentInk, accent), `${name} accent`).toBeGreaterThanOrEqual(4.5);
		});
	});
});

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

});
