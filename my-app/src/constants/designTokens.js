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

module.exports = {
	hull,
	brass,
	ink,
	phosphor,
	lamp,
	hazard,
	stat,
	statPoints,
	chart,
	themeColors: colorConstants.themeColors,
};
