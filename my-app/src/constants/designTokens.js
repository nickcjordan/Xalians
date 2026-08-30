/**
 * The JavaScript half of the design token system.
 *
 * Some things can only be styled from JS - recharts takes colours as `fill`
 * props, GSAP tweens take them as tween values, and SVG components take them as
 * attributes. Those consumers cannot read a CSS custom property, so the palette
 * has to exist on both sides.
 *
 * public/assets/css/tokens.css is the CSS half. The two are kept identical by
 * src/__tests__/designTokens.test.js, which fails if any value here disagrees
 * with the matching --x-* token. Change a colour in one place and the test will
 * tell you about the other.
 *
 * Element/type colours live in colorConstants.js (imported and re-exported here
 * so there is one import for consumers) because they predate this file and are
 * referenced widely.
 */

const colorConstants = require('./colorConstants');

// --- brand ---------------------------------------------------------------
const brand = {
	green: '#80ffb0',
	greenHover: '#b3ffd0',
	greenActive: '#57aa77',
	greenBorder: '#6bd493',
};

// --- surfaces ------------------------------------------------------------
const surface = {
	bg: '#0d0d0d',
	surface1: '#151515',
	surface2: '#1a1a1a',
	surface3: '#232323',
	border: '#333333',
	borderStrong: '#4a4a4a',
};

// --- text ----------------------------------------------------------------
const text = {
	primary: '#ffffff',
	muted: '#cccccc',
	dim: '#949494',
	inverse: '#000000',
};

// --- feedback ------------------------------------------------------------
const feedback = {
	danger: '#ff5b5b',
	warning: '#e2bd43',
	success: '#80ffb0',
};

/**
 * Stat colours. These are semantic - attack is red, defense is blue, speed is
 * yellow-green, stamina/recovery are green - and the "special" variant of each
 * is a darker shade of the same hue so the pairs read as related.
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

/**
 * The same eight stats as they appear in the points charts, where bars are
 * drawn translucent over a range track.
 */
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

// --- charts --------------------------------------------------------------
const chart = {
	/* the faint track a stat bar is drawn against */
	rangeTrack: '#ecff8234',
	/* the filled portion of a stat bar */
	pointsFill: '#80dbff34',
	/* label text drawn on top of a bar */
	barLabel: '#ffffff50',
	/* the hover highlight behind a tooltip */
	cursorFill: '#ffffff25',
	axis: '#ffffff',
};

module.exports = {
	brand,
	surface,
	text,
	feedback,
	stat,
	statPoints,
	chart,
	themeColors: colorConstants.themeColors,
};
