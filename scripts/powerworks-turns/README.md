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
