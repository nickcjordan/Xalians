// Bundles each handler in src/handlers/*.ts into its own dist/<name>/index.mjs. The
// Terraform archive_file zips dist/ directly (see main.tf); each Lambda's handler path is
// "<name>/index.handler".
//
// @aws-sdk/* is left external: nodejs22.x provides the SDK v3 at runtime, so bundling it
// would only bloat the zip. Everything else (zod, @xalians/content JSON, the legacy CJS
// engine under src/legacy) is bundled in, which is what removes the old pre-build content
// staging step and the CWD-relative JSON fallback in tools.js.
//
// The banner below defines `require` via node:module's createRequire. It exists only
// because src/legacy is CommonJS: when esbuild pulls a CJS module into an ESM output
// bundle, calls that resolve to an external module (an @aws-sdk/* package, or a Node
// builtin such as "crypto") are left as literal `require(...)` calls in the bundle, and
// plain ESM output has no global `require` to satisfy them. Without the banner, a bundled
// handler throws "require is not defined" the first time the legacy engine runs.
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
