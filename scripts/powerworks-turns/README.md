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
- Self-only keys ("now" keys such as Ground Anchor) ignored mouse clicks until UX pass 2 fixed `act()` to name the user as the target; `click` and `key` both work now.

- `--only=S01,S06` limits a `--plan` run to the entries whose name starts with one of the prefixes.
- Round 2: the geometry check also opens the briefing, the sector title card, the Guide and the Restart dialog on a fresh page at every size, and checks every panel (fits the viewport, no inner scroll, nothing pokes out or is clipped). The searched scenarios now save a Record, so the end screens show real summary numbers.
- Round 4 (phone): a size 500 px tall or less is opened as a touch phone (isMobile, hasTouch, 2x) by both tools. `flow.cjs` taps instead of clicking (a key cell needs two taps: the first previews, the second uses it) and opens Guide, Record and Restart through the Menu button; `--only-size=844x390` limits a `--plan` run to entries that include that size. `geometry.cjs` runs the phone checks at 844x390, 932x430 and 667x375 (no text under 12 CSS px, no button or link under 40 px in its short side, nothing outside the screen or clipped, no page scroll, the tap flow, and the same checks while a move and the enemy turns play out).

## Intents and keys (docs/design/powerworks-intents-and-keys.md)

- A move key is one button (`button.pwt-key[data-key=N]`), and acting is a key, then an enemy. `flow.cjs`: `act` presses the key, then the target's plate (a letter A-F, or a squadmate's name; a key that acts on its own needs none, and a phone taps it a second time); the new `select` op presses a key and stops, so its numbers show on the plates; `hover` with `cell:*` hovers a key (a phone taps it) and `figure:B` an enemy.
- New scenarios in `turnScenarios.ts`, reached by real commands: `lethal-intent` (an enemy committed to a hit that knocks a companion out), `support-intent` (an enemy committed to a support move), `redirect` (key 1 on enemy A makes an enemy turn from its target). `plan-ux2.json` entries `S13a` to `S13f` capture them, the enemy turns executing their intents, and camp.
- `geometry.cjs` gained the intents checks, at every size, for every scenario and every ready key (hovered on a desktop, tapped on a phone): an intent chip stays inside its plaque, is not cut short and stays off the squad row (plaques, tags, figures) and the active pointer; a matchup mark never touches its plate's element tag; a preview number stays inside the stage and its plate's figure area (a phone's may rise above a short one) and off the plaque and tags (a phone's may cover the letter and guardian tags, which the plaque's name row repeats); nothing on a key pokes out of it. The phone tap flow is now a tap on a key (selects, shows its numbers on the plates), then a tap on an enemy (uses it). A phone's banner clamps to two lines by design, so the whole-sentence check is desktop-only.

## Moves on the stage (docs/design/powerworks-stage-moves.md)

- On a desktop the four moves and Pass are one row above the acting companion (`.pwt-moves` inside `.pwt-stage`, cards `button.pwt-key[data-key=N]` inside `.pwt-moves-row`); there is no `.pwt-keybar`. A phone keeps its key column (`.pwt-keybar`), so every `flow.cjs` step that clicks `button.pwt-key` works on both. Speed and Skip are in the top bar's right column while beats play (`.pwt-top-right .pwt-playtools`); the hindered reason, first-use note and the since line are in the banner (`.pwt-banner-status`, `.pwt-banner .pwt-note`, `.pwt-banner-line`).
- `geometry.cjs` gained `movesProblems` (desktop, at rest and with every ready key hovered): the row and its hover tip stay inside the stage; every card and Pass is at least 44 px tall and its content fits; neither covers a plaque, letter, element tag, intent chip, matchup or "can fall" mark, guardian tag, health chip, preview number, active pointer, landing number or painted figure of any plate. The run prints which acting slots (1 to 4) it covered, per scenario.
- The "key bar stays put under the dialog" check now reads the move row on a desktop.
