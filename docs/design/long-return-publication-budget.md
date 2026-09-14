# Long Return publication measurement — 2026-09-14

PR #266 publishes the accumulated exploration UX work rather than a dependency upgrade: route comparisons, crew replacement, recovery exchanges, extraction risk, authored crossing/encounter narratives and terrain animation.

Measured after merging main at ed05491 and installing the current lockfile with `npm ci`:

| Incremental route graph | Previous limit | Measured | Proposed limit |
| --- | ---: | ---: | ---: |
| JavaScript raw | 280,000 | 301,632 | 317,000 |
| JavaScript gzip | 83,000 | 91,560 | 97,000 |
| CSS raw | 233,000 | 266,178 | 280,000 |
| CSS gzip | 42,000 | 47,519 | 50,000 |

The adjustment follows the existing measured-output policy with approximately five percent headroom. This is an explicit size increase for review, not an optimization. Initial-load and every other route limit are unchanged; all passed before this adjustment. No check is disabled. The existing layered game styles are a future consolidation opportunity, not justification to claim this payload is minimal.

Validation: 157 Long Return tests pass on the current lockfile; Vite compilation passed. The full build including this reviewed budget adjustment is required before publication. Human UX acceptance remains separate and pending.
