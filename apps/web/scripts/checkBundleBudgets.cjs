#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { gzipSync } = require('node:zlib');

const WEB_ROOT = path.resolve(__dirname, '..');
const BUILD_ROOT = path.join(WEB_ROOT, 'build');
const MANIFEST_PATH = path.join(BUILD_ROOT, '.vite', 'manifest.json');
const BUDGET_PATH = path.join(WEB_ROOT, 'bundle-budgets.json');

function fail(message) {
	console.error(`Bundle budget error: ${message}`);
	process.exit(1);
}

if (!fs.existsSync(MANIFEST_PATH)) {
	fail(`missing ${path.relative(WEB_ROOT, MANIFEST_PATH)}; run a production build first`);
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
const budgets = JSON.parse(fs.readFileSync(BUDGET_PATH, 'utf8'));

function dependencyGraph(entryKey, seen = new Set()) {
	if (!entryKey || !manifest[entryKey]) fail(`manifest entry ${entryKey || '(missing)'} was not found`);
	if (seen.has(entryKey)) return seen;
	seen.add(entryKey);
	for (const importedKey of manifest[entryKey].imports || []) dependencyGraph(importedKey, seen);
	return seen;
}

function assetSize(relativePath) {
	const absolutePath = path.join(BUILD_ROOT, relativePath.replace(/^\//, ''));
	if (!fs.existsSync(absolutePath)) fail(`manifest references missing asset ${relativePath}`);
	const contents = fs.readFileSync(absolutePath);
	return { raw: contents.length, gzip: gzipSync(contents, { level: 9 }).length };
}

function addSize(total, size) {
	total.raw += size.raw;
	total.gzip += size.gzip;
}

function graphSize(keys) {
	const javascript = new Set();
	const stylesheets = new Set();
	for (const key of keys) {
		const entry = manifest[key];
		if (entry.file.endsWith('.js')) javascript.add(entry.file);
		for (const cssFile of entry.css || []) stylesheets.add(cssFile);
	}
	const totals = {
		javascript: { raw: 0, gzip: 0 },
		stylesheets: { raw: 0, gzip: 0 },
	};
	for (const file of javascript) addSize(totals.javascript, assetSize(file));
	for (const file of stylesheets) addSize(totals.stylesheets, assetSize(file));
	return totals;
}

function initialStylesheetSize() {
	const html = fs.readFileSync(path.join(BUILD_ROOT, 'index.html'), 'utf8');
	const stylesheets = new Set(
		[...html.matchAll(/href=["']([^"']+\.css)["']/g)]
			.map((match) => match[1])
			.filter((href) => href.startsWith('/'))
	);
	const total = { raw: 0, gzip: 0 };
	for (const file of stylesheets) addSize(total, assetSize(file));
	return total;
}

function entryByName(name, predicate = () => true) {
	const matches = Object.entries(manifest).filter(([, entry]) => entry.name === name && predicate(entry));
	if (matches.length !== 1) fail(`expected one manifest entry named ${name}, found ${matches.length}`);
	return matches[0][0];
}

function formatBytes(value) {
	return `${(value / 1000).toFixed(1)} kB`;
}

const failures = [];
function check(label, actual, budget) {
	for (const encoding of ['raw', 'gzip']) {
		const limit = budget[encoding];
		const value = actual[encoding];
		const result = value <= limit ? 'PASS' : 'FAIL';
		console.log(`${result.padEnd(4)} ${label} ${encoding.padEnd(4)} ${formatBytes(value).padStart(10)} / ${formatBytes(limit)}`);
		if (value > limit) failures.push(`${label} ${encoding}: ${value} > ${limit} bytes`);
	}
}

for (const forbiddenName of budgets.forbiddenProductionEntries) {
	const found = Object.values(manifest).some((entry) => entry.name === forbiddenName);
	console.log(`${found ? 'FAIL' : 'PASS'} production excludes ${forbiddenName}`);
	if (found) failures.push(`forbidden production entry ${forbiddenName} is present`);
}

const [initialKey] = Object.entries(manifest).find(([, entry]) => entry.isEntry) || [];
const initialKeys = dependencyGraph(initialKey);
const initial = graphSize(initialKeys);
initial.stylesheets = initialStylesheetSize();
check('initial JavaScript', initial.javascript, budgets.initial.javascript);
check('initial stylesheets', initial.stylesheets, budgets.initial.stylesheets);

for (const [name, budget] of Object.entries(budgets.chunks)) {
	const key = entryByName(name);
	const actual = graphSize(new Set([key]));
	if (budget.javascript) check(`chunk ${name} JavaScript`, actual.javascript, budget.javascript);
	if (budget.stylesheets) check(`chunk ${name} stylesheets`, actual.stylesheets, budget.stylesheets);
}

for (const [name, budget] of Object.entries(budgets.routes)) {
	const key = entryByName(name, (entry) => entry.isDynamicEntry);
	const routeOnlyKeys = new Set([...dependencyGraph(key)].filter((dependency) => !initialKeys.has(dependency)));
	const actual = graphSize(routeOnlyKeys);
	check(`route ${name} JavaScript`, actual.javascript, budget.javascript);
	check(`route ${name} stylesheets`, actual.stylesheets, budget.stylesheets);
}

if (failures.length) {
	console.error(`\n${failures.length} bundle budget check(s) failed:`);
	for (const failure of failures) console.error(`- ${failure}`);
	process.exit(1);
}

console.log('\nAll production bundle budgets passed.');
