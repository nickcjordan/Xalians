/**
 * The JavaScript half of the design system.
 *
 * Some things can only be styled from JS — recharts takes colours as `fill`
 * props, GSAP tweens take them as tween values, and SVG components take them as
 * attributes. None of those can read a CSS custom property, so the palette has
 * to exist on both sides.
 *
 * public/assets/css/system.css is the CSS half. The two are held identical by
 * src/__tests__/designTokens.test.js, which fails if any value here disagrees
 * with the matching --g-* token. Change a colour in one place and the test will
 * tell you about the other.
 *
 * Element colours live in colorConstants.js (imported and re-exported here so
 * consumers have a single import) because they predate this file and are
 * referenced widely.
 */

const colorConstants = require('./colorConstants');

/**
 * The hull: enamelled steel, brass and bone silkscreen. Deliberately
 * desaturated — the element hues are the only saturated things in the system.
 */
const hull = {
	void: '#0d0b09',
	lo: '#16160f',
	base: '#23231a',
	hi: '#32322a',
	seam: '#0a0a07',
};

const brass = {
	base: '#b08d3f',
	dark: '#6b5423',
	light: '#d8b45e',
};

/** Printed matter. Never pure white: paint yellows. */
const ink = {
	base: '#ddd4bd',
	mid: '#9a9280',
	low: '#6b665a',
	invert: '#14120c',
};

/** The CRT. The only pure saturated light, confined to screens. */
const phosphor = {
	base: '#74ffb0',
	glass: '#07120c',
};

/** Bulbs behind coloured plastic, and painted warning livery. */
const lamp = {
	amber: '#ffb037',
	red: '#e4483c',
	off: '#3d3a30',
};

/** The two seats at any table: your side cyan, the rival's brass, as the Duel paints them. */
const team = {
	one: '#3bbedf',
	two: '#c39738',
};

const hazard = {
	base: '#d9a410',
	dark: '#6d5108',
};

/**
 * Stat colours. Semantic and independent of element: attack red, defense blue,
 * speed yellow-green, stamina and recovery green, with each "special" variant a
 * darker shade of its standard pair.
 */
const stat = {
	standardAttack: '#a84032',
	specialAttack: '#753027',
	standardDefense: '#535dc2',
	specialDefense: '#494f8c',
	speed: '#d0d466',
	evasion: '#aaad53',
	stamina: '#4bbf4e',
	recovery: '#479e4a',
};

/** The same eight stats as drawn in the points charts, translucent over a track. */
const statPoints = {
	standardAttack: '#df9320be',
	specialAttack: '#b37519d0',
	standardDefense: '#70a5dbb7',
	specialDefense: '#2e73b8c2',
	speed: '#64b43cc2',
	evasion: '#4b862dc4',
	stamina: '#c04141c9',
	recovery: '#8f1f1fc9',
};

const chart = {
	rangeTrack: '#ecff8234',
	pointsFill: '#80dbff34',
	barLabel: '#ffffff50',
	cursorFill: '#ffffff25',
	axis: '#ddd4bd',
};

/**
 * The material layer, v3 ("one relay, many terminals" — docs/DESIGN_SYSTEM.md).
 * One entry per [data-terminal="..."] block in system.css, mirroring its
 * material colours exactly; src/__tests__/designTokens.test.js fails if any
 * of these disagree with the matching CSS block. "panel" mirrors :root's
 * defaults, the version 2 look kept as the migration baseline. Non-colour
 * material settings (fonts, radius, wear, per-terminal token overrides) stay
 * CSS-only: nothing in JS currently needs them as strings.
 */
