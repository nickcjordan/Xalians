# Powerworks turn screen verification harness

Dev server must already be running at `http://localhost:3108` (do not start a second one).

1. Generate scenarios (writes saved-run JSON into `--out`):
   `node apps/web/scripts/runNode.cjs packages/rules/src/dungeon/pillars/devtools/turnScenarios.ts --out=/tmp/pwt-scen`
2. Run the default storyboard plan (contact sheets + hooks.json per scenario/size):
   `node scripts/powerworks-turns/flow.cjs --plan=scripts/powerworks-turns/plan.json --scenario-dir=/tmp/pwt-scen --out=/tmp/pwt-frames`
3. Or drive one scenario by hand:
   `node scripts/powerworks-turns/flow.cjs --scenario=first --scenario-file=/tmp/pwt-scen/first.json --steps='[{"op":"shot"},{"op":"act","key":1,"target":"A"},{"op":"waitIdle"},{"op":"shot"}]' --out=/tmp/pwt-frames`
4. Geometry check (every figure/letter/plaque inside the stage, squad plaques above the key bar, rail and banner inside the viewport, no page scroll; exits non-zero on failure):
   `node scripts/powerworks-turns/geometry.cjs --scenario-dir=/tmp/pwt-scen`
5. Review: open `sheet.png` (or `sheet.html` if PIL is unavailable) in each `<scenario>-<size>/` folder under the frames output, and read `hooks.json` next to it for the per-frame banner/side/spotlight/busy/rail/delta values (null when a hook is not built yet).

## UX pass 2 additions

- `plan-ux2.json`: the whole-journey capture plan (arrival, first look, hovers, acting, enemy turns, encounter end, camp, defeat, victory, retreat, tools, phone portrait). Run it with `--plan=scripts/powerworks-turns/plan-ux2.json --scenario-dir=<scenarios> --out=<dir>`. An entry may set `"sizes": ["844x390"]` and `"fresh": true` (first visit: clears localStorage, no scenario).
- New step ops in `flow.cjs`: `click` (`text` matches a button's text or aria-label, optional `settle` ms), `framesUntilIdle` (`every`, `max`; frames until `data-busy` is false, then one idle frame), `wait` (`ms`, no capture), and `hover` now takes `key` (restrict to key N) and `cell:*` (that key's first button).
- New scenarios in `turnScenarios.ts`, all reached by playing real engine commands and searching seeds: `camp-fallen`, `final-blow`, `round-open-enemy`, `last-stand`, `last-blow`, `lost`, `won`, `retreated-command`. `retreated-stall` is searched for and reported NOT FOUND (the stall force-out needs a fight where neither side lowers the other's total health, which the engine never produces in the seeded search).
- Self-only keys ("now" keys such as Ground Anchor) ignore mouse clicks on the live build (see the capture report); the harness plays them with `{ "op": "key", "key": "3" }`.
