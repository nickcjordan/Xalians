// `node --test art/species-construction/loop/test/` (Node 24 resolves a directory argument as a module):
// this entry loads the test file so that exact command works. `node --test` with a glob runs loop_core.test.mjs directly.
import('./loop_core.test.mjs')
