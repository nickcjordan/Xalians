/**
 * The fourteen element hues (docs/DESIGN_SYSTEM.md section 3.4, revised
 * 2026-09-08). Measured in OKLCH for contrast under dark text (floor 4.5:1)
 * and distance to their nearest neighbor; must equal the --g-el-* tokens in
 * public/assets/css/system.css, checked by designTokens.test.js.
 */
module.exports = {
	themeColors: {
		electric: '#e9c93a',
		air: '#d8e6ee',
		fire: '#e5735f',
		water: '#6a9fd8',
		ice: '#8fd6ee',
		plant: '#83a44b',
		rock: '#a98a6a',
		light: '#f5ec9a',
		dark: '#7378c4',
		metal: '#a4a8ad',
		sand: '#dba873',
		chemical: '#58c3ba',
		psychic: '#dc9fd2',
		ghost: '#a886cf',
	},
};
