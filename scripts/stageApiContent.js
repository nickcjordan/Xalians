#!/usr/bin/env node
// stageApiContent.js: prepares apps/api so the Terraform archive_file (which
// zips apps/api alone, see main.tf) has everything the Lambda needs at
// runtime, given that npm workspaces no longer install per-package
// node_modules for hoistable dependencies.
//
// 1. Copies the four JSON files the legacy generation engine reads at
//    runtime (elements, species, qualifiers, moves) from packages/content/json
//    into apps/api/dist-content/. apps/api/src/tools.js falls back to that
//    directory when require.resolve('@xalians/content/...') fails, which is
//    exactly the case inside the deployed Lambda (the zip does not contain
//    the @xalians/content workspace package).
//
// 2. Copies each of apps/api's real npm dependencies (uuid, currently) into
//    apps/api/node_modules/ if npm hoisted it to the workspace root instead
//    of installing it locally. Workspace packages (@xalians/content) are
//    skipped here; they are handled by the JSON staging above instead.
//
// This script must run before `terraform apply` (wired into
// .github/workflows/deploy-backend.yml) so both the staged JSON and the
// staged node_modules are fresh.
//
// Both staging steps are temporary: PR C2 bundles apps/api with esbuild,
// which resolves the @xalians/content imports and npm dependencies directly
// into the output bundle and removes the need for either fallback.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'packages', 'content', 'json');
const API_DIR = path.join(ROOT, 'apps', 'api');
const OUT_DIR = path.join(API_DIR, 'dist-content');

const ENGINE_FILES = ['elements.json', 'species.json', 'qualifiers.json', 'moves.json'];

fs.mkdirSync(OUT_DIR, { recursive: true });

for (const name of ENGINE_FILES) {
	const src = path.join(CONTENT_DIR, name);
	const dest = path.join(OUT_DIR, name);
	fs.copyFileSync(src, dest);
	console.log(`staged ${name}`);
}

function copyDir(src, dest) {
	fs.mkdirSync(dest, { recursive: true });
	for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
		const s = path.join(src, entry.name);
		const d = path.join(dest, entry.name);
		if (entry.isDirectory()) {
			copyDir(s, d);
		} else if (entry.isSymbolicLink()) {
			const real = fs.realpathSync(s);
			if (fs.statSync(real).isDirectory()) {
				copyDir(real, d);
			} else {
				fs.copyFileSync(real, d);
			}
		} else {
			fs.copyFileSync(s, d);
		}
	}
}

const apiPackageJson = JSON.parse(fs.readFileSync(path.join(API_DIR, 'package.json'), 'utf8'));
const runtimeDeps = Object.keys(apiPackageJson.dependencies || {}).filter((name) => !name.startsWith('@xalians/'));

for (const name of runtimeDeps) {
	const localPath = path.join(API_DIR, 'node_modules', name);
	if (fs.existsSync(localPath)) {
		console.log(`${name} already present in apps/api/node_modules`);
		continue;
	}
	const hoistedPath = path.join(ROOT, 'node_modules', name);
	if (!fs.existsSync(hoistedPath)) {
		throw new Error(`stageApiContent: dependency "${name}" not found in apps/api/node_modules or the workspace root node_modules; run npm ci first`);
	}
	copyDir(hoistedPath, localPath);
	console.log(`staged node_modules/${name} from the hoisted workspace install`);
}
