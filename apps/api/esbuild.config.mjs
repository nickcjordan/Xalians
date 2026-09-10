// Bundles each handler in src/handlers/*.ts into its own dist/<name>/index.mjs. The
// Terraform archive_file zips dist/ directly (see main.tf); each Lambda's handler path is
// "<name>/index.handler".
//
// @aws-sdk/* is left external: nodejs22.x provides the SDK v3 at runtime, so bundling it
// would only bloat the zip. Everything else (zod, @xalians/rules, the @xalians/content
// JSON) is bundled in, which is what removes the old pre-build content staging step.
//
// The banner below defines `require` via node:module's createRequire. It is kept as a
// safety net for any CommonJS dependency esbuild pulls into the ESM output: such a module
// leaves calls that resolve to an external package as literal `require(...)`, and plain
// ESM output has no global `require` to satisfy them.
import { build } from 'esbuild';
import { readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const here = path.dirname(fileURLToPath(import.meta.url));
const handlersDir = path.join(here, 'src', 'handlers');

const banner = `import { createRequire as __createRequire } from 'node:module';
const require = __createRequire(import.meta.url);`;

const handlers = readdirSync(handlersDir)
  .filter((file) => file.endsWith('.ts'))
  .map((file) => path.basename(file, '.ts'));

if (handlers.length === 0) {
  throw new Error(`esbuild.config.mjs: no handlers found in ${handlersDir}`);
}

await Promise.all(
  handlers.map((name) =>
    build({
      entryPoints: [path.join(handlersDir, `${name}.ts`)],
      outfile: path.join(here, 'dist', name, 'index.mjs'),
      bundle: true,
      platform: 'node',
      target: 'node22',
      format: 'esm',
      sourcemap: true,
      minify: false,
      external: ['@aws-sdk/*'],
      banner: { js: banner },
      logLevel: 'info',
    })
  )
);

console.log(`esbuild: built ${handlers.length} handler bundle(s): ${handlers.join(', ')}`);
