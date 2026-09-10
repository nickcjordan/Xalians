/**
 * The Iceland "X" as an SVG path (docs/DESIGN_SYSTEM.md section 8): "Iceland's
 * X is converted to a path once (opentype.js), and split at its crossing so
 * the three-piece morph from the current build still works." This file is
 * the "converted once" output, hardcoded so nothing at runtime needs the
 * font file or opentype.js.
 *
 * Extracted with scripts/design/extract-glyph.js against Iceland-Regular.ttf
 * (Google Fonts, https://github.com/google/fonts/raw/main/ofl/iceland/Iceland-Regular.ttf,
 * not committed to the repo) at a 100-unit cap height:
 *
 *   node scripts/design/extract-glyph.js <path-to-ttf> X 100
 *
 * The path is drawn with the baseline at y=0 and the glyph extending upward
 * into negative y (SVG's y-down convention), cap height 100 units, in
 * Iceland's own broken-corner style (the strokes do not fully join at the
 * crossing) — which is exactly the "split at its crossing" shape the MorphSVG
 * step needs; no further splitting was necessary.
 *
 * XALIANS_X_ADVANCE is the glyph's advance width in the same 100-unit scale,
 * for laying out the X at its correct position within the rest of the
 * wordmark if the wordmark is ever built letter-by-letter from paths too.
 */

const XALIANS_X_PATH =
	'M61.43-52.04L97.96 0L78.78 0L50.41-40.82L48.37-40.82L21.63 0L2.04 0L38.98-52.04L4.08-100L23.67-100L49.80-61.43L51.84-61.43L76.73-100L95.92-100Z';

const XALIANS_X_ADVANCE = 100;

const XALIANS_X_CAP_HEIGHT = 100;

export { XALIANS_X_PATH, XALIANS_X_ADVANCE, XALIANS_X_CAP_HEIGHT };