const terminals = {
	panel: {
		hull: hull.base,
		hullHi: hull.hi,
		hullLo: hull.lo,
		face: hull.base,
		ink: ink.base,
		trim: brass.base,
		accent: hazard.base,
		glass: phosphor.glass,
		phosphor: phosphor.base,
		vfd: phosphor.base,
		paper: '#ddd4bd',
		paperInk: '#23231a',
		lampOn: phosphor.base,
	},
	field: {
		hull: '#3a3d3e',
		hullHi: '#4a4d4d',
		hullLo: '#262829',
		face: '#cfc8b6',
		ink: '#1e1d19',
		trim: '#2b2b28',
		accent: '#c8572b',
		glass: '#0f0d0a',
		phosphor: '#e9e3d2',
		vfd: '#ffb347',
		paper: '#e9e2cc',
		paperInk: '#2b2a26',
		lampOn: '#ffb347',
	},
	relay: {
		hull: '#0a0c10',
		hullHi: '#141821',
		hullLo: '#05060a',
		face: '#0a0c10',
		ink: '#d8dde8',
		trim: '#2b3444',
		accent: '#e0364a',
		glass: '#07090d',
		phosphor: '#dfe4ea',
		vfd: '#e2bd43',
		paper: '#e9e2cc',
		paperInk: '#2b2a26',
		lampOn: '#e2bd43',
	},
	registry: {
		hull: '#0f0c0c',
		hullHi: '#1c1515',
		hullLo: '#070505',
		face: '#e6dcc6',
		ink: '#e9dfc8',
		trim: '#c9a44a',
		accent: '#8f1d1d',
		glass: '#120a0a',
		phosphor: '#e7c98a',
		vfd: '#e7c98a',
		paper: '#e6dcc6',
		paperInk: '#1d1710',
		lampOn: '#e4483c',
	},
	archive: {
		hull: '#3a4a4e',
		hullHi: '#465659',
		hullLo: '#2e3b3e',
		face: '#f8f5ec',
		ink: '#e6dfcc',
		trim: '#7d9397',
		accent: '#1f5f6b',
		glass: '#1c2426',
		phosphor: '#1f5f6b',
		vfd: '#1f5f6b',
		paper: '#e6d9b6',
		paperInk: '#3b3428',
		lampOn: '#1f5f6b',
	},
	readout: {
		hull: '#0b0d0b',
		hullHi: '#111411',
		hullLo: '#060706',
		face: '#0b0d0b',
		ink: '#e6e4d8',
		trim: '#2a2e2a',
		accent: '#e8e6da',
		glass: '#0c100d',
		phosphor: '#e8e6da',
		vfd: '#e8e6da',
		paper: '#e8e6da',
		paperInk: '#0b0d0b',
		lampOn: '#e8e6da',
	},
};

/**
 * Interaction-state and readout-mode colours that used to be raw hex inside
 * component rules in system.css (button hovers, the danger variant, the
 * checked-toggle track, the hazard-strip's alternate stripe, the readout
 * mode's fixed monochrome palette, and the near-black ink a classification
 * tab prints on a saturated element colour). Panel-scoped except the
 * `readout*`/`tab*` entries, which are terminal-invariant by design: the
 * readout is "a mode, not a place" (docs/DESIGN_SYSTEM.md section 3).
 */
const material = {
	accentInk: '#17120a',
	hullHover: '#3c3c32',
	accentHover: '#f0b71a',
	danger: '#7c2b26',
	dangerInk: '#ffdedb',
	dangerEdge: '#43110e',
	dangerHover: '#94332d',
	checkOn: '#40340b',
	hazardStripe: '#15130c',
	readoutInk: '#0b0d0b',
	tabInk: '#1a1a1a',
	/**
	 * The panel terminal's --g-paper-ink-faint. Deliberately its own field
	 * rather than reusing ink.low: the two tokens used to share one value
	 * (#6b665a) but that only cleared 3.87:1 against --g-paper, below the
	 * 4.5:1 floor (round1-findings.md S5). Darkening --g-ink-low to fix it
	 * would have retuned every hull legend that reads it; this token is
	 * paper-only, so it moves alone.
	 */
	paperInkFaint: '#5c584d',
};

module.exports = {
	hull,
	brass,
	ink,
	phosphor,
	lamp,
	team,
	hazard,
	stat,
	statPoints,
	chart,
	terminals,
	material,
	themeColors: colorConstants.themeColors,
};
