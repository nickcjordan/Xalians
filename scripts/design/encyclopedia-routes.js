#!/usr/bin/env node
/**
 * Print every encyclopedia route, one per line, for the responsive audit:
 *
 *   node scripts/design/encyclopedia-routes.js > routes.txt
 *   node scripts/design/responsive-audit.js --routes-file routes.txt ...
 *
 * A sample of records is not enough for a layout pass. The defects this
 * found were content-dependent -- a species name one letter longer than the
 * tile, an era row with seven stations instead of four -- so they appear on
 * some records and not others, and a sample picks them up only by luck.
 */
const worlds = require('../../packages/content/json/planetRecords.json');
const species = require('../../packages/content/json/speciesRecords.json');
const encyclopedia = require('../../packages/content/json/encyclopedia.json');
const chronicle = require('../../packages/content/json/chronicle.json');

const keysOf = (data) => (Array.isArray(data) ? data : Object.values(data)).map((r) => r.key);
const entries = encyclopedia.entries || encyclopedia;

const routes = [
	'/encyclopedia',
	'/encyclopedia/story',
	'/encyclopedia/worlds',
	'/encyclopedia/species',
	'/encyclopedia/powers',
	'/encyclopedia/index',
	// The not-found shell is a page shape of its own.
	'/encyclopedia/no-such-record',
	...chronicle.eras.map((e) => `/encyclopedia/story/${e.key}`),
	...keysOf(worlds).map((k) => `/encyclopedia/worlds/${k}`),
	...species.records.map((r) => `/encyclopedia/species/${r.key}`),
	...keysOf(entries).map((k) => `/encyclopedia/index/${k}`),
];

process.stdout.write(routes.join('\n') + '\n');
