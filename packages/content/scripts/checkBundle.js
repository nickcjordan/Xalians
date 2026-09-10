#!/usr/bin/env node
// Fails when the committed content bundle (packages/content/json/*) disagrees with what
// the repo-root bundlers (scripts/bundleLore.js, which also runs
// scripts/bundleAbilityCatalog.js) would produce from docs/ right now. Runs the bundlers
// into a scratch directory (CONTENT_BUNDLE_OUT_DIR, which both scripts honor without
// changing their default behavior) and diffs each output file against the committed one.
//
// Usage:  node packages/content/scripts/checkBundle.js   (also: npm run check:bundle -w packages/content)
//
// Comparison is newline-normalized (CRLF -> LF) so a Windows checkout with
// core.autocrlf=true does not read as stale when the content is identical; this matters
// only for local runs, since CI checks out with LF.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..', '..', '..');
const committedDir = path.join(repoRoot, 'packages', 'content', 'json');

// The exact set of files scripts/bundleLore.js and scripts/bundleAbilityCatalog.js write.
// tour.json, narration.json and plates.json are conditional on the docs/ source existing;
// they are still checked because all three exist in this repo today (see
// scripts/bundleLore.js:11-13).
const BUNDLED_FILES = [
  'encyclopedia.json',
  'chronicle.json',
  'registries.json',
  'tour.json',
  'narration.json',
  'plates.json',
  'speciesRecords.json',
  'abilityCatalog.json',
];

function normalize(text) {
  return text.replace(/\r\n/g, '\n');
}

function main() {
  const scratchDir = fs.mkdtempSync(path.join(os.tmpdir(), 'xalians-content-bundle-'));
  try {
    execFileSync(process.execPath, [path.join(repoRoot, 'scripts', 'bundleLore.js')], {
      cwd: repoRoot,
      env: { ...process.env, CONTENT_BUNDLE_OUT_DIR: scratchDir },
      stdio: 'pipe',
    });

    const stale = [];
    for (const file of BUNDLED_FILES) {
      const freshPath = path.join(scratchDir, file);
      const committedPath = path.join(committedDir, file);
      if (!fs.existsSync(freshPath)) {
        // A bundler input is missing (e.g. a docs/ source file was deleted); not this
        // script's job to diagnose further, but it should not silently pass.
        stale.push(`${file} (bundler did not produce this file; run node scripts/bundleLore.js to see why)`);
        continue;
      }
      const fresh = normalize(fs.readFileSync(freshPath, 'utf8'));
      const committed = fs.existsSync(committedPath) ? normalize(fs.readFileSync(committedPath, 'utf8')) : null;
      if (committed !== fresh) {
        stale.push(file);
      }
    }

    if (stale.length > 0) {
      console.error('Content bundle is stale relative to its authoring source in docs/:');
      for (const file of stale) console.error(`  - ${file}`);
      console.error('');
      console.error('Fix: node scripts/bundleLore.js   (regenerates every file above, then commit the result)');
      process.exit(1);
    }

    console.log(`Content bundle is up to date (${BUNDLED_FILES.length} files checked).`);
  } finally {
    fs.rmSync(scratchDir, { recursive: true, force: true });
  }
}

main();
