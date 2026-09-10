#!/usr/bin/env node
/**
 * Extracts the SVG path for one glyph from a TTF, at a fixed cap height, and
 * prints it plus its advance width. Written for the brand wordmark's "X"
 * (docs/DESIGN_SYSTEM.md section 8: "Iceland's X is converted to a path
 * once (opentype.js)"), so apps/web/src/components/brand/wordmarkX.js can
 * hardcode the result rather than shipping the font file or opentype.js at
 * runtime.
 *
 * Usage:
 *   node scripts/design/extract-glyph.js <path-to-ttf> <glyph> [capHeightUnits]
 *
 * Example (font downloaded but not committed):
 *   node scripts/design/extract-glyph.js /tmp/Iceland-Regular.ttf X 100
 *
 * Uses opentype.parse() on a manually read buffer rather than
 * opentype.load(): opentype.js 2.0.0's load() callback never fired against
 * this Node version (its internal fetch/fs path silently swallowed the
 * error), so this reads the file itself and calls the synchronous parser.
 *
 * Prints:
 *   - the font's unitsPerEm and the glyph's raw cap height/advance width
 *   - the SVG path `d` attribute, scaled so the cap height equals the
 *     requested units (default 100), baseline at y=0, SVG's y-down
 *     convention (opentype.js's getPath() already emits y-down)
 *   - the advance width in the same scaled units
 */

const fs = require('fs');
const path = require('path');
const opentype = require('opentype.js');

const [, , fontPath, glyphChar, capHeightArg] = process.argv;

if (!fontPath || !glyphChar) {
	console.error('Usage: node extract-glyph.js <path-to-ttf> <glyph> [capHeightUnits=100]');
	process.exit(1);
}

const targetCapHeight = capHeightArg ? Number(capHeightArg) : 100;

const buf = fs.readFileSync(path.resolve(fontPath));
const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const font = opentype.parse(arrayBuffer);

const glyph = font.charToGlyph(glyphChar);
if (!glyph || !glyph.unicode) {
	console.error(`Glyph for "${glyphChar}" not found in ${fontPath}`);
	process.exit(1);
}

const unitsPerEm = font.unitsPerEm;
// capHeight lives on the OS/2 table when present; fall back to the font's
// ascender, which is close enough for a squared display face like Iceland
// (flat-topped caps).
const rawCapHeight = (font.tables.os2 && font.tables.os2.sCapHeight) || font.ascender;
const scale = targetCapHeight / rawCapHeight;

// getPath(x, y, fontSize) scales by fontSize/unitsPerEm, so passing
// unitsPerEm*scale as fontSize gives exactly `scale`.
const scaledPath = glyph.getPath(0, 0, unitsPerEm * scale);
const d = scaledPath.toPathData(2);
const advanceWidth = Math.round(glyph.advanceWidth * scale * 100) / 100;

console.log(`unitsPerEm: ${unitsPerEm}`);
console.log(`rawCapHeight: ${rawCapHeight}`);
console.log(`scale: ${scale}`);
console.log(`advanceWidth (scaled): ${advanceWidth}`);
console.log('--- SVG path d (y-down, baseline at 0, ascends into negative y) ---');
console.log(d);
