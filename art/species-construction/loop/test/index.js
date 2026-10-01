// `node --test art/species-construction/loop/test/` (Node 24 resolves a directory argument as a module):
// this entry loads the test files so that exact command works. `node --test art/species-construction/loop/test/*.test.mjs` runs them directly.
import('./loop_core.test.mjs')
import('./loop_state.test.mjs')
